/**
 * Single-tenant compatibility shim for rate limiting.
 * Production-д бид сан-н түвшний rate-limit-гүй; зөвхөн in-memory simple bucket.
 * Multi-tenant SaaS-аас ирсэн код-ыг тэжээх зорилготой.
 */

export type RateLimitPreset = 'ai' | 'default' | 'write' | 'public';

export interface RateLimitConfig {
    /** Хоног-д хэдэн удаа дуудах боломжтой. */
    limit: number;
    /** Хугацааны цонх (минут). */
    windowMinutes: number;
}

const buckets = new Map<string, { count: number; resetAt: number }>();

const PRESETS: Record<RateLimitPreset, RateLimitConfig> = {
    ai: { limit: 60, windowMinutes: 1 },
    default: { limit: 120, windowMinutes: 1 },
    write: { limit: 30, windowMinutes: 1 },
    public: { limit: 10, windowMinutes: 1 },
};

function resolveConfig(preset: RateLimitPreset | RateLimitConfig): RateLimitConfig {
    if (typeof preset === 'string') return PRESETS[preset];
    return preset;
}

export interface RateLimitResult {
    ok: boolean;
    remaining: number;
    resetAt: number;
}

export function checkRateLimit(
    callerId: string,
    preset: RateLimitPreset | RateLimitConfig,
): RateLimitResult {
    const cfg = resolveConfig(preset);
    const now = Date.now();
    const windowMs = cfg.windowMinutes * 60 * 1000;

    const existing = buckets.get(callerId);
    if (!existing || existing.resetAt < now) {
        buckets.set(callerId, { count: 1, resetAt: now + windowMs });
        return { ok: true, remaining: cfg.limit - 1, resetAt: now + windowMs };
    }

    if (existing.count >= cfg.limit) {
        return { ok: false, remaining: 0, resetAt: existing.resetAt };
    }

    existing.count += 1;
    return { ok: true, remaining: cfg.limit - existing.count, resetAt: existing.resetAt };
}

export function getCallerIdentifier(request: Request | { headers: Headers }): string {
    const headers = request.headers;
    const xff = headers.get('x-forwarded-for');
    if (xff) return xff.split(',')[0].trim();
    const real = headers.get('x-real-ip');
    if (real) return real;
    return 'anonymous';
}
