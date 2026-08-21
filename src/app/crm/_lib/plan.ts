import type { OrderYearStats } from '../_types';

/**
 * 2026 борлуулалтын төлөвлөгөө — CX Manager-ийн `2026_Q2_Sales_Plan.html`-ийн
 * ЯГ зорилтын тоонууд (эх сурвалж: тухайн HTML). Тоог өөрчлөхгүй.
 * Бодит гүйцэтгэл нь crm_order_stats синкийн агрегатаас улирлаар нэгтгэгдэнэ.
 */

export type QuarterKey = 'q1' | 'q2' | 'q3' | 'q4';
export const QUARTERS: QuarterKey[] = ['q1', 'q2', 'q3', 'q4'];
export const QUARTER_LABELS: Record<QuarterKey, string> = {
    q1: 'Q1 · 1–3-р сар',
    q2: 'Q2 · 4–6-р сар',
    q3: 'Q3 · 7–9-р сар',
    q4: 'Q4 · 10–12-р сар',
};
/** Улирал бүрийн сарын индексүүд (0 = 1-р сар). */
export const QUARTER_MONTHS: Record<QuarterKey, number[]> = {
    q1: [0, 1, 2],
    q2: [3, 4, 5],
    q3: [6, 7, 8],
    q4: [9, 10, 11],
};

/** Улирлын зорилт (₮M борлуулалт/шимтгэл, маржин %, харилцагчийн доод хязгаар). */
export interface QuarterTarget {
    sales: number; // ₮M
    profit: number; // ₮M (шимтгэл)
    margin: number; // %
    customers: number | null; // доод хязгаар (55+ гэх мэт), эсвэл null
    avgCommission: number; // ₮M/сар дундаж шимтгэл
}

export const PLAN_2026: {
    quarters: Record<QuarterKey, QuarterTarget>;
    annual: { sales: number; profit: number; margin: number; customers: number };
    /** KAM-ийн Q2 шимтгэлийн зорилт (₮M) — HTML-ийн яг тоо. */
    kamQ2: Record<string, number>;
} = {
    quarters: {
        q1: { sales: 1759, profit: 255, margin: 14.5, customers: null, avgCommission: 85 },
        q2: { sales: 2660, profit: 390, margin: 14.7, customers: 55, avgCommission: 130 },
        q3: { sales: 3000, profit: 450, margin: 15.0, customers: 65, avgCommission: 150 },
        q4: { sales: 2700, profit: 405, margin: 15.0, customers: 70, avgCommission: 135 },
    },
    annual: { sales: 10300, profit: 1500, margin: 14.5, customers: 125 },
    kamQ2: {
        Отгонбаатар: 150,
        Нямдорж: 117,
        Баяраа: 67,
        Одонтунгалаг: 35,
        Амар: 21,
    },
};

/** Улирлын бодит гүйцэтгэл (crm_order_stats-аас). ₮ утгыг ₮M болгоно. */
export interface QuarterActual {
    sales: number; // ₮M
    profit: number; // ₮M
    margin: number; // %
}

export function quarterActual(stats: OrderYearStats | null | undefined, q: QuarterKey): QuarterActual {
    const rev = stats?.monthlyRevenue ?? [];
    const prof = stats?.monthlyProfit ?? [];
    const months = QUARTER_MONTHS[q];
    const salesRaw = months.reduce((s, m) => s + (rev[m] ?? 0), 0);
    const profitRaw = months.reduce((s, m) => s + (prof[m] ?? 0), 0);
    const sales = salesRaw / 1e6;
    const profit = profitRaw / 1e6;
    const margin = salesRaw > 0 ? (profitRaw / salesRaw) * 100 : 0;
    return { sales, profit, margin };
}

/** Гүйцэтгэл % (бодит/зорилт). Зорилт 0 бол null. */
export function achievedPct(actual: number, target: number): number | null {
    if (!target) return null;
    return Math.round((actual / target) * 100);
}
