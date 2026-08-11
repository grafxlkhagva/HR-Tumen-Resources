'use client';

import * as React from 'react';
import Link from 'next/link';
import { collection, doc, query, where } from 'firebase/firestore';
import { Banknote, CheckSquare, FileSpreadsheet, TrendingUp } from 'lucide-react';
import { useCollection, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    FUNNEL_STAGES,
    FUNNEL_STAGE_LABELS,
    KAM_LIST,
    TARGET_2026,
    TEAMS,
    normalizeStageId,
    type Activity,
    type Company,
    type Deal,
    type FunnelStage,
    type OrderYearStats,
    type Quote,
    type Survey,
    type SyncStatus,
} from '../_types';
import { normName, targetTone, type Tone } from '../_lib/stats';
import { useKamScope } from '../_lib/use-kam-scope';
import type { Employee } from '@/types';
import { StatCard } from '../reports/_components/stat-card';
import { ChartCard } from '../reports/_components/chart-card';
import { MonthlyChart } from './_components/monthly-chart';
import { PlanBarRow } from './_components/plan-bars';
import { RemindersCard, type ReminderItem } from './_components/reminders-card';
import { YearBoxes } from './_components/year-boxes';
import { AdminCards } from './_components/admin-cards';

const CUR_YEAR = 2026;

/** Прототипийн dashboard progress bar-ын яг өнгөнүүд (≥75 / ≥50 босго). */
const TARGET_BAR_HEX: Record<Tone, string> = {
    good: '#16a34a',
    warn: '#f59e0b',
    bad: '#dc2626',
};

const STAGE_DOT: Record<FunnelStage, string> = {
    lead: 'bg-slate-400',
    contacted: 'bg-indigo-500',
    qualified: 'bg-violet-500',
    quote: 'bg-amber-500',
    customer: 'bg-emerald-500',
    loyal: 'bg-teal-500',
    lost: 'bg-rose-500',
};

/** Орон нутгийн цагаар YYYY-MM-DD. */
function localToday(): string {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function stageShort(s: FunnelStage): string {
    const label = FUNNEL_STAGE_LABELS[s];
    const parts = label.split(' · ');
    return parts[1] ?? label;
}

export default function CrmDashboardPage() {
    const { firestore } = useFirebase();
    const scope = useKamScope();
    const { kamName, isDirector, actor } = scope;

    // ── Дата ──
    const stats26Ref = useMemoFirebase(
        () => (firestore ? doc(firestore, 'crm_order_stats', String(CUR_YEAR)) : null),
        [firestore],
    );
    const { data: stats26, isLoading: isStats26Loading } = useDoc<OrderYearStats>(stats26Ref);

    const yearStatsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_order_stats') : null),
        [firestore],
    );
    const { data: yearStats } = useCollection<OrderYearStats>(yearStatsRef);

    const dealsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_deals') : null),
        [firestore],
    );
    const { data: deals } = useCollection<Deal>(dealsRef);

    const companiesRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_companies') : null),
        [firestore],
    );
    const { data: companies } = useCollection<Company>(companiesRef);

    const quotesQ = useMemoFirebase(
        () =>
            firestore
                ? query(collection(firestore, 'crm_quotes'), where('status', '==', 'sent'))
                : null,
        [firestore],
    );
    const { data: openQuotesRaw } = useCollection<Quote>(quotesQ);

    const activitiesQ = useMemoFirebase(
        () =>
            firestore
                ? query(
                      collection(firestore, 'crm_activities'),
                      where('type', 'in', ['task', 'meeting']),
                  )
                : null,
        [firestore],
    );
    const { data: activities } = useCollection<Activity>(activitiesQ);

    const surveysRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_surveys') : null),
        [firestore],
    );
    const { data: surveys } = useCollection<Survey>(surveysRef);

    // Админд л хэрэгтэй дата (эрхгүй хэрэглэгчээс огт уншихгүй)
    const syncRef = useMemoFirebase(
        () => (firestore && isDirector ? doc(firestore, 'crm_settings', 'sync') : null),
        [firestore, isDirector],
    );
    const { data: syncStatus } = useDoc<SyncStatus>(syncRef);

    const employeesQ = useMemoFirebase(
        () =>
            firestore && isDirector
                ? query(collection(firestore, 'employees'), where('crmAccess', '==', true))
                : null,
        [firestore, isDirector],
    );
    const { data: crmEmployees } = useCollection<Employee>(employeesQ);

    // ── KAM scoping ──
    const scopedDeals = React.useMemo(
        () => (kamName ? deals.filter((d) => d.kam === kamName) : deals),
        [deals, kamName],
    );
    const scopedCompanies = React.useMemo(
        () => (kamName ? companies.filter((c) => c.kam === kamName) : companies),
        [companies, kamName],
    );
    const tasks = React.useMemo(() => {
        const list = activities.filter((a) => a.type === 'task');
        return kamName ? list.filter((a) => a.kam === kamName) : list;
    }, [activities, kamName]);
    const meetings = React.useMemo(() => {
        const list = activities.filter((a) => a.type === 'meeting');
        return kamName ? list.filter((a) => a.kam === kamName) : list;
    }, [activities, kamName]);

    const scopedSurveys = React.useMemo(() => {
        if (!kamName) return surveys;
        const byId = new Map(companies.map((c) => [c.id, c.kam]));
        const byName = new Map(companies.map((c) => [normName(c.name || ''), c.kam]));
        return surveys.filter((s) => {
            if (s.companyId) return byId.get(s.companyId) === kamName;
            if (s.companyName) return byName.get(normName(s.companyName)) === kamName;
            return false;
        });
    }, [surveys, companies, kamName]);

    const openQuotes = React.useMemo(() => {
        if (!kamName) return openQuotesRaw;
        const dealKam = new Map(deals.map((d) => [d.id, d.kam]));
        return openQuotesRaw.filter(
            (q) =>
                (q.dealId && dealKam.get(q.dealId) === kamName) ||
                (!!actor.uid && q.ownerId === actor.uid),
        );
    }, [openQuotesRaw, deals, kamName, actor.uid]);

    // ── KPI (толгой тоо — KAM-scoped, прототипийн адил) ──
    const kpi = React.useMemo(() => {
        const scoped = kamName ? stats26?.byKam?.[kamName] : undefined;
        const revenue = kamName ? scoped?.revenue ?? 0 : stats26?.revenue ?? 0;
        const profit = kamName ? scoped?.profit ?? 0 : stats26?.profit ?? 0;
        const openTasks = tasks.filter((a) => !a.completedAt);
        const overdueTasks = openTasks.filter((a) => {
            const due = a.dueAt?.toDate();
            return !!due && due.getTime() < Date.now();
        });
        return {
            revenue,
            profit,
            openQuotes: openQuotes.length,
            openTasks: openTasks.length,
            overdueTasks: overdueTasks.length,
        };
    }, [stats26, kamName, tasks, openQuotes]);

    // ── 2026 зорилт + alert chips (глобал — прототипийн адил) ──
    const alerts = React.useMemo(() => {
        const todayStr = localToday();
        const actualM = (stats26?.profit ?? 0) / 1e6;
        const pct = Math.round((actualM / TARGET_2026.total) * 100);
        const overdue = deals.filter((d) => {
            const st = normalizeStageId(d.stageId);
            return (
                (st === 'lead' || st === 'opportunity') && !!d.quoteDue && d.quoteDue < todayStr
            );
        }).length;
        const scores = surveys
            .map((s) => s.score)
            .filter((v): v is number => typeof v === 'number' && !isNaN(v));
        const avgNps = scores.length
            ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
            : null;
        const atRisk = scores.filter((v) => v <= 6).length;
        return { actualM, pct, tone: targetTone(pct), overdue, avgNps, atRisk };
    }, [stats26, deals, surveys]);

    // ── Funnel тоолол (KAM-scoped) ──
    const funnelCounts = React.useMemo(() => {
        const counts = new Map<FunnelStage, number>();
        scopedCompanies.forEach((c) => {
            const s = (c.funnelStage ?? 'lead') as FunnelStage;
            counts.set(s, (counts.get(s) ?? 0) + 1);
        });
        return counts;
    }, [scopedCompanies]);

    // ── Сануулга (backend.md active_reminders — клиент талд, KAM-scoped) ──
    const reminders = React.useMemo<ReminderItem[]>(() => {
        const out: ReminderItem[] = [];
        const now = Date.now();
        const todayStr = localToday();
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);

        // 1. 1 цагийн SLA — холбогдоогүй шинэ лийд
        scopedDeals.forEach((d) => {
            if (normalizeStageId(d.stageId) !== 'lead' || d.quotedAt) return;
            const created = d.createdAt?.toMillis();
            if (created && now - created > 3600_000) {
                out.push({
                    key: `sla-${d.id}`,
                    level: 'bad',
                    type: 'SLA',
                    text: `${d.name || 'Хүсэлт'} — 1 цаг хэтэрсэн, холбогдоогүй`,
                    href: '/crm/deals',
                    icon: 'sla',
                });
            }
        });

        // 2. Хугацаа хэтэрсэн даалгавар
        tasks.forEach((a) => {
            if (a.completedAt) return;
            const due = a.dueAt?.toDate();
            if (due && due.getTime() < startOfToday.getTime()) {
                out.push({
                    key: `task-${a.id}`,
                    level: 'warn',
                    type: 'Даалгавар',
                    text: `${a.title || a.body || 'Даалгавар'} — хугацаа хэтэрсэн`,
                    href: '/crm/tasks',
                    icon: 'task',
                });
            }
        });

        // 3. Санал өгөх хугацаа хэтэрсэн deals
        scopedDeals.forEach((d) => {
            const st = normalizeStageId(d.stageId);
            if ((st === 'lead' || st === 'opportunity') && d.quoteDue && d.quoteDue < todayStr) {
                out.push({
                    key: `quote-${d.id}`,
                    level: 'bad',
                    type: 'Санал',
                    text: `${d.name || 'Deal'} — санал өгөх хугацаа хэтэрсэн (${d.quoteDue})`,
                    href: '/crm/deals',
                    icon: 'quote',
                });
            }
        });

        // 4. Өнөөдрийн / хоцорсон уулзалт
        meetings.forEach((a) => {
            if (a.completedAt) return;
            const due = a.dueAt?.toDate();
            if (!due) return;
            const isPast = due.getTime() < startOfToday.getTime();
            const isToday =
                due.getFullYear() === startOfToday.getFullYear() &&
                due.getMonth() === startOfToday.getMonth() &&
                due.getDate() === startOfToday.getDate();
            if (!isPast && !isToday) return;
            const when = due.toLocaleString('mn-MN', {
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
            out.push({
                key: `meet-${a.id}`,
                level: isPast ? 'bad' : 'warn',
                type: a.meetingKind === 'дуудлага' ? 'Дуудлага' : 'Уулзалт',
                text: `${a.title || a.body || 'Уулзалт'} — ${when}${isPast ? ' (хоцорсон)' : ''}`,
                href: '/crm/calendar',
                icon: 'meeting',
            });
        });

        // 5. NPS ≤ 6 — дагаж холбогдох
        scopedSurveys.forEach((s) => {
            if (typeof s.score !== 'number' || s.score > 6) return;
            const name = s.companyName || 'Харилцагч';
            out.push({
                key: `nps-${s.id}`,
                level: 'bad',
                type: 'NPS',
                text: `${name} — NPS ${s.score}, дагаж холбогдоно`,
                href: s.companyId ? `/crm/companies/${s.companyId}` : '/crm/analytics',
                icon: 'nps',
            });
        });

        return out;
    }, [scopedDeals, tasks, meetings, scopedSurveys]);

    const isLoading = scope.isLoading || (isStats26Loading && !stats26);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Хяналтын самбар</h1>
                    <p className="text-xs text-muted-foreground">
                        {kamName
                            ? `KAM: ${kamName} — өөрийн дата`
                            : 'Түмэн Тээх CRM — ерөнхий тойм'}
                    </p>
                </div>
            </header>

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="space-y-4 p-6">
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <Skeleton key={i} className="h-24 w-full" />
                            ))}
                        </div>
                        <Skeleton className="h-28 w-full" />
                        <Skeleton className="h-64 w-full" />
                    </div>
                ) : (
                    <div className="space-y-6 p-6">
                        {/* (a) KPI мөр */}
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <StatCard
                                label="2026 Орлого"
                                value={`₮${Math.round(kpi.revenue / 1e6).toLocaleString('en-US')}M`}
                                sublabel={kamName ?? 'Нийт'}
                                icon={<Banknote className="h-4 w-4" />}
                                accent="#4F46E5"
                            />
                            <StatCard
                                label="2026 Ашиг"
                                value={`₮${Math.round(kpi.profit / 1e6).toLocaleString('en-US')}M`}
                                sublabel={kamName ?? 'Нийт'}
                                icon={<TrendingUp className="h-4 w-4" />}
                                accent="#059669"
                            />
                            <StatCard
                                label="Нээлттэй үнийн санал"
                                value={kpi.openQuotes}
                                sublabel="Илгээсэн төлөвтэй"
                                icon={<FileSpreadsheet className="h-4 w-4" />}
                                accent="#0ea5e9"
                            />
                            <StatCard
                                label="Нээлттэй даалгавар"
                                value={kpi.openTasks}
                                sublabel={
                                    kpi.overdueTasks > 0
                                        ? `${kpi.overdueTasks} хугацаа хэтэрсэн`
                                        : 'Бүгд хугацаандаа'
                                }
                                icon={<CheckSquare className="h-4 w-4" />}
                                accent={kpi.overdueTasks > 0 ? '#ef4444' : '#f59e0b'}
                            />
                        </div>

                        {/* (b) 2026 зорилт + alert chips */}
                        <div className="rounded-xl border bg-card p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-sm font-semibold">
                                    🎯 2026 жилийн зорилт (ашиг)
                                </div>
                                <div className="text-xs tabular-nums text-muted-foreground">
                                    ₮{Math.round(alerts.actualM).toLocaleString('en-US')}M / ₮
                                    {TARGET_2026.total.toLocaleString('en-US')}M ·{' '}
                                    <span className="font-semibold text-foreground">
                                        {alerts.pct}%
                                    </span>
                                </div>
                            </div>
                            <div className="mt-2.5 h-[11px] overflow-hidden rounded-full bg-muted">
                                <div
                                    className="h-full rounded-full transition-all"
                                    style={{
                                        width: `${Math.min(100, Math.max(0, alerts.pct))}%`,
                                        backgroundColor: TARGET_BAR_HEX[alerts.tone],
                                    }}
                                />
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <Link
                                    href="/crm/deals"
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                                        alerts.overdue > 0
                                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400'
                                            : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    ⏰ Хугацаа хэтэрсэн хүсэлт: {alerts.overdue}
                                </Link>
                                <Link
                                    href="/crm/analytics"
                                    className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted"
                                >
                                    😊 NPS дундаж: {alerts.avgNps ?? '—'}
                                </Link>
                                <Link
                                    href="/crm/analytics"
                                    className={cn(
                                        'rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors',
                                        alerts.atRisk > 0
                                            ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400'
                                            : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted',
                                    )}
                                >
                                    🔴 Эрсдэлтэй (NPS≤6): {alerts.atRisk}
                                </Link>
                            </div>
                        </div>

                        {/* (c) Funnel тоолол */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                            {FUNNEL_STAGES.map((s) => (
                                <FunnelTile
                                    key={s}
                                    stage={s}
                                    count={funnelCounts.get(s) ?? 0}
                                />
                            ))}
                            <FunnelTile stage="lost" count={funnelCounts.get('lost') ?? 0} />
                        </div>

                        {/* (d) Сануулга */}
                        <RemindersCard items={reminders} />

                        {/* (e) 2026 сарын chart */}
                        <ChartCard
                            title="📊 2026 сарын борлуулалт / ашиг"
                            description="₮M · шар тасархай шугам = сарын зорилт (ашиг)"
                        >
                            <MonthlyChart
                                monthlyRevenue={stats26?.monthlyRevenue ?? []}
                                monthlyProfit={stats26?.monthlyProfit ?? []}
                            />
                        </ChartCard>

                        {/* (f) Багийн + KAM гүйцэтгэл */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <ChartCard
                                title="👥 Багийн 2026"
                                description="Ашиг ₮M · зорилттой харьцуулав"
                            >
                                <div className="space-y-3">
                                    {TEAMS.map((team) => (
                                        <PlanBarRow
                                            key={team}
                                            label={team}
                                            actualM={(stats26?.byTeam?.[team]?.profit ?? 0) / 1e6}
                                            targetM={TARGET_2026.team[team] ?? 0}
                                        />
                                    ))}
                                </div>
                            </ChartCard>
                            <ChartCard
                                title="👤 KAM гүйцэтгэл"
                                description="Ашиг ₮M · зорилттой харьцуулав"
                            >
                                <div className="space-y-3">
                                    {KAM_LIST.map((k) => (
                                        <PlanBarRow
                                            key={k}
                                            avatar
                                            label={k}
                                            actualM={(stats26?.byKam?.[k]?.profit ?? 0) / 1e6}
                                            targetM={TARGET_2026.kam[k] ?? 0}
                                        />
                                    ))}
                                </div>
                            </ChartCard>
                        </div>

                        {/* (g) Жилийн хайрцгууд */}
                        <div>
                            <div className="mb-2 flex items-baseline gap-2">
                                <h2 className="text-sm font-semibold">📅 Жил бүрийн борлуулалт</h2>
                                <span className="text-[11px] text-muted-foreground">
                                    · box дээр дарж дэлгэрэнгүй харна
                                </span>
                            </div>
                            <YearBoxes stats={yearStats} currentYear={CUR_YEAR} />
                        </div>

                        {/* (h) Админ картууд */}
                        {isDirector && (
                            <AdminCards
                                syncStatus={syncStatus}
                                employees={crmEmployees}
                                actor={actor}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function FunnelTile({ stage, count }: { stage: FunnelStage; count: number }) {
    return (
        <Link
            href={`/crm/companies?stage=${stage}`}
            className="group rounded-xl border bg-card p-3 transition-all hover:-translate-y-0.5 hover:border-cyan-600/40 hover:shadow-md"
        >
            <div className="flex items-center gap-1.5">
                <span className={cn('h-2 w-2 shrink-0 rounded-full', STAGE_DOT[stage])} />
                <span className="truncate text-[11px] font-medium text-muted-foreground group-hover:text-foreground">
                    {stageShort(stage)}
                </span>
            </div>
            <div className="mt-1.5 text-xl font-bold tabular-nums tracking-tight">{count}</div>
        </Link>
    );
}
