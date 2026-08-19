import {
    TARGET_2026,
    normalizeStageId,
    type CompanyStats,
    type Deal,
    type OrderYearStats,
    type Quote,
    type Survey,
    type Company,
} from '../_types';
import { buildCustomerRow, npsIndex, formatM } from './stats';

/**
 * AI чатад дамжуулах дата хураангуй — 28к захиалга бус, зөвхөн агрегат.
 * Гаралт нь Монгол текст (AI тоог яг хуулж хариулна).
 */

const MONTHS = ['1-р', '2-р', '3-р', '4-р', '5-р', '6-р', '7-р', '8-р', '9-р', '10-р', '11-р', '12-р'];

export interface SnapshotInput {
    yearStats: OrderYearStats[];
    deals: Deal[];
    quotes: Quote[];
    companies: Company[];
    companyStats: CompanyStats[];
    surveys: Survey[];
    /** Одоогийн сар (1–12) — trend тооцоход. */
    nowMonth: number;
    curYear: number;
}

export function buildAiSnapshot(input: SnapshotInput): string {
    const { yearStats, deals, quotes, companies, companyStats, surveys, nowMonth, curYear } = input;
    const lines: string[] = [];

    // ── Жилийн орлого/ашиг ──
    const byYear = [...yearStats].sort((a, b) => a.year - b.year);
    lines.push('## Жилийн үзүүлэлт (crm_order_stats)');
    for (const y of byYear) {
        lines.push(
            `- ${y.year}: орлого ${formatM(y.revenue)}, ашиг ${formatM(y.profit)}, рейс ${y.trips.toLocaleString('en-US')}, харилцагч ${y.customers}`,
        );
    }

    const cur = byYear.find((y) => y.year === curYear);
    if (cur) {
        lines.push('');
        lines.push(`## ${curYear} он — сарын ашиг ба зорилт (₮M)`);
        for (let i = 0; i < 12; i++) {
            const actual = Math.round((cur.monthlyProfit?.[i] ?? 0) / 1e6);
            const target = TARGET_2026.monthly[i] ?? 0;
            const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
            lines.push(`- ${MONTHS[i]} сар: гүйцэтгэл ₮${actual}M / зорилт ₮${target}M (${pct}%)`);
        }
        const ytdProfit = Math.round(
            (cur.monthlyProfit?.slice(0, nowMonth).reduce((a, b) => a + b, 0) ?? 0) / 1e6,
        );
        const ytdTarget = TARGET_2026.monthly.slice(0, nowMonth).reduce((a, b) => a + b, 0);
        lines.push(
            `- YTD (1–${nowMonth} сар): гүйцэтгэл ₮${ytdProfit}M / зорилт ₮${ytdTarget}M, нийт жилийн зорилт ₮${TARGET_2026.total}M`,
        );

        // KAM-аар
        lines.push('');
        lines.push(`## ${curYear} — KAM-аар (ашиг ₮M / зорилт ₮M)`);
        for (const [kam, target] of Object.entries(TARGET_2026.kam)) {
            const actual = Math.round((cur.byKam?.[kam]?.profit ?? 0) / 1e6);
            const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
            lines.push(`- ${kam}: ₮${actual}M / ₮${target}M (${pct}%)`);
        }

        // Багаар
        lines.push('');
        lines.push(`## ${curYear} — Багаар (ашиг ₮M / зорилт ₮M)`);
        for (const [team, target] of Object.entries(TARGET_2026.team)) {
            const actual = Math.round((cur.byTeam?.[team]?.profit ?? 0) / 1e6);
            const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
            lines.push(`- ${team}: ₮${actual}M / ₮${target}M (${pct}%)`);
        }
    }

    // ── Deal pipeline ──
    lines.push('');
    lines.push('## Deal pipeline (crm_deals)');
    const stageCounts: Record<string, number> = {};
    let wonAmount = 0;
    for (const d of deals) {
        const s = normalizeStageId(d.stageId);
        stageCounts[s] = (stageCounts[s] ?? 0) + 1;
        if (s === 'won') wonAmount += d.amount ?? 0;
    }
    lines.push(
        `- Нийт ${deals.length} deal: Хүсэлт ${stageCounts.lead ?? 0}, Санал илгээсэн ${stageCounts.opportunity ?? 0}, Амжилттай ${stageCounts.won ?? 0}, Хүлээгдэж ${stageCounts.pending ?? 0}, Алдсан ${stageCounts.lost ?? 0}`,
    );
    const closed = (stageCounts.won ?? 0) + (stageCounts.lost ?? 0);
    if (closed > 0) {
        lines.push(`- Win rate: ${Math.round(((stageCounts.won ?? 0) / closed) * 100)}% (won/(won+lost))`);
    }

    // ── Quotes ──
    if (quotes.length > 0) {
        const q: Record<string, number> = {};
        for (const it of quotes) q[it.status] = (q[it.status] ?? 0) + 1;
        lines.push('');
        lines.push('## Үнийн санал (crm_quotes)');
        lines.push(
            `- Нийт ${quotes.length}: Ноорог ${q.draft ?? 0}, Илгээсэн ${q.sent ?? 0}, Зөвшөөрсөн ${q.accepted ?? 0}, Татгалзсан ${q.rejected ?? 0}, Хугацаа дууссан ${q.expired ?? 0}`,
        );
    }

    // ── Companies / funnel ──
    lines.push('');
    lines.push('## Компани funnel (crm_companies)');
    const fCounts: Record<string, number> = {};
    for (const c of companies) fCounts[c.funnelStage ?? 'lead'] = (fCounts[c.funnelStage ?? 'lead'] ?? 0) + 1;
    lines.push(
        `- Нийт ${companies.length}: Lead ${fCounts.lead ?? 0}, Contacted ${fCounts.contacted ?? 0}, Qualified ${fCounts.qualified ?? 0}, Quote ${fCounts.quote ?? 0}, Customer ${fCounts.customer ?? 0}, Loyal ${fCounts.loyal ?? 0}, Lost ${fCounts.lost ?? 0}`,
    );

    // ── Churn risk / tier / top companies ──
    if (companyStats.length > 0) {
        const rows = companyStats.map((s) => buildCustomerRow(s, nowMonth));
        const risk = { high: 0, watch: 0, ok: 0 };
        const tiers: Record<string, number> = {};
        for (const r of rows) {
            risk[r.risk] += 1;
            tiers[r.tier] = (tiers[r.tier] ?? 0) + 1;
        }
        lines.push('');
        lines.push('## Харилцагчийн эрсдэл ба зэрэглэл (crm_company_stats)');
        lines.push(`- Churn эрсдэл: Өндөр ${risk.high}, Анхаарах ${risk.watch}, Хэвийн ${risk.ok}`);
        lines.push(
            `- Tier: Power ${tiers.Power ?? 0}, High ${tiers.High ?? 0}, Small ${tiers.Small ?? 0}, Try ${tiers.Try ?? 0}`,
        );

        const top = [...rows].sort((a, b) => b.rev2026 - a.rev2026).slice(0, 10);
        lines.push('');
        lines.push(`## Топ 10 харилцагч (${curYear} орлогоор)`);
        top.forEach((r, i) => {
            const trend = r.trendPct === null ? '—' : `${r.trendPct >= 0 ? '+' : ''}${Math.round(r.trendPct)}%`;
            lines.push(
                `${i + 1}. ${r.stats.name}: орлого ${formatM(r.rev2026)}, ашиг ${formatM(r.profit2026)}, margin ${r.marginPct}%, хандлага ${trend}, ${r.tier}`,
            );
        });

        // Өндөр эрсдэлтэй нэрс
        const highRisk = rows.filter((r) => r.risk === 'high').slice(0, 15);
        if (highRisk.length > 0) {
            lines.push('');
            lines.push('## Өндөр churn эрсдэлтэй харилцагчид');
            highRisk.forEach((r) => {
                lines.push(`- ${r.stats.name} (2025 орлого ${formatM(r.rev2025)})`);
            });
        }
    }

    // ── NPS ──
    if (surveys.length > 0) {
        const idx = npsIndex(surveys.map((s) => s.score));
        const promoters = surveys.filter((s) => s.score >= 9).length;
        const detractors = surveys.filter((s) => s.score <= 6).length;
        lines.push('');
        lines.push('## NPS (crm_surveys)');
        lines.push(
            `- NPS индекс ${idx ?? '—'} · ${surveys.length} үнэлгээ (Дэмжигч ${promoters}, Шүүмжлэгч ${detractors})`,
        );
    }

    return lines.join('\n');
}
