// src/app/dashboard/employment-relations/lib/generate-header-html.ts
//
// Баримтын ТӨРЛИЙН (`ERDocumentType.header`) дээр тулгуурласан толгой HTML-ийг
// үүсгэгч. Template editor preview, document detail preview, хэвлэх layout
// гээд хэд хэдэн газар нэг ижил гаралт өгөхийн тулд нэг эх үүсвэрт оруулсан.
//
// Гаралт нь `{{date.year}}`, `{{document.number}}` зэрэг placeholder агуулж
// болно — дараа нь `generateDocumentContent` эсвэл preview replacement
// шатанд бодит утгаар орлуулагдана.
//
// Layout (settings/page.tsx-ийн "Толгойн урьдчилсан харагдац"-тай нийцэв):
//   ┌──────────────────────────────────────┐
//   │              [LOGO]                  │
//   │       БАЙГУУЛЛАГЫН НЭР               │
//   │  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─   │
//   │ Огноо       № Дугаар        Хот хот  │
//   └──────────────────────────────────────┘

import type { ERDocumentType } from '../types';

export interface GenerateHeaderHtmlParams {
    includeHeader?: boolean;
    documentType?: ERDocumentType | null;
    companyProfile?: Record<string, unknown> | null;
}

const escapeHtml = (s: string): string =>
    s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');

export function generateHeaderHtml({
    includeHeader,
    documentType,
    companyProfile,
}: GenerateHeaderHtmlParams): string {
    if (!includeHeader || !documentType) return '';

    const header = documentType.header;
    const logoUrl = typeof companyProfile?.logoUrl === 'string' ? (companyProfile.logoUrl as string) : '';
    const profileName = typeof companyProfile?.name === 'string' ? (companyProfile.name as string) : '';
    const profileLegalName =
        typeof companyProfile?.legalName === 'string' ? (companyProfile.legalName as string) : '';

    const companyName = header?.title || profileName || profileLegalName || '';
    const cityName = header?.cityName || 'Улаанбаатар';
    const showLogo = header?.showLogo !== false;
    const showDate = header?.showDate !== false;
    const showNumber = header?.showNumber !== false;

    const parts: string[] = [];

    // Top: Logo + Company name (centered)
    if (showLogo && logoUrl) {
        parts.push(
            `<p style="text-align: center;"><img src="${logoUrl}" alt="Лого" style="width: 80px; display: block; margin: 0 auto;"></p>`,
        );
    }

    if (companyName) {
        parts.push(
            `<p style="text-align: center;"><strong>${escapeHtml(companyName.toUpperCase())}</strong></p>`,
        );
    }

    // Bottom row: Date | Number | City — table-р rendering хийнэ
    // (flex/grid нь rich-text editor болон хэвлэх дээр найдваргүй).
    const dateCell = showDate
        ? `<em>{{date.year}} оны {{date.month}} сарын {{date.day}}</em>`
        : '';
    const numberCell = showNumber ? `№ {{document.number}}` : '';
    const cityCell = `${escapeHtml(cityName)} хот`;

    parts.push(
        `<table style="width: 100%; border-top: 1px dashed #cbd5e1; margin-top: 8px; border-collapse: collapse;">` +
        `<tbody><tr>` +
        `<td style="width: 33%; text-align: left; padding-top: 8px; vertical-align: top;">${dateCell}</td>` +
        `<td style="width: 34%; text-align: center; padding-top: 8px; vertical-align: top;">${numberCell}</td>` +
        `<td style="width: 33%; text-align: right; padding-top: 8px; vertical-align: top;">${cityCell}</td>` +
        `</tr></tbody></table>`,
    );

    parts.push(`<p></p>`);

    return parts.join('');
}
