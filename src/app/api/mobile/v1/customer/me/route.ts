/**
 * GET  /api/mobile/v1/customer/me    — профайл
 * PATCH /api/mobile/v1/customer/me   — display_name / email / register_number засах
 */

import { NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { requireCustomerAuth } from '@/lib/mobile-api/auth';
import { badRequest, serverError, checkMinAppVersion } from '@/lib/mobile-api/errors';
import { serializeCustomerProfile } from '@/lib/mobile-api/serializers';
import { Timestamp } from 'firebase-admin/firestore';
import type { CustomerUser } from '@/types/marketplace';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    try {
        const forceUpdate = checkMinAppVersion(request);
        if (forceUpdate) return forceUpdate;

        const result = await requireCustomerAuth(request, { rateLimit: 'default' });
        if (!result.ok) return result.response;

        return NextResponse.json({ profile: serializeCustomerProfile(result.auth.profile!) });
    } catch (e) {
        return serverError(e);
    }
}

export async function PATCH(request: Request) {
    try {
        const result = await requireCustomerAuth(request, { rateLimit: 'write' });
        if (!result.ok) return result.response;
        const { uid } = result.auth;

        let body: Record<string, unknown>;
        try {
            body = await request.json();
        } catch {
            return badRequest('JSON body шаардлагатай.');
        }

        const updates: Record<string, unknown> = {};

        if ('display_name' in body) {
            if (typeof body.display_name !== 'string' || body.display_name.trim().length === 0) {
                return badRequest('display_name хоосон байж болохгүй.');
            }
            updates.displayName = body.display_name.trim().slice(0, 100);
        }
        if ('email' in body) {
            if (body.email === null || body.email === '') {
                updates.email = null;
            } else if (typeof body.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
                updates.email = body.email.trim();
            } else {
                return badRequest('Имэйл хаяг буруу байна.');
            }
        }
        if ('register_number' in body) {
            if (body.register_number === null || body.register_number === '') {
                updates.registerNumber = null;
            } else if (typeof body.register_number === 'string' && body.register_number.trim().length <= 20) {
                updates.registerNumber = body.register_number.trim();
            } else {
                return badRequest('Регистрийн дугаар буруу байна.');
            }
        }
        if ('account_type' in body) {
            if (body.account_type === 'personal' || body.account_type === 'business') {
                updates.accountType = body.account_type;
            } else {
                return badRequest('account_type нь personal эсвэл business байна.');
            }
        }

        if (Object.keys(updates).length === 0) {
            return badRequest('Засах талбар алга.');
        }

        updates.updatedAt = Timestamp.now();

        const db = getFirebaseAdminFirestore();
        await db.collection('customer_users').doc(uid).update(updates);
        const snap = await db.collection('customer_users').doc(uid).get();
        const fresh = { id: snap.id, ...(snap.data() as Omit<CustomerUser, 'id'>) };

        return NextResponse.json({ profile: serializeCustomerProfile(fresh) });
    } catch (e) {
        return serverError(e);
    }
}
