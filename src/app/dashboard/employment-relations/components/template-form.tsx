'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp, doc, getDoc } from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { ERTemplate, ERDocumentType, PrintSettings } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Printer, Save, ArrowLeft, Plus, Trash2, Settings2, ChevronUp, ChevronDown,
    GripVertical, Sparkles, Loader2, Eye, Library, PanelLeftClose, PanelLeft,
    Check, Copy, Keyboard, Clock, CheckCircle2, AlertCircle, Wand2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DynamicFieldSelector } from './dynamic-field-selector';
import { RichTextEditor } from './rich-text-editor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
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
import { TEMPLATE_PRESETS, TEMPLATE_CATEGORIES, TemplatePreset } from '../data/template-library';

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
    showQRCode: true,
    companyName: 'Байгууллагын нэр'
};

export function TemplateForm({ initialData, docTypes, mode, templateId }: TemplateFormProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isInputsDialogOpen, setIsInputsDialogOpen] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showSplitView, setShowSplitView] = useState(true);
    const [editorMode, setEditorMode] = useState<'visual' | 'preview'>('visual');
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [selectedPresetCategory, setSelectedPresetCategory] = useState<string>('contract');
    const [pendingInsertContent, setPendingInsertContent] = useState<string | null>(null);
    const [companyProfile, setCompanyProfile] = useState<any>(null);

    // Fetch company profile for logo
    useEffect(() => {
        if (!firestore) return;
        const profileRef = doc(firestore, 'company', 'profile');
        getDoc(profileRef).then(snap => {
            if (snap.exists()) {
                setCompanyProfile(snap.data());
            }
        });
    }, [firestore]);

    const [formData, setFormData] = useState<Partial<ERTemplate>>({
        isActive: true,
        isDeletable: false,
        version: 1,
        includeHeader: true,
        printSettings: DEFAULT_PRINT_SETTINGS,
        requiredFields: [],
        customInputs: [],
        ...initialData
    });

    // Track unsaved changes
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({ ...prev, ...initialData }));
        }
    }, [initialData]);

    useEffect(() => {
        setHasUnsavedChanges(true);
    }, [formData]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ctrl+S or Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSubmit();
            }
            // Ctrl+Shift+V to open variable selector
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                // Focus on search in variable selector
                const searchInput = document.querySelector('[data-variable-search]') as HTMLInputElement;
                searchInput?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [formData]);

    // Warn before leaving with unsaved changes
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [hasUnsavedChanges]);

    // Calculate completion progress
    const completionProgress = React.useMemo(() => {
        let completed = 0;
        const total = 3;

        if (formData.name && formData.name.length > 0) completed++;
        if (formData.documentTypeId) completed++;
        if (formData.content && formData.content.length > 50) completed++;

        return Math.round((completed / total) * 100);
    }, [formData.name, formData.documentTypeId, formData.content]);

    const handleFieldSelect = (field: string) => {
        // Insert at cursor position in visual editor
        setPendingInsertContent(field);

        toast({
            title: 'Хувьсагч нэмэгдлээ',
            description: field,
            duration: 1500,
        });
    };

    const handlePresetSelect = (preset: TemplatePreset) => {
        setFormData(prev => ({
            ...prev,
            name: prev.name || preset.name,
            content: preset.content,
            customInputs: preset.customInputs || []
        }));
        setIsLibraryOpen(false);
        toast({
            title: 'Загвар ачааллаа',
            description: `"${preset.name}" загвар амжилттай ачааллаа`,
        });
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
                .map((input, idx) => ({ ...input, order: idx }))
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
                return {
                    ...prev,
                    customInputs: newInputs.map((input, idx) => ({ ...input, order: idx }))
                };
            } else if (direction === 'down' && index < currentInputs.length - 1) {
                const newInputs = arrayMove(currentInputs, index, index + 1);
                return {
                    ...prev,
                    customInputs: newInputs.map((input, idx) => ({ ...input, order: idx }))
                };
            }
            return prev;
        });
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
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
                const oldIndex = currentInputs.findIndex((i) => `input-${i.order}` === active.id);
                const newIndex = currentInputs.findIndex((i) => `input-${i.order}` === over.id);

                if (oldIndex === -1 || newIndex === -1) return prev;

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

    // Generate header HTML based on settings
    const generateHeaderHtml = React.useCallback(() => {
        if (!formData.includeHeader || !formData.documentTypeId) return '';
        
        const docType = docTypes.find(dt => dt.id === formData.documentTypeId);
        const header = docType?.header;
        
        const logoUrl = companyProfile?.logoUrl || '';
        const companyName = header?.title || companyProfile?.name || companyProfile?.legalName || '';
        const cityName = header?.cityName || 'Улаанбаатар';
        const showLogo = header?.showLogo !== false;
        const showDate = header?.showDate !== false;
        const showNumber = header?.showNumber !== false;
        
        const headerParts: string[] = [];
        
        // Logo (centered)
        if (showLogo && logoUrl) {
            headerParts.push(`<p style="text-align: center;"><img src="${logoUrl}" alt="Лого" style="width: 80px; display: block; margin: 0 auto;"></p>`);
        }
        
        // Company name (centered, bold, uppercase)
        if (companyName) {
            headerParts.push(`<p style="text-align: center;"><strong>${companyName.toUpperCase()}</strong></p>`);
        }
        
        // Empty line for spacing
        headerParts.push(`<p></p>`);
        
        // Date (left)
        if (showDate) {
            headerParts.push(`<p style="text-align: left;"><em>{{date.year}} оны {{date.month}} сарын {{date.day}}</em></p>`);
        }
        
        // Number (center)
        if (showNumber) {
            headerParts.push(`<p style="text-align: center;">№ {{document.number}}</p>`);
        }
        
        // City (right)
        headerParts.push(`<p style="text-align: right;">${cityName} хот</p>`);
        
        // Spacing after header
        headerParts.push(`<p></p>`);
        
        return headerParts.join('');
    }, [formData.includeHeader, formData.documentTypeId, docTypes, companyProfile]);

    const getPreviewHtml = React.useMemo(() => {
        const headerHtml = generateHeaderHtml();
        const contentToShow = headerHtml + (formData.content || '');
        
        if (!contentToShow) return '';

        const sampleData: Record<string, string> = {
            '{{company.name}}': 'ХХК "Жишээ Компани"',
            '{{company.legalName}}': 'ХХК "Жишээ Компани"',
            '{{company.address}}': 'УБ хот, СБД, 1-р хороо',
            '{{company.phone}}': '7700-1234',
            '{{company.email}}': 'info@example.mn',
            '{{company.ceo}}': 'Б. Болд',
            '{{company.registrationNumber}}': '1234567',
            '{{company.taxId}}': '9876543',
            '{{employee.firstName}}': 'Бат',
            '{{employee.lastName}}': 'Дорж',
            '{{employee.fullName}}': 'Дорж Бат',
            '{{employee.registerNo}}': 'АА00112233',
            '{{employee.hireDate}}': '2024-01-15',
            '{{position.title}}': 'Ахлах менежер',
            '{{department.name}}': 'Санхүү',
            '{{date.today}}': new Date().toISOString().split('T')[0],
            '{{date.year}}': new Date().getFullYear().toString(),
        };

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

        let html = contentToShow;
        Object.entries(sampleData).forEach(([key, value]) => {
            html = html.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'),
                `<span style="background-color: #fef3c7; padding: 0 4px; border-radius: 2px;">${value}</span>`);
        });

        html = html.replace(/\{\{([^}]+)\}\}/g,
            '<span style="background-color: #fee2e2; padding: 0 4px; border-radius: 2px; color: #dc2626;">{{$1}}</span>');

        return html;
    }, [formData.content, formData.customInputs, generateHeaderHtml]);

    const handleSubmit = async () => {
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
                await setDocumentNonBlocking(doc(firestore, 'er_templates', templateId), templateData, { merge: true });
                toast({ title: "Амжилттай", description: "Загвар шинэчлэгдлээ" });
            } else {
                const newDoc = {
                    ...templateData,
                    createdAt: Timestamp.now()
                };
                await addDocumentNonBlocking(collection(firestore, 'er_templates'), newDoc);
                toast({ title: "Амжилттай", description: "Шинэ загвар үүслээ" });
            }
            setHasUnsavedChanges(false);
            setLastSaved(new Date());
            router.push('/dashboard/employment-relations?tab=templates');
        } catch (error) {
            console.error(error);
            toast({ title: "Алдаа", description: "Загвар хадгалахад алдаа гарлаа", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <TooltipProvider>
            <div className="space-y-6 max-w-7xl mx-auto pb-20">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="h-4 w-4 mr-2" /> Буцах
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {mode === 'create' ? 'Шинэ загвар үүсгэх' : 'Загвар засах'}
                    </h1>

                    {/* Progress indicator */}
                    <div className="flex items-center gap-2 ml-4">
                        <Progress value={completionProgress} className="w-24 h-2" />
                        <span className="text-xs text-muted-foreground">{completionProgress}%</span>
                    </div>

                    {/* Save status */}
                    {hasUnsavedChanges && (
                        <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Хадгалаагүй
                        </Badge>
                    )}
                    {lastSaved && !hasUnsavedChanges && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Хадгалсан
                        </Badge>
                    )}

                    <div className="flex-1" />

                    {/* Keyboard shortcut hint */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-muted-foreground">
                                <Keyboard className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="w-64">
                            <div className="space-y-2 text-xs">
                                <p className="font-semibold mb-2">Товчлуур</p>
                                <div className="flex justify-between"><span>Хадгалах</span><kbd className="px-1 bg-muted rounded">Ctrl+S</kbd></div>
                                <div className="flex justify-between"><span>Хувьсагч хайх</span><kbd className="px-1 bg-muted rounded">Ctrl+Shift+V</kbd></div>
                            </div>
                        </TooltipContent>
                    </Tooltip>

                    {/* Template Library Button */}
                    <Button
                        variant="outline"
                        onClick={() => setIsLibraryOpen(true)}
                        className="gap-2"
                    >
                        <Library className="h-4 w-4" />
                        Загварын сан
                    </Button>

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

                {/* Completion checklist */}
                {completionProgress < 100 && (
                    <Card className="border-amber-200 bg-amber-50/50">
                        <CardContent className="py-3">
                            <div className="flex items-center gap-4 text-sm">
                                <span className="font-medium text-amber-800">Бөглөх шаардлагатай:</span>
                                <div className="flex gap-3">
                                    {!formData.name && (
                                        <Badge variant="outline" className="bg-white">Загварын нэр</Badge>
                                    )}
                                    {!formData.documentTypeId && (
                                        <Badge variant="outline" className="bg-white">Баримтын төрөл</Badge>
                                    )}
                                    {(!formData.content || formData.content.length < 50) && (
                                        <Badge variant="outline" className="bg-white">Агуулга</Badge>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Main Content */}
                    <div className={cn("space-y-6", showSplitView ? "lg:col-span-8" : "lg:col-span-9")}>
                        {/* Basic Info */}
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-4">
                                <CardTitle>Үндсэн мэдээлэл</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Загварын нэр <span className="text-red-500">*</span></Label>
                                        <Input
                                            value={formData.name || ''}
                                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Жишээ: Хөдөлмөрийн гэрээ - Үндсэн"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Баримтын төрөл <span className="text-red-500">*</span></Label>
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
                                </div>

                                {/* Include Header Option */}
                                {formData.documentTypeId && (
                                    <div className="mt-4 space-y-3">
                                        <div className="flex items-center justify-between rounded-lg border p-3 bg-slate-50">
                                            <div className="space-y-0.5">
                                                <Label className="cursor-pointer text-sm font-medium">
                                                    Толгой хэсэг оруулах
                                                </Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Баримтын төрлийн толгой тохиргоог ашиглах
                                                </p>
                                            </div>
                                            <Switch
                                                checked={formData.includeHeader ?? true}
                                                onCheckedChange={(c) => setFormData(prev => ({ ...prev, includeHeader: c }))}
                                            />
                                        </div>
                                        
                                        {formData.includeHeader && (
                                            <div className="flex items-center gap-3 p-2 rounded border bg-white">
                                                {companyProfile?.logoUrl ? (
                                                    <>
                                                        <img 
                                                            src={companyProfile.logoUrl} 
                                                            alt="Logo" 
                                                            className="h-10 w-10 object-contain border rounded"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm font-medium truncate">{companyProfile?.name || 'Байгууллага'}</p>
                                                            <p className="text-xs text-green-600">✓ Толгой урьдчилан харахад харагдана</p>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="h-10 w-10 bg-slate-100 rounded border flex items-center justify-center">
                                                            <AlertCircle className="h-5 w-5 text-slate-400" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium">{companyProfile?.name || 'Байгууллага'}</p>
                                                            <p className="text-xs text-amber-600">Лого оруулаагүй байна</p>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Content Editor */}
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Баримтын агуулга <span className="text-red-500">*</span></CardTitle>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={editorMode} onValueChange={(v) => setEditorMode(v as 'visual' | 'preview')} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="visual" className="gap-2">
                                            <Wand2 className="h-4 w-4" />
                                            Засварлах
                                        </TabsTrigger>
                                        <TabsTrigger value="preview" className="gap-2">
                                            <Eye className="h-4 w-4" />
                                            Урьдчилан харах
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="visual" className="mt-0">
                                        <RichTextEditor
                                            content={formData.content || ''}
                                            onChange={(html) => setFormData(prev => ({ ...prev, content: html }))}
                                            insertContent={pendingInsertContent}
                                            onInsertComplete={() => setPendingInsertContent(null)}
                                            placeholder="Энд баримтынхаа агуулгыг бичнэ үү..."
                                        />
                                        <p className="text-xs text-muted-foreground mt-2">
                                            💡 Хажуугийн хувьсагч дээр дарж агуулгад нэмнэ
                                        </p>
                                    </TabsContent>

                                    <TabsContent value="preview" className="mt-0">
                                        <div className="min-h-[500px] border rounded-lg bg-white overflow-auto shadow-inner">
                                            {(formData.content || formData.includeHeader) ? (
                                                <div
                                                    className="p-8 prose prose-sm max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: getPreviewHtml }}
                                                />
                                            ) : (
                                                <div className="h-[500px] flex items-center justify-center text-muted-foreground text-sm">
                                                    Агуулга оруулснаар энд харагдана
                                                </div>
                                            )}
                                        </div>
                                        {/* Legend */}
                                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground mt-3">
                                            <div className="flex items-center gap-1">
                                                <span className="inline-block w-3 h-3 bg-amber-100 rounded" />
                                                Системийн утга (жишээ)
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <span className="inline-block w-3 h-3 bg-red-100 rounded" />
                                                Тодорхойлогдоогүй хувьсагч
                                            </div>
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className={cn("space-y-6", showSplitView ? "lg:col-span-4" : "lg:col-span-3")}>
                        {/* Status */}
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Төлөв</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                    <Label htmlFor="active-mode" className="cursor-pointer text-sm">Идэвхтэй эсэх</Label>
                                    <Switch
                                        id="active-mode"
                                        checked={formData.isActive}
                                        onCheckedChange={(c) => setFormData(prev => ({ ...prev, isActive: c }))}
                                    />
                                </div>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="allow-delete" className="cursor-pointer text-sm">Устгах боломжтой</Label>
                                        <p className="text-[10px] text-slate-500">
                                            Баримт үүсгэсний дараа шууд устгах эрх
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

                        {/* Variable Selector */}
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm">Хувьсагч ашиглах</CardTitle>
                                <CardDescription className="text-xs">Дээр дарж HTML-д нэмнэ</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full justify-start gap-2 border-dashed border-primary/40 text-primary hover:bg-primary/5"
                                    onClick={() => setIsInputsDialogOpen(true)}
                                >
                                    <Plus className="h-4 w-4" /> Өөрийн хувьсагч нэмэх
                                </Button>

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

                        {/* Custom Inputs Summary */}
                        {formData.customInputs && formData.customInputs.length > 0 && (
                            <Card className="border-none shadow-sm">
                                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm">Өөрийн хувьсагчууд</CardTitle>
                                        <CardDescription className="text-xs">
                                            Нийт {formData.customInputs.length} хувьсагч
                                        </CardDescription>
                                    </div>
                                    <Button variant="ghost" size="sm" onClick={() => setIsInputsDialogOpen(true)}>
                                        <Settings2 className="h-4 w-4" />
                                    </Button>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1">
                                        {formData.customInputs.slice(0, 5).map((input, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-slate-50 rounded">
                                                <code className="text-primary">{`{{${input.key || '...'}}}`}</code>
                                                <span className="text-muted-foreground truncate">{input.label}</span>
                                            </div>
                                        ))}
                                        {formData.customInputs.length > 5 && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={() => setIsInputsDialogOpen(true)}
                                            >
                                                +{formData.customInputs.length - 5} бусад...
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Print Settings */}
                        <Card className="border-none shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Printer className="h-4 w-4" /> Хэвлэх тохиргоо
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Page Size */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Хуудасны хэмжээ</Label>
                                    <Select
                                        value={formData.printSettings?.pageSize || 'A4'}
                                        onValueChange={(v) => setFormData(prev => ({
                                            ...prev,
                                            printSettings: { ...prev.printSettings!, pageSize: v as 'A4' | 'A5' }
                                        }))}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="A4">A4 (210 × 297 мм)</SelectItem>
                                            <SelectItem value="A5">A5 (148 × 210 мм)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Orientation */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">Хуудасны чиглэл</Label>
                                    <Select
                                        value={formData.printSettings?.orientation || 'portrait'}
                                        onValueChange={(v) => setFormData(prev => ({
                                            ...prev,
                                            printSettings: { ...prev.printSettings!, orientation: v as 'portrait' | 'landscape' }
                                        }))}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="portrait">Босоо</SelectItem>
                                            <SelectItem value="landscape">Хэвтээ</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border">
                                    <Label className="cursor-pointer text-sm" htmlFor="showQRCode">QR код харуулах</Label>
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

                {/* Template Library Dialog */}
                <Dialog open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
                    <DialogContent className="max-w-4xl max-h-[85vh]">
                        <DialogHeader>
                            <DialogTitle>Загварын сан</DialogTitle>
                            <DialogDescription>
                                Бэлэн загвараас сонгож эхлүүлнэ үү
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex gap-4 mt-4">
                            {/* Categories */}
                            <div className="w-48 space-y-1">
                                {TEMPLATE_CATEGORIES.map(cat => (
                                    <Button
                                        key={cat.id}
                                        variant={selectedPresetCategory === cat.id ? "default" : "ghost"}
                                        className="w-full justify-start"
                                        onClick={() => setSelectedPresetCategory(cat.id)}
                                    >
                                        <span className="mr-2">{cat.icon}</span>
                                        {cat.label}
                                    </Button>
                                ))}
                            </div>

                            {/* Templates */}
                            <ScrollArea className="flex-1 h-[500px]">
                                <div className="grid grid-cols-2 gap-4 pr-4">
                                    {TEMPLATE_PRESETS
                                        .filter(p => p.category === selectedPresetCategory)
                                        .map(preset => (
                                            <Card
                                                key={preset.id}
                                                className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
                                                onClick={() => handlePresetSelect(preset)}
                                            >
                                                <CardHeader className="pb-2">
                                                    <CardTitle className="text-sm">{preset.name}</CardTitle>
                                                    <CardDescription className="text-xs">
                                                        {preset.description}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <Badge variant="outline" className="text-[10px]">
                                                            {preset.customInputs?.length || 0} хувьсагч
                                                        </Badge>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                </div>
                            </ScrollArea>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Custom Inputs Dialog */}
                <Dialog open={isInputsDialogOpen} onOpenChange={setIsInputsDialogOpen}>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Өөрийн хувьсагчууд</DialogTitle>
                            <DialogDescription>
                                Баримт үүсгэх үед нэмэлтээр бөглөх шаардлагатай утгуудыг энд тохируулна.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            {(!formData.customInputs || formData.customInputs.length === 0) && (
                                <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-xl bg-slate-50/50">
                                    <p>Одоогоор өөрийн тодорхойлсон хувьсагч байхгүй байна.</p>
                                    <Button variant="outline" size="sm" className="mt-4" onClick={addCustomInput}>
                                        <Plus className="h-4 w-4 mr-2" /> Хувьсагч нэмэх
                                    </Button>
                                </div>
                            )}

                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={(formData.customInputs || []).map(i => `input-${i.order}`)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <div className="space-y-3">
                                        {[...(formData.customInputs || [])]
                                            .sort((a, b) => (a.order || 0) - (b.order || 0))
                                            .map((input, index, allInputs) => (
                                                <SortableInputItem
                                                    key={`input-${input.order}`}
                                                    id={`input-${input.order}`}
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
                                <Plus className="h-4 w-4 mr-2" /> Шинэ хувьсагч нэмэх
                            </Button>
                            <Button onClick={() => setIsInputsDialogOpen(false)}>Болсон</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

            </div>
        </TooltipProvider>
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
            <div
                {...attributes}
                {...listeners}
                className="flex flex-col items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing hover:text-primary transition-colors"
                title="Чирж эрэмбэлэх"
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
                                <SelectItem value="text">Текст</SelectItem>
                                <SelectItem value="number">Тоо</SelectItem>
                                <SelectItem value="date">Огноо</SelectItem>
                                <SelectItem value="boolean">Тийм/Үгүй</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-500">Тайлбар</Label>
                        <Input
                            value={input.description}
                            onChange={(e) => onUpdate(input.order, 'description', e.target.value)}
                            placeholder="Заавал бөглөх утга"
                            className="bg-slate-50/50 border-slate-200 h-9 text-xs"
                        />
                    </div>
                </div>
            </div>

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
