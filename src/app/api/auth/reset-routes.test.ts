import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    GENERIC_REQUEST_MESSAGE,
    GENERIC_CONFIRM_ERROR,
    hashOtp,
    computeExpiry,
    MAX_VERIFY_ATTEMPTS,
} from '@/lib/auth/password-reset';

/**
 * request-reset / confirm-reset route-уудын интеграци тест.
 * Firebase Admin SDK-г санах ойн mock-оор орлуулж, аюулгүй байдлын гол
 * зан төлвийг (generic хариу, enumeration хамгаалалт, оролдлого тоолол,
 * хугацаа/түгжээ, нэг удаагийн код) баталгаажуулна.
 */

// ── Санах ойн Firestore/Auth mock ──────────────────────────────────

interface EmployeeSeed {
    uid: string;
    email?: string;
    employeeCode?: string;
    loginDisabled?: boolean;
}

interface ResetDoc {
    uid?: string;
    salt?: string;
    otpHash?: string;
    expiresAt?: number;
    attempts?: number;
    consumed?: boolean;
    lastRequestAt?: number;
    windowStartMs?: number;
    requestCount?: number;
    [k: string]: unknown;
}

const state = {
    employees: [] as EmployeeSeed[],
    resets: new Map<string, ResetDoc>(),
    updatedPasswords: [] as { uid: string; password: string }[],
};

function makeDb() {
    return {
        // Firestore runTransaction-ийн санах ойн загвар (тест дараалсан тул
        // атомик байдлыг Firestore өөрөө хангадаг — энд зөвхөн урсгалыг шалгана).
        async runTransaction<T>(fn: (txn: {
            get: (ref: { get: () => Promise<unknown> }) => Promise<unknown>;
            update: (ref: { update: (p: Record<string, unknown>) => Promise<void> }, patch: Record<string, unknown>) => void;
            set: (ref: { set: (d: ResetDoc, o?: { merge?: boolean }) => Promise<void> }, data: ResetDoc, opts?: { merge?: boolean }) => void;
        }) => Promise<T>): Promise<T> {
            const txn = {
                get: (ref: { get: () => Promise<unknown> }) => ref.get(),
                update: (ref: { update: (p: Record<string, unknown>) => Promise<void> }, patch: Record<string, unknown>) => {
                    void ref.update(patch);
                },
                set: (ref: { set: (d: ResetDoc, o?: { merge?: boolean }) => Promise<void> }, data: ResetDoc, opts?: { merge?: boolean }) => {
                    void ref.set(data, opts);
                },
            };
            return fn(txn);
        },
        collection(name: string) {
            if (name === 'employees') {
                return {
                    where(field: string, op: string, value: unknown) {
                        return {
                            limit() {
                                return {
                                    async get() {
                                        if (op === '!=') {
                                            const docs = state.employees
                                                .filter((e) => (e as unknown as Record<string, unknown>)[field] !== value)
                                                .map((e) => ({ id: e.uid, data: () => e }));
                                            return { empty: docs.length === 0, docs };
                                        }
                                        const docs = state.employees
                                            .filter((e) => (e as unknown as Record<string, unknown>)[field] === value)
                                            .map((e) => ({ id: e.uid, data: () => e }));
                                        return { empty: docs.length === 0, docs };
                                    },
                                };
                            },
                        };
                    },
                };
            }
            // password_resets
            return {
                doc(uid: string) {
                    return {
                        async get() {
                            const d = state.resets.get(uid);
                            return { exists: !!d, data: () => d };
                        },
                        async set(data: ResetDoc, opts?: { merge?: boolean }) {
                            const prev = opts?.merge ? state.resets.get(uid) ?? {} : {};
                            state.resets.set(uid, { ...prev, ...data });
                        },
                        async update(patch: Record<string, unknown>) {
                            const prev = state.resets.get(uid) ?? {};
                            const next = { ...prev } as ResetDoc;
                            for (const [k, v] of Object.entries(patch)) {
                                if (v && typeof v === 'object' && '__inc' in (v as object)) {
                                    next[k] = ((next[k] as number) ?? 0) + (v as { __inc: number }).__inc;
                                } else {
                                    next[k] = v;
                                }
                            }
                            state.resets.set(uid, next);
                        },
                    };
                },
            };
        },
    };
}

const fakeAuth = {
    async updateUser(uid: string, { password }: { password: string }) {
        state.updatedPasswords.push({ uid, password });
    },
};

vi.mock('@/lib/firebase-admin', () => ({
    getFirebaseAdminFirestore: () => makeDb(),
    getFirebaseAdminAuth: () => fakeAuth,
}));

vi.mock('firebase-admin/firestore', () => ({
    FieldValue: {
        serverTimestamp: () => '__ts__',
        increment: (n: number) => ({ __inc: n }),
    },
}));

// ── Тест туслахууд ──────────────────────────────────────────────────

function req(body: unknown) {
    return new Request('http://localhost/api/auth/x', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

async function loadRoutes() {
    const requestMod = await import('./request-reset/route');
    const confirmMod = await import('./confirm-reset/route');
    return { requestReset: requestMod.POST, confirmReset: confirmMod.POST };
}

beforeEach(() => {
    state.employees = [];
    state.resets.clear();
    state.updatedPasswords = [];
    // Имэйл илгээх fetch-ийг mock (route дотор /api/email руу дууддаг).
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({}) })));
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('ALLOW_DEV_OTP', 'true');
});

// ── request-reset ──────────────────────────────────────────────────

describe('POST /api/auth/request-reset', () => {
    it('identifier дутуу бол 400', async () => {
        const { requestReset } = await loadRoutes();
        const res = await requestReset(req({}));
        expect(res.status).toBe(400);
    });

    it('олдохгүй хэрэглэгчид ерөнхий ok (enumeration задлахгүй), код үүсгэхгүй', async () => {
        const { requestReset } = await loadRoutes();
        const res = await requestReset(req({ identifier: 'nobody@x.mn' }));
        const body = await res.json();
        expect(res.status).toBe(200);
        expect(body.ok).toBe(true);
        expect(body.message).toBe(GENERIC_REQUEST_MESSAGE);
        expect(body.devOtp).toBeUndefined();
        expect(state.resets.size).toBe(0);
    });

    it('loginDisabled хэрэглэгчид код үүсгэхгүй, ерөнхий ok', async () => {
        state.employees.push({ uid: 'u1', email: 'a@x.mn', loginDisabled: true });
        const { requestReset } = await loadRoutes();
        const res = await requestReset(req({ identifier: 'a@x.mn' }));
        expect((await res.json()).ok).toBe(true);
        expect(state.resets.size).toBe(0);
    });

    it('жинхэнэ имэйлгүй (синтетик) хэрэглэгчид код үүсгэхгүй', async () => {
        state.employees.push({ uid: 'u2', email: '', employeeCode: 'EMP2' });
        const { requestReset } = await loadRoutes();
        const res = await requestReset(req({ identifier: 'EMP2' }));
        expect((await res.json()).ok).toBe(true);
        expect(state.resets.size).toBe(0);
    });

    it('хүчинтэй хэрэглэгчид OTP-ийн hash хадгалж, түүхий кодыг хадгалахгүй', async () => {
        state.employees.push({ uid: 'u3', email: 'khan@gmail.com', employeeCode: 'EMP3' });
        const { requestReset } = await loadRoutes();
        const res = await requestReset(req({ identifier: 'EMP3' }));
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.devOtp).toMatch(/^\d{6}$/); // dev-д код буцаана

        const stored = state.resets.get('u3')!;
        expect(stored).toBeTruthy();
        expect(stored.consumed).toBe(false);
        expect(stored.attempts).toBe(0);
        // Түүхий OTP хадгалагдаагүй — зөвхөн hash
        expect(JSON.stringify(stored)).not.toContain(body.devOtp);
        expect(stored.otpHash).toBe(hashOtp(body.devOtp, stored.salt!));
        // Имэйл илгээх fetch дуудагдсан
        expect(fetch).toHaveBeenCalledOnce();
    });

    it('production-д devOtp буцаахгүй', async () => {
        vi.stubEnv('NODE_ENV', 'production');
        state.employees.push({ uid: 'u4', email: 'a@x.mn', employeeCode: 'EMP4' });
        const { requestReset } = await loadRoutes();
        const res = await requestReset(req({ identifier: 'EMP4' }));
        const body = await res.json();
        expect(body.ok).toBe(true);
        expect(body.devOtp).toBeUndefined();
    });

    it('cooldown дотор дахин хүсэхэд шинэ код үүсгэхгүй (ерөнхий ok)', async () => {
        state.employees.push({ uid: 'u5', email: 'a@x.mn', employeeCode: 'EMP5' });
        const { requestReset } = await loadRoutes();
        await requestReset(req({ identifier: 'EMP5' }));
        const firstHash = state.resets.get('u5')!.otpHash;
        // Шууд дахин хүсэх
        await requestReset(req({ identifier: 'EMP5' }));
        expect(state.resets.get('u5')!.otpHash).toBe(firstHash); // өөрчлөгдөөгүй
    });

    it('цонхны хязгаараас (5/цаг) хэтэрсэн хүсэлтэд шинэ код үүсгэхгүй', async () => {
        state.employees.push({ uid: 'u6', email: 'a@x.mn', employeeCode: 'EMP6' });
        // cooldown-ыг тойрохын тулд lastRequestAt-ыг хол ард нь, харин цонхыг дүүрсэн болгоно.
        state.resets.set('u6', {
            uid: 'u6',
            otpHash: 'old',
            salt: 'old',
            lastRequestAt: 0, // cooldown аль хэдийн дууссан
            windowStartMs: Date.now(), // цонх идэвхтэй
            requestCount: 5, // хязгаарт хүрсэн (MAX_REQUESTS_PER_WINDOW=5)
            consumed: false,
            attempts: 0,
        });
        const { requestReset } = await loadRoutes();
        const res = await requestReset(req({ identifier: 'EMP6' }));
        expect((await res.json()).ok).toBe(true); // ерөнхий хариу
        expect(state.resets.get('u6')!.otpHash).toBe('old'); // шинэ код үүсээгүй
    });
});

// ── confirm-reset ──────────────────────────────────────────────────

async function seedActiveReset(uid: string, otp: string, over: Partial<ResetDoc> = {}) {
    const salt = 'salt-' + uid;
    state.resets.set(uid, {
        uid,
        salt,
        otpHash: hashOtp(otp, salt),
        expiresAt: computeExpiry(Date.now()),
        attempts: 0,
        consumed: false,
        ...over,
    });
}

describe('POST /api/auth/confirm-reset', () => {
    it('OTP дутуу бол ерөнхий алдаа', async () => {
        const { confirmReset } = await loadRoutes();
        const res = await confirmReset(req({ identifier: 'a@x.mn', newPassword: 'secret1' }));
        expect(res.status).toBe(400);
        expect((await res.json()).error).toBe(GENERIC_CONFIRM_ERROR);
    });

    it('нууц үг богино бол тодорхой алдаа (задрал биш)', async () => {
        state.employees.push({ uid: 'u1', email: 'a@x.mn' });
        await seedActiveReset('u1', '111111');
        const { confirmReset } = await loadRoutes();
        const res = await confirmReset(
            req({ identifier: 'a@x.mn', otp: '111111', newPassword: '123' }),
        );
        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain('6 тэмдэгт');
        expect(state.updatedPasswords).toHaveLength(0);
    });

    it('зөв OTP → нууц үг солино, кодыг нэг удаагийнх болгоно', async () => {
        state.employees.push({ uid: 'u1', email: 'a@x.mn' });
        await seedActiveReset('u1', '424242');
        const { confirmReset } = await loadRoutes();
        const res = await confirmReset(
            req({ identifier: 'a@x.mn', otp: '424242', newPassword: 'newpass1' }),
        );
        expect(res.status).toBe(200);
        expect((await res.json()).ok).toBe(true);
        expect(state.updatedPasswords).toEqual([{ uid: 'u1', password: 'newpass1' }]);
        expect(state.resets.get('u1')!.consumed).toBe(true);
    });

    it('буруу OTP → оролдлого нэмэгдэж, ерөнхий алдаа, нууц үг солихгүй', async () => {
        state.employees.push({ uid: 'u1', email: 'a@x.mn' });
        await seedActiveReset('u1', '424242');
        const { confirmReset } = await loadRoutes();
        const res = await confirmReset(
            req({ identifier: 'a@x.mn', otp: '000000', newPassword: 'newpass1' }),
        );
        expect((await res.json()).error).toBe(GENERIC_CONFIRM_ERROR);
        expect(state.resets.get('u1')!.attempts).toBe(1);
        expect(state.updatedPasswords).toHaveLength(0);
    });

    it('оролдлого хязгаарт хүрсэн код хүчингүй (зөв код ч ажиллахгүй)', async () => {
        state.employees.push({ uid: 'u1', email: 'a@x.mn' });
        await seedActiveReset('u1', '424242', { attempts: MAX_VERIFY_ATTEMPTS });
        const { confirmReset } = await loadRoutes();
        const res = await confirmReset(
            req({ identifier: 'a@x.mn', otp: '424242', newPassword: 'newpass1' }),
        );
        expect((await res.json()).error).toBe(GENERIC_CONFIRM_ERROR);
        expect(state.updatedPasswords).toHaveLength(0);
    });

    it('хугацаа дууссан код ажиллахгүй', async () => {
        state.employees.push({ uid: 'u1', email: 'a@x.mn' });
        await seedActiveReset('u1', '424242', { expiresAt: Date.now() - 1000 });
        const { confirmReset } = await loadRoutes();
        const res = await confirmReset(
            req({ identifier: 'a@x.mn', otp: '424242', newPassword: 'newpass1' }),
        );
        expect((await res.json()).error).toBe(GENERIC_CONFIRM_ERROR);
        expect(state.updatedPasswords).toHaveLength(0);
    });

    it('аль хэдийн ашигласан код дахин ажиллахгүй', async () => {
        state.employees.push({ uid: 'u1', email: 'a@x.mn' });
        await seedActiveReset('u1', '424242', { consumed: true });
        const { confirmReset } = await loadRoutes();
        const res = await confirmReset(
            req({ identifier: 'a@x.mn', otp: '424242', newPassword: 'newpass1' }),
        );
        expect((await res.json()).error).toBe(GENERIC_CONFIRM_ERROR);
        expect(state.updatedPasswords).toHaveLength(0);
    });

    it('reset бичлэггүй хэрэглэгч (код аваагүй) → ерөнхий алдаа', async () => {
        state.employees.push({ uid: 'u1', email: 'a@x.mn' });
        const { confirmReset } = await loadRoutes();
        const res = await confirmReset(
            req({ identifier: 'a@x.mn', otp: '424242', newPassword: 'newpass1' }),
        );
        expect((await res.json()).error).toBe(GENERIC_CONFIRM_ERROR);
    });

    it('хүсэлтийн дараа loginDisabled болсон account сэргээж чадахгүй (TOCTOU)', async () => {
        state.employees.push({ uid: 'u1', email: 'a@x.mn', loginDisabled: true });
        await seedActiveReset('u1', '424242'); // хүчинтэй код байсан ч
        const { confirmReset } = await loadRoutes();
        const res = await confirmReset(
            req({ identifier: 'a@x.mn', otp: '424242', newPassword: 'newpass1' }),
        );
        expect((await res.json()).error).toBe(GENERIC_CONFIRM_ERROR);
        expect(state.updatedPasswords).toHaveLength(0);
    });

    it('хэт түгээмэл нууц үгийг татгалзана ("123456")', async () => {
        state.employees.push({ uid: 'u1', email: 'a@x.mn' });
        await seedActiveReset('u1', '424242');
        const { confirmReset } = await loadRoutes();
        const res = await confirmReset(
            req({ identifier: 'a@x.mn', otp: '424242', newPassword: '123456' }),
        );
        expect(res.status).toBe(400);
        expect((await res.json()).error).toContain('түгээмэл');
        expect(state.updatedPasswords).toHaveLength(0);
    });
});
