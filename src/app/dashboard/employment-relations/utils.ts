import { ActionType, DocumentStatus, StatusConfig, DOCUMENT_STATUSES } from './types';
import { Timestamp } from 'firebase/firestore';
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

export function generateDocCode(typeCode: string, number: number): string {
    const year = new Date().getFullYear().toString(); // Use full year 2025
    return `${typeCode}-${year}/${String(number).padStart(4, '0')}`;
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
    company?: any
}): Record<string, string> {
    const map: Record<string, string> = {};

    ALL_DYNAMIC_FIELDS.forEach(field => {
        // Construct the context object structure expected by the field paths
        const context = {
            company: data.company,
            employee: data.employee,
            position: data.position,
            department: data.department,
            questionnaire: data.questionnaire,
            system: data.system
        };

        const rawValue = resolvePath(context, field.path);

        let formattedValue = '________________'; // Default placeholder

        if (rawValue !== undefined && rawValue !== null && rawValue !== '') {
            if (typeof rawValue === 'number') {
                // Formatting for salary/money if key contains salary or min/max
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

    return map;
}

export function generateDocumentContent(
    templateContent: string,
    data: Parameters<typeof getReplacementMap>[0]
): string {
    let content = templateContent;
    const replacements = getReplacementMap(data);

    // Replace all occurrences
    Object.entries(replacements).forEach(([key, value]) => {
        // Escape special regex chars in key (like braces)
        const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        content = content.replace(regex, value);
    });

    return content;
}
