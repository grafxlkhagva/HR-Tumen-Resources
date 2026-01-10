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
import { Briefcase, Clock, Users, ShieldCheck, Edit2, Check, X } from 'lucide-react';
import { Position, JobCategory, PositionLevel, EmploymentType, WorkSchedule } from '../../../types';

interface PositionClassificationProps {
    position: Position;
    levels: PositionLevel[];
    categories: JobCategory[];
    employmentTypes: EmploymentType[];
    schedules: WorkSchedule[];
    onUpdate: (data: Partial<Position>) => Promise<void>;
}

export function PositionClassification({
    position,
    levels,
    categories,
    employmentTypes,
    schedules,
    onUpdate
}: PositionClassificationProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        levelId: position.levelId || '',
        jobCategoryId: position.jobCategoryId || '',
        employmentTypeId: position.employmentTypeId || '',
        workScheduleId: position.workScheduleId || ''
    });

    const getLevelName = (id: string) => levels?.find(l => l.id === id)?.name || '-';
    const getCategoryName = (id: string) => categories?.find(c => c.id === id)?.name || '-';
    const getEmpTypeName = (id: string) => employmentTypes?.find(t => t.id === id)?.name || '-';
    const getScheduleName = (id: string) => schedules?.find(s => s.id === id)?.name || '-';

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onUpdate(formData);
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update classification', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            levelId: position.levelId || '',
            jobCategoryId: position.jobCategoryId || '',
            employmentTypeId: position.employmentTypeId || '',
            workScheduleId: position.workScheduleId || ''
        });
        setIsEditing(false);
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Ангилал & Нөхцөл</CardTitle>
                    {!isEditing ? (
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-8 w-8 p-0">
                            <Edit2 className="w-4 h-4 text-slate-400" />
                        </Button>
                    ) : (
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={handleCancel} disabled={isLoading} className="h-8 w-8 p-0">
                                <X className="w-4 h-4 text-destructive" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleSave} disabled={isLoading} className="h-8 w-8 p-0">
                                <Check className="w-4 h-4 text-emerald-600" />
                            </Button>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12">

                    {/* Level */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Зэрэглэл</p>
                        {isEditing ? (
                            <Select
                                value={formData.levelId}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, levelId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Зэрэглэл сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {levels?.map((l) => (
                                        <SelectItem key={l.id} value={l.id}>{l.name} {l.code ? `(${l.code})` : ''}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 ring-1 ring-slate-100">
                                    <ShieldCheck className="w-5 h-5" />
                                </div>
                                <p className="font-bold text-slate-800">{getLevelName(position.levelId || '')}</p>
                            </div>
                        )}
                    </div>

                    {/* Job Category */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Ажлын байрны ангилал</p>
                        {isEditing ? (
                            <Select
                                value={formData.jobCategoryId}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, jobCategoryId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Ангилал сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {categories?.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 ring-1 ring-slate-100">
                                    <Briefcase className="w-5 h-5" />
                                </div>
                                <p className="font-bold text-slate-800">{getCategoryName(position.jobCategoryId || '')}</p>
                            </div>
                        )}
                    </div>

                    {/* Employment Type */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Гэрээний төрөл</p>
                        {isEditing ? (
                            <Select
                                value={formData.employmentTypeId}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, employmentTypeId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Төрөл сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {employmentTypes?.map((et) => (
                                        <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 ring-1 ring-slate-100">
                                    <Users className="w-5 h-5" />
                                </div>
                                <p className="font-bold text-slate-800">{getEmpTypeName(position.employmentTypeId || '')}</p>
                            </div>
                        )}
                    </div>

                    {/* Work Schedule */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Ажлын цагийн хуваарь</p>
                        {isEditing ? (
                            <Select
                                value={formData.workScheduleId}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, workScheduleId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Хуваарь сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {schedules?.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 ring-1 ring-slate-100">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <p className="font-bold text-slate-800">{getScheduleName(position.workScheduleId || '')}</p>
                            </div>
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
