'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, Loader2, LogOut, CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import { useFirebase, useDoc, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '../data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface TaskInstance {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    completedAt?: any;
    dueDate?: string;
    assigneeId?: string;
    policyId?: string;
}

interface StageInstance {
    id: string;
    title: string;
    icon?: string;
    completed: boolean;
    progress: number;
    completedAt?: string | null;
    tasks: TaskInstance[];
}

interface OffboardingProcess {
    id: string;
    employeeId: string;
    positionId?: string;
    positionTitle?: string;
    stages: StageInstance[];
    progress: number;
    status: 'IN_PROGRESS' | 'COMPLETED';
    reason?: string;
    lastWorkingDate?: string;
    createdAt: string;
    updatedAt: any;
}

const REASON_LABELS: Record<string, string> = {
    'release_company': 'Компанийн санаачилгаар',
    'release_employee': 'Ажилтны санаачилгаар',
    'release_temporary': 'Түр чөлөөлөлт'
};

export function OffboardingTabContent({ employeeId, employee }: { employeeId: string; employee: Employee }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const processRef = useMemoFirebase(() => (firestore && employeeId ? doc(firestore, 'offboarding_processes', employeeId) : null), [firestore, employeeId]);
    const { data: process, isLoading: isLoadingProcess } = useDoc<OffboardingProcess>(processRef as any);

    const [localStages, setLocalStages] = useState<StageInstance[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (process && process.stages) {
            setLocalStages(process.stages);
        }
    }, [process]);

    const toggleTask = (stageId: string, taskId: string) => {
        const newStages = localStages.map(s => {
            if (s.id === stageId) {
                const newTasks = s.tasks.map(t =>
                    t.id === taskId ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : null } : t
                );
                const completedTasks = newTasks.filter(t => t.completed).length;
                const progress = newTasks.length > 0 ? Math.round((completedTasks / newTasks.length) * 100) : 100;
                const completed = progress === 100;
                return {
                    ...s,
                    tasks: newTasks,
                    progress,
                    completed,
                    completedAt: completed ? (s.completedAt || new Date().toISOString()) : null
                };
            }
            return s;
        });

        const totalProgress = Math.round(newStages.reduce((sum, s) => sum + s.progress, 0) / (newStages.length || 1));

        setLocalStages(newStages);
        saveProgress(newStages, totalProgress);
    };

    const saveProgress = async (stages: StageInstance[], totalProgress: number) => {
        if (!firestore) return;
        setIsSaving(true);
        try {
            await setDoc(doc(firestore, 'offboarding_processes', employeeId), {
                stages,
                progress: totalProgress,
                status: totalProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
                updatedAt: new Date().toISOString()
            }, { merge: true });

            // When offboarding is 100% complete, move to Alumni
            if (totalProgress === 100 && firestore) {
                updateDocumentNonBlocking(doc(firestore, 'employees', employeeId), {
                    lifecycleStage: 'alumni',
                    status: 'Ажлаас гарсан'
                });
                toast({ 
                    title: 'Offboarding дууслаа', 
                    description: 'Ажилтан Alumni төлөвт шилжлээ.' 
                });
            }
        } catch (error) {
            toast({ title: 'Хадгалахад алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoadingProcess) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (!process && !isLoadingProcess) {
        return (
            <Card className="border-none shadow-sm bg-white rounded-2xl overflow-hidden">
                <CardContent className="p-12 text-center space-y-6">
                    <div className="h-20 w-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <LogOut className="h-10 w-10" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Offboarding процесс байхгүй</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto">
                            Энэ ажилтны хувьд offboarding процесс одоогоор эхлээгүй байна. 
                            Ажилтныг чөлөөлөх үед автоматаар үүснэ.
                        </p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const overallProgress = Math.round(localStages.reduce((sum, s) => sum + s.progress, 0) / (localStages.length || 1));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Info Card */}
            {process?.reason && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-900">
                            Чөлөөлөлтийн шалтгаан: <strong>{REASON_LABELS[process.reason] || process.reason}</strong>
                        </p>
                        {process.lastWorkingDate && (
                            <p className="text-xs text-amber-700 mt-0.5">
                                Сүүлийн ажлын өдөр: {new Date(process.lastWorkingDate).toLocaleDateString()}
                            </p>
                        )}
                    </div>
                    <Button variant="outline" size="sm" className="shrink-0 border-amber-200 text-amber-700 hover:bg-amber-100" asChild>
                        <Link href={`/dashboard/offboarding/${employeeId}`}>
                            Дэлгэрэнгүй
                            <ChevronRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                    </Button>
                </div>
            )}

            <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden">
                <CardHeader className="p-6 border-b border-slate-50">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-800">Offboarding явц</CardTitle>
                            <CardDescription className="text-slate-400 text-sm">Ажлаас гарах үйл явцын алхамууд</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-amber-500" />}
                            <div className="text-right">
                                <p className="text-2xl font-black text-amber-600 leading-none">{overallProgress}%</p>
                                <p className="text-[10px] font-bold text-slate-300 uppercase mt-1">Нийт явц</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4">
                        <Progress value={overallProgress} className="h-2 bg-slate-100 [&>div]:bg-amber-500" />
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="grid grid-cols-1 lg:grid-cols-10 divide-y lg:divide-y-0 lg:divide-x divide-slate-50">
                        {/* Stages Sidebar */}
                        <div className="lg:col-span-3 p-6 space-y-4 bg-slate-50/30">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-2 text-center lg:text-left">Үе шатууд</h4>
                            <div className="space-y-1">
                                {localStages.map((stage, idx) => (
                                    <div
                                        key={stage.id}
                                        className={cn(
                                            "flex items-start gap-3 p-3 rounded-xl transition-all",
                                            stage.completed ? "bg-amber-50 text-amber-700" : "text-slate-600"
                                        )}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {stage.completed ? (
                                                <CheckCircle2 className="h-5 w-5 text-amber-500" />
                                            ) : stage.progress > 0 ? (
                                                <div className="h-5 w-5 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
                                            ) : (
                                                <Circle className="h-5 w-5 text-slate-300" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold leading-tight break-words">{idx + 1}. {stage.title}</p>
                                            <p className="text-[10px] opacity-70 mt-1">{stage.progress}% дууссан</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Tasks Flow */}
                        <div className="lg:col-span-7">
                            <Tabs defaultValue={localStages[0]?.id} className="w-full">
                                <div className="px-6 py-4 border-b border-slate-50 overflow-x-auto scrollbar-hide">
                                    <TabsList className="bg-transparent h-auto gap-2 p-0">
                                        {localStages.map(stage => (
                                            <TabsTrigger
                                                key={stage.id}
                                                value={stage.id}
                                                className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-md border border-slate-100 whitespace-nowrap"
                                            >
                                                {stage.title.length > 20 ? stage.title.substring(0, 20) + '...' : stage.title}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                </div>

                                {localStages.map(stage => (
                                    <TabsContent key={stage.id} value={stage.id} className="p-6 focus-visible:outline-none">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {stage.tasks.map(task => (
                                                <div
                                                    key={task.id}
                                                    onClick={() => toggleTask(stage.id, task.id)}
                                                    className={cn(
                                                        "group flex items-start gap-4 p-5 rounded-2xl border transition-all cursor-pointer",
                                                        task.completed
                                                            ? "bg-amber-50 border-amber-100 shadow-sm shadow-amber-100/20"
                                                            : "bg-white border-slate-100 hover:border-amber-200 hover:shadow-md hover:shadow-amber-100/10"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all text-white",
                                                        task.completed
                                                            ? "bg-amber-500"
                                                            : "border-2 border-slate-100 bg-slate-50 group-hover:border-amber-500 group-hover:bg-white"
                                                    )}>
                                                        {task.completed && <CheckCircle className="h-4 w-4" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className={cn(
                                                            "text-sm font-bold transition-all",
                                                            task.completed ? "text-amber-800 line-through opacity-60" : "text-slate-700"
                                                        )}>
                                                            {task.title}
                                                        </h5>
                                                        {task.description && (
                                                            <p className={cn(
                                                                "text-[11px] mt-1 leading-relaxed",
                                                                task.completed ? "text-amber-600/50" : "text-slate-400"
                                                            )}>
                                                                {task.description}
                                                            </p>
                                                        )}

                                                        {task.completed && task.completedAt && (
                                                            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-100/50 text-[9px] font-bold text-amber-600">
                                                                <Clock className="h-3 w-3" />
                                                                {new Date(task.completedAt).toLocaleDateString()}
                                                            </div>
                                                        )}

                                                        {!task.completed && (task.dueDate || task.policyId) && (
                                                            <div className="flex flex-wrap gap-2 mt-3">
                                                                {task.dueDate && (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 text-[10px] font-bold text-slate-500 border border-slate-100">
                                                                        <Clock className="h-3 w-3" />
                                                                        {new Date(task.dueDate).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                                {task.policyId && (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-50 text-[10px] font-bold text-amber-700 border border-amber-100">
                                                                        <FileText className="h-3 w-3" />
                                                                        Журам
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </TabsContent>
                                ))}
                            </Tabs>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
