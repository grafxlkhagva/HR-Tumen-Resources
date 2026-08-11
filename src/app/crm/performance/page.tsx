'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Legend,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
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
import { BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    KAM_LIST,
    SEGMENTS,
    TARGET_2026,
    TEAM_OF,
    TEAMS,
    type OrderYearStats,
} from '../_types';
import { marginTone, planTone, TONE_BG, TONE_TEXT } from '../_lib/stats';
import { AnalyticsTabs } from './_components/analytics-tabs';

/** Сегмент ↔ багийн зорилтын харгалзаа (docs/CRM-INTEGRATION.md). */
const SEG_TEAM: Record<string, string> = {
    Inbound: 'Орон нутаг',
    International: 'Олон улс',
    'Project&Dist': 'Төсөл/Түгээлт',
};

/** Улирлын зорилтын жин — TARGET_2026.monthly нийлбэрээр: [255, 390, 450, 405]. */
const Q_PLAN = [0, 1, 2, 3].map((qi) =>
    TARGET_2026.monthly.slice(qi * 3, qi * 3 + 3).reduce((a, b) => a + b, 0),
);

/** ₮M утга (аль хэдийн саяар) — таслалтай бүхэл. */
function fmtM(v: number): string {
    return `₮${Math.round(v).toLocaleString('en-US')}M`;
}

interface PerfRow {
    key: string;
    label: string;
    sub?: string;
    actualM: number;
    targetM: number;
    pct: number;
    marginPct: number;
    trips: number;
}

function buildPerfRow(
    key: string,
    label: string,
    sub: string | undefined,
    st: { revenue: number; profit: number; trips: number } | undefined,
    targetM: number,
): PerfRow {
    const actualM = (st?.profit ?? 0) / 1e6;
    const rev = st?.revenue ?? 0;
    return {
        key,
        label,
        sub,
        actualM,
        targetM,
        pct: targetM > 0 ? (actualM / targetM) * 100 : 0,
        marginPct: rev > 0 ? Math.floor(((st?.profit ?? 0) * 100) / rev) : 0,
        trips: st?.trips ?? 0,
    };
}

export default function CrmPerformancePage() {
    const { firestore } = useFirebase();

    const statsRef = useMemoFirebase(
        () => (firestore ? collection(firestore, 'crm_order_stats') : null),
        [firestore],
    );
    const { data: yearStats, isLoading } = useCollection<OrderYearStats>(statsRef);

    const y2026 = React.useMemo(
        () => (yearStats || []).find((s) => s.year === 2026),
        [yearStats],
    );

    const totalActualM = (y2026?.profit ?? 0) / 1e6;
    const totalPct = (totalActualM / TARGET_2026.total) * 100;

    /** Улирлын бодит (нийт) — 2026 сарын ашгийн массиваас. */
    const qActuals = React.useMemo(() => {
        const monthly = y2026?.monthlyProfit ?? [];
        return [0, 1, 2, 3].map(
            (qi) =>
                monthly.slice(qi * 3, qi * 3 + 3).reduce((a, b) => a + (b ?? 0), 0) / 1e6,
        );
    }, [y2026]);

    /** Сегмент тус бүрийн зорилт vs бодит. */
    const segRows = React.useMemo(
        () =>
            SEGMENTS.map((seg) => {
                const team = SEG_TEAM[seg];
                const targetM = TARGET_2026.team[team] ?? 0;
                const st = y2026?.bySegment?.[seg];
                const row = buildPerfRow(
                    seg,
                    seg,
                    `${team} · ${KAM_LIST.filter((k) => TEAM_OF[k] === team).join(', ')}`,
                    st,
                    targetM,
                );
                return {
                    ...row,
                    qTargets: Q_PLAN.map((qp) => (targetM * qp) / TARGET_2026.total),
                };
            }),
        [y2026],
    );

    /** Жилийн цуврал 2022–2026 (₮M). */
    const yearSeries = React.useMemo(
        () =>
            [...(yearStats || [])]
                .sort((a, b) => a.year - b.year)
                .map((s) => ({
                    year: String(s.year),
                    revenue: Math.round(s.revenue / 1e6),
                    profit: Math.round(s.profit / 1e6),
                    marginPct: s.revenue > 0 ? Math.floor((s.profit * 100) / s.revenue) : 0,
                    trips: s.trips,
                })),
        [yearStats],
    );

    const kamRows = React.useMemo(
        () =>
            KAM_LIST.map((k) =>
                buildPerfRow(k, k, TEAM_OF[k], y2026?.byKam?.[k], TARGET_2026.kam[k] ?? 0),
            ),
        [y2026],
    );

    const teamRows = React.useMemo(
        () =>
            TEAMS.map((team) =>
                buildPerfRow(
                    team,
                    team,
                    KAM_LIST.filter((k) => TEAM_OF[k] === team).join(', '),
                    y2026?.byTeam?.[team],
                    TARGET_2026.team[team] ?? 0,
                ),
            ),
        [y2026],
    );

    const isEmpty = !isLoading && (yearStats || []).length === 0;

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="text-lg font-semibold tracking-tight">Гүйцэтгэл &amp; План</h1>
                    <p className="text-xs text-muted-foreground">
                        Сегментийн зорилт vs бодит — улирлаар (шимтгэл ₮M)
                    </p>
                </div>
            </header>

            <AnalyticsTabs />

            <div className="flex-1 overflow-auto">
                {isLoading ? (
                    <div className="space-y-4 p-6">
                        <Skeleton className="h-24 w-full" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-80 w-full" />
                    </div>
                ) : isEmpty ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-6 p-6">
                        {/* Won-bar: нийт зорилт / бодит / биелэлт */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <StatTile
                                label="2026 нийт зорилт"
                                value={fmtM(TARGET_2026.total)}
                                sub="Зорилт: plan dashboard-уудаас"
                            />
                            <StatTile
                                label="Бодит (одоог хүртэл)"
                                value={fmtM(totalActualM)}
                                valueClass="text-emerald-600 dark:text-emerald-400"
                                sub={`${y2026?.trips ?? 0} рейс · ${y2026?.customers ?? 0} харилцагч`}
                            />
                            <StatTile
                                label="Биелэлт"
                                value={`${Math.round(totalPct)}%`}
                                valueClass={
                                    totalPct >= 100
                                        ? 'text-emerald-600 dark:text-emerald-400'
                                        : 'text-cyan-600 dark:text-cyan-400'
                                }
                                sub="2026 оны жилийн зорилтоос"
                            />
                        </div>

                        {/* Сегментийн картууд */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {segRows.map((s) => (
                                <div key={s.key} className="rounded-xl border bg-card p-4">
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                            <div className="text-sm font-semibold">{s.label}</div>
                                            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                                                {s.sub}
                                            </div>
                                        </div>
                                        <div
                                            className={cn(
                                                'text-lg font-bold tabular-nums',
                                                s.pct >= 100
                                                    ? 'text-emerald-600 dark:text-emerald-400'
                                                    : 'text-cyan-600 dark:text-cyan-400',
                                            )}
                                        >
                                            {Math.round(s.pct)}%
                                        </div>
                                    </div>
                                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
                                        <div
                                            className={cn(
                                                'h-full rounded-full transition-all',
                                                s.pct >= 100 ? 'bg-emerald-500' : 'bg-cyan-600',
                                            )}
                                            style={{ width: `${Math.min(100, s.pct)}%` }}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-[11px]">
                                        <span className="font-medium tabular-nums">
                                            Бодит {fmtM(s.actualM)}
                                        </span>
                                        <span className="tabular-nums text-muted-foreground">
                                            Зорилт {fmtM(s.targetM)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Улирлын харьцуулалт */}
                        <div className="overflow-hidden rounded-xl border bg-card">
                            <div className="border-b px-4 py-3">
                                <h3 className="text-sm font-semibold">
                                    Улирлын харьцуулалт — зорилт vs бодит (2026)
                                </h3>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    2026 бодит {fmtM(totalActualM)}
                                </p>
                            </div>
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="min-w-[160px]">Сегмент</TableHead>
                                            {['Q1', 'Q2', 'Q3', 'Q4'].map((qn) => (
                                                <TableHead key={qn} className="text-right">
                                                    {qn}
                                                </TableHead>
                                            ))}
                                            <TableHead className="text-right">Жил зорилт</TableHead>
                                            <TableHead className="text-right">Бодит</TableHead>
                                            <TableHead className="text-right">Биелэлт %</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {segRows.map((s) => (
                                            <TableRow key={s.key}>
                                                <TableCell>
                                                    <div className="text-sm font-medium">
                                                        {s.label}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {SEG_TEAM[s.key]}
                                                    </div>
                                                </TableCell>
                                                {s.qTargets.map((qt, i) => (
                                                    <TableCell
                                                        key={i}
                                                        className="text-right text-sm tabular-nums text-muted-foreground"
                                                    >
                                                        {fmtM(qt)}
                                                    </TableCell>
                                                ))}
                                                <TableCell className="text-right text-sm font-medium tabular-nums">
                                                    {fmtM(s.targetM)}
                                                </TableCell>
                                                <TableCell
                                                    className={cn(
                                                        'text-right text-sm font-medium tabular-nums',
                                                        s.actualM >= s.targetM &&
                                                            'text-emerald-600 dark:text-emerald-400',
                                                    )}
                                                >
                                                    {fmtM(s.actualM)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <PctPill pct={s.pct} />
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        <TableRow className="bg-muted/30 font-semibold">
                                            <TableCell className="text-sm">Нийт</TableCell>
                                            {Q_PLAN.map((qp, i) => (
                                                <TableCell
                                                    key={i}
                                                    className="text-right text-sm tabular-nums"
                                                >
                                                    {fmtM(qp)}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right text-sm tabular-nums">
                                                {fmtM(TARGET_2026.total)}
                                            </TableCell>
                                            <TableCell className="text-right text-sm tabular-nums">
                                                {fmtM(totalActualM)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <PctPill pct={totalPct} />
                                            </TableCell>
                                        </TableRow>
                                        <TableRow>
                                            <TableCell className="text-sm text-muted-foreground">
                                                Бодит — улирлаар (нийт)
                                            </TableCell>
                                            {qActuals.map((qa, i) => (
                                                <TableCell
                                                    key={i}
                                                    className={cn(
                                                        'text-right text-sm font-medium tabular-nums',
                                                        qa >= Q_PLAN[i]
                                                            ? 'text-emerald-600 dark:text-emerald-400'
                                                            : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {fmtM(qa)}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                —
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                —
                                            </TableCell>
                                            <TableCell className="text-right text-sm text-muted-foreground">
                                                —
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
                                Улирал: Q1(1-3р) Q2(4-6р) Q3(7-9р) Q4(10-12р) · Гүйцэтгэл шийтээр
                                тооцов · Сегментийн улирлын бодит задаргаа агрегатад байхгүй тул
                                улирлын бодит нь нийт дүнгээр.
                            </p>
                        </div>

                        {/* Жилийн цуврал 2022–2026 */}
                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <div className="flex flex-col rounded-xl border bg-card">
                                <div className="border-b px-4 py-3">
                                    <h3 className="text-sm font-semibold">
                                        📊 Жилийн борлуулалт / ашиг (₮M)
                                    </h3>
                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                        2022–2026 · Sheets синкийн агрегат
                                    </p>
                                </div>
                                <div className="min-h-0 flex-1 p-4">
                                    {yearSeries.length === 0 ? (
                                        <div className="flex h-[260px] items-center justify-center text-xs text-muted-foreground">
                                            Дата алга
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height={260}>
                                            <BarChart
                                                data={yearSeries}
                                                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                                            >
                                                <CartesianGrid
                                                    strokeDasharray="3 3"
                                                    stroke="#e2e8f0"
                                                    vertical={false}
                                                />
                                                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                                                <YAxis
                                                    tick={{ fontSize: 10 }}
                                                    tickFormatter={(v) => `${v}M`}
                                                />
                                                <Tooltip
                                                    content={<YearTooltip />}
                                                    cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                                                />
                                                <Legend
                                                    wrapperStyle={{ fontSize: 11 }}
                                                    iconSize={10}
                                                />
                                                <Bar
                                                    dataKey="revenue"
                                                    name="Борлуулалт"
                                                    fill="#0891b2"
                                                    radius={[4, 4, 0, 0]}
                                                />
                                                <Bar
                                                    dataKey="profit"
                                                    name="Ашиг"
                                                    fill="#10b981"
                                                    radius={[4, 4, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    )}
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border bg-card">
                                <div className="border-b px-4 py-3">
                                    <h3 className="text-sm font-semibold">Жилийн түүх (₮M)</h3>
                                </div>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Жил</TableHead>
                                            <TableHead className="text-right">Борлуулалт</TableHead>
                                            <TableHead className="text-right">Ашиг</TableHead>
                                            <TableHead className="text-right">Маржин</TableHead>
                                            <TableHead className="text-right">Рейс</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {yearSeries.length === 0 ? (
                                            <TableRow>
                                                <TableCell
                                                    colSpan={5}
                                                    className="py-8 text-center text-xs text-muted-foreground"
                                                >
                                                    Дата алга
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            [...yearSeries].reverse().map((y) => (
                                                <TableRow
                                                    key={y.year}
                                                    className={cn(
                                                        y.year === '2026' && 'font-semibold',
                                                    )}
                                                >
                                                    <TableCell className="text-sm">
                                                        {y.year}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {fmtM(y.revenue)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                                                        {fmtM(y.profit)}
                                                    </TableCell>
                                                    <TableCell
                                                        className={cn(
                                                            'text-right text-sm font-medium tabular-nums',
                                                            TONE_TEXT[marginTone(y.marginPct)],
                                                        )}
                                                    >
                                                        {y.marginPct}%
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                                                        {y.trips.toLocaleString('en-US')}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* KAM гүйцэтгэл */}
                        <div className="rounded-xl border bg-card">
                            <div className="border-b px-4 py-3">
                                <h3 className="text-sm font-semibold">KAM гүйцэтгэл (жил, ₮M)</h3>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    2026 бодит ашиг vs зорилт · маржин · рейс
                                </p>
                            </div>
                            <div className="space-y-1 p-4">
                                {kamRows.map((r) => (
                                    <PerfBarRow key={r.key} row={r} />
                                ))}
                            </div>
                            <div className="border-t px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Багаар
                            </div>
                            <div className="space-y-1 p-4 pt-2">
                                {teamRows.map((r) => (
                                    <PerfBarRow key={r.key} row={r} team />
                                ))}
                            </div>
                            <p className="border-t px-4 py-2 text-[11px] text-muted-foreground">
                                ⚠️ KAM зорилтын дүн тодруулах шаардлагатай
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface YearTooltipPayload {
    payload: {
        year: string;
        revenue: number;
        profit: number;
        marginPct: number;
        trips: number;
    };
}

function YearTooltip({
    active,
    payload,
}: {
    active?: boolean;
    payload?: YearTooltipPayload[];
}) {
    if (!active || !payload || payload.length === 0) return null;
    const d = payload[0].payload;
    return (
        <div className="space-y-0.5 rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
            <div className="font-semibold">{d.year} он</div>
            <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Борлуулалт</span>
                <span className="font-medium tabular-nums">{fmtM(d.revenue)}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Ашиг</span>
                <span className="font-medium tabular-nums text-emerald-600 dark:text-emerald-400">
                    {fmtM(d.profit)}
                </span>
            </div>
            <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Маржин</span>
                <span className="tabular-nums">{d.marginPct}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">Рейс</span>
                <span className="tabular-nums">{d.trips.toLocaleString('en-US')}</span>
            </div>
        </div>
    );
}

function StatTile({
    label,
    value,
    sub,
    valueClass,
}: {
    label: string;
    value: string;
    sub?: string;
    valueClass?: string;
}) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
            </div>
            <div className={cn('mt-2 text-2xl font-semibold tabular-nums tracking-tight', valueClass)}>
                {value}
            </div>
            {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
        </div>
    );
}

function PctPill({ pct }: { pct: number }) {
    return (
        <span
            className={cn(
                'rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums',
                TONE_BG[planTone(pct)],
            )}
        >
            {Math.round(pct)}%
        </span>
    );
}

/** KAM/багийн зорилт-биелэлтийн мөр — прототипийн kam-row bar. */
function PerfBarRow({ row, team }: { row: PerfRow; team?: boolean }) {
    // Прототипийн дүрэм: ≥100% good, ≥50% accent, бусад warn.
    const fill =
        row.pct >= 100 ? 'bg-emerald-500' : row.pct >= 50 ? 'bg-cyan-600' : 'bg-amber-500';
    return (
        <div className="flex items-center gap-3 py-1.5">
            <div
                className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white',
                    team ? 'bg-slate-500' : 'bg-cyan-600',
                )}
                title={row.label}
            >
                {row.label.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                    <span className={cn('truncate', team ? 'font-semibold' : 'font-medium')}>
                        {row.label}
                        {row.sub && (
                            <span className="ml-1 font-normal text-muted-foreground">
                                · {row.sub}
                            </span>
                        )}
                    </span>
                    <span className="whitespace-nowrap tabular-nums text-muted-foreground">
                        <span className="font-medium text-foreground">{fmtM(row.actualM)}</span>
                        /{fmtM(row.targetM)} · {Math.round(row.pct)}%
                    </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                        className={cn('h-full rounded-full transition-all', fill)}
                        style={{ width: `${Math.min(100, Math.max(0, row.pct))}%` }}
                    />
                </div>
            </div>
            <div className="w-24 shrink-0 text-right">
                <div
                    className={cn(
                        'text-xs font-semibold tabular-nums',
                        TONE_TEXT[marginTone(row.marginPct)],
                    )}
                >
                    {row.marginPct}%
                </div>
                <div className="text-[10px] tabular-nums text-muted-foreground">
                    {row.trips.toLocaleString('en-US')} рейс
                </div>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <BarChart3 className="h-7 w-7 text-cyan-600" />
                </div>
                <h3 className="text-base font-semibold">Гүйцэтгэлийн дата алга</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Sheets синк хийгдсэний дараа жил, сегмент, KAM-ын агрегат энд харагдана.
                </p>
            </div>
        </div>
    );
}
