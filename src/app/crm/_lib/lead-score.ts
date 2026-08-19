import type { Company } from '../_types';
import type { CompanyStats } from '../_types';
import { tierOf, type CustomerTier } from './stats';

/**
 * Лийд/харилцагчийн оноо (0–100) — прототипт байгаагүй шинэ логик.
 * 4 хүчин зүйлээс бүрдэнэ: (1) funnel үе, (2) шалгуурын бүрдэл,
 * (3) идэвхийн шинэлэг, (4) орлого/tier. Churn эрсдэлд торгууль.
 * Тоонууд нь энэ файлд тодорхойлогдсон — өөрчилж тохируулж болно.
 */

export type LeadBand = 'hot' | 'warm' | 'cold';

export interface LeadScore {
    score: number; // 0–100
    band: LeadBand;
    reasons: string[];
    tier: CustomerTier | null;
}

export const LEAD_BAND_LABELS: Record<LeadBand, string> = {
    hot: '🔥 Халуун',
    warm: '🌤 Бүлээн',
    cold: '❄️ Хүйтэн',
};

export const LEAD_BAND_CLASSES: Record<LeadBand, string> = {
    hot: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30',
    warm: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30',
    cold: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-500/15 dark:text-slate-300 dark:border-slate-500/30',
};

/** Funnel үе бүрийн суурь оноо. */
const STAGE_POINTS: Record<string, number> = {
    lead: 5,
    contacted: 12,
    qualified: 20,
    quote: 28,
    customer: 22,
    loyal: 26,
    lost: 0,
};

function bandOf(score: number): LeadBand {
    if (score >= 66) return 'hot';
    if (score >= 40) return 'warm';
    return 'cold';
}

/** Company stats-аас 2026 (эсвэл сүүлийн) сарын дундаж орлогыг ₮M-ээр. */
function avgMonthlyM(stats?: CompanyStats | null): number {
    if (!stats) return 0;
    const y26 = stats.years?.['2026'];
    const y25 = stats.years?.['2025'];
    if (y26 && y26.revenue > 0) {
        const active = (y26.monthlyRevenue ?? []).filter((v) => v > 0).length || 1;
        return y26.revenue / active / 1e6;
    }
    if (y25 && y25.revenue > 0) return y25.revenue / 12 / 1e6;
    return 0;
}

export interface ScoreInput {
    company: Pick<Company, 'funnelStage' | 'qRoute' | 'qCargo' | 'qVolume' | 'qTiming'>;
    stats?: CompanyStats | null;
    /** Сүүлийн үйл ажиллагааны огноо (ms). Байхгүй бол идэвхийн оноо 0. */
    lastActivityMs?: number | null;
    /** Одоо (ms) — тестэд дамжуулж болно; өгөхгүй бол Date.now(). */
    nowMs?: number;
}

export function scoreCompany(input: ScoreInput): LeadScore {
    const { company, stats } = input;
    const now = input.nowMs ?? Date.now();
    const reasons: string[] = [];
    let score = 0;

    // 1) Funnel үе (max 28)
    const stagePts = STAGE_POINTS[company.funnelStage ?? 'lead'] ?? 5;
    score += stagePts;
    if (stagePts >= 20) reasons.push('Ахисан funnel үе');

    // 2) Шалгуурын бүрдэл (4 × 5 = max 20)
    const filled = [company.qRoute, company.qCargo, company.qVolume, company.qTiming].filter(
        (v) => v && String(v).trim(),
    ).length;
    score += filled * 5;
    if (filled === 4) reasons.push('Шалгуур бүрэн бөглөгдсөн');
    else if (filled === 0) reasons.push('Шалгуур бөглөөгүй');

    // 3) Идэвхийн шинэлэг (max 20)
    if (input.lastActivityMs) {
        const days = (now - input.lastActivityMs) / 86_400_000;
        if (days <= 7) {
            score += 20;
            reasons.push('7 хоногт идэвхтэй');
        } else if (days <= 30) {
            score += 12;
            reasons.push('Сүүлийн сард идэвхтэй');
        } else if (days <= 90) {
            score += 5;
        } else {
            reasons.push('90+ хоног идэвхгүй');
        }
    } else {
        reasons.push('Үйл ажиллагаа бүртгэгдээгүй');
    }

    // 4) Орлого / tier (max 25) + churn торгууль
    const avgM = avgMonthlyM(stats);
    const tier = stats ? tierOf(avgM) : null;
    if (tier === 'Power') {
        score += 25;
        reasons.push('Power харилцагч');
    } else if (tier === 'High') {
        score += 18;
        reasons.push('High харилцагч');
    } else if (tier === 'Small') {
        score += 10;
    } else if (tier === 'Try') {
        score += 3;
    }

    // Churn эрсдэлийн торгууль — 2025 орлоготой байсан ч 2026 идэвхгүй бол.
    if (stats) {
        const y25 = stats.years?.['2025'];
        const y26 = stats.years?.['2026'];
        const active26 = (y26?.monthlyRevenue ?? []).some((v) => v > 0);
        if (y25 && y25.revenue > 0 && !active26) {
            score -= 20;
            reasons.push('⚠️ 2026 идэвхгүй (churn эрсдэл)');
        }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    return { score, band: bandOf(score), reasons, tier };
}
