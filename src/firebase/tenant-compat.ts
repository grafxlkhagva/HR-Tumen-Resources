'use client';

/**
 * Single-tenant compatibility shims for code ported from the multi-tenant SaaS
 * test project ("Туршилга/nege system/..."). Production manai sistem нь нэг
 * байгууллагын дотоод систем тул tenant-aware path-уудыг flat collection-руу
 * mapping хийнэ.
 *
 * Зорилго: тестийн файлуудыг import-ыг л солих замаар production-руу шилжүүлэх.
 */
import * as React from 'react';
import {
    type CollectionReference,
    type DocumentReference,
    type Firestore,
    collection,
    doc,
} from 'firebase/firestore';
import { useFirebase } from './provider';
import { useCollection } from './firestore/use-collection';
import { useDoc } from './firestore/use-doc';

/** Тестийн файлд `useFetchDoc` гэж дуудагдсан → production-ийн `useDoc`-той ижил. */
export const useFetchDoc = useDoc;

/** Тестийн файлд `useFetchCollection` гэж дуудагдсан → production-ийн `useCollection`-той ижил. */
export const useFetchCollection = useCollection;

/** Single-tenant — companyPath тогтмол. Тестийн код null check хийдэг тул string биш undefined биш. */
export const SINGLE_TENANT_PATH = 'single-tenant';

/**
 * tenantCollection(firestore, companyPath, name) → flat `collection(firestore, name)`.
 * companyPath аргумент нь ашиглагдахгүй (single-tenant).
 */
export function tenantCollection(
    firestore: Firestore,
    _companyPath: string | null | undefined,
    name: string,
): CollectionReference {
    return collection(firestore, name);
}

/**
 * tenantDoc(firestore, companyPath, col, id) → flat `doc(firestore, col, id)`.
 */
export function tenantDoc(
    firestore: Firestore,
    _companyPath: string | null | undefined,
    col: string,
    id: string,
): DocumentReference {
    return doc(firestore, col, id);
}

/**
 * Hook нь tCollection/tDoc хэрэглэгчдэд тэдгээрийг helper болгож буцаана.
 * Тестийн файл:
 *   const { tCollection, tDoc, companyPath } = useTenantWrite();
 *   tCollection('official_letters')        // → collection(firestore, 'official_letters')
 *   tDoc('official_letters', id)           // → doc(firestore, 'official_letters', id)
 */
export function useTenantWrite() {
    const { firestore } = useFirebase();

    const tCollection = React.useCallback(
        (name: string): CollectionReference => {
            if (!firestore) {
                throw new Error('Firestore not initialized');
            }
            return collection(firestore, name);
        },
        [firestore],
    );

    const tDoc = React.useCallback(
        (col: string, id: string): DocumentReference => {
            if (!firestore) {
                throw new Error('Firestore not initialized');
            }
            return doc(firestore, col, id);
        },
        [firestore],
    );

    return {
        tCollection,
        tDoc,
        companyPath: SINGLE_TENANT_PATH,
    };
}
