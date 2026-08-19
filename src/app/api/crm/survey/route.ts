import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * NPS судалгааны урилга — токентой.
 * POST: нэвтэрсэн CRM хэрэглэгч компанид урилга үүсгэнэ → { token, url }.
 * GET ?token=: нээлттэй — public хуудас компанийн нэр/төлөвийг татна.
 */

export const runtime = 'nodejs';

function getBearerToken(req: Request): string | null {
    const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match?.[1] || null;
}

export async function POST(request: Request) {
    const db = getFirebaseAdminFirestore();
    try {
        const token = getBearerToken(request);
        if (!token) {
            return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
        }
        let decoded: { uid: string };
        try {
            decoded = (await getFirebaseAdminAuth().verifyIdToken(token)) as { uid: string };
        } catch {
            return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
        }
        const empSnap = await db.doc(`employees/${decoded.uid}`).get();
        const emp = empSnap.exists ? (empSnap.data() as Record<string, unknown>) : null;
        const allowed = emp?.role === 'admin' || !!emp?.crmAccess;
        if (!allowed) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await request.json();
        const companyId = String(body.companyId || '').trim();
        const companyName = String(body.companyName || '').trim();
        const kam = body.kam ? String(body.kam) : null;
        if (!companyName) {
            return NextResponse.json({ error: 'companyName шаардлагатай' }, { status: 400 });
        }

        const inviteToken = randomUUID().replace(/-/g, '');
        await db.collection('crm_survey_invites').doc(inviteToken).set({
            companyId: companyId || null,
            companyName,
            kam,
            createdBy: decoded.uid,
            createdAt: FieldValue.serverTimestamp(),
            usedAt: null,
            score: null,
        });

        const base = process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin;
        const url = `${base.replace(/\/$/, '')}/survey/${inviteToken}`;
        return NextResponse.json({ ok: true, token: inviteToken, url });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 },
        );
    }
}

export async function GET(request: Request) {
    const db = getFirebaseAdminFirestore();
    const token = new URL(request.url).searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'token шаардлагатай' }, { status: 400 });
    const snap = await db.collection('crm_survey_invites').doc(token).get();
    if (!snap.exists) return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    const d = snap.data() as Record<string, unknown>;
    return NextResponse.json({
        ok: true,
        companyName: d.companyName ?? '',
        used: !!d.usedAt,
    });
}
