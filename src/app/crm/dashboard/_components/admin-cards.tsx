'use client';

import * as React from 'react';
import { doc } from 'firebase/firestore';
import { Link2, Loader2, RefreshCw } from 'lucide-react';
import { updateDocumentNonBlocking, useFirebase, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Employee } from '@/types';
import { KAM_LIST, type SyncStatus } from '../../_types';
import { logAudit } from '../../_lib/crm-actions';

interface AdminCardsProps {
    syncStatus: (SyncStatus & { id: string }) | null;
    employees: Employee[];
    actor: { uid?: string; name?: string; kam?: string | null };
}

const SYNC_PILL: Record<string, { label: string; cls: string }> = {
    ok: {
        label: 'Амжилттай',
        cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
    },
    running: {
        label: 'Ажиллаж байна',
        cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/30',
    },
    error: {
        label: 'Алдаа',
        cls: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
    },
};

function fmtTs(ts: SyncStatus['lastSyncAt']): string {
    if (!ts) return '—';
    try {
        return ts.toDate().toLocaleString('mn-MN', {
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

function employeeName(e: Employee): string {
    const name = [e.lastName, e.firstName].filter(Boolean).join(' ').trim();
    return name || e.email || e.id;
}

/**
 * Админд л харагдах хоёр карт:
 * 1. «Sheets синк» — сүүлийн синкийн төлөв (crm_settings/sync) + «↻ Синк» товч
 *    (POST /api/crm/sync, Bearer idToken).
 * 2. «KAM холболт» — crmAccess-тэй ажилтан бүрд KAM_LIST-ээс нэр оноож
 *    employees.crmKamName-д бичнэ.
 */
export function AdminCards({ syncStatus, employees, actor }: AdminCardsProps) {
    const { firestore } = useFirebase();
    const { user } = useUser();
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = React.useState(false);

    const runSync = React.useCallback(async () => {
        if (!user || isSyncing) return;
        setIsSyncing(true);
        toast({
            title: 'Синк эхэллээ',
            description: 'Google Sheets-ээс дата татаж байна — хэдэн минут үргэлжилж болно...',
        });
        try {
            const token = await user.getIdToken();
            const res = await fetch('/api/crm/sync', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const body: { ok?: boolean; error?: string; message?: string } | null = await res
                .json()
                .catch(() => null);
            if (!res.ok || body?.ok === false) {
                throw new Error(body?.error || body?.message || `HTTP ${res.status}`);
            }
            toast({
                title: 'Амжилттай',
                description: body?.message || 'Sheets синк амжилттай дууслаа.',
            });
        } catch (e) {
            toast({
                variant: 'destructive',
                title: 'Алдаа',
                description: e instanceof Error ? e.message : 'Синк амжилтгүй боллоо.',
            });
        } finally {
            setIsSyncing(false);
        }
    }, [user, isSyncing, toast]);

    const assignKam = React.useCallback(
        (emp: Employee, value: string) => {
            if (!firestore) return;
            const next = value === 'none' ? null : value;
            updateDocumentNonBlocking(doc(firestore, 'employees', emp.id), {
                crmKamName: next,
            });
            logAudit(
                firestore,
                actor,
                'update',
                'employees',
                emp.id,
                `${employeeName(emp)}: KAM холболт → ${next ?? '—'}`,
            );
            toast({
                title: 'Амжилттай',
                description: next
                    ? `${employeeName(emp)} → ${next}`
                    : `${employeeName(emp)}: KAM холболт салгав.`,
            });
        },
        [firestore, actor, toast],
    );

    const pill =
        (syncStatus?.status && SYNC_PILL[isSyncing ? 'running' : syncStatus.status]) ||
        (isSyncing ? SYNC_PILL.running : null);

    const sortedEmployees = React.useMemo(
        () => [...employees].sort((a, b) => employeeName(a).localeCompare(employeeName(b), 'mn')),
        [employees],
    );

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Sheets синк */}
            <div className="rounded-xl border bg-card">
                <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                    <div>
                        <h3 className="text-sm font-semibold">Sheets синк</h3>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            Google Sheets → crm_orders бүрэн дахин ачаалалт · зөвхөн админ
                        </p>
                    </div>
                    <Button
                        size="sm"
                        className="bg-cyan-600 hover:bg-cyan-600/90"
                        onClick={runSync}
                        disabled={isSyncing}
                    >
                        {isSyncing ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-1.5 h-4 w-4" />
                        )}
                        ↻ Синк
                    </Button>
                </div>
                <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="text-muted-foreground">Сүүлийн синк:</span>
                        <span className="font-medium tabular-nums">
                            {fmtTs(syncStatus?.lastSyncAt)}
                        </span>
                        {pill && (
                            <span
                                className={cn(
                                    'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                                    pill.cls,
                                )}
                            >
                                {pill.label}
                            </span>
                        )}
                    </div>
                    {syncStatus?.message && (
                        <p className="text-[11px] text-muted-foreground" title={syncStatus.message}>
                            {syncStatus.message}
                        </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        <SyncStat label="Захиалга" value={syncStatus?.orderCount} />
                        <SyncStat label="Компани" value={syncStatus?.companyCount} />
                        <SyncStat label="Шинэ компани" value={syncStatus?.newCompanies} />
                        <SyncStat label="Лийд deal" value={syncStatus?.leadDeals} />
                    </div>
                </div>
            </div>

            {/* KAM холболт */}
            <div className="rounded-xl border bg-card">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                    <Link2 className="h-4 w-4 text-cyan-600" />
                    <div>
                        <h3 className="text-sm font-semibold">KAM холболт</h3>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                            CRM эрхтэй ажилтныг Sheets-ийн KAM нэртэй холбоно
                        </p>
                    </div>
                </div>
                <div className="p-2">
                    {sortedEmployees.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                            CRM эрхтэй ажилтан алга.
                        </div>
                    ) : (
                        <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                            {sortedEmployees.map((emp) => (
                                <div
                                    key={emp.id}
                                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted/50"
                                >
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-medium">
                                            {employeeName(emp)}
                                        </div>
                                        <div className="truncate text-[11px] text-muted-foreground">
                                            {emp.role === 'admin' ? 'Админ (бүрэн эрх)' : emp.email}
                                        </div>
                                    </div>
                                    <Select
                                        value={emp.crmKamName || 'none'}
                                        onValueChange={(v) => assignKam(emp, v)}
                                    >
                                        <SelectTrigger className="h-8 w-40 shrink-0 text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">— Холбоогүй —</SelectItem>
                                            {KAM_LIST.map((k) => (
                                                <SelectItem key={k} value={k}>
                                                    {k}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SyncStat({ label, value }: { label: string; value?: number }) {
    return (
        <div className="rounded-lg bg-muted/50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {label}
            </div>
            <div className="text-sm font-semibold tabular-nums">
                {value !== undefined ? value.toLocaleString('en-US') : '—'}
            </div>
        </div>
    );
}
