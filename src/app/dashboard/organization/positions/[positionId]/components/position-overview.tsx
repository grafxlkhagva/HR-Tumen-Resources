'use client';

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Building2, Briefcase, ArrowRight, Info, Users, Gem, Layers, Workflow, CalendarDays, Sparkles, UserCheck, Plane } from 'lucide-react';
import { Position, JobCategory, PositionLevel, EmploymentType, WorkSchedule } from '../../../types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface PositionOverviewProps {
    position: Position;
    departments: any[];
    allPositions: Position[];
    levels: PositionLevel[];
    categories: JobCategory[];
    employmentTypes: EmploymentType[];
    schedules: WorkSchedule[];
    onUpdate: (data: Partial<Position>) => Promise<void>;
    isEditing?: boolean;
}

export function PositionOverview({
    position,
    departments,
    allPositions,
    levels,
    categories,
    employmentTypes,
    schedules,
    onUpdate,
    isEditing = false
}: PositionOverviewProps) {
    const router = useRouter();
    const [formData, setFormData] = useState({
        title: position.title || '',
        departmentId: position.departmentId || '',
        reportsTo: position.reportsTo || '(none)',
        levelId: position.levelId || '',
        jobCategoryId: position.jobCategoryId || '',
        employmentTypeId: position.employmentTypeId || '',
        workScheduleId: position.workScheduleId || '',
        canApproveAttendance: position.canApproveAttendance || false,
        canApproveVacation: position.canApproveVacation || false,
        hasPointBudget: position.hasPointBudget || false,
        yearlyPointBudget: position.yearlyPointBudget || 0
    });

    const getDepartmentName = (id: string) => departments?.find(d => d.id === id)?.name || '-';
    const getPositionTitle = (id: string) => allPositions?.find(p => p.id === id)?.title || 'Олдсонгүй';
    const getLevelName = (id: string) => levels?.find(l => l.id === id)?.name || '-';
    const getCategoryName = (id: string) => categories?.find(c => c.id === id)?.name || '-';
    const getEmpTypeName = (id: string) => employmentTypes?.find(t => t.id === id)?.name || '-';
    const getScheduleName = (id: string) => schedules?.find(s => s.id === id)?.name || '-';

    const handleFieldUpdate = (field: string, value: any) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);
        onUpdate({
            [field]: value === '(none)' ? null : value
        });
    };

    const classificationItems = [
        {
            id: 'levelId',
            label: 'Зэрэглэл',
            value: getLevelName(position.levelId || ''),
            icon: Gem,
            options: levels,
            placeholder: 'Зэрэглэл сонгох'
        },
        {
            id: 'jobCategoryId',
            label: 'Ажлын байрны ангилал',
            value: getCategoryName(position.jobCategoryId || ''),
            icon: Layers,
            options: categories,
            placeholder: 'Ангилал сонгох'
        },
        {
            id: 'employmentTypeId',
            label: 'Гэрээний төрөл',
            value: getEmpTypeName(position.employmentTypeId || ''),
            icon: Workflow,
            options: employmentTypes,
            placeholder: 'Төрөл сонгох'
        },
        {
            id: 'workScheduleId',
            label: 'Ажлын цагийн хуваарь',
            value: getScheduleName(position.workScheduleId || ''),
            icon: CalendarDays,
            options: schedules,
            placeholder: 'Хуваарь сонгох'
        }
    ];

    return (
        <section className="space-y-6">
            <Card className="border bg-card shadow-sm rounded-xl overflow-hidden">
                <CardContent className="p-8 space-y-8">
                    {/* 1. Header Area: Position Title */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground">Ажлын байрны нэр</label>
                        {isEditing ? (
                            <input
                                className="flex h-12 w-full rounded-xl border bg-muted/30 px-4 py-2 text-lg font-bold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                                value={formData.title}
                                onChange={(e) => handleFieldUpdate('title', e.target.value)}
                                placeholder="Ажлын байрны нэр"
                            />
                        ) : (
                            <h3 className="text-2xl font-bold tracking-tight">{position.title}</h3>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {/* 2. Basic Info Grid */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Харьяалагдах нэгж</label>
                            {isEditing ? (
                                <Select value={formData.departmentId} onValueChange={(val) => handleFieldUpdate('departmentId', val)}>
                                    <SelectTrigger className="h-11 rounded-xl border bg-muted/30 px-4">
                                        <SelectValue placeholder="Нэгж сонгох" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {departments?.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/10">
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <p className="text-sm font-bold">{getDepartmentName(position.departmentId)}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Шууд удирдлага</label>
                            {isEditing ? (
                                <Select value={formData.reportsTo} onValueChange={(val) => handleFieldUpdate('reportsTo', val)}>
                                    <SelectTrigger className="h-11 rounded-xl border bg-muted/30 px-4">
                                        <SelectValue placeholder="Удирдах албан тушаал" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="(none)" className="font-semibold text-muted-foreground">Шууд удирдлагагүй</SelectItem>
                                        {allPositions?.filter(p => p.id !== position.id).map((pos) => (
                                            <SelectItem key={pos.id} value={pos.id}>{pos.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-3">
                                    {position.reportsTo ? (
                                        <div className="flex items-center justify-between w-full p-3 rounded-xl border bg-muted/10 hover:bg-muted/20 transition-colors group">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-lg bg-background border flex items-center justify-center text-primary shadow-sm group-hover:scale-105 transition-transform">
                                                    <Briefcase className="w-5 h-5" />
                                                </div>
                                                <p className="text-sm font-bold">{getPositionTitle(position.reportsTo)}</p>
                                            </div>
                                            <Button variant="ghost" size="icon" className="rounded-lg h-8 w-8 hover:bg-background" onClick={() => router.push(`/dashboard/organization/positions/${position.reportsTo}`)}>
                                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed bg-muted/5 w-full">
                                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground/40">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <p className="text-sm font-bold text-muted-foreground italic">Шууд удирдлагагүй</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 3. Classification Grid */}
                        {classificationItems.map((item) => (
                            <div key={item.id} className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">{item.label}</label>
                                {isEditing ? (
                                    <Select value={formData[item.id as keyof typeof formData] as string} onValueChange={(val) => handleFieldUpdate(item.id, val)}>
                                        <SelectTrigger className="h-11 rounded-xl border bg-muted/30 px-4">
                                            <SelectValue placeholder={item.placeholder} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {item.options?.map((opt: any) => (
                                                <SelectItem key={opt.id} value={opt.id}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold">{opt.name}</span>
                                                        {opt.code && <span className="text-[10px] opacity-40 uppercase tabular-nums">({opt.code})</span>}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <div className="flex items-center gap-3 p-3 rounded-xl border bg-muted/10">
                                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                                            <item.icon className="w-5 h-5" />
                                        </div>
                                        <p className="text-sm font-bold">{item.value}</p>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="h-px bg-border/50" />

                    {/* 4. Permissions & Budget Area */}
                    <div className="space-y-6">
                        <label className="text-xs font-medium text-muted-foreground">Нэмэлт эрх & Төсөв</label>
                        {isEditing ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-row items-center justify-between p-4 rounded-xl border bg-muted/30">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold">Ирцийн хүсэлт батлах</p>
                                        <p className="text-xs text-muted-foreground">Доод албан тушаалтнуудын ирцийг батлах эрх</p>
                                    </div>
                                    <Switch checked={formData.canApproveAttendance} onCheckedChange={(val) => handleFieldUpdate('canApproveAttendance', val)} />
                                </div>
                                <div className="flex flex-row items-center justify-between p-4 rounded-xl border bg-muted/30">
                                    <div className="space-y-0.5">
                                        <p className="text-sm font-bold">Амралтын хүсэлт батлах</p>
                                        <p className="text-xs text-muted-foreground">Ажилчдын ээлжийн амралтыг батлах эрх</p>
                                    </div>
                                    <Switch checked={formData.canApproveVacation} onCheckedChange={(val) => handleFieldUpdate('canApproveVacation', val)} />
                                </div>
                                <div className={cn("p-4 rounded-xl border transition-all md:col-span-2", formData.hasPointBudget ? "bg-amber-50/30 border-amber-200" : "bg-muted/30")}>
                                    <div className="flex flex-row items-center justify-between">
                                        <div className="space-y-0.5">
                                            <p className="text-sm font-bold">Онооны төсөв</p>
                                            <p className="text-xs text-muted-foreground">Урамшууллын оноо хуваарилах төсөв</p>
                                        </div>
                                        <Switch checked={formData.hasPointBudget} onCheckedChange={(val) => handleFieldUpdate('hasPointBudget', val)} />
                                    </div>
                                    {formData.hasPointBudget && (
                                        <div className="mt-4 pt-4 border-t border-amber-100 space-y-2">
                                            <label className="text-xs font-medium text-amber-600">Жилийн төсөв</label>
                                            <Input type="number" value={formData.yearlyPointBudget} onChange={(e) => handleFieldUpdate('yearlyPointBudget', parseInt(e.target.value) || 0)} className="h-10 bg-background border-amber-200" placeholder="0" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className={cn("flex items-center gap-3 p-3 rounded-xl border", position.canApproveAttendance ? "bg-primary/5 border-primary/20" : "bg-muted/20 opacity-50")}>
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", position.canApproveAttendance ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40")}><UserCheck className="w-5 h-5" /></div>
                                    <div><p className="text-sm font-bold">Ирц батлах</p><p className="text-xs font-medium text-muted-foreground">{position.canApproveAttendance ? 'Нээлттэй' : 'Хаалттай'}</p></div>
                                </div>
                                <div className={cn("flex items-center gap-3 p-3 rounded-xl border", position.canApproveVacation ? "bg-primary/5 border-primary/20" : "bg-muted/20 opacity-50")}>
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", position.canApproveVacation ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground/40")}><Plane className="w-5 h-5" /></div>
                                    <div><p className="text-sm font-bold">Амралт батлах</p><p className="text-xs font-medium text-muted-foreground">{position.canApproveVacation ? 'Нээлттэй' : 'Хаалттай'}</p></div>
                                </div>
                                <div className={cn("flex items-center gap-3 p-3 rounded-xl border", position.hasPointBudget ? "bg-amber-50 border-amber-200" : "bg-muted/20 opacity-50")}>
                                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", position.hasPointBudget ? "bg-amber-100 text-amber-600" : "bg-muted text-muted-foreground/40")}><Sparkles className="w-5 h-5" /></div>
                                    <div className="flex-1 text-sm font-bold">
                                        <p>Онооны төсөв</p>
                                        <div className="flex items-center justify-between mt-0.5">
                                            <p className="text-xs font-medium text-amber-600/60">{position.hasPointBudget ? 'Идэвхтэй' : 'Байхгүй'}</p>
                                            {position.hasPointBudget && <p className="text-amber-700">{position.yearlyPointBudget?.toLocaleString()} /жил</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </section>
    );
}
