import { format } from 'date-fns';

type FirestoreTimestamp = { seconds: number; toDate?: () => Date };

/** Firestore Timestamp, Date, string-ийг аюулгүйгээр Date болгоно */
export function toDateSafe(val: unknown): Date | null {
    if (!val) return null;
    if (val instanceof Date) return Number.isNaN((val as Date).getTime()) ? null : (val as Date);
    const ts = val as FirestoreTimestamp;
    if (typeof ts === 'object' && 'seconds' in ts) {
        if (typeof ts.toDate === 'function') return ts.toDate();
        return new Date(ts.seconds * 1000);
    }
    if (typeof val === 'string') {
        const d = new Date(val);
        return Number.isNaN(d.getTime()) ? null : d;
    }
    return null;
}

/** mn-MN locale-д хөрвүүлж харуулна (жишээ: "2024.06.15") */
export function formatDateMN(date: unknown): string {
    if (!date) return '';
    try {
        const d = toDateSafe(date);
        if (!d) return String(date);
        return d.toLocaleDateString('mn-MN');
    } catch {
        return '';
    }
}

/** ISO yyyy-MM-dd хэлбэрт хөрвүүлнэ */
export function formatDateISO(date: unknown): string {
    if (!date) return '-';
    try {
        const d = toDateSafe(date);
        if (!d) return '-';
        return format(d, 'yyyy-MM-dd');
    } catch {
        return '-';
    }
}

/** Хоёр огноог "2020.01.01 - 2023.06.01" хэлбэрт хөрвүүлнэ */
export function formatDateRangeMN(start: unknown, end: unknown, isCurrent?: boolean): string {
    if (!start) return '';
    const startStr = formatDateMN(start);
    const endStr = isCurrent ? 'Одоо' : (end ? formatDateMN(end) : 'Тодорхойгүй');
    return `${startStr} - ${endStr}`;
}

const QUESTIONNAIRE_DATE_FIELDS = ['birthDate', 'disabilityDate'] as const;
const QUESTIONNAIRE_ARRAY_DATE_FIELDS = ['entryDate', 'gradDate', 'startDate', 'endDate'] as const;

/**
 * Анкетийн мэдээллийн Firestore Timestamp-уудыг Date объект болгоно.
 * cv-tab-content, questionnaire-tab-content хоёуланд ашиглагдана.
 */
export function transformQuestionnaireDates<T extends Record<string, unknown>>(data: T | null | undefined): T | null | undefined {
    if (!data) return data;
    const result = { ...data } as Record<string, unknown>;

    for (const field of QUESTIONNAIRE_DATE_FIELDS) {
        if (result[field]) {
            result[field] = toDateSafe(result[field]);
        }
    }

    for (const arrayKey of ['education', 'trainings', 'experiences'] as const) {
        if (Array.isArray(result[arrayKey])) {
            result[arrayKey] = (result[arrayKey] as Record<string, unknown>[]).map((item) => {
                const newItem = { ...item };
                for (const field of QUESTIONNAIRE_ARRAY_DATE_FIELDS) {
                    if (newItem[field]) newItem[field] = toDateSafe(newItem[field]);
                }
                return newItem;
            });
        }
    }

    if (Array.isArray(result.familyMembers)) {
        result.familyMembers = (result.familyMembers as Record<string, unknown>[]).map((m) => {
            const mm = { ...m };
            if (mm.birthDate) mm.birthDate = toDateSafe(mm.birthDate);
            return mm;
        });
    }

    return result as T;
}
