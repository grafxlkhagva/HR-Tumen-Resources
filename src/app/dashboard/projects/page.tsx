'use client';

import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/patterns/page-layout';
import { Button } from '@/components/ui/button';
import { AddActionButton } from '@/components/ui/add-action-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
    X,
    Filter,
    LayoutGrid,
    List,
    GanttChart,
    Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { Project, ProjectStatus, ProjectGroup } from '@/types/project';
import { Employee } from '@/types';
import { CreateProjectDialog } from './components/create-project-dialog';
import { ProjectGroupsManagerDialog } from './components/project-groups-manager-dialog';
import { AssignProjectGroupsDialog } from './components/assign-project-groups-dialog';
import { ProjectsDashboard } from './components/projects-dashboard';
import { ProjectsGanttView } from './components/projects-gantt-view';
import { ProjectsListTable } from './components/projects-list-table';

export default function ProjectsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'ALL'>('ALL');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list' | 'gantt'>('grid');
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

                        {/* Dashboard | төсөл */}
                        <div className="mt-6">
                            <ProjectsDashboard
                                projects={projects ?? null}
                                isLoading={isLoading}
                            />
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
                                        "rounded-r-none rounded-l-md",
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
                                        "rounded-none",
                                        viewMode === 'list' && "bg-muted"
                                    )}
                                >
                                    <List className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setViewMode('gantt')}
                                    className={cn(
                                        "rounded-l-none rounded-r-md",
                                        viewMode === 'gantt' && "bg-muted"
                                    )}
                                >
                                    <GanttChart className="h-4 w-4" />
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

                    {/* Projects Grid/List/Gantt */}
                    {viewMode === 'gantt' ? (
                        isLoading ? (
                            <div className="space-y-2">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full rounded-xl" />
                                ))}
                            </div>
                        ) : (
                            <ProjectsGanttView projects={filteredProjects} />
                        )
                    ) : (
                        <ProjectsListTable
                            projects={filteredProjects}
                            employeeMap={employeeMap}
                            groupsById={groupsById}
                            isLoading={isLoading}
                            variant={viewMode === 'gantt' ? 'list' : viewMode}
                            onEditGroups={(p) => setAssignGroupsProject(p)}
                            onClearFilters={hasActiveFilters ? () => {
                                setSearchQuery('');
                                setStatusFilter('ALL');
                                setSelectedGroupIds([]);
                            } : undefined}
                            onCreateProject={!hasActiveFilters ? () => setIsCreateDialogOpen(true) : undefined}
                        />
                    )}
                </div>
            </div>

            <CreateProjectDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
            />

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
