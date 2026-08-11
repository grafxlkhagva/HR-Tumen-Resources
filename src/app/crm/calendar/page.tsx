'use client';

import * as React from 'react';
import Link from 'next/link';
import {
    collection,
    doc,
    orderBy,
    query,
    serverTimestamp,
    Timestamp,
    where,
} from 'firebase/firestore';
import {
    addDays,
    addMonths,
    format,
    getDate,
    getDay,
    getDaysInMonth,
    getMonth,
    getYear,
    isSameDay,
    startOfDay,
    startOfMonth,
} from 'date-fns';
import {
    updateDocumentNonBlocking,
    useCollection,
    useFirebase,
    useMemoFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import {
    TUMEN_TASK_TYPE_LABEL,
    type Activity,
    type Company,
} from '../_types';
import { useKamScope } from '../_lib/use-kam-scope';
import { NewMeetingDialog } from './new-meeting-dialog';

type EventDoc = Activity & { id: string };

const WEEKDAYS = ['Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям', 'Ням'];

/** Firestore Timestamp → Date (хамгаалалттай). */
function toDate(ts?: Timestamp | null): Date | null {
    if (!ts || typeof ts.toDate !== 'function') return null;
    return ts.toDate();
}

/** Чипийн өнгө: уулзалт = cyan soft, дуудлага = amber, дууссан = саарал зураастай. */
function chipClass(ev: EventDoc): string {
    if (ev.completedAt) {
        return 'bg-muted text-muted-foreground line-through border-transparent';
    }
    const kind = ev.type === 'meeting' ? (ev.meetingKind ?? 'уулзалт') : ev.taskType;
    if (kind === 'дуудлага') {
        return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900';
    }
    if (kind === 'уулзалт' || ev.type === 'meeting') {
        return 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-900';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700';
}

function eventText(ev: EventDoc, companyMap: Map<string, string>): string {
    const companyName = ev.companyIds?.[0] ? companyMap.get(ev.companyIds[0]) : undefined;
    const due = toDate(ev.dueAt);
    if (ev.type === 'meeting') {
        const label = companyName ?? (ev.meetingKind === 'дуудлага' ? 'Дуудлага' : 'Уулзалт');
        return `${due ? format(due, 'HH:mm') : ''} ${label}`.trim();
    }
    const emoji = ev.taskType ? (TUMEN_TASK_TYPE_LABEL[ev.taskType] ?? '✔').split(' ')[0] : '✔';
    return `${emoji} ${ev.title ?? companyName ?? 'Даалгавар'}`;
}

function eventTitle(ev: EventDoc, companyMap: Map<string, string>): string {
    const companyName = ev.companyIds?.[0] ? companyMap.get(ev.companyIds[0]) : undefined;
    return [companyName, ev.body ?? ev.title ?? undefined].filter(Boolean).join(' · ') || '—';
}

export default function CrmCalendarPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { kamName } = useKamScope();

    const [monthDate, setMonthDate] = React.useState(() => startOfMonth(new Date()));
    const [isAddOpen, setIsAddOpen] = React.useState(false);
    // Өнөөдрийн эхлэл — session-ийн турш тогтвортой (query resubscribe-оос сэргийлнэ).
    const [todayStart] = React.useState(() => startOfDay(new Date()));

    const monthMs = monthDate.getTime();

    const monthQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        const start = new Date(monthMs);
        const end = addMonths(start, 1);
        return query(
            collection(firestore, 'crm_activities'),
            where('dueAt', '>=', Timestamp.fromDate(start)),
            where('dueAt', '<', Timestamp.fromDate(end)),
            orderBy('dueAt', 'asc'),
        );
    }, [firestore, monthMs]);
    const { data: monthActs, isLoading } = useCollection<Activity>(monthQuery);

    const upcomingQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'crm_activities'),
            where('dueAt', '>=', Timestamp.fromDate(todayStart)),
            where('dueAt', '<', Timestamp.fromDate(addDays(todayStart, 14))),
            orderBy('dueAt', 'asc'),
        );
    }, [firestore, todayStart]);
    const { data: upcomingActs } = useCollection<Activity>(upcomingQuery);

    const companiesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_companies') : null),
        [firestore],
    );
    const { data: companies } = useCollection<Company>(companiesRef);

    const companyMap = React.useMemo(() => {
        const map = new Map<string, string>();
        (companies || []).forEach((c) => map.set(c.id, c.name));
        return map;
    }, [companies]);

    // Сарын үйл явдлууд: уулзалт + хугацаатай даалгаврууд, KAM-scope-той.
    const eventsByDay = React.useMemo(() => {
        let list = (monthActs || []).filter(
            (a) => a.type === 'meeting' || a.type === 'task',
        ) as EventDoc[];
        if (kamName) list = list.filter((a) => a.kam === kamName);
        const map = new Map<number, EventDoc[]>();
        for (const ev of list) {
            const due = toDate(ev.dueAt);
            if (!due) continue;
            const day = getDate(due);
            const arr = map.get(day);
            if (arr) arr.push(ev);
            else map.set(day, [ev]);
        }
        return map;
    }, [monthActs, kamName]);

    // Удахгүй болох — дараагийн 14 хоногийн уулзалт/дуудлага.
    const upcoming = React.useMemo(() => {
        let list = (upcomingActs || []).filter((a) => a.type === 'meeting') as EventDoc[];
        if (kamName) list = list.filter((a) => a.kam === kamName);
        return list;
    }, [upcomingActs, kamName]);

    const cells = React.useMemo(() => {
        const days = getDaysInMonth(monthDate);
        const offset = (getDay(monthDate) + 6) % 7; // Даваагаар эхэлнэ
        const arr: (number | null)[] = Array.from({ length: offset }, () => null);
        for (let d = 1; d <= days; d++) arr.push(d);
        while (arr.length % 7 !== 0) arr.push(null);
        return arr;
    }, [monthDate]);

    const handleMeetingDone = React.useCallback(
        (ev: EventDoc) => {
            if (!firestore) return;
            updateDocumentNonBlocking(doc(firestore, 'crm_activities', ev.id), {
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Амжилттай', description: 'Дууссан гэж тэмдэглэгдлээ.' });
        },
        [firestore, toast],
    );

    const today = new Date();
    const isCurrentMonth =
        getYear(monthDate) === getYear(today) && getMonth(monthDate) === getMonth(today);

    return (
        <div className="flex h-full flex-col">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Календарь</h1>
                    <p className="text-xs text-muted-foreground">Товлосон уулзалт / дуудлага</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Өмнөх сар"
                        onClick={() => setMonthDate((d) => addMonths(d, -1))}
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-[130px] text-center text-sm font-semibold tabular-nums">
                        {getYear(monthDate)} он · {getMonth(monthDate) + 1}-р сар
                    </div>
                    <Button
                        variant="outline"
                        size="icon-sm"
                        aria-label="Дараах сар"
                        onClick={() => setMonthDate((d) => addMonths(d, 1))}
                    >
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMonthDate(startOfMonth(new Date()))}
                    >
                        Өнөөдөр
                    </Button>
                    <Button
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-600/90"
                        onClick={() => setIsAddOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Товлох
                    </Button>
                </div>
            </header>

            <div className="flex-1 overflow-auto p-6">
                <div className="grid gap-4 lg:grid-cols-[2.3fr_1fr] max-w-7xl">
                    <div className="rounded-xl border bg-card p-3">
                        <div className="grid grid-cols-7 gap-1 mb-1">
                            {WEEKDAYS.map((d, i) => (
                                <div
                                    key={d}
                                    className={cn(
                                        'px-1 py-1 text-center text-[11px] font-semibold uppercase tracking-wide',
                                        i >= 5
                                            ? 'text-muted-foreground/60'
                                            : 'text-muted-foreground',
                                    )}
                                >
                                    {d}
                                </div>
                            ))}
                        </div>
                        {isLoading ? (
                            <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: 35 }).map((_, i) => (
                                    <Skeleton key={i} className="h-24 w-full" />
                                ))}
                            </div>
                        ) : (
                            <div className="grid grid-cols-7 gap-1">
                                {cells.map((day, i) => {
                                    if (day === null) {
                                        return (
                                            <div
                                                key={`b${i}`}
                                                className="min-h-24 rounded-lg bg-muted/20"
                                            />
                                        );
                                    }
                                    const isToday = isCurrentMonth && getDate(today) === day;
                                    const events = eventsByDay.get(day) ?? [];
                                    const shown = events.slice(0, 3);
                                    const overflow = events.length - shown.length;
                                    return (
                                        <div
                                            key={day}
                                            className={cn(
                                                'min-h-24 rounded-lg border p-1.5 space-y-1',
                                                isToday
                                                    ? 'border-cyan-500 ring-1 ring-cyan-500 bg-cyan-500/5'
                                                    : 'border-border/60',
                                            )}
                                        >
                                            <div
                                                className={cn(
                                                    'text-xs font-semibold tabular-nums',
                                                    isToday
                                                        ? 'text-cyan-600 dark:text-cyan-400'
                                                        : 'text-muted-foreground',
                                                )}
                                            >
                                                {day}
                                            </div>
                                            {shown.map((ev) => (
                                                <EventChip
                                                    key={ev.id}
                                                    ev={ev}
                                                    companyMap={companyMap}
                                                />
                                            ))}
                                            {overflow > 0 && (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <button
                                                            type="button"
                                                            className="block w-full rounded px-1 py-0.5 text-left text-[11px] font-semibold text-cyan-700 hover:bg-cyan-500/10 dark:text-cyan-400"
                                                        >
                                                            +{overflow}
                                                        </button>
                                                    </PopoverTrigger>
                                                    <PopoverContent
                                                        className="w-64 p-2 space-y-1"
                                                        align="start"
                                                    >
                                                        <div className="px-1 pb-1 text-xs font-semibold text-muted-foreground">
                                                            {getMonth(monthDate) + 1}-р сарын {day}
                                                        </div>
                                                        {events.map((ev) => (
                                                            <EventChip
                                                                key={ev.id}
                                                                ev={ev}
                                                                companyMap={companyMap}
                                                            />
                                                        ))}
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="rounded-xl border bg-card p-4 h-fit">
                        <h2 className="mb-2 text-sm font-semibold">🔜 Удахгүй болох</h2>
                        {upcoming.length === 0 ? (
                            <div className="py-8 text-center">
                                <CalendarDays className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                                <p className="text-sm text-muted-foreground">
                                    Товлосон уулзалт алга
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y">
                                {upcoming.map((ev) => {
                                    const due = toDate(ev.dueAt);
                                    const companyId = ev.companyIds?.[0];
                                    const companyName = companyId
                                        ? companyMap.get(companyId)
                                        : undefined;
                                    const isCall = ev.meetingKind === 'дуудлага';
                                    return (
                                        <div key={ev.id} className="flex items-start gap-3 py-2.5">
                                            <div className="w-12 shrink-0 text-center">
                                                <div className="text-sm font-bold tabular-nums">
                                                    {due ? format(due, 'MM-dd') : '—'}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground tabular-nums">
                                                    {due ? format(due, 'HH:mm') : ''}
                                                </div>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                {companyId ? (
                                                    <Link
                                                        href={`/crm/companies/${companyId}`}
                                                        className={cn(
                                                            'block truncate text-sm font-medium hover:text-cyan-700 dark:hover:text-cyan-400',
                                                            ev.completedAt &&
                                                                'line-through text-muted-foreground',
                                                        )}
                                                    >
                                                        {companyName ?? '—'}
                                                    </Link>
                                                ) : (
                                                    <div
                                                        className={cn(
                                                            'truncate text-sm font-medium',
                                                            ev.completedAt &&
                                                                'line-through text-muted-foreground',
                                                        )}
                                                    >
                                                        {isCall ? 'Дуудлага' : 'Уулзалт'}
                                                    </div>
                                                )}
                                                <div className="mt-0.5 flex items-center gap-1.5">
                                                    <span
                                                        className={cn(
                                                            'inline-flex items-center rounded-full border px-1.5 py-0 text-[10px] font-semibold',
                                                            isCall
                                                                ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900'
                                                                : 'bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-900',
                                                        )}
                                                    >
                                                        {isCall ? '📞 Дуудлага' : '🤝 Уулзалт'}
                                                    </span>
                                                    {ev.body && (
                                                        <span className="truncate text-[11px] text-muted-foreground">
                                                            {ev.body}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            {ev.completedAt ? (
                                                <span className="mt-1 inline-flex shrink-0 items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                                    Дууссан
                                                </span>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="shrink-0 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                                    title="Дууссан"
                                                    aria-label="Дууссан"
                                                    onClick={() => handleMeetingDone(ev)}
                                                >
                                                    <Check className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <NewMeetingDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                companies={companies || []}
            />
        </div>
    );
}

function EventChip({ ev, companyMap }: { ev: EventDoc; companyMap: Map<string, string> }) {
    const companyId = ev.companyIds?.[0];
    const text = eventText(ev, companyMap);
    const title = eventTitle(ev, companyMap);
    const cls = cn(
        'block w-full truncate rounded border px-1 py-0.5 text-left text-[11px] font-medium',
        chipClass(ev),
    );
    if (companyId) {
        return (
            <Link href={`/crm/companies/${companyId}`} className={cls} title={title}>
                {text}
            </Link>
        );
    }
    return (
        <div className={cls} title={title}>
            {text}
        </div>
    );
}
