'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Timestamp, updateDoc } from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadString, getDownloadURL } from 'firebase/storage';
import { useFirebase, useUser, useFirebaseApp } from '@/firebase';
import { useFetchDoc, useTenantWrite } from '@/firebase/tenant-compat';
import { OfficialLetterConfig, OfficialLetter } from '../../types';
import { LetterPaper } from '../../components/letter-paper';
import '../../official-letters.css';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
    Save, Printer, Loader2, Sparkles, Building2,
    FileText, Layout, Image as ImageIcon, RefreshCw,
} from 'lucide-react';
import { printLetter } from '../../utils/pdf';
import { applyCompanyProfileToConfig, diffFromProfile } from '../../lib/company-profile';

export default function EditOfficialLetterPage() {
    const { id } = useParams<{ id: string }>();
    const { firestore } = useFirebase();
    const app = useFirebaseApp();
    const { tDoc, companyPath } = useTenantWrite();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const paperRef = useRef<HTMLDivElement>(null);

    const letterRef = React.useMemo(() => firestore && id ? tDoc('official_letters', id) : null, [firestore, id, tDoc]);
    const { data: letter, isLoading } = useFetchDoc<OfficialLetter>(letterRef as any);

    const [config, setConfig] = useState<OfficialLetterConfig | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);

    useEffect(() => {
        if (letter && !config) {
            if (letter.status !== 'DRAFT') {
                router.replace(`/official-letters/${id}`);
                return;
            }
            setConfig(letter.config);
        }
    }, [letter, config, id, router]);

    // Company profile (side-by-side reference; NOT auto-applied to saved letters)
    const profileRef = React.useMemo(
        () => (firestore ? tDoc('company', 'profile') : null),
        [firestore, tDoc],
    );
    const { data: companyProfile } = useFetchDoc<any>(profileRef as any);

    const diffFields = React.useMemo(
        () => (config ? diffFromProfile(config, companyProfile ?? null) : []),
        [config, companyProfile],
    );

    const handleResyncFromProfile = useCallback(() => {
        if (!companyProfile) return;
        setConfig(prev => (prev ? applyCompanyProfileToConfig(prev, companyProfile) : prev));
        toast({ title: 'Профайлаас шинэчлэгдлээ', description: 'Байгууллагын мэдээлэл профайлын утгаар дарагдлаа.' });
    }, [companyProfile, toast]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setConfig(prev => prev ? { ...prev, [name]: value } : prev);
    }, []);

    // Inline content commit (only "content" is editable on paper)
    const handleFieldChange = useCallback(
        (field: keyof OfficialLetterConfig, value: string) => {
            setConfig(prev => {
                if (!prev) return prev;
                if (prev[field] === value) return prev;
                return { ...prev, [field]: value };
            });
        },
        []
    );

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            toast({ title: 'Зөвхөн зураг оруулна уу', variant: 'destructive' });
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            toast({ title: 'Зургийн хэмжээ 2MB-с хэтрэхгүй байх ёстой', variant: 'destructive' });
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => setConfig(prev => prev ? { ...prev, orgLogo: reader.result as string } : prev);
        reader.readAsDataURL(file);
    };

    const handleAiGenerate = async () => {
        if (!config?.subject) {
            toast({ title: 'Гарчиг оруулна уу', variant: 'destructive' });
            return;
        }
        setIsAiLoading(true);
        try {
            const res = await fetch('/api/official-letters/ai-generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orgName: config.orgName,
                    addresseeOrg: config.addresseeOrg,
                    addresseeName: config.addresseeName,
                    subject: config.subject,
                    contentHint: config.content,
                }),
            });
            const data = await res.json();
            if (data.content) {
                setConfig(prev => prev ? { ...prev, content: data.content } : prev);
                if (data.fallback) {
                    toast({
                        title: 'AI ажиллахгүй байна',
                        description: data.error || 'Жишиг template оруулав — гараар засна уу.',
                        variant: 'destructive',
                    });
                } else {
                    toast({ title: 'AI агуулга үүслээ' });
                }
            }
        } catch {
            toast({ title: 'AI алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleSave = async () => {
        if (!firestore || !user || !config) return;
        setIsSaving(true);
        try {
            let logoUrl: string | null = config.orgLogo ?? null;
            if (logoUrl && logoUrl.startsWith('data:') && app) {
                try {
                    const storage = getStorage(app);
                    const companyId = companyPath?.split('/')[1] ?? user.uid;
                    const sRef = storageRef(storage, `official_letters/${companyId}/${Date.now()}_logo`);
                    await uploadString(sRef, logoUrl, 'data_url');
                    logoUrl = await getDownloadURL(sRef);
                } catch {
                    logoUrl = null;
                    toast({ title: 'Лого хадгалахад алдаа', variant: 'destructive' });
                }
            }
            await updateDoc(tDoc('official_letters', id), {
                config: { ...config, orgLogo: logoUrl },
                updatedAt: Timestamp.now(),
            });
            toast({ title: 'Хадгалагдлаа' });
            router.push(`/official-letters/${id}`);
        } catch (e: any) {
            toast({ title: 'Алдаа', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const handlePrint = async () => {
        if (!config) return;
        setIsGeneratingPDF(true);
        try {
            await printLetter(paperRef.current, config);
        } catch (e: any) {
            toast({ title: 'Хэвлэх алдаа', description: e.message, variant: 'destructive' });
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    if (isLoading || !config) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto pb-20">
                <PageHeader
                    title={`Бичиг засах: ${letter?.letterNumber || ''}`}
                    description="DRAFT статустай бичгийг засварлах"
                    showBackButton hideBreadcrumbs backButtonPlacement="inline" backBehavior="history"
                    fallbackBackHref={`/official-letters/${id}`}
                    actions={
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handlePrint} disabled={isGeneratingPDF}>
                                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Printer className="h-4 w-4 mr-2" />}
                                Хэвлэх / PDF
                            </Button>
                            <Button onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Хадгалах
                            </Button>
                        </div>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-4 space-y-4">
                        {/* Format */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2"><Layout className="h-4 w-4" /> Формат</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Цаасны хэмжээ</Label>
                                        <div className="flex gap-1">
                                            {(['A4', 'A5'] as const).map(s => (
                                                <button key={s} onClick={() => setConfig(p => p ? { ...p, paperSize: s } : p)}
                                                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors ${config.paperSize === s ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600'}`}>{s}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">Фонт</Label>
                                        <div className="flex gap-1">
                                            {(['Arial', 'Times New Roman'] as const).map(f => (
                                                <button key={f} onClick={() => setConfig(p => p ? { ...p, fontFamily: f } : p)}
                                                    className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors ${config.fontFamily === f ? 'bg-primary text-white border-primary' : 'bg-white border-slate-200 text-slate-600'}`}>{f === 'Arial' ? 'Arial' : 'Times'}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Org info */}
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-sm flex items-center gap-2 flex-1">
                                        <Building2 className="h-4 w-4" />
                                        Байгууллагын мэдээлэл
                                    </CardTitle>
                                    {companyProfile && (
                                        diffFields.length === 0 ? (
                                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] h-5">
                                                Профайлаас
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] h-5">
                                                Засагдсан · {diffFields.length}
                                            </Badge>
                                        )
                                    )}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {companyProfile && diffFields.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleResyncFromProfile}
                                        className="w-full justify-start gap-2 text-xs text-primary h-7 -mt-1"
                                    >
                                        <RefreshCw className="h-3 w-3" />
                                        Профайлын утгыг буцаах
                                    </Button>
                                )}

                                {/* Logo */}
                                <div className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:border-primary transition-colors"
                                    onClick={() => document.getElementById('logo-input-edit')?.click()}>
                                    {config.orgLogo
                                        ? <img src={config.orgLogo} alt="Logo" className="max-h-16 mx-auto object-contain" />
                                        : <div className="flex flex-col items-center gap-1 text-slate-400 text-xs"><ImageIcon className="h-6 w-6" /><span>Лого оруулах</span></div>}
                                    <input id="logo-input-edit" type="file" hidden accept="image/*" onChange={handleLogoChange} />
                                </div>
                                {[
                                    { name: 'orgName', label: 'Байгууллагын нэр' },
                                    { name: 'orgTagline', label: 'Үйл ажиллагааны чиглэл' },
                                    { name: 'address', label: 'Хаяг' },
                                    { name: 'phone', label: 'Утас' },
                                    { name: 'email', label: 'И-мэйл' },
                                    { name: 'web', label: 'Вэб' },
                                ].map(f => {
                                    const isOverride = (diffFields as string[]).includes(f.name);
                                    return (
                                        <div key={f.name} className="space-y-1">
                                            <div className="flex items-center gap-1.5">
                                                <Label className="text-xs">{f.label}</Label>
                                                {isOverride && (
                                                    <span className="text-[10px] text-amber-600 font-medium">· Профайлаас өөр</span>
                                                )}
                                            </div>
                                            <Input name={f.name} value={config[f.name as keyof OfficialLetterConfig] as string ?? ''} onChange={handleChange} className="h-8 text-sm" />
                                        </div>
                                    );
                                })}
                                {companyProfile && (
                                    <p className="text-[11px] text-muted-foreground pt-1">
                                        Компанийн профайлыг <a href="/company/edit" className="underline hover:text-primary" target="_blank" rel="noopener">Settings</a>-ээс засварлана
                                    </p>
                                )}
                            </CardContent>
                        </Card>

                        {/* Document fields (сontент-оос бусад бүгд энд) */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" /> Бичгийн мэдээлэл</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Индекст дугаар</Label>
                                        <Input name="docIndex" value={config.docIndex} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Огноо</Label>
                                        <Input type="date" name="docDate" value={config.docDate} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Танай (огноо)</Label>
                                        <Input name="tanaiRef" value={config.tanaiRef} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Танай №</Label>
                                        <Input name="tanaiNo" value={config.tanaiNo} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Хэнд (байгууллага)</Label>
                                    <Input name="addresseeOrg" value={config.addresseeOrg} onChange={handleChange} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Хэнд (нэр, албан тушаал)</Label>
                                    <Input name="addresseeName" value={config.addresseeName} onChange={handleChange} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Гарчиг</Label>
                                    <Input name="subject" value={config.subject} onChange={handleChange} className="h-8 text-sm" />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Гарын үсэг (Албан тушаал)</Label>
                                        <Input name="signPosition" value={config.signPosition} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Нэр</Label>
                                        <Input name="signName" value={config.signName} onChange={handleChange} className="h-8 text-sm" />
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-2.5 text-[11px] text-primary mt-1">
                                    <Sparkles className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                                    <span>
                                        <strong>Агуулга</strong> нь баруун талын бичиг дээр шууд click хийгээд засварлана.
                                        <button onClick={handleAiGenerate} disabled={isAiLoading}
                                            className="ml-1 underline hover:no-underline">
                                            {isAiLoading ? 'Үүсгэж байна…' : 'AI-аар үүсгэх'}
                                        </button>
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Preview — only content is editable */}
                    <div className="lg:col-span-8">
                        <div className="bg-slate-400 rounded-2xl p-6 min-h-[900px] flex justify-center overflow-auto">
                            <LetterPaper
                                config={config}
                                wrapperRef={paperRef}
                                editable
                                onFieldChange={handleFieldChange}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
