'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, Loader2, Info, CheckCircle, FileText, Settings, UserCircle2, Video, RefreshCw, LogOut, ClipboardList, Calculator, MessageSquare, AlertTriangle } from 'lucide-react';
import { useFirebase, useDoc, useMemoFirebase, updateDocumentNonBlocking, useCollection } from '@/firebase';
import { doc, getDoc, setDoc, collection, query } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '@/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

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
    stages: StageInstance[];
    progress: number;
    status: 'IN_PROGRESS' | 'COMPLETED';
    reason?: string;
    lastWorkingDate?: string;
    createdAt: string;
    updatedAt: any;
}

const STAGE_ICONS: Record<string, React.ElementType> = {
    'LogOut': LogOut,
    'ClipboardList': ClipboardList,
    'Calculator': Calculator,
    'MessageSquare': MessageSquare,
};

export default function EmployeeOffboardingPage() {
    const params = useParams();
    const employeeId = (Array.isArray(params?.id) ? params.id[0] : params?.id) as string;
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const employeeRef = useMemoFirebase(() => (firestore && employeeId ? doc(firestore, 'employees', employeeId) : null), [firestore, employeeId]);
    const { data: employee, isLoading: isLoadingEmp } = useDoc<Employee>(employeeRef as any);

    const processRef = useMemoFirebase(() => (firestore && employeeId ? doc(firestore, 'offboarding_processes', employeeId) : null), [firestore, employeeId]);
    const { data: process, isLoading: isLoadingProcess } = useDoc<OffboardingProcess>(processRef as any);

    const [localStages, setLocalStages] = useState<StageInstance[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTask, setEditingTask] = useState<{ stageId: string, task: TaskInstance } | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    const allEmployeesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
    const { data: allEmployees } = useCollection<Employee>(allEmployeesQuery as any);

    // Fetch policies for mapping
    const policiesQuery = useMemoFirebase(() =>
        (firestore ? query(collection(firestore, 'companyPolicies')) : null),
        [firestore]);
    const { data: policies } = useCollection<any>(policiesQuery);

    const initializeOffboarding = React.useCallback(async () => {
        // Validate all required values before proceeding
        if (!firestore) {
            console.warn("initializeOffboarding: firestore not available");
            return;
        }
        if (!employee) {
            console.warn("initializeOffboarding: employee not available");
            return;
        }
        if (!employeeId || typeof employeeId !== 'string') {
            console.warn("initializeOffboarding: invalid employeeId", employeeId);
            return;
        }

        try {
            // Get Global Config
            const configSnap = await getDoc(doc(firestore, 'settings', 'offboarding'));
            const config = configSnap.exists() ? configSnap.data() : { stages: [] };

            const newStages: StageInstance[] = (config.stages || []).map((s: any) => ({
                id: s.id || `stage_${Date.now()}`,
                title: s.title || 'Untitled Stage',
                icon: s.icon || null,
                completed: false,
                progress: 0,
                tasks: (s.tasks || []).map((t: any) => ({
                    id: t.id || `task_${Date.now()}`,
                    title: t.title || 'Untitled Task',
                    description: t.description || '',
                    completed: false,
                    policyId: t.policyId || null
                }))
            })).filter((s: StageInstance) => s.tasks.length > 0);

            const newProcess: OffboardingProcess = {
                id: employeeId,
                employeeId: employeeId,
                stages: newStages,
                progress: 0,
                status: 'IN_PROGRESS',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await setDoc(doc(firestore, 'offboarding_processes', employeeId), newProcess);

            // Set lifecycle stage on employee
            try {
                updateDocumentNonBlocking(doc(firestore, 'employees', employeeId), {
                    lifecycleStage: 'offboarding'
                });
            } catch (empUpdateError) {
                console.warn("Failed to update employee lifecycle:", empUpdateError);
            }

            setLocalStages(newStages);
            setIsInitialized(true);
        } catch (error: any) {
            console.error("Initialization error:", error?.message || error);
            setIsInitialized(true);
        }
    }, [firestore, employee, employeeId]);

    useEffect(() => {
        // If process exists and has stages, use it
        if (process && process.stages && process.stages.length > 0) {
            setLocalStages(process.stages);
            if (!isInitialized) {
                setIsInitialized(true);
            }
            return;
        }
        
        // If still loading, wait
        if (isLoadingProcess) {
            return;
        }
        
        // If no process and we have all required data, initialize
        if (!process && employee && firestore && employeeId && !isInitialized) {
            initializeOffboarding();
            return;
        }
        
        // No process and not loading - mark as initialized to stop infinite loading
        if (!process && !isInitialized) {
            setIsInitialized(true);
        }
    }, [process, isLoadingProcess, employee, firestore, employeeId, isInitialized, initializeOffboarding]);

    const syncWithConfig = async () => {
        if (!firestore || !employee || !process) return;
        setIsSaving(true);
        try {
            const configSnap = await getDoc(doc(firestore, 'settings', 'offboarding'));
            const config = configSnap.exists() ? configSnap.data() : { stages: [] };

            const updatedStages = (config.stages || []).map((globalStage: any) => {
                const currentStage = localStages.find(s => s.id === globalStage.id);

                if (!currentStage) {
                    return {
                        id: globalStage.id,
                        title: globalStage.title,
                        icon: globalStage.icon,
                        completed: false,
                        progress: 0,
                        tasks: (globalStage.tasks || []).map((t: any) => ({
                            id: t.id,
                            title: t.title,
                            description: t.description,
                            completed: false,
                            policyId: t.policyId
                        }))
                    };
                }

                const mergedTasks: TaskInstance[] = (globalStage.tasks || []).map((globalTask: any) => {
                    const existingTask = currentStage.tasks.find(t => t.id === globalTask.id);
                    if (existingTask) {
                        return {
                            ...existingTask,
                            title: globalTask.title,
                            description: globalTask.description,
                            policyId: globalTask.policyId
                        };
                    } else {
                        return {
                            id: globalTask.id,
                            title: globalTask.title,
                            description: globalTask.description,
                            completed: false,
                            policyId: globalTask.policyId
                        };
                    }
                });

                const completedTasks = mergedTasks.filter(t => t.completed).length;
                const progress = mergedTasks.length > 0 ? Math.round((completedTasks / mergedTasks.length) * 100) : 100;

                return {
                    ...currentStage,
                    title: globalStage.title,
                    icon: globalStage.icon,
                    tasks: mergedTasks,
                    progress,
                    completed: progress === 100
                };
            }).filter((s: any) => s.tasks.length > 0);

            const totalProgress = Math.round(updatedStages.reduce((sum: number, s: any) => sum + s.progress, 0) / (updatedStages.length || 1));

            setLocalStages(updatedStages);
            await saveProgress(updatedStages, totalProgress);
            toast({ title: 'Хөтөлбөр шинэчлэгдлээ' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Шинэчлэхэд алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };


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

            // When offboarding is complete, move employee to alumni stage
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

    const updateTaskMetadata = async (stageId: string, taskId: string, metadata: { dueDate?: string, assigneeId?: string }) => {
        const newStages = localStages.map(s => {
            if (s.id === stageId) {
                const newTasks = s.tasks.map(t =>
                    t.id === taskId ? { ...t, ...metadata } : t
                );
                return { ...s, tasks: newTasks };
            }
            return s;
        });

        const totalProgress = Math.round(newStages.reduce((sum, s) => sum + s.progress, 0) / (newStages.length || 1));
        setLocalStages(newStages);
        await saveProgress(newStages, totalProgress);
        setEditingTask(null);
    };

    if (isLoadingEmp || isLoadingProcess) {
        return <div className="p-8 text-center animate-pulse text-slate-400">Ачаалж байна...</div>;
    }

    if (!employee) {
        return <div className="p-8 text-center">Ажилтан олдсонгүй.</div>;
    }

    // Show message if no offboarding program is configured
    if (isInitialized && localStages.length === 0) {
        return (
            <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
                <PageHeader
                    title={`${employee.lastName} ${employee.firstName}`}
                    description={`${employee.jobTitle} - Ажлаас чөлөөлөх процесс`}
                    showBackButton
                    backHref="/dashboard/offboarding"
                />
                <div className="bg-white rounded-xl border p-12 text-center">
                    <div className="h-16 w-16 rounded-full bg-rose-100 flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="h-8 w-8 text-rose-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700 mb-2">Offboarding хөтөлбөр байхгүй</h3>
                    <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                        Ажлаас чөлөөлөх хөтөлбөр тохируулаагүй байна. 
                        Эхлээд тохиргоо хэсэгт хөтөлбөр үүсгэнэ үү.
                    </p>
                    <Button asChild className="bg-rose-600 hover:bg-rose-700">
                        <a href="/dashboard/settings/offboarding">Тохиргоо руу очих</a>
                    </Button>
                </div>
            </div>
        );
    }

    const overallProgress = Math.round(localStages.reduce((sum, s) => sum + s.progress, 0) / (localStages.length || 1));
    const isCompleted = overallProgress === 100;

    return (
        <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
            <PageHeader
                title={`${employee.lastName} ${employee.firstName}`}
                description={`${employee.jobTitle} - Ажлаас чөлөөлөх процесс`}
                showBackButton
                backHref="/dashboard/offboarding"
                actions={
                    <div className="flex items-center gap-4">
                        {process?.createdAt && (
                            <div className="flex flex-col items-end mr-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Эхэлсэн</span>
                                <span className="text-xs font-bold text-slate-600">{new Date(process.createdAt).toLocaleDateString()}</span>
                            </div>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-xl border-slate-200 bg-white text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-rose-600"
                            onClick={syncWithConfig}
                            disabled={isSaving}
                        >
                            <RefreshCw className={cn("h-3 w-3 mr-2", isSaving && "animate-spin")} />
                            Хөтөлбөр шинэчлэх
                        </Button>
                        <div className="flex items-center gap-2">
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}

                            <Badge variant={isCompleted ? "default" : "secondary"} className={cn(
                                "px-3 py-1 font-bold",
                                isCompleted ? "bg-emerald-500" : "bg-rose-50 text-rose-700"
                            )}>
                                {isCompleted ? "Дууссан" : `Явц: ${overallProgress}%`}
                            </Badge>
                        </div>
                    </div>
                }
            />

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Status Column */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-2xl overflow-hidden">
                        <CardHeader className="pb-2 border-b">
                            <CardTitle className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Үе шатууд</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-1">
                            {localStages.map((stage, idx) => {
                                const IconComponent = STAGE_ICONS[stage.icon || 'LogOut'] || LogOut;
                                return (
                                    <div
                                        key={stage.id}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-xl transition-all",
                                            stage.completed ? "bg-emerald-50 text-emerald-700" : "text-slate-600"
                                        )}
                                    >
                                        {stage.completed ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                                        ) : stage.progress > 0 ? (
                                            <div className="h-5 w-5 rounded-full border-2 border-rose-500 border-t-transparent animate-spin shrink-0" />
                                        ) : (
                                            <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold truncate">{idx + 1}. {stage.title.split(',')[0]}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[10px] opacity-70">{stage.progress}%</p>
                                                {stage.completedAt && (
                                                    <p className="text-[9px] font-medium text-emerald-600 bg-emerald-100/50 px-1.5 rounded">
                                                        {new Date(stage.completedAt).toLocaleDateString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>

                    <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100/50 text-rose-700">
                        <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-tighter">Анхаар</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                            Offboarding процесс дуусахад ажилтны төлөв "Ажлаас гарсан" болж, alumni төлөвт шилжинэ.
                        </p>
                    </div>
                </div>

                {/* Tasks Column */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue={localStages[0]?.id} className="w-full">
                        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6 flex overflow-x-auto h-auto scrollbar-hide">
                            {localStages.map((stage, idx) => {
                                const IconComponent = STAGE_ICONS[stage.icon || 'LogOut'] || LogOut;
                                return (
                                    <TabsTrigger
                                        key={stage.id}
                                        value={stage.id}
                                        className="px-4 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold transition-all shrink-0 flex items-center gap-2"
                                    >
                                        <IconComponent className="h-4 w-4" />
                                        <span className="hidden sm:inline">{stage.title.split(',')[0]}</span>
                                        <span className="sm:hidden">{idx + 1}</span>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>

                        {localStages.map(stage => {
                            const IconComponent = STAGE_ICONS[stage.icon || 'LogOut'] || LogOut;
                            return (
                                <TabsContent key={stage.id} value={stage.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <Card className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
                                        <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
                                                    <IconComponent className="h-6 w-6" />
                                                </div>
                                                <div>
                                                    <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{stage.title}</h2>
                                                    <p className="text-sm text-slate-400">Энэ шатны хийгдэх ажлууд</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className={cn(
                                                    "text-2xl font-black leading-none",
                                                    stage.completed ? "text-emerald-600" : "text-rose-600"
                                                )}>{stage.progress}%</p>
                                                <p className="text-[10px] font-bold text-slate-300 uppercase mt-1">Дууссан</p>
                                            </div>
                                        </div>
                                        <CardContent className="p-6">
                                            <div className="space-y-3">
                                                {stage.tasks.length === 0 ? (
                                                    <div className="py-12 text-center text-slate-300 italic">Энэ шатанд таск байхгүй байна.</div>
                                                ) : (
                                                    stage.tasks.map(task => (
                                                        <div
                                                            key={task.id}
                                                            onClick={() => toggleTask(stage.id, task.id)}
                                                            className={cn(
                                                                "group flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer",
                                                                task.completed
                                                                    ? "bg-emerald-50 border-emerald-100"
                                                                    : "bg-white border-slate-100 hover:border-rose-200 hover:shadow-sm"
                                                            )}
                                                        >
                                                            <div className={cn(
                                                                "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all",
                                                                task.completed
                                                                    ? "bg-emerald-500 text-white"
                                                                    : "border-2 border-slate-200 group-hover:border-rose-400"
                                                            )}>
                                                                {task.completed && <CheckCircle className="h-4 w-4" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-center gap-2">
                                                                    <h4 className={cn(
                                                                        "text-sm font-bold transition-all",
                                                                        task.completed ? "text-emerald-800 line-through opacity-70" : "text-slate-700"
                                                                    )}>
                                                                        {task.title}
                                                                    </h4>
                                                                    {task.completed && (
                                                                        <Badge className="bg-emerald-100 text-emerald-600 border-none text-[8px] h-4">
                                                                            <Clock className="h-2.5 w-2.5 mr-1" />
                                                                            {new Date(task.completedAt).toLocaleDateString()}
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                {task.description && (
                                                                    <p className={cn(
                                                                        "text-xs mt-0.5",
                                                                        task.completed ? "text-emerald-600/50" : "text-slate-400"
                                                                    )}>
                                                                        {task.description}
                                                                    </p>
                                                                )}
                                                                {(task.dueDate || task.assigneeId || task.policyId) && (
                                                                    <div className="flex flex-wrap gap-2 mt-2">
                                                                        {task.dueDate && (
                                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 text-[10px] font-bold text-slate-500 border border-slate-100">
                                                                                <Clock className="h-3 w-3" />
                                                                                Хугацаа: {new Date(task.dueDate).toLocaleDateString()}
                                                                            </div>
                                                                        )}
                                                                        {task.assigneeId && (
                                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 text-[10px] font-bold text-rose-700 border border-rose-100">
                                                                                <UserCircle2 className="h-3 w-3" />
                                                                                Хариуцагч: {allEmployees?.find(e => e.id === task.assigneeId)?.firstName}
                                                                            </div>
                                                                        )}
                                                                        {task.policyId && (
                                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-100" onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const policy = policies?.find((p: any) => p.id === task.policyId);
                                                                                if (policy?.documentUrl) window.open(policy.documentUrl, '_blank');
                                                                            }}>
                                                                                <FileText className="h-3 w-3" />
                                                                                {policies?.find((p: any) => p.id === task.policyId)?.title || 'Холбоотой журам'}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-slate-100"
                                                                onClick={(e: React.MouseEvent) => {
                                                                    e.stopPropagation();
                                                                    setEditingTask({ stageId: stage.id, task });
                                                                }}
                                                            >
                                                                <Settings className="h-4 w-4 text-slate-400" />
                                                            </Button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            );
                        })}
                    </Tabs>
                </div>
            </div>

            {/* Task Edit Modal */}
            <TaskMetadataModal
                open={!!editingTask}
                onOpenChange={(open) => !open && setEditingTask(null)}
                task={editingTask?.task || null}
                onSave={(metadata) => editingTask && updateTaskMetadata(editingTask.stageId, editingTask.task.id, metadata)}
                employees={allEmployees || []}
            />
        </div>
    );
}


function TaskMetadataModal({ open, onOpenChange, task, onSave, employees }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    task: TaskInstance | null;
    onSave: (metadata: { dueDate: string, assigneeId: string }) => void;
    employees: Employee[];
}) {
    const [dueDate, setDueDate] = useState<string>('');
    const [assigneeId, setAssigneeId] = useState<string>('');

    useEffect(() => {
        if (task) {
            setDueDate(task.dueDate || '');
            setAssigneeId(task.assigneeId || '');
        }
    }, [task, open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-lg font-black text-slate-800">Таск тохиргоо</DialogTitle>
                    <p className="text-sm text-slate-400">{task?.title}</p>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Дуусгах хугацаа</Label>
                        <Input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="h-11 rounded-xl border-slate-200"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Хариуцах ажилтан</Label>
                        <Select value={assigneeId} onValueChange={setAssigneeId}>
                            <SelectTrigger className="h-11 rounded-xl border-slate-200">
                                <SelectValue placeholder="Ажилтан сонгох..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-slate-100 shadow-xl">
                                {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id} className="rounded-lg">
                                        {emp.lastName} {emp.firstName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter className="gap-2">
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-xl font-bold uppercase tracking-wider text-[10px]">Болих</Button>
                    <Button onClick={() => onSave({ dueDate, assigneeId })} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-rose-100">Хадгалах</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
