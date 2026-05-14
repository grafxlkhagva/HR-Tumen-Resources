/**
 * employee-side-effects.ts
 *
 * Ажилтан terminated болоход шинэчлэгдэх ёстой бусад collection-ийн side effect-уудыг
 * нэг дор цэвэрлэх service.
 *
 * Зорилго: Release flow эцэст явагдах cleanup-уудыг нэг газарт төвлөрүүлэх. Release
 * dialog, applyEmployeeLifecycle, delete dialog бүгд эндээс дуудна.
 *
 * Цэвэрлэх зүйлс (одоогийн scope):
 *   1. Department head — `departments.managerId == employeeId` → null
 *   2. Pending vacation requests — `vacationRequests.status == PENDING` → CANCELLED
 *   3. Pending onboarding projects — `projects.onboardingEmployeeId == employeeId`
 *      + status DRAFT/ACTIVE → CANCELLED
 *
 * Best-effort: алдаа гарвал хоорондоо тусгаарлагдсан тул нэг алдаа бусдыг блокдохгүй.
 * Үр дүнг буцаагаад caller-д warning toast харуулах боломж олгоно.
 */

import {
    Firestore,
    query,
    where,
    getDocs,
    writeBatch,
    Timestamp,
} from 'firebase/firestore';
import { tenantCollection } from '@/firebase/tenant-helpers';
import { logAudit } from '@/lib/client/audit-client';

export interface SideEffectsResult {
    /** Цэвэрлэгдсэн department-уудын ID + нэр (head нь арилгагдсан) */
    departmentsCleared: { id: string; name?: string }[];
    /** Цуцлагдсан pending vacation request-үүдийн тоо */
    vacationRequestsCancelled: number;
    /** Цуцлагдсан onboarding project-үүдийн тоо */
    onboardingProjectsCancelled: number;
    /** Тус бүр алхамын алдаа (хэрэв байгаа бол) */
    errors: { step: string; message: string }[];
}

/**
 * Employee terminated болсон үед бүх side effect-уудыг цэвэрлэх.
 *
 * @returns Цэвэрлэгдсэн нөөцүүдийн тоог буцаана. Тус бүр алхам нь catch
 *          хийгдсэн тул нэг алдаа бусдыг блокдохгүй.
 */
export async function cleanupEmployeeSideEffects(params: {
    firestore: Firestore;
    companyPath: string | null;
    employeeId: string;
}): Promise<SideEffectsResult> {
    const { firestore, companyPath, employeeId } = params;
    const result: SideEffectsResult = {
        departmentsCleared: [],
        vacationRequestsCancelled: 0,
        onboardingProjectsCancelled: 0,
        errors: [],
    };

    // ── 1. Department head cleanup ──────────────────────────────────────────
    try {
        const deptCol = tenantCollection(firestore, companyPath, 'departments');
        const deptQ = query(deptCol, where('managerId', '==', employeeId));
        const deptSnap = await getDocs(deptQ);

        if (!deptSnap.empty) {
            const batch = writeBatch(firestore);
            deptSnap.forEach((d) => {
                batch.update(d.ref, {
                    managerId: null,
                    managerPositionId: null,
                    updatedAt: Timestamp.now(),
                });
                result.departmentsCleared.push({
                    id: d.id,
                    name: (d.data() as { name?: string }).name,
                });
            });
            await batch.commit();
        }
    } catch (e) {
        result.errors.push({
            step: 'departments',
            message: e instanceof Error ? e.message : 'Unknown error',
        });
    }

    // ── 2. Pending vacation requests cleanup ────────────────────────────────
    // vacationRequests нь employee subcollection: companies/{cid}/employees/{eid}/vacationRequests
    try {
        const vacCol = tenantCollection(
            firestore,
            companyPath,
            `employees/${employeeId}/vacationRequests`,
        );
        const vacQ = query(vacCol, where('status', '==', 'PENDING'));
        const vacSnap = await getDocs(vacQ);

        if (!vacSnap.empty) {
            const batch = writeBatch(firestore);
            vacSnap.forEach((d) => {
                batch.update(d.ref, {
                    status: 'CANCELLED',
                    rejectionReason: 'Ажилтан чөлөөлөгдсөн (автомат цуцлалт)',
                    decisionAt: new Date().toISOString(),
                });
            });
            await batch.commit();
            result.vacationRequestsCancelled = vacSnap.size;
        }
    } catch (e) {
        result.errors.push({
            step: 'vacationRequests',
            message: e instanceof Error ? e.message : 'Unknown error',
        });
    }

    // ── 3. Pending onboarding projects cleanup ──────────────────────────────
    // Ажилтан onboarding шатанд байгаад чөлөөлөгдсөн бол тэдгээр project-үүдийг
    // CANCELLED болгож архивлана. Offboarding project-уудыг ҮЛДЭЭНЭ — тэр нь
    // release flow-ийн нэг хэсэг учраас.
    try {
        const projCol = tenantCollection(firestore, companyPath, 'projects');
        const projQ = query(
            projCol,
            where('onboardingEmployeeId', '==', employeeId),
        );
        const projSnap = await getDocs(projQ);

        const activeStatuses = new Set(['DRAFT', 'ACTIVE', 'PLANNING', 'IN_PROGRESS', 'ON_HOLD']);
        const toCancel = projSnap.docs.filter((d) => {
            const data = d.data() as { status?: string };
            return data.status && activeStatuses.has(data.status);
        });

        if (toCancel.length > 0) {
            const batch = writeBatch(firestore);
            toCancel.forEach((d) => {
                batch.update(d.ref, {
                    status: 'CANCELLED',
                    updatedAt: Timestamp.now(),
                });
            });
            await batch.commit();
            result.onboardingProjectsCancelled = toCancel.length;
        }
    } catch (e) {
        result.errors.push({
            step: 'onboardingProjects',
            message: e instanceof Error ? e.message : 'Unknown error',
        });
    }

    // ── Layer E7: Audit log — side effect cleanup-уудыг тэмдэглэнэ.
    // Best-effort, fire-and-forget. Step тус бүрийн үр дүнг metadata-д бичнэ
    // (юу цэвэрлэгдсэн, юу алдаа болсон).
    try {
        const cleanupCount =
            result.departmentsCleared.length +
            result.vacationRequestsCancelled +
            result.onboardingProjectsCancelled;

        if (cleanupCount > 0 || result.errors.length > 0) {
            void logAudit({
                action: 'update',
                resource: 'employee',
                resourceId: employeeId,
                description:
                    cleanupCount > 0
                        ? `Ажилтны холбоотой бичлэгүүдийг цэвэрлэв (${cleanupCount} зүйл)`
                        : `Side effect цэвэрлэлт амжилтгүй (${result.errors.length} алдаа)`,
                metadata: {
                    kind: 'side_effect_cleanup',
                    departmentsCleared: result.departmentsCleared.length,
                    departmentsClearedIds: result.departmentsCleared.map((d) => d.id),
                    vacationRequestsCancelled: result.vacationRequestsCancelled,
                    onboardingProjectsCancelled: result.onboardingProjectsCancelled,
                    errors: result.errors,
                },
            });
        }
    } catch (auditErr) {
        // logAudit нь дотроо catch хийдэг ч defense-in-depth хийе
        console.warn('[employee-side-effects] audit log failed:', auditErr);
    }

    return result;
}

/**
 * SideEffectsResult-ийг user-friendly toast description болгох helper.
 */
export function formatSideEffectsToast(result: SideEffectsResult): string | null {
    const parts: string[] = [];
    if (result.departmentsCleared.length > 0) {
        const names = result.departmentsCleared
            .map((d) => d.name || d.id)
            .filter(Boolean)
            .join(', ');
        parts.push(`${result.departmentsCleared.length} хэлтсийн дарга арилгагдлаа${names ? ` (${names})` : ''}`);
    }
    if (result.vacationRequestsCancelled > 0) {
        parts.push(`${result.vacationRequestsCancelled} хүлээгдэж буй амралтын хүсэлт цуцлагдлаа`);
    }
    if (result.onboardingProjectsCancelled > 0) {
        parts.push(`${result.onboardingProjectsCancelled} onboarding төсөл цуцлагдлаа`);
    }
    if (parts.length === 0) return null;
    return parts.join('. ') + '.';
}
