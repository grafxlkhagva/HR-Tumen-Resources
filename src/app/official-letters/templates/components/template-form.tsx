'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp, addDoc, updateDoc, doc as firestoreDoc, getDoc } from 'firebase/firestore';
import { useFirebase, useUser } from '@/firebase';
import { useFetchDoc, useTenantWrite } from '@/firebase/tenant-compat';
import {
    OfficialLetterConfig,
    OfficialLetterTemplate,
    DEFAULT_CONFIG,
    PaperSize,
    FontFamily,
} from '../../types';
import { LetterPaper } from '../../components/letter-paper';
import {
    applyCompanyProfileToConfig,
    applyCeoToConfig,
    diffFromProfile,
    diffFromCeo,
} from '../../lib/company-profile';
import '../../official-letters.css';

import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
    Save, Loader2, Sparkles, Building2, FileText, Layout, User,
    Variable, RefreshCw,
} from 'lucide-react';

import { VariablePanel } from './variable-panel';
import {
    useTemplateDraftAutoSave,
    loadDraft,
    clearDraft,
} from '../hooks/use-template-draft';

interface TemplateFormProps {
    mode: 'create' | 'edit';
    templateId?: string;
    cloneFromId?: string;
}

export function TemplateForm({ mode, templateId, cloneFromId }: TemplateFormProps) {
    const router = useRouter();
    const { firestore } = useFirebase();
    const { tCollection, tDoc, companyPath } = useTenantWrite();
    const { user } = useUser();
    const { toast } = useToast();

    const [name, setName] = useState('');
    const [config, setConfig] = useState<Partial<OfficialLetterConfig>>({ ...DEFAULT_CONFIG });
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isLoaded, setIsLoaded] = useState(mode === 'create' && !cloneFromId);
    const [isSystem, setIsSystem] = useState(false);
    const draftPromptedRef = useRef(false);
    const contentRef = useRef<HTMLTextAreaElement>(null);

    // Company profile + CEO
    const profileRef = useMemo(
        () => (firestore ? tDoc('company', 'profile') : null),
        [firestore, tDoc],
    );
    const { data: companyProfile } = useFetchDoc<any>(profileRef as any);
    const ceoEmployeeId = (companyProfile as any)?.ceoEmployeeId as string | undefined;
    const ceoEmployeeRef = useMemo(
        () => (firestore && ceoEmployeeId ? tDoc('employees', ceoEmployeeId) : null),
        [firestore, tDoc, ceoEmployeeId],
    );
    const { data: ceoEmployee } = useFetchDoc<any>(ceoEmployeeRef as any);
    const ceoList = useMemo(() => (ceoEmployee ? [ceoEmployee] : null), [ceoEmployee]);

    const diffFields = useMemo(
        () => diffFromProfile(config as OfficialLetterConfig, companyProfile ?? null),
        [config, companyProfile],
    );
    const signDiffFields = useMemo(
        () => diffFromCeo(config as OfficialLetterConfig, ceoList ?? null),
        [config, ceoList],
    );

    // Initial load — fetch template for edit/clone, or hydrate defaults for create
    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (mode === 'edit' && templateId && firestore) {
                try {
                    const snap = await getDoc(tDoc('official_letter_templates', templateId));
                    if (cancelled) return;
                    if (!snap.exists()) {
                        toast({ title: 'Загвар олдсонгүй', variant: 'destructive' });
                        router.push('/official-letters/templates');
                        return;
                    }
                    const data = snap.data() as Omit<OfficialLetterTemplate, 'id'>;
                    setName(data.name || '');
                    setConfig({ ...DEFAULT_CONFIG, ...(data.config || {}) });
                    setIsSystem(!!data.isSystem);
                    setIsLoaded(true);
                } catch (e: any) {
                    toast({ title: 'Алдаа', description: e.message, variant: 'destructive' });
                }
                return;
            }
            if (mode === 'create' && cloneFromId && firestore) {
                try {
                    const snap = await getDoc(tDoc('official_letter_templates', cloneFromId));
                    if (cancelled) return;
                    if (snap.exists()) {
                        const data = snap.data() as Omit<OfficialLetterTemplate, 'id'>;
                        setName(`${data.name || ''} (хуулбар)`);
                        setConfig({ ...DEFAULT_CONFIG, ...(data.config || {}) });
                    }
                    setIsLoaded(true);
                } catch (e: any) {
                    toast({ title: 'Алдаа', description: e.message, variant: 'destructive' });
                    setIsLoaded(true);
                }
                return;
            }
        }
        load();
        return () => { cancelled = true; };
    }, [mode, templateId, cloneFromId, firestore, tDoc, router, toast]);

    // Hydrate defaults from company profile + CEO when creating fresh (not cloning)
    useEffect(() => {
        if (mode !== 'create' || cloneFromId) return;
        if (!companyProfile) return;
        setConfig(prev => {
            let next = applyCompanyProfileToConfig(prev as OfficialLetterConfig, companyProfile);
            if (ceoList && ceoList.length > 0) next = applyCeoToConfig(next, ceoList);
            return next;
        });
    }, [companyProfile, ceoList, mode, cloneFromId]);

    // Draft auto-save
    const draftScope = mode === 'edit' ? `edit-${templateId}` : (cloneFromId ? `clone-${cloneFromId}` : 'new');
    const { savedAt } = useTemplateDraftAutoSave({
        userId: user?.uid,
        scope: draftScope,
        name,
        config,
        enabled: isLoaded && !isSystem,
    });

    // Prompt to restore draft
    useEffect(() => {
        if (!isLoaded || draftPromptedRef.current || isSystem) return;
        draftPromptedRef.current = true;
        const draft = loadDraft(user?.uid, draftScope);
        if (!draft) return;
        const ageMin = Math.round((Date.now() - draft.savedAt) / 60000);
        toast({
            title: 'Хадгалаагүй ноорог олдлоо',
            description: `${ageMin} минутын өмнөх ноорог. Сэргээх үү?`,
            action: (
                <button
                    onClick={() => {
                        setName(draft.name || '');
                        setConfig({ ...DEFAULT_CONFIG, ...(draft.config || {}) });
                        toast({ title: 'Ноорог сэргээгдлээ' });
                    }}
                    className="text-xs font-medium text-primary"
                >
                    Сэргээх
                </button>
            ) as any,
            duration: 8000,
        });
    }, [isLoaded, isSystem, user?.uid, draftScope, toast]);

    // Helpers
    const updateConfig = useCallback(
        (patch: Partial<OfficialLetterConfig>) => setConfig(prev => ({ ...prev, ...patch })),
        [],
    );

    const insertVariable = useCallback((field: string) => {
        const textarea = contentRef.current;
        const content = config.content || '';
        if (textarea) {
            const start = textarea.selectionStart ?? content.length;
            const end = textarea.selectionEnd ?? start;
            const newContent = content.slice(0, start) + field + content.slice(end);
            setConfig(prev => ({ ...prev, content: newContent }));
            requestAnimationFrame(() => {
                textarea.focus();
                const pos = start + field.length;
                textarea.setSelectionRange(pos, pos);
            });
        } else {
            setConfig(prev => ({ ...prev, content: content + field }));
        }
    }, [config.content]);

    const handleResyncFromProfile = useCallback(() => {
        if (!companyProfile) return;
        setConfig(prev => applyCompanyProfileToConfig(prev as OfficialLetterConfig, companyProfile));
        toast({ title: 'Профайлаас шинэчлэгдлээ' });
    }, [companyProfile, toast]);

    const handleResyncFromCeo = useCallback(() => {
        if (!ceoList || ceoList.length === 0) {
            toast({ title: 'Гүйцэтгэх захирал олдсонгүй', variant: 'destructive' });
            return;
        }
        setConfig(prev => applyCeoToConfig(prev as OfficialLetterConfig, ceoList));
        toast({ title: 'CEO мэдээлэл шинэчлэгдлээ' });
    }, [ceoList, toast]);

    const handleAiGenerate = async () => {
        if (!config.subject) {
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
                setConfig(prev => ({ ...prev, content: data.content }));
                if (data.fallback) {
                    toast({ title: 'AI ажиллахгүй байна', description: data.error || 'Жишиг content оруулав', variant: 'destructive' });
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
        if (!name.trim() || !user) return;
        setIsSaving(true);
        try {
            if (mode === 'edit' && templateId) {
                await updateDoc(tDoc('official_letter_templates', templateId), {
                    name: name.trim(),
                    config,
                    updatedAt: Timestamp.now(),
                });
                toast({ title: 'Загвар шинэчлэгдлээ' });
            } else {
                await addDoc(tCollection('official_letter_templates'), {
                    name: name.trim(),
                    config,
                    isSystem: false,
                    createdBy: user.uid,
                    createdAt: Timestamp.now(),
                });
                toast({ title: 'Загвар нэмэгдлээ' });
            }
            clearDraft(user.uid, draftScope);
            router.push('/official-letters/templates');
        } catch (e: any) {
            toast({ title: 'Алдаа', description: e.message, variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (!isLoaded) {
        return (
            <div className="p-6 md:p-8 space-y-4">
                <Skeleton className="h-12 w-1/3" />
                <Skeleton className="h-96" />
            </div>
        );
    }

    const previewConfig: OfficialLetterConfig = { ...DEFAULT_CONFIG, ...config };
    const orgFields = [
        { key: 'orgName', label: 'Байгууллагын нэр' },
        { key: 'orgTagline', label: 'Үйл ажиллагааны чиглэл' },
        { key: 'address', label: 'Хаяг' },
        { key: 'phone', label: 'Утас' },
        { key: 'email', label: 'Имэйл' },
        { key: 'web', label: 'Вэб' },
    ] as const;

    return (
        <div className="flex flex-col h-full bg-slate-50/50">
            <div className="p-6 md:p-8 space-y-6 overflow-y-auto pb-20">
                <PageHeader
                    title={mode === 'edit' ? 'Загвар засварлах' : 'Шинэ загвар үүсгэх'}
                    description={mode === 'edit'
                        ? 'Хадгалсан загварын мэдээллийг шинэчилнэ'
                        : 'Албан бичигт ашиглах загвар бэлтгэх. Live preview баруун талд харагдана.'}
                    showBackButton hideBreadcrumbs backButtonPlacement="inline" backBehavior="history"
                    fallbackBackHref="/official-letters/templates"
                    actions={
                        <div className="flex items-center gap-2">
                            {savedAt && !isSystem && (
                                <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                    Ноорог хадгалагдсан · {new Date(savedAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                            <Button onClick={handleSave} disabled={isSaving || !name.trim() || isSystem}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                {mode === 'edit' ? 'Шинэчлэх' : 'Хадгалах'}
                            </Button>
                        </div>
                    }
                />

                {isSystem && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                        Системийн загварыг засах боломжгүй. Хуулбарлаж шинэ загвар үүсгэнэ үү.
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Sidebar */}
                    <div className="lg:col-span-5 space-y-4">
                        {/* Name */}
                        <Card>
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Загварын нэр
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Input
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="Жнь: Стандарт бичиг, Гэрээний бичиг..."
                                    disabled={isSystem}
                                />
                            </CardContent>
                        </Card>

                        <Tabs defaultValue="content" className="w-full">
                            <TabsList className="w-full grid grid-cols-4">
                                <TabsTrigger value="content" className="gap-1.5 text-xs"><Variable className="h-3.5 w-3.5" /> Агуулга</TabsTrigger>
                                <TabsTrigger value="org" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" /> Байгууллага</TabsTrigger>
                                <TabsTrigger value="sign" className="gap-1.5 text-xs"><User className="h-3.5 w-3.5" /> Гарын үсэг</TabsTrigger>
                                <TabsTrigger value="format" className="gap-1.5 text-xs"><Layout className="h-3.5 w-3.5" /> Формат</TabsTrigger>
                            </TabsList>

                            {/* Content */}
                            <TabsContent value="content" className="mt-4 space-y-4">
                                <Card>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Гарчиг</Label>
                                            <Input
                                                value={config.subject || ''}
                                                onChange={e => updateConfig({ subject: e.target.value })}
                                                placeholder="Бичгийн гарчиг..."
                                                disabled={isSystem}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Label className="text-xs">Бичгийн агуулга</Label>
                                                <button
                                                    onClick={handleAiGenerate}
                                                    disabled={isAiLoading || isSystem}
                                                    className="flex items-center gap-1 text-xs text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md hover:bg-violet-100 disabled:opacity-50"
                                                >
                                                    {isAiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                                                    AI үүсгэх
                                                </button>
                                            </div>
                                            <Textarea
                                                ref={contentRef}
                                                value={config.content || ''}
                                                onChange={e => updateConfig({ content: e.target.value })}
                                                rows={14}
                                                className="text-sm font-mono resize-none"
                                                placeholder={'Эрхэм {{employee.fullName}} танд,\n\n{{company.name}}-ийн нэрийн өмнөөс ...'}
                                                disabled={isSystem}
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Доорх хувьсагчдыг дарж агуулгад нэмнэ. Бичиг үүсгэх үед жинхэнэ утгаар солигдоно.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>

                                <VariablePanel onInsert={insertVariable} height={320} />
                            </TabsContent>

                            {/* Org */}
                            <TabsContent value="org" className="mt-4 space-y-3">
                                <Card>
                                    <CardContent className="p-4 space-y-3">
                                        {companyProfile && (
                                            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Эх сурвалж:</span>
                                                    {diffFields.length === 0 ? (
                                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] h-5">Профайлаас</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] h-5">
                                                            Засагдсан · {diffFields.length}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {diffFields.length > 0 && !isSystem && (
                                                    <Button variant="ghost" size="sm" onClick={handleResyncFromProfile} className="gap-1.5 text-xs text-primary h-7">
                                                        <RefreshCw className="h-3 w-3" /> Профайлаас буцаах
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        {orgFields.map(f => {
                                            const isOverride = (diffFields as readonly string[]).includes(f.key);
                                            return (
                                                <div key={f.key} className="space-y-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <Label className="text-xs">{f.label}</Label>
                                                        {isOverride && <span className="text-[10px] text-amber-600 font-medium">· Профайлаас өөр</span>}
                                                    </div>
                                                    <Input
                                                        value={(config[f.key] as string) || ''}
                                                        onChange={e => updateConfig({ [f.key]: e.target.value })}
                                                        className="h-8 text-sm"
                                                        disabled={isSystem}
                                                    />
                                                </div>
                                            );
                                        })}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Хот</Label>
                                            <Input
                                                value={config.docCity || ''}
                                                onChange={e => updateConfig({ docCity: e.target.value })}
                                                className="h-8 text-sm"
                                                disabled={isSystem}
                                            />
                                        </div>
                                        {companyProfile && (
                                            <p className="text-[11px] text-muted-foreground pt-1">
                                                Профайлыг <a href="/company/edit" className="underline hover:text-primary" target="_blank" rel="noopener">Settings</a>-ээс засна
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Sign */}
                            <TabsContent value="sign" className="mt-4 space-y-3">
                                <Card>
                                    <CardContent className="p-4 space-y-3">
                                        {ceoList && ceoList.length > 0 && (
                                            <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Эх сурвалж:</span>
                                                    {signDiffFields.length === 0 ? (
                                                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] h-5">CEO-оос</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 text-[10px] h-5">
                                                            Засагдсан · {signDiffFields.length}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {signDiffFields.length > 0 && !isSystem && (
                                                    <Button variant="ghost" size="sm" onClick={handleResyncFromCeo} className="gap-1.5 text-xs text-primary h-7">
                                                        <RefreshCw className="h-3 w-3" /> CEO-оос буцаах
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Гарын үсэг зурагчийн нэр</Label>
                                            <Input
                                                value={config.signName || ''}
                                                onChange={e => updateConfig({ signName: e.target.value })}
                                                placeholder="Жнь: Б.Батболд"
                                                className="h-8 text-sm"
                                                disabled={isSystem}
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-xs">Албан тушаал</Label>
                                            <Input
                                                value={config.signPosition || ''}
                                                onChange={e => updateConfig({ signPosition: e.target.value })}
                                                placeholder="Жнь: Гүйцэтгэх захирал"
                                                className="h-8 text-sm"
                                                disabled={isSystem}
                                            />
                                        </div>
                                        <div className="rounded-lg bg-muted/50 border p-3 space-y-2">
                                            <p className="text-xs font-medium text-muted-foreground">Хүлээн авагч (анхдагч)</p>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Нэр</Label>
                                                <Input
                                                    value={config.addresseeName || ''}
                                                    onChange={e => updateConfig({ addresseeName: e.target.value })}
                                                    className="h-8 text-sm"
                                                    disabled={isSystem}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Байгууллага</Label>
                                                <Input
                                                    value={config.addresseeOrg || ''}
                                                    onChange={e => updateConfig({ addresseeOrg: e.target.value })}
                                                    className="h-8 text-sm"
                                                    disabled={isSystem}
                                                />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Format */}
                            <TabsContent value="format" className="mt-4 space-y-3">
                                <Card>
                                    <CardContent className="p-4 space-y-3">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Цаасны хэмжээ</Label>
                                                <div className="flex gap-1">
                                                    {(['A4', 'A5'] as PaperSize[]).map(s => (
                                                        <button
                                                            key={s}
                                                            onClick={() => updateConfig({ paperSize: s })}
                                                            disabled={isSystem}
                                                            className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 ${
                                                                (config.paperSize || 'A4') === s
                                                                    ? 'bg-primary text-white border-primary'
                                                                    : 'bg-white border-slate-200 text-slate-600'
                                                            }`}
                                                        >{s}</button>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label className="text-xs">Фонт</Label>
                                                <div className="flex gap-1">
                                                    {(['Arial', 'Times New Roman'] as FontFamily[]).map(f => (
                                                        <button
                                                            key={f}
                                                            onClick={() => updateConfig({ fontFamily: f })}
                                                            disabled={isSystem}
                                                            className={`flex-1 py-1.5 rounded-md text-xs font-semibold border transition-colors disabled:opacity-50 ${
                                                                (config.fontFamily || 'Times New Roman') === f
                                                                    ? 'bg-primary text-white border-primary'
                                                                    : 'bg-white border-slate-200 text-slate-600'
                                                            }`}
                                                        >{f === 'Arial' ? 'Arial' : 'Times'}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                                            Эдгээр тохиргоо нь загвар сонгосон үед анхдагч утга болж ашиглагдана.
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Preview */}
                    <div className="lg:col-span-7">
                        <div className="sticky top-4">
                            <div className="bg-slate-400 rounded-2xl p-6 min-h-[900px] flex justify-center overflow-auto">
                                <LetterPaper config={previewConfig} />
                            </div>
                            <p className="text-[11px] text-muted-foreground text-center mt-2">
                                Хувьсагчид <code className="bg-muted px-1 rounded">{'{{...}}'}</code> хэлбэрээр харагдана. Бичиг үүсгэхэд жинхэнэ утгаар солигдоно.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
