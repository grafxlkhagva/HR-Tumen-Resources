'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Department, Position, DepartmentType } from '../../types';
import { Building2, Code2, Users, FileText, Check, X, Target, Edit3, Calendar as CalendarIcon, Hash, Activity, Palette, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

interface DepartmentInfoProps {
    department: Department;
    positions: Position[];
}

export function DepartmentInfo({ department, positions }: DepartmentInfoProps) {
    const { firestore } = useFirebase();

    // Queries for dropdowns (still might be needed for names, but mostly we just show department data)
    const typesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departmentTypes') : null), [firestore]);
    const deptsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);

    const { data: departmentTypes } = useCollection<DepartmentType>(typesQuery);
    const { data: allDepartments } = useCollection<Department>(deptsQuery);

    const managerPosition = positions.find(p => p.id === department.managerPositionId);
    const typeName = departmentTypes?.find(t => t.id === department.typeId)?.name || department.typeName || 'Нэгж';
    const parentName = allDepartments?.find(d => d.id === department.parentId)?.name || '(Үндсэн нэгж)';

    return (
        <Card className="border-none shadow-xl shadow-slate-200/40 ring-1 ring-slate-200/50 overflow-hidden bg-white/80 backdrop-blur-sm sticky top-6">
            <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: department.color || '#3b82f6' }} />

            <CardContent className="p-6 space-y-6">
                <div className="space-y-6">
                    {/* Department Name */}
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 leading-snug">{department.name}</h3>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {department.code && (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                                    <Hash className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-xs font-semibold font-mono">{department.code}</span>
                                </div>
                            )}
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100">
                                <Activity className="w-3.5 h-3.5" />
                                <span className="text-xs font-semibold capitalize">{department.status === 'inactive' ? 'Идэвхгүй' : 'Идэвхтэй'}</span>
                            </div>
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200">
                                <Palette className="w-3.5 h-3.5 text-slate-400" />
                                <div className="w-3 h-3 rounded-full border border-slate-200 shadow-sm" style={{ backgroundColor: department.color || '#000' }} />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                            <p className="text-slate-400 font-semibold mb-1">Төрөл</p>
                            <p className="text-slate-700 font-medium">{typeName}</p>
                        </div>
                        <div>
                            <p className="text-slate-400 font-semibold mb-1">Дээд нэгж</p>
                            <p className="text-slate-700 font-medium flex items-center gap-1">
                                <GitBranch className="w-3 h-3" />
                                {parentName}
                            </p>
                        </div>
                        <div>
                            <p className="text-slate-400 font-semibold mb-1">Батлагдсан</p>
                            <p className="text-slate-700 font-medium">
                                {department.createdAt ? format(new Date(department.createdAt), 'yyyy-MM-dd') : '-'}
                            </p>
                        </div>
                    </div>

                    <div className="h-px bg-slate-100" />

                    {/* Manager Info */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Users className="w-4 h-4" />
                            <span className="text-[11px] font-bold uppercase tracking-wider">Удирдлага</span>
                        </div>
                        <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100">
                            {managerPosition ? (
                                <div>
                                    <p className="font-semibold text-slate-900 text-sm">{managerPosition.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">Энэ нэгжийг удирдана</p>
                                </div>
                            ) : (
                                <p className="text-sm text-slate-400 italic">Удирдах албан тушаал тодорхойгүй</p>
                            )}
                        </div>
                    </div>

                    {/* Description */}
                    {department.description && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-slate-400">
                                <FileText className="w-4 h-4" />
                                <span className="text-[11px] font-bold uppercase tracking-wider">Чиг үүрэг</span>
                            </div>
                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50/50 p-3 rounded-xl border border-slate-100/50">
                                {department.description}
                            </p>
                        </div>
                    )}

                    {/* Vision/Goal */}
                    {department.vision && (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-orange-400">
                                <Target className="w-4 h-4" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-orange-500/80">Зорилго</span>
                            </div>
                            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-50 to-amber-50/50 p-4 border border-orange-100/50">
                                <p className="text-sm text-slate-700 italic relative z-10 leading-relaxed">
                                    "{department.vision}"
                                </p>
                                <Target className="absolute -bottom-2 -right-2 w-16 h-16 text-orange-100/50 rotate-[-15deg]" />
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
