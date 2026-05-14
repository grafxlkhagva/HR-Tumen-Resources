/**
 * employee-release-service.ts
 *
 * Ажилтан чөлөөлөх логикийн цорын ганц эх сурвалж (single source of truth).
 *
 * Энэ файл нь release процесстой холбоотой дараах асуудлуудыг шийдэнэ:
 *  1. Idempotency — нэг ажилтан дээр давхар release үүсгэхгүй байх
 *  2. State transition guard — employee-status-machine ашиглан хүчинтэй шилжилтийг шалгах
 *  3. Одоо явагдаж буй release document хайх
 *
 * Dialog, API, lifecycle hook бүгд эндээс функц дуудах ёстой.
 * Release-ийн бүрэн flow (batch write, offboarding etc.) нь одоогоор dialog-д үлдэж байгаа
 * бөгөөд энэ service нь тэдгээрт guard + idempotency check өгнө.
 */

import {
    Firestore,
    getDoc,
    writeBatch,
    runTransaction,
    increment,
    Timestamp,
    type Transaction,
    type DocumentReference,
} from 'firebase/firestore';
import { tenantDoc } from '@/firebase/tenant-helpers';
import type { Auth } from 'firebase/auth';
import type { Employee, EmployeeStatus } from '@/types';
import type { ERDocument } from '@/app/dashboard/employment-relations/types';
import {
    canInitiateRelease as canInitiateReleaseByStatus,
    canTransition,
    isTerminalStatus,
} from '@/lib/employee-status-machine';
import { setEmployeeAuthDisabled } from './employee-auth-service';
// Local-use import (aliased to avoid duplicate-export conflict with re-exports below).
import {
    findActiveAppointmentDocuments,
    findActiveReleaseDocuments as _findActiveReleaseDocs,
} from '@/lib/services/employee-lifecycle-docs';
import { logAudit } from '@/lib/client/audit-client';

/**
 * Status machine helper-ийг re-export хийнэ — dialog / transaction-д sync-ээр
 * employee status-аас release эхлүүлэх боломжтой эсэхийг шалгахад ашиглана.
 * Appointment service-ийн `canInitiateAppointment`-тай симметри.
 */
export { canInitiateReleaseByStatus as canInitiateRelease };

// Backwards-compatible direct re-exports — олон файл одоо энэ service-ээс
// импорт хийдэг. `export … from` pattern нь webpack-ын duplicate-export
// алдаанаас зайлсхийнэ.
export {
    RELEASE_ACTION_IDS,
    findActiveReleaseDocuments,
    hasActiveReleaseDocument,
} from '@/lib/services/employee-lifecycle-docs';
export type { ReleaseActionId } from '@/lib/services/employee-lifecycle-docs';

/**
 * Release эхлүүлэх боломжтой эсэхийг шалгах — status + cross-doc + active doc
 * шалгалтуудыг нэгтгэнэ. Dialog нээгдэхэд call хийх үндсэн функц.
 */
export async function checkReleaseEligibility(params: {
    firestore: Firestore;
    companyPath: string | null;
    employeeId: string;
    employeeStatus: EmployeeStatus | undefined;
}): Promise<
    | { allowed: true }
    | {
          allowed: false;
          reason: string;
          activeReleaseDoc?: ERDocument;
          activeAppointmentDoc?: ERDocument;
      }
> {
    const { firestore, companyPath, employeeId, employeeStatus } = params;

    // 1. Status machine шалгалт
    const statusCheck = canInitiateReleaseByStatus(employeeStatus);
    if (!statusCheck.allowed) {
        // Хэрэв releasing статусад байгаа бол active doc олж өгье (user-д линк харуулахад хэрэгтэй)
        const activeDocs = await _findActiveReleaseDocs(firestore, companyPath, employeeId);
        return {
            allowed: false,
            reason: statusCheck.reason || 'Release эхлүүлэх боломжгүй.',
            activeReleaseDoc: activeDocs[0],
        };
    }

    // 2. Cross-workflow guard: дуусаагүй appointment doc байгаа бол release үүсгэх
    //    боломжгүй (onboarding нээлттэй үед offboarding эхлэхгүй).
    const activeAppointmentDocs = await findActiveAppointmentDocuments(
        firestore,
        companyPath,
        employeeId,
    );
    if (activeAppointmentDocs.length > 0) {
        return {
            allowed: false,
            reason:
                'Ажилтан дээр дуусаагүй томилгооны баримт байна. ' +
                'Эхлээд томилгооны баримтыг шийдэж дараа нь чөлөөлнө үү.',
            activeAppointmentDoc: activeAppointmentDocs[0],
        };
    }

    // 3. Idempotency: байгаа release doc байгаа эсэх (хэрэв status "releasing" биш ч байсан
    // гэсэн ч хуучин DRAFT doc үлдэж болзошгүй).
    const activeDocs = await _findActiveReleaseDocs(firestore, companyPath, employeeId);
    if (activeDocs.length > 0) {
        return {
            allowed: false,
            reason: 'Ажилтан дээр дуусаагүй чөлөөлөх баримт байна.',
            activeReleaseDoc: activeDocs[0],
        };
    }

    return { allowed: true };
}

/**
 * Status transition guard (sync). Dialog-д submit хийхэд эцсийн баталгаажуулалт хийхэд ашиглана.
 *
 * @throws Invalid transition бол Error шидэнэ.
 */
export function assertReleaseTransition(
    from: EmployeeStatus | undefined,
    to: EmployeeStatus,
): void {
    if (!from) {
        throw new Error('Ажилтны одоогийн төлөв тодорхойгүй байна.');
    }
    if (!canTransition(from, to)) {
        throw new Error(
            `Төлвийн шилжилт буруу байна: "${from}" → "${to}". ` +
                `Release хийх боломжгүй.`,
        );
    }
}

/**
 * Release ER document-ийн URL үүсгэх helper — banner-д "одоогийн release руу очих"
 * линк харуулахад ашиглана.
 */
export function getReleaseDocumentUrl(docId: string): string {
    return `/dashboard/employment-relations/${docId}`;
}

/**
 * `release_temporary*` бүлгийн action ID эсэхийг шалгах helper.
 * Үүнд: legacy `release_temporary`, түүнчлэн шинэ дэд төрлүүд
 * (`release_temporary_longterm`, `_maternity`, `_childcare`).
 */
export function isTemporaryReleaseAction(actionId: string): boolean {
    return actionId === 'release_temporary' || actionId.startsWith('release_temporary_');
}

/**
 * Release эцэс болж буй action-ы эцсийн (final) төлвийг буцаана.
 *
 * - release_temporary* → on_leave (бүрэн гаралт биш)
 * - release_company / release_employee → terminated
 */
export function getFinalStatusForReleaseAction(actionId: string): EmployeeStatus {
    if (isTemporaryReleaseAction(actionId)) return 'on_leave';
    return 'terminated';
}

/**
 * Release эхлэх үеийн транзиц төлвийг буцаана (ER doc байх үед).
 *
 * - release_temporary* → suspended (түр түдгэлзүүлсэн, signing хүлээнэ)
 * - release_company / release_employee → releasing (чөлөөлөгдөж буй)
 */
export function getTransitionalStatusForReleaseAction(actionId: string): EmployeeStatus {
    if (isTemporaryReleaseAction(actionId)) return 'suspended';
    return 'releasing';
}

// ─── Transaction helpers ─────────────────────────────────────────────────────

/**
 * Release runTransaction-ийн READ + GUARD стэп.
 *
 * Dialog-ийн `runTransaction` дотроос дуудна. Бүх `transaction.get()` write-аас
 * өмнө хийгдэх ёстой Firestore требование-ийг дагана.
 *
 * Алхамууд:
 *  1. Employee + position-ыг параллелаар уншина
 *  2. Employee байхгүй бол алдаа
 *  3. Live status-аас `canInitiateRelease()` шалгалт
 *  4. Idempotency: live status нь зорилтот release status болсон бол алдаа
 *  5. `assertReleaseTransition(live → target)` transition guard
 *
 * @returns liveStatus, empData, posExists — caller дараагийн write-уудад ашиглана
 */
export async function readAndGuardReleaseInTransaction(
    transaction: Transaction,
    employeeRef: DocumentReference,
    positionRef: DocumentReference,
    targetReleaseStatus: EmployeeStatus,
): Promise<{
    empData: Employee;
    liveStatus: EmployeeStatus | undefined;
    posExists: boolean;
}> {
    const [empSnap, posSnap] = await Promise.all([
        transaction.get(employeeRef),
        transaction.get(positionRef),
    ]);

    if (!empSnap.exists()) {
        throw new Error('Ажилтан олдсонгүй.');
    }

    const empData = empSnap.data() as Employee;
    const liveStatus = empData.status as EmployeeStatus | undefined;

    // Status machine guard — stale status-аас хамгаалах
    const statusCheck = canInitiateReleaseByStatus(liveStatus);
    if (!statusCheck.allowed) {
        throw new Error(
            statusCheck.reason || 'Ажилтныг чөлөөлөх боломжгүй төлөвт байна.',
        );
    }

    // Idempotency guard — concurrent submit race-ыг арилгана
    if (liveStatus === targetReleaseStatus) {
        throw new Error(
            'Ажилтан аль хэдийн чөлөөлөх явцад орсон байна. Хуудсыг шинэчилнэ үү.',
        );
    }

    // Transition guard — sync version (assertReleaseTransition)
    assertReleaseTransition(liveStatus, targetReleaseStatus);

    return {
        empData,
        liveStatus,
        posExists: posSnap.exists(),
    };
}

/**
 * Release-ийн position-write стэп. Position байгаа бол `filled` тоог -1 болгоно.
 * Appointment-ийн reassignment pattern-аас ялгаатай — release нь зөвхөн нэг
 * position-ыг бууруулна.
 */
export function applyReleasePositionWrites(
    transaction: Transaction,
    positionRef: DocumentReference,
    posExists: boolean,
): void {
    if (!posExists) return;
    transaction.update(positionRef, {
        filled: increment(-1),
        updatedAt: Timestamp.now(),
    });
}

// ─── Rollback ────────────────────────────────────────────────────────────────

/**
 * ER release document устгагдсан / татгалзсан үед employee-ийг өмнөх төлөвт нь
 * сэргээх. previousState snapshot ашигладаг.
 *
 * Хийх зүйлс:
 *  1. Employee status → previousState.status (transition guard-аар шалгана)
 *  2. positionId, jobTitle, departmentId → previousState-аас сэргээх
 *  3. Position-ийн filled count → +1 (хэрэв position сэргээгдвэл)
 *  4. Firebase Auth re-enable (хэрэв ажилтан terminated гэж бүртгэгдсэн ч rollback хийгдэж байгаа бол)
 *  5. terminationDate / loginDisabled flag-ыг цэвэрлэх
 *
 * Idempotent — terminated ажилтан дээр rollback хийгдэхгүй (release SIGNED болсон гэж үзнэ).
 *
 * @returns rollback хийгдсэн эсэх (false бол no-op)
 */
export async function rollbackReleaseDocument(params: {
    firestore: Firestore;
    companyPath: string | null;
    document: ERDocument;
    auth?: Auth;
}): Promise<{ rolledBack: boolean; reason?: string }> {
    const { firestore, companyPath, document, auth } = params;

    if (!document.employeeId) {
        return { rolledBack: false, reason: 'Document-д employeeId байхгүй.' };
    }
    const actionId = String((document.metadata as Record<string, unknown>)?.actionId || '');
    if (!actionId.startsWith('release_')) {
        return { rolledBack: false, reason: 'Release бус document.' };
    }
    if (!document.previousState) {
        return { rolledBack: false, reason: 'previousState snapshot байхгүй.' };
    }

    const empRef = tenantDoc(firestore, companyPath, 'employees', document.employeeId);
    const prev = document.previousState;
    const prevStatus = (prev.status as EmployeeStatus | undefined) || undefined;

    // Atomic transaction: read + guard + write
    const txnResult = await runTransaction(firestore, async (txn) => {
        const empSnap = await txn.get(empRef);
        if (!empSnap.exists()) {
            return { rolledBack: false as const, reason: 'Ажилтан олдсонгүй.' };
        }
        const empData = empSnap.data() as Employee;
        const currentStatus = empData.status as EmployeeStatus | undefined;

        if (isTerminalStatus(currentStatus)) {
            return { rolledBack: false as const, reason: 'Ажилтан аль хэдийн terminated төлөвт.' };
        }

        // Transition guard
        if (currentStatus && prevStatus && !canTransition(currentStatus, prevStatus)) {
            return {
                rolledBack: false as const,
                reason: `Rollback transition буруу: "${currentStatus}" → "${prevStatus}"`,
            };
        }

        // 1. Employee restore
        txn.update(empRef, {
            ...(prevStatus ? { status: prevStatus } : {}),
            positionId: prev.positionId ?? null,
            jobTitle: prev.jobTitle ?? null,
            departmentId: prev.departmentId ?? null,
            loginDisabled: !!prev.loginDisabled,
            terminationDate: null,
            updatedAt: Timestamp.now(),
        });

        // 2. Position filled count restore
        if (prev.positionId) {
            const posRef = tenantDoc(firestore, companyPath, 'positions', prev.positionId);
            const posSnap = await txn.get(posRef);
            if (posSnap.exists()) {
                txn.update(posRef, {
                    filled: increment(1),
                    updatedAt: Timestamp.now(),
                });
            }
        }

        return { rolledBack: true as const, currentStatus };
    });

    if (!txnResult.rolledBack) {
        return txnResult;
    }

    // 3. Firebase Auth re-enable (transaction-ийн гадна — external API call)
    let authReEnableSucceeded = true;
    if (auth && !prev.loginDisabled) {
        const rollbackCompanyId = companyPath ? companyPath.split('/')[1] : undefined;
        try {
            await setEmployeeAuthDisabled(auth, document.employeeId, false, rollbackCompanyId);
        } catch (authErr) {
            authReEnableSucceeded = false;
            console.warn('[rollbackReleaseDocument] Auth re-enable failed:', authErr);
        }
    }

    // Audit log
    void logAudit({
        action: 'reject',
        resource: 'er_document',
        resourceId: document.id,
        resourceName: document.documentNumber || `Release document ${document.id}`,
        description: `Чөлөөлөх баримтын rollback хийгдлээ: ${document.employeeId}`,
        metadata: {
            kind: 'rollback_release',
            actionId,
            employeeId: document.employeeId,
            previousStatus: txnResult.currentStatus,
            restoredStatus: prevStatus,
            documentId: document.id,
            authReEnableSucceeded,
        },
    });

    return { rolledBack: true };
}
