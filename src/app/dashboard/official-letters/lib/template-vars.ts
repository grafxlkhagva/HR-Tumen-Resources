/**
 * Template хувьсагчийн utility-ууд — resolver-т (create/page.tsx) ашиглана.
 *
 * Data source: Employee.appointedCompensation + Position.incentives / allowances
 * (appointment dialog-оор бичигддэг, appointed/reappoint дараа Employee doc-д
 * snapshot-т хадгалагддаг).
 *
 * Format нь бичгийн агуулгад шууд орохоор "цэвэрхэн" байдлаар гарна.
 */

export interface Incentive {
    type: string;
    description?: string;
    amount: number;
    unit: string;
    frequency?: string;
}

export interface Allowance {
    type: string;
    amount: number;
    period: string;
}

/** Monгol тооны формат — 1500000 → "1,500,000 ₮" */
export function formatMoney(n: number | undefined | null, currency = '₮'): string {
    if (typeof n !== 'number' || !Number.isFinite(n) || n <= 0) return '';
    return `${n.toLocaleString('mn-MN')}${currency ? ' ' + currency : ''}`;
}

/** Incentives массивыг "• type: amount unit (frequency)" жагсаалт болгон форматлана. */
export function formatIncentives(items: Incentive[] | undefined | null): string {
    if (!items || items.length === 0) return '';
    return items
        .map((i) => {
            const amt =
                i.unit === '₮'
                    ? `${(i.amount ?? 0).toLocaleString('mn-MN')}${i.unit}`
                    : `${i.amount ?? 0}${i.unit || ''}`;
            const freq = i.frequency ? ` (${i.frequency})` : '';
            return `• ${i.type}: ${amt}${freq}`;
        })
        .join('\n');
}

/** Allowances массивыг "• type: amount ₮/period" жагсаалт болгон форматлана. */
export function formatAllowances(items: Allowance[] | undefined | null): string {
    if (!items || items.length === 0) return '';
    return items
        .map((a) => {
            const amt = `${(a.amount ?? 0).toLocaleString('mn-MN')} ₮`;
            return `• ${a.type}: ${amt}/${a.period || 'сар'}`;
        })
        .join('\n');
}

/**
 * Employee.appointedCompensation-ын indicies-г Position-ийн items руу resolve
 * хийж бүрэн Incentive/Allowance object-ууд болгоно.
 */
export function resolveCompensation(
    employee: {
        appointedCompensation?: {
            salary?: number;
            incentiveIndices?: number[];
            allowanceIndices?: number[];
        };
    } | null | undefined,
    position: {
        incentives?: Incentive[];
        allowances?: Allowance[];
    } | null | undefined,
): {
    salary: number;
    incentives: Incentive[];
    allowances: Allowance[];
} {
    const comp = employee?.appointedCompensation ?? {};
    const posIncentives = position?.incentives ?? [];
    const posAllowances = position?.allowances ?? [];

    const incentives: Incentive[] = (comp.incentiveIndices ?? [])
        .map((idx) => posIncentives[idx])
        .filter((x): x is Incentive => !!x);

    const allowances: Allowance[] = (comp.allowanceIndices ?? [])
        .map((idx) => posAllowances[idx])
        .filter((x): x is Allowance => !!x);

    return {
        salary: typeof comp.salary === 'number' ? comp.salary : 0,
        incentives,
        allowances,
    };
}
