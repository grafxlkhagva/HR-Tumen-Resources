import { NextResponse } from 'next/server';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * NPS судалгаа илгээх (public, токеноор) — харилцагч өөрөө 0–10 оноо өгнө.
 * Токен нэг л удаа хүчинтэй (usedAt тавьсны дараа дахин авахгүй).
 */

export const runtime = 'nodejs';

function npsZone(score: number): 'promoter' | 'passive' | 'detractor' {
    if (score >= 9) return 'promoter';
    if (score >= 7) return 'passive';
    return 'detractor';
}

export async function POST(request: Request) {
    const db = getFirebaseAdminFirestore();
    try {
        const body = await request.json();
        const token = String(body.token || '').trim();
        const score = Number(body.score);
        const note = body.note ? String(body.note).slice(0, 1000) : '';

        if (!token) return NextResponse.json({ error: 'token шаардлагатай' }, { status: 400 });
        if (!Number.isInteger(score) || score < 0 || score > 10) {
            return NextResponse.json({ error: 'score 0–10 байх ёстой' }, { status: 400 });
        }

        const inviteRef = db.collection('crm_survey_invites').doc(token);
        const inviteSnap = await inviteRef.get();
        if (!inviteSnap.exists) {
            return NextResponse.json({ error: 'not_found' }, { status: 404 });
        }
        const invite = inviteSnap.data() as Record<string, unknown>;
        if (invite.usedAt) {
            return NextResponse.json({ error: 'already_used' }, { status: 409 });
        }

        await db.collection('crm_surveys').add({
            companyId: invite.companyId ?? null,
            companyName: invite.companyName ?? null,
            kam: invite.kam ?? null,
            score,
            zone: npsZone(score),
            note,
            source: 'link',
            ownerId: null,
            createdAt: FieldValue.serverTimestamp(),
        });

        await inviteRef.set(
            { usedAt: FieldValue.serverTimestamp(), score },
            { merge: true },
        );

        return NextResponse.json({ ok: true });
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 },
        );
    }
}
