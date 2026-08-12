/**
 * POST /api/mobile/v1/customer/auth/register
 *
 * Захиалагчийн апп-ын анхны бүртгэл (bootstrap):
 *   1. Flutter Firebase Phone Auth-аар нэвтэрсний дараа энэ route-ыг дуудна
 *   2. customer_users/{uid} doc үүсгэнэ (байхгүй бол)
 *   3. Custom claims {role:'customer'} оноож өгнө
 *   4. Клиент дараа нь getIdToken(true) хийж шинэ claims-аа авна
 *
 * Хамгаалалт: нэг auth бүртгэл = нэг дүр. Тухайн uid жолооч (role='driver')
 * эсвэл ажилтан (employees doc) бол 409 ROLE_CONFLICT.
 */

import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { requireCustomerAuth } from '@/lib/mobile-api/auth';
import { conflict, badRequest, serverError, checkMinAppVersion } from '@/lib/mobile-api/errors';
import { serializeCustomerProfile } from '@/lib/mobile-api/serializers';
import { Timestamp } from 'firebase-admin/firestore';
import type { CustomerUser } from '@/types/marketplace';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const forceUpdate = checkMinAppVersion(request);
        if (forceUpdate) return forceUpdate;

        const result = await requireCustomerAuth(request, {
            rateLimit: 'write',
            allowUnregistered: true,
        });
        if (!result.ok) return result.response;
        const { uid, phone, profile } = result.auth;

        if (!phone) {
            return badRequest('Утасны дугаартай (Phone Auth) бүртгэл шаардлагатай.');
        }

        const db = getFirebaseAdminFirestore();
        const adminAuth = getFirebaseAdminAuth();

        // Дүрийн зөрчил шалгах: ажилтан эсвэл жолоочийн бүртгэлтэй uid байж болохгүй
        const [empSnap, userRecord] = await Promise.all([
            db.collection('employees').doc(uid).get(),
            adminAuth.getUser(uid),
        ]);
        if (empSnap.exists) {
            return conflict('ROLE_CONFLICT', 'Энэ бүртгэл ажилтны системд ашиглагдаж байна.');
        }
        const existingRole = (userRecord.customClaims?.role as string | undefined) ?? undefined;
        if (existingRole && existingRole !== 'customer') {
            return conflict('ROLE_CONFLICT', 'Энэ утасны дугаар өөр төрлийн бүртгэлд ашиглагдаж байна.');
        }

        let body: { display_name?: string; account_type?: string } = {};
        try {
            body = await request.json();
        } catch {
            // body заавал биш
        }

        const now = Timestamp.now();
        let created = false;

        if (!profile) {
            const doc: Omit<CustomerUser, 'id'> = {
                phone,
                displayName: typeof body.display_name === 'string' ? body.display_name.trim() || null : null,
                email: null,
                registerNumber: null,
                accountType: body.account_type === 'business' ? 'business' : 'personal',
                customerId: null,
                customerName: null,
                linkStatus: 'none',
                linkRequest: null,
                status: 'active',
                fcmTokens: {},
                createdAt: now,
                updatedAt: now,
                lastSeenAt: now,
            };
            await db.collection('customer_users').doc(uid).set(doc);
            created = true;
        } else {
            await db.collection('customer_users').doc(uid).update({ lastSeenAt: now });
        }

        // Claims mint — байсан ч давтан оноох нь идемпотент
        const claimsUpdated = existingRole !== 'customer';
        if (claimsUpdated) {
            await adminAuth.setCustomUserClaims(uid, { role: 'customer' });
        }

        const snap = await db.collection('customer_users').doc(uid).get();
        const fresh = { id: snap.id, ...(snap.data() as Omit<CustomerUser, 'id'>) };

        return NextResponse.json(
            {
                profile: serializeCustomerProfile(fresh),
                claims_updated: claimsUpdated,
            },
            { status: created ? 201 : 200 },
        );
    } catch (e) {
        return serverError(e);
    }
}
