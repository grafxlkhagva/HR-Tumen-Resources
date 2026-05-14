'use client';

/**
 * use-er-rbac-matrix.ts — ER RBAC matrix-ийг Firestore-аас fetch хийж,
 * байхгүй бол DEFAULT_ER_MATRIX fallback-ийг буцаана.
 *
 * Phase 4 P4-E: `companies/{companyId}/rbac_matrix/er` doc-оос one-time getDoc.
 * Realtime onSnapshot биш — nav change / page reload дээр шинэчлэгдэнэ.
 */

import { useFetchDoc, useMemoFirebase, tenantDoc } from '@/firebase';
import type { ERRbacMatrix } from '../lib/rbac-matrix';
import { DEFAULT_ER_MATRIX } from '../lib/rbac-matrix';

export interface UseERRbacMatrixResult {
    /** Одоогийн идэвхтэй matrix — always non-null (DEFAULT fallback). */
    matrix: ERRbacMatrix;
    /** Firestore fetch дуусаагүй үед true. */
    isLoading: boolean;
    /** Firestore дээр custom matrix doc байгаа эсэх (admin тохируулсан). */
    isCustom: boolean;
}

export function useERRbacMatrix(): UseERRbacMatrixResult {
    const ref = useMemoFirebase(
        ({ firestore, companyPath }) =>
            firestore && companyPath
                ? tenantDoc(firestore, companyPath, 'rbac_matrix', 'er')
                : null,
        [],
    );

    const { data, isLoading } = useFetchDoc<ERRbacMatrix>(ref);

    return {
        matrix: data ?? DEFAULT_ER_MATRIX,
        isLoading,
        isCustom: !!data,
    };
}
