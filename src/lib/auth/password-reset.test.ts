import { describe, it, expect } from 'vitest';
import {
    OTP_LENGTH,
    OTP_TTL_MS,
    MAX_VERIFY_ATTEMPTS,
    RESEND_COOLDOWN_MS,
    MAX_REQUESTS_PER_WINDOW,
    MIN_PASSWORD_LENGTH,
    isEmail,
    normalizeIdentifier,
    maskEmail,
    generateOtp,
    generateResetId,
    hashOtp,
    verifyOtp,
    computeExpiry,
    isExpired,
    isLockedOut,
    canResend,
    resendWaitSeconds,
    nextRequestWindow,
    validateNewPassword,
} from './password-reset';

describe('isEmail', () => {
    it('нэвтрэх кодыг имэйл гэж үзэхгүй', () => {
        expect(isEmail('EMP001')).toBe(false);
        expect(isEmail('12345')).toBe(false);
        expect(isEmail('')).toBe(false);
        expect(isEmail('foo@bar')).toBe(false); // TLD-гүй
    });
    it('зөв имэйлийг таньна', () => {
        expect(isEmail('a@b.mn')).toBe(true);
        expect(isEmail('  khan@gmail.com  ')).toBe(true); // trim
    });
});

describe('normalizeIdentifier', () => {
    it('хоосон/зайг null болгоно', () => {
        expect(normalizeIdentifier('')).toBeNull();
        expect(normalizeIdentifier('   ')).toBeNull();
        expect(normalizeIdentifier(undefined as unknown as string)).toBeNull();
    });
    it('имэйлийг жижиг үсэг болгож ангилна', () => {
        expect(normalizeIdentifier('  KHAN@Gmail.COM ')).toEqual({
            kind: 'email',
            value: 'khan@gmail.com',
        });
    });
    it('кодыг үсгийн том/жижгийг хадгалж тайрна', () => {
        expect(normalizeIdentifier('  EMP-001 ')).toEqual({ kind: 'code', value: 'EMP-001' });
    });
});

describe('maskEmail', () => {
    it('уртад имэйлийг нууна', () => {
        expect(maskEmail('khangai@gmail.com')).toBe('k••••i@gmail.com');
    });
    it('богино local хэсгийг зохицуулна', () => {
        expect(maskEmail('ab@x.mn')).toBe('a•@x.mn');
        expect(maskEmail('a@x.mn')).toBe('a•@x.mn');
    });
    it('@ байхгүй бол бүхлээр нь нууна', () => {
        expect(maskEmail('notanemail')).toBe('•••');
    });
    it('нуумал урт нь дээд тал нь 4 цэг', () => {
        expect(maskEmail('verylonglocalpart@example.com')).toBe('v••••t@example.com');
    });
});

describe('generateOtp', () => {
    it('үргэлж яг OTP_LENGTH оронтой (эхний 0-г хадгална)', () => {
        expect(generateOtp(() => 0)).toBe('000000');
        expect(generateOtp(() => 7)).toBe('000007');
        expect(generateOtp(() => 999999)).toBe('999999');
        expect(generateOtp(() => 42).length).toBe(OTP_LENGTH);
    });
    it('default (crypto) OTP нь 6 цифрийн мөр', () => {
        for (let i = 0; i < 50; i++) {
            const otp = generateOtp();
            expect(otp).toMatch(/^\d{6}$/);
        }
    });
    it('rng-д зөв дээд хязгаар дамжуулна', () => {
        let seen = -1;
        generateOtp((max) => {
            seen = max;
            return 1;
        });
        expect(seen).toBe(1_000_000);
    });
});

describe('generateResetId', () => {
    it('давхардалгүй UUID үүсгэнэ', () => {
        const a = generateResetId();
        const b = generateResetId();
        expect(a).not.toBe(b);
        expect(a).toMatch(/^[0-9a-f-]{36}$/);
    });
});

describe('hashOtp / verifyOtp', () => {
    it('ижил OTP+salt ижил hash өгнө', () => {
        expect(hashOtp('123456', 'salt-x')).toBe(hashOtp('123456', 'salt-x'));
    });
    it('salt өөр бол hash өөр (rainbow table хамгаалалт)', () => {
        expect(hashOtp('123456', 'salt-a')).not.toBe(hashOtp('123456', 'salt-b'));
    });
    it('түүхий OTP-ийг hash дотор ил гаргахгүй', () => {
        expect(hashOtp('123456', 'salt')).not.toContain('123456');
    });
    it('зөв OTP-ийг баталгаажуулна', () => {
        const salt = generateResetId();
        const hash = hashOtp('428913', salt);
        expect(verifyOtp('428913', salt, hash)).toBe(true);
    });
    it('буруу OTP-ийг татгалзана', () => {
        const salt = generateResetId();
        const hash = hashOtp('428913', salt);
        expect(verifyOtp('428914', salt, hash)).toBe(false);
        expect(verifyOtp('', salt, hash)).toBe(false);
    });
    it('буруу salt-аар шалгавал татгалзана', () => {
        const hash = hashOtp('428913', 'salt-a');
        expect(verifyOtp('428913', 'salt-b', hash)).toBe(false);
    });
    it('гажигтай hex hash дээр буруу гэж унахгүйгээр false буцаана', () => {
        expect(verifyOtp('123456', 'salt', 'zzzz')).toBe(false);
        expect(verifyOtp('123456', 'salt', '')).toBe(false);
    });
});

describe('computeExpiry / isExpired', () => {
    it('TTL-ийн дагуу дуусах цаг тооцно', () => {
        expect(computeExpiry(1000, 5000)).toBe(6000);
        expect(computeExpiry(1000)).toBe(1000 + OTP_TTL_MS);
    });
    it('хугацаа дуусахаас өмнө хүчинтэй', () => {
        const exp = computeExpiry(0, 1000);
        expect(isExpired(exp, 999)).toBe(false);
    });
    it('яг дуусах агшинд болон дараа нь хүчингүй', () => {
        const exp = computeExpiry(0, 1000);
        expect(isExpired(exp, 1000)).toBe(true);
        expect(isExpired(exp, 5000)).toBe(true);
    });
});

describe('isLockedOut', () => {
    it('оролдлого хязгаараас доош бол нээлттэй', () => {
        expect(isLockedOut(0)).toBe(false);
        expect(isLockedOut(MAX_VERIFY_ATTEMPTS - 1)).toBe(false);
    });
    it('хязгаарт хүрсэн эсвэл давсан бол түгжинэ', () => {
        expect(isLockedOut(MAX_VERIFY_ATTEMPTS)).toBe(true);
        expect(isLockedOut(MAX_VERIFY_ATTEMPTS + 3)).toBe(true);
    });
});

describe('canResend / resendWaitSeconds', () => {
    it('анхны хүсэлтийг (null) үргэлж зөвшөөрнө', () => {
        expect(canResend(null, 0)).toBe(true);
        expect(canResend(undefined, 12345)).toBe(true);
        expect(resendWaitSeconds(null, 0)).toBe(0);
    });
    it('cooldown дуусаагүй бол татгалзана', () => {
        expect(canResend(1000, 1000 + RESEND_COOLDOWN_MS - 1)).toBe(false);
        expect(resendWaitSeconds(1000, 1000 + RESEND_COOLDOWN_MS - 1000)).toBe(1);
    });
    it('cooldown яг дуусах болон дараа нь зөвшөөрнө', () => {
        expect(canResend(1000, 1000 + RESEND_COOLDOWN_MS)).toBe(true);
        expect(resendWaitSeconds(1000, 1000 + RESEND_COOLDOWN_MS)).toBe(0);
    });
    it('үлдсэн секундийг дээш нь бүхэлчилнэ', () => {
        expect(resendWaitSeconds(0, 500)).toBe(Math.ceil((RESEND_COOLDOWN_MS - 500) / 1000));
    });
});

describe('nextRequestWindow', () => {
    it('анхны хүсэлт шинэ цонх нээж зөвшөөрнө', () => {
        expect(nextRequestWindow(null, null, 5000)).toEqual({
            windowStartMs: 5000,
            count: 1,
            allowed: true,
        });
    });
    it('цонх дотор тоог нэмнэ', () => {
        const r = nextRequestWindow(1000, 2, 1500);
        expect(r.windowStartMs).toBe(1000);
        expect(r.count).toBe(3);
        expect(r.allowed).toBe(true);
    });
    it('дээд хязгаарт хүрэхэд зөвшөөрсөөр, давбал татгалзана', () => {
        const atMax = nextRequestWindow(1000, MAX_REQUESTS_PER_WINDOW - 1, 1500);
        expect(atMax.count).toBe(MAX_REQUESTS_PER_WINDOW);
        expect(atMax.allowed).toBe(true);

        const over = nextRequestWindow(1000, MAX_REQUESTS_PER_WINDOW, 1500);
        expect(over.count).toBe(MAX_REQUESTS_PER_WINDOW + 1);
        expect(over.allowed).toBe(false);
    });
    it('цонх дууссаны дараа тоолол шинээр эхэлнэ', () => {
        const r = nextRequestWindow(1000, MAX_REQUESTS_PER_WINDOW + 5, 1000 + 60 * 60 * 1000);
        expect(r).toEqual({ windowStartMs: 1000 + 60 * 60 * 1000, count: 1, allowed: true });
    });
});

describe('validateNewPassword', () => {
    it('хоосон нууц үгийг татгалзана', () => {
        expect(validateNewPassword('').ok).toBe(false);
        expect(validateNewPassword(undefined as unknown as string).ok).toBe(false);
    });
    it('доод уртаас богиныг татгалзана', () => {
        expect(validateNewPassword('12345').ok).toBe(false);
        expect(validateNewPassword('a'.repeat(MIN_PASSWORD_LENGTH - 1)).ok).toBe(false);
    });
    it('зөвхөн зайнаас бүрдсэнийг татгалзана', () => {
        expect(validateNewPassword('      ').ok).toBe(false);
    });
    it('хэт түгээмэл нууц үгсийг татгалзана (үсгийн ялгаагүй)', () => {
        expect(validateNewPassword('123456').ok).toBe(false);
        expect(validateNewPassword('password').ok).toBe(false);
        expect(validateNewPassword('QWERTY').ok).toBe(false);
        expect(validateNewPassword('Tumen').ok).toBe(false);
    });
    it('хүчинтэй нууц үгийг зөвшөөрнө', () => {
        expect(validateNewPassword('secret1')).toEqual({ ok: true });
        expect(validateNewPassword('a'.repeat(MIN_PASSWORD_LENGTH)).ok).toBe(true);
    });
});

describe('OTP амьдралын мөчлөгийн интеграци (цэвэр логик)', () => {
    it('үүсгэх → hash → баталгаажуулах → хугацаа дуусах', () => {
        const now = 1_000_000;
        const salt = generateResetId();
        const otp = generateOtp(() => 123456);
        const otpHash = hashOtp(otp, salt);
        const expiresAt = computeExpiry(now);

        // Зөв код, хугацаанд нь
        expect(verifyOtp('123456', salt, otpHash)).toBe(true);
        expect(isExpired(expiresAt, now + 60_000)).toBe(false);

        // Хугацаа дууссаны дараа
        expect(isExpired(expiresAt, now + OTP_TTL_MS)).toBe(true);
    });

    it('дараалсан буруу оролдлого хязгаарт хүрч түгжинэ', () => {
        let attempts = 0;
        const salt = generateResetId();
        const otpHash = hashOtp('000111', salt);
        for (let i = 0; i < MAX_VERIFY_ATTEMPTS; i++) {
            expect(isLockedOut(attempts)).toBe(false);
            const ok = verifyOtp('999999', salt, otpHash);
            expect(ok).toBe(false);
            attempts++;
        }
        expect(isLockedOut(attempts)).toBe(true);
    });
});
