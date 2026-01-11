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
import { Building2, Briefcase, ArrowRight, Check, X, Edit2, Info, Users } from 'lucide-react';
import { Position } from '../../../types';
import { useRouter } from 'next/navigation';

interface PositionBasicInfoProps {
    position: Position;
    departments: any[]; // Using any for now to avoid import issues, mostly Reference type
    allPositions: Position[];
    onUpdate: (data: Partial<Position>) => Promise<void>;
    isEditing?: boolean;
}

export function PositionBasicInfo({
    position,
    departments,
    allPositions,
    onUpdate,
    isEditing = false
}: PositionBasicInfoProps) {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: position.title || '',
        departmentId: position.departmentId || '',
        reportsTo: position.reportsTo || '(none)'
    });

    const getDepartmentName = (id: string) => departments?.find(d => d.id === id)?.name || '-';
    const getPositionTitle = (id: string) => allPositions?.find(p => p.id === id)?.title || 'Олдсонгүй';

    const handleFieldUpdate = (field: string, value: any) => {
        const newData = { ...formData, [field]: value };
        setFormData(newData);
        onUpdate({
            [field]: value === '(none)' ? null : value
        });
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/60 overflow-hidden bg-white rounded-3xl">
                <CardHeader className="bg-slate-50/30 border-b border-slate-100 px-8 py-6 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Info className="w-4 h-4 text-primary" />
                        </div>
                        <CardTitle className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-400">Үндсэн мэдээлэл</CardTitle>
                    </div>
                </CardHeader>

                <CardContent className="p-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-12">
                        {/* Title Section */}
                        <div className="md:col-span-2 space-y-4 pb-8 border-b border-slate-100/60">
                            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Ажлын байрны нэр</p>
                            {isEditing ? (
                                <input
                                    className="flex h-14 w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-5 py-2 text-lg font-semibold ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
                                    value={formData.title}
                                    onChange={(e) => handleFieldUpdate('title', e.target.value)}
                                    placeholder="Ажлын байрны нэр"
                                />
                            ) : (
                                <h3 className="text-2xl font-semibold text-slate-900 tracking-tight leading-tight">{position.title}</h3>
                            )}
                        </div>

                        {/* Department Section */}
                        <div className="space-y-4">
                            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Харьяалагдах нэгж</p>
                            {isEditing ? (
                                <Select
                                    value={formData.departmentId}
                                    onValueChange={(val) => handleFieldUpdate('departmentId', val)}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 px-4">
                                        <SelectValue placeholder="Нэгж сонгох" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                        {departments?.map((dept) => (
                                            <SelectItem key={dept.id} value={dept.id} className="rounded-xl my-0.5 mx-1">
                                                {dept.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-4 group/item">
                                    <div className="h-12 w-12 rounded-[18px] bg-indigo-50 flex items-center justify-center text-indigo-500 ring-1 ring-indigo-100 shadow-sm transition-transform group-hover/item:scale-105 duration-300">
                                        <Building2 className="w-5.5 h-5.5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <p className="text-base font-semibold text-slate-800 tracking-tight">{getDepartmentName(position.departmentId)}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Reports To Section */}
                        <div className="space-y-4">
                            <p className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Шууд удирдлага</p>
                            {isEditing ? (
                                <Select
                                    value={formData.reportsTo}
                                    onValueChange={(val) => handleFieldUpdate('reportsTo', val)}
                                >
                                    <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-slate-50/50 px-4">
                                        <SelectValue placeholder="Удирдах албан тушаал" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                                        <SelectItem value="(none)" className="rounded-xl my-0.5 mx-1 font-semibold text-slate-500">Шууд удирдлагагүй</SelectItem>
                                        {allPositions?.filter(p => p.id !== position.id).map((pos) => (
                                            <SelectItem key={pos.id} value={pos.id} className="rounded-xl my-0.5 mx-1">
                                                {pos.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="flex items-center gap-4">
                                    {position.reportsTo ? (
                                        <div className="flex items-center justify-between w-full p-3 pl-4 rounded-2xl bg-slate-50/50 ring-1 ring-slate-100 hover:bg-slate-100/50 transition-colors group/item">
                                            <div className="flex items-center gap-4">
                                                <div className="h-11 w-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm group-hover/item:scale-105 transition-transform duration-300">
                                                    <Briefcase className="w-5 h-5" />
                                                </div>
                                                <div className="space-y-0.5">
                                                    <p className="text-sm font-semibold text-slate-800 leading-tight">
                                                        {getPositionTitle(position.reportsTo)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                className="rounded-xl h-9 w-9 p-0 hover:bg-white hover:shadow-sm"
                                                onClick={() => router.push(`/dashboard/organization/positions/${position.reportsTo}`)}
                                            >
                                                <ArrowRight className="w-4 h-4 text-slate-400" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 p-1">
                                            <div className="h-11 w-11 rounded-xl bg-slate-50 border border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                                                <Users className="w-5 h-5" />
                                            </div>
                                            <p className="text-sm font-semibold text-slate-400 italic">Шууд удирдлагагүй</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
