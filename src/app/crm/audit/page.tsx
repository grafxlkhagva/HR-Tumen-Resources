'use client';

import * as React from 'react';
import { collection, limit, orderBy, query } from 'firebase/firestore';
import { ScrollText, ShieldAlert } from 'lucide-react';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useKamScope } from '../_lib/use-kam-scope';
import type { AuditAction, AuditEntry } from '../_types';

const ACTIONS: AuditAction[] = ['create', 'update', 'delete', 'stage', 'sync'];

const ACTION_LABELS: Record<AuditAction, string> = {
    create: 'Үүсгэсэн',
    update: 'Зассан',
    delete: 'Устгасан',
    stage: 'Шат сольсон',
    sync: 'Синк',
};

const ACTION_BADGE: Record<AuditAction, string> = {
    create: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
    update: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
    delete: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
    stage: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    sync: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/15 dark:text-violet-400 dark:border-violet-500/30',
};

function fmtTs(entry: AuditEntry): string {
    if (!entry.createdAt) return '—';
    try {
        return entry.createdAt.toDate().toLocaleString('mn-MN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch {
        return '—';
    }
}

export default function CrmAuditPage() {
    const { firestore } = useFirebase();
    const { isDirector, isLoading: isScopeLoading } = useKamScope();
    const [actionFilter, setActionFilter] = React.useState<AuditAction | 'all'>('all');

    const auditQ = useMemoFirebase(
        () =>
            firestore && isDirector
                ? query(
                      collection(firestore, 'crm_audit'),
                      orderBy('createdAt', 'desc'),
                      limit(200),
                  )
                : null,
        [firestore, isDirector],
    );
    const { data: entries, isLoading } = useCollection<AuditEntry>(auditQ);

    const counts = React.useMemo(() => {
        const map = new Map<AuditAction, number>();
        entries.forEach((e) => map.set(e.action, (map.get(e.action) ?? 0) + 1));
        return map;
    }, [entries]);

    const filtered = React.useMemo(
        () =>
            actionFilter === 'all'
                ? entries
                : entries.filter((e) => e.action === actionFilter),
        [entries, actionFilter],
    );

    if (isScopeLoading) {
        return (
            <div className="flex h-full flex-col">
                <header className="border-b px-6 py-4">
                    <Skeleton className="h-6 w-40" />
                </header>
                <div className="space-y-2 p-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (!isDirector) {
        return (
            <div className="flex h-full items-center justify-center p-6">
                <div className="max-w-sm text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
                        <ShieldAlert className="h-7 w-7 text-destructive" />
                    </div>
                    <h3 className="text-base font-semibold">Хандах эрхгүй</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Аудит логийг зөвхөн админ (захирал) харна.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Аудит лог</h1>
                    <p className="text-xs text-muted-foreground">Сүүлийн 200 үйлдэл</p>
                </div>
            </header>

            {/* Filter chips */}
            <div className="flex flex-wrap items-center gap-2 border-b bg-muted/20 px-6 py-3">
                <FilterChip
                    active={actionFilter === 'all'}
                    onClick={() => setActionFilter('all')}
                    label={`Бүгд · ${entries.length}`}
                />
                {ACTIONS.map((a) => (
                    <FilterChip
                        key={a}
                        active={actionFilter === a}
                        onClick={() => setActionFilter(a)}
                        label={`${ACTION_LABELS[a]} · ${counts.get(a) ?? 0}`}
                    />
                ))}
            </div>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="space-y-2 p-6">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex h-full items-center justify-center p-6">
                        <div className="max-w-sm text-center">
                            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                                <ScrollText className="h-7 w-7 text-cyan-600" />
                            </div>
                            <h3 className="text-base font-semibold">Лог хоосон</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {actionFilter === 'all'
                                    ? 'Бүртгэгдсэн үйлдэл одоогоор алга.'
                                    : 'Энэ төрлийн үйлдэл олдсонгүй — шүүлтээ өөрчилж үзнэ үү.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="sticky top-0 z-10 bg-background">
                            <TableRow>
                                <TableHead className="w-[150px]">Огноо</TableHead>
                                <TableHead className="w-[160px]">Хэрэглэгч</TableHead>
                                <TableHead className="w-[120px]">Үйлдэл</TableHead>
                                <TableHead className="w-[200px]">Хүснэгт</TableHead>
                                <TableHead>Дэлгэрэнгүй</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((e) => (
                                <TableRow key={e.id} className="hover:bg-muted/30">
                                    <TableCell className="whitespace-nowrap text-xs tabular-nums text-muted-foreground">
                                        {fmtTs(e)}
                                    </TableCell>
                                    <TableCell className="max-w-[160px] truncate text-sm">
                                        {e.userName || '—'}
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className={cn(
                                                'inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                                                ACTION_BADGE[e.action] ??
                                                    'bg-muted text-muted-foreground border-border',
                                            )}
                                        >
                                            {ACTION_LABELS[e.action] ?? e.action}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <span
                                            className="font-mono text-xs text-muted-foreground"
                                            title={
                                                e.entityId ? `${e.entity}#${e.entityId}` : e.entity
                                            }
                                        >
                                            {e.entity}
                                            {e.entityId ? `#${e.entityId.slice(0, 6)}…` : ''}
                                        </span>
                                    </TableCell>
                                    <TableCell
                                        className="max-w-[420px] truncate text-sm"
                                        title={e.detail ?? undefined}
                                    >
                                        {e.detail || '—'}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}

function FilterChip({
    active,
    onClick,
    label,
}: {
    active: boolean;
    onClick: () => void;
    label: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active
                    ? 'border-cyan-600 bg-cyan-600 text-white'
                    : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
        >
            {label}
        </button>
    );
}
