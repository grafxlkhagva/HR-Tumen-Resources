const STRIP = Symbol('strip');

/**
 * Firestore-д хадгалахаасаа өмнө undefined, NaN Date, function зэрэг
 * хадгалах боломжгүй утгуудыг цэвэрлэнэ.
 */
export function sanitizeForFirestore<T extends Record<string, unknown>>(data: T): Partial<T> {
    return sanitizeValue(data) as Partial<T>;
}

function sanitizeValue(value: unknown): unknown {
    if (value === undefined) return STRIP;
    if (value === null) return null;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? STRIP : value;
    }
    if (typeof value === 'function') return STRIP;
    if (Array.isArray(value)) {
        return value
            .map((item) => sanitizeValue(item))
            .filter((item) => item !== STRIP);
    }
    if (value && typeof value === 'object') {
        // Firestore Timestamp объект — шууд буцаана
        if (typeof (value as { toDate?: unknown }).toDate === 'function') return value;
        const entries = Object.entries(value as Record<string, unknown>)
            .map(([key, nestedValue]) => [key, sanitizeValue(nestedValue)] as const)
            .filter(([, nestedValue]) => nestedValue !== STRIP);
        return Object.fromEntries(entries);
    }
    return value;
}
