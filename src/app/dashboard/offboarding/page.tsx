'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Settings,
    Search,
    Filter,
    ChevronRight,
    CheckCircle2,
    Clock,
    UserCircle2,
    Briefcase,
    LogOut,
    AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Employee, Department } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const STAGE_NAMES = ['Мэдэгдэл', 'Хүлээлцэх', 'Тооцоо', 'Exit'];

export default function OffboardingDashboardPage() {
    const { firestore } = useFirebase();
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Departments for mapping
    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const { data: departments } = useCollection<Department>(departmentsQuery as any);

    // Fetch Employees with offboarding lifecycle stage
    const employeesQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'employees'), where('lifecycleStage', '==', 'offboarding')) : null
        , [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery as any);

    // Fetch Offboarding Processes
    const offboardingQuery = useMemoFirebase(() =>
        firestore ? collection(firestore, 'offboarding_processes') : null
        , [firestore]);
    const { data: offboardingProcesses, isLoading: isLoadingOffboarding } = useCollection<any>(offboardingQuery as any);

    const departmentMap = useMemo(() => {
        const map = new Map<string, string>();
        departments?.forEach(d => map.set(d.id, d.name));
        return map;
    }, [departments]);

    const offboardingDataMap = useMemo(() => {
        const map = new Map<string, any>();
        offboardingProcesses?.forEach(p => map.set(p.id, p));
        return map;
    }, [offboardingProcesses]);

    const filteredEmployees = useMemo(() => {
        if (!employees) return [];
        return employees.filter(emp => {
            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            return fullName.includes(searchTerm.toLowerCase()) ||
                (emp.jobTitle?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        });
    }, [employees, searchTerm]);

    // Stats
    const stats = useMemo(() => {
        const total = filteredEmployees.length;
        const completed = filteredEmployees.filter(emp => {
            const process = offboardingDataMap.get(emp.id);
            return process?.progress === 100;
        }).length;
        const inProgress = total - completed;
        return { total, completed, inProgress };
    }, [filteredEmployees, offboardingDataMap]);

    if (isLoadingEmployees || isLoadingOffboarding) {
        return (
            <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
                <Skeleton className="h-20 w-full" />
                <div className="grid gap-4">
                    {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
            </div>
        );
    }

    return (
        <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
            <PageHeader
                title="Ажлаас чөлөөлөх (Offboarding)"
                description="Ажилчдын ажлаас гарах үйл явцыг хянах"
                actions={
                    <Button asChild variant="outline" className="bg-white hover:bg-slate-50 border-slate-200">
                        <Link href="/dashboard/settings/offboarding">
                            <Settings className="h-4 w-4 mr-2" />
                            Тохиргоо
                        </Link>
                    </Button>
                }
            />

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-none shadow-sm bg-gradient-to-br from-rose-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Нийт</p>
                                <p className="text-3xl font-black text-rose-700">{stats.total}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center">
                                <LogOut className="h-6 w-6 text-rose-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-gradient-to-br from-amber-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Явагдаж буй</p>
                                <p className="text-3xl font-black text-amber-700">{stats.inProgress}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center">
                                <Clock className="h-6 w-6 text-amber-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-none shadow-sm bg-gradient-to-br from-emerald-50 to-white">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Дууссан</p>
                                <p className="text-3xl font-black text-emerald-700">{stats.completed}</p>
                            </div>
                            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Ажилтан хайх..."
                        className="pl-10 bg-white border-slate-200 focus:ring-rose-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="bg-white">
                    <Filter className="h-4 w-4 mr-2" /> Шүүлтүүр
                </Button>
            </div>

            {/* Employee List */}
            <div className="grid gap-4">
                {filteredEmployees.length === 0 ? (
                    <Card className="border-none shadow-sm py-12 text-center text-slate-400">
                        <UserCircle2 className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>Ажлаас гарч буй ажилтан олдсонгүй.</p>
                        <p className="text-sm mt-2">Ажилтныг offboarding процесст оруулахын тулд тухайн ажилтны хуудаснаас "Ажлаас чөлөөлөх" үйлдлийг сонгоно уу.</p>
                    </Card>
                ) : (
                    filteredEmployees.map(emp => {
                        const process = offboardingDataMap.get(emp.id);
                        const overallProgress = process?.progress || 0;
                        const isCompleted = overallProgress === 100;

                        return (
                            <Card key={emp.id} className="group border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white dark:bg-slate-900">
                                <CardContent className="p-0">
                                    <div className="flex flex-col lg:flex-row lg:items-center">
                                        {/* Employee Info */}
                                        <div className="p-5 flex items-center gap-4 border-b lg:border-b-0 lg:border-r lg:w-[30%] bg-rose-50/30">
                                            <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                                                <AvatarImage src={emp.photoURL} />
                                                <AvatarFallback className="bg-rose-100 text-rose-700 font-bold">
                                                    {emp.firstName?.charAt(0)}{emp.lastName?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{emp.lastName} {emp.firstName}</h3>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Briefcase className="h-3 w-3" /> {emp.jobTitle || 'Албан тушаал'}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">
                                                    {departmentMap.get(emp.departmentId || '') || 'Хэлтэс'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Visualization */}
                                        <div className="p-5 flex-1 space-y-4">
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Нийт явц</span>
                                                <span className={cn(
                                                    "text-sm font-black",
                                                    isCompleted ? "text-emerald-600" : "text-rose-600"
                                                )}>{overallProgress}%</span>
                                            </div>
                                            <Progress 
                                                value={overallProgress} 
                                                className={cn(
                                                    "h-2 rounded-full",
                                                    isCompleted ? "bg-emerald-100" : "bg-rose-100"
                                                )}
                                            />

                                            {/* 4 Stages Preview */}
                                            <div className="grid grid-cols-4 gap-2">
                                                {STAGE_NAMES.map((stage, i) => {
                                                    const stageProgress = process?.stages?.[i]?.progress || 0;
                                                    const stageCompleted = stageProgress === 100;
                                                    const isActive = !stageCompleted && (i === 0 || (process?.stages?.[i - 1]?.progress === 100));

                                                    return (
                                                        <div key={stage} className="space-y-1.5">
                                                            <div className="flex h-1 gap-0.5 rounded-full overflow-hidden bg-slate-100">
                                                                <div className={cn(
                                                                    "h-full transition-all duration-500",
                                                                    stageCompleted ? "bg-emerald-500 w-full" :
                                                                        isActive ? "bg-rose-500 animate-pulse w-[40%]" : "bg-slate-200 w-0"
                                                                )} />
                                                            </div>
                                                            <span className={cn(
                                                                "text-[9px] font-bold uppercase truncate block",
                                                                stageCompleted ? "text-emerald-600" :
                                                                    isActive ? "text-rose-600" : "text-slate-400"
                                                            )}>
                                                                {stage}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <div className="p-5 flex items-center justify-end lg:pr-8">
                                            <Button asChild variant="ghost" size="sm" className="rounded-full hover:bg-rose-50 group/btn">
                                                <Link href={`/dashboard/offboarding/${emp.id}`}>
                                                    <span className="mr-2 text-xs font-bold text-slate-500 group-hover/btn:text-rose-600">Дэлгэрэнгүй</span>
                                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover/btn:text-rose-400 transition-transform group-hover/btn:translate-x-1" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
