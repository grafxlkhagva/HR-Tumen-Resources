'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, Clock, Loader2, Info, CheckCircle, FileText, UserCircle2, ExternalLink, FolderKanban } from 'lucide-react';
import { useCollection, useMemoFirebase, updateDocumentNonBlocking, tenantCollection, useTenantWrite, tenantDoc } from '@/firebase';
import { query, where, getDocs, Timestamp, increment, updateDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Employee } from '../data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import Link from 'next/link';
import { Project, Task, TaskStatus, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/project';
import { StartOnboardingWizardDialog } from '@/app/dashboard/onboarding/components/start-onboarding-wizard-dialog';

// Stage order for display
const STAGE_ORDER = ['pre-onboarding', 'orientation', 'integration', 'productivity'];
const STAGE_LABELS: Record<string, string> = {
    'pre-onboarding': 'Урьдчилсан бэлтгэл',
    'orientation': 'Дасан зохицох',
    'integration': 'Ажлын үүрэгт уусах',
    'productivity': 'Тогтворжилт',
};

interface ProjectWithTasks extends Project {
    tasks: Task[];
    taskStats: { total: number; completed: number };
    progress: number;
}

export function OnboardingTabContent({ employeeId, employee }: { employeeId: string; employee: Employee }) {
    const { firestore, tDoc, tCollection } = useTenantWrite();
    const { toast } = useToast();
    const [showWizard, setShowWizard] = useState(false);

    // Fetch onboarding projects for this employee
    const projectsQuery = useMemoFirebase(({ firestore, companyPath }) =>
        firestore && employeeId
            ? query(
                tenantCollection(firestore, companyPath, 'projects'),
                where('type', '==', 'onboarding'),
                where('onboardingEmployeeId', '==', employeeId)
            )
            : null
        , [employeeId]);
    const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery as any);

    const [projectsWithTasks, setProjectsWithTasks] = useState<ProjectWithTasks[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [isTogglingTask, setIsTogglingTask] = useState<string | null>(null);

    // Fetch tasks for all projects
    useEffect(() => {
        let cancelled = false;

        async function fetchTasks() {
            if (!firestore || !projects || projects.length === 0) {
                if (!cancelled) setProjectsWithTasks([]);
                return;
            }

            if (!cancelled) setIsLoadingTasks(true);
            try {
                const withTasks: ProjectWithTasks[] = [];

                for (const project of projects) {
                    if (cancelled) return;
                    const tasksSnap = await getDocs(tCollection('projects', project.id, 'tasks'));
                    const tasks = tasksSnap.docs.map(d => ({ ...d.data(), id: d.id } as Task));
                    const completed = tasks.filter(t => t.status === 'DONE').length;
                    const total = tasks.length;

                    withTasks.push({
                        ...project,
                        tasks,
                        taskStats: { total, completed },
                        progress: total > 0 ? Math.round((completed / total) * 100) : 0,
                    });
                }

                // Sort by stageOrder
                withTasks.sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
                if (!cancelled) setProjectsWithTasks(withTasks);
            } catch (e) {
                console.error('Failed to fetch tasks:', e);
            } finally {
                if (!cancelled) setIsLoadingTasks(false);
            }
        }

        fetchTasks();
        return () => { cancelled = true; };
    }, [firestore, projects]);

    // Calculate overall progress
    const overallProgress = useMemo(() => {
        if (projectsWithTasks.length === 0) return 0;
        const totalTasks = projectsWithTasks.reduce((sum, p) => sum + p.taskStats.total, 0);
        const completedTasks = projectsWithTasks.reduce((sum, p) => sum + p.taskStats.completed, 0);
        return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    }, [projectsWithTasks]);

    const totalTaskStats = useMemo(() => {
        return {
            total: projectsWithTasks.reduce((sum, p) => sum + p.taskStats.total, 0),
            completed: projectsWithTasks.reduce((sum, p) => sum + p.taskStats.completed, 0),
        };
    }, [projectsWithTasks]);

    // Toggle task status
    const toggleTask = async (projectId: string, task: Task) => {
        if (!firestore || isTogglingTask) return;

        setIsTogglingTask(task.id);
        try {
            const newStatus: TaskStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
            const isDone = newStatus === 'DONE';
            const taskRef = tDoc('projects', projectId, 'tasks', task.id);

            await updateDoc(taskRef, {
                status: newStatus,
                completedAt: isDone ? Timestamp.now() : null,
                updatedAt: Timestamp.now(),
            });

            // Denormalized count: project-ийн completedTaskCount атомикаар шинэчилнэ
            const projectRef = tDoc('projects', projectId);
            await updateDoc(projectRef, {
                completedTaskCount: increment(isDone ? 1 : -1),
            });

            // Update local state
            setProjectsWithTasks(prev => prev.map(p => {
                if (p.id !== projectId) return p;
                const newTasks = p.tasks.map(t =>
                    t.id === task.id ? { ...t, status: newStatus, completedAt: newStatus === 'DONE' ? Timestamp.now() : undefined } : t
                );
                const completed = newTasks.filter(t => t.status === 'DONE').length;
                const total = newTasks.length;
                return {
                    ...p,
                    tasks: newTasks,
                    taskStats: { total, completed },
                    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
                };
            }));

            const allProjectsProgress = projectsWithTasks.map(p => {
                if (p.id === projectId) {
                    const newCompleted = task.status === 'DONE'
                        ? p.taskStats.completed - 1
                        : p.taskStats.completed + 1;
                    return newCompleted === p.taskStats.total ? 100 : 0;
                }
                return p.progress === 100 ? 100 : 0;
            });

            if (allProjectsProgress.every(p => p === 100)) {
                toast({ title: 'Onboarding дууслаа!', description: 'Бүх даалгавар гүйцэтгэгдлээ.' });
            }
        } catch (e) {
            console.error('Failed to toggle task:', e);
            toast({ title: 'Алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsTogglingTask(null);
        }
    };

    if (isLoadingProjects || isLoadingTasks) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
        );
    }

    if (!projects || projects.length === 0) {
        const employeeAsType = {
            ...employee,
            id: employeeId,
        } as any;

        return (
            <>
                <Card className="rounded-lg border bg-card">
                    <CardContent className="py-8 flex flex-col items-center gap-2 text-center">
                        <p className="text-caption-medium text-foreground">Onboarding эхлээгүй байна</p>
                        <p className="text-micro text-muted-foreground max-w-sm">
                            {employee.firstName} {employee.lastName} ажилтны onboarding хөтөлбөр эхлээгүй байна.
                        </p>
                        <Button size="sm" variant="outline" onClick={() => setShowWizard(true)} className="h-8 text-caption mt-1">
                            Onboarding эхлүүлэх
                        </Button>
                    </CardContent>
                </Card>
                <StartOnboardingWizardDialog
                    open={showWizard}
                    onOpenChange={setShowWizard}
                    preselectedEmployee={employeeAsType}
                />
            </>
        );
    }

    return (
        <div className="space-y-4">
            {/* Progress Overview */}
            <Card className="rounded-lg border bg-card">
                <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-caption-medium text-foreground">Onboarding явц</h3>
                                <span className="text-micro text-muted-foreground">{totalTaskStats.completed}/{totalTaskStats.total} таск</span>
                            </div>
                            <p className="text-micro text-muted-foreground">{projectsWithTasks.length} төсөл</p>
                        </div>
                        <p className="text-xl font-semibold text-primary leading-none">{overallProgress}%</p>
                    </div>
                    <Progress value={overallProgress} className="h-1.5 bg-muted" />
                </CardContent>
            </Card>

            {/* Stage list */}
            <Card className="rounded-lg border bg-card">
                <CardContent className="p-4 space-y-1">
                    {projectsWithTasks.map((project, idx) => (
                        <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="flex items-center gap-3 px-2 py-2 -mx-2 rounded-md hover:bg-muted/40 transition-colors"
                        >
                            {project.progress === 100 ? (
                                <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                            ) : project.status === 'ACTIVE' ? (
                                <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                            ) : (
                                <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-caption-medium text-foreground truncate">
                                    {idx + 1}. {STAGE_LABELS[project.onboardingStageId || ''] || project.name}
                                </p>
                                <p className="text-micro text-muted-foreground">
                                    {project.taskStats.completed}/{project.taskStats.total} таск · {project.progress}%
                                </p>
                            </div>
                            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                        </Link>
                    ))}
                </CardContent>
            </Card>

            {/* Tasks per stage */}
            <Card className="rounded-lg border bg-card">
                <Tabs defaultValue={projectsWithTasks[0]?.id} className="w-full">
                    <div className="px-4 pt-3 border-b border-border overflow-x-auto scrollbar-hide">
                        <VerticalTabMenu
                            orientation="horizontal"
                            className="flex-nowrap gap-2"
                            triggerClassName="text-caption"
                            items={projectsWithTasks.map((project) => ({
                                value: project.id,
                                label: STAGE_LABELS[project.onboardingStageId || ''] || project.name.split(' - ').pop(),
                            }))}
                        />
                    </div>

                    {projectsWithTasks.map(project => (
                        <TabsContent key={project.id} value={project.id} className="p-4 focus-visible:outline-none">
                            <div className="mb-3 flex items-start justify-between gap-3">
                                <div>
                                    <h4 className="text-caption-medium text-foreground">{project.name}</h4>
                                    {project.goal && <p className="text-micro text-muted-foreground mt-0.5">{project.goal}</p>}
                                    {project.endDate && <p className="text-micro text-muted-foreground mt-0.5">Дуусах: {project.endDate}</p>}
                                </div>
                                <Badge variant="outline" className={cn("shrink-0 text-micro h-5", PROJECT_STATUS_COLORS[project.status])}>
                                    {PROJECT_STATUS_LABELS[project.status]}
                                </Badge>
                            </div>

                            <div className="space-y-1">
                                {project.tasks.map(task => {
                                    const isCompleted = task.status === 'DONE';
                                    const isToggling = isTogglingTask === task.id;
                                    return (
                                        <div
                                            key={task.id}
                                            onClick={() => !isToggling && toggleTask(project.id, task)}
                                            className={cn(
                                                "group flex items-center gap-3 px-2 py-2 -mx-2 rounded-md cursor-pointer transition-colors",
                                                isCompleted ? "opacity-60 hover:bg-muted/30" : "hover:bg-muted/40"
                                            )}
                                        >
                                            <div className={cn(
                                                "h-4 w-4 rounded-full flex items-center justify-center shrink-0 transition-all",
                                                isCompleted
                                                    ? "bg-success text-primary-foreground"
                                                    : "border border-muted-foreground/30 group-hover:border-primary"
                                            )}>
                                                {isToggling ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : isCompleted ? <CheckCircle className="h-3 w-3" /> : null}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={cn("text-caption text-foreground", isCompleted && "line-through")}>
                                                    {task.title}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {!isCompleted && task.dueDate && (
                                                    <span className="text-micro text-muted-foreground">{task.dueDate}</span>
                                                )}
                                                {!isCompleted && task.policyId && (
                                                    <span className="text-micro text-primary">Журам</span>
                                                )}
                                                {isCompleted && task.completedAt && (
                                                    <span className="text-micro text-success">
                                                        {task.completedAt.toDate?.().toLocaleDateString?.() || 'Дууссан'}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </Card>
        </div>
    );
}
