/**
 * POST /api/mobile/v1/staff/customer-users/{uid}/link
 * Body: { customer_id }              — tms_customers doc-той холбоно
 * Body: { reject: true, reason? }    — хүсэлтийг татгалзана
 *
 * Auth: ажилтан (admin эсвэл tmsAccess). Холбоход custom claims-ыг
 * {role:'customer', customerId} болгож дахин онооно.
 */

import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { requireTenantAuth } from '@/lib/api/auth-middleware';
import { badRequest, forbidden, notFound, serverError } from '@/lib/mobile-api/errors';
import { Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';

async function requireTmsStaff(request: Request) {
    const result = await requireTenantAuth(request, { rateLimit: 'write' });
    if ('error' in result && result.error) return { response: result.response };
    const { uid, role, isEmployee } = result.auth!;
    if (!isEmployee) return { response: forbidden() };
    if (role !== 'admin') {
        const db = getFirebaseAdminFirestore();
        const empSnap = await db.collection('employees').doc(uid).get();
        if (empSnap.data()?.tmsAccess !== true) return { response: forbidden() };
    }
    return { staffUid: uid };
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ uid: string }> },
) {
    try {
        const staff = await requireTmsStaff(request);
        if ('response' in staff) return staff.response;

        const { uid: customerUserUid } = await params;

        const db = getFirebaseAdminFirestore();
        const userRef = db.collection('customer_users').doc(customerUserUid);
        const userSnap = await userRef.get();
        if (!userSnap.exists) return notFound('Хэрэглэгч олдсонгүй.');

        let body: { customer_id?: string; reject?: boolean; reason?: string };
        try {
            body = await request.json();
        } catch {
            return badRequest('JSON body шаардлагатай.');
        }

        const now = Timestamp.now();

        if (body.reject === true) {
            await userRef.update({
                linkStatus: 'rejected',
                updatedAt: now,
            });
            return NextResponse.json({ link_status: 'rejected' });
        }

        const customerId = typeof body.customer_id === 'string' ? body.customer_id.trim() : '';
        if (!customerId) return badRequest('customer_id шаардлагатай.');

        const custSnap = await db.collection('tms_customers').doc(customerId).get();
        if (!custSnap.exists) return notFound('tms_customers бүртгэл олдсонгүй.');
        const customerName = (custSnap.data()?.name as string | undefined) ?? null;

        await userRef.update({
            customerId,
            customerName,
            linkStatus: 'linked',
            updatedAt: now,
        });

        // Claims дахин оноох — Firestore rules + API хоёулаа ашиглана.
        // Клиент дараагийн getIdToken(true) хүртэл хуучин claims-тай байж
        // болно; API нь doc fallback-тай тул ажиллагаа тасрахгүй.
        await getFirebaseAdminAuth().setCustomUserClaims(customerUserUid, {
            role: 'customer',
            customerId,
        });

        return NextResponse.json({
            link_status: 'linked',
            customer_id: customerId,
            customer_name: customerName,
        });
    } catch (e) {
        return serverError(e);
    }
}
