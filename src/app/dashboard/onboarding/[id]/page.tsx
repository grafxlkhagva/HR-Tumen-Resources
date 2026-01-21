'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, Loader2, Save, Info, CheckCircle, FileText, Settings, UserCircle2, Video } from 'lucide-react';
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

export default function EmployeeOnboardingPage() {
    const params = useParams();
    const employeeId = (Array.isArray(params?.id) ? params.id[0] : params?.id) as string;
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    const employeeRef = useMemoFirebase(() => (firestore && employeeId ? doc(firestore, 'employees', employeeId) : null), [firestore, employeeId]);
    const { data: employee, isLoading: isLoadingEmp } = useDoc<Employee>(employeeRef as any);

    const processRef = useMemoFirebase(() => (firestore && employeeId ? doc(firestore, 'onboarding_processes', employeeId) : null), [firestore, employeeId]);
    const { data: process, isLoading: isLoadingProcess } = useDoc<OnboardingProcess>(processRef as any);

    const [localStages, setLocalStages] = useState<StageInstance[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [editingTask, setEditingTask] = useState<{ stageId: string, task: TaskInstance } | null>(null);

    const allEmployeesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'employees') : null), [firestore]);
    const { data: allEmployees } = useCollection<Employee>(allEmployeesQuery as any);

    // Fetch policies for mapping
    const policiesQuery = useMemoFirebase(() =>
        (firestore ? query(collection(firestore, 'companyPolicies')) : null),
        [firestore]);
    const { data: policies } = useCollection<any>(policiesQuery);

    useEffect(() => {
        if (process && process.stages) {
            setLocalStages(process.stages);
        } else if (!isLoadingProcess && !process && employee && firestore) {
            // Initialize from config if not exists
            initializeOnboarding();
        }
    }, [process, isLoadingProcess, employee]);

    const initializeOnboarding = async () => {
        if (!firestore || !employee) return;

        try {
            // Get Global Config
            const configSnap = await getDoc(doc(firestore, 'settings', 'onboarding'));
            const config = configSnap.exists() ? configSnap.data() : { stages: [] };

            // Get Position Config if available
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
            }).filter((s: StageInstance) => s.tasks.length > 0); // Only include stages with tasks

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

            // Set lifecycle stage on employee
            if (firestore) {
                updateDocumentNonBlocking(doc(firestore, 'employees', employeeId), {
                    lifecycleStage: 'onboarding'
                });
            }

            setLocalStages(newStages);
        } catch (error) {
            console.error("Initialization error:", error);
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

    const updateTaskMetadata = async (stageId: string, taskId: string, metadata: { dueDate?: string, mentorId?: string }) => {
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

    if (isLoadingEmp || isLoadingProcess || (employee && localStages.length === 0)) {
        return <div className="p-8 text-center animate-pulse text-slate-400">Ачаалж байна...</div>;
    }

    if (!employee) {
        return <div className="p-8 text-center">Ажилтан олдсонгүй.</div>;
    }

    const overallProgress = Math.round(localStages.reduce((sum, s) => sum + s.progress, 0) / (localStages.length || 1));

    return (
        <div className="py-6 px-4 sm:px-6 min-h-screen container mx-auto max-w-7xl space-y-6">
            <PageHeader
                title={`${employee.lastName} ${employee.firstName}`}
                description={`${employee.jobTitle} - Чиглүүлэх процесс`}
                showBackButton
                backHref="/dashboard/onboarding"
                actions={
                    <div className="flex items-center gap-4">
                        {process?.createdAt && (
                            <div className="flex flex-col items-end mr-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Эхэлсэн</span>
                                <span className="text-xs font-bold text-slate-600">{new Date(process.createdAt).toLocaleDateString()}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            {isSaving && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
                            <Badge variant={overallProgress === 100 ? "default" : "secondary"} className={cn(
                                "px-3 py-1 font-bold",
                                overallProgress === 100 ? "bg-emerald-500" : "bg-indigo-50 text-indigo-700"
                            )}>
                                {overallProgress === 100 ? "Дууссан" : `Явц: ${overallProgress}%`}
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
                            {localStages.map((stage, idx) => (
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
                                        <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin shrink-0" />
                                    ) : (
                                        <Circle className="h-5 w-5 text-slate-300 shrink-0" />
                                    )}
                                    <div className="min-w-0">
                                        <p className="text-xs font-bold truncate">{idx + 1}. {stage.title}</p>
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
                            ))}
                        </CardContent>
                    </Card>

                    <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50 text-indigo-700">
                        <div className="flex items-center gap-2 mb-2">
                            <Info className="h-4 w-4" />
                            <span className="text-xs font-bold uppercase tracking-tighter">Зөвлөмж</span>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                            Шинэ ажилтанд үе шат бүрийг амжилттай давж гарахад нь тусалж, шаардлагатай мэдээллээр хангаарай.
                        </p>
                    </div>
                </div>

                {/* Tasks Column */}
                <div className="lg:col-span-3">
                    <Tabs defaultValue={localStages[0]?.id} className="w-full">
                        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6 flex overflow-x-auto h-auto scrollbar-hide">
                            {localStages.map(stage => (
                                <TabsTrigger
                                    key={stage.id}
                                    value={stage.id}
                                    className="px-6 py-2 rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold transition-all shrink-0"
                                >
                                    {stage.title}
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {localStages.map(stage => (
                            <TabsContent key={stage.id} value={stage.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <Card className="border-none shadow-sm bg-white dark:bg-slate-900 rounded-3xl overflow-hidden">
                                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                                        <div>
                                            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100">{stage.title}</h2>
                                            <p className="text-sm text-slate-400">Энэ шатны хийгдэх ажлууд</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-black text-indigo-600 leading-none">{stage.progress}%</p>
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
                                                                : "bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all",
                                                            task.completed
                                                                ? "bg-emerald-500 text-white"
                                                                : "border-2 border-slate-200 group-hover:border-indigo-400"
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
                                                            {(task.dueDate || task.mentorId || task.policyId) && (
                                                                <div className="flex flex-wrap gap-2 mt-2">
                                                                    {task.dueDate && (
                                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-50 text-[10px] font-bold text-slate-500 border border-slate-100">
                                                                            <Clock className="h-3 w-3" />
                                                                            Хугацаа: {new Date(task.dueDate).toLocaleDateString()}
                                                                        </div>
                                                                    )}
                                                                    {task.mentorId && (
                                                                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-indigo-50 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                                                                            <UserCircle2 className="h-3 w-3" />
                                                                            Чиглүүлэгч: {allEmployees?.find(e => e.id === task.mentorId)?.firstName}
                                                                        </div>
                                                                    )}
                                                                    {task.policyId && (
                                                                        <div className="flex flex-wrap gap-2">
                                                                            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700 border border-emerald-100" onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                const policy = policies?.find(p => p.id === task.policyId);
                                                                                if (policy?.documentUrl) window.open(policy.documentUrl, '_blank');
                                                                            }}>
                                                                                <FileText className="h-3 w-3" />
                                                                                {policies?.find(p => p.id === task.policyId)?.title || 'Холбоотой журам'}
                                                                            </div>
                                                                            {policies?.find(p => p.id === task.policyId)?.videoUrl && (
                                                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-700 border border-blue-100" onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    const policy = policies?.find(p => p.id === task.policyId);
                                                                                    if (policy?.videoUrl) window.open(policy.videoUrl, '_blank');
                                                                                }}>
                                                                                    <Video className="h-3 w-3" />
                                                                                    Видео танилцуулга
                                                                                </div>
                                                                            )}
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
                        ))}
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
    onSave: (metadata: { dueDate: string, mentorId: string }) => void;
    employees: Employee[];
}) {
    const [dueDate, setDueDate] = useState<string>('');
    const [mentorId, setMentorId] = useState<string>('');

    useEffect(() => {
        if (task) {
            setDueDate(task.dueDate || '');
            setMentorId(task.mentorId || '');
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
                        <Label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Чиглүүлэх ажилтан (Mentor)</Label>
                        <Select value={mentorId} onValueChange={setMentorId}>
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
                    <Button onClick={() => onSave({ dueDate, mentorId })} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold uppercase tracking-wider text-[10px] shadow-lg shadow-indigo-100">Хадгалах</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
