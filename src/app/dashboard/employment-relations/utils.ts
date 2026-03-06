import { ActionType, DocumentStatus, StatusConfig, DOCUMENT_STATUSES } from './types';
import { Timestamp, collection, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { ALL_DYNAMIC_FIELDS } from './data/field-dictionary';

export function getStatusConfig(status: DocumentStatus) {
    return DOCUMENT_STATUSES[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
}

export function formatActionType(action: ActionType): string {
    const map: Record<ActionType, string> = {
        'CREATE': 'Үүсгэсэн',
        'UPDATE': 'Зассан',
        'REVIEW': 'Хянасан',
        'APPROVE': 'Зөвшөөрсөн',
        'SIGN': 'Гарын үсэг зурсан',
        'ARCHIVE': 'Архивласан',
        'REJECT': 'Татгалзсан'
    };
    return map[action] || action;
}

export function formatDateTime(date: any): string {
    if (!date) return '-';
    // Handle Firestore Timestamp
    const d = date.toDate ? date.toDate() : new Date(date);
    return format(d, 'yyyy-MM-dd HH:mm', { locale: mn });
}

/**
 * Баримтын дугаар үүсгэх
 * Формат: PREFIX-YYYY-NNNN (жнь: ГЭР-2026-0001)
 * 
 * @param prefix - Баримтын төрлийн үсгэн код (жнь: "ГЭР", "ТШЛ")
 * @param year - Он (жнь: 2026)
 * @param sequence - Дэс дугаар (жнь: 1)
 * @returns Форматлагдсан дугаар (жнь: "ГЭР-2026-0001")
 */
export function generateDocCode(prefix: string, year: number, sequence: number): string {
    return `${prefix}-${year}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Баримтын дугаараас мэдээлэл задлах
 * @param docCode - Баримтын дугаар (жнь: "ГЭР-2026-0001")
 * @returns { prefix, year, sequence } эсвэл null
 */
export function parseDocCode(docCode: string): { prefix: string; year: number; sequence: number } | null {
    const match = docCode.match(/^([А-ЯӨҮа-яөү]+)-(\d{4})-(\d+)$/);
    if (!match) return null;
    return {
        prefix: match[1],
        year: parseInt(match[2], 10),
        sequence: parseInt(match[3], 10)
    };
}

/**
 * Дараагийн баримтын дугаарыг тооцоолох
 * @param currentNumber - Одоогийн дугаар
 * @param lastYear - Сүүлд дугаар олгосон жил
 * @returns { nextNumber, currentYear }
 */
export function calculateNextDocNumber(currentNumber: number = 0, lastYear: number = 0): { nextNumber: number; currentYear: number } {
    const currentYear = new Date().getFullYear();
    
    // Жил солигдсон бол 1-ээс эхэлнэ
    if (lastYear !== currentYear) {
        return { nextNumber: 1, currentYear };
    }
    
    // Үргэлжлүүлэн дугаарлах
    return { nextNumber: currentNumber + 1, currentYear };
}

// Helper to resolve deep paths like "position.compensation.salaryRange.min"
function resolvePath(obj: any, path: string): any {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : undefined;
    }, obj);
}

export function getReplacementMap(data: {
    employee?: any,
    position?: any,
    department?: any,
    questionnaire?: any,
    system?: any,
    company?: any,
    appointment?: any,
    customInputs?: Record<string, any>
}): Record<string, string> {
    const map: Record<string, string> = {};

    // Build virtual fields that don't exist directly in data
    const enrichedEmployee = data.employee ? {
        ...data.employee,
        fullName: [data.employee.lastName, data.employee.firstName].filter(Boolean).join(' ').trim() || undefined,
    } : data.employee;

    ALL_DYNAMIC_FIELDS.forEach(field => {
        const context = {
            company: data.company,
            employee: enrichedEmployee,
            position: data.position,
            department: data.department,
            questionnaire: data.questionnaire,
            system: data.system,
            appointment: data.appointment,
        };

        const rawValue = resolvePath(context, field.path);

        let formattedValue = '________________';

        if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
            if (field.key === '{{company.logoUrl}}') {
                formattedValue = `<img src="${String(rawValue)}" alt="Logo" style="max-height:60px;max-width:200px;object-fit:contain;" />`;
            } else if (typeof rawValue === 'number') {
                if (field.key.includes('salary') || field.key.includes('Amount')) {
                    formattedValue = new Intl.NumberFormat('mn-MN').format(rawValue);
                } else {
                    formattedValue = String(rawValue);
                }
            } else {
                formattedValue = String(rawValue);
            }
        }

        map[field.key] = formattedValue;
    });

    // Add custom inputs to the map
    if (data.customInputs) {
        Object.entries(data.customInputs).forEach(([key, value]) => {
            const valStr = value !== undefined && value !== null && value !== '' ? String(value) : '________________';
            map[`{{${key}}}`] = valStr;
            map[`{{custom.${key}}}`] = valStr; // Handle the custom. prefix as well
        });
    }

    return map;
}

/**
 * Баримтын толгой HTML үүсгэх.
 * Template-ийн includeHeader=true, document type-ийн header тохиргоо,
 * компаний профайл дээр тулгуурлан толгойг үүсгэнэ.
 */
export function generateDocumentHeader(opts: {
    includeHeader?: boolean;
    docTypeHeader?: {
        title?: string;
        showLogo?: boolean;
        cityName?: string;
        showDate?: boolean;
        showNumber?: boolean;
    };
    companyProfile?: any;
    headerCompanyKey?: string;
}): string {
    if (!opts.includeHeader) return '';

    const header = opts.docTypeHeader;
    const cp = opts.companyProfile;

    // Resolve which company to use for header
    let logoUrl = '';
    let companyName = '';

    const key = opts.headerCompanyKey ?? '__main__';
    if (key === '__main__' || !cp?.subsidiaries) {
        logoUrl = cp?.logoUrl || '';
        companyName = header?.title || cp?.name || cp?.legalName || '';
    } else {
        const idx = parseInt(key, 10);
        const subs: any[] = Array.isArray(cp.subsidiaries) ? cp.subsidiaries : [];
        if (!isNaN(idx) && idx >= 0 && idx < subs.length) {
            const sub = typeof subs[idx] === 'string' ? { name: subs[idx] } : subs[idx];
            logoUrl = sub.logoUrl || '';
            companyName = sub.name || '';
        } else {
            logoUrl = cp?.logoUrl || '';
            companyName = header?.title || cp?.name || cp?.legalName || '';
        }
    }

    const cityName = header?.cityName || 'Улаанбаатар';
    const showLogo = header?.showLogo !== false;
    const showDate = header?.showDate !== false;
    const showNumber = header?.showNumber !== false;

    const parts: string[] = [];

    if (showLogo && logoUrl) {
        parts.push(`<p style="text-align: center;"><img src="${logoUrl}" alt="Лого" style="width: 80px; display: block; margin: 0 auto;"></p>`);
    }

    if (companyName) {
        parts.push(`<p style="text-align: center; font-size: 13px; font-weight: 700; letter-spacing: 0.02em;">${companyName.toUpperCase()}</p>`);
    }

    parts.push(`<p></p>`);

    const rowParts: string[] = [];
    if (showDate) rowParts.push(`<span style="flex: 1;"><em>{{date.year}} оны {{date.month}} сарын {{date.day}}</em></span>`);
    if (showNumber) rowParts.push(`<span style="flex: 1; text-align: center;">№ {{document.number}}</span>`);
    rowParts.push(`<span style="flex: 1; text-align: right;">${cityName} хот</span>`);
    parts.push(`<p style="display: flex; justify-content: space-between; align-items: baseline; gap: 1rem; font-size: 12px; margin: 0;">${rowParts.join('')}</p>`);

    parts.push(`<p></p>`);

    return parts.join('');
}

export function generateDocumentContent(
    templateContent: string,
    data: Parameters<typeof getReplacementMap>[0]
): string {
    const replacements = getReplacementMap(data);

    // Use a regex to find any sequence of 2+ curly braces wrapping a key
    // This allows us to replace {{{key}}} or {{{{key}}}} entirely with the value,
    // solving the 'extra braces' issue reported by users.
    return (templateContent || '').replace(/{{+([^{}]+)}+/g, (match, inner) => {
        const key = inner.trim();
        // Check if {{key}} exists in our replacement map
        const lookup = `{{${key}}}`;
        if (replacements[lookup] !== undefined) {
            return replacements[lookup];
        }
        return match; // Return original text if no replacement found
    });
}
