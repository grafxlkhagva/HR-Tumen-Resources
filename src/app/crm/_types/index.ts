import type { Timestamp } from 'firebase/firestore';

export type LifecycleStage =
    | 'subscriber'
    | 'lead'
    | 'mql'
    | 'sql'
    | 'opportunity'
    | 'customer'
    | 'evangelist';

export type LeadStatus =
    | 'new'
    | 'open'
    | 'in_progress'
    | 'connected'
    | 'unqualified';

export interface Contact {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    companyId?: string;
    ownerId?: string;
    lifecycleStage?: LifecycleStage;
    leadStatus?: LeadStatus;
    notes?: string;
    /** HubSpot Record ID — re-import-аар идемпотент upsert хийхэд хэрэглэгдэнэ. */
    hubspotId?: string;
    /** Манайтай ажилтанд таагдаагүй HubSpot owner-ийн нэр. */
    hubspotOwnerName?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface Company {
    id: string;
    name: string;
    domain?: string;
    industry?: string;
    phone?: string;
    address?: string;
    city?: string;
    country?: string;
    employeeCount?: number;
    annualRevenue?: number;
    website?: string;
    ownerId?: string;
    notes?: string;
    hubspotId?: string;
    hubspotOwnerName?: string;
    // ── Tumen funnel талбарууд ──
    /** lead/contacted/qualified/quote/customer/loyal/lost */
    funnelStage?: FunnelStage;
    /** Inbound / International / Project&Dist */
    segment?: string;
    /** Эрхэлсэн KAM-ын нэр (Sheets-тэй таарна). */
    kam?: string;
    /** web/facebook/call/referral/existing */
    source?: string;
    sourceDetail?: string;
    registerNo?: string;
    tariff?: string;
    /** Шалгуур: чиглэл */
    qRoute?: string;
    /** Шалгуур: ачааны төрөл */
    qCargo?: string;
    /** Шалгуур: хэмжээ/давтамж */
    qVolume?: string;
    /** Шалгуур: хугацаа */
    qTiming?: string;
    lostReason?: string;
    firstContactAt?: Timestamp;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export type FunnelStage =
    | 'lead'
    | 'contacted'
    | 'qualified'
    | 'quote'
    | 'customer'
    | 'loyal'
    | 'lost';

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
    subscriber: 'Захиалагч',
    lead: 'Лид',
    mql: 'Маркетингийн чанартай лид',
    sql: 'Борлуулалтын чанартай лид',
    opportunity: 'Боломж',
    customer: 'Үйлчлүүлэгч',
    evangelist: 'Сурталчлагч',
};

export const LIFECYCLE_STAGE_COLORS: Record<LifecycleStage, string> = {
    subscriber: 'bg-slate-100 text-slate-700 border-slate-200',
    lead: 'bg-sky-100 text-sky-700 border-sky-200',
    mql: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    sql: 'bg-violet-100 text-violet-700 border-violet-200',
    opportunity: 'bg-amber-100 text-amber-700 border-amber-200',
    customer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    evangelist: 'bg-rose-100 text-rose-700 border-rose-200',
};

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
    new: 'Шинэ',
    open: 'Нээлттэй',
    in_progress: 'Боловсруулж буй',
    connected: 'Холбогдсон',
    unqualified: 'Тохирохгүй',
};

export const LIFECYCLE_STAGES: LifecycleStage[] = [
    'subscriber',
    'lead',
    'mql',
    'sql',
    'opportunity',
    'customer',
    'evangelist',
];

export const LEAD_STATUSES: LeadStatus[] = [
    'new',
    'open',
    'in_progress',
    'connected',
    'unqualified',
];

// ─────────────────────────────────────── DEALS

export interface PipelineStage {
    id: string;
    label: string;
    /** 0–1 хооронд. Хаасан амжилтгүй = 0, хаасан амжилттай = 1. */
    probability: number;
    /** UI badge color. */
    color: string;
    /** "won" | "lost" | undefined — terminal stage эсэх. */
    outcome?: 'won' | 'lost';
}

export interface Pipeline {
    id: string;
    name: string;
    stages: PipelineStage[];
}

export interface Deal {
    id: string;
    name: string;
    amount?: number;
    currency?: string;
    pipelineId: string;
    stageId: string;
    closeDate?: string; // YYYY-MM-DD
    contactId?: string;
    companyId?: string;
    ownerId?: string;
    notes?: string;
    /** Хааж дуусгасан огноо (won/lost stage руу шилжсэн үед бичигдэнэ). */
    closedAt?: Timestamp;
    hubspotId?: string;
    hubspotOwnerName?: string;
    /** HubSpot-ийн оригинал stage нэр (mapping-аас гарсан). */
    hubspotStageOriginal?: string;
    // ── Tumen deal талбарууд ──
    /** mql (лийд тайлангаас) | sql (гараар/идэвхтэй эрэлхийлсэн). */
    sourceType?: 'mql' | 'sql';
    /** facebook/form/email/callpro/referral/upsell/other */
    source?: string;
    /** Чиглэл (маршрут). */
    direction?: string;
    /** Ачааны төрөл. */
    cargo?: string;
    phone?: string;
    customerType?: string;
    /** pending/lost руу шилжихэд заавал бөглөх шалтгаан. */
    lostReason?: string;
    /** Үнийн санал илгээсэн огноо (opportunity руу шилжихэд). */
    quotedAt?: Timestamp;
    /** Үнийн санал өгөх ёстой хугацаа (lead үед тавина). YYYY-MM-DD */
    quoteDue?: string;
    /** Sheets лийд синкийн давхардалгүй түлхүүр — гараар үүсгэсэн deal-д байхгүй. */
    leadKey?: string;
    /** Эрхэлсэн KAM-ын нэр. */
    kam?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

/**
 * Түмэн Тээх deal самбар — прототипийн (Logistic Dashboards/crm) яг загвар.
 * Lead → Opportunity → Won, хажуугаар нь Pending / Lost (шалтгаан заавал).
 */
export const TUMEN_PIPELINE: Pipeline = {
    id: 'default',
    name: 'Түмэн Тээх',
    stages: [
        { id: 'lead', label: '📥 Хүсэлт', probability: 0.2, color: '#0ea5e9' },
        { id: 'opportunity', label: '💰 Үнийн санал илгээсэн', probability: 0.6, color: '#6366f1' },
        { id: 'won', label: '✅ Амжилттай', probability: 1.0, color: '#10b981', outcome: 'won' },
        { id: 'pending', label: '⏳ Хүлээгдэж байгаа', probability: 0.4, color: '#f59e0b' },
        { id: 'lost', label: '✗ Алдсан', probability: 0, color: '#ef4444', outcome: 'lost' },
    ],
};

/** Хуучин нэрээр импортолсон газруудад — одоо Түмэн pipeline-ийг заана. */
export const DEFAULT_PIPELINE = TUMEN_PIPELINE;

export const DEAL_STAGE_HINT: Record<string, string> = {
    lead: 'Шинэ хүсэлт — үнийн санал өгөх огноо тавь',
    opportunity: 'Санал дөнгөж илгээсэн',
    pending: 'Хариу хүлээж буй — шалтгаантай',
    won: 'Гэрээ хийсэн · амжилттай',
    lost: 'Алдсан — шалтгаантай',
};

/** Хуучин (HubSpot-маягийн) stage ID → Түмэн stage ID. */
export const LEGACY_STAGE_MAP: Record<string, string> = {
    appointment: 'lead',
    qualified: 'lead',
    presentation: 'opportunity',
    decision: 'opportunity',
    closed_won: 'won',
    closed_lost: 'lost',
    // Sheets синкийн нэмэлт үеүд
    prospect: 'lead',
    carrier: 'lost',
};

/** Ямар ч stageId-г Түмэн pipeline-ийн хүчинтэй ID руу буулгана. */
export function normalizeStageId(stageId: string): string {
    if (TUMEN_PIPELINE.stages.some((s) => s.id === stageId)) return stageId;
    return LEGACY_STAGE_MAP[stageId] ?? 'lead';
}

export const DEFAULT_CURRENCY = 'MNT';

export function getStage(pipeline: Pipeline, stageId: string): PipelineStage | undefined {
    return (
        pipeline.stages.find((s) => s.id === stageId) ??
        pipeline.stages.find((s) => s.id === normalizeStageId(stageId))
    );
}

export function formatMoney(amount?: number, currency: string = DEFAULT_CURRENCY): string {
    if (amount === undefined || amount === null || isNaN(amount)) return '—';
    try {
        return new Intl.NumberFormat('mn-MN', {
            style: 'currency',
            currency,
            maximumFractionDigits: 0,
        }).format(amount);
    } catch {
        return `${amount.toLocaleString('mn-MN')} ${currency}`;
    }
}

// ─────────────────────────────────────── ACTIVITIES

export type ActivityType = 'note' | 'call' | 'email' | 'meeting' | 'task';

export type CallOutcome =
    | 'connected'
    | 'no_answer'
    | 'left_voicemail'
    | 'busy'
    | 'wrong_number';

export type EmailDirection = 'outbound' | 'inbound';

export interface Activity {
    id: string;
    type: ActivityType;
    body?: string;
    /** Холбогдсон харилцагч ID-уудын массив. */
    contactIds?: string[];
    /** Холбогдсон байгууллага ID-уудын массив. */
    companyIds?: string[];
    /** Холбогдсон гэрээ ID-уудын массив. */
    dealIds?: string[];
    /** Холбогдсон tickets ID-уудын массив. */
    ticketIds?: string[];
    ownerId?: string;

    // Type-specific fields
    /** task | meeting — Хийгдэх / болох огноо. */
    dueAt?: Timestamp;
    /** task — Гүйцэтгэсэн огноо. */
    completedAt?: Timestamp;
    /** call — дуудлагын үр дүн. */
    callOutcome?: CallOutcome;
    /** call | meeting — үргэлжилсэн минут. */
    durationMinutes?: number;
    /** email — гарчиг. */
    emailSubject?: string;
    /** email — хаашаа. */
    emailDirection?: EmailDirection;
    /** meeting — байршил эсвэл линк. */
    meetingLocation?: string;
    /** task — Title (товч нэр). */
    title?: string;
    // ── Tumen талбарууд ──
    /** task — төрөл (дуудлага/уулзалт/үнийн санал/гэрээ/дагах/бичиг/бусад). */
    taskType?: TumenTaskType;
    /** task — эрэмбэ (өндөр/дунд/бага). */
    priority?: TumenTaskPriority;
    /** Эрхэлсэн KAM-ын нэр (scoping-д). */
    kam?: string;
    /** meeting — уулзалт эсвэл дуудлага (календарийн өнгө). */
    meetingKind?: 'уулзалт' | 'дуудлага';

    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export type TumenTaskType =
    | 'дуудлага'
    | 'уулзалт'
    | 'үнийн санал'
    | 'гэрээ'
    | 'дагах'
    | 'бичиг'
    | 'бусад';

export type TumenTaskPriority = 'өндөр' | 'дунд' | 'бага';

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
    note: 'Тэмдэглэл',
    call: 'Дуудлага',
    email: 'Имэйл',
    meeting: 'Уулзалт',
    task: 'Даалгавар',
};

export const ACTIVITY_TYPE_COLORS: Record<ActivityType, string> = {
    note: '#64748b',
    call: '#0ea5e9',
    email: '#6366f1',
    meeting: '#8b5cf6',
    task: '#f59e0b',
};

export const ACTIVITY_TYPES: ActivityType[] = ['note', 'call', 'email', 'meeting', 'task'];

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
    connected: 'Холбогдсон',
    no_answer: 'Хариулсангүй',
    left_voicemail: 'Voicemail үлдээсэн',
    busy: 'Завгүй',
    wrong_number: 'Буруу дугаар',
};

export const CALL_OUTCOMES: CallOutcome[] = [
    'connected',
    'no_answer',
    'left_voicemail',
    'busy',
    'wrong_number',
];

// ─────────────────────────────────────── TICKETS

export type TicketStatus =
    | 'new'
    | 'in_progress'
    | 'waiting_on_customer'
    | 'resolved'
    | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketSource = 'email' | 'phone' | 'chat' | 'form' | 'manual' | 'other';

export interface TicketStatusConfig {
    id: TicketStatus;
    label: string;
    color: string;
    /** "resolved" | "closed" — terminal эсэх. */
    terminal?: boolean;
}

export const TICKET_STATUSES: TicketStatusConfig[] = [
    { id: 'new', label: 'Шинэ', color: '#6366f1' },
    { id: 'in_progress', label: 'Боловсруулж буй', color: '#0ea5e9' },
    { id: 'waiting_on_customer', label: 'Хэрэглэгчийн хариу хүлээж буй', color: '#f59e0b' },
    { id: 'resolved', label: 'Шийдэгдсэн', color: '#10b981', terminal: true },
    { id: 'closed', label: 'Хаасан', color: '#64748b', terminal: true },
];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
    low: 'Бага',
    medium: 'Дунд',
    high: 'Өндөр',
    urgent: 'Нэн яаралтай',
};

export const TICKET_PRIORITY_COLORS: Record<TicketPriority, string> = {
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-sky-100 text-sky-700 border-sky-200',
    high: 'bg-amber-100 text-amber-700 border-amber-200',
    urgent: 'bg-rose-100 text-rose-700 border-rose-200',
};

export const TICKET_PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];

export const TICKET_SOURCE_LABELS: Record<TicketSource, string> = {
    email: 'Имэйл',
    phone: 'Утас',
    chat: 'Чат',
    form: 'Форм',
    manual: 'Гарын',
    other: 'Бусад',
};

export const TICKET_SOURCES: TicketSource[] = ['email', 'phone', 'chat', 'form', 'manual', 'other'];

export interface Ticket {
    id: string;
    subject: string;
    body?: string;
    status: TicketStatus;
    priority: TicketPriority;
    source?: TicketSource;
    contactId?: string;
    companyId?: string;
    dealId?: string;
    ownerId?: string;
    /** SLA дуусах огноо (дуусах хугацаа). */
    dueAt?: Timestamp;
    /** Эхэн хариу өгсөн огноо (responsed). */
    firstRespondedAt?: Timestamp;
    /** resolved status руу шилжсэн огноо. */
    resolvedAt?: Timestamp;
    /** closed status руу шилжсэн огноо. */
    closedAt?: Timestamp;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export function getTicketStatus(id: string): TicketStatusConfig | undefined {
    return TICKET_STATUSES.find((s) => s.id === id);
}

// ─────────────────────────────────────── PRODUCTS

export interface Product {
    id: string;
    name: string;
    sku?: string;
    description?: string;
    unitPrice: number;
    currency: string;
    /** 0–100 хувь. Жишээ нь НӨАТ 10. */
    taxRate?: number;
    category?: string;
    isActive?: boolean;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// ─────────────────────────────────────── QUOTES

export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface QuoteStatusConfig {
    id: QuoteStatus;
    label: string;
    color: string;
}

export const QUOTE_STATUSES: QuoteStatusConfig[] = [
    { id: 'draft', label: 'Ноорог', color: '#64748b' },
    { id: 'sent', label: 'Илгээсэн', color: '#0ea5e9' },
    { id: 'accepted', label: 'Зөвшөөрсөн', color: '#10b981' },
    { id: 'rejected', label: 'Татгалзсан', color: '#ef4444' },
    { id: 'expired', label: 'Хугацаа дууссан', color: '#94a3b8' },
];

export function getQuoteStatus(id: string): QuoteStatusConfig | undefined {
    return QUOTE_STATUSES.find((s) => s.id === id);
}

export interface QuoteLineItem {
    id: string;
    productId?: string;
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    /** 0–100 хувь. */
    discountPercent?: number;
    /** 0–100 хувь. */
    taxRate?: number;
}

export interface QuoteTotals {
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    total: number;
}

export function computeLineTotal(item: QuoteLineItem): {
    subtotal: number;
    discount: number;
    tax: number;
    total: number;
} {
    const subtotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    const discount = subtotal * ((Number(item.discountPercent) || 0) / 100);
    const taxBase = subtotal - discount;
    const tax = taxBase * ((Number(item.taxRate) || 0) / 100);
    const total = taxBase + tax;
    return { subtotal, discount, tax, total };
}

export function computeQuoteTotals(items: QuoteLineItem[]): QuoteTotals {
    const totals = items.reduce<QuoteTotals>(
        (acc, item) => {
            const t = computeLineTotal(item);
            acc.subtotal += t.subtotal;
            acc.totalDiscount += t.discount;
            acc.totalTax += t.tax;
            acc.total += t.total;
            return acc;
        },
        { subtotal: 0, totalDiscount: 0, totalTax: 0, total: 0 },
    );
    return totals;
}

export interface Quote {
    id: string;
    /** Q-2026-0001 хэлбэрийн дугаар. */
    number?: string;
    title: string;
    status: QuoteStatus;
    dealId?: string;
    contactId?: string;
    companyId?: string;
    ownerId?: string;
    /** YYYY-MM-DD */
    issueDate?: string;
    expiryDate?: string;
    currency: string;
    lineItems: QuoteLineItem[];
    notes?: string;
    terms?: string;
    // Кэш totals (хүснэгт дээр шууд харуулахад)
    subtotal: number;
    totalDiscount: number;
    totalTax: number;
    total: number;
    sentAt?: Timestamp;
    acceptedAt?: Timestamp;
    rejectedAt?: Timestamp;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export function nextQuoteNumber(existing: Quote[]): string {
    const year = new Date().getFullYear();
    const prefix = `Q-${year}-`;
    const max = existing
        .map((q) => q.number)
        .filter((n): n is string => !!n && n.startsWith(prefix))
        .map((n) => parseInt(n.slice(prefix.length), 10) || 0)
        .reduce((a, b) => Math.max(a, b), 0);
    return `${prefix}${String(max + 1).padStart(4, '0')}`;
}

// ─────────────────────────────────────── EMAIL TEMPLATES

export type EmailTemplateCategory = 'quote' | 'follow_up' | 'thank_you' | 'introduction' | 'general';

export const EMAIL_TEMPLATE_CATEGORY_LABELS: Record<EmailTemplateCategory, string> = {
    quote: 'Үнийн санал',
    follow_up: 'Дараагийн холбоо',
    thank_you: 'Талархал',
    introduction: 'Танилцуулга',
    general: 'Бусад',
};

export const EMAIL_TEMPLATE_CATEGORIES: EmailTemplateCategory[] = [
    'quote',
    'follow_up',
    'thank_you',
    'introduction',
    'general',
];

export interface EmailTemplate {
    id: string;
    name: string;
    category: EmailTemplateCategory;
    subject: string;
    /** Plain text эсвэл HTML. Body-д `{{contact.firstName}}` гэх мэт хувьсагч ашиглаж болно. */
    body: string;
    description?: string;
    ownerId?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

/** Хувьсагч substitution-д хэрэглэгдэх context. */
export interface EmailVariableContext {
    contact?: {
        firstName?: string;
        lastName?: string;
        fullName?: string;
        email?: string;
        phone?: string;
        jobTitle?: string;
    };
    company?: {
        name?: string;
        domain?: string;
    };
    deal?: {
        name?: string;
        amount?: string;
    };
    quote?: {
        number?: string;
        title?: string;
        total?: string;
        issueDate?: string;
        expiryDate?: string;
    };
    owner?: {
        firstName?: string;
        lastName?: string;
        fullName?: string;
        email?: string;
        phone?: string;
    };
    org?: {
        name?: string;
    };
}

const VAR_REGEX = /\{\{\s*([\w.]+)\s*\}\}/g;

function lookup(ctx: EmailVariableContext, path: string): string {
    const parts = path.split('.');
    let cur: unknown = ctx;
    for (const part of parts) {
        if (cur && typeof cur === 'object' && part in (cur as Record<string, unknown>)) {
            cur = (cur as Record<string, unknown>)[part];
        } else {
            return '';
        }
    }
    return cur == null ? '' : String(cur);
}

export function substituteVariables(
    template: string,
    ctx: EmailVariableContext,
): string {
    return template.replace(VAR_REGEX, (_, path: string) => lookup(ctx, path));
}

// ─────────────────────────────────────── TUMEN CRM (Flask прототипоос)

/** Компанийн funnel дараалал (прототипийн STAGES + lost). */
export const FUNNEL_STAGES: FunnelStage[] = [
    'lead',
    'contacted',
    'qualified',
    'quote',
    'customer',
    'loyal',
];

/** Funnel самбарт харагдах идэвхтэй үеүд. */
export const ACTIVE_FUNNEL_STAGES: FunnelStage[] = ['lead', 'contacted', 'qualified', 'quote'];

export const FUNNEL_STAGE_LABELS: Record<FunnelStage, string> = {
    lead: 'Lead · Шинэ сонирхол',
    contacted: 'Contacted · Холбогдсон',
    qualified: 'Qualified · Боломжит',
    quote: 'Quote · Үнийн санал',
    customer: 'Customer · Харилцагч',
    loyal: 'Loyal · Үнэнч',
    lost: 'Lost · Алдсан',
};

export const FUNNEL_STAGE_COLORS: Record<FunnelStage, string> = {
    lead: 'bg-sky-100 text-sky-700 border-sky-200',
    contacted: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    qualified: 'bg-violet-100 text-violet-700 border-violet-200',
    quote: 'bg-amber-100 text-amber-700 border-amber-200',
    customer: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    loyal: 'bg-teal-100 text-teal-700 border-teal-200',
    lost: 'bg-rose-100 text-rose-700 border-rose-200',
};

/** pending/lost руу шилжихэд сонгуулах шалтгаанууд. */
export const LOST_REASONS = ['Үнэ', 'Хугацаа', 'Өрсөлдөгч', 'Хариу өгсөнгүй', 'Бусад'];

/** Компанийн эх сурвалж. */
export const COMPANY_SOURCES: Record<string, string> = {
    web: 'Вэб форм',
    facebook: 'Facebook',
    call: 'Дуудлага',
    referral: 'Санал болголт',
    existing: 'Одоо байгаа',
};

/** Deal-ийн эх сурвалж. */
export const DEAL_SOURCES: Record<string, string> = {
    facebook: 'Facebook',
    form: 'Вэб форм',
    email: 'И-мэйл',
    callpro: 'CallPro',
    referral: 'Санал болголт',
    upsell: 'Хуучин харилцагч (upsell)',
    other: 'Бусад',
};

// ── KAM / баг / зорилт ──

export const KAM_LIST = ['Нямдорж', 'Баяраа', 'Амар', 'Одонтунгалаг', 'Отгонбаатар'];

export const TEAM_OF: Record<string, string> = {
    Нямдорж: 'Орон нутаг',
    Баяраа: 'Орон нутаг',
    Амар: 'Олон улс',
    Одонтунгалаг: 'Төсөл/Түгээлт',
    Отгонбаатар: 'Төсөл/Түгээлт',
};

export const TEAMS = ['Орон нутаг', 'Олон улс', 'Төсөл/Түгээлт'];

/** 2026 оны зорилт — ₮M ашгаар (прототипийн app.py-гийн утга, яг таг). */
export const TARGET_2026 = {
    monthly: [75, 75, 105, 120, 135, 135, 120, 165, 165, 165, 135, 105],
    total: 1500,
    kam: { Нямдорж: 533, Баяраа: 253, Амар: 182, Одонтунгалаг: 95, Отгонбаатар: 438 } as Record<string, number>,
    team: { 'Орон нутаг': 786, 'Олон улс': 182, 'Төсөл/Түгээлт': 533 } as Record<string, number>,
};

/** Sheets шийт → сегмент. */
export const SEG_MAP: Record<string, string> = {
    Автокран: 'Inbound',
    Барло: 'Inbound',
    Дотор: 'Inbound',
    'Орон нутаг': 'Inbound',
    'Олон улс': 'International',
    Төсөл: 'Project&Dist',
    Түгээлт: 'Project&Dist',
    Цемент: 'Project&Dist',
    Элс: 'Project&Dist',
};

export const SEGMENTS = ['Inbound', 'International', 'Project&Dist'];

// ── Даалгаврын төрөл/эрэмбэ ──

export const TUMEN_TASK_TYPES: { id: TumenTaskType; label: string }[] = [
    { id: 'дуудлага', label: '📞 Дуудлага' },
    { id: 'уулзалт', label: '🤝 Уулзалт' },
    { id: 'үнийн санал', label: '💰 Үнийн санал' },
    { id: 'гэрээ', label: '📄 Гэрээ' },
    { id: 'дагах', label: '🔄 Дагах' },
    { id: 'бичиг', label: '📎 Бичиг баримт' },
    { id: 'бусад', label: '✔ Бусад' },
];

export const TUMEN_TASK_TYPE_LABEL: Record<TumenTaskType, string> = Object.fromEntries(
    TUMEN_TASK_TYPES.map((t) => [t.id, t.label]),
) as Record<TumenTaskType, string>;

export const TUMEN_TASK_PRIORITIES: { id: TumenTaskPriority; label: string }[] = [
    { id: 'өндөр', label: '🔴 Өндөр' },
    { id: 'дунд', label: '🟡 Дунд' },
    { id: 'бага', label: '⚪ Бага' },
];

// ── NPS судалгаа ──

export type NpsZone = 'promoter' | 'passive' | 'detractor';

export interface Survey {
    id: string;
    companyId?: string;
    /** Компани нэрээр холбох (Sheets синкээс ирсэн бол). */
    companyName?: string;
    /** 0–10 */
    score: number;
    zone: NpsZone;
    note?: string;
    ownerId?: string;
    createdAt?: Timestamp;
}

export function npsZone(score: number): NpsZone {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
}

export const NPS_ZONE_LABELS: Record<NpsZone, string> = {
    promoter: 'Дэмжигч (9-10)',
    passive: 'Дунд (7-8)',
    detractor: 'Шүүмжлэгч (0-6)',
};

// ── Тээвэрчин ──

export interface Carrier {
    id: string;
    /** Жолоочийн нэр (orders.driver-тэй таарна). */
    name: string;
    /** Чирэгч. */
    trailer?: string;
    phone?: string;
    /** Өглөг үлдэгдэл (₮). */
    balance?: number;
    note?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// ── Аудит лог ──

export type AuditAction = 'create' | 'update' | 'delete' | 'stage' | 'sync';

export interface AuditEntry {
    id: string;
    userId?: string;
    userName?: string;
    action: AuditAction;
    /** Аль collection/төрөл дээр (ж: crm_deals). */
    entity: string;
    entityId?: string;
    detail?: string;
    createdAt?: Timestamp;
}

// ── Захиалга (Sheets синк) ба агрегатууд ──

export interface CrmOrder {
    id: string;
    company: string;
    /** Нэрийн нормчилсон түлхүүр (жижиг үсэг, ххк/хк/llc/ltd хассан). */
    companyKey: string;
    kam?: string;
    sheet?: string;
    segment?: string;
    orderDate?: string;
    month: number;
    year: number;
    /** Захиалагч НӨАТ-гүй (₮). */
    revenue: number;
    /** Ашиг (₮). */
    profit: number;
    invNo?: string;
    /** Жолооч нэр. */
    driver?: string;
    /** Чирэгч. */
    trailer?: string;
    /** Тээвэрчин үнэ (₮). */
    carrierPrice?: number;
    /** year*100+month — эрэмбэлэх/шүүхэд. */
    ym: number;
    syncedAt?: Timestamp;
}

/** Жилийн агрегат — crm_order_stats/{year}. */
export interface OrderYearStats {
    id: string;
    year: number;
    revenue: number;
    profit: number;
    trips: number;
    customers: number;
    /** 12 элементтэй массивууд (0-индекс = 1-р сар). */
    monthlyRevenue: number[];
    monthlyProfit: number[];
    monthlyTrips: number[];
    byKam: Record<string, { revenue: number; profit: number; trips: number }>;
    byTeam: Record<string, { revenue: number; profit: number; trips: number }>;
    bySegment: Record<string, { revenue: number; profit: number; trips: number }>;
    updatedAt?: Timestamp;
}

/** Компанийн агрегат — crm_company_stats/{companyKey-hash}. */
export interface CompanyStats {
    id: string;
    name: string;
    companyKey: string;
    /** Холбогдсон crm_companies doc (нэрээр таарвал). */
    companyId?: string;
    kam?: string;
    segment?: string;
    /** Жил бүрийн дүн. Түлхүүр: '2022'...'2026'. */
    years: Record<
        string,
        { revenue: number; profit: number; trips: number; monthlyRevenue: number[] }
    >;
    /** Хамгийн сүүлийн захиалгын ym. */
    lastYm?: number;
    updatedAt?: Timestamp;
}

/** Тээвэрчний агрегат — crm_carrier_stats/{driverKey}. */
export interface CarrierStats {
    id: string;
    name: string;
    trailers: string[];
    trips: number;
    /** Тээвэрчин үнийн нийлбэр (₮). */
    totalPrice: number;
    years: Record<string, { trips: number; totalPrice: number }>;
    lastYm?: number;
    updatedAt?: Timestamp;
}

/** Синкийн төлөв — crm_settings/sync. */
export interface SyncStatus {
    lastSyncAt?: Timestamp;
    status?: 'ok' | 'error' | 'running';
    message?: string;
    orderCount?: number;
    companyCount?: number;
    newCompanies?: number;
    leadDeals?: number;
}

/** UI-д харуулах хувьсагчдын жагсаалт. */
export const EMAIL_VARIABLES: { path: string; label: string; group: string }[] = [
    { path: 'contact.fullName', label: 'Бүтэн нэр', group: 'Харилцагч' },
    { path: 'contact.firstName', label: 'Нэр', group: 'Харилцагч' },
    { path: 'contact.lastName', label: 'Овог', group: 'Харилцагч' },
    { path: 'contact.email', label: 'Имэйл', group: 'Харилцагч' },
    { path: 'contact.phone', label: 'Утас', group: 'Харилцагч' },
    { path: 'contact.jobTitle', label: 'Албан тушаал', group: 'Харилцагч' },
    { path: 'company.name', label: 'Нэр', group: 'Байгууллага' },
    { path: 'quote.number', label: 'Дугаар', group: 'Үнийн санал' },
    { path: 'quote.title', label: 'Гарчиг', group: 'Үнийн санал' },
    { path: 'quote.total', label: 'Нийт дүн', group: 'Үнийн санал' },
    { path: 'quote.expiryDate', label: 'Дуусах огноо', group: 'Үнийн санал' },
    { path: 'deal.name', label: 'Гэрээний нэр', group: 'Гэрээ' },
    { path: 'deal.amount', label: 'Гэрээний дүн', group: 'Гэрээ' },
    { path: 'owner.fullName', label: 'Илгээгчийн нэр', group: 'Илгээгч' },
    { path: 'owner.email', label: 'Илгээгчийн имэйл', group: 'Илгээгч' },
    { path: 'org.name', label: 'Компанийн нэр', group: 'Манай компани' },
];
