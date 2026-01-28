'use client';

import React, { useState, useMemo } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
    Edit3,
    Save,
    AlertCircle,
    CheckCircle2,
    Building2
} from 'lucide-react';
import { Position, Department, PositionLevel, JobCategory, EmploymentType, WorkSchedule, WorkingCondition } from '../../../types';
import { doc, updateDoc } from 'firebase/firestore';
import { useFirebase, useMemoFirebase, useDoc } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ValidationIndicator } from './validation-indicator';
import { generateCode } from '@/lib/code-generator';
import { Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

const WORKING_CONDITION_LABELS: Record<WorkingCondition, string> = {
    NORMAL: 'Хэвийн',
    NON_STANDARD: 'Хэвийн бус',
    HEAVY: 'Хүнд',
    HAZARDOUS: 'Хортой / Аюултай',
    EXTREMELY_HAZARDOUS: 'Онцгой хортой / Онцгой аюултай',
};

interface Subsidiary {
    name: string;
    registrationNumber?: string;
}

interface CompanyProfile {
    name?: string;
    subsidiaries?: Subsidiary[];
}

interface PositionOverviewProps {
    position: Position;
    departments: Department[];
    allPositions: Position[];
    levels: PositionLevel[];
    categories: JobCategory[];
    employmentTypes: EmploymentType[];
    schedules: WorkSchedule[];
    validationChecklist?: {
        hasBasicInfo: boolean;
        hasReporting: boolean;
        hasAttributes: boolean;
        hasSettings: boolean;
    };
}

// Simple display row component
function InfoRow({ label, value, isEmpty = false }: { label: string; value: React.ReactNode; isEmpty?: boolean }) {
    return (
        <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className={cn(
                "text-sm font-medium text-right",
                isEmpty ? "text-muted-foreground/50 italic" : "text-foreground"
            )}>
                {value}
            </span>
        </div>
    );
}

export function PositionOverview({
    position,
    departments,
    allPositions,
    levels,
    categories,
    employmentTypes,
    schedules,
    validationChecklist
}: PositionOverviewProps) {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isUpdatingSchedule, setIsUpdatingSchedule] = useState(false);

    const posCodeConfigRef = useMemoFirebase(
        ({ firestore }) => (firestore ? doc(firestore, 'company', 'positionCodeConfig') : null),
        []
    );
    const { data: posCodeConfig } = useDoc<any>(posCodeConfigRef as any);

    const companyProfileRef = useMemoFirebase(
        ({ firestore }) => (firestore ? doc(firestore, 'company', 'profile') : null),
        []
    );
    const { data: companyProfile } = useDoc<CompanyProfile>(companyProfileRef as any);

    // Parse subsidiaries (handle both old string format and new object format)
    const subsidiaries: Subsidiary[] = useMemo(() => {
        if (!companyProfile?.subsidiaries) return [];
        return companyProfile.subsidiaries.map(item => {
            if (typeof item === 'string') {
                return { name: item, registrationNumber: '' };
            }
            return item as Subsidiary;
        });
    }, [companyProfile?.subsidiaries]);

    const [formData, setFormData] = useState({
        title: position.title || '',
        code: position.code || '',
        departmentId: position.departmentId || '',
        reportsToId: position.reportsToId || '',
        levelId: position.levelId || '',
        jobCategoryId: position.jobCategoryId || '',
        employmentTypeId: position.employmentTypeId || '',
        workScheduleId: position.workScheduleId || '',
        workingCondition: (position.workingCondition as WorkingCondition | undefined) ?? '__none__',
        companyType: position.companyType || 'main',
        subsidiaryName: position.subsidiaryName || '',
        permissions: {
            canApproveVacation: position.permissions?.canApproveVacation || false,
            canApproveLeave: position.permissions?.canApproveLeave || false,
        },
        budget: {
            yearlyBudget: position.budget?.yearlyBudget || 0,
            currency: position.budget?.currency || 'MNT',
        }
    });

    const handleFieldUpdate = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            const updateData: any = {
                title: formData.title,
                code: formData.code.trim().toUpperCase(),
                departmentId: formData.departmentId,
                reportsToId: formData.reportsToId,
                levelId: formData.levelId,
                jobCategoryId: formData.jobCategoryId,
                employmentTypeId: formData.employmentTypeId,
                workScheduleId: formData.workScheduleId,
                workingCondition: formData.workingCondition === '__none__' ? null : formData.workingCondition,
                companyType: formData.companyType,
                subsidiaryName: formData.companyType === 'subsidiary' ? formData.subsidiaryName : '',
                permissions: formData.permissions,
                budget: formData.budget,
                updatedAt: new Date().toISOString(),
            };

            await updateDoc(doc(firestore, 'positions', position.id), updateData);

            toast({ title: 'Мэдээлэл амжилттай хадгалагдлаа' });
            setIsEditing(false);
        } catch (error) {
            console.error('Error updating position:', error);
            toast({
                variant: 'destructive',
                title: 'Алдаа гарлаа',
                description: 'Мэдээллийг хадгалахад алдаа гарлаа.'
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            title: position.title || '',
            code: position.code || '',
            departmentId: position.departmentId || '',
            reportsToId: position.reportsToId || '',
            levelId: position.levelId || '',
            jobCategoryId: position.jobCategoryId || '',
            employmentTypeId: position.employmentTypeId || '',
            workScheduleId: position.workScheduleId || '',
            workingCondition: (position.workingCondition as WorkingCondition | undefined) ?? '__none__',
            companyType: position.companyType || 'main',
            subsidiaryName: position.subsidiaryName || '',
            permissions: {
                canApproveVacation: position.permissions?.canApproveVacation || false,
                canApproveLeave: position.permissions?.canApproveLeave || false,
            },
            budget: {
                yearlyBudget: position.budget?.yearlyBudget || 0,
                currency: position.budget?.currency || 'MNT',
            }
        });
        setIsEditing(false);
    };

    // Lookup values
    const department = useMemo(() => departments.find(d => d.id === position.departmentId), [departments, position.departmentId]);
    const supervisor = useMemo(() => allPositions.find(p => p.id === position.reportsToId), [allPositions, position.reportsToId]);
    const level = useMemo(() => levels.find(l => l.id === position.levelId), [levels, position.levelId]);
    const category = useMemo(() => categories.find(c => c.id === position.jobCategoryId), [categories, position.jobCategoryId]);
    const employmentType = useMemo(() => employmentTypes.find(t => t.id === position.employmentTypeId), [employmentTypes, position.employmentTypeId]);
    const schedule = useMemo(() => schedules.find(s => s.id === position.workScheduleId), [schedules, position.workScheduleId]);

    const handleStartEditing = () => {
        if (!formData.code && posCodeConfig) {
            const generated = generateCode({
                prefix: posCodeConfig.prefix || '',
                digitCount: posCodeConfig.digitCount || 4,
                nextNumber: posCodeConfig.nextNumber || 1
            });
            handleFieldUpdate('code', generated);
        }
        setIsEditing(true);
    };

    // VIEW MODE
    if (!isEditing) {
        return (
            <div className="space-y-8">
                {/* Edit button */}
                <div className="flex justify-end">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleStartEditing}
                        className="h-8 gap-2"
                    >
                        <Edit3 className="w-3.5 h-3.5" />
                        Засах
                    </Button>
                </div>

                {/* Validation checklist */}
                {validationChecklist && (
                    <ValidationIndicator
                        title="Мэдээллийн бүрдэл"
                        items={[
                            { label: 'Үндсэн мэдээлэл', isDone: validationChecklist.hasBasicInfo },
                            { label: 'Удирдлагын бүтэц', isDone: validationChecklist.hasReporting },
                            { label: 'Ажлын нөхцөл', isDone: validationChecklist.hasAttributes },
                            { label: 'Тохиргоо & Төсөв', isDone: validationChecklist.hasSettings },
                        ]}
                    />
                )}

                {/* Approved warning */}
                {position.isApproved && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-700 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        Батлагдсан ажлын байр тул зарим мэдээллийг өөрчлөх боломжгүй.
                    </div>
                )}

                {/* Clean grid layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* Section 1: Basic Info */}
                    <div className="bg-muted/30 rounded-lg px-4">
                        <InfoRow label="Ажлын байрны нэр" value={position.title} />
                        <InfoRow 
                            label="Код" 
                            value={position.code ? (
                                <code className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs font-mono">
                                    {position.code}
                                </code>
                            ) : 'Кодгүй'} 
                            isEmpty={!position.code}
                        />
                        <InfoRow 
                            label="Компани" 
                            value={
                                position.companyType === 'subsidiary' && position.subsidiaryName ? (
                                    <div className="flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>{position.subsidiaryName}</span>
                                    </div>
                                ) : (
                                    <span>{companyProfile?.name || 'Үндсэн компани'}</span>
                                )
                            } 
                        />
                        <InfoRow 
                            label="Нэгж / Хэлтэс" 
                            value={department?.name || 'Оноогоогүй'} 
                            isEmpty={!department}
                        />
                        <InfoRow 
                            label="Шууд удирдлага" 
                            value={supervisor?.title || 'Дээд шат'} 
                            isEmpty={!supervisor}
                        />
                    </div>

                    {/* Section 2: Classification */}
                    <div className="bg-muted/30 rounded-lg px-4">
                        <InfoRow 
                            label="Түвшин / Зэрэглэл" 
                            value={level?.name ? (
                                <Badge variant="secondary" className="font-medium">
                                    {level.name}
                                </Badge>
                            ) : 'Тохируулаагүй'} 
                            isEmpty={!level}
                        />
                        <InfoRow 
                            label="Мэргэжлийн ангилал" 
                            value={category?.name || 'Оноогоогүй'} 
                            isEmpty={!category}
                        />
                        <InfoRow 
                            label="Ажлын байрны төрөл" 
                            value={employmentType?.name || 'Бүртгэгдээгүй'} 
                            isEmpty={!employmentType}
                        />
                        <InfoRow 
                            label="Цагийн хуваарь" 
                            value={
                                <div className="flex items-center justify-end gap-2">
                                    <Select
                                        value={(position.workScheduleId as string | undefined) || '__none__'}
                                        onValueChange={async (val) => {
                                            if (!firestore) return;
                                            setIsUpdatingSchedule(true);
                                            try {
                                                await updateDoc(doc(firestore, 'positions', position.id), {
                                                    workScheduleId: val === '__none__' ? null : val,
                                                    updatedAt: new Date().toISOString(),
                                                });
                                                toast({ title: 'Цагийн хуваарь шинэчлэгдлээ' });
                                            } catch (e) {
                                                console.error(e);
                                                toast({ variant: 'destructive', title: 'Алдаа', description: 'Цагийн хуваарь шинэчлэхэд алдаа гарлаа.' });
                                            } finally {
                                                setIsUpdatingSchedule(false);
                                            }
                                        }}
                                        disabled={isUpdatingSchedule}
                                    >
                                        <SelectTrigger className="h-8 w-44">
                                            <SelectValue placeholder="Сонгох" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">Сонгоогүй</SelectItem>
                                            {schedules
                                                .filter((s: any) => s?.isActive !== false)
                                                .map((s) => (
                                                    <SelectItem key={s.id} value={s.id}>
                                                        {s.name}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
                                        <Link href="/dashboard/settings/time-off">
                                            Тохиргоо
                                        </Link>
                                    </Button>
                                </div>
                            }
                            isEmpty={!position.workScheduleId}
                        />
                        <InfoRow
                            label="Хөдөлмөрийн нөхцөл"
                            value={
                                position.workingCondition
                                    ? (WORKING_CONDITION_LABELS[position.workingCondition as WorkingCondition] || position.workingCondition)
                                    : 'Тохируулаагүй'
                            }
                            isEmpty={!position.workingCondition}
                        />
                    </div>

                    {/* Section 3: Permissions & Budget */}
                    <div className="bg-muted/30 rounded-lg px-4">
                        <InfoRow 
                            label="Амралт батлах эрх" 
                            value={formData.permissions.canApproveVacation ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <span className="text-muted-foreground/50">Үгүй</span>
                            )} 
                        />
                        <InfoRow 
                            label="Чөлөө батлах эрх" 
                            value={formData.permissions.canApproveLeave ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                                <span className="text-muted-foreground/50">Үгүй</span>
                            )} 
                        />
                        <InfoRow 
                            label="Жилийн төсөв" 
                            value={formData.budget.yearlyBudget > 0 ? (
                                <span className="font-semibold">
                                    {formData.budget.yearlyBudget.toLocaleString()} {formData.budget.currency === 'MNT' ? '₮' : '$'}
                                </span>
                            ) : 'Тодорхойгүй'} 
                            isEmpty={formData.budget.yearlyBudget === 0}
                        />
                    </div>
                </div>
            </div>
        );
    }

    // EDIT MODE
    return (
        <div className="space-y-8">
            {/* Save/Cancel buttons */}
            <div className="flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={handleCancel} className="h-8">
                    Болих
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 gap-2">
                    <Save className="w-3.5 h-3.5" />
                    Хадгалах
                </Button>
            </div>

            {/* Approved warning */}
            {position.isApproved && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2 text-amber-700 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    Батлагдсан ажлын байр тул зарим мэдээллийг өөрчлөх боломжгүй.
                </div>
            )}

            {/* Edit form - 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Basic Info */}
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Ажлын байрны нэр</label>
                        <Input
                            value={formData.title}
                            onChange={(e) => handleFieldUpdate('title', e.target.value)}
                            placeholder="Жишээ: Ахлах менежер"
                            disabled={position.isApproved}
                        />
                    </div>
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Код</label>
                        <div className="flex gap-2">
                            <Input
                                value={formData.code || ''}
                                readOnly
                                placeholder="Код үүсгэх"
                                className="font-mono uppercase bg-muted/50"
                                disabled={position.isApproved}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                disabled={position.isApproved || !posCodeConfigRef}
                                onClick={async () => {
                                    if (!firestore || !posCodeConfigRef) return;
                                    try {
                                        const { runTransaction } = await import('firebase/firestore');
                                        await runTransaction(firestore, async (transaction) => {
                                            const configDoc = await transaction.get(posCodeConfigRef);
                                            if (configDoc.exists()) {
                                                const configData = configDoc.data();
                                                const currentNum = configData.nextNumber || 1;
                                                const generated = generateCode({
                                                    prefix: configData.prefix || '',
                                                    digitCount: configData.digitCount || 4,
                                                    nextNumber: currentNum
                                                });
                                                handleFieldUpdate('code', generated);
                                                transaction.update(posCodeConfigRef, {
                                                    nextNumber: currentNum + 1
                                                });
                                            }
                                        });
                                    } catch (e) {
                                        toast({ title: "Код үүсгэхэд алдаа гарлаа", variant: "destructive" });
                                    }
                                }}
                                title="Код үүсгэх"
                            >
                                <Wand2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Компани</label>
                        <Select
                            value={formData.companyType === 'subsidiary' && formData.subsidiaryName ? formData.subsidiaryName : 'main'}
                            onValueChange={(val) => {
                                if (val === 'main') {
                                    handleFieldUpdate('companyType', 'main');
                                    handleFieldUpdate('subsidiaryName', '');
                                } else {
                                    handleFieldUpdate('companyType', 'subsidiary');
                                    handleFieldUpdate('subsidiaryName', val);
                                }
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Сонгох" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="main">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-primary" />
                                        {companyProfile?.name || 'Үндсэн компани'}
                                    </div>
                                </SelectItem>
                                {subsidiaries.length > 0 && (
                                    <>
                                        <div className="px-2 py-1.5 text-xs text-muted-foreground font-medium">
                                            Охин компаниуд
                                        </div>
                                        {subsidiaries.map((sub, idx) => (
                                            <SelectItem key={idx} value={sub.name}>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-indigo-500" />
                                                    {sub.name}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Нэгж / Хэлтэс</label>
                        <Select
                            value={formData.departmentId}
                            onValueChange={(val) => handleFieldUpdate('departmentId', val)}
                            disabled={position.isApproved}
                        >
                            <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                            <SelectContent>
                                {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Шууд удирдлага</label>
                        <Select
                            value={formData.reportsToId || 'none'}
                            onValueChange={(val) => handleFieldUpdate('reportsToId', val === 'none' ? '' : val)}
                            disabled={position.isApproved}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Удирдлагагүй (Дээд шат)</SelectItem>
                                {allPositions.filter(p => p.id !== position.id).map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Classification & Employment */}
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Түвшин / Зэрэглэл</label>
                        <Select
                            value={formData.levelId}
                            onValueChange={(val) => handleFieldUpdate('levelId', val)}
                            disabled={position.isApproved}
                        >
                            <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                            <SelectContent>
                                {levels.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Мэргэжлийн ангилал (ЯАМАТ)</label>
                        <Select
                            value={formData.jobCategoryId}
                            onValueChange={(val) => handleFieldUpdate('jobCategoryId', val)}
                        >
                            <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Ажлын байрны төрөл</label>
                        <Select
                            value={formData.employmentTypeId}
                            onValueChange={(val) => handleFieldUpdate('employmentTypeId', val)}
                            disabled={position.isApproved}
                        >
                            <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                            <SelectContent>
                                {employmentTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Цагийн хуваарь</label>
                        <Select
                            value={formData.workScheduleId}
                            onValueChange={(val) => handleFieldUpdate('workScheduleId', val)}
                        >
                            <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                            <SelectContent>
                                {schedules.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Хөдөлмөрийн нөхцөл</label>
                        <Select
                            value={formData.workingCondition || '__none__'}
                            onValueChange={(val) => handleFieldUpdate('workingCondition', val)}
                            disabled={position.isApproved}
                        >
                            <SelectTrigger><SelectValue placeholder="Сонгох" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__none__">Сонгоогүй</SelectItem>
                                {Object.entries(WORKING_CONDITION_LABELS).map(([k, label]) => (
                                    <SelectItem key={k} value={k}>{label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Permissions & Budget */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <label className="text-sm">Амралт батлах эрх</label>
                        <Switch
                            checked={formData.permissions.canApproveVacation}
                            onCheckedChange={(checked) => handleFieldUpdate('permissions', { ...formData.permissions, canApproveVacation: checked })}
                        />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <label className="text-sm">Чөлөө батлах эрх</label>
                        <Switch
                            checked={formData.permissions.canApproveLeave}
                            onCheckedChange={(checked) => handleFieldUpdate('permissions', { ...formData.permissions, canApproveLeave: checked })}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Жилийн төсөв</label>
                        <div className="flex gap-2">
                            <Input
                                type="number"
                                value={formData.budget.yearlyBudget}
                                onChange={(e) => handleFieldUpdate('budget', { ...formData.budget, yearlyBudget: Number(e.target.value) })}
                                className="flex-1"
                            />
                            <Select 
                                value={formData.budget.currency} 
                                onValueChange={(val) => handleFieldUpdate('budget', { ...formData.budget, currency: val })}
                            >
                                <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MNT">₮</SelectItem>
                                    <SelectItem value="USD">$</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
