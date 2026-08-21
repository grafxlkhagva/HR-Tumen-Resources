'use client';

import * as React from 'react';
import { doc } from 'firebase/firestore';
import { Target } from 'lucide-react';
import { useDoc, useFirebase, useMemoFirebase } from '@/firebase';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
    KAM_LIST,
    TARGET_2026,
    TEAMS,
    type OrderYearStats,
} from '../_types';
import { planTone, TONE_TEXT } from '../_lib/stats';
import {
    PLAN_2026,
    QUARTERS,
    QUARTER_LABELS,
    quarterActual,
    achievedPct,
    type QuarterKey,
} from '../_lib/plan';

const CUR_YEAR = 2026;

/** ₮M бүхэл тоо. */
function m(v: number): string {
    return `₮${Math.round(v).toLocaleString('en-US')}M`;
}

export default function CrmPlanPage() {
    const { firestore } = useFirebase();

    const statsRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'crm_order_stats', String(CUR_YEAR)) : null),
        [firestore],
    );
    const { data: stats, isLoading } = useDoc<OrderYearStats>(statsRef);

    // Улирлын бодит гүйцэтгэл
    const qActual = React.useMemo(() => {
        const map = {} as Record<QuarterKey, ReturnType<typeof quarterActual>>;
        QUARTERS.forEach((q) => (map[q] = quarterActual(stats, q)));
        return map;
    }, [stats]);

    // Жилийн бодит
    const annualActual = React.useMemo(() => {
        const sales = (stats?.revenue ?? 0) / 1e6;
        const profit = (stats?.profit ?? 0) / 1e6;
        const margin = stats?.revenue ? ((stats.profit ?? 0) / stats.revenue) * 100 : 0;
        return { sales, profit, margin, customers: stats?.customers ?? 0 };
    }, [stats]);

    return (
        <div className="flex h-full flex-col">
            <header className="flex items-center justify-between border-b px-6 py-4">
                <div>
                    <h1 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                        <Target className="h-5 w-5 text-cyan-600" />
                        2026 Борлуулалтын зорилт — Төлөвлөгөө
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        4 улирал + жилийн зорилт vs бодит гүйцэтгэл · баг · KAM
                    </p>
                </div>
            </header>

            <div className="flex-1 overflow-auto p-6 space-y-6">
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                        ))}
                    </div>
                ) : (
                    <>
                        {/* Улирлын гол хүснэгт */}
                        <section className="rounded-xl border bg-card">
                            <div className="border-b px-4 py-3">
                                <h3 className="text-sm font-semibold">📊 Улирлын гүйцэтгэл — зорилт vs бодит</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b text-[11px] text-muted-foreground">
                                            <th className="px-3 py-2 text-left font-semibold">Үзүүлэлт</th>
                                            {QUARTERS.map((q) => (
                                                <th key={q} className="px-3 py-2 text-center font-semibold" colSpan={2}>
                                                    {QUARTER_LABELS[q].split(' · ')[0]}
                                                </th>
                                            ))}
                                            <th className="px-3 py-2 text-center font-semibold" colSpan={2}>
                                                Жил
                                            </th>
                                        </tr>
                                        <tr className="border-b text-[10px] uppercase tracking-wider text-muted-foreground/70">
                                            <th className="px-3 py-1 text-left"></th>
                                            {[...QUARTERS, 'year'].map((q) => (
                                                <React.Fragment key={q}>
                                                    <th className="px-2 py-1 text-right">Зорилт</th>
                                                    <th className="px-2 py-1 text-right">Бодит</th>
                                                </React.Fragment>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <MoneyRow
                                            label="💰 Борлуулалт ₮M"
                                            target={(q) => PLAN_2026.quarters[q].sales}
                                            actual={(q) => qActual[q].sales}
                                            annualTarget={PLAN_2026.annual.sales}
                                            annualActual={annualActual.sales}
                                        />
                                        <MoneyRow
                                            label="📈 Шимтгэл ₮M"
                                            target={(q) => PLAN_2026.quarters[q].profit}
                                            actual={(q) => qActual[q].profit}
                                            annualTarget={PLAN_2026.annual.profit}
                                            annualActual={annualActual.profit}
                                            emphasise
                                        />
                                        <PercentRow
                                            label="📐 Маржин %"
                                            target={(q) => PLAN_2026.quarters[q].margin}
                                            actual={(q) => qActual[q].margin}
                                            annualTarget={PLAN_2026.annual.margin}
                                            annualActual={annualActual.margin}
                                        />
                                        <TargetOnlyRow
                                            label="👥 Харилцагч"
                                            target={(q) => {
                                                const c = PLAN_2026.quarters[q].customers;
                                                return c === null ? '—' : `${c}+`;
                                            }}
                                            annualTarget={String(PLAN_2026.annual.customers)}
                                            annualActual={String(annualActual.customers)}
                                        />
                                        <TargetOnlyRow
                                            label="🧾 Дундаж шимтгэл ₮M/сар"
                                            target={(q) => String(PLAN_2026.quarters[q].avgCommission)}
                                        />
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Багийн жилийн зорилт */}
                        <section className="rounded-xl border bg-card">
                            <div className="border-b px-4 py-3">
                                <h3 className="text-sm font-semibold">👥 Багийн жилийн зорилт (ашиг ₮M)</h3>
                            </div>
                            <div className="divide-y">
                                {TEAMS.map((team) => {
                                    const target = TARGET_2026.team[team] ?? 0;
                                    const actual = (stats?.byTeam?.[team]?.profit ?? 0) / 1e6;
                                    return (
                                        <PlanRow
                                            key={team}
                                            label={team}
                                            actual={actual}
                                            target={target}
                                        />
                                    );
                                })}
                            </div>
                        </section>

                        {/* KAM жилийн зорилт */}
                        <section className="rounded-xl border bg-card">
                            <div className="border-b px-4 py-3">
                                <h3 className="text-sm font-semibold">👤 KAM жилийн зорилт (ашиг ₮M)</h3>
                                <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    Q2 зорилт: {Object.entries(PLAN_2026.kamQ2).map(([k, v]) => `${k} ${v}`).join(' · ')}
                                </p>
                            </div>
                            <div className="divide-y">
                                {KAM_LIST.map((k) => {
                                    const target = TARGET_2026.kam[k] ?? 0;
                                    const actual = (stats?.byKam?.[k]?.profit ?? 0) / 1e6;
                                    return <PlanRow key={k} label={k} actual={actual} target={target} />;
                                })}
                            </div>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
}

/** ₮M мөнгөн мөр: улирал бүрд зорилт | бодит(+%). */
function MoneyRow({
    label,
    target,
    actual,
    annualTarget,
    annualActual,
    emphasise,
}: {
    label: string;
    target: (q: QuarterKey) => number;
    actual: (q: QuarterKey) => number;
    annualTarget: number;
    annualActual: number;
    emphasise?: boolean;
}) {
    return (
        <tr className={cn('border-b', emphasise && 'bg-muted/20')}>
            <td className="px-3 py-2 font-medium">{label}</td>
            {QUARTERS.map((q) => {
                const t = target(q);
                const a = actual(q);
                const pct = achievedPct(a, t);
                return (
                    <React.Fragment key={q}>
                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{m(t)}</td>
                        <td className="px-2 py-2 text-right tabular-nums">
                            <div className="font-semibold">{m(a)}</div>
                            {pct !== null && (
                                <div className={cn('text-[10px]', TONE_TEXT[planTone(pct)])}>{pct}%</div>
                            )}
                        </td>
                    </React.Fragment>
                );
            })}
            <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">{m(annualTarget)}</td>
            <td className="px-2 py-2 text-right tabular-nums">
                <div className="font-semibold">{m(annualActual)}</div>
                {achievedPct(annualActual, annualTarget) !== null && (
                    <div className={cn('text-[10px]', TONE_TEXT[planTone(achievedPct(annualActual, annualTarget)!)])}>
                        {achievedPct(annualActual, annualTarget)}%
                    </div>
                )}
            </td>
        </tr>
    );
}

/** Хувь мөр (маржин): зорилт % | бодит %. */
function PercentRow({
    label,
    target,
    actual,
    annualTarget,
    annualActual,
}: {
    label: string;
    target: (q: QuarterKey) => number;
    actual: (q: QuarterKey) => number;
    annualTarget: number;
    annualActual: number;
}) {
    return (
        <tr className="border-b">
            <td className="px-3 py-2 font-medium">{label}</td>
            {QUARTERS.map((q) => {
                const a = actual(q);
                return (
                    <React.Fragment key={q}>
                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                            {target(q).toFixed(1)}%
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums font-semibold">
                            {a > 0 ? `${a.toFixed(1)}%` : '—'}
                        </td>
                    </React.Fragment>
                );
            })}
            <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                {annualTarget.toFixed(1)}%
            </td>
            <td className="px-2 py-2 text-right tabular-nums font-semibold">
                {annualActual > 0 ? `${annualActual.toFixed(1)}%` : '—'}
            </td>
        </tr>
    );
}

/** Зорилт л харуулах мөр (харилцагч/дундаж шимтгэл). */
function TargetOnlyRow({
    label,
    target,
    annualTarget,
    annualActual,
}: {
    label: string;
    target: (q: QuarterKey) => string;
    annualTarget?: string;
    annualActual?: string;
}) {
    return (
        <tr className="border-b">
            <td className="px-3 py-2 font-medium">{label}</td>
            {QUARTERS.map((q) => (
                <td key={q} className="px-2 py-2 text-right tabular-nums text-muted-foreground" colSpan={2}>
                    {target(q)}
                </td>
            ))}
            <td className="px-2 py-2 text-right tabular-nums" colSpan={2}>
                {annualTarget ? (
                    <span>
                        <span className="text-muted-foreground">{annualTarget}</span>
                        {annualActual && annualActual !== '0' && (
                            <span className="ml-1 font-semibold">/ {annualActual}</span>
                        )}
                    </span>
                ) : (
                    '—'
                )}
            </td>
        </tr>
    );
}

/** Баг/KAM мөр — bar + зорилт vs бодит + %. */
function PlanRow({ label, actual, target }: { label: string; actual: number; target: number }) {
    const pct = achievedPct(actual, target) ?? 0;
    const tone = planTone(pct);
    const barColor = tone === 'good' ? 'bg-emerald-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-rose-500';
    return (
        <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="w-28 shrink-0 truncate text-sm font-medium">{label}</div>
            <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(100, pct)}%` }} />
            </div>
            <div className="w-36 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
                {m(actual)} / {m(target)}
            </div>
            <div className={cn('w-12 shrink-0 text-right text-sm font-semibold tabular-nums', TONE_TEXT[tone])}>
                {pct}%
            </div>
        </div>
    );
}
