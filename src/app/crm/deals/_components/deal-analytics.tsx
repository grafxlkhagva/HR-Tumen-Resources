'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
    KAM_LIST,
    TEAMS,
    TEAM_OF,
    normalizeStageId,
    type Company,
    type Deal,
    type Survey,
} from '../../_types';
import { normName } from '../../_lib/stats';

/**
 * Deal хуудасны дээд статистик — Flask прототипийн /deals route-ийн ЯГ томьёо.
 * (app.py deals() + templates/deals.html-ээс хуулсан.)
 */

/** Орон нутгийн цагаар YYYY-MM-DD. */
function localToday(): string {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

interface KamRow {
    kam: string;
    team: string;
    requests: number;
    quotes: number;
    won: number;
    salesPct: number;
    nps: number | null;
}

export function DealAnalytics({
    deals,
    companies,
    surveys,
}: {
    deals: Deal[];
    companies: Company[];
    surveys: Survey[];
}) {
    const data = React.useMemo(() => {
        const today = localToday();

        // Шатны тоо
        const sc: Record<string, number> = {};
        let mql = 0;
        let sql = 0;
        let overdue = 0;
        for (const d of deals) {
            const s = normalizeStageId(d.stageId);
            sc[s] = (sc[s] ?? 0) + 1;
            if (d.sourceType === 'sql') sql += 1;
            else mql += 1; // COALESCE(source_type,'mql') — хоосон = mql
            if (s === 'lead' && d.quoteDue && d.quoteDue < today) overdue += 1;
        }
        const total = deals.length;
        const quoted = (sc.opportunity ?? 0) + (sc.pending ?? 0) + (sc.won ?? 0);
        const summary = {
            total,
            quoted,
            pending: sc.pending ?? 0,
            won: sc.won ?? 0,
            lost: sc.lost ?? 0,
            overdue,
            mql,
            sql,
        };

        // KAM → компанийн нэрийн kam map (NPS-д)
        const kamByCompanyName = new Map<string, string | undefined>();
        const kamByCompanyId = new Map<string, string | undefined>();
        for (const c of companies) {
            kamByCompanyName.set(normName(c.name || ''), c.kam);
            kamByCompanyId.set(c.id, c.kam);
        }
        // KAM бүрийн NPS оноонуудыг цуглуулна
        const npsByKam = new Map<string, number[]>();
        for (const s of surveys) {
            if (typeof s.score !== 'number') continue;
            let kam: string | undefined;
            if (s.companyId) kam = kamByCompanyId.get(s.companyId);
            if (!kam && s.companyName) kam = kamByCompanyName.get(normName(s.companyName));
            if (!kam) continue;
            if (!npsByKam.has(kam)) npsByKam.set(kam, []);
            npsByKam.get(kam)!.push(s.score);
        }

        // KAM тус бүрээр + баг
        const teamRows: Record<string, { requests: number; quotes: number; won: number }> = {};
        for (const t of TEAMS) teamRows[t] = { requests: 0, quotes: 0, won: 0 };

        const kam360: KamRow[] = KAM_LIST.map((k) => {
            let requests = 0;
            let quotes = 0;
            let won = 0;
            for (const d of deals) {
                if (d.kam !== k) continue;
                const s = normalizeStageId(d.stageId);
                if (s === 'lead') requests += 1;
                if (s === 'opportunity' || s === 'pending' || s === 'won') quotes += 1;
                if (s === 'won') won += 1;
            }
            const team = TEAM_OF[k] ?? '';
            if (teamRows[team]) {
                teamRows[team].requests += requests;
                teamRows[team].quotes += quotes;
                teamRows[team].won += won;
            }
            const denom = requests + quotes;
            const salesPct = denom ? Math.floor((100 * quotes) / denom) : 0;
            const scores = npsByKam.get(k);
            const nps =
                scores && scores.length
                    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                    : null;
            return { kam: k, team, requests, quotes, won, salesPct, nps };
        });

        const teamSum = TEAMS.map((t) => ({ team: t, ...teamRows[t] }));

        // customer_type задаргаа (зөвхөн leadKey-тэй = синкээс ирсэн)
        const typeCounts: Record<string, number> = {};
        for (const d of deals) {
            if (!d.leadKey) continue;
            const t = (d.customerType || '').trim() || 'Тодорхойгүй';
            typeCounts[t] = (typeCounts[t] ?? 0) + 1;
        }
        const types = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]);

        return { summary, kam360, teamSum, types };
    }, [deals, companies, surveys]);

    const { summary, kam360, teamSum, types } = data;

    return (
        <div className="space-y-4 p-4">
            {/* Funnel стат картууд */}
            <div>
                <h3 className="mb-2 text-sm font-semibold">📊 Хүсэлт → үнийн санал → амжилттай</h3>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                    <StatCard
                        n={summary.total}
                        label="📥 Нийт хүсэлт"
                        sub={`🌐 MQL ${summary.mql} · 📤 SQL ${summary.sql}`}
                    />
                    <StatCard n={summary.quoted} label="💰 Үнийн санал илгээсэн" color="#f59e0b" />
                    <StatCard n={summary.pending} label="⏳ Хүлээгдэж байгаа" color="#d97706" />
                    <StatCard n={summary.won} label="✅ Амжилттай" color="#16a34a" />
                    <StatCard n={summary.lost} label="✗ Алдсан" color="#dc2626" />
                    <StatCard
                        n={summary.overdue}
                        label="⏰ Хугацаа хэтэрсэн"
                        color={summary.overdue ? '#dc2626' : '#94a3b8'}
                        alert={summary.overdue > 0}
                    />
                </div>
            </div>

            {/* Багийн задаргаа */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {teamSum.map((t) => (
                    <div key={t.team} className="rounded-xl border bg-card p-3">
                        <div className="mb-1 text-sm font-semibold">👥 {t.team}</div>
                        <div className="text-xs text-muted-foreground">
                            📥 Хүсэлт <b className="text-foreground">{t.requests}</b> · 💰 Санал{' '}
                            <b className="text-amber-600">{t.quotes}</b> · ✅ Амжилттай{' '}
                            <b className="text-emerald-600">{t.won}</b>
                        </div>
                    </div>
                ))}
            </div>

            {/* KAM хүснэгт */}
            <div className="overflow-x-auto rounded-xl border bg-card">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b text-[11px] uppercase tracking-wider text-muted-foreground">
                            <th className="px-3 py-2 text-left font-semibold">KAM</th>
                            <th className="px-3 py-2 text-left font-semibold">Үйлчилгээ</th>
                            <th className="px-3 py-2 text-right font-semibold">📥 Хүсэлт</th>
                            <th className="px-3 py-2 text-right font-semibold">💰 Санал</th>
                            <th className="px-3 py-2 text-right font-semibold">✅ Амжилттай</th>
                            <th className="px-3 py-2 text-right font-semibold">📊 Санал %</th>
                            <th className="px-3 py-2 text-right font-semibold">😊 NPS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kam360.map((k) => (
                            <tr key={k.kam} className="border-b last:border-b-0">
                                <td className="px-3 py-2 font-medium">{k.kam}</td>
                                <td className="px-3 py-2 text-muted-foreground">{k.team}</td>
                                <td className="px-3 py-2 text-right tabular-nums">{k.requests}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-amber-600">
                                    {k.quotes}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-emerald-600">
                                    {k.won}
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums">{k.salesPct}%</td>
                                <td className="px-3 py-2 text-right">
                                    {k.nps === null ? (
                                        <span className="text-muted-foreground">—</span>
                                    ) : (
                                        <span
                                            className={cn(
                                                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold',
                                                k.nps >= 9
                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                    : k.nps >= 7
                                                      ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                      : 'bg-rose-100 text-rose-700 border-rose-200',
                                            )}
                                        >
                                            {k.nps}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* customer_type задаргаа */}
            {types.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground">
                        🌐 Гаднаас орж ирсэн:
                    </span>
                    {types.map(([t, c]) => (
                        <span
                            key={t}
                            className="rounded-full border bg-card px-3 py-1 text-xs"
                        >
                            {t} <b>{c}</b>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

function StatCard({
    n,
    label,
    sub,
    color,
    alert,
}: {
    n: number;
    label: string;
    sub?: string;
    color?: string;
    alert?: boolean;
}) {
    return (
        <div
            className={cn(
                'rounded-xl border bg-card p-3 text-center',
                alert && 'border-rose-300 bg-rose-50 dark:bg-rose-500/10',
            )}
        >
            <div className="text-2xl font-bold tabular-nums" style={color ? { color } : undefined}>
                {n}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
            {sub && <div className="mt-0.5 text-[10px] text-muted-foreground/80">{sub}</div>}
        </div>
    );
}
