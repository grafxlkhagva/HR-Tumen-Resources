/**
 * Mobile API auth middleware — захиалагчийн апп (role='customer').
 *
 * requireTenantAuth-ын (src/lib/api/auth-middleware.ts) mobile хувилбар:
 *   - Bearer idToken-ийг Admin SDK-аар шалгана
 *   - role='customer' claim ЭСВЭЛ customer_users/{uid} doc байгааг шаардана
 *     (claims шинэчлэгдээд 1 цаг хүртэл хуучин token эргэлдэж болно — doc fallback)
 *   - status='blocked' хэрэглэгчийг 403-аар няцаана
 *   - Rate-limit key = uid (IP биш — Vercel instance-ууд IP хуваалцдаг)
 */

import 'server-only';

import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import {
    checkRateLimit,
    type RateLimitPreset,
    type RateLimitConfig,
} from '@/lib/api/rate-limiter';
import type { CustomerUser } from '@/types/marketplace';

export interface CustomerAuthContext {
    uid: string;
    phone: string | null;
    /** customer_users doc (register-ээс бусад endpoint дээр заавал байна) */
    profile: (CustomerUser & { id: string }) | null;
    customerId: string | null;
}

export interface CustomerAuthOk {
    ok: true;
    auth: CustomerAuthContext;
}

export interface CustomerAuthErr {
    ok: false;
    error: string;
    response: NextResponse;
}

export type CustomerAuthResult = CustomerAuthOk | CustomerAuthErr;

function extractToken(request: Request): string | null {
    const header = request.headers.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1] || null;
}

export interface CustomerAuthOptions {
    rateLimit?: RateLimitPreset | RateLimitConfig;
    /**
     * auth/register-т true: customer_users doc хараахан үүсээгүй ч зөвшөөрнө
     * (анхны бүртгэлийн bootstrap). Бусад endpoint-д default false.
     */
    allowUnregistered?: boolean;
}

export async function requireCustomerAuth(
    request: Request,
    opts: CustomerAuthOptions = {},
): Promise<CustomerAuthResult> {
    // 1. Token шалгах
    const token = extractToken(request);
    if (!token) {
        return {
            ok: false,
            error: 'unauthorized',
            response: NextResponse.json({ error: 'Authorization header байхгүй.' }, { status: 401 }),
        };
    }

    let decoded: { uid: string; phone_number?: string; role?: string };
    try {
        decoded = await getFirebaseAdminAuth().verifyIdToken(token);
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Invalid token';
        return {
            ok: false,
            error: 'unauthorized',
            response: NextResponse.json({ error: `Token шалгахад алдаа: ${msg}` }, { status: 401 }),
        };
    }

    // 2. Rate limit — uid-аар (token шалгасны ДАРАА, spoof-лох боломжгүй key)
    if (opts.rateLimit) {
        const rl = checkRateLimit(`customer:${decoded.uid}`, opts.rateLimit);
        if (!rl.ok) {
            return {
                ok: false,
                error: 'rate_limit_exceeded',
                response: NextResponse.json(
                    { error: 'Хэт олон хүсэлт. Хүлээгээд дахин оролдоно уу.' },
                    {
                        status: 429,
                        headers: {
                            'Retry-After': String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
                        },
                    },
                ),
            };
        }
    }

    // 3. Хэрэглэгчийн doc унших (claims хуучирсан байж болох тул doc нь эх сурвалж)
    const db = getFirebaseAdminFirestore();
    const snap = await db.collection('customer_users').doc(decoded.uid).get();
    const profile = snap.exists
        ? ({ id: snap.id, ...(snap.data() as Omit<CustomerUser, 'id'>) } as CustomerUser & { id: string })
        : null;

    const hasCustomerClaim = decoded.role === 'customer';

    if (!profile && !opts.allowUnregistered) {
        return {
            ok: false,
            error: 'forbidden',
            response: NextResponse.json(
                { error: 'Бүртгэл олдсонгүй. Эхлээд бүртгүүлнэ үү.' },
                { status: 403 },
            ),
        };
    }

    if (!profile && !hasCustomerClaim && !opts.allowUnregistered) {
        return {
            ok: false,
            error: 'forbidden',
            response: NextResponse.json({ error: 'Хандах эрхгүй.' }, { status: 403 }),
        };
    }

    if (profile && profile.status === 'blocked') {
        return {
            ok: false,
            error: 'blocked',
            response: NextResponse.json(
                { error: 'Таны бүртгэл түр хаагдсан байна.', code: 'BLOCKED' },
                { status: 403 },
            ),
        };
    }

    return {
        ok: true,
        auth: {
            uid: decoded.uid,
            phone: decoded.phone_number || profile?.phone || null,
            profile,
            customerId: profile?.customerId ?? null,
        },
    };
}
