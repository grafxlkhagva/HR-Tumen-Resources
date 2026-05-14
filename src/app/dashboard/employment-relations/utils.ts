import { ActionType, DocumentStatus, DOCUMENT_STATUSES } from './types';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';
import { mn } from 'date-fns/locale';
import { ALL_DYNAMIC_FIELDS } from './data/field-dictionary';
import { numberToMongolianWords, formatMoneyWithWords } from './lib/number-to-words-mn';

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
        'REJECT': 'Татгалзсан',
        'INSTANT_APPLY': 'Шууд хэрэгжүүлсэн',
    };
    return map[action] || action;
}

/**
 * Firestore Timestamp / Date / string / number / null/undefined → JS Date.
 *
 * Read-side helper. Утга буруу бол `null` буцаана. ER модулийн бүх "огноо
 * үзүүлэх" callsite энэ helper-ыг ашигласнаар `any` хэрэглэхгүйгээр
 * Timestamp narrowing-ийг нэг газар хийнэ.
 */
export function toJSDate(value: unknown): Date | null {
    if (value == null) return null;
    if (value instanceof Date) return value;
    if (value instanceof Timestamp) return value.toDate();
    if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate: unknown }).toDate === 'function') {
        try {
            const d = (value as { toDate: () => Date }).toDate();
            return d instanceof Date ? d : null;
        } catch {
            return null;
        }
    }
    if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? null : d;
    }
    return null;
}

export function formatDateTime(date: unknown): string {
    const d = toJSDate(date);
    if (!d) return '-';
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
 * Free-form Firestore document context — `getReplacementMap` нь олон collection-оос
 * (employee, position, department, company...) ирэх random shape-тай объектыг
 * хүлээн авдаг тул tight type-аар бичихгүй. Энэ alias нь зориудаар loose байх
 * шалтгаан болон хамрах хүрээг тэмдэглэнэ.
 */
type LooseFirestoreDoc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

// Helper to resolve deep paths like "position.compensation.salaryRange.min"
function resolvePath(obj: LooseFirestoreDoc | undefined, path: string): unknown {
    return path.split('.').reduce<unknown>((prev, curr) => {
        if (prev && typeof prev === 'object') {
            return (prev as Record<string, unknown>)[curr];
        }
        return undefined;
    }, obj);
}

export function getReplacementMap(data: {
    employee?: LooseFirestoreDoc | null,
    position?: LooseFirestoreDoc | null,
    department?: LooseFirestoreDoc | null,
    questionnaire?: LooseFirestoreDoc | null,
    system?: LooseFirestoreDoc | null,
    company?: LooseFirestoreDoc | null,
    appointment?: LooseFirestoreDoc | null,
    customInputs?: Record<string, unknown> | null,
    /**
     * Per-document placeholder overrides, keyed as `{{field.path}}` (same format
     * as the map keys built below). Applied last so they win over source values.
     */
    fieldOverrides?: Record<string, string> | null,
}): Record<string, string> {
    const map: Record<string, string> = {};

    // ── Virtual / computed field-үүд ────────────────────────────────────────
    // employee.fullName — Firestore-д байхгүй, firstName+lastName-с тооцно
    // employee.shortName — "Б. Баярцэцэг" (овгийн эхний үсэг + цэг + нэр)
    const emp = data.employee || {};
    const _lastName = String(emp.lastName || '').trim();
    const _firstName = String(emp.firstName || '').trim();
    const computedEmployee = {
        ...emp,
        fullName: [emp.lastName, emp.firstName].filter(Boolean).join(' ') || emp.fullName || '',
        shortName: _lastName && _firstName
            ? `${_lastName.charAt(0)}. ${_firstName}`
            : (_firstName || _lastName || ''),
    };

    // company — компанийн profile field нэрийг normalize хийнэ
    // Firestore-д contactEmail/email, phoneNumber/phone гэж хос байж болно
    const cp = data.company || {};
    const computedCompany = {
        ...cp,
        email: cp.email || cp.contactEmail || '',
        phone: cp.phone || cp.phoneNumber || '',
        legalName: cp.legalName || cp.name || '',
        ceo: cp.ceo || cp.directorName || cp.directorFullName || '',
        registrationNumber: cp.registrationNumber || cp.regNumber || '',
        taxId: cp.taxId || cp.taxNumber || '',
        website: cp.website || cp.websiteUrl || '',
        address: cp.address || cp.fullAddress || '',
        industry: cp.industry || cp.industryName || '',
        mission: cp.mission || '',
        vision: cp.vision || '',
        introduction: cp.introduction || cp.description || '',
        logoUrl: cp.logoUrl || '',
        establishedDate: cp.establishedDate || cp.foundedDate || '',
    };

    // position — nested salary/benefits/experience path normalize
    const pos = data.position || {};
    // compensation.salaryRange эсвэл salaryRange хоёуланг дэмжинэ
    const compSalary = pos.compensation?.salaryRange || pos.salaryRange || {};
    // salarySteps-ийн идэвхтэй шатлал
    const activeStep = pos.salarySteps?.items?.[pos.salarySteps?.activeIndex ?? -1];
    const computedPosition = {
        ...pos,
        salaryRange: {
            min: compSalary.min ?? 0,
            mid: compSalary.mid ?? 0,
            max: compSalary.max ?? 0,
            currency: compSalary.currency || pos.salarySteps?.currency || 'MNT',
            period: compSalary.period || 'monthly',
        },
        salaryStepName: activeStep?.name || '',
        salaryStepValue: activeStep?.value ?? '',
        // Virtual: үгээр илэрхийлсэн мөнгөн дүн + дугаартай хамт
        salaryStepValueWords: activeStep?.value != null ? numberToMongolianWords(Number(activeStep.value)) : '',
        salaryStepValueWithWords: activeStep?.value != null ? formatMoneyWithWords(Number(activeStep.value)) : '',
        benefits: {
            vacationDays: pos.benefits?.vacationDays ?? '',
            isRemoteAllowed: pos.benefits?.isRemoteAllowed ? 'Тийм' : 'Үгүй',
            flexibleHours: pos.benefits?.flexibleHours ? 'Тийм' : 'Үгүй',
        },
        budget: {
            yearlyBudget: pos.budget?.yearlyBudget ?? '',
            yearlyBudgetWords: pos.budget?.yearlyBudget != null ? numberToMongolianWords(Number(pos.budget.yearlyBudget)) : '',
            yearlyBudgetWithWords: pos.budget?.yearlyBudget != null ? formatMoneyWithWords(Number(pos.budget.yearlyBudget)) : '',
            currency: pos.budget?.currency || 'MNT',
        },
        experience: {
            totalYears: pos.experience?.totalYears ?? '',
            educationLevel: pos.experience?.educationLevel || '',
            leadershipYears: pos.experience?.leadershipYears ?? '',
        },
    };

    // department — managerId → managerName computed
    const dept = data.department || {};
    const computedDepartment = {
        ...dept,
        // managerName нь dept doc-д шууд хадгалагдвал ашиглана,
        // үгүй бол managerId-аас tatах боломжгүй (async) тул хоосон
        managerName: dept.managerName || dept.managerFullName || '',
        managerPositionName: dept.managerPositionName || dept.managerPositionTitle || '',
    };

    ALL_DYNAMIC_FIELDS.forEach(field => {
        const context = {
            company: computedCompany,
            employee: computedEmployee,
            position: computedPosition,
            department: computedDepartment,
            questionnaire: data.questionnaire,
            system: data.system,
            appointment: data.appointment,
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

    // Add custom inputs to the map
    if (data.customInputs) {
        Object.entries(data.customInputs).forEach(([key, value]) => {
            const valStr = value !== undefined && value !== null && value !== '' ? String(value) : '________________';
            map[`{{${key}}}`] = valStr;
            map[`{{custom.${key}}}`] = valStr; // Handle the custom. prefix as well

            // Мөнгөн дүн-д зориулсан үгэн хэлбэр. Тооны утга таньсан customInput
            // бүрт `_words` болон `_withWords` companion placeholder нэмнэ.
            //   {{amount_words}}      → "дөрвөн сая"
            //   {{amount_withWords}}  → "4,000,000 (дөрвөн сая)"
            if (valStr && valStr !== '________________') {
                const n = Number(String(valStr).replace(/[\s,]/g, ''));
                if (Number.isFinite(n) && !Number.isNaN(n) && String(valStr).match(/\d/)) {
                    const words = numberToMongolianWords(n);
                    const withWords = formatMoneyWithWords(n);
                    if (words) {
                        map[`{{${key}_words}}`] = words;
                        map[`{{custom.${key}_words}}`] = words;
                        map[`{{${key}_withWords}}`] = withWords;
                        map[`{{custom.${key}_withWords}}`] = withWords;
                    }
                }
            }
        });
    }

    // Per-document overrides win over everything above.
    if (data.fieldOverrides) {
        for (const [k, v] of Object.entries(data.fieldOverrides)) {
            if (v !== undefined && v !== null && v !== '') {
                map[k] = String(v);
            }
        }
    }

    return map;
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
