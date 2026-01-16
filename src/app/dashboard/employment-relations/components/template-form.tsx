'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp, doc } from 'firebase/firestore';
import { ERTemplate, ERDocumentType, PrintSettings } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Printer, Save, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DynamicFieldSelector } from './dynamic-field-selector';

interface TemplateFormProps {
    initialData?: Partial<ERTemplate>;
    docTypes: ERDocumentType[];
    mode: 'create' | 'edit';
    templateId?: string;
}

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
    pageSize: 'A4',
    orientation: 'portrait',
    margins: { top: 20, right: 20, bottom: 20, left: 20 },
    showLogo: true,
    showQRCode: true,
    companyName: 'Байгууллагын нэр'
};

export function TemplateForm({ initialData, docTypes, mode, templateId }: TemplateFormProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const [formData, setFormData] = useState<Partial<ERTemplate>>({
        isActive: true,
        version: 1,
        printSettings: DEFAULT_PRINT_SETTINGS,
        requiredFields: [],
        ...initialData
    });

    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    const handleFieldSelect = (field: string) => {
        if (textareaRef.current) {
            const start = textareaRef.current.selectionStart;
            const end = textareaRef.current.selectionEnd;
            const text = formData.content || '';
            const newText = text.substring(0, start) + field + text.substring(end);

            setFormData(prev => ({ ...prev, content: newText }));

            // Wait for React to update state and re-render
            setTimeout(() => {
                if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.setSelectionRange(start + field.length, start + field.length);
                }
            }, 0);
        } else {
            // Fallback if ref is not attached for some reason
            setFormData(prev => ({ ...prev, content: (prev.content || '') + field }));
        }
    };

    const handleSubmit = async () => {
        // ... (existing submit logic)
        if (!firestore || !formData.name || !formData.documentTypeId || !formData.content) {
            toast({ title: "Дутуу мэдээлэл", description: "Шаардлагатай талбаруудыг бөглөнө үү", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const templateData = {
                ...formData,
                updatedAt: Timestamp.now()
            };

            if (mode === 'edit' && templateId) {
                // Update
                await setDocumentNonBlocking(doc(firestore, 'er_templates', templateId), templateData, { merge: true });
                toast({ title: "Амжилттай", description: "Загвар шинэчлэгдлээ" });
            } else {
                // Create
                const newDoc = {
                    ...templateData,
                    createdAt: Timestamp.now()
                };
                await addDocumentNonBlocking(collection(firestore, 'er_templates'), newDoc);
                toast({ title: "Амжилттай", description: "Шинэ загвар үүслээ" });
            }
            router.push('/dashboard/employment-relations?tab=templates');
        } catch (error) {
            console.error(error);
            toast({ title: "Алдаа", description: "Загвар хадгалахад алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Буцах
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">
                    {mode === 'create' ? 'Шинэ загвар үүсгэх' : 'Загвар засах'}
                </h1>
                <div className="flex-1" />
                <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-slate-900 text-white hover:bg-slate-800">
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Хадгалж байна...' : 'Хадгалах'}
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content - Left Side */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle>Үндсэн мэдээлэл</CardTitle>
                            <CardDescription>Загварын нэр болон төрлийг сонгоно уу</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Загварын нэр</Label>
                                <Input
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Жишээ: Хөдөлмөрийн гэрээ - Үндсэн"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Баримтын төрөл</Label>
                                <Select
                                    value={formData.documentTypeId}
                                    onValueChange={(val) => setFormData(prev => ({ ...prev, documentTypeId: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Төрөл сонгох" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {docTypes.map(type => (
                                            <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm flex-1">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>HTML Агуулга</CardTitle>
                                    <CardDescription>Баримтын эх бэлтгэлийг энд оруулна</CardDescription>
                                </div>
                                <DynamicFieldSelector onSelect={handleFieldSelect} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Textarea
                                ref={textareaRef}
                                className="min-h-[500px] font-mono text-sm leading-relaxed p-4"
                                value={formData.content || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                placeholder="HTML код энд бичнэ..."
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* Settings - Right Side */}
                {/* (Rest of the settings content remains same, just ensuring context for replacement) */}
                <div className="space-y-6">
                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle>Төлөв</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                <Label htmlFor="active-mode" className="cursor-pointer">Идэвхтэй эсэх</Label>
                                <Switch
                                    id="active-mode"
                                    checked={formData.isActive}
                                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, isActive: c }))}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Printer className="h-4 w-4" /> Хэвлэх тохиргоо
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                <Label className="cursor-pointer" htmlFor="showLogo">Лого харуулах</Label>
                                <Switch
                                    id="showLogo"
                                    checked={formData.printSettings?.showLogo}
                                    onCheckedChange={(c) => setFormData(prev => ({
                                        ...prev,
                                        printSettings: { ...prev.printSettings!, showLogo: c }
                                    }))}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                <Label className="cursor-pointer" htmlFor="showQRCode">QR код харуулах</Label>
                                <Switch
                                    id="showQRCode"
                                    checked={formData.printSettings?.showQRCode}
                                    onCheckedChange={(c) => setFormData(prev => ({
                                        ...prev,
                                        printSettings: { ...prev.printSettings!, showQRCode: c }
                                    }))}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
