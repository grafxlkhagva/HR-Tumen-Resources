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
import { Building2, Briefcase, ArrowRight, Check, X, Edit2 } from 'lucide-react';
import { Position } from '../../../types';
import { useRouter } from 'next/navigation';

interface PositionBasicInfoProps {
    position: Position;
    departments: any[]; // Using any for now to avoid import issues, mostly Reference type
    allPositions: Position[];
    onUpdate: (data: Partial<Position>) => Promise<void>;
}

export function PositionBasicInfo({
    position,
    departments,
    allPositions,
    onUpdate
}: PositionBasicInfoProps) {
    const router = useRouter();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: position.title || '',
        departmentId: position.departmentId || '',
        reportsTo: position.reportsTo || '(none)'
    });

    const getDepartmentName = (id: string) => departments?.find(d => d.id === id)?.name || '-';
    const getPositionTitle = (id: string) => allPositions?.find(p => p.id === id)?.title || 'Олдсонгүй';

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onUpdate({
                title: formData.title,
                departmentId: formData.departmentId,
                reportsTo: formData.reportsTo === '(none)' ? undefined : formData.reportsTo
            });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update basic info', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData({
            title: position.title || '',
            departmentId: position.departmentId || '',
            reportsTo: position.reportsTo || '(none)'
        });
        setIsEditing(false);
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-xl shadow-slate-200/50 ring-1 ring-slate-200/50 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-400">Үндсэн мэдээлэл</CardTitle>
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

                    {/* Title - New Field */}
                    <div className="space-y-2 md:col-span-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Албан тушаалын нэр</p>
                        {isEditing ? (
                            <div className="relative">
                                <input
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    value={formData.title}
                                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    placeholder="Албан тушаалын нэр"
                                />
                            </div>
                        ) : (
                            <p className="text-xl font-bold text-slate-900 tracking-tight">{position.title}</p>
                        )}
                    </div>

                    {/* Department */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Харьяалагдах нэгж</p>
                        {isEditing ? (
                            <Select
                                value={formData.departmentId}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, departmentId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Нэгж сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments?.map((dept) => (
                                        <SelectItem key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 ring-1 ring-slate-100">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <p className="font-bold text-slate-800">{getDepartmentName(position.departmentId)}</p>
                            </div>
                        )}
                    </div>

                    {/* Reports To */}
                    <div className="space-y-2">
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Шууд удирдлага</p>
                        {isEditing ? (
                            <Select
                                value={formData.reportsTo}
                                onValueChange={(val) => setFormData(prev => ({ ...prev, reportsTo: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Удирдах албан тушаал" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="(none)">Шууд удирдлагагүй</SelectItem>
                                    {allPositions?.filter(p => p.id !== position.id).map((pos) => (
                                        <SelectItem key={pos.id} value={pos.id}>
                                            {pos.title}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <div className="flex items-center gap-3">
                                {/* We can re-use the visual style from page.tsx or simplify */}
                                {position.reportsTo ? (
                                    <div className="flex items-center justify-between w-full p-3 rounded-xl bg-slate-50 ring-1 ring-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-primary shadow-sm">
                                                <Briefcase className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900 leading-tight">
                                                    {getPositionTitle(position.reportsTo)}
                                                </p>
                                            </div>
                                        </div>
                                        <Button variant="ghost" className="rounded-xl h-8 w-8 p-0" onClick={() => router.push(`/dashboard/organization/positions/${position.reportsTo}`)}>
                                            <ArrowRight className="w-4 h-4 text-slate-300" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-3 p-3">
                                        <p className="text-sm font-bold text-slate-400 italic">Шууд удирдлагагүй</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
