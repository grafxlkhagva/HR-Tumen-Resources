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
import { Building2, Code2, Users, FileText, Check, X, Target, Edit3, Calendar as CalendarIcon, Hash, Activity, Palette, GitBranch, Briefcase } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';

function InfoItem({ icon: Icon, label, value }: { icon: any, label: string, value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-accent/50 transition-all duration-200">
            <div className="p-2 bg-primary/10 rounded-full shrink-0">
                <Icon className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
                <div className="text-sm font-semibold text-foreground truncate">
                    {value || '-'}
                </div>
            </div>
        </div>
    )
}

interface DepartmentInfoProps {
    department: Department;
    positions: Position[];
}

export function DepartmentInfo({ department, positions }: DepartmentInfoProps) {
    const { firestore } = useFirebase();

    const typesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departmentTypes') : null), [firestore]);
    const deptsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);

    const { data: departmentTypes } = useCollection<DepartmentType>(typesQuery);
    const { data: allDepartments } = useCollection<Department>(deptsQuery);

    const typeName = departmentTypes?.find(t => t.id === department.typeId)?.name || department.typeName || 'Нэгж';
    const parentName = allDepartments?.find(d => d.id === department.parentId)?.name || 'Үндсэн нэгж';

    return (
        <Card className="overflow-hidden border bg-card shadow-sm rounded-xl">
            <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-8 items-start">
                    {/* Header Info */}
                    <div className="flex-1 space-y-4 w-full">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="space-y-1">
                                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                                    {department.name}
                                </h2>
                                <div className="flex items-center gap-2">
                                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                                        {typeName}
                                    </Badge>
                                    <Badge variant="outline" className={cn(
                                        "font-medium",
                                        department.status === 'active' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-600 border-slate-100"
                                    )}>
                                        {department.status === 'active' ? 'Идэвхтэй' : 'Идэвхгүй'}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* Grid of Info Items */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
                            <InfoItem
                                icon={Hash}
                                label="Нэгжийн код"
                                value={department.code}
                            />
                            <InfoItem
                                icon={GitBranch}
                                label="Дээд нэгж"
                                value={parentName}
                            />
                            <InfoItem
                                icon={CalendarIcon}
                                label="Батлагдсан огноо"
                                value={department.createdAt ? format(new Date(department.createdAt), 'yyyy-MM-dd') : '-'}
                            />
                            <InfoItem
                                icon={Palette}
                                label="Систем өнгө"
                                value={
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full border shadow-sm" style={{ backgroundColor: department.color || '#000' }} />
                                        <span className="font-mono text-xs text-muted-foreground uppercase">{department.color}</span>
                                    </div>
                                }
                            />
                        </div>
                    </div>
                </div>

                {/* Goals & Functions Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-8 border-t">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Target className="w-4 h-4 text-primary" />
                            <h4 className="text-sm font-semibold text-foreground">Зорилго</h4>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50 min-h-[100px]">
                            <p className="text-sm leading-relaxed text-muted-foreground italic font-medium">
                                {department.vision || 'Зорилго бүртгэгдээгүй байна...'}
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <FileText className="w-4 h-4 text-primary" />
                            <h4 className="text-sm font-semibold text-foreground">Чиг үүрэг</h4>
                        </div>
                        <div className="p-4 rounded-xl bg-muted/30 border border-border/50 min-h-[100px]">
                            <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap font-medium">
                                {department.description || 'Чиг үүрэг бүртгэгдээгүй байна...'}
                            </p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
