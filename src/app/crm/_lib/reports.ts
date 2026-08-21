import type {
    Activity,
    Company,
    CompanyStats,
    Survey,
} from '../_types';
import { normName } from './stats';

/**
 * Прототип `analytics.py`-ийн тайлангийн томьёонуудын Next.js порт.
 * Бүгд цэвэр функц — ачаалсан collection дамжуулна. Томьёог өөрчлөхгүй.
 */

const CUR_YEAR = '2026';

// ── Концентрацийн эрсдэл (топ N харилцагч нийт борлуулалтын %) ──
export interface ConcentrationRow {
    name: string;
    revM: number;
    pct: number;
}
export function concentration(
    companyStats: CompanyStats[],
    top = 10,
): { rows: ConcentrationRow[]; topPct: number; totalM: number; nTotal: number } {
    const withRev = companyStats
        .map((s) => ({ name: s.name, rev: s.years?.[CUR_YEAR]?.revenue ?? 0 }))
        .filter((r) => r.rev > 0)
        .sort((a, b) => b.rev - a.rev);
    const totalM = withRev.reduce((sum, r) => sum + r.rev, 0) / 1e6;
    const topRows = withRev.slice(0, top);
    const topSum = topRows.reduce((sum, r) => sum + r.rev, 0) / 1e6;
    const rows = topRows.map((r) => ({
        name: r.name,
        revM: Math.round((r.rev / 1e6) * 10) / 10,
        pct: totalM ? Math.round((r.rev / 1e6 / totalM) * 1000) / 10 : 0,
    }));
    return {
        rows,
        topPct: totalM ? Math.round((topSum / totalM) * 1000) / 10 : 0,
        totalM: Math.round(totalM * 10) / 10,
        nTotal: withRev.length,
    };
}

// ── Эх сурвалж бүрээр хөрвөлт ──
export interface SourceRow {
    source: string;
    total: number;
    won: number;
    conv: number;
}
export function sourceDistribution(companies: Company[]): SourceRow[] {
    const agg = new Map<string, { total: number; won: number }>();
    for (const c of companies) {
        const src = c.source || '—';
        const a = agg.get(src) ?? { total: 0, won: 0 };
        a.total += 1;
        if (c.funnelStage === 'customer' || c.funnelStage === 'loyal') a.won += 1;
        agg.set(src, a);
    }
    return [...agg.entries()]
        .map(([source, v]) => ({
            source,
            total: v.total,
            won: v.won,
            conv: v.total ? Math.round((v.won / v.total) * 100) : 0,
        }))
        .sort((a, b) => b.total - a.total);
}

// ── Татгалзсан шалтгаан ──
export interface LostRow {
    reason: string;
    c: number;
    pct: number;
}
export function lostReasons(companies: Company[]): LostRow[] {
    const agg = new Map<string, number>();
    for (const c of companies) {
        if (c.funnelStage !== 'lost') continue;
        const r = c.lostReason || '—';
        agg.set(r, (agg.get(r) ?? 0) + 1);
    }
    const total = [...agg.values()].reduce((s, n) => s + n, 0);
    return [...agg.entries()]
        .map(([reason, c]) => ({ reason, c, pct: total ? Math.round((c / total) * 100) : 0 }))
        .sort((a, b) => b.c - a.c);
}

// ── NPS индекс (харилцагч бүрийн сүүлийн үнэлгээ) ──
export interface NpsSummary {
    n: number;
    index: number | null;
    promoter: number;
    passive: number;
    detractor: number;
    avg: number | null;
}
function npsZone(score: number): 'promoter' | 'passive' | 'detractor' {
    return score >= 9 ? 'promoter' : score >= 7 ? 'passive' : 'detractor';
}
export function npsSummary(surveys: Survey[]): NpsSummary {
    // Харилцагч бүрийн хамгийн сүүлийн үнэлгээ (companyId эсвэл нэрээр)
    const latest = new Map<string, Survey>();
    for (const s of surveys) {
        const key = s.companyId || (s.companyName ? normName(s.companyName) : s.id);
        const prev = latest.get(key);
        const ms = s.createdAt?.toMillis?.() ?? 0;
        const prevMs = prev?.createdAt?.toMillis?.() ?? -1;
        if (!prev || ms >= prevMs) latest.set(key, s);
    }
    const rows = [...latest.values()].filter((s) => typeof s.score === 'number');
    const n = rows.length;
    if (!n) return { n: 0, index: null, promoter: 0, passive: 0, detractor: 0, avg: null };
    let pro = 0;
    let pas = 0;
    let det = 0;
    let sum = 0;
    for (const s of rows) {
        const z = s.zone || npsZone(s.score);
        if (z === 'promoter') pro += 1;
        else if (z === 'passive') pas += 1;
        else det += 1;
        sum += s.score;
    }
    return {
        n,
        index: Math.round(((pro - det) / n) * 100),
        promoter: pro,
        passive: pas,
        detractor: det,
        avg: Math.round((sum / n) * 10) / 10,
    };
}

// ── KAM 7 хоногийн идэвх ──
export interface KamActivityRow {
    kam: string;
    activities: number;
    meetings: number;
    openTasks: number;
    companies: number;
    total: number;
}
export function kamActivity(
    activities: Activity[],
    companies: Company[],
    kamList: string[],
    days = 7,
): KamActivityRow[] {
    const cutoff = Date.now() - days * 86_400_000;
    const compCount = new Map<string, number>();
    for (const c of companies) {
        if (c.kam) compCount.set(c.kam, (compCount.get(c.kam) ?? 0) + 1);
    }
    const out = kamList.map((kam) => {
        let acts = 0;
        let meets = 0;
        let openTasks = 0;
        for (const a of activities) {
            if (a.kam !== kam) continue;
            const ms = a.createdAt?.toMillis?.() ?? 0;
            const recent = ms >= cutoff;
            if (a.type === 'meeting') {
                if (recent) meets += 1;
            } else if (a.type === 'task') {
                if (!a.completedAt) openTasks += 1;
            } else if (recent) {
                acts += 1;
            }
        }
        return {
            kam,
            activities: acts,
            meetings: meets,
            openTasks,
            companies: compCount.get(kam) ?? 0,
            total: acts + meets,
        };
    });
    return out.sort((a, b) => b.total - a.total);
}

// ── Салбар бүрээр (компанийн тоо, 2026 борлуулалт/ашиг/маржин) ──
export interface IndustryRow {
    industry: string;
    n: number;
    revM: number;
    proM: number;
    margin: number;
}
export function industryBreakdown(
    companies: Company[],
    companyStats: CompanyStats[],
): IndustryRow[] {
    const statByKey = new Map<string, CompanyStats>();
    for (const s of companyStats) {
        if (s.companyKey) statByKey.set(s.companyKey, s);
    }
    const agg = new Map<string, { n: number; rev: number; pro: number }>();
    for (const c of companies) {
        if (!c.industry || !c.industry.trim()) continue;
        const st = statByKey.get(normName(c.name));
        const y = st?.years?.[CUR_YEAR];
        const rev = (y?.revenue ?? 0) / 1e6;
        const pro = (y?.profit ?? 0) / 1e6;
        const tags = new Set(
            c.industry
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
        );
        for (const ind of tags) {
            const a = agg.get(ind) ?? { n: 0, rev: 0, pro: 0 };
            a.n += 1;
            a.rev += rev;
            a.pro += pro;
            agg.set(ind, a);
        }
    }
    return [...agg.entries()]
        .map(([industry, v]) => ({
            industry,
            n: v.n,
            revM: Math.round(v.rev * 10) / 10,
            proM: Math.round(v.pro * 10) / 10,
            margin: v.rev ? Math.round((v.pro / v.rev) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.revM - a.revM);
}
