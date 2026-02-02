import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebase-admin';

type Body = {
  uid?: string;
  newPassword?: string;
};

function getBearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') || req.headers.get('Authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}

export async function POST(request: Request) {
  try {
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json({ error: 'Missing Authorization bearer token' }, { status: 401 });
    }

    const adminAuth = getFirebaseAdminAuth();
    const adminDb = getFirebaseAdminFirestore();

    let decoded: { uid: string };
    try {
      decoded = (await adminAuth.verifyIdToken(token)) as any;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }

    // Verify requester is an admin (employees/{uid}.role === 'admin')
    const requesterSnap = await adminDb.doc(`employees/${decoded.uid}`).get();
    const requesterRole = requesterSnap.exists ? (requesterSnap.data() as any)?.role : null;
    if (requesterRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = (await request.json()) as Body;
    const uid = typeof body?.uid === 'string' ? body.uid.trim() : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!uid || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields: uid, newPassword' }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    await adminAuth.updateUser(uid, { password: newPassword });

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

