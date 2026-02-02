'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/patterns/page-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddActionButton } from '@/components/ui/add-action-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
    FolderKanban,
    Search,
    Calendar,
    Clock,
    CheckCircle2,
    AlertCircle,
    TrendingUp,
    Target,
    Users,
    ArrowRight,
    Timer,
    X,
    Filter,
    LayoutGrid,
    List,
    Pencil,
    Tag,
    Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format, isPast, parseISO, differenceInDays } from 'date-fns';
import { mn } from 'date-fns/locale';

import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { 
    Project, 
    ProjectStatus, 
    PROJECT_STATUS_LABELS, 
    PROJECT_STATUS_COLORS,
    PRIORITY_LABELS,
    PRIORITY_COLORS,
    ProjectGroup,
} from '@/types/project';
import { Employee } from '@/types';
import { CreateProjectDialog } from './components/create-project-dialog';
import { EditProjectDialog } from './components/edit-project-dialog';
import { ProjectGroupsManagerDialog } from './components/project-groups-manager-dialog';
import { AssignProjectGroupsDialog } from './components/assign-project-groups-dialog';

export default function ProjectsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [isGroupsManagerOpen, setIsGroupsManagerOpen] = useState(false);
    const [assignGroupsProject, setAssignGroupsProject] = useState<Project | null>(null);

    const { firestore } = useFirebase();

    // Fetch projects
    const projectsQuery = useMemoFirebase(
        () => firestore 
            ? query(collection(firestore, 'projects'), orderBy('createdAt', 'desc')) 
            : null,
        [firestore]
    );
    const { data: projects, isLoading: isLoadingProjects } = useCollection<Project>(projectsQuery);

    // Fetch project groups
    const groupsQuery = useMemoFirebase(
        () => firestore ? query(collection(firestore, 'project_groups'), orderBy('name', 'asc')) : null,
        [firestore]
    );
    const { data: groups, isLoading: isLoadingGroups } = useCollection<ProjectGroup>(groupsQuery as any);

    const groupsById = useMemo(() => {
        return new Map((groups || []).map(g => [g.id, g]));
    }, [groups]);

    // Fetch employees for owner display
    const employeesQuery = useMemoFirebase(
        () => firestore ? collection(firestore, 'employees') : null,
        [firestore]
    );
    const { data: employees, isLoading: isLoadingEmployees } = useCollection<Employee>(employeesQuery);

    const employeeMap = useMemo(() => {
        return new Map((employees || []).map(e => [e.id, e]));
    }, [employees]);

    const toggleGroupFilter = (groupId: string, checked: boolean) => {
        setSelectedGroupIds((prev) => checked ? Array.from(new Set([...prev, groupId])) : prev.filter((id) => id !== groupId));
    };

    // Filter projects
    const filteredProjects = useMemo(() => {
        if (!projects) return [];
        
        return projects.filter(project => {
            // Group filter (multi)
            if (selectedGroupIds.length > 0) {
                const ids = project.groupIds || [];
                if (!selectedGroupIds.some((gid) => ids.includes(gid))) return false;
            }

            // Status filter
            if (statusFilter !== 'ALL' && project.status !== statusFilter) {
                return false;
            }
            
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const owner = employeeMap.get(project.ownerId);
                const ownerName = owner ? `${owner.firstName} ${owner.lastName}`.toLowerCase() : '';
                
                return (
                    project.name.toLowerCase().includes(query) ||
                    project.goal?.toLowerCase().includes(query) ||
                    project.expectedOutcome?.toLowerCase().includes(query) ||
                    ownerName.includes(query)
                );
            }
            
            return true;
        });
    }, [projects, statusFilter, searchQuery, employeeMap, selectedGroupIds]);

    // Calculate stats
    const stats = useMemo(() => {
        if (!projects) return { total: 0, active: 0, completed: 0, overdue: 0 };

        const today = new Date();
        return {
            total: projects.length,
            active: projects.filter(p => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS').length,
            completed: projects.filter(p => p.status === 'COMPLETED').length,
            overdue: projects.filter(p => {
                if (p.status === 'COMPLETED' || p.status === 'ARCHIVED' || p.status === 'CANCELLED') return false;
                return isPast(parseISO(p.endDate));
            }).length,
        };
    }, [projects]);

    const isLoading = isLoadingProjects || isLoadingEmployees || isLoadingGroups;
    const hasActiveFilters = searchQuery || statusFilter !== 'ALL' || selectedGroupIds.length > 0;

    // Status config with colors
    const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
        ALL: { label: 'Бүгд', color: 'text-slate-600', bgColor: 'bg-slate-100' },
        DRAFT: { label: 'Ноорог', color: 'text-slate-600', bgColor: 'bg-slate-100' },
        ACTIVE: { label: 'Идэвхтэй', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
        ON_HOLD: { label: 'Түр зогссон', color: 'text-amber-600', bgColor: 'bg-amber-50' },
        COMPLETED: { label: 'Дууссан', color: 'text-blue-600', bgColor: 'bg-blue-50' },
        ARCHIVED: { label: 'Архивласан', color: 'text-zinc-500', bgColor: 'bg-zinc-100' },
        // Legacy statuses
        PLANNING: { label: 'Ноорог', color: 'text-slate-600', bgColor: 'bg-slate-100' },
        IN_PROGRESS: { label: 'Идэвхтэй', color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
        CANCELLED: { label: 'Архивласан', color: 'text-zinc-500', bgColor: 'bg-zinc-100' },
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto">
                {/* Header Section with Gradient Background */}
                <div className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-fuchsia-500/10 dark:from-violet-500/5 dark:via-purple-500/5 dark:to-fuchsia-500/5">
                    <div className="px-6 py-6">
                        <PageHeader
                            title="Төслүүд"
                            description="Төсөл болон таскуудын менежмент"
                            showBackButton={true}
                            hideBreadcrumbs={true}
                            backButtonPlacement="inline"
                            backBehavior="history"
                            fallbackBackHref="/dashboard"
                            actions={
                                <AddActionButton
                                    label="Шинэ төсөл"
                                    description="Шинэ төсөл үүсгэх"
                                    onClick={() => setIsCreateDialogOpen(true)}
                                />
                            }
                        />

                        {/* Stats Cards */}
                        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Нийт төсөл</p>
                                            {isLoading ? (
                                                <Skeleton className="h-8 w-12 mt-1" />
                                            ) : (
                                                <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{stats.total}</p>
                                            )}
                                        </div>
                                        <div className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                            <FolderKanban className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Идэвхтэй</p>
                                            {isLoading ? (
                                                <Skeleton className="h-8 w-12 mt-1" />
                                            ) : (
                                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.active}</p>
                                            )}
                                        </div>
                                        <div className="h-10 w-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                                            <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Дууссан</p>
                                            {isLoading ? (
                                                <Skeleton className="h-8 w-12 mt-1" />
                                            ) : (
                                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</p>
                                            )}
                                        </div>
                                        <div className="h-10 w-10 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className={cn(
                                "bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow",
                                stats.overdue > 0 && "ring-2 ring-red-200 dark:ring-red-900/50"
                            )}>
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Хэтэрсэн</p>
                                            {isLoading ? (
                                                <Skeleton className="h-8 w-12 mt-1" />
                                            ) : (
                                                <p className={cn(
                                                    "text-2xl font-bold",
                                                    stats.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                                                )}>{stats.overdue}</p>
                                            )}
                                        </div>
                                        <div className={cn(
                                            "h-10 w-10 rounded-xl flex items-center justify-center",
                                            stats.overdue > 0 ? "bg-red-100 dark:bg-red-900/30" : "bg-slate-100 dark:bg-slate-800"
                                        )}>
                                            <AlertCircle className={cn(
                                                "h-5 w-5",
                                                stats.overdue > 0 ? "text-red-600 dark:text-red-400" : "text-slate-400"
                                            )} />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="px-6 py-6">
                    {/* Search & Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Төсөл хайх..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 bg-white dark:bg-slate-900"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        
                        <div className="flex gap-2">
                            <Select
                                value={statusFilter}
                                onValueChange={(value) => setStatusFilter(value as ProjectStatus | 'ALL')}
                            >
                                <SelectTrigger className="w-[180px] bg-white dark:bg-slate-900">
                                    <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                                    <SelectValue placeholder="Төлөв сонгох" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Бүгд</SelectItem>
                                    <SelectItem value="DRAFT">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                                            Ноорог
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="ACTIVE">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            Идэвхтэй
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="ON_HOLD">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                                            Түр зогссон
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="COMPLETED">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                                            Дууссан
                                        </span>
                                    </SelectItem>
                                    <SelectItem value="ARCHIVED">
                                        <span className="flex items-center gap-2">
                                            <span className="h-2 w-2 rounded-full bg-zinc-400" />
                                            Архивласан
                                        </span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Group Filter */}
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className="bg-white dark:bg-slate-900">
                                        <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                                        Бүлэг
                                        {selectedGroupIds.length > 0 && (
                                            <Badge variant="secondary" className="ml-2">
                                                {selectedGroupIds.length}
                                            </Badge>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[320px] p-3" align="end">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-sm font-semibold">Бүлгээр шүүх</div>
                                        <Button variant="ghost" size="sm" onClick={() => setIsGroupsManagerOpen(true)}>
                                            Бүлэг удирдах
                                        </Button>
                                    </div>
                                    <ScrollArea className="h-[220px] pr-2">
                                        <div className="space-y-2">
                                            {(groups || []).length === 0 ? (
                                                <div className="text-sm text-muted-foreground">Бүлэг алга.</div>
                                            ) : (
                                                (groups || []).map((g) => {
                                                    const checked = selectedGroupIds.includes(g.id);
                                                    return (
                                                        <label key={g.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer">
                                                            <Checkbox checked={checked} onCheckedChange={(v) => toggleGroupFilter(g.id, !!v)} />
                                                            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: g.color || '#94a3b8' }} />
                                                            <span className="text-sm font-medium">{g.name}</span>
                                                        </label>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </ScrollArea>
                                    {selectedGroupIds.length > 0 && (
                                        <div className="pt-2 flex justify-end">
                                            <Button variant="outline" size="sm" onClick={() => setSelectedGroupIds([])}>
                                                Цэвэрлэх
                                            </Button>
                                        </div>
                                    )}
                                </PopoverContent>
                            </Popover>

                            {/* View Mode Toggle */}
                            <div className="flex border rounded-md bg-white dark:bg-slate-900">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "rounded-r-none",
                                        viewMode === 'grid' && "bg-muted"
                                    )}
                                >
                                    <LayoutGrid className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "rounded-l-none",
                                        viewMode === 'list' && "bg-muted"
                                    )}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Active Filters */}
                    {hasActiveFilters && (
                        <div className="flex items-center gap-2 mb-4 flex-wrap">
                            <span className="text-sm text-muted-foreground">Идэвхтэй шүүлтүүр:</span>
                            {searchQuery && (
                                <Badge variant="secondary" className="gap-1">
                                    Хайлт: "{searchQuery}"
                                    <button onClick={() => setSearchQuery('')}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                            {statusFilter !== 'ALL' && (
                                <Badge variant="secondary" className={cn("gap-1", statusConfig[statusFilter]?.color)}>
                                    {statusConfig[statusFilter]?.label}
                                    <button onClick={() => setStatusFilter('ALL')}>
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            )}
                            {selectedGroupIds.map((gid) => {
                                const g = groupsById.get(gid);
                                return (
                                    <Badge key={gid} variant="secondary" className="gap-1">
                                        {g?.name || 'Бүлэг'}
                                        <button onClick={() => setSelectedGroupIds((prev) => prev.filter((x) => x !== gid))}>
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                );
                            })}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearchQuery('');
                                    setStatusFilter('ALL');
                                    setSelectedGroupIds([]);
                                }}
                                className="h-6 px-2 text-xs"
                            >
                                Бүгдийг цэвэрлэх
                            </Button>
                        </div>
                    )}

                    {/* Results Count */}
                    {!isLoading && (
                        <p className="text-sm text-muted-foreground mb-4">
                            {filteredProjects.length} төсөл олдлоо
                        </p>
                    )}

                    {/* Projects Grid/List */}
                    <div className={cn(
                        viewMode === 'grid' 
                            ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                            : "flex flex-col gap-3"
                    )}>
                        {isLoading ? (
                            // Loading skeletons
                            Array.from({ length: 8 }).map((_, i) => (
                                <Card key={i} className="overflow-hidden">
                                    <CardContent className="p-5">
                                        <Skeleton className="h-6 w-3/4 mb-3" />
                                        <Skeleton className="h-4 w-full mb-2" />
                                        <Skeleton className="h-4 w-2/3 mb-4" />
                                        <div className="flex justify-between items-center">
                                            <Skeleton className="h-8 w-8 rounded-full" />
                                            <Skeleton className="h-4 w-20" />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))
                        ) : filteredProjects.length === 0 ? (
                            <div className="col-span-full">
                                <Card className="border-dashed">
                                    <CardContent className="p-12 text-center">
                                        <div className="h-16 w-16 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto mb-4">
                                            <FolderKanban className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                                        </div>
                                        <h3 className="text-lg font-semibold mb-2">Төсөл олдсонгүй</h3>
                                        <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                                            {hasActiveFilters
                                                ? 'Хайлтын үр дүн олдсонгүй. Шүүлтүүрээ өөрчилж үзнэ үү.'
                                                : 'Одоогоор төсөл байхгүй байна. Шинэ төсөл үүсгэж эхлэх үү?'}
                                        </p>
                                        <Button 
                                            onClick={() => setIsCreateDialogOpen(true)}
                                            className="bg-violet-600 hover:bg-violet-700"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            Шинэ төсөл үүсгэх
                                        </Button>
                                    </CardContent>
                                </Card>
                            </div>
                        ) : (
                            filteredProjects.map((project) => (
                                <ProjectCard
                                    key={project.id}
                                    project={project}
                                    owner={employeeMap.get(project.ownerId)}
                                    viewMode={viewMode}
                                    onEdit={setEditingProject}
                                    groupsById={groupsById}
                                    onEditGroups={(p) => setAssignGroupsProject(p)}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            <CreateProjectDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />

            {editingProject && (
                <EditProjectDialog
                    open={!!editingProject}
                    onOpenChange={(open) => !open && setEditingProject(null)}
                    project={editingProject}
                />
            )}

            <ProjectGroupsManagerDialog
                open={isGroupsManagerOpen}
                onOpenChange={setIsGroupsManagerOpen}
                groups={groups || []}
            />

            <AssignProjectGroupsDialog
                open={!!assignGroupsProject}
                onOpenChange={(open) => !open && setAssignGroupsProject(null)}
                project={assignGroupsProject}
                groups={groups || []}
            />
        </div>
    );
}

// Project Card Component
interface ProjectCardProps {
    project: Project;
    owner?: Employee;
    viewMode: 'grid' | 'list';
    onEdit: (project: Project) => void;
    groupsById: Map<string, ProjectGroup>;
    onEditGroups: (project: Project) => void;
}

// Status colors mapping
const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    // New statuses
    DRAFT: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-400', border: 'border-l-slate-400' },
    ACTIVE: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', border: 'border-l-emerald-500' },
    ON_HOLD: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500', border: 'border-l-amber-500' },
    COMPLETED: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500', border: 'border-l-blue-500' },
    ARCHIVED: { bg: 'bg-zinc-50 dark:bg-zinc-800/50', text: 'text-zinc-500 dark:text-zinc-400', dot: 'bg-zinc-400', border: 'border-l-zinc-400' },
    // Legacy statuses (for backward compatibility with existing data)
    PLANNING: { bg: 'bg-slate-50 dark:bg-slate-800/50', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-400', border: 'border-l-slate-400' },
    IN_PROGRESS: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500', border: 'border-l-emerald-500' },
    CANCELLED: { bg: 'bg-zinc-50 dark:bg-zinc-800/50', text: 'text-zinc-500 dark:text-zinc-400', dot: 'bg-zinc-400', border: 'border-l-zinc-400' },
};

const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
    LOW: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    MEDIUM: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    HIGH: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    URGENT: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
};

function ProjectCard({ project, owner, viewMode, onEdit, groupsById, onEditGroups }: ProjectCardProps) {
    const daysLeft = differenceInDays(parseISO(project.endDate), new Date());
    const isOverdue = daysLeft < 0 && project.status !== 'COMPLETED' && project.status !== 'ARCHIVED' && project.status !== 'CANCELLED';
    const totalDays = differenceInDays(parseISO(project.endDate), parseISO(project.startDate));
    const elapsedDays = differenceInDays(new Date(), parseISO(project.startDate));
    const progressPercent = project.status === 'COMPLETED' ? 100 : Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
    
    const statusStyle = STATUS_STYLES[project.status] || STATUS_STYLES.DRAFT;
    const priorityStyle = PRIORITY_STYLES[project.priority] || PRIORITY_STYLES.MEDIUM;

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onEdit(project);
    };

    const handleEditGroups = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onEditGroups(project);
    };

    const groupBadges = (project.groupIds || [])
        .map((gid) => groupsById.get(gid))
        .filter(Boolean) as ProjectGroup[];

    if (viewMode === 'list') {
        return (
            <Link href={`/dashboard/projects/${project.id}`}>
                <Card className={cn(
                    "hover:shadow-md transition-all cursor-pointer group border-l-4",
                    statusStyle.border
                )}>
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            {/* Project Icon */}
                            <div className={cn(
                                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0",
                                statusStyle.bg
                            )}>
                                <FolderKanban className={cn("h-6 w-6", statusStyle.text)} />
                            </div>

                            {/* Project Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold truncate group-hover:text-violet-600 transition-colors">
                                        {project.name}
                                    </h3>
                                    <Badge className={cn('shrink-0 text-xs', statusStyle.bg, statusStyle.text)}>
                                        {PROJECT_STATUS_LABELS[project.status]}
                                    </Badge>
                                </div>
                                {groupBadges.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-1">
                                        {groupBadges.slice(0, 3).map((g) => (
                                            <Badge key={g.id} variant="secondary" className="text-[10px]">
                                                {g.name}
                                            </Badge>
                                        ))}
                                        {groupBadges.length > 3 && (
                                            <Badge variant="secondary" className="text-[10px]">
                                                +{groupBadges.length - 3}
                                            </Badge>
                                        )}
                                    </div>
                                )}
                                {project.goal && (
                                    <p className="text-sm text-muted-foreground truncate">
                                        <span className="font-medium">Зорилго:</span> {project.goal}
                                    </p>
                                )}
                            </div>

                            {/* Meta Info */}
                            <div className="hidden md:flex items-center gap-6 shrink-0">
                                <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={owner?.photoURL} />
                                        <AvatarFallback className="text-xs bg-violet-100 text-violet-600">
                                            {owner ? `${owner.firstName?.[0]}${owner.lastName?.[0]}` : '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm text-muted-foreground max-w-[100px] truncate">
                                        {owner ? `${owner.firstName}` : '-'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4" />
                                    <span>{format(parseISO(project.endDate), 'MM/dd')}</span>
                                </div>

                                <div className={cn(
                                    "text-sm font-medium min-w-[100px] text-right",
                                    isOverdue ? "text-red-500" : daysLeft <= 7 ? "text-amber-500" : "text-muted-foreground"
                                )}>
                                    {project.status === 'COMPLETED' ? (
                                        <span className="text-green-500 flex items-center gap-1 justify-end">
                                            <CheckCircle2 className="h-4 w-4" />
                                            Дууссан
                                        </span>
                                    ) : isOverdue ? (
                                        <span className="flex items-center gap-1 justify-end">
                                            <AlertCircle className="h-4 w-4" />
                                            {Math.abs(daysLeft)} өдөр хэтэрсэн
                                        </span>
                                    ) : (
                                        <span>{daysLeft} өдөр үлдсэн</span>
                                    )}
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handleEdit}
                            >
                                <Pencil className="h-4 w-4" />
                            </Button>

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handleEditGroups}
                            >
                                <Tag className="h-4 w-4" />
                            </Button>

                            <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-600 group-hover:translate-x-1 transition-all" />
                        </div>
                    </CardContent>
                </Card>
            </Link>
        );
    }
    
    return (
        <Link href={`/dashboard/projects/${project.id}`}>
            <Card className={cn(
                "h-full hover:shadow-lg transition-all cursor-pointer group overflow-hidden border-t-4",
                statusStyle.border.replace('border-l-', 'border-t-')
            )}>
                <CardContent className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div className={cn(
                            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                            statusStyle.bg
                        )}>
                            <FolderKanban className={cn("h-5 w-5", statusStyle.text)} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handleEdit}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={handleEditGroups}
                            >
                                <Tag className="h-3.5 w-3.5" />
                            </Button>
                            <Badge className={cn('text-xs', priorityStyle.bg, priorityStyle.text)}>
                                {PRIORITY_LABELS[project.priority]}
                            </Badge>
                        </div>
                    </div>

                    {/* Title & Goal */}
                    <div className="mb-4">
                        <h3 className="font-semibold text-lg truncate group-hover:text-violet-600 transition-colors mb-1">
                            {project.name}
                        </h3>
                        {groupBadges.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                                {groupBadges.slice(0, 3).map((g) => (
                                    <Badge key={g.id} variant="secondary" className="text-[10px]">
                                        {g.name}
                                    </Badge>
                                ))}
                                {groupBadges.length > 3 && (
                                    <Badge variant="secondary" className="text-[10px]">
                                        +{groupBadges.length - 3}
                                    </Badge>
                                )}
                            </div>
                        )}
                        {project.goal && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {project.goal}
                            </p>
                        )}
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-muted-foreground">Хугацаа</span>
                            <span className={cn(
                                "font-medium",
                                isOverdue ? "text-red-500" : statusStyle.text
                            )}>
                                {project.status === 'COMPLETED' ? '100%' : `${Math.round(progressPercent)}%`}
                            </span>
                        </div>
                        <Progress 
                            value={progressPercent} 
                            className={cn(
                                "h-1.5",
                                isOverdue && "bg-red-100 dark:bg-red-900/30"
                            )}
                        />
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                            {format(parseISO(project.startDate), 'yyyy.MM.dd')} - {format(parseISO(project.endDate), 'yyyy.MM.dd')}
                        </span>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t">
                        {/* Owner */}
                        <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7 ring-2 ring-white dark:ring-slate-900">
                                <AvatarImage src={owner?.photoURL} />
                                <AvatarFallback className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                                    {owner ? `${owner.firstName?.[0]}${owner.lastName?.[0]}` : '?'}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                                {owner ? `${owner.firstName}` : 'Хариуцагчгүй'}
                            </span>
                        </div>

                        {/* Status & Days */}
                        <div className={cn(
                            "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-full",
                            project.status === 'COMPLETED' 
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                : (project.status === 'ARCHIVED' || project.status === 'CANCELLED')
                                ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                                : isOverdue 
                                ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                                : daysLeft <= 7 
                                ? "bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        )}>
                            {project.status === 'COMPLETED' ? (
                                <>
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    <span>Дууссан</span>
                                </>
                            ) : (project.status === 'ARCHIVED' || project.status === 'CANCELLED') ? (
                                <span>Архивласан</span>
                            ) : isOverdue ? (
                                <>
                                    <AlertCircle className="h-3.5 w-3.5" />
                                    <span>{Math.abs(daysLeft)}д хэтэрсэн</span>
                                </>
                            ) : daysLeft === 0 ? (
                                <>
                                    <Timer className="h-3.5 w-3.5" />
                                    <span>Өнөөдөр</span>
                                </>
                            ) : (
                                <>
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{daysLeft}д үлдсэн</span>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
}
