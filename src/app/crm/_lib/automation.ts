import {
    normalizeStageId,
    type Activity,
    type CompanyStats,
    type Deal,
    type Quote,
    type Survey,
    type TumenTaskPriority,
    type TumenTaskType,
} from '../_types';
import { buildCustomerRow } from './stats';

/**
 * Автоматжуулалтын дүрмийн engine — прототипт байгаагүй шинэ логик.
 * Тохируулж болох дүрмүүд датаг шалгаж «санал болгосон үйлдэл» гаргана.
 * Хэрэглэгч нэг товшилтоор даалгавар үүсгэнэ (autoKey-ээр давхардлыг сэргийлнэ).
 */

export interface AutomationConfig {
    staleDeal: { enabled: boolean; days: number };
    quoteExpiring: { enabled: boolean; days: number };
    lowNps: { enabled: boolean; threshold: number };
    churnCustomer: { enabled: boolean };
}

export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
    staleDeal: { enabled: true, days: 7 },
    quoteExpiring: { enabled: true, days: 3 },
    lowNps: { enabled: true, threshold: 6 },
    churnCustomer: { enabled: true },
};

export const AUTOMATION_RULE_META: {
    key: keyof AutomationConfig;
    label: string;
    desc: string;
}[] = [
    {
        key: 'staleDeal',
        label: '🔄 Идэвхгүй deal',
        desc: 'Нээлттэй deal тодорхой хоног хариугүй бол «дагах» даалгавар санал болгоно.',
    },
    {
        key: 'quoteExpiring',
        label: '💰 Үнийн санал дуусах',
        desc: 'Илгээсэн үнийн саналын хүчинтэй хугацаа дуусах дөхөхөд сануулна.',
    },
    {
        key: 'lowNps',
        label: '😟 Бага NPS',
        desc: 'Босгоос доош NPS оноо ирвэл эргэн холбогдох даалгавар санал болгоно.',
    },
    {
        key: 'churnCustomer',
        label: '📉 Churn эрсдэл',
        desc: 'Өндөр churn эрсдэлтэй харилцагчтай эргэн холбогдохыг сануулна.',
    },
];

export type Severity = 'bad' | 'warn';

export interface AutomationSuggestion {
    /** Давхардлыг сэргийлэх тогтмол түлхүүр. */
    autoKey: string;
    rule: keyof AutomationConfig;
    severity: Severity;
    title: string;
    detail: string;
    href: string;
    taskType: TumenTaskType;
    priority: TumenTaskPriority;
    dueInDays: number;
    companyId?: string;
    dealId?: string;
}

const DAY = 86_400_000;

function localTodayStr(now: number): string {
    const d = new Date(now);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

export interface EvaluateInput {
    deals: Deal[];
    activities: Activity[];
    quotes: Quote[];
    surveys: Survey[];
    companyStats: CompanyStats[];
    config: AutomationConfig;
    nowMs: number;
    nowMonth: number;
}

export function evaluateAutomations(input: EvaluateInput): AutomationSuggestion[] {
    const { deals, activities, quotes, surveys, companyStats, config, nowMs, nowMonth } = input;
    const out: AutomationSuggestion[] = [];

    // Deal тус бүрийн сүүлийн үйл ажиллагаа.
    const lastActByDeal = new Map<string, number>();
    for (const a of activities) {
        const ms = a.createdAt?.toMillis?.() ?? 0;
        if (!ms) continue;
        (a.dealIds || []).forEach((id) => {
            if (ms > (lastActByDeal.get(id) ?? 0)) lastActByDeal.set(id, ms);
        });
    }

    // ── Дүрэм 1: идэвхгүй deal ──
    if (config.staleDeal.enabled) {
        const cutoff = config.staleDeal.days * DAY;
        for (const d of deals) {
            const stage = normalizeStageId(d.stageId);
            if (stage !== 'lead' && stage !== 'opportunity' && stage !== 'pending') continue;
            const last = lastActByDeal.get(d.id) ?? d.createdAt?.toMillis?.() ?? 0;
            if (!last || nowMs - last < cutoff) continue;
            const days = Math.floor((nowMs - last) / DAY);
            out.push({
                autoKey: `stale:${d.id}`,
                rule: 'staleDeal',
                severity: days >= config.staleDeal.days * 2 ? 'bad' : 'warn',
                title: `${d.name} — ${days} хоног идэвхгүй`,
                detail: 'Нээлттэй deal удаан хариугүй байна. Дагаж холбогдоно уу.',
                href: `/crm/deals/${d.id}`,
                taskType: 'дагах',
                priority: days >= config.staleDeal.days * 2 ? 'өндөр' : 'дунд',
                dueInDays: 1,
                companyId: d.companyId,
                dealId: d.id,
            });
        }
    }

    // ── Дүрэм 2: үнийн санал дуусах ──
    if (config.quoteExpiring.enabled) {
        const today = localTodayStr(nowMs);
        const limit = localTodayStr(nowMs + config.quoteExpiring.days * DAY);
        for (const q of quotes) {
            if (q.status !== 'sent' || !q.expiryDate) continue;
            if (q.expiryDate < today || q.expiryDate > limit) continue;
            out.push({
                autoKey: `quote:${q.id}`,
                rule: 'quoteExpiring',
                severity: q.expiryDate === today ? 'bad' : 'warn',
                title: `${q.number ? q.number + ' · ' : ''}${q.title} — ${q.expiryDate}-нд дуусна`,
                detail: 'Илгээсэн үнийн саналын хугацаа дуусах дөхөж байна. Дагаж холбогдоно уу.',
                href: `/crm/quotes/${q.id}`,
                taskType: 'үнийн санал',
                priority: 'өндөр',
                dueInDays: 1,
                companyId: q.companyId,
            });
        }
    }

    // ── Дүрэм 3: бага NPS ──
    if (config.lowNps.enabled) {
        for (const s of surveys) {
            if (s.score > config.lowNps.threshold) continue;
            const ms = s.createdAt?.toMillis?.() ?? 0;
            if (ms && nowMs - ms > 30 * DAY) continue; // зөвхөн сүүлийн 30 хоног
            out.push({
                autoKey: `nps:${s.id}`,
                rule: 'lowNps',
                severity: s.score <= 3 ? 'bad' : 'warn',
                title: `${s.companyName ?? 'Харилцагч'} — NPS ${s.score}`,
                detail: 'Бага үнэлгээ өгсөн харилцагчтай эргэн холбогдож шалтгааныг тодруулна уу.',
                href: s.companyId ? `/crm/companies/${s.companyId}` : '/crm/analytics',
                taskType: 'дуудлага',
                priority: 'өндөр',
                dueInDays: 2,
                companyId: s.companyId,
            });
        }
    }

    // ── Дүрэм 4: churn эрсдэл ──
    if (config.churnCustomer.enabled) {
        const rows = companyStats
            .map((st) => buildCustomerRow(st, nowMonth))
            .filter((r) => r.risk === 'high')
            .sort((a, b) => b.rev2025 - a.rev2025)
            .slice(0, 20);
        for (const r of rows) {
            out.push({
                autoKey: `churn:${r.stats.companyKey}`,
                rule: 'churnCustomer',
                severity: 'bad',
                title: `${r.stats.name} — churn эрсдэл өндөр`,
                detail: 'Идэвх буурсан/зогссон томоохон харилцагч. Эргэн холбогдоно уу.',
                href: r.stats.companyId ? `/crm/companies/${r.stats.companyId}` : '/crm/analytics',
                taskType: 'дуудлага',
                priority: 'дунд',
                dueInDays: 3,
                companyId: r.stats.companyId,
            });
        }
    }

    return out;
}

/** Аль хэдийн үүсгэсэн autoKey-уудыг activities-аас цуглуулна (давхардал сэргийлэх). */
export function existingAutoKeys(activities: Activity[]): Set<string> {
    const set = new Set<string>();
    for (const a of activities) {
        const k = (a as unknown as { autoKey?: string }).autoKey;
        if (k) set.add(k);
    }
    return set;
}
