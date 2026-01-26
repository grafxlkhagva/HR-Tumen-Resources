'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFirebase, useCollection, useMemoFirebase } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
    ChevronLeft,
    FolderKanban,
    Calendar,
    Users,
    CheckCircle2,
    Clock,
    AlertCircle,
    ChevronRight,
    Target,
    ListTodo,
    Plus,
} from 'lucide-react';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import { mn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Project, Task, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '@/types/project';
import { Employee } from '@/types';
import { CreateProjectSheet } from './components';

export default function MobileProjectsPage() {
    const router = useRouter();
    const { firestore } = useFirebase();
    const { employeeProfile } = useEmployeeProfile();
    const [showCreateProject, setShowCreateProject] = React.useState(false);

    // Debug: log employee profile
    React.useEffect(() => {
        if (employeeProfile) {
            console.log('[MobileProjects] Employee ID:', employeeProfile.id);
        }
    }, [employeeProfile]);

    // Fetch projects where user is a team member
    // Note: array-contains with orderBy requires composite index, so we sort client-side
    const projectsQuery = useMemoFirebase(
        () => employeeProfile?.id && firestore
            ? query(
                collection(firestore, 'projects'),
                where('teamMemberIds', 'array-contains', employeeProfile.id)
            )
            : null,
        [firestore, employeeProfile?.id]
    );
    const { data: rawProjects, isLoading: isProjectsLoading, error: projectsError } = useCollection<Project>(projectsQuery);

    // Debug: log query results
    React.useEffect(() => {
        console.log('[MobileProjects] Raw projects:', rawProjects?.length || 0, 'Error:', projectsError);
        if (rawProjects) {
            rawProjects.forEach(p => {
                console.log('[MobileProjects] Project:', p.name, 'teamMemberIds:', p.teamMemberIds);
            });
        }
    }, [rawProjects, projectsError]);
    
    // Sort projects by updatedAt client-side
    const projects = React.useMemo(() => {
        if (!rawProjects) return null;
        return [...rawProjects].sort((a, b) => {
            const dateA = a.updatedAt?.toDate?.() || new Date(0);
            const dateB = b.updatedAt?.toDate?.() || new Date(0);
            return dateB.getTime() - dateA.getTime();
        });
    }, [rawProjects]);

    // Fetch all employees for display
    const employeesQuery = useMemoFirebase(
        () => firestore ? collection(firestore, 'employees') : null,
        [firestore]
    );
    const { data: employees } = useCollection<Employee>(employeesQuery);
    const employeeMap = React.useMemo(() => {
        const map = new Map<string, Employee>();
        employees?.forEach(e => e.id && map.set(e.id, e));
        return map;
    }, [employees]);

    // Stats
    const stats = React.useMemo(() => {
        if (!projects) return { total: 0, active: 0, completed: 0 };
        return {
            total: projects.length,
            active: projects.filter(p => ['ACTIVE', 'IN_PROGRESS', 'DRAFT', 'PLANNING'].includes(p.status)).length,
            completed: projects.filter(p => p.status === 'COMPLETED').length,
        };
    }, [projects]);

    const getStatusStyle = (status: string) => {
        const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
            DRAFT: { bg: 'bg-slate-100', text: 'text-slate-600', icon: <Clock className="w-3 h-3" /> },
            PLANNING: { bg: 'bg-slate-100', text: 'text-slate-600', icon: <Clock className="w-3 h-3" /> },
            ACTIVE: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <Target className="w-3 h-3" /> },
            IN_PROGRESS: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <Target className="w-3 h-3" /> },
            ON_HOLD: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <AlertCircle className="w-3 h-3" /> },
            COMPLETED: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckCircle2 className="w-3 h-3" /> },
            ARCHIVED: { bg: 'bg-zinc-100', text: 'text-zinc-500', icon: <CheckCircle2 className="w-3 h-3" /> },
            CANCELLED: { bg: 'bg-zinc-100', text: 'text-zinc-500', icon: <CheckCircle2 className="w-3 h-3" /> },
        };
        return styles[status] || styles.DRAFT;
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            {/* Header */}
            <div className="bg-white/90 backdrop-blur-xl px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full h-10 w-10">
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-bold text-slate-900">Миний төслүүд</h1>
                        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                            {stats.total} төсөл
                        </p>
                    </div>
                </div>
                <Button 
                    onClick={() => setShowCreateProject(true)}
                    className="h-10 w-10 rounded-2xl bg-indigo-600 hover:bg-indigo-700"
                    size="icon"
                >
                    <Plus className="h-5 w-5" />
                </Button>
            </div>

            <main className="p-5 space-y-5 animate-in fade-in slide-in-from-bottom-3">
                {/* Stats Cards */}
                <div className="grid grid-cols-3 gap-3">
                    <Card className="rounded-2xl border-0 shadow-sm bg-white">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                            <div className="text-[10px] font-semibold text-slate-400 uppercase">Нийт</div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-0 shadow-sm bg-emerald-50">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-emerald-600">{stats.active}</div>
                            <div className="text-[10px] font-semibold text-emerald-600 uppercase">Идэвхтэй</div>
                        </CardContent>
                    </Card>
                    <Card className="rounded-2xl border-0 shadow-sm bg-blue-50">
                        <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold text-blue-600">{stats.completed}</div>
                            <div className="text-[10px] font-semibold text-blue-600 uppercase">Дууссан</div>
                        </CardContent>
                    </Card>
                </div>

                {/* Projects List */}
                <div className="space-y-3">
                    {isProjectsLoading ? (
                        <>
                            {[1, 2, 3].map(i => (
                                <Skeleton key={i} className="h-36 w-full rounded-2xl" />
                            ))}
                        </>
                    ) : !projects || projects.length === 0 ? (
                        <Card className="rounded-2xl border-2 border-dashed border-slate-200 bg-white/50">
                            <CardContent className="py-12 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <FolderKanban className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-600 mb-1">Төсөл байхгүй</h3>
                                <p className="text-xs text-slate-400">Та одоогоор ямар нэг төсөлд оролцоогүй байна</p>
                            </CardContent>
                        </Card>
                    ) : (
                        projects.map((project) => {
                            const owner = employeeMap.get(project.ownerId);
                            const statusStyle = getStatusStyle(project.status);
                            const daysLeft = differenceInDays(parseISO(project.endDate), new Date());
                            const isOverdue = isPast(parseISO(project.endDate)) && !['COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(project.status);

                            return (
                                <Link key={project.id} href={`/mobile/projects/${project.id}`}>
                                    <Card className="rounded-2xl border-0 shadow-sm bg-white hover:shadow-md transition-all active:scale-[0.98]">
                                        <CardContent className="p-4">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-base font-semibold text-slate-900 truncate mb-1">
                                                        {project.name}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 line-clamp-1">
                                                        {project.goal}
                                                    </p>
                                                </div>
                                                <Badge className={cn(
                                                    "ml-2 shrink-0 text-[10px] font-semibold border-0",
                                                    statusStyle.bg,
                                                    statusStyle.text
                                                )}>
                                                    {statusStyle.icon}
                                                    <span className="ml-1">{PROJECT_STATUS_LABELS[project.status] || project.status}</span>
                                                </Badge>
                                            </div>

                                            {/* Date and Team */}
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{format(parseISO(project.endDate), 'yyyy.MM.dd')}</span>
                                                    {isOverdue ? (
                                                        <Badge variant="destructive" className="ml-1 text-[9px] px-1.5 py-0 h-4">
                                                            Хугацаа хэтэрсэн
                                                        </Badge>
                                                    ) : daysLeft <= 7 && daysLeft >= 0 && !['COMPLETED', 'ARCHIVED'].includes(project.status) ? (
                                                        <Badge className="ml-1 text-[9px] px-1.5 py-0 h-4 bg-amber-100 text-amber-700 border-0">
                                                            {daysLeft} хоног үлдсэн
                                                        </Badge>
                                                    ) : null}
                                                </div>

                                                {/* Team Avatars */}
                                                <div className="flex items-center">
                                                    <div className="flex -space-x-2">
                                                        {project.teamMemberIds?.slice(0, 3).map((memberId, idx) => {
                                                            const member = employeeMap.get(memberId);
                                                            return (
                                                                <Avatar key={memberId} className="h-6 w-6 ring-2 ring-white">
                                                                    <AvatarImage src={member?.photoURL} />
                                                                    <AvatarFallback className="text-[8px] bg-slate-100">
                                                                        {member?.firstName?.[0]}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            );
                                                        })}
                                                        {project.teamMemberIds && project.teamMemberIds.length > 3 && (
                                                            <div className="h-6 w-6 rounded-full bg-slate-100 ring-2 ring-white flex items-center justify-center">
                                                                <span className="text-[9px] font-semibold text-slate-500">
                                                                    +{project.teamMemberIds.length - 3}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Owner and Arrow */}
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                                <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarImage src={owner?.photoURL} />
                                                        <AvatarFallback className="text-[8px]">{owner?.firstName?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-[11px] text-slate-500">
                                                        {owner?.firstName} {owner?.lastName?.[0]}.
                                                    </span>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-slate-300" />
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })
                    )}
                </div>
            </main>

            {/* Create Project Sheet */}
            <CreateProjectSheet 
                open={showCreateProject} 
                onOpenChange={setShowCreateProject} 
            />
        </div>
    );
}
