'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { KAM_LIST, COMPANY_SOURCES, type Activity, type Company, type CompanyStats, type Survey } from '../../_types';
import { concentrationTone, TONE_TEXT } from '../../_lib/stats';
import {
    concentration,
    sourceDistribution,
    lostReasons,
    npsSummary,
    kamActivity,
    industryBreakdown,
} from '../../_lib/reports';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
                <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <div className="p-4">{children}</div>
        </div>
    );
}

/**
 * Прототип `reports.html`-ийн бизнес шинжилгээ — analytics.py томьёогоор.
 * Концентраци, эх сурвалжийн хөрвөлт, татгалзсан шалтгаан, NPS, KAM идэвх, салбар.
 */
export function BusinessReports({
    companies,
    companyStats,
    surveys,
    activities,
}: {
    companies: Company[];
    companyStats: CompanyStats[];
    surveys: Survey[];
    activities: Activity[];
}) {
    const conc = React.useMemo(() => concentration(companyStats, 10), [companyStats]);
    const sources = React.useMemo(() => sourceDistribution(companies), [companies]);
    const lost = React.useMemo(() => lostReasons(companies), [companies]);
    const nps = React.useMemo(() => npsSummary(surveys), [surveys]);
    const kam = React.useMemo(
        () => kamActivity(activities, companies, KAM_LIST, 7),
        [activities, companies],
    );
    const industries = React.useMemo(
        () => industryBreakdown(companies, companyStats),
        [companies, companyStats],
    );

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Концентрацийн эрсдэл */}
            <Card title="🎯 Концентрацийн эрсдэл — Топ 10 харилцагч">
                <div className="mb-3 flex items-baseline gap-2">
                    <span className={cn('text-2xl font-bold tabular-nums', TONE_TEXT[concentrationTone(conc.topPct)])}>
                        {conc.topPct}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                        нийт борлуулалтын (₮{conc.totalM.toLocaleString('en-US')}M · {conc.nTotal} харилцагч)
                    </span>
                </div>
                <div className="space-y-1.5">
                    {conc.rows.map((r, i) => (
                        <div key={r.name} className="flex items-center gap-2 text-xs">
                            <span className="w-4 text-right text-muted-foreground">{i + 1}</span>
                            <span className="w-40 truncate">{r.name}</span>
                            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.min(100, r.pct)}%` }} />
                            </div>
                            <span className="w-16 text-right tabular-nums text-muted-foreground">
                                ₮{r.revM}M
                            </span>
                            <span className="w-10 text-right tabular-nums font-medium">{r.pct}%</span>
                        </div>
                    ))}
                    {conc.rows.length === 0 && <Empty />}
                </div>
            </Card>

            {/* Эх сурвалжийн хөрвөлт */}
            <Card title="🌐 Эх сурвалж → харилцагч хөрвөлт">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                            <th className="py-1.5 text-left font-semibold">Эх сурвалж</th>
                            <th className="py-1.5 text-right font-semibold">Нийт</th>
                            <th className="py-1.5 text-right font-semibold">Харилцагч</th>
                            <th className="py-1.5 text-right font-semibold">Хөрвөлт</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sources.map((s) => (
                            <tr key={s.source} className="border-b last:border-0">
                                <td className="py-1.5">{COMPANY_SOURCES[s.source] ?? s.source}</td>
                                <td className="py-1.5 text-right tabular-nums">{s.total}</td>
                                <td className="py-1.5 text-right tabular-nums text-emerald-600">{s.won}</td>
                                <td className="py-1.5 text-right tabular-nums font-medium">{s.conv}%</td>
                            </tr>
                        ))}
                        {sources.length === 0 && (
                            <tr>
                                <td colSpan={4}>
                                    <Empty />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </Card>

            {/* Татгалзсан шалтгаан */}
            <Card title="✗ Татгалзсан шалтгаан">
                <div className="space-y-1.5">
                    {lost.map((r) => (
                        <div key={r.reason} className="flex items-center gap-2 text-xs">
                            <span className="w-32 truncate">{r.reason}</span>
                            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-rose-500" style={{ width: `${r.pct}%` }} />
                            </div>
                            <span className="w-8 text-right tabular-nums">{r.c}</span>
                            <span className="w-10 text-right tabular-nums text-muted-foreground">{r.pct}%</span>
                        </div>
                    ))}
                    {lost.length === 0 && <Empty />}
                </div>
            </Card>

            {/* NPS индекс */}
            <Card title="😊 NPS индекс">
                <div className="flex items-center gap-6">
                    <div className="text-center">
                        <div
                            className={cn(
                                'text-3xl font-bold tabular-nums',
                                nps.index === null
                                    ? 'text-muted-foreground'
                                    : nps.index >= 30
                                      ? 'text-emerald-600'
                                      : nps.index >= 0
                                        ? 'text-amber-600'
                                        : 'text-rose-600',
                            )}
                        >
                            {nps.index === null ? '—' : nps.index}
                        </div>
                        <div className="text-[11px] text-muted-foreground">{nps.n} үнэлгээ</div>
                    </div>
                    <div className="flex-1 space-y-1 text-xs">
                        <div className="flex justify-between">
                            <span className="text-emerald-600">Дэмжигч (9–10)</span>
                            <span className="tabular-nums">{nps.promoter}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-amber-600">Дунд (7–8)</span>
                            <span className="tabular-nums">{nps.passive}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-rose-600">Шүүмжлэгч (0–6)</span>
                            <span className="tabular-nums">{nps.detractor}</span>
                        </div>
                        {nps.avg !== null && (
                            <div className="flex justify-between border-t pt-1 font-medium">
                                <span>Дундаж оноо</span>
                                <span className="tabular-nums">{nps.avg}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* KAM 7 хоногийн идэвх */}
            <Card title="👤 KAM 7 хоногийн идэвх">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                            <th className="py-1.5 text-left font-semibold">KAM</th>
                            <th className="py-1.5 text-right font-semibold">Харилцаа</th>
                            <th className="py-1.5 text-right font-semibold">Уулзалт</th>
                            <th className="py-1.5 text-right font-semibold">Даалгавар</th>
                            <th className="py-1.5 text-right font-semibold">Компани</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kam.map((r) => (
                            <tr key={r.kam} className="border-b last:border-0">
                                <td className="py-1.5 font-medium">{r.kam}</td>
                                <td className="py-1.5 text-right tabular-nums">{r.activities}</td>
                                <td className="py-1.5 text-right tabular-nums">{r.meetings}</td>
                                <td className="py-1.5 text-right tabular-nums text-amber-600">{r.openTasks}</td>
                                <td className="py-1.5 text-right tabular-nums text-muted-foreground">{r.companies}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            {/* Салбараар */}
            <Card title="🏭 Салбараар (2026)">
                {industries.length === 0 ? (
                    <Empty />
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                                <th className="py-1.5 text-left font-semibold">Салбар</th>
                                <th className="py-1.5 text-right font-semibold">Тоо</th>
                                <th className="py-1.5 text-right font-semibold">Борлуулалт</th>
                                <th className="py-1.5 text-right font-semibold">Маржин</th>
                            </tr>
                        </thead>
                        <tbody>
                            {industries.slice(0, 12).map((r) => (
                                <tr key={r.industry} className="border-b last:border-0">
                                    <td className="py-1.5 truncate">{r.industry}</td>
                                    <td className="py-1.5 text-right tabular-nums">{r.n}</td>
                                    <td className="py-1.5 text-right tabular-nums">₮{r.revM}M</td>
                                    <td className="py-1.5 text-right tabular-nums">{r.margin}%</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
}

function Empty() {
    return <div className="py-4 text-center text-xs text-muted-foreground">Дата алга</div>;
}
