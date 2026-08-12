import { NextResponse } from 'next/server';
import { getFirebaseAdminAuth, getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import {
    GENERIC_REQUEST_MESSAGE,
    OTP_TTL_MS,
    canResend,
    computeExpiry,
    generateOtp,
    generateResetId,
    hashOtp,
    isEmail,
    maskEmail,
    nextRequestWindow,
    normalizeIdentifier,
} from '@/lib/auth/password-reset';
import { buildOtpEmail } from '@/lib/auth/reset-email-template';

/**
 * POST /api/auth/request-reset — Self-service нууц үг сэргээх 1-р алхам.
 *
 * Аюулгүй байдлын зарчим:
 *  - НЭВТРЭХГҮЙ endpoint (хэрэглэгч нууц үгээ мартсан) — тиймээс rate-limit,
 *    generic хариу, оролдлогын хязгаар нь гол хамгаалалт.
 *  - Бүртгэл байгаа эсэхийг ХЭЗЭЭ Ч задлахгүй (user enumeration хамгаалалт):
 *    амжилт/алдаанаас үл хамааран ижил ерөнхий мессеж буцаана.
 *  - OTP-ийн зөвхөн hash-ийг Firestore-д хадгална (түүхий кодыг биш).
 *  - Auth имэйл синтетик (${code}@example.com) тул кодыг employees doc-ийн
 *    ЖИНХЭНЭ email талбар руу илгээнэ.
 */

export const runtime = 'nodejs';

interface Body {
    identifier?: string;
}

/**
 * Firestore employees-ээс код эсвэл имэйлээр хэрэглэгч хайна (Admin SDK).
 * Зөвхөн индексжсэн ЯГ таарах query — DoS амплификацаас (500-doc scan) зайлсхийв.
 * Имэйлийг том/жижиг үсгийн ялгаагүй тааруулах шаардлагатай бол employees doc-д
 * `emailLower` талбар хадгалж, түүгээр exact query хийх нь зөв (migration шаардана).
 */
async function findEmployee(
    db: FirebaseFirestore.Firestore,
    ident: { kind: 'email' | 'code'; value: string },
): Promise<{ uid: string; email: string; loginDisabled: boolean } | null> {
    const field = ident.kind === 'email' ? 'email' : 'employeeCode';
    const snap = await db.collection('employees').where(field, '==', ident.value).limit(1).get();
    if (snap.empty) return null;
    const doc = snap.docs[0];
    const data = doc.data() as { email?: string; loginDisabled?: boolean };
    return {
        uid: doc.id,
        email: String(data.email ?? ''),
        loginDisabled: data.loginDisabled === true,
    };
}

export async function POST(request: Request) {
    // Ерөнхий хариу — enumeration-аас хамгаалахын тулд бараг бүх замд ижил.
    const generic = (extra?: Record<string, unknown>) =>
        NextResponse.json({ ok: true, message: GENERIC_REQUEST_MESSAGE, ...extra });

    let db: FirebaseFirestore.Firestore;
    try {
        db = getFirebaseAdminFirestore();
        // Admin Auth-ийг эрт шалгаж, тохиргоо дутуу бол цэвэр алдаа өгнө.
        getFirebaseAdminAuth();
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
    if (!ident) {
        return NextResponse.json(
            { ok: false, error: 'Ажилтны код эсвэл имэйлээ оруулна уу.' },
            { status: 400 },
        );
    }

    const now = Date.now();

    try {
        const employee = await findEmployee(db, ident);

        // Бүртгэл олдохгүй / нэвтрэх эрх хаагдсан / жинхэнэ имэйлгүй бол
        // ЧИМЭЭГҮЙ ерөнхий хариу буцаана (enumeration задлахгүй).
        if (!employee || employee.loginDisabled || !employee.email || !isEmail(employee.email)) {
            return generic();
        }

        const resetRef = db.collection('password_resets').doc(employee.uid);
        const existing = await resetRef.get();
        const prev = existing.exists
            ? (existing.data() as {
                  lastRequestAt?: number;
                  windowStartMs?: number;
                  requestCount?: number;
              })
            : null;

        // Хугацааны цонх дахь хүсэлтийн тоог шалгах (spam хязгаар).
        const win = nextRequestWindow(prev?.windowStartMs, prev?.requestCount, now);
        if (!win.allowed) {
            // Хэт олон хүсэлт — ижил ерөнхий хариу (задлахгүй), шинэ код илгээхгүй.
            return generic();
        }

        // Дахин илгээх cooldown — гэхдээ хариу нь ерөнхий хэвээр.
        if (!canResend(prev?.lastRequestAt, now)) {
            return generic();
        }

        // Шинэ OTP үүсгэж, зөвхөн hash-ийг хадгална.
        const resetId = generateResetId();
        const otp = generateOtp();
        const otpHash = hashOtp(otp, resetId);
        const expiresAt = computeExpiry(now, OTP_TTL_MS);

        await resetRef.set({
            uid: employee.uid,
            salt: resetId,
            otpHash,
            expiresAt,
            attempts: 0,
            consumed: false,
            channel: 'email',
            destinationMasked: maskEmail(employee.email),
            lastRequestAt: now,
            windowStartMs: win.windowStartMs,
            requestCount: win.count,
            createdAt: FieldValue.serverTimestamp(),
        });

        // Кодыг ЖИНХЭНЭ имэйл рүү илгээнэ (/api/email → Resend).
        try {
            const origin = new URL(request.url).origin;
            const { subject, html, text } = buildOtpEmail(otp);
            const mailRes = await fetch(`${origin}/api/email`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: employee.email, subject, html, text }),
            });
            if (!mailRes.ok) {
                // Хэрэглэгчид задлахгүй (generic хэвээр), гэхдээ operator-т лог үлдээнэ.
                console.error('[request-reset] имэйл HTTP алдаа:', mailRes.status);
            }
        } catch (e) {
            // Имэйл илгээхэд алдаа гарсан ч enumeration задлахгүйн тулд
            // ерөнхий хариугаа буцаана (лог дээр л үлдээнэ).
            console.error('[request-reset] имэйл илгээх алдаа:', e);
        }

        // DEV орчинд урсгалыг бүрэн турших боломж (Resend домэйн verify хийгээгүй
        // байж болзошгүй тул). Зөвхөн production БИШ бөгөөд ALLOW_DEV_OTP=true үед.
        // Vercel deployment бүрд NODE_ENV=production тул production-д ХЭЗЭЭ Ч задрахгүй.
        const devOtp =
            process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_OTP === 'true'
                ? { devOtp: otp }
                : undefined;

        return generic(devOtp);
    } catch (e) {
        console.error('[request-reset] алдаа:', e);
        // Дотоод алдааг ч ерөнхий хариугаар бүрхэж, задралаас сэргийлнэ.
        return generic();
    }
}
