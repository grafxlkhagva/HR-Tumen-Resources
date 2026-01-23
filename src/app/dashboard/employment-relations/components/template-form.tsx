'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp, doc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { ERTemplate, ERDocumentType, PrintSettings } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Printer, Save, ArrowLeft, Plus, Trash2, Settings2, ChevronUp, ChevronDown, GripVertical, Sparkles, Loader2, Eye, Code } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DynamicFieldSelector } from './dynamic-field-selector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
    const [isGenerating, setIsGenerating] = useState(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const [formData, setFormData] = useState<Partial<ERTemplate>>({
        isActive: true,
        isDeletable: false, // Default to false
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
        const currentInputs = formData.customInputs || [];
        const nextOrder = currentInputs.length > 0
            ? Math.max(...currentInputs.map(i => i.order || 0)) + 1
            : 0;

        setFormData(prev => ({
            ...prev,
            customInputs: [...currentInputs, { key: '', label: '', description: '', required: true, type: 'text', order: nextOrder }]
        }));
    };

    const removeCustomInput = (order: number) => {
        setFormData(prev => ({
            ...prev,
            customInputs: prev.customInputs
                ?.filter((input) => input.order !== order)
                .map((input, idx) => ({ ...input, order: idx })) // Re-index order
        }));
    };

    const updateCustomInput = (order: number, field: string, value: any) => {
        setFormData(prev => {
            const inputs = prev.customInputs?.map(input =>
                input.order === order ? { ...input, [field]: value } : input
            );
            return { ...prev, customInputs: inputs };
        });
    };

    const moveCustomInput = (index: number, direction: 'up' | 'down') => {
        setFormData(prev => {
            const currentInputs = [...(prev.customInputs || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
            if (direction === 'up' && index > 0) {
                const newInputs = arrayMove(currentInputs, index, index - 1);
                // Update order properties
                return {
                    ...prev,
                    customInputs: newInputs.map((input, idx) => ({ ...input, order: idx }))
                };
            } else if (direction === 'down' && index < currentInputs.length - 1) {
                const newInputs = arrayMove(currentInputs, index, index + 1);
                // Update order properties
                return {
                    ...prev,
                    customInputs: newInputs.map((input, idx) => ({ ...input, order: idx }))
                };
            }
            return prev;
        });
    };

    // DND Hooks
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // Require 8px of movement before starting drag (allows clicking)
            }
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setFormData((prev) => {
                const currentInputs = [...(prev.customInputs || [])].sort((a, b) => (a.order || 0) - (b.order || 0));
                const oldIndex = currentInputs.findIndex((i) => i.key === active.id || `input-${i.order}` === active.id);
                const newIndex = currentInputs.findIndex((i) => i.key === over.id || `input-${i.order}` === over.id);

                const newInputs = arrayMove(currentInputs, oldIndex, newIndex);
                return {
                    ...prev,
                    customInputs: newInputs.map((input, idx) => ({ ...input, order: idx }))
                };
            });
        }
    };

    const handleAIGenerate = async () => {
        if (!formData.name) {
            toast({
                title: 'Анхааруулга',
                description: 'Загварын нэрийг эхлээд оруулна уу',
                variant: 'destructive'
            });
            return;
        }

        // Find selected document type name
        const selectedDocType = docTypes.find(dt => dt.id === formData.documentTypeId);

        setIsGenerating(true);
        try {
            const response = await fetch('/api/generate-template', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateName: formData.name,
                    documentTypeName: selectedDocType?.name || '',
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Generation failed');
            }

            // Update form with generated content
            setFormData(prev => ({
                ...prev,
                content: result.data.content || prev.content,
                customInputs: result.data.customInputs || prev.customInputs
            }));

            toast({
                title: 'Амжилттай',
                description: 'AI загвар үүсгэлээ. Шаардлагатай бол засварлана уу.',
            });
        } catch (error) {
            console.error('AI generation error:', error);
            toast({
                title: 'Алдаа',
                description: 'AI загвар үүсгэхэд алдаа гарлаа',
                variant: 'destructive'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Generate preview HTML with sample data
    const getPreviewHtml = React.useMemo(() => {
        if (!formData.content) return '';
        
        // Sample data for system placeholders
        const sampleData: Record<string, string> = {
            '{{company.name}}': 'ХХК "Жишээ Компани"',
            '{{company.address}}': 'УБ хот, СБД, 1-р хороо',
            '{{company.phone}}': '7700-1234',
            '{{company.email}}': 'info@example.mn',
            '{{employee.firstName}}': 'Бат',
            '{{employee.lastName}}': 'Дорж',
            '{{employee.registrationNumber}}': 'АА00112233',
            '{{employee.position}}': 'Ахлах менежер',
            '{{employee.department}}': 'Санхүү',
            '{{employee.phone}}': '9900-1234',
            '{{employee.email}}': 'bat@example.mn',
            '{{employee.startDate}}': '2024-01-15',
            '{{currentDate}}': new Date().toISOString().split('T')[0],
            '{{documentNumber}}': 'DOC-2024-001',
        };

        // Add custom inputs with sample values
        formData.customInputs?.forEach(input => {
            if (input.key) {
                const placeholder = `{{${input.key}}}`;
                let sampleValue = input.label || input.key;
                if (input.type === 'number') sampleValue = '100,000';
                if (input.type === 'date') sampleValue = '2024-12-31';
                if (input.type === 'boolean') sampleValue = 'Тийм';
                sampleData[placeholder] = `[${sampleValue}]`;
            }
        });

        // Replace all placeholders
        let html = formData.content;
        Object.entries(sampleData).forEach(([key, value]) => {
            html = html.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), 
                `<span style="background-color: #fef3c7; padding: 0 4px; border-radius: 2px;">${value}</span>`);
        });

        // Highlight remaining placeholders that weren't replaced
        html = html.replace(/\{\{([^}]+)\}\}/g, 
            '<span style="background-color: #fee2e2; padding: 0 4px; border-radius: 2px; color: #dc2626;">{{$1}}</span>');

        return html;
    }, [formData.content, formData.customInputs]);

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
                <Button
                    variant="outline"
                    onClick={handleAIGenerate}
                    disabled={isGenerating || !formData.name}
                    className="gap-2 border-violet-200 text-violet-600 hover:bg-violet-50 hover:text-violet-700"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Үүсгэж байна...
                        </>
                    ) : (
                        <>
                            <Sparkles className="h-4 w-4" />
                            AI-р үүсгэх
                        </>
                    )}
                </Button>
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
                        <CardHeader className="pb-2">
                            <CardTitle>HTML Агуулга</CardTitle>
                            <CardDescription>Баримтын эх бэлтгэлийг энд оруулна</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="code" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-4">
                                    <TabsTrigger value="code" className="gap-2">
                                        <Code className="h-4 w-4" />
                                        HTML код
                                    </TabsTrigger>
                                    <TabsTrigger value="preview" className="gap-2">
                                        <Eye className="h-4 w-4" />
                                        Бодит харагдах байдал
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="code" className="mt-0">
                                    <Textarea
                                        ref={textareaRef}
                                        className="min-h-[500px] font-mono text-sm leading-relaxed p-4 bg-slate-950 text-slate-100 border-slate-800 rounded-lg"
                                        value={formData.content || ''}
                                        onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                                        placeholder="HTML код энд бичнэ..."
                                    />
                                </TabsContent>

                                <TabsContent value="preview" className="mt-0">
                                    <div className="min-h-[500px] border rounded-lg bg-white overflow-auto">
                                        {formData.content ? (
                                            <div 
                                                className="p-6 prose prose-sm max-w-none"
                                                dangerouslySetInnerHTML={{ __html: getPreviewHtml }}
                                            />
                                        ) : (
                                            <div className="h-[500px] flex items-center justify-center text-muted-foreground text-sm">
                                                HTML код оруулснаар энд харагдана
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-3">
                                        <div className="flex items-center gap-1">
                                            <span className="inline-block w-3 h-3 bg-amber-100 rounded" />
                                            Системийн утга
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="inline-block w-3 h-3 bg-red-100 rounded" />
                                            Тодорхойлогдоогүй утга
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>
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
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border mt-2">
                                <div className="space-y-0.5">
                                    <Label htmlFor="allow-delete" className="cursor-pointer">Шууд устгах боломжтой</Label>
                                    <p className="text-[10px] text-slate-500">
                                        Баримт үүсгэсний дараа шууд устгах эрхтэй эсэх
                                    </p>
                                </div>
                                <Switch
                                    id="allow-delete"
                                    checked={formData.isDeletable}
                                    onCheckedChange={(c) => setFormData(prev => ({ ...prev, isDeletable: c }))}
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
                                customFields={[...(formData.customInputs || [])]
                                    .sort((a, b) => (a.order || 0) - (b.order || 0))
                                    .map((i, idx) => ({
                                        key: i.key ? `{{${i.key}}}` : `{{new_field_${idx}}}`,
                                        label: i.label || `New Field ${idx + 1}`,
                                        example: i.description || '',
                                        type: i.type || 'text'
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

                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={(formData.customInputs || []).map(i => i.key || `input-${i.order}`)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="space-y-3">
                                    {[...(formData.customInputs || [])]
                                        .sort((a, b) => (a.order || 0) - (b.order || 0))
                                        .map((input, index, allInputs) => (
                                            <SortableInputItem
                                                key={input.key || `input-${input.order}`}
                                                id={input.key || `input-${input.order}`}
                                                input={input}
                                                index={index}
                                                isLast={index === allInputs.length - 1}
                                                onUpdate={updateCustomInput}
                                                onRemove={removeCustomInput}
                                                onMove={moveCustomInput}
                                            />
                                        ))}
                                </div>
                            </SortableContext>
                        </DndContext>
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

function SortableInputItem({ id, input, index, isLast, onUpdate, onRemove, onMove }: {
    id: string;
    input: any;
    index: number;
    isLast: boolean;
    onUpdate: (order: number, field: string, value: any) => void;
    onRemove: (order: number) => void;
    onMove: (index: number, direction: 'up' | 'down') => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={cn(
                "flex gap-4 p-4 bg-white border rounded-xl relative group hover:border-primary/30 transition-all shadow-sm",
                isDragging && "shadow-2xl border-primary ring-2 ring-primary/10"
            )}
        >
            {/* Left Handle Decor */}
            <div
                {...attributes}
                {...listeners}
                className="flex flex-col items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing hover:text-primary transition-colors"
                title="Чирч эрэмбэлэх"
            >
                <GripVertical className="h-5 w-5" />
            </div>

            <div className="flex-1 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Утгын нэр (Label)</Label>
                        <Input
                            value={input.label}
                            onChange={(e) => onUpdate(input.order, 'label', e.target.value)}
                            placeholder="Жишээ: Гэрээний дугаар"
                            className="bg-slate-50/50 border-slate-200 h-9 text-xs"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Хувьсагчийн нэр (Key)</Label>
                        <div className="flex items-center gap-2">
                            <code className="text-primary font-bold">{"{{"}</code>
                            <Input
                                value={input.key}
                                onChange={(e) => onUpdate(input.order, 'key', e.target.value.replace(/\s+/g, '_'))}
                                placeholder="contract_number"
                                className="bg-slate-50/50 border-slate-200 h-9 text-xs"
                            />
                            <code className="text-primary font-bold">{"}}"}</code>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Утгын төрөл</Label>
                        <Select
                            value={input.type || 'text'}
                            onValueChange={(val) => onUpdate(input.order, 'type', val)}
                        >
                            <SelectTrigger className="bg-slate-50/50 border-slate-200 h-9 text-xs">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Текст (Text)</SelectItem>
                                <SelectItem value="number">Тоо (Number)</SelectItem>
                                <SelectItem value="date">Огноо (Date)</SelectItem>
                                <SelectItem value="boolean">Тийм/Үгүй (Checkbox)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Тайлбар (Заавар)</Label>
                        <Input
                            value={input.description}
                            onChange={(e) => onUpdate(input.order, 'description', e.target.value)}
                            placeholder="Заавал бөглөх утга"
                            className="bg-slate-50/50 border-slate-200 h-9 text-xs"
                        />
                    </div>
                </div>
            </div>

            {/* Action Sidebar */}
            <div className="flex flex-col gap-1 border-l pl-4">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-primary/5"
                    onClick={() => onMove(index, 'up')}
                    disabled={index === 0}
                    title="Дээшлүүлэх"
                >
                    <ChevronUp className="h-5 w-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-slate-400 hover:text-primary hover:bg-primary/5"
                    onClick={() => onMove(index, 'down')}
                    disabled={isLast}
                    title="Доошлуулах"
                >
                    <ChevronDown className="h-5 w-5" />
                </Button>
                <div className="flex-1 min-h-[4px]" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => onRemove(input.order)}
                    title="Устгах"
                >
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
