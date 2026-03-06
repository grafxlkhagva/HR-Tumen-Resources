'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReferenceTable, type ReferenceItem } from "@/components/ui/reference-table";
import { useCollection, useMemoFirebase, useFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, getDoc } from "firebase/firestore";
import { PageHeader } from '@/components/patterns/page-layout';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, FileText, Hash, Info, Image, MapPin, Calendar, FileDigit, PlusCircle } from 'lucide-react';
import { generateDocCode } from '../utils';
import { DocumentHeader, NumberingConfig } from '../types';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type ERDocumentTypeReferenceItem = ReferenceItem & {
    name: string;
    prefix?: string;
    code?: string;
    category?: string;
    currentNumber?: number;
    lastNumberYear?: number;
    isMandatory?: boolean;
    header?: DocumentHeader;
    numberingConfig?: NumberingConfig;
};

const DEFAULT_HEADER: DocumentHeader = {
    title: '',
    showLogo: true,
    logoPosition: 'center',
    cityName: 'Улаанбаатар',
    showDate: true,
    showNumber: true,
};

const DEFAULT_NUMBERING: NumberingConfig = {
    includePrefix: true,
    includeYear: true,
    includeMonth: false,
    includeDay: false,
    separator: '-',
    numberPadding: 4,
    startNumber: 1,
    resetPeriod: 'yearly',
};

// Generate preview document number based on config
function generatePreviewNumber(prefix: string, config: NumberingConfig, sequence: number = 1): string {
    const parts: string[] = [];
    const now = new Date();
    const sep = config.separator || '-';
    
    if (config.includePrefix && prefix) {
        parts.push(prefix);
    }
    
    if (config.includeYear) {
        parts.push(now.getFullYear().toString());
    }
    
    if (config.includeMonth) {
        parts.push(String(now.getMonth() + 1).padStart(2, '0'));
    }
    
    if (config.includeDay) {
        parts.push(String(now.getDate()).padStart(2, '0'));
    }
    
    const padding = config.numberPadding || 4;
    parts.push(String(sequence).padStart(padding, '0'));
    
    return parts.join(sep);
}

// Санал болгох үсгэн кодууд
const SUGGESTED_PREFIXES = [
    { prefix: 'ГЭР', name: 'Гэрээ', desc: 'Хөдөлмөрийн гэрээ' },
    { prefix: 'ТШЛ', name: 'Тушаал', desc: 'Захирамж, тушаал' },
    { prefix: 'ЧӨЛ', name: 'Чөлөө', desc: 'Чөлөө олголт' },
    { prefix: 'ШЛЖ', name: 'Шилжилт', desc: 'Шилжилт хөдөлгөөн' },
    { prefix: 'ТОМ', name: 'Томилолт', desc: 'Албан томилолт' },
    { prefix: 'ТОД', name: 'Тодорхойлолт', desc: 'Лавлагаа, тодорхойлолт' },
    { prefix: 'АЛБ', name: 'Албан бичиг', desc: 'Албан захидал' },
    { prefix: 'ГҮЙ', name: 'Гүйцэтгэл', desc: 'Гүйцэтгэлийн үнэлгээ' },
];

export default function ERDocumentTypesSettingsPage() {
    const { firestore } = useFirebase();
    const [dialogOpen, setDialogOpen] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState<ERDocumentTypeReferenceItem | null>(null);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [companyProfile, setCompanyProfile] = React.useState<any>(null);

    // Fetch company profile for logo
    React.useEffect(() => {
        if (!firestore) return;
        const profileRef = doc(firestore, 'company', 'profile');
        getDoc(profileRef).then(snap => {
            if (snap.exists()) {
                setCompanyProfile(snap.data());
            }
        });
    }, [firestore]);

    // Form state
    const [formData, setFormData] = React.useState({
        name: '',
        prefix: '',
        category: '',
        isMandatory: false,
        header: { ...DEFAULT_HEADER } as DocumentHeader,
        numberingConfig: { ...DEFAULT_NUMBERING } as NumberingConfig,
    });

    const documentTypesQuery = useMemoFirebase(
        ({ firestore }) => firestore ? collection(firestore, 'er_process_document_types') : null,
        []
    );
    const { data: documentTypes, isLoading: loadingDocTypes } = useCollection<ERDocumentTypeReferenceItem>(documentTypesQuery);

    // Reset form when dialog opens/closes
    React.useEffect(() => {
        if (dialogOpen) {
            if (editingItem) {
                setFormData({
                    name: editingItem.name || '',
                    prefix: editingItem.prefix || '',
                    category: editingItem.category || '',
                    isMandatory: editingItem.isMandatory || false,
                    header: editingItem.header || { ...DEFAULT_HEADER },
                    numberingConfig: editingItem.numberingConfig || { ...DEFAULT_NUMBERING },
                });
            } else {
                setFormData({
                    name: '',
                    prefix: '',
                    category: '',
                    isMandatory: false,
                    header: { ...DEFAULT_HEADER },
                    numberingConfig: { ...DEFAULT_NUMBERING },
                });
            }
        }
    }, [dialogOpen, editingItem]);

    const handleEdit = (item: ReferenceItem) => {
        setEditingItem(item as ERDocumentTypeReferenceItem);
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore || !formData.name || !formData.prefix) return;

        setIsSubmitting(true);

        const data = {
            name: formData.name,
            prefix: formData.prefix.toUpperCase(),
            code: formData.prefix.toUpperCase(), // code = prefix for backward compatibility
            category: formData.category || null,
            isMandatory: formData.isMandatory,
            header: formData.header,
            numberingConfig: formData.numberingConfig,
            updatedAt: new Date(),
        };

        try {
            if (editingItem) {
                const docRef = doc(firestore, 'er_process_document_types', editingItem.id);
                await updateDocumentNonBlocking(docRef, data);
            } else {
                const startNumber = formData.numberingConfig?.startNumber || 1;
                const colRef = collection(firestore, 'er_process_document_types');
                await addDocumentNonBlocking(colRef, {
                    ...data,
                    currentNumber: startNumber - 1, // Will be incremented to startNumber on first use
                    lastNumberYear: new Date().getFullYear(),
                    lastNumberMonth: new Date().getMonth() + 1,
                    lastNumberDay: new Date().getDate(),
                    createdAt: new Date(),
                });
            }
            setDialogOpen(false);
            setEditingItem(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Жишээ дугаар харуулах
    const exampleDocNumber = React.useMemo(() => {
        if (!formData.prefix && formData.numberingConfig?.includePrefix) return null;
        const startNum = formData.numberingConfig?.startNumber || 1;
        return generatePreviewNumber(formData.prefix.toUpperCase(), formData.numberingConfig || DEFAULT_NUMBERING, startNum);
    }, [formData.prefix, formData.numberingConfig]);

    const docTypeColumns = [
        {
            key: 'prefix',
            header: 'Код',
            render: (val: any) => val ? (
                <Badge className="font-mono text-xs bg-primary/10 text-primary border-0">
                    {val}
                </Badge>
            ) : (
                <span className="text-slate-300 text-xs">—</span>
            )
        },
        { key: 'name', header: 'Нэр' },
        {
            key: 'category',
            header: 'Ангилал',
            render: (val: any) => val ? (
                <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter px-2 h-5">
                    {val}
                </Badge>
            ) : (
                <span className="text-slate-300 text-[9px]">—</span>
            )
        },
        {
            key: 'currentNumber',
            header: 'Сүүлийн дугаар',
            render: (val: any, item: ERDocumentTypeReferenceItem) => {
                if (!item.prefix) return <span className="text-slate-300">—</span>;
                const year = item.lastNumberYear || new Date().getFullYear();
                const num = val || 0;
                if (num === 0) {
                    return <span className="text-slate-400 text-xs">Дугаар олгоогүй</span>;
                }
                return (
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">
                        {generateDocCode(item.prefix, year, num)}
                    </code>
                );
            }
        }
    ];

    return (
        <div className="p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PageHeader
                title="Баримтын төрлийн тохиргоо"
                description="Баримтын төрөл бүрт үсгэн код оноож, автомат дугаарлалт тохируулна"
                showBackButton={true}
                backHref="/dashboard/employment-relations"
            />

            <Card className="border shadow-sm bg-white rounded-xl overflow-hidden">
                <CardHeader className="px-6 pt-6 pb-4 border-b bg-slate-50/50">
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="text-lg font-semibold text-slate-800">Баримтын төрөл</CardTitle>
                            <CardDescription className="mt-1">
                                Баримт бүрт автомат дугаарлалт: <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">ҮСЭГ-ОН-ДУГААР</code>
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                                {documentTypes?.length || 0} төрөл
                            </Badge>
                            <Button
                                size="sm"
                                onClick={() => {
                                    setEditingItem(null);
                                    setDialogOpen(true);
                                }}
                            >
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Шинэ төрөл
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <ReferenceTable
                        collectionName="er_process_document_types"
                        columns={docTypeColumns}
                        itemData={documentTypes}
                        isLoading={loadingDocTypes}
                        dialogTitle="Баримтын төрөл"
                        onEdit={handleEdit}
                        hideAddButton={true}
                        compact={false}
                    />
                    
                    {/* Тусламж */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                        <div className="flex gap-3">
                            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800">
                                <p className="font-medium mb-1">Дугаарлалтын тухай</p>
                                <ul className="text-blue-700 space-y-1 text-xs">
                                    <li>• Баримт үүсгэх үед автоматаар дугаар олгогдоно</li>
                                    <li>• Жил бүр дугаарлалт 1-ээс эхэлнэ</li>
                                    <li>• Загварт <code className="bg-blue-100 px-1 rounded">{'{{document.number}}'}</code> ашиглан дугаар оруулна</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Custom Dialog */}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) setEditingItem(null);
            }}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                {editingItem ? 'Баримтын төрөл засах' : 'Шинэ баримтын төрөл'}
                            </DialogTitle>
                            <DialogDescription>
                                Баримтын төрөл, дугаарлалт болон толгойн тохиргоог хийнэ үү.
                            </DialogDescription>
                        </DialogHeader>

                        <Tabs defaultValue="basic" className="mt-4">
                            <VerticalTabMenu
                                orientation="horizontal"
                                items={[
                                    { value: 'basic', label: 'Үндсэн' },
                                    { value: 'numbering', label: 'Дугаарлалт' },
                                    { value: 'header', label: 'Толгой' },
                                ]}
                            />

                            <TabsContent value="basic" className="space-y-4 mt-4">
                                {/* Нэр */}
                                <div className="space-y-2">
                                    <Label htmlFor="name">Баримтын төрлийн нэр <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="name"
                                        placeholder="жнь: Хөдөлмөрийн гэрээ"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                    />
                                </div>

                                {/* Үсгэн код */}
                                <div className="space-y-2">
                                    <Label htmlFor="prefix" className="flex items-center gap-2">
                                        <Hash className="h-3.5 w-3.5" />
                                        Дугаарлалтын код <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="prefix"
                                        placeholder="жнь: ГЭР"
                                        value={formData.prefix}
                                        onChange={(e) => setFormData(prev => ({ 
                                            ...prev, 
                                            prefix: e.target.value.toUpperCase().slice(0, 5) 
                                        }))}
                                        className="font-mono uppercase"
                                        maxLength={5}
                                        required
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        2-5 Монгол үсэг (жнь: ГЭР, ТШЛ, ЧӨЛ)
                                    </p>
                                </div>

                                {/* Санал болгох кодууд */}
                                {!editingItem && (
                                    <div className="space-y-2">
                                        <Label className="text-xs text-muted-foreground">Санал болгох кодууд:</Label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {SUGGESTED_PREFIXES.map((s) => (
                                                <Button
                                                    key={s.prefix}
                                                    type="button"
                                                    variant={formData.prefix === s.prefix ? "default" : "outline"}
                                                    size="sm"
                                                    className="h-7 text-xs"
                                                    onClick={() => setFormData(prev => ({ 
                                                        ...prev, 
                                                        prefix: s.prefix,
                                                        name: prev.name || s.name
                                                    }))}
                                                >
                                                    {s.prefix}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Жишээ дугаар */}
                                {exampleDocNumber && (
                                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                                            <Info className="h-3.5 w-3.5" />
                                            Баримтын дугаар иймэрхүү харагдана:
                                        </div>
                                        <code className="text-lg font-mono font-bold text-primary">
                                            {exampleDocNumber}
                                        </code>
                                    </div>
                                )}

                                {/* Ангилал */}
                                <div className="space-y-2">
                                    <Label htmlFor="category">Ангилал (заавал биш)</Label>
                                    <Input
                                        id="category"
                                        placeholder="жнь: Гэрээ, Тушаал, Чөлөө"
                                        value={formData.category}
                                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                    />
                                </div>

                                {/* Заавал шаардлага */}
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="isMandatory" className="cursor-pointer">
                                            Заавал бүрдүүлэх шаардлага
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Ажилтан бүрт заавал байх ёстой баримт
                                        </p>
                                    </div>
                                    <Switch
                                        id="isMandatory"
                                        checked={formData.isMandatory}
                                        onCheckedChange={(c) => setFormData(prev => ({ ...prev, isMandatory: c }))}
                                    />
                                </div>
                            </TabsContent>

                            <TabsContent value="numbering" className="space-y-4 mt-4">
                                {/* Дугаарлалтын формат урьдчилсан харагдац */}
                                <div className="rounded-lg bg-primary/5 border border-primary/20 p-4">
                                    <div className="text-xs text-muted-foreground mb-2">Дугаарын формат:</div>
                                    <code className="text-xl font-mono font-bold text-primary">
                                        {exampleDocNumber || 'ГЭР-2026-0001'}
                                    </code>
                                    <div className="mt-2 text-xs text-muted-foreground">
                                        Дараагийн дугаар: {generatePreviewNumber(formData.prefix, formData.numberingConfig || DEFAULT_NUMBERING, 2)}
                                    </div>
                                </div>

                                {/* Үсгэн код оруулах */}
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <Label className="cursor-pointer">Үсгэн код оруулах</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Дугаарын эхэнд {formData.prefix || 'ГЭР'} гэх мэт үсэг оруулах
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.numberingConfig?.includePrefix ?? true}
                                        onCheckedChange={(c) => setFormData(prev => ({ 
                                            ...prev, 
                                            numberingConfig: { ...prev.numberingConfig, includePrefix: c } 
                                        }))}
                                    />
                                </div>

                                {/* Он оруулах */}
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <Label className="cursor-pointer">Он оруулах</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Жнь: 2026
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.numberingConfig?.includeYear ?? true}
                                        onCheckedChange={(c) => setFormData(prev => ({ 
                                            ...prev, 
                                            numberingConfig: { ...prev.numberingConfig, includeYear: c } 
                                        }))}
                                    />
                                </div>

                                {/* Сар оруулах */}
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <Label className="cursor-pointer">Сар оруулах</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Жнь: 01, 02, ... 12
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.numberingConfig?.includeMonth ?? false}
                                        onCheckedChange={(c) => setFormData(prev => ({ 
                                            ...prev, 
                                            numberingConfig: { ...prev.numberingConfig, includeMonth: c } 
                                        }))}
                                    />
                                </div>

                                {/* Өдөр оруулах */}
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <Label className="cursor-pointer">Өдөр оруулах</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Жнь: 01, 02, ... 31
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.numberingConfig?.includeDay ?? false}
                                        onCheckedChange={(c) => setFormData(prev => ({ 
                                            ...prev, 
                                            numberingConfig: { ...prev.numberingConfig, includeDay: c } 
                                        }))}
                                    />
                                </div>

                                {/* Тусгаарлагч тэмдэгт */}
                                <div className="space-y-2">
                                    <Label>Тусгаарлагч тэмдэгт</Label>
                                    <Select
                                        value={formData.numberingConfig?.separator || '-'}
                                        onValueChange={(v) => setFormData(prev => ({ 
                                            ...prev, 
                                            numberingConfig: { ...prev.numberingConfig, separator: v } 
                                        }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="-">Зураас (-)</SelectItem>
                                            <SelectItem value="/">Налуу зураас (/)</SelectItem>
                                            <SelectItem value=".">Цэг (.)</SelectItem>
                                            <SelectItem value="_">Доогуур зураас (_)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Дугаарын урт */}
                                <div className="space-y-2">
                                    <Label>Дугаарын урт (тэгээр дүүргэх)</Label>
                                    <Select
                                        value={String(formData.numberingConfig?.numberPadding || 4)}
                                        onValueChange={(v) => setFormData(prev => ({ 
                                            ...prev, 
                                            numberingConfig: { ...prev.numberingConfig, numberPadding: parseInt(v) } 
                                        }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="2">2 орон (01, 02, ...)</SelectItem>
                                            <SelectItem value="3">3 орон (001, 002, ...)</SelectItem>
                                            <SelectItem value="4">4 орон (0001, 0002, ...)</SelectItem>
                                            <SelectItem value="5">5 орон (00001, 00002, ...)</SelectItem>
                                            <SelectItem value="6">6 орон (000001, 000002, ...)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Эхлэх дугаар */}
                                <div className="space-y-2">
                                    <Label>Эхлэх дугаар</Label>
                                    <Input
                                        type="number"
                                        min={1}
                                        value={formData.numberingConfig?.startNumber || 1}
                                        onChange={(e) => setFormData(prev => ({ 
                                            ...prev, 
                                            numberingConfig: { ...prev.numberingConfig, startNumber: parseInt(e.target.value) || 1 } 
                                        }))}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Дугаарлалт эхлэх утга (ихэвчлэн 1)
                                    </p>
                                </div>

                                {/* Дугаар шинэчлэх үе */}
                                <div className="space-y-2">
                                    <Label>Дугаар шинээр эхлэх үе</Label>
                                    <Select
                                        value={formData.numberingConfig?.resetPeriod || 'yearly'}
                                        onValueChange={(v) => setFormData(prev => ({ 
                                            ...prev, 
                                            numberingConfig: { ...prev.numberingConfig, resetPeriod: v as any } 
                                        }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yearly">Жил бүр (Шинэ жил бүр 0001-ээс)</SelectItem>
                                            <SelectItem value="monthly">Сар бүр (Шинэ сар бүр 0001-ээс)</SelectItem>
                                            <SelectItem value="daily">Өдөр бүр (Өдөр бүр 0001-ээс)</SelectItem>
                                            <SelectItem value="never">Хэзээ ч үгүй (Үргэлжлүүлэн дугаарлана)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Тайлбар */}
                                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700">
                                    <div className="font-medium mb-1">💡 Дугаарлалтын шаардлага:</div>
                                    <ul className="list-disc list-inside space-y-0.5">
                                        <li><strong>Давхцахгүй</strong> - Системд ижил дугаар байхгүй</li>
                                        <li><strong>Уншигдахуйц</strong> - Хүн унших, ялгах боломжтой</li>
                                        <li><strong>Автомат</strong> - Систем автоматаар үүсгэнэ</li>
                                        <li><strong>Засах боломжгүй</strong> - Үүссэн дугаар өөрчлөгдөхгүй</li>
                                        <li><strong>Аудит хийх боломжтой</strong> - Хэзээ, хэн үүсгэснийг хянах</li>
                                    </ul>
                                </div>
                            </TabsContent>

                            <TabsContent value="header" className="space-y-4 mt-4">
                                {/* Толгойн гарчиг */}
                                <div className="space-y-2">
                                    <Label htmlFor="headerTitle">Толгойн гарчиг (байгууллагын нэр)</Label>
                                    <Input
                                        id="headerTitle"
                                        placeholder="жнь: МИНИЙ КОМПАНИ ХХК"
                                        value={formData.header?.title || ''}
                                        onChange={(e) => setFormData(prev => ({ 
                                            ...prev, 
                                            header: { ...prev.header, title: e.target.value } 
                                        }))}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Хоосон үлдээвэл байгууллагын профайлаас авна
                                    </p>
                                </div>

                                {/* Хотын нэр */}
                                <div className="space-y-2">
                                    <Label htmlFor="cityName" className="flex items-center gap-2">
                                        <MapPin className="h-3.5 w-3.5" />
                                        Хотын нэр
                                    </Label>
                                    <Input
                                        id="cityName"
                                        placeholder="жнь: Улаанбаатар"
                                        value={formData.header?.cityName || ''}
                                        onChange={(e) => setFormData(prev => ({ 
                                            ...prev, 
                                            header: { ...prev.header, cityName: e.target.value } 
                                        }))}
                                    />
                                </div>

                                {/* Лого харуулах */}
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <Label className="cursor-pointer flex items-center gap-2">
                                            <Image className="h-4 w-4" />
                                            Лого харуулах
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Байгууллагын логог толгой хэсэгт харуулах
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.header?.showLogo ?? true}
                                        onCheckedChange={(c) => setFormData(prev => ({ 
                                            ...prev, 
                                            header: { ...prev.header, showLogo: c } 
                                        }))}
                                    />
                                </div>

                                {/* Огноо харуулах */}
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <Label className="cursor-pointer flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Огноо харуулах
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Толгойн зүүн талд огноо байрлуулах
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.header?.showDate ?? true}
                                        onCheckedChange={(c) => setFormData(prev => ({ 
                                            ...prev, 
                                            header: { ...prev.header, showDate: c } 
                                        }))}
                                    />
                                </div>

                                {/* Дугаар харуулах */}
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div className="space-y-0.5">
                                        <Label className="cursor-pointer flex items-center gap-2">
                                            <FileDigit className="h-4 w-4" />
                                            Дугаар харуулах
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Толгойн баруун талд дугаар байрлуулах
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formData.header?.showNumber ?? true}
                                        onCheckedChange={(c) => setFormData(prev => ({ 
                                            ...prev, 
                                            header: { ...prev.header, showNumber: c } 
                                        }))}
                                    />
                                </div>

                                {/* Толгойн урьдчилсан харагдац */}
                                <div className="rounded-lg border bg-slate-50 p-4">
                                    <p className="text-xs text-muted-foreground mb-3">Толгойн урьдчилсан харагдац:</p>
                                    <div className="bg-white border rounded-lg p-4 text-xs">
                                        {/* Дээд хэсэг: Лого + Байгууллагын нэр (голд) */}
                                        <div className="text-center mb-4">
                                            {formData.header?.showLogo && (
                                                companyProfile?.logoUrl ? (
                                                    <img 
                                                        src={companyProfile.logoUrl} 
                                                        alt="Logo" 
                                                        className="w-12 h-12 object-contain mx-auto mb-2"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 bg-slate-200 rounded mx-auto mb-2 flex items-center justify-center text-[8px] text-slate-400">
                                                        ЛОГО
                                                    </div>
                                                )
                                            )}
                                            <div className="font-bold uppercase">
                                                {formData.header?.title || companyProfile?.name || 'БАЙГУУЛЛАГЫН НЭР'}
                                            </div>
                                        </div>
                                        
                                        {/* Доод хэсэг: Огноо | Дугаар | Хот */}
                                        <div className="flex justify-between items-center text-[11px] pt-2 border-t border-dashed">
                                            <div className="text-left">
                                                {formData.header?.showDate && (
                                                    <div className="italic text-muted-foreground">
                                                        2026 оны __ сарын __ өдөр
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-center">
                                                {formData.header?.showNumber && (
                                                    <div className="font-mono">
                                                        № {exampleDocNumber || 'ГЭР-2026-0001'}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <div>{formData.header?.cityName || 'Улаанбаатар'} хот</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>

                        <DialogFooter className="mt-6">
                            <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditingItem(null); }}>
                                Цуцлах
                            </Button>
                            <Button type="submit" disabled={isSubmitting || !formData.name || !formData.prefix}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Хадгалах
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
