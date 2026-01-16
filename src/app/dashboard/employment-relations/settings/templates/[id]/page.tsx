'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase, useDoc, updateDocumentNonBlocking } from '@/firebase';
import { doc, Timestamp, collection } from 'firebase/firestore';
import { ERTemplate, ERDocumentType } from '../../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    ArrowLeft, Save, Loader2, FileText, MoveHorizontal, MoveVertical,
    Settings2, Layout, Type, QrCode, AlignLeft, Scissors, Building2, Heading1,
    Settings, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TemplateBuilder } from '../../../components/template-builder';
import { useCollection, useDoc as useFirebaseDoc } from '@/firebase';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

interface PageProps {
    params: Promise<{ id: string }>;
}

export default function TemplateEditPage({ params }: PageProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    // Unwrap params using React.use()
    const resolvedParams = React.use(params);
    const id = resolvedParams.id;

    const docRef = React.useMemo(() => firestore ? doc(firestore, 'er_templates', id) : null, [firestore, id]);
    const docTypesQuery = React.useMemo(() => firestore ? collection(firestore, 'er_document_types') : null, [firestore]);
    const companyProfileRef = React.useMemo(() => firestore ? doc(firestore, 'company', 'profile') : null, [firestore]);

    const { data: template, isLoading } = useDoc<ERTemplate>(docRef as any);
    const { data: docTypes } = useCollection<ERDocumentType>(docTypesQuery);
    const { data: companyProfile } = useFirebaseDoc<any>(companyProfileRef as any);

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [form, setForm] = useState<Partial<ERTemplate>>({
        name: '',
        documentTypeId: '',
        content: '',
        isActive: true,
        printSettings: {
            pageSize: 'A4',
            orientation: 'portrait',
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            header: '',
            footer: '',
            watermark: '',
            showQRCode: false,
            showLogo: true,
            companyName: '',
            documentTitle: ''
        }
    });

    useEffect(() => {
        if (template) {
            setForm({
                name: template.name,
                documentTypeId: template.documentTypeId,
                content: template.content || '',
                isActive: template.isActive ?? true,
                printSettings: template.printSettings || {
                    pageSize: 'A4',
                    orientation: 'portrait',
                    margins: { top: 20, right: 20, bottom: 20, left: 20 },
                    header: '',
                    footer: '',
                    watermark: '',
                    showQRCode: false,
                    showLogo: true,
                    companyName: '',
                    documentTitle: '',
                    ...(template.printSettings || {})
                } as any
            });
        }
    }, [template]);

    const handleSave = async () => {
        if (!firestore || !template) return;

        try {
            // Simple logic to extract fields: find all {{...}} patterns
            const regex = /{{(.*?)}}/g;
            const matches = form.content?.match(regex) || [];
            const requiredFields = matches.map((m: string) => m.replace('{{', '').replace('}}', '').trim());
            const uniqueFields = Array.from(new Set(requiredFields));

            await updateDocumentNonBlocking(docRef!, {
                ...form,
                requiredFields: uniqueFields,
                updatedAt: Timestamp.now()
            });
            toast({ title: "Амжилттай", description: "Загвар хадгалагдлаа" });
        } catch (error) {
            toast({ title: "Алдаа", description: "Хадгалахад алдаа гарлаа", variant: "destructive" });
        }
    };

    if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;
    if (!template) return <div className="p-8">Template not found</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto h-full flex flex-col">
            <div className="flex items-center gap-4 shrink-0">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/employment-relations/settings/templates">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div className="flex flex-col">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-semibold">{template.name}</h2>
                        <Badge variant={form.isActive ? "default" : "secondary"} className="text-[10px] h-5 px-1.5 uppercase font-bold tracking-wider">
                            {form.isActive ? "Идэвхтэй" : "Идэвхгүй"}
                        </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Version {template.version}</p>
                </div>
                <div className="ml-4 flex items-center gap-3 bg-white px-3 py-1.5 rounded-xl border-2 border-slate-100 shadow-sm transition-all hover:border-primary/20 group">
                    <div className={cn(
                        "h-2 w-2 rounded-full",
                        form.isActive ? "bg-green-500 animate-pulse" : "bg-slate-300"
                    )} />
                    <Label htmlFor="active-toggle" className="text-[10px] font-black uppercase tracking-widest text-slate-500 cursor-pointer group-hover:text-primary transition-colors">Темплейт Идэвхжүүлэх</Label>
                    <Switch
                        id="active-toggle"
                        checked={form.isActive}
                        onCheckedChange={(val) => setForm({ ...form, isActive: val })}
                    />
                </div>
                <div className="ml-auto flex gap-2">
                    <Button onClick={handleSave}>
                        <Save className="mr-2 h-4 w-4" />
                        Хадгалах
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 shrink-0">
                <div className="space-y-2">
                    <Label htmlFor="name">Нэр</Label>
                    <Input
                        id="name"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Баримтын төрөл</Label>
                    <Select
                        value={form.documentTypeId}
                        onValueChange={(val) => setForm({ ...form, documentTypeId: val })}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {docTypes?.map((type) => (
                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden flex flex-col min-h-0 bg-slate-100/50 rounded-2xl border-2 border-dashed border-slate-200">
                {/* Floating Settings Toggle */}
                <Button
                    variant="default"
                    size="icon"
                    className={cn(
                        "absolute top-6 right-6 z-[60] rounded-full h-12 w-12 shadow-xl border-4 border-white transition-all duration-300 transform",
                        isSettingsOpen ? "rotate-180 bg-slate-900" : "hover:scale-110 bg-primary"
                    )}
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                >
                    {isSettingsOpen ? <X className="h-5 w-5" /> : <Settings className="h-5 w-5 animate-spin-slow" />}
                </Button>

                <div className="flex-1 p-8 overflow-auto custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                    <div className="max-w-[850px] mx-auto transition-all duration-500 ease-in-out">
                        <TemplateBuilder
                            content={form.content || ''}
                            onChange={(val) => setForm({ ...form, content: val })}
                            printSettings={form.printSettings}
                            companyProfile={companyProfile}
                        />
                    </div>
                </div>

                {/* Sliding Settings Sidebar */}
                <AnimatePresence>
                    {isSettingsOpen && (
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="absolute top-0 right-0 h-full w-[400px] z-50 shadow-2xl"
                        >
                            <div className="bg-white flex flex-col h-full border-l shadow-2xl">
                                <div className="p-6 border-b flex items-center justify-between bg-slate-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-primary/10 rounded-lg">
                                            <Settings2 className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-sm">Хэвлэх тохиргоо</h3>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Premium Editor</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                                    <Tabs defaultValue="general" className="flex-1 flex flex-col">
                                        <TabsList className="grid grid-cols-3 mx-6 mt-6 bg-slate-100/50 p-1 h-10 rounded-lg">
                                            <TabsTrigger value="general" className="text-[10px] uppercase font-bold tracking-tighter">Хуудас</TabsTrigger>
                                            <TabsTrigger value="content" className="text-[10px] uppercase font-bold tracking-tighter">Толгой/Хөл</TabsTrigger>
                                            <TabsTrigger value="advanced" className="text-[10px] uppercase font-bold tracking-tighter">Нэмэлт</TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="general" className="px-6 py-6 space-y-8">
                                            <div className="space-y-4">
                                                <Label className="text-[10px] uppercase text-muted-foreground font-extrabold tracking-[0.1em]">Цаасны хэмжээ</Label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    {['A4', 'A5'].map((size) => (
                                                        <Button
                                                            key={size}
                                                            type="button"
                                                            variant={form.printSettings?.pageSize === size ? 'default' : 'outline'}
                                                            className={cn(
                                                                "h-12 text-xs font-bold transition-all",
                                                                form.printSettings?.pageSize === size ? "shadow-md scale-[1.02]" : "hover:bg-slate-50"
                                                            )}
                                                            onClick={() => setForm({
                                                                ...form,
                                                                printSettings: { ...form.printSettings!, pageSize: size as any }
                                                            })}
                                                        >
                                                            {size}
                                                        </Button>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-[10px] uppercase text-muted-foreground font-extrabold tracking-[0.1em]">Чиглэл</Label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <Button
                                                        type="button"
                                                        variant={form.printSettings?.orientation === 'portrait' ? 'default' : 'outline'}
                                                        className={cn(
                                                            "h-12 text-xs font-bold transition-all gap-2",
                                                            form.printSettings?.orientation === 'portrait' ? "shadow-md scale-[1.02]" : "hover:bg-slate-50"
                                                        )}
                                                        onClick={() => setForm({
                                                            ...form,
                                                            printSettings: { ...form.printSettings!, orientation: 'portrait' }
                                                        })}
                                                    >
                                                        <MoveVertical className="h-4 w-4" />
                                                        Босоо
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        variant={form.printSettings?.orientation === 'landscape' ? 'default' : 'outline'}
                                                        className={cn(
                                                            "h-12 text-xs font-bold transition-all gap-2",
                                                            form.printSettings?.orientation === 'landscape' ? "shadow-md scale-[1.02]" : "hover:bg-slate-50"
                                                        )}
                                                        onClick={() => setForm({
                                                            ...form,
                                                            printSettings: { ...form.printSettings!, orientation: 'landscape' }
                                                        })}
                                                    >
                                                        <MoveHorizontal className="h-4 w-4" />
                                                        Хэвтээ
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <Label className="text-[10px] uppercase text-muted-foreground font-extrabold tracking-[0.1em]">Зай хэмжээ (Margins - mm)</Label>
                                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                    <div className="space-y-2">
                                                        <Label className="text-[9px] uppercase font-bold text-slate-400">Дээд</Label>
                                                        <Input
                                                            type="number"
                                                            value={form.printSettings?.margins.top}
                                                            onChange={(e) => setForm({
                                                                ...form,
                                                                printSettings: {
                                                                    ...form.printSettings!,
                                                                    margins: { ...form.printSettings!.margins, top: parseInt(e.target.value) || 0 }
                                                                }
                                                            })}
                                                            className="h-10 text-xs font-bold bg-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[9px] uppercase font-bold text-slate-400">Доод</Label>
                                                        <Input
                                                            type="number"
                                                            value={form.printSettings?.margins.bottom}
                                                            onChange={(e) => setForm({
                                                                ...form,
                                                                printSettings: {
                                                                    ...form.printSettings!,
                                                                    margins: { ...form.printSettings!.margins, bottom: parseInt(e.target.value) || 0 }
                                                                }
                                                            })}
                                                            className="h-10 text-xs font-bold bg-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[9px] uppercase font-bold text-slate-400">Зүүн</Label>
                                                        <Input
                                                            type="number"
                                                            value={form.printSettings?.margins.left}
                                                            onChange={(e) => setForm({
                                                                ...form,
                                                                printSettings: {
                                                                    ...form.printSettings!,
                                                                    margins: { ...form.printSettings!.margins, left: parseInt(e.target.value) || 0 }
                                                                }
                                                            })}
                                                            className="h-10 text-xs font-bold bg-white"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <Label className="text-[9px] uppercase font-bold text-slate-400">Баруун</Label>
                                                        <Input
                                                            type="number"
                                                            value={form.printSettings?.margins.right}
                                                            onChange={(e) => setForm({
                                                                ...form,
                                                                printSettings: {
                                                                    ...form.printSettings!,
                                                                    margins: { ...form.printSettings!.margins, right: parseInt(e.target.value) || 0 }
                                                                }
                                                            })}
                                                            className="h-10 text-xs font-bold bg-white"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="content" className="px-6 py-6 space-y-8">
                                            <div className="space-y-4">
                                                <div className="space-y-4 p-5 bg-slate-50/80 rounded-2xl border border-slate-200">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs font-black flex items-center gap-2">
                                                                <Building2 className="h-4 w-4 text-primary" />
                                                                БАЙГУУЛЛАГЫН ЛОГО
                                                            </Label>
                                                            <p className="text-[10px] text-muted-foreground font-medium italic">Толгой хэсэгт харуулах</p>
                                                        </div>
                                                        <Switch
                                                            checked={form.printSettings?.showLogo}
                                                            onCheckedChange={(val) => setForm({
                                                                ...form,
                                                                printSettings: { ...form.printSettings!, showLogo: val }
                                                            })}
                                                        />
                                                    </div>

                                                    <Separator className="bg-slate-200" />

                                                    <div className="space-y-2">
                                                        <Label className="text-[10px] uppercase text-muted-foreground font-extrabold tracking-widest">Байгууллагын нэр</Label>
                                                        <Input
                                                            value={form.printSettings?.companyName}
                                                            placeholder={companyProfile?.legalName || companyProfile?.name || 'Байгууллагын нэр...'}
                                                            onChange={(e) => setForm({
                                                                ...form,
                                                                printSettings: { ...form.printSettings!, companyName: e.target.value }
                                                            })}
                                                            className="h-11 text-xs font-semibold bg-white"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase text-muted-foreground font-extrabold tracking-widest flex items-center gap-2">
                                                        <Heading1 className="h-4 w-4 text-primary" />
                                                        БАРИМТЫН ГАРЧИГ
                                                    </Label>
                                                    <Input
                                                        value={form.printSettings?.documentTitle}
                                                        onChange={(e) => setForm({
                                                            ...form,
                                                            printSettings: { ...form.printSettings!, documentTitle: e.target.value }
                                                        })}
                                                        placeholder="Жишээ: ЗАХИРЛЫН ТУШААЛ"
                                                        className="h-12 text-xs font-black uppercase tracking-tight"
                                                    />
                                                </div>

                                                <Separator className="my-4" />

                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase text-muted-foreground font-extrabold tracking-widest flex items-center gap-2">
                                                        <AlignLeft className="h-4 w-4" />
                                                        НЭМЭЛТ ТАЙЛБАР (HEADER)
                                                    </Label>
                                                    <Textarea
                                                        value={form.printSettings?.header}
                                                        onChange={(e) => setForm({
                                                            ...form,
                                                            printSettings: { ...form.printSettings!, header: e.target.value }
                                                        })}
                                                        placeholder="Бусад нэмэлт мэдээлэл..."
                                                        className="h-24 text-xs resize-none bg-slate-50/30"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase text-muted-foreground font-extrabold tracking-widest flex items-center gap-2">
                                                        <AlignLeft className="h-4 w-4 rotate-180" />
                                                        ХӨЛИЙН ХЭСЭГ (FOOTER)
                                                    </Label>
                                                    <Textarea
                                                        value={form.printSettings?.footer}
                                                        onChange={(e) => setForm({
                                                            ...form,
                                                            printSettings: { ...form.printSettings!, footer: e.target.value }
                                                        })}
                                                        placeholder="Холбоо барих мэдээлэл, хуудасны дугаар..."
                                                        className="h-24 text-xs resize-none bg-slate-50/30"
                                                    />
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="advanced" className="px-6 py-6 space-y-8">
                                            <div className="space-y-5">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] uppercase text-muted-foreground font-extrabold tracking-widest flex items-center gap-2">
                                                        <Type className="h-4 w-4 text-primary" />
                                                        УСАН ТЭМДЭГ (WATERMARK)
                                                    </Label>
                                                    <Input
                                                        value={form.printSettings?.watermark}
                                                        onChange={(e) => setForm({
                                                            ...form,
                                                            printSettings: { ...form.printSettings!, watermark: e.target.value }
                                                        })}
                                                        placeholder="Жишээ: НООРОГ, НУУЦ"
                                                        className="h-12 text-xs font-black tracking-widest"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between p-5 bg-slate-900 text-white rounded-2xl shadow-xl">
                                                    <div className="space-y-1">
                                                        <Label className="text-xs font-black flex items-center gap-2">
                                                            <QrCode className="h-5 w-5 text-primary" />
                                                            QR КОД ХАРУУЛАХ
                                                        </Label>
                                                        <p className="text-[9px] text-slate-400 font-medium uppercase tracking-tighter">Secure verification system active</p>
                                                    </div>
                                                    <Switch
                                                        checked={form.printSettings?.showQRCode}
                                                        onCheckedChange={(val) => setForm({
                                                            ...form,
                                                            printSettings: { ...form.printSettings!, showQRCode: val }
                                                        })}
                                                        className="data-[state=checked]:bg-primary"
                                                    />
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </Tabs>
                                </div>

                                <div className="p-6 bg-slate-50 border-t mt-auto">
                                    <div className="flex items-center gap-2 text-primary">
                                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                        <p className="text-[10px] font-black uppercase tracking-widest">
                                            Premium Layout Engine
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
