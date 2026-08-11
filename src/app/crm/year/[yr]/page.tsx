'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { collection, doc } from 'firebase/firestore';
import { useCollection, useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowLeft, CalendarRange } from 'lucide-react';
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { KAM_LIST, TARGET_2026, TEAMS, TEAM_OF, type CompanyStats, type OrderYearStats } from '../../_types';
import { TONE_BG, TONE_TEXT, formatM, marginTone, planTone } from '../../_lib/stats';
import { ChartCard } from '../../reports/_components/chart-card';

const YEARS = [2022, 2023, 2024, 2025, 2026];

/** ₮M-ээр өгөгдсөн (аль хэдийн саяар) утгыг харуулах. */
function fmtMM(v: number): string {
    return `₮${Math.round(v).toLocaleString('en-US')}M`;
}

function pctOf(actual: number, target: number): number {
    return target > 0 ? Math.round((actual / target) * 100) : 0;
}

function PlanPill({ pct }: { pct: number }) {
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold tabular-nums',
                TONE_BG[planTone(pct)],
            )}
        >
            {pct}%
        </span>
    );
}

export default function CrmYearPage() {
    const params = useParams();
    const raw = Array.isArray(params.yr) ? params.yr[0] : params.yr;
    const yr = Number(raw);
    const validYear = YEARS.includes(yr);

    const { firestore } = useFirebase();

    const statsRef = useMemoFirebase(
        () => (firestore && validYear ? doc(firestore, 'crm_order_stats', String(yr)) : null),
        [firestore, yr, validYear],
    );
    const { data: stats, isLoading: isLoadingStats } = useDoc<OrderYearStats>(statsRef);

    const companyStatsRef = useMemoFirebase(
        () => (firestore && validYear ? collection(firestore, 'crm_company_stats') : null),
        [firestore, validYear],
    );
    const { data: companyStats, isLoading: isLoadingCompanies } =
        useCollection<CompanyStats>(companyStatsRef);

    const yearKey = String(yr);

    const companies = React.useMemo(() => {
        return (companyStats || [])
            .map((c) => ({ stats: c, y: c.years?.[yearKey] }))
            .filter((c) => c.y && (c.y.revenue > 0 || c.y.trips > 0))
            .sort((a, b) => (b.y!.revenue ?? 0) - (a.y!.revenue ?? 0));
    }, [companyStats, yearKey]);

    const chartData = React.useMemo(() => {
        if (!stats) return [];
        return Array.from({ length: 12 }, (_, i) => ({
            month: `${i + 1}-р`,
            rev: Math.round((stats.monthlyRevenue?.[i] ?? 0) / 1e6),
            pro: Math.round((stats.monthlyProfit?.[i] ?? 0) / 1e6),
        }));
    }, [stats]);

    const marginPct =
        stats && stats.revenue > 0 ? Math.floor((stats.profit * 100) / stats.revenue) : 0;

    // ── 2026 план vs гүйцэтгэл (₮M ашгаар) ──
    const plan = React.useMemo(() => {
        if (yr !== 2026 || !stats) return null;
        const actualMonthly = Array.from(
            { length: 12 },
            (_, i) => (stats.monthlyProfit?.[i] ?? 0) / 1e6,
        );
        const actualTotal = stats.profit / 1e6;
        const quarters = Array.from({ length: 4 }, (_, q) => {
            const target = TARGET_2026.monthly.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b, 0);
            const actual = actualMonthly.slice(q * 3, q * 3 + 3).reduce((a, b) => a + b, 0);
            return { label: `Q${q + 1}`, target, actual, pct: pctOf(actual, target) };
        });
        const teams = TEAMS.map((t) => {
            const target = TARGET_2026.team[t] ?? 0;
            const actual = (stats.byTeam?.[t]?.profit ?? 0) / 1e6;
            return { team: t, target, actual, pct: pctOf(actual, target) };
        });
        const kams = KAM_LIST.map((k) => {
            const target = TARGET_2026.kam[k] ?? 0;
            const actual = (stats.byKam?.[k]?.profit ?? 0) / 1e6;
            return { kam: k, team: TEAM_OF[k] ?? '—', target, actual, pct: pctOf(actual, target) };
        });
        return {
            totalTarget: TARGET_2026.total,
            actualTotal,
            totalPct: pctOf(actualTotal, TARGET_2026.total),
            actualMonthly,
            quarters,
            teams,
            kams,
        };
    }, [yr, stats]);

    const isLoading = isLoadingStats || isLoadingCompanies;

    return (
        <div className="flex h-full flex-col">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-4">
                <div>
                    <Link
                        href="/crm/dashboard"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-cyan-700"
                    >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Хяналт
                    </Link>
                    <h1 className="text-lg font-semibold tracking-tight">
                        📅 {validYear ? yr : '—'} оны дэлгэрэнгүй
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Бүх компани, сар сараар — борлуулалт ба ашиг
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    {YEARS.map((y) => (
                        <Link
                            key={y}
                            href={`/crm/year/${y}`}
                            className={cn(
                                'rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition-colors',
                                y === yr
                                    ? 'border-cyan-600 bg-cyan-600 text-white'
                                    : 'bg-card text-muted-foreground hover:border-cyan-600 hover:text-cyan-700',
                            )}
                        >
                            {y}
                        </Link>
                    ))}
                </div>
            </header>

            <div className="flex-1 overflow-auto">
                {!validYear ? (
                    <EmptyBlock text="Буруу он — 2022–2026 оноос сонгоно уу." />
                ) : isLoading && !stats ? (
                    <div className="space-y-4 p-6">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-72 w-full" />
                        <Skeleton className="h-96 w-full" />
                    </div>
                ) : !stats ? (
                    <EmptyBlock text={`${yr} оны дата алга — эхлээд Sheets синк ажиллуулна уу.`} />
                ) : (
                    <div className="space-y-6 p-6">
                        {/* Нийт дүн */}
                        <div className="grid grid-cols-2 gap-3 rounded-xl border bg-card p-4 sm:grid-cols-5">
                            <TotalItem label="Нийт борлуулалт" value={formatM(stats.revenue)} />
                            <TotalItem
                                label="Ашиг"
                                value={formatM(stats.profit)}
                                valueClass="text-emerald-600 dark:text-emerald-400"
                            />
                            <TotalItem
                                label="Маржин"
                                value={`${marginPct}%`}
                                valueClass={TONE_TEXT[marginTone(marginPct)]}
                            />
                            <TotalItem
                                label="Харилцагч"
                                value={stats.customers.toLocaleString('en-US')}
                            />
                            <TotalItem label="Рейс" value={stats.trips.toLocaleString('en-US')} />
                        </div>

                        {/* Сарын бар график */}
                        <ChartCard
                            title="📊 Сарын борлуулалт / ашиг"
                            description={`${yr} он · ₮ саяар`}
                        >
                            <ResponsiveContainer width="100%" height={280}>
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 8, right: 8, left: 8, bottom: 4 }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                        stroke="#94a3b833"
                                        vertical={false}
                                    />
                                    <XAxis dataKey="month" tick={{ fontSize: 10 }} interval={0} />
                                    <YAxis
                                        tick={{ fontSize: 10 }}
                                        tickFormatter={(v: number) => `${v.toLocaleString('en-US')}M`}
                                    />
                                    <Tooltip
                                        formatter={(value: number, name: string) => [
                                            fmtMM(value),
                                            name,
                                        ]}
                                        labelFormatter={(l) => `${l} сар`}
                                        cursor={{ fill: '#94a3b81a' }}
                                        contentStyle={{
                                            fontSize: 12,
                                            borderRadius: 8,
                                        }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: 11 }} />
                                    <Bar
                                        dataKey="rev"
                                        name="Борлуулалт"
                                        fill="#6366f1"
                                        radius={[3, 3, 0, 0]}
                                    />
                                    <Bar
                                        dataKey="pro"
                                        name="Ашиг"
                                        fill="#10b981"
                                        radius={[3, 3, 0, 0]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </ChartCard>

                        {/* 2026 Зорилт vs Гүйцэтгэл */}
                        {plan && (
                            <div className="space-y-4 rounded-xl border bg-card p-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-sm font-semibold">
                                        🎯 2026 Зорилт vs Гүйцэтгэл
                                    </h3>
                                    <span className="text-[11px] text-muted-foreground">
                                        · ашиг (₮сая)
                                    </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-sm">
                                    <span>
                                        Жилийн зорилт{' '}
                                        <b className="tabular-nums">{fmtMM(plan.totalTarget)}</b> ·
                                        Гүйцэтгэл{' '}
                                        <b className="tabular-nums text-emerald-600 dark:text-emerald-400">
                                            {fmtMM(plan.actualTotal)}
                                        </b>
                                    </span>
                                    <PlanPill pct={plan.totalPct} />
                                </div>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    <div className="rounded-lg border">
                                        <div className="border-b px-3 py-2 text-xs font-semibold">
                                            📊 Улирлаар
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Улирал</TableHead>
                                                    <TableHead className="text-right">Зорилт</TableHead>
                                                    <TableHead className="text-right">Гүйцэтгэл</TableHead>
                                                    <TableHead className="text-right">%</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {plan.quarters.map((q) => (
                                                    <TableRow key={q.label}>
                                                        <TableCell className="text-sm font-medium">
                                                            {q.label}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums">
                                                            {fmtMM(q.target)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums">
                                                            {fmtMM(q.actual)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <PlanPill pct={q.pct} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="rounded-lg border">
                                        <div className="border-b px-3 py-2 text-xs font-semibold">
                                            👥 Багаар
                                        </div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Баг</TableHead>
                                                    <TableHead className="text-right">Зорилт</TableHead>
                                                    <TableHead className="text-right">Гүйцэтгэл</TableHead>
                                                    <TableHead className="text-right">%</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {plan.teams.map((t) => (
                                                    <TableRow key={t.team}>
                                                        <TableCell className="text-sm font-medium">
                                                            {t.team}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums">
                                                            {fmtMM(t.target)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums">
                                                            {fmtMM(t.actual)}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <PlanPill pct={t.pct} />
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>

                                <div className="rounded-lg border">
                                    <div className="border-b px-3 py-2 text-xs font-semibold">
                                        👤 KAM-аар
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>KAM</TableHead>
                                                <TableHead>Баг</TableHead>
                                                <TableHead className="text-right">Зорилт</TableHead>
                                                <TableHead className="text-right">Гүйцэтгэл</TableHead>
                                                <TableHead className="text-right">%</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {plan.kams.map((k) => (
                                                <TableRow key={k.kam}>
                                                    <TableCell className="text-sm font-medium">
                                                        {k.kam}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {k.team}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {fmtMM(k.target)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {fmtMM(k.actual)}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <PlanPill pct={k.pct} />
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="rounded-lg border">
                                    <div className="border-b px-3 py-2 text-xs font-semibold">
                                        📆 Сараар (зорилт / гүйцэтгэл / %)
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr className="border-b text-muted-foreground">
                                                    <th className="px-3 py-2 text-left font-medium"> </th>
                                                    {TARGET_2026.monthly.map((_, i) => (
                                                        <th
                                                            key={i}
                                                            className="px-2 py-2 text-right font-medium tabular-nums"
                                                        >
                                                            {i + 1}-р
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b">
                                                    <td className="px-3 py-2 font-medium">Зорилт</td>
                                                    {TARGET_2026.monthly.map((t, i) => (
                                                        <td
                                                            key={i}
                                                            className="px-2 py-2 text-right tabular-nums"
                                                        >
                                                            {t}
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr className="border-b">
                                                    <td className="px-3 py-2 font-medium">Гүйцэтгэл</td>
                                                    {plan.actualMonthly.map((v, i) => (
                                                        <td
                                                            key={i}
                                                            className="px-2 py-2 text-right tabular-nums"
                                                        >
                                                            {Math.round(v)}
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr>
                                                    <td className="px-3 py-2 font-medium">%</td>
                                                    {plan.actualMonthly.map((v, i) => {
                                                        const p = pctOf(v, TARGET_2026.monthly[i]);
                                                        return (
                                                            <td
                                                                key={i}
                                                                className={cn(
                                                                    'px-2 py-2 text-right font-bold tabular-nums',
                                                                    TONE_TEXT[planTone(p)],
                                                                )}
                                                            >
                                                                {p}%
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Доод хэсэг: сар / баг / KAM + компаниуд */}
                        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                            <div className="space-y-4">
                                <div className="rounded-xl border bg-card">
                                    <div className="border-b px-4 py-2.5 text-sm font-semibold">
                                        📆 Сар сараар
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Сар</TableHead>
                                                <TableHead className="text-right">Борлуулалт</TableHead>
                                                <TableHead className="text-right">Ашиг</TableHead>
                                                <TableHead className="text-right">Рейс</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <TableRow key={i}>
                                                    <TableCell className="text-sm">{i + 1}-р сар</TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {formatM(stats.monthlyRevenue?.[i] ?? 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                                                        {formatM(stats.monthlyProfit?.[i] ?? 0)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-sm tabular-nums">
                                                        {(stats.monthlyTrips?.[i] ?? 0).toLocaleString('en-US')}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="rounded-xl border bg-card">
                                    <div className="border-b px-4 py-2.5 text-sm font-semibold">
                                        👥 3 багаар
                                    </div>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Баг</TableHead>
                                                <TableHead className="text-right">Борлуулалт</TableHead>
                                                <TableHead className="text-right">Ашиг</TableHead>
                                                <TableHead className="text-right">Рейс</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {TEAMS.map((t) => {
                                                const v = stats.byTeam?.[t];
                                                return (
                                                    <TableRow key={t}>
                                                        <TableCell className="text-sm font-medium">
                                                            {t}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums">
                                                            {formatM(v?.revenue ?? 0)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                                                            {formatM(v?.profit ?? 0)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums">
                                                            {(v?.trips ?? 0).toLocaleString('en-US')}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="rounded-xl border bg-card">
                                    <div className="border-b px-4 py-2.5 text-sm font-semibold">
                                        👤 KAM-аар
                                    </div>
                                    {KAM_LIST.some((k) => stats.byKam?.[k]?.trips) ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>KAM</TableHead>
                                                    <TableHead>Баг</TableHead>
                                                    <TableHead className="text-right">Борлуулалт</TableHead>
                                                    <TableHead className="text-right">Ашиг</TableHead>
                                                    <TableHead className="text-right">Рейс</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {KAM_LIST.filter((k) => stats.byKam?.[k]?.trips).map(
                                                    (k) => {
                                                        const v = stats.byKam[k];
                                                        return (
                                                            <TableRow key={k}>
                                                                <TableCell className="text-sm font-medium">
                                                                    {k}
                                                                </TableCell>
                                                                <TableCell className="text-sm text-muted-foreground">
                                                                    {TEAM_OF[k] ?? '—'}
                                                                </TableCell>
                                                                <TableCell className="text-right text-sm tabular-nums">
                                                                    {formatM(v.revenue)}
                                                                </TableCell>
                                                                <TableCell className="text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                                                                    {formatM(v.profit)}
                                                                </TableCell>
                                                                <TableCell className="text-right text-sm tabular-nums">
                                                                    {v.trips.toLocaleString('en-US')}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    },
                                                )}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                                            KAM бүртгэлгүй
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="rounded-xl border bg-card xl:col-span-2">
                                <div className="border-b px-4 py-2.5 text-sm font-semibold">
                                    🏢 Бүх компани ({companies.length}) — борлуулалтаар
                                </div>
                                {companies.length === 0 ? (
                                    <div className="px-4 py-10 text-center text-xs text-muted-foreground">
                                        Дата алга
                                    </div>
                                ) : (
                                    <Table>
                                        <TableHeader className="sticky top-0 z-10 bg-background">
                                            <TableRow>
                                                <TableHead>Компани</TableHead>
                                                <TableHead className="text-right">Борлуулалт</TableHead>
                                                <TableHead className="text-right">Ашиг</TableHead>
                                                <TableHead className="text-right">Маржин</TableHead>
                                                <TableHead className="text-right">Рейс</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {companies.map(({ stats: c, y }) => {
                                                const m =
                                                    y!.revenue > 0
                                                        ? Math.floor((y!.profit * 100) / y!.revenue)
                                                        : 0;
                                                return (
                                                    <TableRow key={c.id} className="hover:bg-muted/30">
                                                        <TableCell className="text-sm font-medium">
                                                            {c.companyId ? (
                                                                <Link
                                                                    href={`/crm/companies/${c.companyId}`}
                                                                    className="hover:text-cyan-700 hover:underline"
                                                                >
                                                                    {c.name}
                                                                </Link>
                                                            ) : (
                                                                c.name
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums">
                                                            {formatM(y!.revenue)}
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums text-emerald-600 dark:text-emerald-400">
                                                            {formatM(y!.profit)}
                                                        </TableCell>
                                                        <TableCell
                                                            className={cn(
                                                                'text-right text-sm font-semibold tabular-nums',
                                                                TONE_TEXT[marginTone(m)],
                                                            )}
                                                        >
                                                            {m}%
                                                        </TableCell>
                                                        <TableCell className="text-right text-sm tabular-nums">
                                                            {y!.trips.toLocaleString('en-US')}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function TotalItem({
    label,
    value,
    valueClass,
}: {
    label: string;
    value: string;
    valueClass?: string;
}) {
    return (
        <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
            </div>
            <div className={cn('mt-0.5 text-xl font-bold tabular-nums tracking-tight', valueClass)}>
                {value}
            </div>
        </div>
    );
}

function EmptyBlock({ text }: { text: string }) {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-sm text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10">
                    <CalendarRange className="h-7 w-7 text-cyan-600" />
                </div>
                <p className="text-sm text-muted-foreground">{text}</p>
            </div>
        </div>
    );
}
