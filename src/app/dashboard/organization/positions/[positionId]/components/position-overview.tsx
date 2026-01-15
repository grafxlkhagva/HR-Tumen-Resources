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
import {
    Edit3,
    Save,
    X,
    Briefcase,
    Hash,
    MapPin,
    User,
    Layers,
    Clock,
    Shield,
    DollarSign,
    Target,
    Zap,
    Users,
    ChevronRight,
    Search,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';
import { Position, Department, PositionLevel, JobCategory, EmploymentType, WorkSchedule } from '../../../types';
import { doc } from 'firebase/firestore';
import { useFirebase, updateDocumentNonBlocking } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { ValidationIndicator } from './validation-indicator';

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

    const [formData, setFormData] = useState({
        title: position.title || '',
        code: position.code || '',
        departmentId: position.departmentId || '',
        reportsToId: position.reportsToId || '',
        levelId: position.levelId || '',
        jobCategoryId: position.jobCategoryId || '',
        employmentTypeId: position.employmentTypeId || '',
        workScheduleId: position.workScheduleId || '',
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
            const updateData = {
                title: formData.title,
                code: formData.code,
                departmentId: formData.departmentId,
                reportsToId: formData.reportsToId,
                levelId: formData.levelId,
                jobCategoryId: formData.jobCategoryId,
                employmentTypeId: formData.employmentTypeId,
                workScheduleId: formData.workScheduleId,
                permissions: formData.permissions,
                budget: formData.budget,
                updatedAt: new Date().toISOString(),
            };
            await updateDocumentNonBlocking(doc(firestore, 'positions', position.id), updateData);
            toast({ title: "Мэдээлэл амжилттай хадгалагдлаа" });
            setIsEditing(false);
        } catch (e) {
            toast({ title: "Алдаа гарлаа", variant: "destructive" });
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

    const department = useMemo(() => departments.find(d => d.id === position.departmentId), [departments, position.departmentId]);
    const supervisor = useMemo(() => allPositions.find(p => p.id === position.reportsToId), [allPositions, position.reportsToId]);
    const level = useMemo(() => levels.find(l => l.id === position.levelId), [levels, position.levelId]);
    const category = useMemo(() => categories.find(c => c.id === position.jobCategoryId), [categories, position.jobCategoryId]);
    const employmentType = useMemo(() => employmentTypes.find(t => t.id === position.employmentTypeId), [employmentTypes, position.employmentTypeId]);
    const schedule = useMemo(() => schedules.find(s => s.id === position.workScheduleId), [schedules, position.workScheduleId]);

    return (
        <section className="space-y-12">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                        <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Ерөнхий мэдээлэл</label>
                        <h2 className="text-lg font-bold text-foreground">Албан тушаалын тодорхойлолт</h2>
                    </div>
                </div>
                {!isEditing ? (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-9 gap-2 text-primary hover:text-primary/90 hover:bg-primary/10 font-bold text-[10px] uppercase tracking-widest rounded-xl">
                        <Edit3 className="w-3.5 h-3.5" />
                        Засах
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={handleCancel} className="h-9 px-4 text-muted-foreground hover:text-foreground font-bold text-[10px] uppercase tracking-widest rounded-xl">
                            Болих
                        </Button>
                        <Button variant="default" size="sm" onClick={handleSave} disabled={isSaving} className="h-9 gap-2 bg-primary hover:bg-primary/90 shadow-sm font-bold text-[10px] uppercase tracking-widest rounded-xl">
                            <Save className="w-3.5 h-3.5" />
                            Хадгалах
                        </Button>
                    </div>
                )}
            </div>

            {/* Validation Overview */}
            {validationChecklist && !isEditing && (
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {/* 1. Identification Section */}
                <div className="space-y-6">
                    <div className="grid gap-5 bg-muted/50 p-8 rounded-xl border border-border">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Ажлын байрны нэр</label>
                            {isEditing ? (
                                <Input
                                    value={formData.title}
                                    onChange={(e) => handleFieldUpdate('title', e.target.value)}
                                    placeholder="Жишээ: Ахлах борлуулалтын менежер"
                                    className="h-10 rounded-lg border-border bg-background"
                                />
                            ) : (
                                <p className="text-sm font-bold text-foreground">{position.title}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Ажлын байрны код</label>
                            {isEditing ? (
                                <Input
                                    value={formData.code}
                                    onChange={(e) => handleFieldUpdate('code', e.target.value)}
                                    placeholder="Ж: SLS-01"
                                    className="h-10 rounded-lg border-border bg-background text-xs font-mono"
                                />
                            ) : (
                                <p className="text-xs font-bold font-mono text-primary bg-primary/10 px-2 py-0.5 rounded w-fit">{position.code || 'Кодгүй'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 2. Organization Section */}
                <div className="space-y-6">
                    <div className="grid gap-5 bg-muted/50 p-8 rounded-xl border border-border">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Нэгж / Салбар</label>
                            {isEditing ? (
                                <Select value={formData.departmentId} onValueChange={(val) => handleFieldUpdate('departmentId', val)}>
                                    <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {departments.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-primary" />
                                    <p className="text-sm font-bold text-foreground">{department?.name || 'Нэгж оноогоогүй'}</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Шууд удирдлага</label>
                            {isEditing ? (
                                <Select value={formData.reportsToId} onValueChange={(val) => handleFieldUpdate('reportsToId', val)}>
                                    <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="none">Удирдлагагүй (Дээд шат)</SelectItem>
                                        {allPositions.filter(p => p.id !== position.id).map(p => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4 text-muted-foreground" />
                                    <p className="text-sm font-bold text-foreground">{supervisor?.title || 'Тодорхойгүй'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 3. Classification Section */}
                <div className="space-y-6">
                    <div className="grid gap-5 bg-muted/50 p-8 rounded-xl border border-border">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Түвшин / Зэрэглэл</label>
                            {isEditing ? (
                                <Select value={formData.levelId} onValueChange={(val) => handleFieldUpdate('levelId', val)}>
                                    <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {levels.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Badge variant="outline" className="bg-background border-border text-foreground font-bold px-3 py-1 rounded-lg">
                                    {level?.name || 'Тохируулаагүй'}
                                </Badge>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Ажил мэргэжлийн код (ЯАМАТ)</label>
                            {isEditing ? (
                                <Select value={formData.jobCategoryId} onValueChange={(val) => handleFieldUpdate('jobCategoryId', val)}>
                                    <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm font-bold text-foreground">{category?.name || 'Ангилал оноогоогүй'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Employment Terms Section */}
                <div className="space-y-6">
                    <div className="grid gap-5 bg-muted/50 p-8 rounded-xl border border-border">
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Ажлын байрны төрөл</label>
                            {isEditing ? (
                                <Select value={formData.employmentTypeId} onValueChange={(val) => handleFieldUpdate('employmentTypeId', val)}>
                                    <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {employmentTypes.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm font-bold text-foreground">{employmentType?.name || 'Бүртгэгдээгүй'}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-tight">Цагийн хуваарь</label>
                            {isEditing ? (
                                <Select value={formData.workScheduleId} onValueChange={(val) => handleFieldUpdate('workScheduleId', val)}>
                                    <SelectTrigger className="h-10 rounded-lg border-border bg-background shadow-sm"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {schedules.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="text-sm font-bold text-foreground">{schedule?.name || 'Тохируулаагүй'}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* 5. Permissions & Settings Section */}
                <div className="space-y-6">
                    <div className="grid gap-5 bg-muted/50 p-8 rounded-xl border border-border h-full">
                        <div className="space-y-3">
                            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Системийн эрхүүд</label>
                            <div className="grid gap-3">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border transition-all shadow-sm">
                                    <p className="text-xs font-semibold text-foreground">Ээлжийн амралтын хуваарийн хүсэлт батлах</p>
                                    {isEditing ? (
                                        <input
                                            type="checkbox"
                                            checked={formData.permissions.canApproveVacation}
                                            onChange={(e) => handleFieldUpdate('permissions', { ...formData.permissions, canApproveVacation: e.target.checked })}
                                            className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary cursor-pointer"
                                        />
                                    ) : (
                                        formData.permissions.canApproveVacation ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-muted-foreground/30" />
                                    )}
                                </div>
                                <div className="flex items-center justify-between p-3 rounded-lg bg-background border border-border transition-all shadow-sm">
                                    <p className="text-xs font-semibold text-foreground">Чөлөө батлах эрх</p>
                                    {isEditing ? (
                                        <input
                                            type="checkbox"
                                            checked={formData.permissions.canApproveLeave}
                                            onChange={(e) => handleFieldUpdate('permissions', { ...formData.permissions, canApproveLeave: e.target.checked })}
                                            className="h-5 w-5 rounded-md border-border text-primary focus:ring-primary cursor-pointer"
                                        />
                                    ) : (
                                        formData.permissions.canApproveLeave ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-muted-foreground/30" />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 6. Budget Section */}
                <div className="space-y-6">
                    <div className="grid gap-5 bg-muted/50 p-8 rounded-xl border border-border h-full">
                        <div className="space-y-4">
                            <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Жилийн төсөв (Орчим)</label>
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <Input
                                        type="number"
                                        value={formData.budget.yearlyBudget}
                                        onChange={(e) => handleFieldUpdate('budget', { ...formData.budget, yearlyBudget: Number(e.target.value) })}
                                        className="h-10 rounded-lg border-border bg-background"
                                    />
                                    <Select value={formData.budget.currency} onValueChange={(val) => handleFieldUpdate('budget', { ...formData.budget, currency: val })}>
                                        <SelectTrigger className="w-24 h-10 rounded-lg border-border bg-background shadow-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="MNT">₮</SelectItem>
                                            <SelectItem value="USD">$</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="flex items-baseline gap-3">
                                    <p className="text-2xl font-bold text-foreground">{formData.budget.yearlyBudget.toLocaleString()}</p>
                                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">{formData.budget.currency}</p>
                                </div>
                            )}
                            <p className="text-[10px] font-medium text-muted-foreground italic">Энэхүү дүн нь зөвхөн төлөвлөлтөнд ашиглагдана.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

