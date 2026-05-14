/**
 * rbac-matrix.ts — ER модулийн dynamic RBAC permission matrix.
 *
 * Phase 4 P4-E: Firestore `companies/{id}/rbac_matrix/er` doc-д permission ×
 * role грантуудыг хадгалж, admin UI-аас dynamic тохируулдаг болгоно.
 *
 * Энэ файл pure функц + type-уудыг агуулна — React/Firebase dependency-гүй.
 * Client hook (`use-er-rbac-matrix.ts`) болон server route хоёулаа import хийнэ.
 *
 * Firestore-д doc байхгүй үед `DEFAULT_ER_MATRIX` fallback ашиглана.
 * Тиймээс migration script шаардлагагүй — lazy load principle.
 */

import type { TenantRole } from '@/types/company';

// ─── Permission keys ────────────────────────────────────────────────────────

/** 8 canonical ER permission — handler тус бүртэй 1-д-1 map-тай. */
export type ERPermissionKey =
    | 'saveDraft'           // Create/update DRAFT
    | 'sendForReview'       // DRAFT → IN_REVIEW
    | 'approve'             // Reviewer approvalStatus update
    | 'finalApprove'        // REVIEWED → SIGNED (strongest guard)
    | 'delete'              // Delete / rollback
    | 'sendToEmployee'      // SIGNED/APPROVED → SENT_TO_EMPLOYEE
    | 'uploadSignedDoc'     // Signed file upload
    | 'allocateDocNumber';  // /api/next-document-number

export const ER_PERMISSION_KEYS: ERPermissionKey[] = [
    'saveDraft',
    'sendForReview',
    'approve',
    'finalApprove',
    'delete',
    'sendToEmployee',
    'uploadSignedDoc',
    'allocateDocNumber',
];

/** UI дээр checkbox label хэлбэрээр харагдана. */
export const ER_PERMISSION_LABELS: Record<ERPermissionKey, string> = {
    saveDraft: 'Ноорог хадгалах',
    sendForReview: 'Хянах руу илгээх',
    approve: 'Хянагчийн батлалт',
    finalApprove: 'Эцсийн баталгаажилт',
    delete: 'Устгах / цуцлах',
    sendToEmployee: 'Ажилтан руу илгээх',
    uploadSignedDoc: 'Гарын үсэгтэй хувь хавсаргах',
    allocateDocNumber: 'Баримтын дугаар олгох',
};

// ─── Matrix type ────────────────────────────────────────────────────────────

export interface ERRbacMatrix {
    version: 1;
    updatedAt?: unknown; // FirestoreTimestamp — server-side type-аас хамааралгүй
    updatedBy?: string;
    /** Permission → roles that can perform it (ROLE-BASED grant model). */
    permissions: Record<ERPermissionKey, TenantRole[]>;
}

// ─── Default matrix ─────────────────────────────────────────────────────────

/**
 * Defense-in-depth default — Firestore doc байхгүй үед fallback.
 * Phase 3-ийн hardcoded `canManageER` behavior-тай backward-compatible.
 */
export const DEFAULT_ER_MATRIX: ERRbacMatrix = {
    version: 1,
    permissions: {
        saveDraft: ['company_super_admin', 'admin', 'hr_manager', 'hr', 'director', 'manager'],
        sendForReview: ['company_super_admin', 'admin', 'hr_manager', 'hr', 'director', 'manager'],
        approve: ['company_super_admin', 'admin', 'hr_manager', 'hr', 'director', 'manager'],
        finalApprove: ['company_super_admin', 'admin', 'hr_manager', 'director'],
        delete: ['company_super_admin', 'admin', 'hr_manager', 'director'],
        sendToEmployee: ['company_super_admin', 'admin', 'hr_manager', 'hr', 'director'],
        uploadSignedDoc: ['company_super_admin', 'admin', 'hr_manager', 'hr', 'director'],
        allocateDocNumber: ['company_super_admin', 'admin', 'hr_manager', 'hr', 'director'],
    },
};

// ─── Pure permission helpers ────────────────────────────────────────────────

/**
 * Pure check — matrix + role → boolean. Matrix null/undefined үед default-ийг ашиглана.
 * Client болон server-side both ашигладаг тул no Firebase dependency.
 */
export function hasERPermission(
    matrix: ERRbacMatrix | null | undefined,
    permission: ERPermissionKey,
    role: string | undefined | null,
): boolean {
    const m = matrix ?? DEFAULT_ER_MATRIX;
    const grantedRoles = m.permissions[permission] ?? [];
    const normalized = String(role ?? '').toLowerCase() as TenantRole;
    return grantedRoles.includes(normalized);
}

/**
 * Matrix-аас бүх 8 permission-ийн boolean map гаргах helper.
 * Hook-д useMemo дотор дуудаж, нэг дамжуулалтаар бүх flag авна.
 */
export type ERPermissionMap = Record<ERPermissionKey, boolean>;

export function buildERPermissionMap(
    matrix: ERRbacMatrix | null | undefined,
    role: string | undefined | null,
): ERPermissionMap {
    const result = {} as ERPermissionMap;
    for (const key of ER_PERMISSION_KEYS) {
        result[key] = hasERPermission(matrix, key, role);
    }
    return result;
}

// ─── Roles visible in matrix UI ─────────────────────────────────────────────

/**
 * Matrix UI-д харуулах role-уудын жагсаалт.
 * `super_admin` нь cross-tenant тул хасав.
 */
export const MATRIX_VISIBLE_ROLES: TenantRole[] = [
    'company_super_admin',
    'admin',
    'hr_manager',
    'hr',
    'director',
    'manager',
    'employee',
];
