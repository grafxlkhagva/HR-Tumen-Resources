/**
 * POST /api/mobile/v1/customer/me/link-request
 * Body: { register_number }
 *
 * B2B байгууллагатай холбогдох хүсэлт. Автомат холболт ХИЙХГҮЙ (SIM дахин
 * ашиглалтын эрсдэл) — staff web дээрээс хянаж баталдаг:
 * POST /api/mobile/v1/staff/customer-users/{uid}/link
 */

import { NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { requireCustomerAuth } from '@/lib/mobile-api/auth';
import { badRequest, conflict, serverError } from '@/lib/mobile-api/errors';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const result = await requireCustomerAuth(request, { rateLimit: 'write' });
        if (!result.ok) return result.response;
        const { uid, profile } = result.auth;

        if (profile!.linkStatus === 'linked') {
            return conflict('VALIDATION', 'Та аль хэдийн байгууллагатай холбогдсон байна.');
        }

        let body: { register_number?: string };
        try {
            body = await request.json();
        } catch {
            return badRequest('JSON body шаардлагатай.');
        }

        const regNo = typeof body.register_number === 'string' ? body.register_number.trim() : '';
        if (!regNo || regNo.length > 20) {
            return badRequest('Байгууллагын регистрийн дугаар оруулна уу.');
        }

        const db = getFirebaseAdminFirestore();
        const now = Timestamp.now();
        await db.collection('customer_users').doc(uid).update({
            linkStatus: 'pending',
            linkRequest: { registerNumber: regNo, requestedAt: now },
            accountType: 'business',
            registerNumber: regNo,
            updatedAt: now,
        });

        return NextResponse.json({ link_status: 'pending' });
    } catch (e) {
        return serverError(e);
    }
}
