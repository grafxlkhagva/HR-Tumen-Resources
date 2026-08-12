import { createHash, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

/**
 * Нууц үг сэргээх (self-service имэйл OTP) урсгалын ЦЭВЭР логик.
 * Firebase/сүлжээнээс хамааралгүй — бүрэн unit-тестлэгдэнэ.
 * Аюулгүй байдлын гол хэмжүүрүүд энд төвлөрсөн: OTP үүсгэлт, timing-safe
 * харьцуулалт, хугацаа, оролдлогын хязгаар, дахин илгээх cooldown.
 */

// ── Тохиргооны тогтмолууд ──────────────────────────────────────────

/** OTP-ийн орон (6 цифр). */
export const OTP_LENGTH = 6;
/** OTP хүчинтэй хугацаа — 15 минут. */
export const OTP_TTL_MS = 15 * 60 * 1000;
/** OTP буруу оруулах дээд оролдлого — үүнээс хэтэрвэл кодыг хүчингүй болгоно. */
export const MAX_VERIFY_ATTEMPTS = 5;
/** Кодыг дахин илгээх хоорондын доод завсар — 60 секунд. */
export const RESEND_COOLDOWN_MS = 60 * 1000;
/** Хугацааны цонх дахь хүсэлтийн дээд тоо (spam хамгаалалт). */
export const MAX_REQUESTS_PER_WINDOW = 5;
/** Хүсэлтийн тооллын цонх — 1 цаг. */
export const REQUEST_WINDOW_MS = 60 * 60 * 1000;
/** Шинэ нууц үгийн доод урт (Firebase-ийн доод хязгаартай нийцүүлэв). */
export const MIN_PASSWORD_LENGTH = 6;

// ── Identifier (нэвтрэх код эсвэл имэйл) ───────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(input: string): boolean {
    return EMAIL_RE.test(input.trim());
}

export type IdentifierKind = 'email' | 'code';

export interface NormalizedIdentifier {
    kind: IdentifierKind;
    /** Хайлтад ашиглах цэвэрлэсэн утга (имэйл бол жижиг үсэг). */
    value: string;
}

/**
 * Хэрэглэгчийн оруулсан утгыг цэвэрлэж, имэйл эсвэл ажилтны код гэж ангилна.
 * Хоосон/зайтай утгыг тайрна; имэйлийг жижиг үсэг болгоно.
 */
export function normalizeIdentifier(input: string): NormalizedIdentifier | null {
    const trimmed = (input ?? '').trim();
    if (!trimmed) return null;
    if (isEmail(trimmed)) {
        return { kind: 'email', value: trimmed.toLowerCase() };
    }
    return { kind: 'code', value: trimmed };
}

/** Имэйлийг нуумал хэлбэрт оруулна (ж: "khan@gmail.com" → "k••n@gmail.com"). */
export function maskEmail(email: string): string {
    const at = email.indexOf('@');
    if (at <= 0) return '•••';
    const local = email.slice(0, at);
    const domain = email.slice(at);
    if (local.length <= 2) {
        return `${local[0] ?? '•'}•${domain}`;
    }
    return `${local[0]}${'•'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}${domain}`;
}

// ── OTP үүсгэлт ба шалгалт ─────────────────────────────────────────

/**
 * Криптографик тохиолдлын 6 оронтой OTP үүсгэнэ (эхэнд нь 0 байж болно).
 * Тестэд тодорхойлолт хийхийн тулд random функцийг тарьж (inject) болно.
 */
export function generateOtp(rng: (maxExclusive: number) => number = randomInt): string {
    const max = 10 ** OTP_LENGTH;
    const n = rng(max);
    return String(n).padStart(OTP_LENGTH, '0');
}

/** Санамсаргүй давталтгүй salt/токен (resetId болгон ашиглана). */
export function generateResetId(): string {
    return randomUUID();
}

/**
 * OTP-ийг salt-тай хамт hash хийнэ. Түүхий OTP-ийг ХЭЗЭЭ Ч хадгалахгүй —
 * зөвхөн энэ hash-ийг Firestore-д бичнэ.
 */
export function hashOtp(otp: string, salt: string): string {
    return createHash('sha256').update(`${salt}:${otp}`).digest('hex');
}

/**
 * OTP-ийг timing-safe байдлаар шалгана (урт/агуулгаас үл хамааран
 * тогтмол хугацаанд харьцуулснаар цагийн суваг руу мэдээлэл алдахгүй).
 */
export function verifyOtp(otp: string, salt: string, expectedHash: string): boolean {
    const actual = Buffer.from(hashOtp(otp, salt), 'hex');
    let expected: Buffer;
    try {
        expected = Buffer.from(expectedHash, 'hex');
    } catch {
        return false;
    }
    if (actual.length !== expected.length || actual.length === 0) return false;
    return timingSafeEqual(actual, expected);
}

// ── Хугацаа / хязгаар ──────────────────────────────────────────────

/** OTP-ийн дуусах цагийг (epoch ms) буцаана. */
export function computeExpiry(nowMs: number, ttlMs: number = OTP_TTL_MS): number {
    return nowMs + ttlMs;
}

/** OTP хугацаа дууссан эсэх. */
export function isExpired(expiresAtMs: number, nowMs: number): boolean {
    return nowMs >= expiresAtMs;
}

/** Оролдлогын тоо хязгаараа хэтэрсэн эсэх (код хүчингүй болно). */
export function isLockedOut(attempts: number, max: number = MAX_VERIFY_ATTEMPTS): boolean {
    return attempts >= max;
}

/**
 * Кодыг дахин илгээхийг зөвшөөрөх эсэх (cooldown).
 * lastRequestAtMs null бол (анхны хүсэлт) үргэлж зөвшөөрнө.
 */
export function canResend(
    lastRequestAtMs: number | null | undefined,
    nowMs: number,
    cooldownMs: number = RESEND_COOLDOWN_MS,
): boolean {
    if (lastRequestAtMs == null) return true;
    return nowMs - lastRequestAtMs >= cooldownMs;
}

/** Дараагийн дахин илгээх хүртэлх үлдсэн секунд (UI-д харуулах). */
export function resendWaitSeconds(
    lastRequestAtMs: number | null | undefined,
    nowMs: number,
    cooldownMs: number = RESEND_COOLDOWN_MS,
): number {
    if (lastRequestAtMs == null) return 0;
    const remaining = cooldownMs - (nowMs - lastRequestAtMs);
    return remaining <= 0 ? 0 : Math.ceil(remaining / 1000);
}

/**
 * Хугацааны цонх дахь хүсэлтийн тоог шинэчилнэ.
 * Цонх дууссан бол тоог 1 болгож шинэ цонх эхлүүлнэ.
 */
export function nextRequestWindow(
    windowStartMs: number | null | undefined,
    count: number | null | undefined,
    nowMs: number,
    windowMs: number = REQUEST_WINDOW_MS,
): { windowStartMs: number; count: number; allowed: boolean } {
    if (windowStartMs == null || nowMs - windowStartMs >= windowMs) {
        return { windowStartMs: nowMs, count: 1, allowed: true };
    }
    const nextCount = (count ?? 0) + 1;
    return {
        windowStartMs,
        count: nextCount,
        allowed: nextCount <= MAX_REQUESTS_PER_WINDOW,
    };
}

// ── Нууц үгийн бодлого ─────────────────────────────────────────────

export interface PasswordValidation {
    ok: boolean;
    error?: string;
}

/** Хамгийн түгээмэл, амархан таамаглагдах нууц үгс (жижиг үсгээр харьцуулна). */
export const COMMON_PASSWORDS = new Set([
    '123456',
    '1234567',
    '12345678',
    '123456789',
    '1234567890',
    'password',
    'qwerty',
    'qwerty123',
    'abc123',
    '111111',
    '000000',
    'iloveyou',
    'admin',
    'welcome',
    'mongolia',
    'tumen',
]);

/**
 * Шинэ нууц үгийн шаардлагыг шалгана.
 * Firebase-ийн доод хязгаар 6 тэмдэгт; нэмээд зөвхөн зайнаас бүрдэхийг болон
 * хэт түгээмэл нууц үгсийг хориглоно.
 */
export function validateNewPassword(pw: string): PasswordValidation {
    if (typeof pw !== 'string' || pw.length === 0) {
        return { ok: false, error: 'Нууц үгээ оруулна уу.' };
    }
    if (pw.length < MIN_PASSWORD_LENGTH) {
        return { ok: false, error: `Нууц үг дор хаяж ${MIN_PASSWORD_LENGTH} тэмдэгттэй байх ёстой.` };
    }
    if (pw.trim().length === 0) {
        return { ok: false, error: 'Нууц үг зөвхөн зайнаас бүрдэж болохгүй.' };
    }
    if (COMMON_PASSWORDS.has(pw.toLowerCase())) {
        return { ok: false, error: 'Энэ нууц үг хэт түгээмэл байна. Илүү нарийн нууц үг сонгоно уу.' };
    }
    return { ok: true };
}

// ── Хариу төлөвүүд (anti-enumeration) ──────────────────────────────

/**
 * request-reset ҮРГЭЛЖ ижил ерөнхий хариу буцаана — бүртгэл байгаа эсэхийг
 * задлахгүй (user enumeration хамгаалалт). UI үүнийг хэвлэнэ.
 */
export const GENERIC_REQUEST_MESSAGE =
    'Хэрэв энэ код/имэйлтэй бүртгэл байгаа бол баталгаажуулах кодыг имэйлээр илгээлээ.';

/** confirm-reset дэх ерөнхий алдаа — OTP буруу ба хугацаа дуусахыг ялгахгүй. */
export const GENERIC_CONFIRM_ERROR =
    'Баталгаажуулах код буруу эсвэл хугацаа нь дууссан байна.';
