import { Timestamp } from 'firebase/firestore';
import {
    DEFAULT_CURRENCY,
    DEFAULT_PIPELINE,
    type LeadStatus,
    type LifecycleStage,
} from '../../_types';
import type { Employee } from '@/types';

// ─────────────────────────────────────── DETECTION

export type CsvKind = 'contacts' | 'companies' | 'deals' | 'unknown';

export function detectCsvKind(headers: string[]): CsvKind {
    const set = new Set(headers.map((h) => h.toLowerCase()));
    if (set.has('deal name') && set.has('deal stage')) return 'deals';
    if (set.has('company name') || set.has('company owner')) return 'companies';
    if (set.has('email') || set.has('first name') || set.has('contact owner')) return 'contacts';
    return 'unknown';
}

// ─────────────────────────────────────── HUBSPOT STAGE MAP

const STAGE_MAP: Record<string, string> = {
    // Үе шат HubSpot-ээс манай stage руу
    'үнэ өгөх': 'appointment',
    'захиалга ирсэн': 'qualified',
    'санал өгөх': 'presentation',
    'санал өгсөн': 'presentation',
    'шийдвэр гарсан': 'decision',
    'амжилттай': 'closed_won',
    'амжилтай': 'closed_won',
    'тээвэр амжилттай': 'closed_won',
    'амжилтгүй': 'closed_lost',
};

export function mapHubspotStage(input: string): {
    stageId: string;
    matched: boolean;
} {
    const key = input.trim().toLowerCase();
    const id = STAGE_MAP[key];
    if (id && DEFAULT_PIPELINE.stages.find((s) => s.id === id)) {
        return { stageId: id, matched: true };
    }
    return { stageId: DEFAULT_PIPELINE.stages[0].id, matched: false };
}

export function getKnownStageMap(): Record<string, string> {
    return { ...STAGE_MAP };
}

// ─────────────────────────────────────── LIFECYCLE / LEAD STATUS MAP

const LIFECYCLE_MAP: Record<string, LifecycleStage> = {
    subscriber: 'subscriber',
    lead: 'lead',
    'marketingqualifiedlead': 'mql',
    'salesqualifiedlead': 'sql',
    opportunity: 'opportunity',
    customer: 'customer',
    evangelist: 'evangelist',
};

export function mapLifecycleStage(input?: string): LifecycleStage {
    if (!input) return 'lead';
    const key = input.trim().toLowerCase().replace(/\s+/g, '');
    return LIFECYCLE_MAP[key] || 'lead';
}

export function mapLeadStatus(input?: string): LeadStatus {
    if (!input) return 'new';
    const key = input.trim().toLowerCase();
    if (key.includes('connect')) return 'connected';
    if (key.includes('progress') || key.includes('working')) return 'in_progress';
    if (key.includes('open')) return 'open';
    if (key.includes('unqualif') || key.includes('disqualif')) return 'unqualified';
    return 'new';
}

// ─────────────────────────────────────── OWNER MATCHING

/**
 * HubSpot owner нэрийг манай employees-той тааруулах.
 * "Chinguun Ganbold (Deactivated User)" г.м.-ийг цэвэрлэнэ.
 * Тааралцвал ownerId-г, эс тааралцвал hubspotOwnerName-г буцаана.
 */
export function matchOwner(
    rawName: string,
    employees: Employee[],
): { ownerId?: string; hubspotOwnerName: string } {
    const cleaned = rawName
        .replace(/\(deactivated user\)/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!cleaned) return { hubspotOwnerName: rawName };

    const lower = cleaned.toLowerCase();
    const tokens = lower.split(/\s+/).filter(Boolean);

    // 1) firstName + lastName бүхэлд нь
    let match = employees.find((e) => {
        const fn = (e.firstName || '').toLowerCase();
        const ln = (e.lastName || '').toLowerCase();
        const full = [ln, fn].filter(Boolean).join(' ');
        const fullRev = [fn, ln].filter(Boolean).join(' ');
        return full === lower || fullRev === lower;
    });
    if (match) return { ownerId: match.id, hubspotOwnerName: cleaned };

    // 2) Эхний токеноор
    const first = tokens[0] || '';
    const last = tokens[tokens.length - 1] || '';
    match = employees.find((e) => {
        const fn = (e.firstName || '').toLowerCase();
        const ln = (e.lastName || '').toLowerCase();
        if (!first) return false;
        return (
            (fn && (fn === first || fn === last)) ||
            (ln && (ln === first || ln === last))
        );
    });
    if (match) return { ownerId: match.id, hubspotOwnerName: cleaned };

    return { hubspotOwnerName: cleaned };
}

// ─────────────────────────────────────── DATE / NUMBER PARSING

export function parseHubspotDate(input?: string): Timestamp | undefined {
    if (!input) return undefined;
    // "2026-05-30 15:05" эсвэл ISO
    const t = input.replace(' ', 'T');
    const d = new Date(t);
    if (isNaN(d.getTime())) return undefined;
    return Timestamp.fromDate(d);
}

export function parseHubspotDateOnly(input?: string): string | undefined {
    if (!input) return undefined;
    const ts = parseHubspotDate(input);
    if (!ts) return undefined;
    return new Date(ts.seconds * 1000).toISOString().slice(0, 10);
}

export function parseAmount(input?: string): number | undefined {
    if (!input) return undefined;
    const cleaned = input.replace(/[^\d.-]/g, '');
    if (!cleaned) return undefined;
    const n = Number(cleaned);
    return isNaN(n) ? undefined : n;
}

export function parseInteger(input?: string): number | undefined {
    if (!input) return undefined;
    const n = parseInt(input.replace(/[^\d-]/g, ''), 10);
    return isNaN(n) ? undefined : n;
}

// ─────────────────────────────────────── ROW → ENTITY

export interface RowMapResult<T> {
    data: T;
    issues: string[];
}

export interface MappedContact {
    hubspotId: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    jobTitle?: string;
    companyHubspotId?: string;
    /** Имэйлээс ялгаж авсан domain (fallback link-д ашиглана). */
    emailDomain?: string;
    /** "Company Name" талбараас (HubSpot association ID байхгүй үед нэрээр fallback). */
    companyNameRaw?: string;
    lifecycleStage: LifecycleStage;
    leadStatus: LeadStatus;
    ownerId?: string;
    hubspotOwnerName?: string;
    notes?: string;
}

function extractEmailDomain(email?: string): string | undefined {
    if (!email) return undefined;
    const m = email.toLowerCase().match(/@([^\s>]+)/);
    if (!m) return undefined;
    return m[1].replace(/^www\./, '');
}

export function mapContactRow(
    row: Record<string, string>,
    employees: Employee[],
): RowMapResult<MappedContact> | null {
    const hubspotId = row['Record ID']?.trim();
    if (!hubspotId) return null;

    const firstName = row['First Name']?.trim() || undefined;
    const lastName = row['Last Name']?.trim() || undefined;
    const email = row['Email']?.trim().toLowerCase() || undefined;

    if (!firstName && !lastName && !email) {
        return {
            data: {
                hubspotId,
                lifecycleStage: 'lead',
                leadStatus: 'new',
            },
            issues: ['Хоосон бичлэг (нэр/имэйл алга)'],
        };
    }

    const ownerName = row['Contact owner']?.trim() || '';
    const matched = ownerName ? matchOwner(ownerName, employees) : {};

    const csvDomain = row['Email Domain']?.trim().toLowerCase();
    const emailDomain = csvDomain || extractEmailDomain(email);

    return {
        data: {
            hubspotId,
            firstName,
            lastName,
            email,
            phone: row['Phone Number']?.trim() || row['Mobile Phone Number']?.trim() || undefined,
            jobTitle: row['Job Title']?.trim() || row['Албан тушаал']?.trim() || undefined,
            companyHubspotId: row['Primary Associated Company ID']?.trim() || undefined,
            emailDomain: emailDomain && emailDomain !== '' ? emailDomain : undefined,
            companyNameRaw:
                row['Associated Company']?.trim() ||
                row['Company Name']?.trim() ||
                undefined,
            lifecycleStage: mapLifecycleStage(row['Lifecycle Stage']),
            leadStatus: mapLeadStatus(row['Lead Status']),
            ...matched,
            notes: row['Notes']?.trim() || undefined,
        },
        issues: [],
    };
}

/** Гэрээний нэрнээс имэйл сугалах (HubSpot-ын маяг "ОУ: 99151696 user@example.com" шиг). */
export function extractEmailFromText(text?: string): string | undefined {
    if (!text) return undefined;
    const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    return m ? m[0].toLowerCase() : undefined;
}

export interface MappedCompany {
    hubspotId: string;
    name: string;
    domain?: string;
    industry?: string;
    phone?: string;
    city?: string;
    country?: string;
    website?: string;
    address?: string;
    employeeCount?: number;
    annualRevenue?: number;
    ownerId?: string;
    hubspotOwnerName?: string;
}

export function mapCompanyRow(
    row: Record<string, string>,
    employees: Employee[],
): RowMapResult<MappedCompany> | null {
    const hubspotId = row['Record ID']?.trim();
    if (!hubspotId) return null;

    const name = row['Company name']?.trim() || row['Company Name']?.trim();
    const ownerName = row['Company owner']?.trim() || '';
    const matched = ownerName ? matchOwner(ownerName, employees) : {};

    if (!name) {
        return {
            data: {
                hubspotId,
                name: `(нэргүй компани ${hubspotId.slice(-6)})`,
                ...matched,
            },
            issues: ['Нэр алга — placeholder ашигласан'],
        };
    }

    return {
        data: {
            hubspotId,
            name,
            domain:
                row['Company Domain Name']?.trim().toLowerCase() ||
                row['Domain']?.trim().toLowerCase() ||
                undefined,
            website: row['Website URL']?.trim() || undefined,
            industry: row['Industry']?.trim() || undefined,
            phone: row['Phone Number']?.trim() || undefined,
            city: row['City']?.trim() || undefined,
            country: row['Country/Region']?.trim() || undefined,
            address: row['Street Address']?.trim() || undefined,
            employeeCount: parseInteger(row['Number of Employees']),
            annualRevenue: parseAmount(row['Annual Revenue']),
            ...matched,
        },
        issues: [],
    };
}

export interface MappedDeal {
    hubspotId: string;
    name: string;
    amount?: number;
    currency: string;
    pipelineId: string;
    stageId: string;
    hubspotStageOriginal: string;
    closeDate?: string;
    closedAt?: Timestamp;
    companyHubspotId?: string;
    contactHubspotId?: string;
    /** Гэрээний нэрнээс ялгасан имэйл (associations байхгүй үед contact холбоход). */
    nameEmail?: string;
    notes?: string;
    ownerId?: string;
    hubspotOwnerName?: string;
}

export function mapDealRow(
    row: Record<string, string>,
    employees: Employee[],
): RowMapResult<MappedDeal> | null {
    const hubspotId = row['Record ID']?.trim();
    if (!hubspotId) return null;

    const name = row['Deal Name']?.trim() || `(нэргүй гэрээ ${hubspotId.slice(-6)})`;
    const stageOriginal = row['Deal Stage']?.trim() || '';
    const { stageId, matched } = mapHubspotStage(stageOriginal);
    const ownerName = row['Deal owner']?.trim() || '';
    const ownerMatched = ownerName ? matchOwner(ownerName, employees) : {};

    const issues: string[] = [];
    if (stageOriginal && !matched) {
        issues.push(`Үе шат "${stageOriginal}" mapping олдсонгүй — anchor stage-руу шилжүүлсэн`);
    }

    const closedAt =
        stageId === 'closed_won' || stageId === 'closed_lost'
            ? parseHubspotDate(row['Close Date'])
            : undefined;

    return {
        data: {
            hubspotId,
            name,
            amount:
                parseAmount(row['Amount']) ??
                parseAmount(row['Amount in company currency']),
            currency: row['Currency']?.trim() || DEFAULT_CURRENCY,
            pipelineId: DEFAULT_PIPELINE.id,
            stageId,
            hubspotStageOriginal: stageOriginal,
            closeDate: parseHubspotDateOnly(row['Close Date']),
            closedAt,
            companyHubspotId:
                row['Associated Company IDs']?.trim() ||
                row['Primary Associated Company ID']?.trim() ||
                undefined,
            contactHubspotId: row['Associated Contact IDs']?.trim() || undefined,
            nameEmail: extractEmailFromText(name),
            notes: row['Deal Description']?.trim() || undefined,
            ...ownerMatched,
        },
        issues,
    };
}
