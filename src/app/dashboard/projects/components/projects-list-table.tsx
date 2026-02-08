'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/organization/empty-state';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
    Tag,
    FolderKanban,
    Calendar,
    CheckCircle2,
    AlertCircle,
    Clock,
    Timer,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Project, ProjectGroup, PROJECT_STATUS_LABELS, PRIORITY_LABELS } from '@/types/project';
import { Employee } from '@/types';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
    DRAFT: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    ACTIVE: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
    ON_HOLD: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    COMPLETED: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    ARCHIVED: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400' },
    IN_PROGRESS: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400' },
    CANCELLED: { bg: 'bg-zinc-100 dark:bg-zinc-800', text: 'text-zinc-500 dark:text-zinc-400' },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
    LOW: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    MEDIUM: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    HIGH: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    URGENT: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
};

interface ProjectsListTableProps {
    projects: Project[];
    employeeMap: Map<string, Employee>;
    groupsById: Map<string, ProjectGroup>;
    isLoading: boolean;
    variant?: 'list' | 'grid';
    onEditGroups: (project: Project) => void;
    onClearFilters?: () => void;
    onCreateProject?: () => void;
}

export function ProjectsListTable({
    projects,
    employeeMap,
    groupsById,
    isLoading,
    variant = 'list',
    onEditGroups,
    onClearFilters,
    onCreateProject,
}: ProjectsListTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900/50 rounded-xl border shadow-sm p-4">
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-5 w-1/2" />
                            <Skeleton className="h-4 w-2/3" />
                        </div>
                        <Skeleton className="h-8 w-8" />
                    </div>
                ))}
            </div>
        );
    }

    if (!projects.length) {
        return (
            <div className="bg-white dark:bg-slate-900/50 rounded-xl border shadow-sm p-0">
                <EmptyState
                    icon={FolderKanban}
                    title="Төсөл олдсонгүй"
                    description={onClearFilters ? 'Хайлтын үр дүн олдсонгүй. Шүүлтүүрээ өөрчилж үзнэ үү.' : 'Одоогоор төсөл байхгүй байна. Шинэ төсөл үүсгэж эхлэх үү?'}
                    className="py-12"
                    action={onClearFilters ? { label: 'Шүүлтүүрийг цэвэрлэх', onClick: onClearFilters } : onCreateProject ? { label: 'Шинэ төсөл үүсгэх', onClick: onCreateProject } : undefined}
                />
            </div>
        );
    }

    return (
        <div className={cn(
            variant === 'list' ? "space-y-3" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        )}>
            {projects.map((project) => {
                const owner = employeeMap.get(project.ownerId);
                const daysLeft = differenceInDays(parseISO(project.endDate), new Date());
                const isOverdue = daysLeft < 0 && project.status !== 'COMPLETED' && project.status !== 'ARCHIVED' && project.status !== 'CANCELLED';
                const totalDays = differenceInDays(parseISO(project.endDate), parseISO(project.startDate));
                const elapsedDays = differenceInDays(new Date(), parseISO(project.startDate));
                const progressPercent = project.status === 'COMPLETED' ? 100 : Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
                const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.DRAFT;
                const priorityStyle = PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.MEDIUM;

                const groupBadges = (project.groupIds || [])
                    .map((gid) => groupsById.get(gid))
                    .filter(Boolean) as ProjectGroup[];

                // Owner first, then other team members (no duplicates)
                const teamMemberIds = project.teamMemberIds || [];
                const otherIds = teamMemberIds.filter((id) => id !== project.ownerId);
                const orderedMemberIds = project.ownerId
                    ? [project.ownerId, ...otherIds]
                    : otherIds;
                const teamMembers = orderedMemberIds
                    .map((id) => employeeMap.get(id))
                    .filter(Boolean) as Employee[];

                const cardContent = variant === 'grid' ? (
                    <div className="bg-white dark:bg-slate-900/50 rounded-xl border shadow-sm p-4 h-full flex flex-col transition-shadow hover:shadow-md">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.preventDefault(); onEditGroups(project); }}>
                                    <Tag className="h-3.5 w-3.5" />
                                </Button>
                                <Badge className={cn('text-[10px] py-0 h-5', priorityStyle.bg, priorityStyle.text)}>
                                    {PRIORITY_LABELS[project.priority]}
                                </Badge>
                            </div>
                        </div>
                        <div className="mb-4 flex-1 min-w-0">
                            <h3 className="font-semibold text-base truncate group-hover:text-violet-600 transition-colors mb-1">
                                {project.name}
                            </h3>
                            {groupBadges.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {groupBadges.slice(0, 3).map((g) => (
                                        <Badge key={g.id} variant="secondary" className="text-[10px]">{g.name}</Badge>
                                    ))}
                                    {groupBadges.length > 3 && <Badge variant="secondary" className="text-[10px]">+{groupBadges.length - 3}</Badge>}
                                </div>
                            )}
                            {project.goal && <p className="text-sm text-muted-foreground line-clamp-2">{project.goal}</p>}
                        </div>
                        <div className="mb-4">
                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <span className="text-muted-foreground">Хугацаа</span>
                                <span className={cn("font-medium", isOverdue ? "text-red-500" : statusStyle.text)}>
                                    {project.status === 'COMPLETED' ? '100%' : `${Math.round(progressPercent)}%`}
                                </span>
                            </div>
                            <Progress value={progressPercent} className={cn("h-1.5", isOverdue && "bg-red-100 dark:bg-red-900/30")} />
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>{format(parseISO(project.startDate), 'yyyy.MM.dd')} - {format(parseISO(project.endDate), 'yyyy.MM.dd')}</span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t">
                            <div className="flex items-center gap-2">
                                {teamMembers.length > 0 ? (
                                    <>
                                        <Avatar className="h-7 w-7 ring-2 ring-white dark:ring-slate-900">
                                            <AvatarImage src={teamMembers[0]?.photoURL} />
                                            <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                                                {teamMembers[0] ? `${teamMembers[0].firstName?.[0]}${teamMembers[0].lastName?.[0]}` : '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        {teamMembers.length > 1 && (
                                            <span className="flex items-center -space-x-2 ml-2">
                                                {teamMembers.slice(1).map((emp) => (
                                                    <Avatar key={emp.id} className="h-7 w-7 ring-2 ring-white dark:ring-slate-900">
                                                        <AvatarImage src={emp.photoURL} />
                                                        <AvatarFallback className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                            {`${emp.firstName?.[0]}${emp.lastName?.[0]}`}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                ))}
                                            </span>
                                        )}
                                        <span className="text-xs text-muted-foreground truncate max-w-[80px]">{teamMembers[0] ? `${teamMembers[0].firstName}` : 'Хариуцагчгүй'}</span>
                                    </>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Багийн гишүүдгүй</span>
                                )}
                            </div>
                            <div className={cn(
                                "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
                                project.status === 'COMPLETED' ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400" :
                                (project.status === 'ARCHIVED' || project.status === 'CANCELLED') ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500" :
                                isOverdue ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" :
                                daysLeft <= 7 ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400" :
                                "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                            )}>
                                {project.status === 'COMPLETED' ? <><CheckCircle2 className="h-3.5 w-3.5" />Дууссан</> :
                                (project.status === 'ARCHIVED' || project.status === 'CANCELLED') ? <span>Архивласан</span> :
                                isOverdue ? <><AlertCircle className="h-3.5 w-3.5" />{Math.abs(daysLeft)}д хэтэрсэн</> :
                                daysLeft === 0 ? <><Timer className="h-3.5 w-3.5" />Өнөөдөр</> :
                                <><Clock className="h-3.5 w-3.5" />{daysLeft}д үлдсэн</>}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white dark:bg-slate-900/50 rounded-xl border shadow-sm p-4 transition-shadow hover:shadow-md">
                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-violet-600 transition-colors">
                                            {project.name}
                                        </span>
                                        <Badge className={cn('text-[10px] py-0 h-5 font-semibold shrink-0', statusStyle.bg, statusStyle.text)}>
                                            {PROJECT_STATUS_LABELS[project.status]}
                                        </Badge>
                                    </div>
                                    {groupBadges.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {groupBadges.slice(0, 3).map((g) => (
                                                <Badge key={g.id} variant="secondary" className="text-[10px]">{g.name}</Badge>
                                            ))}
                                            {groupBadges.length > 3 && <Badge variant="secondary" className="text-[10px]">+{groupBadges.length - 3}</Badge>}
                                        </div>
                                    )}
                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        {project.goal && <span className="truncate max-w-[200px]">{project.goal}</span>}
                                        <span className="flex items-center gap-1.5">
                                            {teamMembers.length > 0 ? (
                                                <>
                                                    <Avatar className="h-4 w-4 ring-2 ring-white dark:ring-slate-900">
                                                        <AvatarImage src={teamMembers[0]?.photoURL} />
                                                        <AvatarFallback className="text-[8px]">{teamMembers[0] ? `${teamMembers[0].firstName?.[0]}${teamMembers[0].lastName?.[0]}` : '?'}</AvatarFallback>
                                                    </Avatar>
                                                    {teamMembers.length > 1 && (
                                                        <span className="flex items-center -space-x-1.5 ml-2">
                                                            {teamMembers.slice(1).map((emp) => (
                                                                <Avatar key={emp.id} className="h-4 w-4 ring-2 ring-white dark:ring-slate-900">
                                                                    <AvatarImage src={emp.photoURL} />
                                                                    <AvatarFallback className="text-[8px]">{`${emp.firstName?.[0]}${emp.lastName?.[0]}`}</AvatarFallback>
                                                                </Avatar>
                                                            ))}
                                                        </span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-muted-foreground">Багийн гишүүдгүй</span>
                                            )}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {format(parseISO(project.endDate), 'yyyy.MM.dd')}
                                        </span>
                                        <span className={cn(
                                            "ml-auto",
                                            project.status === 'COMPLETED' ? 'text-green-600' : isOverdue ? 'text-red-600' : daysLeft <= 7 ? 'text-amber-600' : ''
                                        )}>
                                            {project.status === 'COMPLETED' ? (
                                                <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Дууссан</span>
                                            ) : isOverdue ? (
                                                <span className="flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />{Math.abs(daysLeft)}д хэтэрсэн</span>
                                            ) : daysLeft === 0 ? (
                                                <span className="flex items-center gap-1"><Timer className="h-3.5 w-3.5" />Өнөөдөр</span>
                                            ) : (
                                                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{daysLeft}д үлдсэн</span>
                                            )}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.preventDefault(); onEditGroups(project); }}>
                                        <Tag className="h-4 w-4" />
                                    </Button>
                                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                                </div>
                            </div>
                        </div>
                    </div>
                );

                return (
                    <Link key={project.id} href={`/dashboard/projects/${project.id}`} className="block group">
                        {cardContent}
                    </Link>
                );
            })}
        </div>
    );
}
