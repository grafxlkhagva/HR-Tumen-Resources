'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
    Upload,
    FileText,
    Sparkles,
    CheckCircle2,
    AlertCircle,
    Loader2,
    X,
    Wand2,
    Brain,
    FileImage,
    User,
    Phone,
    GraduationCap,
    Languages,
    Briefcase,
    Award,
    Car,
    Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ParsedCVData {
    lastName?: string;
    firstName?: string;
    registrationNumber?: string;
    birthDate?: string;
    gender?: string;
    idCardNumber?: string;
    personalPhone?: string;
    personalEmail?: string;
    homeAddress?: string;
    education?: any[];
    languages?: any[];
    trainings?: any[];
    experiences?: any[];
    hasDriversLicense?: boolean;
    driverLicenseCategories?: string[];
}

interface CVUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDataExtracted: (data: ParsedCVData) => void;
}

type ProcessingStep = 'idle' | 'uploading' | 'analyzing' | 'extracting' | 'preview' | 'complete' | 'error';

const STEP_MESSAGES: Record<ProcessingStep, string> = {
    idle: 'CV файлаа сонгоно уу',
    uploading: 'Файл уншиж байна...',
    analyzing: 'AI CV-г шинжилж байна...',
    extracting: 'Мэдээлэл задалж байна...',
    preview: 'Мэдээлэл шалгах',
    complete: 'Амжилттай!',
    error: 'Алдаа гарлаа',
};

// Field categories for preview
const FIELD_CATEGORIES = [
    {
        id: 'personal',
        label: 'Хувийн мэдээлэл',
        icon: User,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        fields: ['lastName', 'firstName', 'registrationNumber', 'birthDate', 'gender', 'idCardNumber'],
        fieldLabels: {
            lastName: 'Овог',
            firstName: 'Нэр',
            registrationNumber: 'Регистрийн дугаар',
            birthDate: 'Төрсөн огноо',
            gender: 'Хүйс',
            idCardNumber: 'ТТД',
        },
    },
    {
        id: 'contact',
        label: 'Холбоо барих',
        icon: Phone,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        fields: ['personalPhone', 'personalEmail', 'homeAddress'],
        fieldLabels: {
            personalPhone: 'Утас',
            personalEmail: 'И-мэйл',
            homeAddress: 'Хаяг',
        },
    },
    {
        id: 'education',
        label: 'Боловсрол',
        icon: GraduationCap,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        fields: ['education'],
        isArray: true,
    },
    {
        id: 'languages',
        label: 'Гадаад хэл',
        icon: Languages,
        color: 'text-amber-600',
        bgColor: 'bg-amber-50',
        fields: ['languages'],
        isArray: true,
    },
    {
        id: 'experience',
        label: 'Ажлын туршлага',
        icon: Briefcase,
        color: 'text-indigo-600',
        bgColor: 'bg-indigo-50',
        fields: ['experiences'],
        isArray: true,
    },
    {
        id: 'training',
        label: 'Сургалт',
        icon: Award,
        color: 'text-rose-600',
        bgColor: 'bg-rose-50',
        fields: ['trainings'],
        isArray: true,
    },
    {
        id: 'driving',
        label: 'Жолооны үнэмлэх',
        icon: Car,
        color: 'text-slate-600',
        bgColor: 'bg-slate-50',
        fields: ['hasDriversLicense', 'driverLicenseCategories'],
        fieldLabels: {
            hasDriversLicense: 'Жолооны үнэмлэх',
            driverLicenseCategories: 'Ангилал',
        },
    },
];

export function CVUploadDialog({ open, onOpenChange, onDataExtracted }: CVUploadDialogProps) {
    const { toast } = useToast();
    const [file, setFile] = React.useState<File | null>(null);
    const [step, setStep] = React.useState<ProcessingStep>('idle');
    const [progress, setProgress] = React.useState(0);
    const [extractedData, setExtractedData] = React.useState<ParsedCVData | null>(null);
    const [selectedFields, setSelectedFields] = React.useState<Set<string>>(new Set());
    const [error, setError] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const resetState = () => {
        setFile(null);
        setStep('idle');
        setProgress(0);
        setExtractedData(null);
        setSelectedFields(new Set());
        setError(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(selectedFile.type)) {
                toast({
                    variant: 'destructive',
                    title: 'Буруу файл төрөл',
                    description: 'PDF, JPG, PNG, WEBP файл оруулна уу',
                });
                return;
            }
            if (selectedFile.size > 15 * 1024 * 1024) {
                toast({
                    variant: 'destructive',
                    title: 'Файл хэт том',
                    description: 'Файлын хэмжээ 15MB-аас бага байх ёстой',
                });
                return;
            }
            setFile(selectedFile);
            setError(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
            if (!validTypes.includes(droppedFile.type)) {
                toast({
                    variant: 'destructive',
                    title: 'Буруу файл төрөл',
                    description: 'PDF, JPG, PNG, WEBP файл оруулна уу',
                });
                return;
            }
            setFile(droppedFile);
            setError(null);
        }
    };

    const processCV = async () => {
        if (!file) return;

        try {
            setStep('uploading');
            setProgress(10);

            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            setProgress(30);
            setStep('analyzing');

            const response = await fetch('/api/parse-cv', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    imageDataUrl: dataUrl,
                    mimeType: file.type,
                }),
            });

            setProgress(70);
            setStep('extracting');

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'CV задлахад алдаа гарлаа');
            }

            const result = await response.json();
            setProgress(90);

            if (!result.success || !result.data) {
                throw new Error('CV-ээс мэдээлэл олдсонгүй');
            }

            const data = result.data as ParsedCVData;
            setExtractedData(data);

            // Auto-select all found fields
            const foundFields = new Set<string>();
            Object.entries(data).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    if (Array.isArray(value) && value.length > 0) {
                        foundFields.add(key);
                    } else if (!Array.isArray(value)) {
                        foundFields.add(key);
                    }
                }
            });
            setSelectedFields(foundFields);

            setProgress(100);
            setStep('preview');

        } catch (err) {
            console.error('CV processing error:', err);
            setStep('error');
            setError(err instanceof Error ? err.message : 'CV задлахад алдаа гарлаа');
        }
    };

    const handleApply = () => {
        if (!extractedData) return;

        // Filter data to only include selected fields
        const filteredData: ParsedCVData = {};
        selectedFields.forEach(field => {
            if (extractedData[field as keyof ParsedCVData] !== undefined) {
                (filteredData as any)[field] = extractedData[field as keyof ParsedCVData];
            }
        });

        onDataExtracted(filteredData);
        setStep('complete');

        toast({
            title: 'CV амжилттай задлагдлаа!',
            description: `${selectedFields.size} талбарын мэдээлэл оруулагдлаа`,
        });

        setTimeout(() => {
            handleClose();
        }, 1000);
    };

    const handleClose = () => {
        resetState();
        onOpenChange(false);
    };

    const toggleField = (field: string) => {
        const newSelected = new Set(selectedFields);
        if (newSelected.has(field)) {
            newSelected.delete(field);
        } else {
            newSelected.add(field);
        }
        setSelectedFields(newSelected);
    };

    const selectAll = () => {
        if (!extractedData) return;
        const allFields = new Set<string>();
        Object.entries(extractedData).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value) && value.length > 0) {
                    allFields.add(key);
                } else if (!Array.isArray(value)) {
                    allFields.add(key);
                }
            }
        });
        setSelectedFields(allFields);
    };

    const deselectAll = () => {
        setSelectedFields(new Set());
    };

    const isProcessing = ['uploading', 'analyzing', 'extracting'].includes(step);

    const formatValue = (key: string, value: any): string => {
        if (value === true) return 'Тийм';
        if (value === false) return 'Үгүй';
        if (key === 'gender') return value === 'male' ? 'Эрэгтэй' : 'Эмэгтэй';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    };

    const getArrayItemSummary = (key: string, items: any[]): string => {
        if (key === 'education') {
            return items.map(e => `${e.school || ''} - ${e.degree || ''}`).join('; ');
        }
        if (key === 'languages') {
            return items.map(l => l.language || '').join(', ');
        }
        if (key === 'experiences') {
            return items.map(e => `${e.company || ''} (${e.position || ''})`).join('; ');
        }
        if (key === 'trainings') {
            return items.map(t => t.name || '').join(', ');
        }
        return `${items.length} бүртгэл`;
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md md:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
                            <Sparkles className="h-4 w-4 text-white" />
                        </div>
                        AI CV Уншигч
                    </DialogTitle>
                    <DialogDescription>
                        {step === 'preview' 
                            ? 'Олдсон мэдээллийг шалгаад, оруулах талбаруудаа сонгоно уу'
                            : 'CV файлаа upload хийхэд AI автоматаар задлан бөглөнө'
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* File Upload Area */}
                    {step === 'idle' && (
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer",
                                file
                                    ? "border-primary bg-primary/5"
                                    : "border-slate-200 hover:border-primary/50 hover:bg-slate-50"
                            )}
                            onClick={() => fileInputRef.current?.click()}
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,.webp"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            {file ? (
                                <div className="space-y-2">
                                    <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <FileText className="h-6 w-6 text-primary" />
                                    </div>
                                    <p className="text-sm font-medium text-slate-800">{file.name}</p>
                                    <p className="text-xs text-slate-500">
                                        {(file.size / 1024 / 1024).toFixed(2)} MB
                                    </p>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                    >
                                        <X className="h-4 w-4 mr-1" />
                                        Арилгах
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="mx-auto w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Upload className="h-7 w-7 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-slate-700">
                                            CV файлаа энд чирж оруулна уу
                                        </p>
                                        <p className="text-xs text-slate-500 mt-1">
                                            эсвэл дарж сонгоно уу
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-center gap-2">
                                        <Badge variant="secondary" className="text-[10px]">
                                            <FileText className="h-3 w-3 mr-1" />
                                            PDF
                                        </Badge>
                                        <Badge variant="secondary" className="text-[10px]">
                                            <FileImage className="h-3 w-3 mr-1" />
                                            JPG/PNG
                                        </Badge>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Processing State */}
                    {isProcessing && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-center">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center animate-pulse">
                                        <Brain className="h-10 w-10 text-white" />
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
                                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                                    </div>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-medium text-slate-800">
                                    {STEP_MESSAGES[step]}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Түр хүлээнэ үү...
                                </p>
                            </div>
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}

                    {/* Preview State */}
                    {step === 'preview' && extractedData && (
                        <div className="space-y-3">
                            {/* Quick actions */}
                            <div className="flex items-center justify-between gap-2">
                                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 shrink-0">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {selectedFields.size} сонгогдсон
                                </Badge>
                                <div className="flex gap-1">
                                    <Button variant="ghost" size="sm" onClick={selectAll} className="text-xs h-7 px-2">
                                        Бүгд
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={deselectAll} className="text-xs h-7 px-2">
                                        Болих
                                    </Button>
                                </div>
                            </div>

                            {/* Field categories */}
                            <ScrollArea className="h-[300px]">
                                <div className="space-y-2 pr-3">
                                    {FIELD_CATEGORIES.map(category => {
                                        const Icon = category.icon;
                                        const hasData = category.fields.some(field => {
                                            const value = extractedData[field as keyof ParsedCVData];
                                            if (Array.isArray(value)) return value.length > 0;
                                            return value !== undefined && value !== null && value !== '';
                                        });

                                        if (!hasData) return null;

                                        return (
                                            <div
                                                key={category.id}
                                                className="rounded-lg border bg-white overflow-hidden"
                                            >
                                                <div className={cn("flex items-center gap-2 px-3 py-1.5", category.bgColor)}>
                                                    <Icon className={cn("h-3.5 w-3.5", category.color)} />
                                                    <span className={cn("text-xs font-medium", category.color)}>
                                                        {category.label}
                                                    </span>
                                                </div>
                                                <div className="divide-y">
                                                    {category.fields.map(field => {
                                                        const value = extractedData[field as keyof ParsedCVData];
                                                        if (value === undefined || value === null || value === '') return null;
                                                        if (Array.isArray(value) && value.length === 0) return null;

                                                        const isArray = Array.isArray(value);
                                                        const isSelected = selectedFields.has(field);
                                                        const fieldLabel = category.fieldLabels?.[field as keyof typeof category.fieldLabels] || field;

                                                        return (
                                                            <div
                                                                key={field}
                                                                className={cn(
                                                                    "flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 transition-colors",
                                                                    isSelected && "bg-emerald-50/50"
                                                                )}
                                                                onClick={() => toggleField(field)}
                                                            >
                                                                <Checkbox
                                                                    checked={isSelected}
                                                                    className="mt-0.5 h-4 w-4"
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[11px] text-slate-500">{fieldLabel}</p>
                                                                    <p className="text-xs font-medium text-slate-800 line-clamp-2">
                                                                        {isArray
                                                                            ? getArrayItemSummary(field, value as any[])
                                                                            : formatValue(field, value)
                                                                        }
                                                                    </p>
                                                                    {isArray && (
                                                                        <Badge variant="secondary" className="mt-1 text-[10px] h-5">
                                                                            {(value as any[]).length} бүртгэл
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    )}

                    {/* Complete State */}
                    {step === 'complete' && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-emerald-700">
                                    Амжилттай оруулагдлаа!
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error State */}
                    {step === 'error' && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center justify-center">
                                <div className="w-20 h-20 rounded-full bg-rose-100 flex items-center justify-center">
                                    <AlertCircle className="h-10 w-10 text-rose-600" />
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-rose-700">
                                    Алдаа гарлаа
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    {error || 'CV задлахад алдаа гарлаа'}
                                </p>
                            </div>
                            <Button variant="outline" onClick={resetState} className="w-full">
                                Дахин оролдох
                            </Button>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {step === 'idle' && (
                    <div className="flex gap-2 pt-2 border-t">
                        <Button variant="outline" onClick={handleClose} size="sm" className="h-9">
                            Болих
                        </Button>
                        <Button
                            onClick={processCV}
                            disabled={!file}
                            size="sm"
                            className="flex-1 h-9 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
                        >
                            <Wand2 className="h-4 w-4 mr-1.5" />
                            AI-аар задлах
                        </Button>
                    </div>
                )}

                {step === 'preview' && (
                    <div className="flex gap-2 pt-2 border-t">
                        <Button variant="outline" onClick={resetState} size="sm" className="h-9">
                            Дахин
                        </Button>
                        <Button
                            onClick={handleApply}
                            disabled={selectedFields.size === 0}
                            size="sm"
                            className="flex-1 h-9 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700"
                        >
                            <Check className="h-4 w-4 mr-1.5" />
                            Оруулах ({selectedFields.size})
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
