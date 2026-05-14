/**
 * Legal модулиас ирэх гэрээний загваруудыг ER-ийн document үүсгэх урсгал руу
 * нийцүүлэх адаптер.
 *
 * Legal-ийн загвар нь дараах 2 талаар ER-ийнхээс ялгаатай:
 *  1) Placeholder — `{{ажилтны_нэр}}`, `{{байгууллагын_нэр}}`, `{{албан_тушаал}}`
 *     зэрэг монгол snake_case нэртэй (ER нь `{{employee.fullName}}` шиг
 *     namespaced key ашигладаг).
 *  2) Формат — legal нь `whitespace-pre-wrap + font-mono`-оор plain text харуулдаг,
 *     ER-ийн `DocumentPreview` нь `prose` класстай sanitized HTML rendering хийдэг.
 *     Тийм учраас "паргаф", "fold тэмдэг", "bold" гээд форматыг үлдээхийн тулд
 *     HTML руу хөрвүүлнэ.
 */

import { format } from 'date-fns';

export interface LegalOverrideInput {
    employee?: {
        firstName?: string | null;
        lastName?: string | null;
        phoneNumber?: string | null;
        email?: string | null;
    } | null;
    position?: {
        title?: string | null;
    } | null;
    department?: {
        name?: string | null;
    } | null;
    company?: {
        name?: string | null;
        legalName?: string | null;
        registrationNumber?: string | null;
        regNumber?: string | null;
        taxId?: string | null;
        address?: string | null;
        fullAddress?: string | null;
        ceo?: string | null;
        directorName?: string | null;
        directorFullName?: string | null;
    } | null;
    questionnaire?: {
        registerNumber?: string | null;
        address?: string | null;
        phoneNumber?: string | null;
        birthDate?: string | null;
    } | null;
    documentNumber?: string | null;
    appointmentDate?: Date | null;
}

/**
 * Legal загварт тааралддаг монгол placeholder → утгын mapping.
 * `fieldOverrides` болгон `generateDocumentContent`-руу дамжуулна.
 *
 * NOTE: key нь `{{...}}` хэлбэртэй байх ёстой.
 */
export function buildLegalFieldOverrides(input: LegalOverrideInput): Record<string, string> {
    const emp = input.employee || {};
    const pos = input.position || {};
    const dept = input.department || {};
    const company = input.company || {};
    const q = input.questionnaire || {};

    const lastName = String(emp.lastName || '').trim();
    const firstName = String(emp.firstName || '').trim();
    const fullName = [lastName, firstName].filter(Boolean).join(' ');

    const companyName = company.legalName || company.name || '';
    const companyRegNumber = company.registrationNumber || company.regNumber || '';
    const companyAddress = company.address || company.fullAddress || '';
    const companyCeo = company.ceo || company.directorName || company.directorFullName || '';
    const positionTitle = pos.title || '';
    const departmentName = dept.name || '';

    const employeeRegister = String(q.registerNumber || '').trim();
    const employeeAddress = String(q.address || '').trim();
    const employeePhone = String(q.phoneNumber || emp.phoneNumber || '').trim();

    const today = format(input.appointmentDate || new Date(), 'yyyy-MM-dd');

    const entries: Array<[string, string]> = [
        // ── Гэрээний толгой ────────────────────────────────────────────
        ['гэрээний_дугаар', input.documentNumber || ''],
        ['гэрээ_байгуулсан_огноо', today],
        ['гэрээ_байгуулсан_байршил', companyAddress],
        ['огноо', today],
        ['байршил', companyAddress],

        // ── Байгууллага (Ажил олгогч) ──────────────────────────────────
        ['байгууллагын_нэр', companyName],
        ['байгууллагын_регистр', companyRegNumber],
        ['байгууллагын_хаяг', companyAddress],
        ['байгууллага', companyName],
        ['ажил_олгогч', companyName],
        ['ажил_олгогчийн_нэр', companyName],
        ['регистрийн_дугаар', companyRegNumber],
        ['хаяг', companyAddress],
        ['эрх_бухий_этгээд', companyCeo],
        ['захирал', companyCeo],
        ['удирдлага', companyCeo],

        // ── Ажилтан ─────────────────────────────────────────────────────
        ['ажилтны_нэр', fullName],
        ['ажилтны_овог', lastName],
        ['ажилтны_нэр_', firstName],
        ['ажилтны_овог_нэр', fullName],
        ['ажилтан', fullName],
        ['ажилтны_регистр', employeeRegister],
        ['ажилтны_хаяг', employeeAddress],
        ['ажилтны_утас', employeePhone],
        ['ажилтны_имэйл', String(emp.email || '').trim()],

        // ── Албан тушаал / Нэгж ─────────────────────────────────────────
        ['албан_тушаал', positionTitle],
        ['ажлын_байр', positionTitle],
        ['ажлын_байрны_нэр', positionTitle],
        ['нэгж', departmentName],
        ['албан_нэгж', departmentName],
        ['хэлтэс', departmentName],
    ];

    const overrides: Record<string, string> = {};
    for (const [key, value] of entries) {
        if (value) {
            overrides[`{{${key}}}`] = value;
        }
    }
    return overrides;
}

/**
 * Legal загварын plain text контентыг ER-ийн `prose`-чиглэсэн HTML-рүү хөрвүүлнэ.
 *
 * Хөрвүүлэлт:
 *   - `**word**`        → `<strong>word</strong>`
 *   - Нэмэлт escape     → `&`, `<`, `>`
 *   - `\n\n+`           → паргаф хуваалт (`</p><p>`)
 *   - `\n`              → `<br>` (нэг мөрөнд)
 *
 * Эцсийн HTML нь `DocumentPreview`-ээр sanitize хийгдэх тул script, iframe
 * зэрэг рүү хүрч чадахгүй — зөвхөн basic текст + bold тэмдэглэгээ үлдэнэ.
 */
export function legalContentToHtml(plain: string): string {
    if (!plain) return '';

    // 1) HTML-оор аюултай тэмдэгтүүдийг escape хийнэ.
    const escaped = plain
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 2) Markdown-маягийн **bold** → <strong>
    const bolded = escaped.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');

    // 3) Паргаф + мөр задлах.
    const paragraphs = bolded
        .split(/\n{2,}/)
        .map((para) => para.trim())
        .filter(Boolean)
        .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`);

    return paragraphs.join('\n');
}
