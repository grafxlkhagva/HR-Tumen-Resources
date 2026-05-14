/**
 * Монгол тоог үгээр илэрхийлэх (Mongolian number-to-words).
 *
 * ER модулийн баримтад "4,000,000 (дөрвөн сая)" маягаар мөнгөн дүнг үгээр
 * гаргахад ашиглагдана. Монгол хэлний modifier форм (-н дагаварт: "гурван",
 * "дөрвөн", "таван"...) ашиглан бичнэ. Тэг эсвэл буруу оролт үед "тэг" буцаана.
 *
 * Жишээ:
 *  numberToMongolianWords(4_000_000)      → "дөрвөн сая"
 *  numberToMongolianWords(4_250_000)      → "дөрвөн сая хоёр зуун тавин мянга"
 *  numberToMongolianWords(1_234_567_890)  → "нэг тэрбум хоёр зуун гучин дөрвөн сая..."
 *  numberToMongolianWords(0)              → "тэг"
 */

const ONES_MOD = [
    '', 'нэг', 'хоёр', 'гурван', 'дөрвөн', 'таван',
    'зургаан', 'долоон', 'найман', 'есөн',
];

const TENS_MOD = [
    '', 'арван', 'хорин', 'гучин', 'дөчин', 'тавин',
    'жаран', 'далан', 'наян', 'ерэн',
];

/** 0-99 хүрэх дугаарыг modifier форм-оор бичнэ. */
function toTens(n: number): string {
    if (n === 0) return '';
    if (n < 10) return ONES_MOD[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (u === 0) return TENS_MOD[t];
    return `${TENS_MOD[t]} ${ONES_MOD[u]}`;
}

/** 0-999 хүрэх дугаарыг бичнэ. */
function toHundreds(n: number): string {
    if (n === 0) return '';
    const h = Math.floor(n / 100);
    const rest = n % 100;
    const parts: string[] = [];
    if (h > 0) parts.push(`${ONES_MOD[h]} зуун`);
    if (rest > 0) parts.push(toTens(rest));
    return parts.join(' ');
}

/**
 * Тоог Монгол хэлний үгэн хэлбэрт хөрвүүлнэ.
 * Бутархай хэсгийг алгасна (мөнгөний бүхэл дүн-д зориулсан).
 */
export function numberToMongolianWords(value: number | string | null | undefined): string {
    if (value === null || value === undefined) return '';
    const num = typeof value === 'string' ? Number(value.replace(/[\s,]/g, '')) : Number(value);
    if (!Number.isFinite(num)) return '';
    if (num === 0) return 'тэг';
    const isNegative = num < 0;
    const abs = Math.floor(Math.abs(num));

    const billions = Math.floor(abs / 1_000_000_000);
    const millions = Math.floor((abs % 1_000_000_000) / 1_000_000);
    const thousands = Math.floor((abs % 1_000_000) / 1_000);
    const rest = abs % 1_000;

    const parts: string[] = [];
    if (billions > 0) parts.push(`${toHundreds(billions)} тэрбум`);
    if (millions > 0) parts.push(`${toHundreds(millions)} сая`);
    if (thousands > 0) parts.push(`${toHundreds(thousands)} мянга`);
    if (rest > 0) parts.push(toHundreds(rest));

    const text = parts.join(' ').trim();
    return isNegative ? `хасах ${text}` : text;
}

/**
 * Мөнгөн дүнг тоо + хаалтан дотор үгэн хэлбэрээр форматлана.
 *   formatMoneyWithWords(4_000_000)  → "4,000,000 (дөрвөн сая)"
 *   formatMoneyWithWords(0)          → "0"
 *   formatMoneyWithWords(null)       → ""
 */
export function formatMoneyWithWords(value: number | string | null | undefined): string {
    if (value === null || value === undefined || value === '') return '';
    const num = typeof value === 'string' ? Number(value.replace(/[\s,]/g, '')) : Number(value);
    if (!Number.isFinite(num)) return String(value);
    if (num === 0) return '0';
    const formatted = new Intl.NumberFormat('mn-MN').format(num);
    const words = numberToMongolianWords(num);
    return words ? `${formatted} (${words})` : formatted;
}
