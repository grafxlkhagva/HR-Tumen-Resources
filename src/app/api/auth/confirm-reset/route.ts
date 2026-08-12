import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
    GENERIC_CONFIRM_ERROR,
    isExpired,
    isLockedOut,
    normalizeIdentifier,
    validateNewPassword,
    verifyOtp,
} from '@/lib/auth/password-reset';

/**
 * POST /api/auth/confirm-reset — Self-service нууц үг сэргээх 2-р алхам.
 *
 * OTP-ийг шалгаж, амжилттай бол Firebase Auth нууц үгийг Admin SDK-ээр солино.
 * Аюулгүй байдал:
 *  - Оролдлого тоолол + lockout шалгалт + кодыг "ашигласан" болгохыг ХАМТ
 *    Firestore ТРАНЗАКЦИД гүйцэтгэж, зэрэгцээ (race) brute-force-оос сэргийлнэ.
 *  - Алдааны мессежийг ерөнхий болгож (буруу код vs хугацаа дуусахыг ялгахгүй).
 *  - loginDisabled account-ыг дахин шалгаж (TOCTOU) сэргээхийг зөвшөөрөхгүй.
 */

export const runtime = 'nodejs';

interface Body {
    identifier?: string;
    otp?: string;
    newPassword?: string;
}

async function findUser(
    db: FirebaseFirestore.Firestore,
    ident: { kind: 'email' | 'code'; value: string },
): Promise<{ uid: string; loginDisabled: boolean } | null> {
    const field = ident.kind === 'email' ? 'email' : 'employeeCode';
    const snap = await db.collection('employees').where(field, '==', ident.value).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data() as { loginDisabled?: boolean };
    return { uid: doc.id, loginDisabled: data.loginDisabled === true };
}

export async function POST(request: Request) {
    const genericError = () =>
        NextResponse.json({ ok: false, error: GENERIC_CONFIRM_ERROR }, { status: 400 });

    let db: FirebaseFirestore.Firestore;
    let auth: ReturnType<typeof getFirebaseAdminAuth>;
    try {
        db = getFirebaseAdminFirestore();
        auth = getFirebaseAdminAuth();
    } catch {
        return NextResponse.json(
            { ok: false, error: 'Сервер тал тохируулагдаагүй байна (Admin SDK).' },
            { status: 503 },
        );
    }

    let body: Body;
    try {
        body = (await request.json()) as Body;
    } catch {
        return NextResponse.json({ ok: false, error: 'Буруу хүсэлт.' }, { status: 400 });
    }

    const ident = normalizeIdentifier(body?.identifier ?? '');
    const otp = String(body?.otp ?? '').trim();
    const newPassword = String(body?.newPassword ?? '');

    if (!ident || !otp) {
        return genericError();
    }

    // Нууц үгийн бодлого — энэ алдаа тодорхой байж болно (задрал биш).
    const pwCheck = validateNewPassword(newPassword);
    if (!pwCheck.ok) {
        return NextResponse.json({ ok: false, error: pwCheck.error }, { status: 400 });
    }

    try {
        const user = await findUser(db, ident);
        // Олдохгүй эсвэл нэвтрэх эрх хаагдсан бол ерөнхий алдаа (задлахгүй).
        if (!user || user.loginDisabled) return genericError();

        const resetRef = db.collection('password_resets').doc(user.uid);

        // ── Атомик шалгалт: read → verify → (increment | consume) нэг транзакцид ──
        const outcome = await db.runTransaction(async (txn) => {
            const snap = await txn.get(resetRef);
            if (!snap.exists) return 'invalid' as const;

            const data = snap.data() as {
                salt?: string;
                otpHash?: string;
                expiresAt?: number;
                attempts?: number;
                consumed?: boolean;
            };
            const now = Date.now();

            if (
                data.consumed === true ||
                !data.otpHash ||
                !data.salt ||
                typeof data.expiresAt !== 'number' ||
                isExpired(data.expiresAt, now) ||
                isLockedOut(data.attempts ?? 0)
            ) {
                return 'invalid' as const;
            }

            if (!verifyOtp(otp, data.salt, data.otpHash)) {
                // Буруу оролдлогыг атомикаар тоолж, хязгаарт хүрвэл дараагийнх хаагдана.
                txn.update(resetRef, { attempts: FieldValue.increment(1) });
                return 'wrong' as const;
            }

            // Зөв — кодыг нэн даруй нэг удаагийнх болгож тэмдэглэнэ (replay/race хамгаалалт).
            txn.update(resetRef, { consumed: true, consumedAt: FieldValue.serverTimestamp() });
            return 'ok' as const;
        });

        if (outcome !== 'ok') return genericError();

        // Транзакц амжилттай (код зөв, consumed тэмдэглэгдсэн) — нууц үгийг солино.
        await auth.updateUser(user.uid, { password: newPassword });

        return NextResponse.json({ ok: true, message: 'Нууц үг амжилттай шинэчлэгдлээ.' });
    } catch (e) {
        console.error('[confirm-reset] алдаа:', e);
        return NextResponse.json(
            { ok: false, error: 'Нууц үг шинэчлэхэд алдаа гарлаа.' },
            { status: 500 },
        );
    }
}
