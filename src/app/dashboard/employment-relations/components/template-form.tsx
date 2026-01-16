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
import { Printer, Save, ArrowLeft, Plus, Trash2, Settings2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DynamicFieldSelector } from './dynamic-field-selector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';

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
    const [isInputsDialogOpen, setIsInputsDialogOpen] = useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const [formData, setFormData] = useState<Partial<ERTemplate>>({
        isActive: true,
        version: 1,
        printSettings: DEFAULT_PRINT_SETTINGS,
        requiredFields: [],
        customInputs: [],
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

    const addCustomInput = () => {
        setFormData(prev => ({
            ...prev,
            customInputs: [...(prev.customInputs || []), { key: '', label: '', description: '', required: true }]
        }));
    };

    const removeCustomInput = (index: number) => {
        setFormData(prev => ({
            ...prev,
            customInputs: prev.customInputs?.filter((_, i) => i !== index)
        }));
    };

    const updateCustomInput = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const inputs = [...(prev.customInputs || [])];
            inputs[index] = { ...inputs[index], [field]: value };
            return { ...prev, customInputs: inputs };
        });
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
                            <CardTitle>HTML Агуулга</CardTitle>
                            <CardDescription>Баримтын эх бэлтгэлийг энд оруулна</CardDescription>
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
                            <CardTitle>Хувьсагч ашиглах</CardTitle>
                            <CardDescription>Баримтад ашиглах систем болон өөрийн тодорхойлсон хувьсагчууд</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5"
                                    onClick={() => setIsInputsDialogOpen(true)}
                                >
                                    <Plus className="h-4 w-4 mr-1" /> Шинэ оролтын утга нэмэх
                                </Button>
                            </div>

                            <DynamicFieldSelector
                                onSelect={handleFieldSelect}
                                customFields={formData.customInputs?.map(i => ({
                                    key: `{{${i.key}}}`,
                                    label: i.label,
                                    example: i.description || ''
                                }))}
                            />
                        </CardContent>
                    </Card>

                    <Card className="border-none shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Оролтын утгууд</CardTitle>
                                <CardDescription>Нийт {formData.customInputs?.length || 0} утга тодорхойлсон байна</CardDescription>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => setIsInputsDialogOpen(true)}>
                                <Settings2 className="h-4 w-4 mr-1" /> Засах
                            </Button>
                        </CardHeader>
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

            {/* Custom Inputs Dialog */}
            <Dialog open={isInputsDialogOpen} onOpenChange={setIsInputsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Оролтын утгууд (Custom Inputs)</DialogTitle>
                        <DialogDescription>
                            Баримт үүсгэх үед нэмэлтээр бөглөх шаардлагатай утгуудыг энд тохируулна.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {(!formData.customInputs || formData.customInputs.length === 0) && (
                            <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50/50">
                                <p>Одоогоор өөрийн тодорхойлсон оролтын утга байхгүй байна.</p>
                                <Button variant="outline" size="sm" className="mt-4" onClick={addCustomInput}>
                                    <Plus className="h-4 w-4 mr-2" /> Томъёо нэмэх
                                </Button>
                            </div>
                        )}

                        {formData.customInputs?.map((input, index) => (
                            <div key={index} className="flex flex-col gap-4 p-4 bg-slate-50 border rounded-xl relative group">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 text-rose-500 hover:bg-rose-50"
                                    onClick={() => removeCustomInput(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-slate-500">Утгын нэр (Label)</Label>
                                        <Input
                                            value={input.label}
                                            onChange={(e) => updateCustomInput(index, 'label', e.target.value)}
                                            placeholder="Жишээ: Гэрээний дугаар"
                                            className="bg-white"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-slate-500">Хувьсагчийн нэр (Key)</Label>
                                        <div className="flex items-center gap-2">
                                            <code className="text-primary font-bold">{"{{"}</code>
                                            <Input
                                                value={input.key}
                                                onChange={(e) => updateCustomInput(index, 'key', e.target.value.replace(/\s+/g, '_'))}
                                                placeholder="contract_number"
                                                className="bg-white"
                                            />
                                            <code className="text-primary font-bold">{"}}"}</code>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-bold text-slate-500">Тайлбар (Заавар)</Label>
                                    <Input
                                        value={input.description}
                                        onChange={(e) => updateCustomInput(index, 'description', e.target.value)}
                                        placeholder="Жишээ: Гэрээний дүрмийн дагуу дугаарыг оруулна уу"
                                        className="bg-white"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <DialogFooter className="flex justify-between items-center sm:justify-between border-t pt-4">
                        <Button variant="outline" size="sm" onClick={addCustomInput}>
                            <Plus className="h-4 w-4 mr-2" /> Шинэ талбар нэмэх
                        </Button>
                        <Button onClick={() => setIsInputsDialogOpen(false)}>Болсон</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div >
    );
}
