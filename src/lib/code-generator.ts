import type { DocumentReference, Firestore } from 'firebase/firestore';
import { runTransaction } from 'firebase/firestore';

export function generateCode(config: { prefix: string; digitCount: number; nextNumber: number }) {
    const { prefix, digitCount, nextNumber } = config;
    const numStr = nextNumber.toString().padStart(digitCount, '0');
    return `${prefix}${numStr}`;
}

/**
 * Transaction дотор дараагийн ажлын байрны кодыг үүсгэж, nextNumber-ийг нэмэгдүүлнэ.
 * Код давтагдахгүй байхын тулд энэ функцийг ашиглана.
 */
export async function generateNextPositionCode(
    firestore: Firestore,
    configRef: DocumentReference
): Promise<string> {
    return runTransaction(firestore, async (transaction) => {
        const configSnap = await transaction.get(configRef);
        const prefix = configSnap.exists() ? (configSnap.data()?.prefix ?? '') : '';
        const digitCount = configSnap.exists() ? (configSnap.data()?.digitCount ?? 4) : 4;
        const nextNumber = configSnap.exists() ? (configSnap.data()?.nextNumber ?? 1) : 1;
        const code = generateCode({ prefix, digitCount, nextNumber });
        if (configSnap.exists()) {
            transaction.update(configRef, { nextNumber: nextNumber + 1 });
        } else {
            transaction.set(configRef, { prefix: '', digitCount: 4, nextNumber: 2 });
        }
        return code;
    });
}
