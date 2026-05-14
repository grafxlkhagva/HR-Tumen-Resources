/**
 * phone-utils.ts — Утасны дугаар normalize хийх utility.
 *
 * Монгол дугааруудыг E.164 формат руу хөрвүүлнэ.
 * Бүх газар нэг стандартаар хадгалж, query хийхэд ашиглана.
 */

/** Монголын улсын код */
const MN_COUNTRY_CODE = '976';

/**
 * Утасны дугаарыг E.164 формат руу normalize хийнэ.
 *
 * Жишээ:
 *   88001234      → +97688001234
 *   +97688001234  → +97688001234
 *   976 8800 1234 → +97688001234
 *   0088001234    → +97688001234
 *
 * @throws Хүчингүй дугаар бол Error шидэнэ.
 */
export function normalizePhoneNumber(input: string): string {
    // Бүх тоон бус тэмдэгтийг устгах (+ хасалтай)
    const cleaned = input.replace(/[^\d+]/g, '');

    // + тэмдэгтийг зөвхөн эхнээс нь авах
    const plusStripped = cleaned.startsWith('+')
        ? cleaned.slice(1)
        : cleaned;

    // Зөвхөн тоо үлдэх ёстой
    const digits = plusStripped.replace(/\D/g, '');

    let localNumber: string;

    if (digits.startsWith(MN_COUNTRY_CODE) && digits.length >= 11) {
        // +976XXXXXXXX эсвэл 976XXXXXXXX format
        localNumber = digits.slice(MN_COUNTRY_CODE.length);
    } else if (digits.startsWith('00' + MN_COUNTRY_CODE)) {
        // 00976XXXXXXXX international dialing format
        localNumber = digits.slice(2 + MN_COUNTRY_CODE.length);
    } else if (digits.length === 8) {
        // Монгол local number (8 оронтой)
        localNumber = digits;
    } else if (digits.length > 8 && digits.length <= 10 && digits.startsWith('0')) {
        // 0-ээр эхэлсэн local format: 088001234
        localNumber = digits.slice(digits.length - 8);
    } else {
        throw new Error(
            `Хүчингүй утасны дугаар: "${input}". Монгол 8 оронтой дугаар оруулна уу.`,
        );
    }

    // 8 оронтой байх ёстой
    if (localNumber.length !== 8) {
        throw new Error(
            `Хүчингүй утасны дугаар: "${input}". 8 оронтой дугаар шаардлагатай.`,
        );
    }

    // Монгол гар утасны дугаар 8, 9, 7, 6-аар эхэлнэ
    if (!/^[6-9]/.test(localNumber)) {
        throw new Error(
            `Хүчингүй гар утасны дугаар: "${input}". Гар утасны дугаар 6-9-ээр эхлэх ёстой.`,
        );
    }

    return `+${MN_COUNTRY_CODE}${localNumber}`;
}

/**
 * Утасны дугаар хүчинтэй эсэхийг шалгана (normalize хийхгүй, зөвхөн boolean буцаана).
 */
export function isValidMongolianPhone(input: string): boolean {
    try {
        normalizePhoneNumber(input);
        return true;
    } catch {
        return false;
    }
}

/**
 * E.164 дугаарыг хүн уншихад таатай формат руу хөрвүүлнэ.
 * +97688001234 → 8800-1234
 */
export function formatPhoneDisplay(e164: string): string {
    const local = e164.replace(`+${MN_COUNTRY_CODE}`, '');
    if (local.length === 8) {
        return `${local.slice(0, 4)}-${local.slice(4)}`;
    }
    return local;
}
