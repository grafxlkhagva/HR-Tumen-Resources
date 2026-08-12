/**
 * PUT /api/mobile/v1/customer/me/devices
 * Body: { fcm_token, platform: 'android'|'ios', app_version? }
 *
 * FCM token-ыг fcmTokens map-д upsert хийнэ. Map ~10 token-оос хэтэрвэл
 * хамгийн хуучныг хасна (төхөөрөмж солигдох бүрд хог үлдэхээс сэргийлнэ).
 */

import { NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { requireCustomerAuth } from '@/lib/mobile-api/auth';
import { badRequest, serverError } from '@/lib/mobile-api/errors';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

const MAX_TOKENS = 10;

export async function PUT(request: Request) {
    try {
        const result = await requireCustomerAuth(request, { rateLimit: 'write' });
        if (!result.ok) return result.response;
        const { uid, profile } = result.auth;

        let body: { fcm_token?: string; platform?: string; app_version?: string };
        try {
            body = await request.json();
        } catch {
            return badRequest('JSON body шаардлагатай.');
        }

        const token = body.fcm_token;
        if (!token || typeof token !== 'string' || token.length < 10 || token.length > 4096) {
            return badRequest('fcm_token буруу байна.');
        }
        if (body.platform !== 'android' && body.platform !== 'ios') {
            return badRequest("platform нь 'android' эсвэл 'ios' байна.");
        }

        const db = getFirebaseAdminFirestore();
        const ref = db.collection('customer_users').doc(uid);
        const now = Timestamp.now();

        const updates: Record<string, unknown> = {
            [`fcmTokens.${token}`]: {
                platform: body.platform,
                appVersion: typeof body.app_version === 'string' ? body.app_version : null,
                updatedAt: now,
            },
            lastSeenAt: now,
            updatedAt: now,
        };

        // Хэт олон token хуримтлагдвал хамгийн хуучныг хасна
        const existing = (profile?.fcmTokens ?? {}) as Record<string, { updatedAt?: unknown }>;
        const entries = Object.entries(existing).filter(([t]) => t !== token);
        if (entries.length >= MAX_TOKENS) {
            const millisOf = (v: unknown) =>
                v instanceof Timestamp ? v.toMillis() : 0;
            entries
                .sort((a, b) => millisOf(a[1]?.updatedAt) - millisOf(b[1]?.updatedAt))
                .slice(0, entries.length - MAX_TOKENS + 1)
                .forEach(([t]) => {
                    updates[`fcmTokens.${t}`] = FieldValue.delete();
                });
        }

        await ref.update(updates);
        return NextResponse.json({ ok: true });
    } catch (e) {
        return serverError(e);
    }
}
