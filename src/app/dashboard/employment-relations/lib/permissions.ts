/**
 * permissions.ts — ER модулийн role-based access control single source of truth.
 *
 * Phase 3 (defense-in-depth): client + server hot-path-уудаас ижил role list-ийг
 * хэрэглэхийн тулд helper-ийг тусад нь гаргав.
 *
 * Phase 4 P4-E: `TenantRole` union-г canonical source болгож type-safe болгов.
 * `canManageER` нь DEPRECATED fallback — шинэ code нь `hasERPermission` (rbac-matrix.ts)
 * ашиглах ёстой. Server-side route-д matrix fetch хийж чадахгүй тохиолдолд л
 * canManageER fallback ашиглана.
 */

import type { TenantRole } from '@/types/company';

const HR_MANAGER_ROLES: ReadonlySet<TenantRole> = new Set<TenantRole>([
    'company_super_admin',
    'admin',
    'hr',
    'hr_manager',
    'director',
]);

/**
 * Тухайн role-тэй хэрэглэгч ER модулийн write үйлдлүүдийг хийх боломжтой эсэхийг
 * буцаана. Hardcoded role list нь firestore.rules-ийн `canManageHrEmployees`
 * function-тэй ижил утгатай байх ёстой.
 */
export function canManageER(role: string | undefined | null): boolean {
    return HR_MANAGER_ROLES.has(String(role || '').toLowerCase() as TenantRole);
}

/**
 * Server-side route-уудад throw-based check-ийг илүүд үздэг тохиолдолд.
 */
export function assertCanManageER(role: string | undefined | null): void {
    if (!canManageER(role)) {
        throw new Error('PERMISSION_DENIED: Энэ үйлдлийг гүйцэтгэх эрх алга');
    }
}
