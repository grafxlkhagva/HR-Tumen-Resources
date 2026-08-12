/**
 * Mobile API (/api/mobile/v1) — нэгдсэн алдааны хариултууд.
 *
 * Driver app-ын api_client.dart-тай тохирсон contract:
 *   - Body: { error: string, code?: string }
 *   - 409 Conflict үед `code` талбар ЗААВАЛ (ORDER_VERSION_STALE гэх мэт)
 *   - 426 Upgrade Required — force update
 *   - 429 + Retry-After — rate limit
 */

import { NextResponse } from 'next/server';

export type MobileApiErrorCode =
    | 'ROLE_CONFLICT'
    | 'ORDER_VERSION_STALE'
    | 'QUOTE_NOT_ACTIVE'
    | 'ORDER_NOT_CANCELLABLE'
    | 'ORDER_NOT_COMPLETED'
    | 'ALREADY_RATED'
    | 'BLOCKED'
    | 'NOT_FOUND'
    | 'VALIDATION'
    | 'IDEMPOTENCY_KEY_REQUIRED';

export function badRequest(message: string, code: MobileApiErrorCode = 'VALIDATION') {
    return NextResponse.json({ error: message, code }, { status: 400 });
}

export function unauthorized(message = 'Нэвтрэлт шаардлагатай.') {
    return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = 'Хандах эрхгүй.') {
    return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = 'Олдсонгүй.') {
    return NextResponse.json({ error: message, code: 'NOT_FOUND' }, { status: 404 });
}

export function conflict(code: MobileApiErrorCode, message: string) {
    return NextResponse.json({ error: message, code }, { status: 409 });
}

export function serverError(e: unknown) {
    const message = e instanceof Error ? e.message : 'Серверийн дотоод алдаа';
    console.error('[mobile-api]', e);
    return NextResponse.json({ error: message }, { status: 500 });
}

/**
 * Force update шалгалт: клиент `X-App-Version` (build number, бүхэл тоо)
 * илгээнэ; env-ийн доод хувилбараас бага бол 426 буцаана.
 * Env тохируулаагүй бол шалгахгүй (анхны хөгжүүлэлтэд саадгүй).
 */
export function checkMinAppVersion(request: Request): NextResponse | null {
    const minRaw = process.env.CUSTOMER_APP_MIN_VERSION;
    if (!minRaw) return null;
    const min = parseInt(minRaw, 10);
    if (!Number.isFinite(min)) return null;

    const clientRaw = request.headers.get('x-app-version');
    if (!clientRaw) return null; // хуучин клиент header илгээдэггүй байж болно — MVP-д зөөлөн
    const client = parseInt(clientRaw, 10);
    if (!Number.isFinite(client)) return null;

    if (client < min) {
        return NextResponse.json(
            {
                error: 'Аппын хувилбар хуучирсан байна. Шинэчилнэ үү.',
                code: 'FORCE_UPDATE',
                min_version: min,
            },
            { status: 426 },
        );
    }
    return null;
}
