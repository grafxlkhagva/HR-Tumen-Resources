/**
 * Канон Чөлөө/Ирц хүсэлтийн статус энумүүд + i18n орчуулга.
 *
 * Хадгалах утга English (PENDING/APPROVED/REJECTED/CANCELLED).
 * UI рендерлэхэд `getRequestStatusLabel(status, locale)` ашиглана.
 *
 * Migration түүх: 2026-05 — production-д байсан Mongol literal-уудыг
 * `scripts/migrate-attendance-status.ts`-ээр canonical болгож хөрвүүлсэн.
 * Бүх backward-compat layer цэвэрлэгдсэн.
 */

export const REQUEST_STATUS = {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
} as const;

export type CanonicalRequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

/**
 * Статус string-ийг канон key-руу буулгана. Зөвхөн English утга авна.
 * Танигдахгүй утга оруулсан тохиолдолд `PENDING` буцаана + console-д warn.
 */
export function normalizeRequestStatus(status: string | undefined | null): CanonicalRequestStatus {
    if (!status) return REQUEST_STATUS.PENDING;
    if (status in REQUEST_STATUS) return status as CanonicalRequestStatus;
    if (typeof console !== 'undefined') {
        console.warn(`[attendance-status] Танигдахгүй статус: "${status}" — PENDING-д буулгав`);
    }
    return REQUEST_STATUS.PENDING;
}

// ─── i18n labels ───────────────────────────────────────
export type Locale = 'mn' | 'en';

const STATUS_LABELS: Record<Locale, Record<CanonicalRequestStatus, string>> = {
    mn: {
        PENDING: 'Хүлээгдэж буй',
        APPROVED: 'Зөвшөөрсөн',
        REJECTED: 'Татгалзсан',
        CANCELLED: 'Цуцалсан',
    },
    en: {
        PENDING: 'Pending',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        CANCELLED: 'Cancelled',
    },
};

export function getRequestStatusLabel(
    status: string | CanonicalRequestStatus | undefined | null,
    locale: Locale = 'mn',
): string {
    const canonical = normalizeRequestStatus(status as string);
    return STATUS_LABELS[locale][canonical];
}

// ─── Badge styling ─────────────────────────────────────
export const STATUS_BADGE_CONFIG: Record<CanonicalRequestStatus, {
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
}> = {
    PENDING: { variant: 'secondary', className: 'bg-yellow-500/80 text-yellow-foreground' },
    APPROVED: { variant: 'default', className: 'bg-green-500/80 text-green-foreground' },
    REJECTED: { variant: 'destructive', className: '' },
    CANCELLED: { variant: 'outline', className: 'bg-slate-100 text-slate-600' },
};
