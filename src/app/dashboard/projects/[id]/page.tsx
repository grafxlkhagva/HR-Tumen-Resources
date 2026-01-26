'use client';

import React, { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Plus,
    Calendar,
    Clock,
    CheckCircle2,
    MoreVertical,
    Pencil,
    Trash2,
    AlertCircle,
    Target,
    TrendingUp,
    User,
    Users,
    Timer,
    ListTodo,
    CircleDot,
    Eye,
    ArrowRight,
    FolderKanban,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { mn } from 'date-fns/locale';

import { useCollection, useDoc, useFirebase, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc, query, orderBy, Timestamp } from 'firebase/firestore';
import {
    Project,
    Task,
    TaskStatus,
    PROJECT_STATUS_LABELS,
    PROJECT_STATUS_COLORS,
    TASK_STATUS_LABELS,
    TASK_STATUS_COLORS,
    PRIORITY_LABELS,
    PRIORITY_COLORS,
} from '@/types/project';
import { Employee } from '@/types';
import { useToast } from '@/hooks/use-toast';

import { CreateTaskDialog } from '../components/create-task-dialog';
import { EditProjectDialog } from '../components/edit-project-dialog';
import { EditTaskDialog } from '../components/edit-task-dialog';
import { ProjectChatSection } from '../components/project-chat-section';

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;
    const { firestore } = useFirebase();
    const { toast } = useToast();

    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
    const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatus | 'ALL'>('ALL');
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    // Fetch project
    const projectRef = useMemoFirebase(
        () => firestore && projectId ? doc(firestore, 'projects', projectId) : null,
        [firestore, projectId]
    );
    const { data: project, isLoading: isLoadingProject } = useDoc<Project>(projectRef);

    // Fetch tasks
    const tasksQuery = useMemoFirebase(
        () => firestore && projectId
            ? query(
                collection(firestore, 'projects', projectId, 'tasks'),
                orderBy('createdAt', 'desc')
            )
            : null,
        [firestore, projectId]
    );
    const { data: tasks, isLoading: isLoadingTasks } = useCollection<Task>(tasksQuery);

    // Fetch employees
    const employeesQuery = useMemoFirebase(
        () => firestore ? collection(firestore, 'employees') : null,
        [firestore]
    );
    const { data: employees } = useCollection<Employee>(employeesQuery);

    const employeeMap = useMemo(() => {
        return new Map((employees || []).map(e => [e.id, e]));
    }, [employees]);

    // Get team members with details
    const teamMembers = useMemo(() => {
        if (!project?.teamMemberIds || !employees) return [];
        return project.teamMemberIds
            .map(id => employeeMap.get(id))
            .filter((e): e is Employee => !!e);
    }, [project?.teamMemberIds, employees, employeeMap]);

    // Filter tasks
    const filteredTasks = useMemo(() => {
        if (!tasks) return [];
        if (taskStatusFilter === 'ALL') return tasks;
        return tasks.filter(t => t.status === taskStatusFilter);
    }, [tasks, taskStatusFilter]);

    // Calculate progress
    const progress = useMemo(() => {
        if (!tasks || tasks.length === 0) return { percentage: 0, done: 0, total: 0 };
        const done = tasks.filter(t => t.status === 'DONE').length;
        return {
            percentage: Math.round((done / tasks.length) * 100),
            done,
            total: tasks.length,
        };
    }, [tasks]);

    // Task stats
    const taskStats = useMemo(() => {
        if (!tasks) return { todo: 0, inProgress: 0, done: 0, overdue: 0 };
        const today = new Date();
        return {
            todo: tasks.filter(t => t.status === 'TODO').length,
            inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
            done: tasks.filter(t => t.status === 'DONE').length,
            overdue: tasks.filter(t => {
                if (t.status === 'DONE') return false;
                return isPast(parseISO(t.dueDate));
            }).length,
        };
    }, [tasks]);

    const handleDeleteProject = async () => {
        if (!firestore || !projectId) return;

        try {
            await deleteDocumentNonBlocking(doc(firestore, 'projects', projectId));
            toast({
                title: 'Амжилттай',
                description: 'Төсөл устгагдлаа.',
            });
            router.push('/dashboard/projects');
        } catch (error) {
            toast({
                title: 'Алдаа',
                description: 'Төсөл устгахад алдаа гарлаа.',
                variant: 'destructive',
            });
        }
    };

    const handleTaskStatusChange = async (taskId: string, newStatus: TaskStatus) => {
        if (!firestore || !projectId) return;

        try {
            const updateData: any = {
                status: newStatus,
                updatedAt: Timestamp.now(),
            };

            if (newStatus === 'DONE') {
                updateData.completedAt = Timestamp.now();
            }

            await updateDocumentNonBlocking(
                doc(firestore, 'projects', projectId, 'tasks', taskId),
                updateData
            );
        } catch (error) {
            toast({
                title: 'Алдаа',
                description: 'Таскын төлөв өөрчлөхөд алдаа гарлаа.',
                variant: 'destructive',
            });
        }
    };

    const owner = project ? employeeMap.get(project.ownerId) : undefined;
    const isLoading = isLoadingProject || isLoadingTasks;

    // Calculate days info
    const daysLeft = project ? differenceInDays(parseISO(project.endDate), new Date()) : 0;
    const totalDays = project ? differenceInDays(parseISO(project.endDate), parseISO(project.startDate)) : 0;
    const elapsedDays = project ? differenceInDays(new Date(), parseISO(project.startDate)) : 0;
    const timeProgress = project && project.status !== 'COMPLETED' 
        ? Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100)) 
        : 100;
    const isOverdue = daysLeft < 0 && project?.status !== 'COMPLETED' && project?.status !== 'ARCHIVED' && project?.status !== 'CANCELLED';

    // Status styles
    const statusStyles: Record<string, { bg: string; text: string; icon: string }> = {
        // New statuses
        DRAFT: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: 'text-slate-500' },
        ACTIVE: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
        ON_HOLD: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', icon: 'text-amber-500' },
        COMPLETED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', icon: 'text-blue-500' },
        ARCHIVED: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400', icon: 'text-zinc-400' },
        // Legacy statuses (for backward compatibility)
        PLANNING: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', icon: 'text-slate-500' },
        IN_PROGRESS: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', icon: 'text-emerald-500' },
        CANCELLED: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400', icon: 'text-zinc-400' },
    };

    if (isLoadingProject) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto">
                    <div className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 px-6 py-6">
                        <Skeleton className="h-8 w-64 mb-4" />
                        <Skeleton className="h-4 w-96 mb-8" />
                    </div>
                    <div className="px-6 py-6">
                        <div className="grid gap-4 md:grid-cols-4 mb-6">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full rounded-xl" />
                            ))}
                        </div>
                        <Skeleton className="h-48 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!project) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="text-center py-16">
                        <div className="h-20 w-20 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-6">
                            <FolderKanban className="h-10 w-10 text-violet-600 dark:text-violet-400" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-3">Төсөл олдсонгүй</h2>
                        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                            Энэ төсөл устгагдсан эсвэл байхгүй байна.
                        </p>
                        <Button 
                            onClick={() => router.push('/dashboard/projects')}
                            className="bg-violet-600 hover:bg-violet-700"
                        >
                            <ArrowRight className="h-4 w-4 mr-2 rotate-180" />
                            Төслүүд рүү буцах
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    const currentStatusStyle = statusStyles[project.status] || statusStyles.DRAFT;

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                {/* Header Section with Gradient */}
                <div className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 dark:from-violet-500/5 dark:via-purple-500/5 dark:to-fuchsia-500/5">
                    <div className="px-6 py-6">
                        <PageHeader
                            title={project.name}
                            showBackButton={true}
                            backHref="/dashboard/projects"
                            breadcrumbs={[
                                { label: 'Нүүр', href: '/dashboard' },
                                { label: 'Төслүүд', href: '/dashboard/projects' },
                                { label: project.name },
                            ]}
                            actions={
                                <div className="flex items-center gap-2">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button 
                                                    onClick={() => setIsCreateTaskOpen(true)}
                                                    className="bg-violet-600 hover:bg-violet-700 text-white shadow-lg shadow-violet-500/25"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>Шинэ таск нэмэх</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="icon" className="bg-white/80 dark:bg-slate-900/80">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => setIsEditProjectOpen(true)}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Засах
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-red-600"
                                                onClick={() => setIsDeleteDialogOpen(true)}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Устгах
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            }
                        />

                        {/* Project Overview Cards */}
                        <div className="mt-6 grid gap-4 grid-cols-2 lg:grid-cols-4">
                            {/* Status Card */}
                            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Төлөв</span>
                                        <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center", currentStatusStyle.bg)}>
                                            <Target className={cn("h-4 w-4", currentStatusStyle.icon)} />
                                        </div>
                                    </div>
                                    <Badge className={cn('text-sm font-medium', currentStatusStyle.bg, currentStatusStyle.text)}>
                                        {PROJECT_STATUS_LABELS[project.status]}
                                    </Badge>
                                    <div className="mt-2">
                                        <Badge variant="outline" className={cn('text-xs', PRIORITY_COLORS[project.priority])}>
                                            {PRIORITY_LABELS[project.priority]} чухалчлал
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Progress Card */}
                            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Явц</span>
                                        <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                            <TrendingUp className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                        </div>
                                    </div>
                                    <div className="flex items-baseline gap-1 mb-2">
                                        <span className="text-2xl font-bold text-violet-600 dark:text-violet-400">{progress.percentage}%</span>
                                    </div>
                                    <Progress value={progress.percentage} className="h-2 mb-2" />
                                    <p className="text-xs text-muted-foreground">
                                        {progress.done}/{progress.total} таск дууссан
                                    </p>
                                </CardContent>
                            </Card>

                            {/* Owner Card */}
                            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Хариуцагч</span>
                                        <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                            <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-slate-800">
                                            <AvatarImage src={owner?.photoURL} />
                                            <AvatarFallback className="bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 font-medium">
                                                {owner ? `${owner.firstName?.[0]}${owner.lastName?.[0]}` : '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium text-sm">
                                                {owner ? `${owner.firstName} ${owner.lastName}` : 'Тодорхойгүй'}
                                            </p>
                                            {owner?.jobTitle && (
                                                <p className="text-xs text-muted-foreground">{owner.jobTitle}</p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Timeline Card */}
                            <Card className={cn(
                                "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm",
                                isOverdue && "ring-2 ring-red-200 dark:ring-red-900/50"
                            )}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Хугацаа</span>
                                        <div className={cn(
                                            "h-8 w-8 rounded-lg flex items-center justify-center",
                                            isOverdue ? "bg-red-100 dark:bg-red-900/30" : "bg-green-100 dark:bg-green-900/30"
                                        )}>
                                            <Calendar className={cn(
                                                "h-4 w-4",
                                                isOverdue ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"
                                            )} />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-muted-foreground">Эхлэх:</span>
                                            <span className="font-medium">{format(parseISO(project.startDate), 'yyyy.MM.dd')}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-muted-foreground">Дуусах:</span>
                                            <span className="font-medium">{format(parseISO(project.endDate), 'yyyy.MM.dd')}</span>
                                        </div>
                                    </div>
                                    <div className={cn(
                                        "mt-2 text-xs font-medium px-2 py-1 rounded-full inline-flex items-center gap-1",
                                        project.status === 'COMPLETED'
                                            ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
                                            : isOverdue
                                            ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                            : daysLeft <= 7
                                            ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    )}>
                                        {project.status === 'COMPLETED' ? (
                                            <>
                                                <CheckCircle2 className="h-3 w-3" />
                                                Дууссан
                                            </>
                                        ) : isOverdue ? (
                                            <>
                                                <AlertCircle className="h-3 w-3" />
                                                {Math.abs(daysLeft)} өдөр хэтэрсэн
                                            </>
                                        ) : (
                                            <>
                                                <Timer className="h-3 w-3" />
                                                {daysLeft} өдөр үлдсэн
                                            </>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="px-6 py-6">
                    {/* Goal & Expected Outcome */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                        <Target className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-1">Зорилго</p>
                                        <p className="text-sm text-foreground">{project.goal || '-'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm">
                            <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                    <div className="h-8 w-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">Хүлээгдэж буй үр дүн</p>
                                        <p className="text-sm text-foreground">{project.expectedOutcome || '-'}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Team Members */}
                    <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm mb-6">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Багийн гишүүд</p>
                                    <p className="text-xs text-muted-foreground">{teamMembers.length} хүн</p>
                                </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {teamMembers.length > 0 ? (
                                    teamMembers.map((member) => (
                                        <div
                                            key={member.id}
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800"
                                        >
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={member.photoURL} />
                                                <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                                    {member.firstName?.[0]}{member.lastName?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-sm font-medium">
                                                {member.firstName} {member.lastName?.[0]}.
                                            </span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground">Багийн гишүүд сонгогдоогүй байна</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Task Stats Pills */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <button
                            onClick={() => setTaskStatusFilter('ALL')}
                            className={cn(
                                "px-4 py-2 rounded-full text-sm font-medium transition-all",
                                taskStatusFilter === 'ALL' 
                                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25" 
                                    : "bg-white dark:bg-slate-900 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 border"
                            )}
                        >
                            Бүгд ({tasks?.length || 0})
                        </button>
                        <button
                            onClick={() => setTaskStatusFilter('TODO')}
                            className={cn(
                                "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                                taskStatusFilter === 'TODO' 
                                    ? "bg-slate-700 text-white" 
                                    : "bg-white dark:bg-slate-900 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 border"
                            )}
                        >
                            <ListTodo className="h-4 w-4" />
                            Хийх ({taskStats.todo})
                        </button>
                        <button
                            onClick={() => setTaskStatusFilter('IN_PROGRESS')}
                            className={cn(
                                "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                                taskStatusFilter === 'IN_PROGRESS' 
                                    ? "bg-amber-500 text-white" 
                                    : "bg-white dark:bg-slate-900 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 border"
                            )}
                        >
                            <CircleDot className="h-4 w-4" />
                            Гүйцэтгэж байна ({taskStats.inProgress})
                        </button>
                        <button
                            onClick={() => setTaskStatusFilter('DONE')}
                            className={cn(
                                "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                                taskStatusFilter === 'DONE' 
                                    ? "bg-green-500 text-white" 
                                    : "bg-white dark:bg-slate-900 text-muted-foreground hover:bg-slate-50 dark:hover:bg-slate-800 border"
                            )}
                        >
                            <CheckCircle2 className="h-4 w-4" />
                            Дууссан ({taskStats.done})
                        </button>
                        {taskStats.overdue > 0 && (
                            <div className="px-4 py-2 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                Хэтэрсэн ({taskStats.overdue})
                            </div>
                        )}
                    </div>

                    {/* Tasks List */}
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg font-semibold">Таскууд</CardTitle>
                                <span className="text-sm text-muted-foreground">{filteredTasks.length} таск</span>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {isLoadingTasks ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 3 }).map((_, i) => (
                                        <Skeleton key={i} className="h-20 w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : filteredTasks.length === 0 ? (
                                <div className="text-center py-12">
                                    <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                                        <CheckCircle2 className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">
                                        {taskStatusFilter === 'ALL' ? 'Таск байхгүй' : 'Энэ төлөвтэй таск байхгүй'}
                                    </h3>
                                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                        {taskStatusFilter === 'ALL'
                                            ? 'Шинэ таск нэмж эхлээрэй'
                                            : 'Өөр төлөв сонгоно уу'}
                                    </p>
                                    {taskStatusFilter === 'ALL' && (
                                        <Button 
                                            onClick={() => setIsCreateTaskOpen(true)}
                                            className="bg-violet-600 hover:bg-violet-700"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Таск нэмэх
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {filteredTasks.map((task) => (
                                        <TaskItem
                                            key={task.id}
                                            task={task}
                                            employeeMap={employeeMap}
                                            onStatusChange={handleTaskStatusChange}
                                            onEdit={setEditingTask}
                                            projectId={projectId}
                                        />
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Project Chat */}
                    <ProjectChatSection
                        projectId={projectId}
                        teamMembers={teamMembers}
                        employeeMap={employeeMap}
                    />
                </div>
            </div>

            <CreateTaskDialog
                open={isCreateTaskOpen}
                onOpenChange={setIsCreateTaskOpen}
                projectId={projectId}
                teamMemberIds={project?.teamMemberIds || []}
            />

            <EditProjectDialog
                open={isEditProjectOpen}
                onOpenChange={setIsEditProjectOpen}
                project={project}
            />

            {editingTask && (
                <EditTaskDialog
                    open={!!editingTask}
                    onOpenChange={(open) => !open && setEditingTask(null)}
                    projectId={projectId}
                    task={editingTask}
                    teamMemberIds={project?.teamMemberIds || []}
                />
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Төсөл устгах</AlertDialogTitle>
                        <AlertDialogDescription>
                            Та &quot;{project.name}&quot; төслийг устгахдаа итгэлтэй байна уу?
                            Энэ үйлдлийг буцаах боломжгүй бөгөөд бүх таскууд устгагдана.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Болих</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteProject}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Устгах
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// Task Item Component
interface TaskItemProps {
    task: Task;
    employeeMap: Map<string, Employee>;
    onStatusChange: (taskId: string, status: TaskStatus) => void;
    onEdit: (task: Task) => void;
    projectId: string;
}

// Task status styles
const taskStatusStyles: Record<TaskStatus, { bg: string; text: string; border: string }> = {
    TODO: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', border: 'border-l-slate-400' },
    IN_PROGRESS: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500' },
    DONE: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', border: 'border-l-green-500' },
};

const taskPriorityStyles: Record<string, { bg: string; text: string }> = {
    LOW: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500' },
    MEDIUM: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    HIGH: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    URGENT: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
};

function TaskItem({ task, employeeMap, onStatusChange, onEdit, projectId }: TaskItemProps) {
    const daysLeft = differenceInDays(parseISO(task.dueDate), new Date());
    const isOverdue = daysLeft < 0 && task.status !== 'DONE';
    const isDone = task.status === 'DONE';

    const assignees = task.assigneeIds
        .map(id => employeeMap.get(id))
        .filter(Boolean) as Employee[];

    const statusStyle = taskStatusStyles[task.status];
    const priorityStyle = taskPriorityStyles[task.priority] || taskPriorityStyles.MEDIUM;

    return (
        <div
            className={cn(
                'group flex items-center gap-4 p-4 rounded-xl border-l-4 bg-white dark:bg-slate-900/50 hover:shadow-md transition-all',
                statusStyle.border,
                isDone && 'opacity-60',
                isOverdue && !isDone && 'ring-1 ring-red-200 dark:ring-red-900/50'
            )}
        >
            {/* Checkbox */}
            <Checkbox
                checked={isDone}
                onCheckedChange={(checked) => {
                    onStatusChange(task.id, checked ? 'DONE' : 'TODO');
                }}
                className={cn(
                    "h-5 w-5 rounded-full border-2",
                    isDone && "bg-green-500 border-green-500 text-white"
                )}
            />

            {/* Task Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={cn(
                        'font-medium',
                        isDone && 'line-through text-muted-foreground'
                    )}>
                        {task.title}
                    </span>
                    <Badge className={cn('text-xs', priorityStyle.bg, priorityStyle.text)}>
                        {PRIORITY_LABELS[task.priority]}
                    </Badge>
                </div>
            </div>

            {/* Assignees */}
            {assignees.length > 0 && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex -space-x-2">
                                {assignees.slice(0, 3).map((emp) => (
                                    <Avatar key={emp.id} className="h-7 w-7 ring-2 ring-white dark:ring-slate-900">
                                        <AvatarImage src={emp.photoURL} />
                                        <AvatarFallback className="text-[10px] bg-violet-100 dark:bg-violet-900/30 text-violet-600">
                                            {emp.firstName?.[0]}{emp.lastName?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                ))}
                                {assignees.length > 3 && (
                                    <div className="h-7 w-7 rounded-full bg-slate-100 dark:bg-slate-800 ring-2 ring-white dark:ring-slate-900 flex items-center justify-center">
                                        <span className="text-[10px] font-medium">+{assignees.length - 3}</span>
                                    </div>
                                )}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{assignees.map(a => `${a.firstName} ${a.lastName}`).join(', ')}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}

            {/* Due Date */}
            <div className={cn(
                'text-xs whitespace-nowrap px-2.5 py-1.5 rounded-full flex items-center gap-1.5',
                isDone
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                    : isOverdue
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    : daysLeft <= 3
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            )}>
                {isDone ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                ) : isOverdue ? (
                    <AlertCircle className="h-3.5 w-3.5" />
                ) : (
                    <Clock className="h-3.5 w-3.5" />
                )}
                {format(parseISO(task.dueDate), 'MM/dd')}
            </div>

            {/* Edit Button */}
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => onEdit(task)}
            >
                <Pencil className="h-4 w-4" />
            </Button>

            {/* Status Dropdown */}
            <Select
                value={task.status}
                onValueChange={(value) => onStatusChange(task.id, value as TaskStatus)}
            >
                <SelectTrigger className={cn(
                    "w-[130px] h-9 text-xs font-medium border-0",
                    statusStyle.bg,
                    statusStyle.text
                )}>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="TODO">
                        <span className="flex items-center gap-2">
                            <ListTodo className="h-4 w-4" />
                            Хийх
                        </span>
                    </SelectItem>
                    <SelectItem value="IN_PROGRESS">
                        <span className="flex items-center gap-2">
                            <CircleDot className="h-4 w-4" />
                            Гүйцэтгэж байна
                        </span>
                    </SelectItem>
                    <SelectItem value="DONE">
                        <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Дууссан
                        </span>
                    </SelectItem>
                </SelectContent>
            </Select>
        </div>
    );
}
