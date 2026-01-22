'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, Loader2, Info, CheckCircle, FileText, UserCircle2, Video, Settings } from 'lucide-react';
import { useFirebase, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, getDoc, setDoc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '../data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface TaskInstance {
    id: string;
    title: string;
    description?: string;
    completed: boolean;
    completedAt?: any;
    dueDate?: string;
    mentorId?: string;
    policyId?: string;
}

interface StageInstance {
    id: string;
    title: string;
    completed: boolean;
    progress: number;
    completedAt?: string | null;
    tasks: TaskInstance[];
}

interface OnboardingProcess {
    id: string;
    employeeId: string;
    stages: StageInstance[];
    progress: number;
    status: 'IN_PROGRESS' | 'COMPLETED';
    createdAt: string;
    updatedAt: any;
}

export function OnboardingTabContent({ employeeId, employee }: { employeeId: string; employee: Employee }) {
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const processRef = useMemoFirebase(() => (firestore && employeeId ? doc(firestore, 'onboarding_processes', employeeId) : null), [firestore, employeeId]);
    const { data: process, isLoading: isLoadingProcess } = useDoc<OnboardingProcess>(processRef as any);

    const [localStages, setLocalStages] = useState<StageInstance[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    const allEmployeesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
    const { data: allEmployees } = useCollection<Employee>(allEmployeesQuery as any);

    const policiesQuery = useMemoFirebase(() =>
        (firestore ? collection(firestore, 'companyPolicies') : null),
        [firestore]);
    const { data: policies } = useCollection<any>(policiesQuery as any);

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
            await setDoc(doc(firestore, 'onboarding_processes', employeeId), {
                stages,
                progress: totalProgress,
                status: totalProgress === 100 ? 'COMPLETED' : 'IN_PROGRESS',
                updatedAt: new Date().toISOString()
            }, { merge: true });

            if (totalProgress === 100 && firestore) {
                updateDocumentNonBlocking(doc(firestore, 'employees', employeeId), {
                    lifecycleStage: 'development',
                    status: 'Идэвхтэй'
                });
            }
        } catch (error) {
            toast({ title: 'Хадгалахад алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    const initializeOnboarding = async () => {
        if (!firestore || !employee) return;

        try {
            const configSnap = await getDoc(doc(firestore, 'settings', 'onboarding'));
            const config = configSnap.exists() ? configSnap.data() : { stages: [] };

            let allowedTaskIds: string[] | null = null;
            if (employee.positionId) {
                const posSnap = await getDoc(doc(firestore, 'positions', employee.positionId));
                if (posSnap.exists()) {
                    const posData = posSnap.data();
                    if (posData.onboardingProgramIds && posData.onboardingProgramIds.length > 0) {
                        allowedTaskIds = posData.onboardingProgramIds;
                    }
                }
            }

            const newStages: StageInstance[] = (config.stages || []).map((s: any) => {
                const stageTasks = (s.tasks || []).filter((t: any) =>
                    allowedTaskIds ? allowedTaskIds.includes(t.id) : true
                );

                return {
                    id: s.id,
                    title: s.title,
                    completed: false,
                    progress: 0,
                    tasks: stageTasks.map((t: any) => ({
                        id: t.id,
                        title: t.title,
                        description: t.description,
                        completed: false,
                        policyId: t.policyId
                    }))
                };
            }).filter((s: StageInstance) => s.tasks.length > 0);

            const newProcess: OnboardingProcess = {
                id: employeeId,
                employeeId,
                stages: newStages,
                progress: 0,
                status: 'IN_PROGRESS',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(firestore, 'onboarding_processes', employeeId), newProcess);

            updateDocumentNonBlocking(doc(firestore, 'employees', employeeId), {
                lifecycleStage: 'onboarding'
            });

            setLocalStages(newStages);
        } catch (error) {
            console.error("Initialization error:", error);
            toast({ title: 'Процесс эхлүүлэхэд алдаа гарлаа', variant: 'destructive' });
        }
    };

    if (isLoadingProcess) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!process && !isLoadingProcess) {
        return (
            <Card className="border-none shadow-sm bg-white rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-12 text-center space-y-6">
                    <div className="h-20 w-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-500">
                        <UserCircle2 className="h-10 w-10" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">Чиглүүлэх процесс эхлээгүй байна</h3>
                        <p className="text-slate-500 text-sm max-w-sm mx-auto">
                            Энэ ажилтны хувьд чиглүүлэх (onboarding) процесс одоогоор үүсээгүй байна. Та доорх товчийг дарж эхлүүлнэ үү.
                        </p>
                    </div>
                    <Button onClick={initializeOnboarding} className="bg-indigo-600 hover:bg-indigo-700 h-12 px-8 rounded-2xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-indigo-100">
                        Процесс эхлүүлэх
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const overallProgress = Math.round(localStages.reduce((sum, s) => sum + s.progress, 0) / (localStages.length || 1));

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-none shadow-md bg-white rounded-[2.5rem] overflow-hidden">
                <CardHeader className="p-8 border-b border-slate-50">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-black text-slate-800">Чиглүүлэх явц</CardTitle>
                            <CardDescription className="text-slate-400">Шинэ ажилтны дасан зохицох үйл явц</CardDescription>
                        </div>
                        <div className="flex items-center gap-4">
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />}
                            <div className="text-right">
                                <p className="text-2xl font-black text-indigo-600 leading-none">{overallProgress}%</p>
                                <p className="text-[10px] font-bold text-slate-300 uppercase mt-1">Нийт явц</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-6">
                        <Progress value={overallProgress} className="h-2 bg-slate-100" />
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
                                            "flex items-start gap-3 p-3 rounded-2xl transition-all",
                                            stage.completed ? "bg-emerald-50 text-emerald-700" : "text-slate-600"
                                        )}
                                    >
                                        <div className="mt-0.5 shrink-0">
                                            {stage.completed ? (
                                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                            ) : stage.progress > 0 ? (
                                                <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
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
                                                className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all data-[state=active]:bg-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md border border-slate-100 whitespace-nowrap"
                                            >
                                                {stage.title}
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
                                                        "group flex items-start gap-4 p-5 rounded-3xl border transition-all cursor-pointer",
                                                        task.completed
                                                            ? "bg-emerald-50 border-emerald-100 shadow-sm shadow-emerald-100/20"
                                                            : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-md hover:shadow-indigo-100/10"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all text-white",
                                                        task.completed
                                                            ? "bg-emerald-500"
                                                            : "border-2 border-slate-100 bg-slate-50 group-hover:border-indigo-500 group-hover:bg-white"
                                                    )}>
                                                        {task.completed && <CheckCircle className="h-4 w-4" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h5 className={cn(
                                                            "text-sm font-bold transition-all",
                                                            task.completed ? "text-emerald-800 line-through opacity-60" : "text-slate-700"
                                                        )}>
                                                            {task.title}
                                                        </h5>
                                                        {task.description && (
                                                            <p className={cn(
                                                                "text-[11px] mt-1 leading-relaxed",
                                                                task.completed ? "text-emerald-600/50" : "text-slate-400"
                                                            )}>
                                                                {task.description}
                                                            </p>
                                                        )}

                                                        {task.completed && task.completedAt && (
                                                            <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-emerald-100/50 text-[9px] font-bold text-emerald-600">
                                                                <Clock className="h-3 w-3" />
                                                                {new Date(task.completedAt).toLocaleDateString()}
                                                            </div>
                                                        )}

                                                        {!task.completed && (task.dueDate || task.mentorId || task.policyId) && (
                                                            <div className="flex flex-wrap gap-2 mt-3">
                                                                {task.dueDate && (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-50 text-[10px] font-bold text-slate-500 border border-slate-100">
                                                                        <Clock className="h-3 w-3" />
                                                                        {new Date(task.dueDate).toLocaleDateString()}
                                                                    </div>
                                                                )}
                                                                {task.policyId && (
                                                                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-indigo-50 text-[10px] font-bold text-indigo-700 border border-indigo-100">
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
