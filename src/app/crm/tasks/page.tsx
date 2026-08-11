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
} from 'firebase/firestore';
import { addDays, format, isSameDay, startOfDay } from 'date-fns';
import {
    deleteDocumentNonBlocking,
    updateDocumentNonBlocking,
    useCollection,
    useFirebase,
    useMemoFirebase,
} from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    Check,
    ChevronDown,
    ClipboardCheck,
    Plus,
    Search,
    Trash2,
    Undo2,
} from 'lucide-react';
import {
    KAM_LIST,
    TUMEN_TASK_PRIORITIES,
    TUMEN_TASK_TYPES,
    TUMEN_TASK_TYPE_LABEL,
    type Activity,
    type Company,
    type TumenTaskPriority,
} from '../_types';
import { logAudit } from '../_lib/crm-actions';
import { useKamScope } from '../_lib/use-kam-scope';
import { NewTaskDialog } from './new-task-dialog';

type TaskDoc = Activity & { id: string };

const ALL = 'all';

/** Firestore Timestamp → Date (хамгаалалттай). */
function toDate(ts?: Timestamp | null): Date | null {
    if (!ts || typeof ts.toDate !== 'function') return null;
    return ts.toDate();
}

const PRIORITY_RANK: Record<TumenTaskPriority, number> = {
    өндөр: 0,
    дунд: 1,
    бага: 2,
};

const PRIORITY_BADGE: Record<TumenTaskPriority, string> = {
    өндөр: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900',
    дунд: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900',
    бага: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
};

const PRIORITY_LABEL: Record<TumenTaskPriority, string> = Object.fromEntries(
    TUMEN_TASK_PRIORITIES.map((p) => [p.id, p.label]),
) as Record<TumenTaskPriority, string>;

/** Bucket доторх эрэмбэ: чухалчлал (өндөр→бага), дараа нь хугацаа. */
function sortTasks(list: TaskDoc[]): TaskDoc[] {
    return [...list].sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority ?? 'дунд'] ?? 1;
        const pb = PRIORITY_RANK[b.priority ?? 'дунд'] ?? 1;
        if (pa !== pb) return pa - pb;
        const da = toDate(a.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
        const db = toDate(b.dueAt)?.getTime() ?? Number.POSITIVE_INFINITY;
        return da - db;
    });
}

export default function CrmTasksPage() {
    const { firestore } = useFirebase();
    const { toast } = useToast();
    const { kamName, actor } = useKamScope();

    const [searchTerm, setSearchTerm] = React.useState('');
    const [typeFilter, setTypeFilter] = React.useState(ALL);
    const [kamFilter, setKamFilter] = React.useState(ALL);
    const [isAddOpen, setIsAddOpen] = React.useState(false);

    const activitiesQuery = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'crm_activities'), orderBy('createdAt', 'desc'))
                : null,
        [firestore],
    );
    const { data: activities, isLoading } = useCollection<Activity>(activitiesQuery);

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

    const tasks = React.useMemo(() => {
        let list = (activities || []).filter((a) => a.type === 'task') as TaskDoc[];
        if (kamName) {
            list = list.filter((a) => a.kam === kamName);
        } else if (kamFilter !== ALL) {
            list = list.filter((a) => a.kam === kamFilter);
        }
        if (typeFilter !== ALL) list = list.filter((a) => a.taskType === typeFilter);
        const t = searchTerm.trim().toLowerCase();
        if (t) {
            list = list.filter((a) => {
                const companyName = a.companyIds?.[0]
                    ? companyMap.get(a.companyIds[0]) ?? ''
                    : '';
                return `${a.title ?? ''} ${companyName}`.toLowerCase().includes(t);
            });
        }
        return list;
    }, [activities, kamName, kamFilter, typeFilter, searchTerm, companyMap]);

    const buckets = React.useMemo(() => {
        const today0 = startOfDay(new Date());
        const week7 = addDays(today0, 7);
        const open = tasks.filter((t) => !t.completedAt);
        const overdue: TaskDoc[] = [];
        const today: TaskDoc[] = [];
        const week: TaskDoc[] = [];
        const later: TaskDoc[] = [];
        for (const t of open) {
            const due = toDate(t.dueAt);
            if (!due) later.push(t);
            else if (isSameDay(due, today0)) today.push(t);
            else if (due < today0) overdue.push(t);
            else if (due <= week7) week.push(t);
            else later.push(t);
        }
        const done = tasks
            .filter((t) => t.completedAt)
            .sort(
                (a, b) =>
                    (toDate(b.completedAt)?.getTime() ?? 0) -
                    (toDate(a.completedAt)?.getTime() ?? 0),
            )
            .slice(0, 100);
        return {
            open,
            overdue: sortTasks(overdue),
            today: sortTasks(today),
            week: sortTasks(week),
            later: sortTasks(later),
            done,
        };
    }, [tasks]);

    const handleDone = React.useCallback(
        (t: TaskDoc) => {
            if (!firestore) return;
            updateDocumentNonBlocking(doc(firestore, 'crm_activities', t.id), {
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Амжилттай', description: 'Даалгавар дууслаа.' });
        },
        [firestore, toast],
    );

    const handleReopen = React.useCallback(
        (t: TaskDoc) => {
            if (!firestore) return;
            updateDocumentNonBlocking(doc(firestore, 'crm_activities', t.id), {
                completedAt: null,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Амжилттай', description: 'Даалгавар сэргээгдлээ.' });
        },
        [firestore, toast],
    );

    // 📅+1 — хугацааг 1 хоног хойшлуулна (хугацаагүй бол өнөөдрөөс).
    const handleSnooze = React.useCallback(
        (t: TaskDoc) => {
            if (!firestore) return;
            const base = toDate(t.dueAt) ?? new Date();
            updateDocumentNonBlocking(doc(firestore, 'crm_activities', t.id), {
                dueAt: Timestamp.fromDate(addDays(base, 1)),
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Амжилттай', description: '+1 хоног хойшлууллаа.' });
        },
        [firestore, toast],
    );

    const handleDelete = React.useCallback(
        (t: TaskDoc) => {
            if (!firestore) return;
            deleteDocumentNonBlocking(doc(firestore, 'crm_activities', t.id));
            logAudit(
                firestore,
                actor,
                'delete',
                'crm_activities',
                t.id,
                `Даалгавар устгав: ${t.title ?? '—'}`,
            );
            toast({ title: 'Амжилттай', description: 'Даалгавар устгагдлаа.' });
        },
        [firestore, actor, toast],
    );

    const groupProps = {
        companyMap,
        onDone: handleDone,
        onReopen: handleReopen,
        onSnooze: handleSnooze,
        onDelete: handleDelete,
    };

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Даалгавар</h1>
                    <p className="text-xs text-muted-foreground">
                        Дуудлага · уулзалт · үнийн санал · гэрээ · дагах — төрөл, чухалчлал,
                        хугацаагаар
                    </p>
                </div>
                <Button
                    size="sm"
                    className="bg-cyan-600 hover:bg-cyan-600/90"
                    onClick={() => setIsAddOpen(true)}
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    Даалгавар
                </Button>
            </header>

            <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3 bg-muted/20">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Гарчиг / компаниар хайх..."
                        className="pl-9 h-9"
                    />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 w-[170px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value={ALL}>Бүх төрөл</SelectItem>
                        {TUMEN_TASK_TYPES.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                                {t.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {!kamName && (
                    <Select value={kamFilter} onValueChange={setKamFilter}>
                        <SelectTrigger className="h-9 w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL}>Бүх KAM</SelectItem>
                            {KAM_LIST.map((k) => (
                                <SelectItem key={k} value={k}>
                                    {k}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="p-6 space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-14 w-full" />
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <EmptyState
                        hasFilter={
                            searchTerm.trim().length > 0 ||
                            typeFilter !== ALL ||
                            kamFilter !== ALL
                        }
                        onAdd={() => setIsAddOpen(true)}
                    />
                ) : (
                    <div className="p-6 space-y-6 max-w-6xl">
                        <SummaryBar
                            overdue={buckets.overdue.length}
                            today={buckets.today.length}
                            week={buckets.week.length}
                            open={buckets.open.length}
                        />

                        <TaskGroup
                            title="🔴 Хугацаа хэтэрсэн"
                            accentClass="text-rose-600 dark:text-rose-400"
                            tasks={buckets.overdue}
                            {...groupProps}
                        />
                        <TaskGroup
                            title="📅 Өнөөдөр"
                            accentClass="text-amber-600 dark:text-amber-400"
                            tasks={buckets.today}
                            {...groupProps}
                        />
                        <TaskGroup
                            title="🗓 Энэ 7 хоног"
                            accentClass="text-foreground"
                            tasks={buckets.week}
                            {...groupProps}
                        />
                        <TaskGroup
                            title="📋 Дараа / огноогүй"
                            accentClass="text-muted-foreground"
                            tasks={buckets.later}
                            {...groupProps}
                        />

                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <button
                                    type="button"
                                    className="flex items-center gap-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:opacity-80"
                                >
                                    <ChevronDown className="h-4 w-4" />✅ Дууссан (
                                    {buckets.done.length})
                                </button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="pt-3">
                                <TaskGroup
                                    title=""
                                    accentClass=""
                                    tasks={buckets.done}
                                    doneMode
                                    {...groupProps}
                                />
                            </CollapsibleContent>
                        </Collapsible>
                    </div>
                )}
            </div>

            <NewTaskDialog
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                companies={companies || []}
            />
        </div>
    );
}

function SummaryBar({
    overdue,
    today,
    week,
    open,
}: {
    overdue: number;
    today: number;
    week: number;
    open: number;
}) {
    const items = [
        {
            label: '🔴 Хэтэрсэн',
            value: overdue,
            cls: overdue > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
        },
        {
            label: '📅 Өнөөдөр',
            value: today,
            cls: today > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
        },
        { label: '🗓 7 хоног', value: week, cls: 'text-foreground' },
        { label: '📋 Нийт нээлттэй', value: open, cls: 'text-foreground' },
    ];
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 rounded-xl border bg-card divide-x divide-y sm:divide-y-0">
            {items.map((it) => (
                <div key={it.label} className="px-4 py-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                        {it.label}
                    </div>
                    <div className={cn('text-2xl font-bold tabular-nums', it.cls)}>
                        {it.value}
                    </div>
                </div>
            ))}
        </div>
    );
}

function TaskGroup({
    title,
    accentClass,
    tasks,
    companyMap,
    doneMode = false,
    onDone,
    onReopen,
    onSnooze,
    onDelete,
}: {
    title: string;
    accentClass: string;
    tasks: TaskDoc[];
    companyMap: Map<string, string>;
    doneMode?: boolean;
    onDone: (t: TaskDoc) => void;
    onReopen: (t: TaskDoc) => void;
    onSnooze: (t: TaskDoc) => void;
    onDelete: (t: TaskDoc) => void;
}) {
    const today0 = startOfDay(new Date());
    return (
        <section>
            {title && (
                <h2 className={cn('mb-2 text-sm font-semibold', accentClass)}>
                    {title}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                        ({tasks.length})
                    </span>
                </h2>
            )}
            {tasks.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
                    —
                </div>
            ) : (
                <div className="rounded-xl border bg-card overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[140px]">Төрөл</TableHead>
                                <TableHead>Гарчиг</TableHead>
                                <TableHead className="w-[110px]">Чухал</TableHead>
                                <TableHead className="w-[200px]">Компани</TableHead>
                                <TableHead className="w-[130px]">KAM</TableHead>
                                <TableHead className="w-[110px]">Хугацаа</TableHead>
                                <TableHead className="w-[130px] text-right" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tasks.map((t) => {
                                const due = toDate(t.dueAt);
                                const isOverdue = !!due && !t.completedAt && due < today0;
                                const companyId = t.companyIds?.[0];
                                const dealId = t.dealIds?.[0];
                                const companyName = companyId
                                    ? companyMap.get(companyId) ?? '—'
                                    : null;
                                const titleHref = dealId
                                    ? `/crm/deals/${dealId}`
                                    : companyId
                                      ? `/crm/companies/${companyId}`
                                      : null;
                                const priority = t.priority ?? 'дунд';
                                return (
                                    <TableRow key={t.id} className="hover:bg-muted/30">
                                        <TableCell className="text-sm whitespace-nowrap">
                                            {t.taskType
                                                ? TUMEN_TASK_TYPE_LABEL[t.taskType]
                                                : '✔ Бусад'}
                                        </TableCell>
                                        <TableCell>
                                            {titleHref ? (
                                                <Link
                                                    href={titleHref}
                                                    className={cn(
                                                        'text-sm font-medium hover:text-cyan-700 dark:hover:text-cyan-400',
                                                        doneMode &&
                                                            'line-through text-muted-foreground',
                                                    )}
                                                >
                                                    {t.title ?? '—'}
                                                </Link>
                                            ) : (
                                                <span
                                                    className={cn(
                                                        'text-sm font-medium',
                                                        doneMode &&
                                                            'line-through text-muted-foreground',
                                                    )}
                                                >
                                                    {t.title ?? '—'}
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span
                                                className={cn(
                                                    'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                                                    PRIORITY_BADGE[priority],
                                                )}
                                            >
                                                {PRIORITY_LABEL[priority]}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {companyId ? (
                                                <Link
                                                    href={`/crm/companies/${companyId}`}
                                                    className="hover:text-cyan-700 dark:hover:text-cyan-400"
                                                >
                                                    {companyName}
                                                </Link>
                                            ) : (
                                                <span className="text-muted-foreground">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {t.kam ?? '—'}
                                        </TableCell>
                                        <TableCell
                                            className={cn(
                                                'text-sm tabular-nums whitespace-nowrap',
                                                isOverdue
                                                    ? 'text-rose-600 dark:text-rose-400 font-semibold'
                                                    : 'text-muted-foreground',
                                            )}
                                        >
                                            {due ? format(due, 'yyyy-MM-dd') : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="inline-flex items-center gap-0.5">
                                                {doneMode ? (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        title="Сэргээх"
                                                        aria-label="Сэргээх"
                                                        onClick={() => onReopen(t)}
                                                    >
                                                        <Undo2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                ) : (
                                                    <>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 px-1.5 text-[11px] font-mono"
                                                            title="+1 хоног хойшлуулах"
                                                            aria-label="+1 хоног хойшлуулах"
                                                            onClick={() => onSnooze(t)}
                                                        >
                                                            📅+1
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                                                            title="Дуусгах"
                                                            aria-label="Дуусгах"
                                                            onClick={() => onDone(t)}
                                                        >
                                                            <Check className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </>
                                                )}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon-sm"
                                                            className="text-muted-foreground hover:text-rose-600"
                                                            title="Устгах"
                                                            aria-label="Устгах"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>
                                                                Даалгавар устгах уу?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                «{t.title ?? '—'}» устгагдана. Энэ
                                                                үйлдэл буцаагдахгүй.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>
                                                                Болих
                                                            </AlertDialogCancel>
                                                            <AlertDialogAction
                                                                className="bg-rose-600 hover:bg-rose-600/90"
                                                                onClick={() => onDelete(t)}
                                                            >
                                                                Устгах
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}
        </section>
    );
}

function EmptyState({ hasFilter, onAdd }: { hasFilter: boolean; onAdd: () => void }) {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="text-center max-w-sm">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <ClipboardCheck className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">
                    {hasFilter ? 'Шүүлтэд тохирох даалгавар олдсонгүй' : 'Даалгавар байхгүй байна'}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    {hasFilter
                        ? 'Шүүлтээ өөрчилж үзнэ үү.'
                        : 'Эхний даалгавраа нэмж эхлээрэй.'}
                </p>
                {!hasFilter && (
                    <Button
                        size="sm"
                        className="mt-4 bg-cyan-600 hover:bg-cyan-600/90"
                        onClick={onAdd}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Даалгавар
                    </Button>
                )}
            </div>
        </div>
    );
}
