'use client';

import * as React from 'react';
import { collection, orderBy, query } from 'firebase/firestore';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import {
    ListChecks,
    StickyNote,
    Phone,
    Mail,
    Calendar,
    CheckSquare,
    Inbox,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ACTIVITY_TYPE_LABELS,
    type Activity,
    type ActivityType,
} from '../_types';
import type { Employee } from '@/types';
import { ActivityCard } from '../_components/activity-card';

type ViewFilter = 'all' | 'open_tasks' | 'overdue_tasks' | ActivityType;

const FILTER_OPTIONS: { value: ViewFilter; label: string; icon?: React.ComponentType<{ className?: string }> }[] = [
    { value: 'all', label: 'Бүгд', icon: ListChecks },
    { value: 'open_tasks', label: 'Нээлттэй даалгавар', icon: CheckSquare },
    { value: 'overdue_tasks', label: 'Хугацаа хэтэрсэн', icon: CheckSquare },
    { value: 'note', label: ACTIVITY_TYPE_LABELS.note, icon: StickyNote },
    { value: 'call', label: ACTIVITY_TYPE_LABELS.call, icon: Phone },
    { value: 'email', label: ACTIVITY_TYPE_LABELS.email, icon: Mail },
    { value: 'meeting', label: ACTIVITY_TYPE_LABELS.meeting, icon: Calendar },
    { value: 'task', label: ACTIVITY_TYPE_LABELS.task, icon: CheckSquare },
];

export default function CrmActivitiesPage() {
    const { firestore } = useFirebase();
    const [filter, setFilter] = React.useState<ViewFilter>('all');

    const activitiesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, 'crm_activities'),
                      orderBy('createdAt', 'desc'),
                  )
                : null,
        [firestore],
    );
    const { data: activities, isLoading } = useCollection<Activity>(activitiesQuery);

    const employeesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'employees') : null),
        [firestore],
    );
    const { data: employees } = useCollection<Employee>(employeesRef);

    const employeeMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (employees || []).forEach((e) => {
            const name = [e.lastName, e.firstName].filter(Boolean).join(' ').trim();
            map.set(e.id, name || e.email || e.id);
        });
        return map;
    }, [employees]);

    const counts = React.useMemo(() => {
        const all = activities || [];
        const now = Date.now();
        const openTasks = all.filter(
            (a) => a.type === 'task' && !a.completedAt,
        );
        const overdueTasks = openTasks.filter(
            (a) => a.dueAt && a.dueAt.seconds * 1000 < now,
        );
        return {
            all: all.length,
            open_tasks: openTasks.length,
            overdue_tasks: overdueTasks.length,
            note: all.filter((a) => a.type === 'note').length,
            call: all.filter((a) => a.type === 'call').length,
            email: all.filter((a) => a.type === 'email').length,
            meeting: all.filter((a) => a.type === 'meeting').length,
            task: all.filter((a) => a.type === 'task').length,
        } as Record<ViewFilter, number>;
    }, [activities]);

    const filtered = React.useMemo(() => {
        const all = activities || [];
        if (filter === 'all') return all;
        const now = Date.now();
        if (filter === 'open_tasks') {
            return all.filter((a) => a.type === 'task' && !a.completedAt);
        }
        if (filter === 'overdue_tasks') {
            return all.filter(
                (a) =>
                    a.type === 'task' &&
                    !a.completedAt &&
                    a.dueAt &&
                    a.dueAt.seconds * 1000 < now,
            );
        }
        return all.filter((a) => a.type === filter);
    }, [activities, filter]);

    return (
        <div className="flex h-full flex-col">
            <header className="border-b px-6 py-4">
                <h1 className="text-lg font-semibold tracking-tight">Үйл ажиллагаа</h1>
                <p className="text-xs text-muted-foreground">
                    {activities ? `${activities.length} бичлэг` : 'Ачаалж байна...'}
                </p>
            </header>

            <div className="flex items-center gap-1.5 border-b px-6 py-2.5 bg-muted/20 overflow-x-auto">
                {FILTER_OPTIONS.map(({ value, label, icon: Icon }) => {
                    const isActive = filter === value;
                    const count = counts[value] || 0;
                    return (
                        <button
                            key={value}
                            type="button"
                            onClick={() => setFilter(value)}
                            className={cn(
                                'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium border transition-colors whitespace-nowrap',
                                isActive
                                    ? 'border-cyan-300 bg-cyan-50 text-cyan-700'
                                    : 'border-transparent bg-background text-muted-foreground hover:text-foreground hover:bg-muted',
                            )}
                        >
                            {Icon && <Icon className="h-3.5 w-3.5" />}
                            {label}
                            <span
                                className={cn(
                                    'rounded-full px-1.5 text-[10px] tabular-nums',
                                    isActive ? 'bg-cyan-100' : 'bg-muted',
                                )}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>

            <div className="flex-1 overflow-auto">
                <div className="p-6 max-w-3xl mx-auto">
                    {isLoading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full" />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="rounded-xl border border-dashed bg-card/50 p-10 text-center">
                            <Inbox className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {filter === 'overdue_tasks'
                                    ? 'Хугацаа хэтэрсэн даалгавар байхгүй. Бүх юм цаг хугацаандаа явж байна.'
                                    : filter === 'open_tasks'
                                        ? 'Нээлттэй даалгавар байхгүй.'
                                        : 'Үйл ажиллагаа байхгүй байна. Харилцагч, байгууллага эсвэл гэрээний хуудаснаас нэмж эхлээрэй.'}
                            </p>
                        </div>
                    ) : (
                        <div>
                            {filtered.map((a, idx) => (
                                <div
                                    key={a.id}
                                    className={
                                        idx === filtered.length - 1
                                            ? '[&>div>div:last-child]:hidden'
                                            : ''
                                    }
                                >
                                    <ActivityCard
                                        activity={a}
                                        ownerName={
                                            a.ownerId ? employeeMap.get(a.ownerId) : undefined
                                        }
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
