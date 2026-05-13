/**
 * Single-tenant compatibility shim for tenant-aware auth middleware.
 * Multi-tenant SaaS-аас ирсэн `requireTenantAuth` функцыг манай single-tenant
 * production-д тохируулсан хувилбар. Firebase ID token-ийг шалгаж uid, role
 * буцаана. companyId='default' тогтмол.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import {
    checkRateLimit,
    getCallerIdentifier,
    type RateLimitPreset,
    type RateLimitConfig,
} from './rate-limiter';

export interface AuthContext {
    uid: string;
    companyId: string;
    role: string;
}

export interface AuthResult {
    auth: AuthContext;
    error?: never;
    response?: never;
}

export interface AuthError {
    auth?: never;
    error: string;
    response: NextResponse;
}

function extractToken(request: NextRequest | Request): string | null {
    const header = request.headers.get('authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1] || null;
}

export interface AuthOptions {
    rateLimit?: RateLimitPreset | RateLimitConfig;
    /** SaaS module — single-tenant-д ашиглагдахгүй (compatibility-ийн зорилгоор зөвшөөрсөн). */
    module?: string;
    /** Хязгаар шалгалт — single-tenant-д ашиглагдахгүй. */
    limitCheck?: { key: string; currentCount: number };
}

/**
 * Authentication require + (нэмэлт) rate limit. Manai single-tenant-д
 * tenant validation-ийг хийхгүй — зөвхөн token-ыг verify.
 */
export async function requireTenantAuth(
    request: NextRequest | Request,
    opts: AuthOptions = {},
): Promise<AuthResult | AuthError> {
    // Rate limit
    if (opts.rateLimit) {
        const callerId = getCallerIdentifier(request);
        const rl = checkRateLimit(callerId, opts.rateLimit);
        if (!rl.ok) {
            return {
                error: 'rate_limit_exceeded',
                response: NextResponse.json(
                    { error: 'Хэт олон хүсэлт. Хүлээгээд дахин оролдоно уу.' },
                    {
                        status: 429,
                        headers: {
                            'Retry-After': String(
                                Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000)),
                            ),
                        },
                    },
                ),
            };
        }
    }

    // Verify Firebase ID token
    const token = extractToken(request);
    if (!token) {
        return {
            error: 'unauthorized',
            response: NextResponse.json(
                { error: 'Authorization header байхгүй.' },
                { status: 401 },
            ),
        };
    }

    let decoded: { uid: string; role?: string; [key: string]: unknown };
    try {
        const adminAuth = getFirebaseAdminAuth();
        decoded = await adminAuth.verifyIdToken(token);
    } catch (e) {
        const msg = e instanceof Error ? e.message : 'Invalid token';
        return {
            error: 'unauthorized',
            response: NextResponse.json(
                { error: `Token шалгахад алдаа: ${msg}` },
                { status: 401 },
            ),
        };
    }

    // Get role from employee doc (single-tenant — top-level `employees` collection)
    let role: string = (decoded.role as string) || 'employee';
    try {
        const db = getFirebaseAdminFirestore();
        const empSnap = await db.collection('employees').doc(decoded.uid).get();
        if (empSnap.exists) {
            const data = empSnap.data();
            if (data?.role) role = data.role;
        }
    } catch {
        // Fail-open: role default
    }

    return {
        auth: {
            uid: decoded.uid,
            companyId: 'default',
            role,
        },
    };
}
