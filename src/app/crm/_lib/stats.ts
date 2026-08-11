import type { CompanyStats } from '../_types';

/**
 * Прототипийн (Logistic Dashboards/crm) томьёо/босгууд — яг таг хуулсан.
 * Тоо өөрчлөхгүй; өөрчлөх бол docs/CRM-INTEGRATION.md-г шинэчилнэ.
 */

/** Нэрийн нормчилсон түлхүүр — Cyrillic-д ажиллана (JS toLowerCase Cyrillic fold хийдэг). */
export function normName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[«»"']/g, ' ')
        .replace(/\b(ххк|хк|llc|ltd|co\.?|company)\b/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

/** Sync-ийн компанийн нэр засварын толь (sync.py COMPANY_CANON). */
export const COMPANY_CANON: Record<string, string> = {
    MAK: 'МАК',
    'MAK Цемент ХХК': 'МАК Цемент ХХК',
    'МАК цемент ХХК': 'МАК Цемент ХХК',
    'Мастер электрик ХХК': 'Мастер Электрик ХХК',
    'Ти Ти ЖИ Ви Си Өү ХХК': 'Ти Ти Жи Ви Си Өү ХХК',
    Zuindvind: 'Зүйндвинд ХХК',
};

/** Firestore doc ID болгож болох нэрийн түлхүүр (‘/’ хориотой). */
export function nameDocId(name: string): string {
    return normName(name).replace(/\//g, '_').slice(0, 400) || '_';
}

// ── Өнгөний босгууд (templates-ийн яг утгууд) ──

export type Tone = 'good' | 'warn' | 'bad';

/** Margin %: ≥14 сайн, ≥8 анхаар, бусад муу. */
export function marginTone(pct: number): Tone {
    return pct >= 14 ? 'good' : pct >= 8 ? 'warn' : 'bad';
}

/** План биелэлт %: ≥90 сайн, ≥60 анхаар. */
export function planTone(pct: number): Tone {
    return pct >= 90 ? 'good' : pct >= 60 ? 'warn' : 'bad';
}

/** Dashboard зорилтын progress: ≥75 сайн, ≥50 анхаар. */
export function targetTone(pct: number): Tone {
    return pct >= 75 ? 'good' : pct >= 50 ? 'warn' : 'bad';
}

/** Quote winrate %: ≥50 сайн, ≥25 анхаар. */
export function winrateTone(pct: number): Tone {
    return pct >= 50 ? 'good' : pct >= 25 ? 'warn' : 'bad';
}

/** Top-10 concentration %: ≥60 муу, ≥40 анхаар. */
export function concentrationTone(pct: number): Tone {
    return pct >= 60 ? 'bad' : pct >= 40 ? 'warn' : 'good';
}

/** SLA on-time %: ≥80 сайн, ≥50 анхаар. */
export function slaTone(pct: number): Tone {
    return pct >= 80 ? 'good' : pct >= 50 ? 'warn' : 'bad';
}

export const TONE_TEXT: Record<Tone, string> = {
    good: 'text-emerald-600 dark:text-emerald-400',
    warn: 'text-amber-600 dark:text-amber-400',
    bad: 'text-rose-600 dark:text-rose-400',
};

export const TONE_BG: Record<Tone, string> = {
    good: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-100 text-amber-700 border-amber-200',
    bad: 'bg-rose-100 text-rose-700 border-rose-200',
};

// ── Tier / Churn risk / Trend (analytics.py) ──

export type CustomerTier = 'Power' | 'High' | 'Small' | 'Try';

/** Сарын дундаж орлого ₮M-ээр: ≥100 Power, ≥50 High, ≥10 Small, бусад Try. */
export function tierOf(avgMonthlyRevenueM: number): CustomerTier {
    if (avgMonthlyRevenueM >= 100) return 'Power';
    if (avgMonthlyRevenueM >= 50) return 'High';
    if (avgMonthlyRevenueM >= 10) return 'Small';
    return 'Try';
}

export const TIER_COLORS: Record<CustomerTier, string> = {
    Power: 'bg-violet-100 text-violet-700 border-violet-200',
    High: 'bg-sky-100 text-sky-700 border-sky-200',
    Small: 'bg-slate-100 text-slate-700 border-slate-200',
    Try: 'bg-zinc-100 text-zinc-600 border-zinc-200',
};

export type ChurnRisk = 'high' | 'watch' | 'ok';

export const CHURN_RISK_LABELS: Record<ChurnRisk, string> = {
    high: '🔴 Өндөр эрсдэл',
    watch: '🟡 Анхаарах',
    ok: '🟢 Хэвийн',
};

export interface CustomerRow {
    stats: CompanyStats;
    rev2025: number;
    rev2026: number;
    profit2026: number;
    /** 2026 идэвхтэй саруудын тоо. */
    activeMonths: number;
    /** (rev26 − rev25 ижил саруудад) / rev25 × 100. */
    trendPct: number | null;
    tier: CustomerTier;
    risk: ChurnRisk;
    marginPct: number;
}

/**
 * Аналитикийн мөр — analytics.py-ийн томьёогоор:
 * trend = (rev26 − rev25 ижил идэвхтэй саруудад) / base × 100;
 * risk: идэвхгүй + 2025 орлоготой ЭСВЭЛ trend ≤ −40 → high; trend ≤ −15 → watch.
 */
export function buildCustomerRow(stats: CompanyStats, nowMonth: number): CustomerRow {
    const y25 = stats.years['2025'];
    const y26 = stats.years['2026'];
    const rev2025 = y25?.revenue ?? 0;
    const rev2026 = y26?.revenue ?? 0;
    const profit2026 = y26?.profit ?? 0;
    const monthly26 = y26?.monthlyRevenue ?? [];
    const activeMonths = monthly26.filter((v) => v > 0).length;

    let trendPct: number | null = null;
    if (y25) {
        const base = (y25.monthlyRevenue ?? []).slice(0, nowMonth).reduce((a, b) => a + b, 0);
        const cur = monthly26.slice(0, nowMonth).reduce((a, b) => a + b, 0);
        if (base > 0) trendPct = ((cur - base) / base) * 100;
    }

    const avgMonthlyM =
        activeMonths > 0 ? rev2026 / activeMonths / 1e6 : rev2025 > 0 ? rev2025 / 12 / 1e6 : 0;

    let risk: ChurnRisk = 'ok';
    if ((activeMonths === 0 && rev2025 > 0) || (trendPct !== null && trendPct <= -40)) {
        risk = 'high';
    } else if (trendPct !== null && trendPct <= -15) {
        risk = 'watch';
    }

    const marginPct = rev2026 > 0 ? Math.floor((profit2026 * 100) / rev2026) : 0;

    return {
        stats,
        rev2025,
        rev2026,
        profit2026,
        activeMonths,
        trendPct,
        tier: tierOf(avgMonthlyM),
        risk,
        marginPct,
    };
}

// ── Формат ──

/** ₮{v}M — сая төгрөгөөр, бүхэл тоогоор (прототипийн ₮{:,.0f}M загвар). */
export function formatM(value: number): string {
    return `₮${Math.round(value / 1e6).toLocaleString('en-US')}M`;
}

/** NPS индекс = (promoters − detractors) / n × 100. */
export function npsIndex(scores: number[]): number | null {
    if (!scores.length) return null;
    const promoters = scores.filter((s) => s >= 9).length;
    const detractors = scores.filter((s) => s <= 6).length;
    return Math.round(((promoters - detractors) / scores.length) * 100);
}
