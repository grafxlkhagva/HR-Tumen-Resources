'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
import { Briefcase, Clock, Users, ShieldCheck, Edit3, Check, X, Layers, Gem, Workflow, CalendarDays, Sparkles, UserCheck, Plane } from 'lucide-react';
import { Position, JobCategory, PositionLevel, EmploymentType, WorkSchedule } from '../../../types';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface PositionClassificationProps {
    position: Position;
    levels: PositionLevel[];
    categories: JobCategory[];
    employmentTypes: EmploymentType[];
    schedules: WorkSchedule[];
    onUpdate: (data: Partial<Position>) => Promise<void>;
    isEditing?: boolean;
}

export function PositionClassification({
    position,
    levels,
    categories,
    employmentTypes,
    schedules,
    onUpdate,
    isEditing = false
}: PositionClassificationProps) {
    const [formData, setFormData] = useState({
        levelId: position.levelId || '',
        jobCategoryId: position.jobCategoryId || '',
        employmentTypeId: position.employmentTypeId || '',
        workScheduleId: position.workScheduleId || '',
        canApproveAttendance: position.canApproveAttendance || false,
        canApproveVacation: position.canApproveVacation || false,
        hasPointBudget: position.hasPointBudget || false,
        yearlyPointBudget: position.yearlyPointBudget || 0
    });

    const getLevelName = (id: string) => levels?.find(l => l.id === id)?.name || '-';
    const getCategoryName = (id: string) => categories?.find(c => c.id === id)?.name || '-';
    const getEmpTypeName = (id: string) => employmentTypes?.find(t => t.id === id)?.name || '-';
    const getScheduleName = (id: string) => schedules?.find(s => s.id === id)?.name || '-';

    const handleFieldUpdate = (field: string, value: any) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);
        onUpdate({ [field]: value });
    };

    const items = [
        {
            id: 'levelId',
            label: 'Зэрэглэл',
            value: getLevelName(position.levelId || ''),
            icon: Gem,
            color: 'bg-indigo-50 text-indigo-600',
            options: levels,
            placeholder: 'Зэрэглэл сонгох'
        },
        {
            id: 'jobCategoryId',
            label: 'Ажлын байрны ангилал',
            value: getCategoryName(position.jobCategoryId || ''),
            icon: Layers,
            color: 'bg-emerald-50 text-emerald-600',
            options: categories,
            placeholder: 'Ангилал сонгох'
        },
        {
            id: 'employmentTypeId',
            label: 'Гэрээний төрөл',
            value: getEmpTypeName(position.employmentTypeId || ''),
            icon: Workflow,
            color: 'bg-blue-50 text-blue-600',
            options: employmentTypes,
            placeholder: 'Төрөл сонгох'
        },
        {
            id: 'workScheduleId',
            label: 'Ажлын цагийн хуваарь',
            value: getScheduleName(position.workScheduleId || ''),
            icon: CalendarDays,
            color: 'bg-amber-50 text-amber-600',
            options: schedules,
            placeholder: 'Хуваарь сонгох'
        }
    ];

    return (
        <div className="group/card">
            <Card className="border-none shadow-2xl shadow-slate-200/50 ring-1 ring-slate-200/50 overflow-hidden bg-white/70 backdrop-blur-sm transition-all duration-300 hover:ring-primary/20">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between py-5 px-8">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-primary" />
                        </div>
                        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500/80">Ангилал & Нөхцөл</CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="p-8">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-10">
                        {items.map((item, idx) => (
                            <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="space-y-3"
                            >
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">{item.label}</p>
                                </div>

                                <div className="min-h-[48px] flex items-center">
                                    {isEditing ? (
                                        <div className="w-full">
                                            <Select
                                                value={formData[item.id as keyof typeof formData] as string}
                                                onValueChange={(val) => handleFieldUpdate(item.id, val)}
                                            >
                                                <SelectTrigger className="h-12 border-slate-200 rounded-2xl bg-slate-50/50 focus:ring-primary/20 transition-all hover:bg-white hover:border-primary/30">
                                                    <SelectValue placeholder={item.placeholder} />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                                    {item.options?.map((opt: any) => (
                                                        <SelectItem
                                                            key={opt.id}
                                                            value={opt.id}
                                                            className="rounded-xl my-0.5 mx-1 focus:bg-primary/5 focus:text-primary transition-colors cursor-pointer"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold">{opt.name}</span>
                                                                {opt.code && <span className="text-[10px] opacity-40 uppercase tabular-nums">({opt.code})</span>}
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 group/item w-full p-2 -ml-2 rounded-2xl hover:bg-slate-50/50 transition-colors duration-300">
                                            <div className={cn(
                                                "h-11 w-11 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-500 group-hover/item:scale-110",
                                                item.color
                                            )}>
                                                <item.icon className="w-5 h-5" />
                                            </div>
                                            <div className="space-y-0.5">
                                                <p className="font-semibold text-slate-800 text-[15px] tracking-tight">{item.value}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Additional Settings Divider */}
                    <div className="my-10 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                    {/* Additional Settings Section */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-2 mb-6">
                            <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">Нэмэлт тохиргоо</h3>
                        </div>

                        {isEditing ? (
                            <div className="grid grid-cols-1 gap-4">
                                {/* Attendance Approval */}
                                <div className="flex flex-row items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-slate-900">Ирцийн хүсэлт батлах эсэх</p>
                                        <p className="text-[11px] text-slate-500 font-medium">Доод албан тушаалтнуудын ирцийг батлах эрх</p>
                                    </div>
                                    <Switch
                                        checked={formData.canApproveAttendance}
                                        onCheckedChange={(checked) => handleFieldUpdate('canApproveAttendance', checked)}
                                    />
                                </div>

                                {/* Vacation Approval */}
                                <div className="flex flex-row items-center justify-between p-5 rounded-2xl bg-slate-50/50 border border-slate-100">
                                    <div className="space-y-1">
                                        <p className="text-sm font-semibold text-slate-900">Амралтын хүсэлт батлах эсэх</p>
                                        <p className="text-[11px] text-slate-500 font-medium">Ажилчдын ээлжийн амралтыг батлах эрх</p>
                                    </div>
                                    <Switch
                                        checked={formData.canApproveVacation}
                                        onCheckedChange={(checked) => handleFieldUpdate('canApproveVacation', checked)}
                                    />
                                </div>

                                {/* Point Budget */}
                                <div className={cn(
                                    "p-5 rounded-2xl border transition-all duration-300",
                                    formData.hasPointBudget ? "bg-amber-50/30 border-amber-200/50" : "bg-slate-50/50 border-slate-100"
                                )}>
                                    <div className="flex flex-row items-center justify-between mb-4">
                                        <div className="space-y-1">
                                            <p className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                <Sparkles className={cn("w-4 h-4", formData.hasPointBudget ? "text-amber-500" : "text-slate-400")} />
                                                Онооны төсөвтэй эсэх
                                            </p>
                                            <p className="text-[11px] text-slate-500 font-medium">Ажилчдад өгөх онооны төсөв хуваарилах</p>
                                        </div>
                                        <Switch
                                            checked={formData.hasPointBudget}
                                            onCheckedChange={(checked) => handleFieldUpdate('hasPointBudget', checked)}
                                        />
                                    </div>

                                    {formData.hasPointBudget && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="pt-2"
                                        >
                                            <div className="space-y-2">
                                                <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Жилийн онооны төсөв</label>
                                                <Input
                                                    type="number"
                                                    value={formData.yearlyPointBudget}
                                                    onChange={(e) => handleFieldUpdate('yearlyPointBudget', parseInt(e.target.value) || 0)}
                                                    className="h-11 bg-white border-amber-200 focus-visible:ring-amber-200"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className={cn("flex items-center gap-4 p-4 rounded-2xl border transition-colors", position.canApproveAttendance ? "bg-blue-50/50 border-blue-100" : "bg-slate-50/50 border-slate-100 opacity-60")}>
                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", position.canApproveAttendance ? "bg-blue-100 text-blue-600" : "bg-slate-200 text-slate-400")}>
                                        <UserCheck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Ирц батлах</p>
                                        <p className="text-[11px] text-slate-500">{position.canApproveAttendance ? 'Эрх олгогдсон' : 'Эрхгүй'}</p>
                                    </div>
                                </div>

                                <div className={cn("flex items-center gap-4 p-4 rounded-2xl border transition-colors", position.canApproveVacation ? "bg-purple-50/50 border-purple-100" : "bg-slate-50/50 border-slate-100 opacity-60")}>
                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", position.canApproveVacation ? "bg-purple-100 text-purple-600" : "bg-slate-200 text-slate-400")}>
                                        <Plane className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-900">Амралт батлах</p>
                                        <p className="text-[11px] text-slate-500">{position.canApproveVacation ? 'Эрх олгогдсон' : 'Эрхгүй'}</p>
                                    </div>
                                </div>

                                <div className={cn("md:col-span-2 flex items-center gap-4 p-4 rounded-2xl border transition-colors", position.hasPointBudget ? "bg-amber-50/50 border-amber-100" : "bg-slate-50/50 border-slate-100 opacity-60")}>
                                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", position.hasPointBudget ? "bg-amber-100 text-amber-600" : "bg-slate-200 text-slate-400")}>
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">Онооны төсөв</p>
                                            <p className="text-[11px] text-slate-500">{position.hasPointBudget ? 'Төсөв хуваарилагдсан' : 'Төсөвгүй'}</p>
                                        </div>
                                        {position.hasPointBudget && position.yearlyPointBudget && (
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-amber-600">{position.yearlyPointBudget.toLocaleString()}</p>
                                                <p className="text-[10px] uppercase font-bold text-amber-400">Жилд</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
