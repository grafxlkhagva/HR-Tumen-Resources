'use client';

import React, { useMemo } from 'react';
import { collectionGroup, query, where, collection } from 'firebase/firestore';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowRight, LogOut, Search, Filter, Calendar } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { Employee } from '@/types';
import type { OffboardingProcess } from '../[id]/offboarding/types';

export default function OffboardingListPage() {
    const { firestore } = useFirebase();
    const [searchQuery, setSearchQuery] = React.useState('');

    const processesQuery = useMemoFirebase(() =>
        firestore ? query(collectionGroup(firestore, 'offboarding_processes'), where('status', '==', 'IN_PROGRESS')) : null
        , [firestore]);

    const employeesQuery = useMemoFirebase(() =>
        firestore ? collection(firestore, 'employees') : null
        , [firestore]);

    const { data: processes, isLoading: isLoadingProcesses, error: processesError } = useCollection<any>(processesQuery);
    const { data: employees, isLoading: isLoadingEmployees, error: employeesError } = useCollection<Employee>(employeesQuery);

    React.useEffect(() => {
        if (processesError) {
            console.error("Offboarding processes fetch error:", processesError);
        }
        if (employeesError) {
            console.error("Employees fetch error:", employeesError);
        }
    }, [processesError, employeesError]);

    const ongoingProcesses = useMemo(() => {
        if (!processes || !employees) return [];
        const empMap = new Map(employees.map(e => [e.id, e]));

        return processes
            .map(p => ({
                ...p,
                employee: empMap.get(p.employeeId)
            }))
            .filter(p => p.employee)
            .filter(p => {
                const fullName = `${p.employee.lastName} ${p.employee.firstName}`.toLowerCase();
                return fullName.includes(searchQuery.toLowerCase()) || p.employee.employeeCode?.toLowerCase().includes(searchQuery.toLowerCase());
            })
            .sort((a, b) => {
                const dateA = a.startedAt ? new Date(a.startedAt).getTime() : 0;
                const dateB = b.startedAt ? new Date(b.startedAt).getTime() : 0;
                return dateB - dateA;
            });
    }, [processes, employees, searchQuery]);

    if (isLoadingProcesses || isLoadingEmployees) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                    <p className="text-sm text-slate-500 animate-pulse">Мэдээлэл ачаалж байна...</p>
                </div>
            </div>
        );
    }

    if (processesError || employeesError) {
        return (
            <div className="p-6">
                <Card className="border-rose-200 bg-rose-50/50 shadow-none">
                    <CardContent className="py-12 text-center">
                        <div className="bg-rose-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <LogOut className="h-8 w-8 text-rose-600" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">Мэдээлэл авахад алдаа гарлаа</h2>
                        <p className="text-rose-600 max-w-md mx-auto mb-6">
                            {(processesError || employeesError)?.message}
                        </p>
                        <div className="flex justify-center gap-3">
                            <Button onClick={() => window.location.reload()} variant="outline">Дахин оролдох</Button>
                            <Button asChild><Link href="/dashboard">Дашборд руу буцах</Link></Button>
                        </div>
                        <p className="mt-6 text-[10px] text-slate-400">
                            Хэрэв индекс шаардлагатай бол Browser-ийн Console (F12) хэсгээс холбоосыг харна уу.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            <PageHeader
                title="Ажлаас чөлөөлөх процесс"
                description="Одоогоор идэвхтэй явагдаж буй ажлаас чөлөөлөх процессууд"
                showBackButton={true}
                breadcrumbs={[
                    { label: 'Дашборд', href: '/dashboard' },
                    { label: 'Чөлөөлөлт', href: '/dashboard/employees/offboarding' }
                ]}
            />

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card p-4 rounded-xl border shadow-sm">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Ажилтны нэр, кодоор хайх..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <Button variant="outline" size="sm" className="gap-2">
                        <Filter className="h-4 w-4" /> Шүүлтүүр
                    </Button>
                    <Badge variant="secondary" className="px-3 py-1">
                        Нийт: {ongoingProcesses.length}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ongoingProcesses.length === 0 ? (
                    <Card className="col-span-full py-12 border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center text-muted-foreground space-y-4">
                            <LogOut className="h-12 w-12 opacity-20" />
                            <div className="text-center">
                                <p className="font-medium">Идэвхтэй процесс алга</p>
                                <p className="text-sm">Одоогоор ажлаас чөлөөлөгдөж буй ажилтан байхгүй байна.</p>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    ongoingProcesses.map((process) => (
                        <Link key={process.id} href={`/dashboard/employees/${process.employeeId}/offboarding`}>
                            <Card className="hover:shadow-lg transition-all border-l-4 border-l-rose-500 group overflow-hidden h-full">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                                                <AvatarImage src={process.employee.photoURL} />
                                                <AvatarFallback className="bg-rose-50 text-rose-600 font-bold">
                                                    {process.employee.firstName.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <CardTitle className="text-base truncate max-w-[150px]">
                                                    {process.employee.lastName} {process.employee.firstName}
                                                </CardTitle>
                                                <CardDescription className="text-xs font-mono">
                                                    {process.employee.employeeCode}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-none px-2 py-0 text-[10px]">
                                            {process.currentStep}/9 шат
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-muted-foreground">Явц</span>
                                            <span className="text-rose-600 font-bold">{Math.round((process.currentStep / 9) * 100)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-rose-500 transition-all duration-500"
                                                style={{ width: `${(process.currentStep / 9) * 100}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Эхэлсэн</p>
                                            <div className="flex items-center gap-1 text-xs font-medium">
                                                <Calendar className="h-3 w-3 text-slate-400" />
                                                {process.startedAt ? format(new Date(process.startedAt), 'yyyy.MM.dd') : '-'}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Сүүлийн өдөр</p>
                                            <div className="flex items-center gap-1 text-xs font-medium">
                                                <Calendar className="h-3 w-3 text-rose-400" />
                                                {process.notice?.lastWorkingDate ? format(new Date(process.notice.lastWorkingDate), 'yyyy.MM.dd') : '-'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-2 flex justify-end">
                                        <Button variant="ghost" size="sm" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-2 group-hover:pr-4 transition-all">
                                            Үргэлжлүүлэх <ArrowRight className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
