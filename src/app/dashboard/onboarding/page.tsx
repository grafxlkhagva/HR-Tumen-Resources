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
    AlertCircle,
    UserCircle2,
    Briefcase
} from 'lucide-react';
import Link from 'next/link';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Employee, Department } from '@/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function OnboardingDashboardPage() {
    const { firestore } = useFirebase();
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch Departments for mapping
    const departmentsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'departments') : null), [firestore]);
    const { data: departments } = useCollection<Department>(departmentsQuery as any);

    // Fetch Employees (Active and Appointing)
    const employeesQuery = useMemoFirebase(() =>
        firestore ? query(collection(firestore, 'employees'), where('status', 'in', ['Идэвхтэй', 'Томилогдож буй'])) : null
        , [firestore]);
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery as any);

    // Fetch Onboarding Processes
    const onboardingQuery = useMemoFirebase(() =>
        firestore ? collection(firestore, 'onboarding_processes') : null
        , [firestore]);
    const { data: onboardingProcesses, isLoading: isLoadingOnboarding } = useCollection<any>(onboardingQuery as any);

    const departmentMap = useMemo(() => {
        const map = new Map<string, string>();
        departments?.forEach(d => map.set(d.id, d.name));
        return map;
    }, [departments]);


    const onboardingDataMap = useMemo(() => {
        const map = new Map<string, any>();
        onboardingProcesses?.forEach(p => map.set(p.id, p));
        return map;
    }, [onboardingProcesses]);

    const filteredEmployees = useMemo(() => {
        if (!employees || !onboardingDataMap) return [];
        return employees.filter(emp => {
            // Only show employees who have an onboarding process
            if (!onboardingDataMap.has(emp.id)) return false;

            const fullName = `${emp.firstName} ${emp.lastName}`.toLowerCase();
            return fullName.includes(searchTerm.toLowerCase()) ||
                (emp.jobTitle?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        });
    }, [employees, searchTerm, onboardingDataMap]);

    if (isLoadingEmployees || isLoadingOnboarding) {
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
                title="Чиглүүлэх (Onboarding)"
                description="Ажилчдын дасан зохицох үйл явцыг хянах"
                actions={
                    <Button asChild variant="outline" className="bg-white hover:bg-slate-50 border-slate-200">
                        <Link href="/dashboard/onboarding/settings">
                            <Settings className="h-4 w-4 mr-2" />
                            Тохиргоо
                        </Link>
                    </Button>
                }
            />

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Ажилтан хайх..."
                        className="pl-10 bg-white border-slate-200 focus:ring-indigo-500"
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
                        Ажилтан олдсонгүй.
                    </Card>
                ) : (
                    filteredEmployees.map(emp => {
                        const process = onboardingDataMap.get(emp.id);
                        const overallProgress = process?.progress || 0;

                        return (
                            <Card key={emp.id} className="group border-none shadow-sm hover:shadow-md transition-all overflow-hidden bg-white dark:bg-slate-900">
                                <CardContent className="p-0">
                                    <div className="flex flex-col lg:flex-row lg:items-center">
                                        {/* Employee Info */}
                                        <div className="p-5 flex items-center gap-4 border-b lg:border-b-0 lg:border-r lg:w-[30%] bg-slate-50/30">
                                            <Avatar className="h-12 w-12 ring-2 ring-white shadow-sm">
                                                <AvatarImage src={emp.photoURL} />
                                                <AvatarFallback className="bg-indigo-100 text-indigo-700 font-bold">
                                                    {emp.firstName.charAt(0)}{emp.lastName.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">{emp.lastName} {emp.firstName}</h3>
                                                <p className="text-xs text-slate-500 flex items-center gap-1">
                                                    <Briefcase className="h-3 w-3" /> {emp.jobTitle}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-medium uppercase mt-1">
                                                    {departmentMap.get(emp.departmentId)}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Progress Visualization */}
                                        <div className="p-5 flex-1 space-y-4">
                                            <div className="flex justify-between items-end mb-1">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Нийт явц</span>
                                                <span className="text-sm font-black text-indigo-600">{overallProgress}%</span>
                                            </div>
                                            <Progress value={overallProgress} className="h-2 bg-slate-100 rounded-full" />

                                            {/* 4 Stages Preview */}
                                            <div className="grid grid-cols-4 gap-2">
                                                {['Бэлтгэл', 'Танилцах', 'Уусах', 'Бүтээмж'].map((stage, i) => {
                                                    const stageProgress = process?.stages?.[i]?.progress || 0;
                                                    const isCompleted = stageProgress === 100;
                                                    const isActive = overallProgress > 0 && !isCompleted && (i === 0 || (process?.stages?.[i - 1]?.progress === 100));

                                                    return (
                                                        <div key={stage} className="space-y-1.5">
                                                            <div className="flex h-1 gap-0.5 rounded-full overflow-hidden bg-slate-100">
                                                                <div className={cn(
                                                                    "h-full transition-all duration-500",
                                                                    isCompleted ? "bg-emerald-500 w-full" :
                                                                        isActive ? "bg-indigo-500 animate-pulse w-[40%]" : "bg-slate-200 w-0"
                                                                )} />
                                                            </div>
                                                            <span className={cn(
                                                                "text-[9px] font-bold uppercase truncate block",
                                                                isCompleted ? "text-emerald-600" :
                                                                    isActive ? "text-indigo-600" : "text-slate-400"
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
                                            <Button asChild variant="ghost" size="sm" className="rounded-full hover:bg-indigo-50 group/btn">
                                                <Link href={`/dashboard/onboarding/${emp.id}`}>
                                                    <span className="mr-2 text-xs font-bold text-slate-500 group-hover/btn:text-indigo-600">Дэлгэрэнгүй</span>
                                                    <ChevronRight className="h-4 w-4 text-slate-300 group-hover/btn:text-indigo-400 transition-transform group-hover/btn:translate-x-1" />
                                                </Link>
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    );
}
