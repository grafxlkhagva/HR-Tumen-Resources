/**
 * tenant-helpers.ts — Single-tenant compatibility shim.
 *
 * Туршилгын многоп-tenant SaaS төслөөс хуулсан код нь `tenantCollection`,
 * `tenantDoc`, `tenantQuery`, `tenantEmployeeSubdoc` гэх helper-уудаар
 * `companies/{companyId}/...` доорх collection-уудад хандадаг. Production манай
 * систем нэг байгууллагын дотоод систем тул бүх collection нь flat top-level
 * дээр байна — `companyPath`-ийг агнор-ласан `collection()/doc()`-руу шилжүүлнэ.
 */

import {
    collection,
    doc,
    query,
    CollectionReference,
    DocumentReference,
    Firestore,
    QueryConstraint,
} from 'firebase/firestore';

export function tenantCollection(
    firestore: Firestore,
    _companyPath: string | null | undefined,
    name: string,
): CollectionReference {
    return collection(firestore, name);
}

export function tenantDoc(
    firestore: Firestore,
    _companyPath: string | null | undefined,
    collectionName: string,
    docId: string,
): DocumentReference {
    return doc(firestore, collectionName, docId);
}

export function tenantEmployeeSubdoc(
    firestore: Firestore,
    _companyPath: string | null | undefined,
    employeeId: string,
    ...pathSegments: string[]
): DocumentReference | null {
    if (!employeeId || pathSegments.length === 0) return null;
    return doc(firestore, 'employees', employeeId, ...pathSegments);
}

export function tenantQuery(
    firestore: Firestore,
    companyPath: string | null,
    name: string,
    ...constraints: QueryConstraint[]
) {
    const colRef = tenantCollection(firestore, companyPath, name);
    return constraints.length > 0 ? query(colRef, ...constraints) : colRef;
}

export function isTenantScoped(_collectionName: string): boolean {
    // Single-tenant — no tenant scoping
    return false;
}
