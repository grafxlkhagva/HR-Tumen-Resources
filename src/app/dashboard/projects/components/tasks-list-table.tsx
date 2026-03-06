'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/organization/empty-state';
import { format, parseISO, differenceInDays } from 'date-fns';
import {
    MoreHorizontal,
    Pencil,
    ListTodo,
    CircleDot,
    CheckCircle2,
    AlertCircle,
    Clock,
    ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Task, TaskStatus, PRIORITY_LABELS } from '@/types/project';
import { Employee } from '@/types';

const taskStatusStyles: Record<TaskStatus, { bg: string; text: string }> = {
    TODO: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' },
    IN_PROGRESS: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    DONE: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400' },
};

const taskPriorityStyles: Record<string, { bg: string; text: string }> = {
    LOW: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500' },
    MEDIUM: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400' },
    HIGH: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400' },
    URGENT: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400' },
};

interface TasksListTableProps {
    tasks: Task[];
    employeeMap: Map<string, Employee>;
    isLoading: boolean;
    onStatusChange: (taskId: string, status: TaskStatus) => void;
    onEdit: (task: Task) => void;
    /** Таск байхгүй үед "Таск нэмэх" товч харуулах. ALL шүүлтүүрт л өгнө. */
    onAddTask?: () => void;
    /** Шүүлтүүр асаасан үед хоосон гарчиг (жишээ: "Энэ төлөвтэй таск байхгүй") */
    emptyFilterTitle?: string;
}

export function TasksListTable({
    tasks,
    employeeMap,
    isLoading,
    onStatusChange,
    onEdit,
    onAddTask,
    emptyFilterTitle = 'Энэ төлөвтэй таск байхгүй',
}: TasksListTableProps) {
    if (isLoading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900/50 rounded-xl border shadow-sm p-4 flex items-start gap-4">
                        <Skeleton className="h-4 w-4 mt-1" />
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

    if (!tasks.length) {
        return (
            <div className="bg-white dark:bg-slate-900/50 rounded-xl border shadow-sm p-0">
                <EmptyState
                    icon={ListChecks}
                    title={onAddTask ? 'Таск байхгүй' : emptyFilterTitle}
                    description={onAddTask ? 'Шинэ таск нэмж эхлээрэй' : 'Өөр төлөв сонгоно уу'}
                    className="py-12"
                    action={onAddTask ? { label: 'Таск нэмэх', onClick: onAddTask } : undefined}
                />
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {tasks.map((task) => {
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
                        key={task.id}
                        className={cn(
                            'bg-white dark:bg-slate-900/50 rounded-xl border shadow-sm p-4 flex items-start gap-4',
                            'transition-shadow hover:shadow-md',
                            isDone && 'opacity-60',
                            isOverdue && !isDone && 'ring-1 ring-red-200 dark:ring-red-900/50'
                        )}
                    >
                        <div className="pt-0.5">
                            <Checkbox
                                checked={isDone}
                                onCheckedChange={(checked) => onStatusChange(task.id, checked ? 'DONE' : 'TODO')}
                                className={cn(
                                    'h-5 w-5 rounded-full border-2',
                                    isDone && 'bg-primary border-primary text-primary-foreground'
                                )}
                            />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            type="button"
                                            className={cn(
                                                'text-sm font-semibold text-slate-900 dark:text-slate-100 hover:text-primary truncate text-left',
                                                isDone && 'line-through text-muted-foreground'
                                            )}
                                            onClick={() => onEdit(task)}
                                        >
                                            {task.title}
                                        </button>
                                        <Badge className={cn('text-[10px] py-0 h-5 font-semibold', priorityStyle.bg, priorityStyle.text)}>
                                            {PRIORITY_LABELS[task.priority]}
                                        </Badge>
                                    </div>

                                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                        {assignees.length > 0 && (
                                            <span className="flex items-center gap-1.5">
                                                <div className="flex -space-x-2">
                                                    {assignees.slice(0, 3).map((emp) => (
                                                        <Avatar key={emp.id} className="h-5 w-5 ring-2 ring-white dark:ring-slate-900">
                                                            <AvatarImage src={emp.photoURL} />
                                                            <AvatarFallback className="text-[9px] bg-violet-100 text-violet-600">
                                                                {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    ))}
                                                </div>
                                                {assignees.length > 1 && (
                                                    <span>+{assignees.length - 1}</span>
                                                )}
                                            </span>
                                        )}
                                        <span className={cn(
                                            'flex items-center gap-1',
                                            isDone
                                                ? 'text-green-600 dark:text-green-400'
                                                : isOverdue
                                                ? 'text-red-600 dark:text-red-400'
                                                : daysLeft <= 3
                                                ? 'text-amber-600 dark:text-amber-400'
                                                : ''
                                        )}>
                                            {isDone ? (
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                            ) : isOverdue ? (
                                                <AlertCircle className="h-3.5 w-3.5" />
                                            ) : (
                                                <Clock className="h-3.5 w-3.5" />
                                            )}
                                            {format(parseISO(task.dueDate), 'yyyy.MM.dd')}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                    <Select
                                        value={task.status}
                                        onValueChange={(v) => onStatusChange(task.id, v as TaskStatus)}
                                    >
                                        <SelectTrigger className={cn(
                                            'w-[130px] h-8 text-xs font-medium border-0',
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
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(task)}>
                                                <Pencil className="mr-2 h-4 w-4" />
                                                Засах
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
