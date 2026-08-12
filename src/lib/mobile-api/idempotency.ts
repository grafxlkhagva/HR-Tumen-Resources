/**
 * Idempotency — Firestore-backed (Vercel-ийн in-memory ажиллахгүй тул).
 *
 * Doc id: `${uid}:${sha256(Idempotency-Key)}` (mp_idempotency collection,
 * rules-д client-д бүрэн хаалттай).
 *
 * Хэрэглээ mutation route дотор:
 *   const idem = await beginIdempotent(request, uid, 'create_order');
 *   if (idem.replay) return NextResponse.json(idem.storedResult, { status: idem.storedStatus });
 *   ... transaction дотор idem.commit(tx, result, status) дуудна ...
 *
 * Transaction-тай нэг atomic бичилт: create() ашигладаг тул давхар гүйцэтгэл
 * (race) үед нэг нь ALREADY_EXISTS-ээр унана — тэр үед replay гэж үзнэ.
 */

import 'server-only';

import { createHash } from 'crypto';
import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import type { Transaction, DocumentReference } from 'firebase-admin/firestore';
import { Timestamp } from 'firebase-admin/firestore';

const COLLECTION = 'mp_idempotency';
/** Бичлэг хадгалагдах хугацаа — Firestore TTL policy expiresAt талбар дээр тохируулна */
const TTL_HOURS = 48;

export interface IdempotencyHandle {
    /** Өмнө нь ижил түлхүүрээр амжилттай гүйцэтгэсэн — хадгалсан хариуг буцаа */
    replay: boolean;
    storedResult: unknown;
    storedStatus: number;
    /** Transaction дотор дуудаж бичлэгийг mutation-тай хамт atomically үүсгэнэ */
    commit: (tx: Transaction, result: unknown, status: number) => void;
    /** Transaction ашиглаагүй энгийн route-д — үр дүнг шууд хадгална */
    commitDirect: (result: unknown, status: number) => Promise<void>;
}

export function idempotencyKeyOf(request: Request): string | null {
    return request.headers.get('idempotency-key');
}

export async function beginIdempotent(
    request: Request,
    uid: string,
    endpoint: string,
): Promise<IdempotencyHandle | null> {
    const rawKey = idempotencyKeyOf(request);
    if (!rawKey) return null; // route өөрөө 400 буцаах эсэхээ шийднэ

    const hash = createHash('sha256').update(rawKey).digest('hex');
    const docId = `${uid}:${hash}`;
    const db = getFirebaseAdminFirestore();
    const ref: DocumentReference = db.collection(COLLECTION).doc(docId);

    const snap = await ref.get();
    if (snap.exists) {
        const data = snap.data()!;
        return {
            replay: true,
            storedResult: data.result ?? { ok: true },
            storedStatus: (data.status as number) ?? 200,
            commit: () => {},
            commitDirect: async () => {},
        };
    }

    const record = (result: unknown, status: number) => ({
        endpoint,
        uid,
        result,
        status,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromMillis(Date.now() + TTL_HOURS * 3600 * 1000),
    });

    return {
        replay: false,
        storedResult: null,
        storedStatus: 0,
        commit: (tx, result, status) => {
            tx.create(ref, record(result, status));
        },
        commitDirect: async (result, status) => {
            await ref.create(record(result, status));
        },
    };
}
