/**
 * Код олгогч — tms_settings/global counter-ууд (Admin SDK transaction).
 *
 * Web клиент transportCode*-ийг runTransaction-оор нэмэгдүүлдэг
 * (create-transport-dialog.tsx) — Admin SDK нь ижил doc дээр transaction
 * хийхэд аюулгүй. Marketplace-д тусдаа marketplaceCode* талбар хэрэглэснээр
 * хоёр урсгал хоорондоо огт мөргөлдөхгүй.
 */

import 'server-only';

import { getFirebaseAdminFirestore } from '@/lib/firebase-admin';
import type { Transaction } from 'firebase-admin/firestore';

const SETTINGS_PATH = 'tms_settings/global';

interface CounterSpec {
    prefixField: string;
    paddingField: string;
    currentField: string;
    defaultPrefix: string;
    defaultPadding: number;
}

const MP_COUNTER: CounterSpec = {
    prefixField: 'marketplaceCodePrefix',
    paddingField: 'marketplaceCodePadding',
    currentField: 'marketplaceCodeCurrentNumber',
    defaultPrefix: 'MP',
    defaultPadding: 5,
};

const TR_COUNTER: CounterSpec = {
    prefixField: 'transportCodePrefix',
    paddingField: 'transportCodePadding',
    currentField: 'transportCodeCurrentNumber',
    defaultPrefix: 'TR',
    defaultPadding: 5,
};

/**
 * Transaction ДОТОР дуудна: counter-ийг уншиж, дараагийн кодыг буцаана,
 * counter-ийг +1 болгож бичнэ. Firestore transaction-д бүх унших үйлдэл
 * бичихээс ӨМНӨ байх ёстой тул анхаарч дуудна.
 */
async function nextCodeInTx(tx: Transaction, spec: CounterSpec): Promise<string> {
    const db = getFirebaseAdminFirestore();
    const ref = db.doc(SETTINGS_PATH);
    const snap = await tx.get(ref);
    const data = snap.exists ? snap.data()! : {};

    const prefix = (data[spec.prefixField] as string) || spec.defaultPrefix;
    const padding = (data[spec.paddingField] as number) || spec.defaultPadding;
    const current = (data[spec.currentField] as number) || 0;
    const next = current + 1;

    tx.set(
        ref,
        {
            [spec.prefixField]: prefix,
            [spec.paddingField]: padding,
            [spec.currentField]: next,
        },
        { merge: true },
    );

    return `${prefix}${String(next).padStart(padding, '0')}`;
}

/** Marketplace захиалгын код: MP00001 */
export function nextMarketplaceCode(tx: Transaction): Promise<string> {
    return nextCodeInTx(tx, MP_COUNTER);
}

/** Тээврийн удирдлагын код: TR00042 — TM үүсгэх staff route ашиглана */
export function nextTransportCode(tx: Transaction): Promise<string> {
    return nextCodeInTx(tx, TR_COUNTER);
}
