/**
 * employee-appointment-service.ts
 *
 * Ажилтан томилох логикийн цорын ганц эх сурвалж (single source of truth).
 *
 * `employee-release-service.ts`-тэй ижил pattern-аар бичигдсэн. Энэ файл нь
 * appointment процесстой холбоотой дараах асуудлуудыг шийдэнэ:
 *  1. Idempotency — нэг ажилтан дээр давхар appointment ER document үүсгэхгүй байх
 *  2. State transition guard — employee-status-machine ашиглан хүчинтэй шилжилтийг шалгах
 *  3. Position capacity — headcount-с хэтрүүлэхгүй байх
 *  4. Lifecycle stage mapping — томилогдсон үед onboarding руу шилжүүлэх
 *
 * Dialog, API, lifecycle hook бүгд эндээс функц дуудах ёстой.
 * Appointment-ийн бүрэн flow (batch write, ER document creation etc.) нь одоогоор
 * dialog-д үлдэж байгаа бөгөөд энэ service нь тэдгээрт guard + idempotency check өгнө.
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
    doc,
} from 'firebase/firestore';
import { tenantDoc } from '@/firebase/tenant-helpers';
import type { Employee, EmployeeStatus } from '@/types';
import type { ERDocument } from '@/app/dashboard/employment-relations/types';
import {
    canTransition,
    isTerminalStatus,
    isReleaseInProgressStatus,
} from '@/lib/employee-status-machine';
// Local-use import (aliased to avoid duplicate-export conflict with re-exports below).
import {
    findActiveAppointmentDocuments as _findActiveApptDocs,
    findActiveReleaseDocuments,
} from '@/lib/services/employee-lifecycle-docs';
import { logAudit } from '@/lib/client/audit-client';

// Re-export action id-ууд + lookup helpers (backwards-compatible).
// `export … from` pattern нь webpack duplicate-export алдаанаас зайлсхийнэ.
export {
    APPOINTMENT_ACTION_IDS,
    findActiveAppointmentDocuments,
    hasActiveAppointmentDocument,
} from '@/lib/services/employee-lifecycle-docs';
export type { AppointmentActionId } from '@/lib/services/employee-lifecycle-docs';

// ─── Action ID → status mapping ──────────────────────────────────────────────

/**
 * Appointment action-ы эцсийн (final) employee status-ийг буцаана.
 *
 * - appointment_probation → active_probation
 * - appointment_permanent / appointment_reappoint → active_permanent
 *
 * Unknown action-д default нь active_permanent (safe default).
 */
export function getFinalStatusForAppointmentAction(actionId: string): EmployeeStatus {
    if (actionId === 'appointment_probation') return 'active_probation';
    return 'active_permanent';
}

/**
 * Appointment эхлэх үеийн транзиц (transitional) status — ER doc үүсгэх үед ажилтан
 * `appointing` гэсэн transitional төлөвт орно. SIGNED болмогц final status руу шилжинэ.
 */
export function getTransitionalStatusForAppointmentAction(_actionId: string): EmployeeStatus {
    return 'appointing';
}

// ─── Position capacity helpers ───────────────────────────────────────────────

/**
 * Position-ий capacity (maximum slot)-ийг буцаана.
 *
 * `headcount` field нь шинэ schema — байхгүй бол backwards-compatible байдлаар
 * default `1` болж тооцогдоно (нэг position = нэг слот гэсэн хуучин assumption).
 */
export function getPositionCapacity(position: {
    headcount?: number | null;
}): number {
    const hc = position.headcount;
    return typeof hc === 'number' && hc > 0 ? hc : 1;
}

/**
 * Position-д шинэ ажилтан багтах эсэх — `filled < capacity` шалгалт.
 */
export function hasPositionCapacity(position: {
    filled?: number | null;
    headcount?: number | null;
}): boolean {
    const cap = getPositionCapacity(position);
    const filled = typeof position.filled === 'number' ? position.filled : 0;
    return filled < cap;
}

// ─── Transaction helpers (Layer E4 — shared appoint/assign dialog logic) ────

/**
 * `runTransaction` доторх уншилт + guard-уудын үр дүн.
 *
 * Caller (dialog) нь үлдсэн бичилтүүдийг өөрөө хийнэ — энэ контекст нь зөвхөн
 * read-only snapshot өгнө.
 */
export interface AppointmentTransactionContext {
    posData: { id: string; filled?: number | null; headcount?: number | null; [k: string]: unknown };
    empData: Employee;
    /**
     * Reassignment-ийн үед хуучин position-ыг -1 хийх ref. `null` бол:
     *   - Шинэ position нь хуучинтайгаа ижил
     *   - Эсвэл хуучин position устсан
     */
    oldPositionRef: DocumentReference | null;
    /** Хуучин position-ийн filled count (transaction read-аас). */
    oldPositionFilled: number;
}

/**
 * Appointment transaction-ийн дотор уншилт + status/capacity guard-уудыг
 * хийх shared helper.
 *
 * `appoint-employee-dialog` болон `assign-employee-dialog` хоёр энэ helper-ийг
 * дуудаж кодын давхардлыг арилгана. Reassignment бол хуучин position-ыг автомат
 * уншиж буцаана.
 *
 * Алдаа гарвал тайлбартай Error шиднэ — caller toast-аар харуулна.
 *
 * @throws "Албан тушаал олдсонгүй" | "Ажилтан олдсонгүй" | status reason | "Орон тоо дүүрсэн ..."
 */
export async function readAndGuardAppointmentInTransaction(
    transaction: Transaction,
    employeeRef: DocumentReference,
    positionRef: DocumentReference,
): Promise<AppointmentTransactionContext> {
    const [posSnap, empSnap] = await Promise.all([
        transaction.get(positionRef),
        transaction.get(employeeRef),
    ]);

    if (!posSnap.exists()) {
        throw new Error('Албан тушаал олдсонгүй.');
    }
    if (!empSnap.exists()) {
        throw new Error('Ажилтан олдсонгүй.');
    }

    const posData = { id: posSnap.id, ...(posSnap.data() as Record<string, unknown>) } as
        AppointmentTransactionContext['posData'];
    const empData = empSnap.data() as Employee;

    // Status machine guard
    const statusCheck = canInitiateAppointment(empData.status as EmployeeStatus | undefined);
    if (!statusCheck.allowed) {
        throw new Error(statusCheck.reason || 'Томилгоо хийх боломжгүй төлөв байна.');
    }

    // Capacity guard
    if (!hasPositionCapacity(posData)) {
        throw new Error(
            `Орон тоо дүүрсэн байна (${posData.filled ?? 0}/${getPositionCapacity(posData)}).`,
        );
    }

    // Reassignment — хуучин position-ыг уншиж filled буцаах боломжтой эсэхийг шалгах
    let oldPositionRef: DocumentReference | null = null;
    let oldPositionFilled = 0;
    const empPositionId = (empData as { positionId?: string }).positionId;
    if (empPositionId && empPositionId !== positionRef.id) {
        // positionRef.parent нь positions collection
        oldPositionRef = doc(positionRef.parent, empPositionId);
        const oldPosSnap = await transaction.get(oldPositionRef);
        if (oldPosSnap.exists()) {
            oldPositionFilled = ((oldPosSnap.data() as { filled?: number })?.filled) || 0;
        } else {
            // Хуучин position устсан — skip
            oldPositionRef = null;
        }
    }

    return { posData, empData, oldPositionRef, oldPositionFilled };
}

/**
 * Appointment-ийн position filled count бичилтүүдийг нэг газар хийнэ.
 *
 * - Шинэ position +1 (`increment(1)`)
 * - Хуучин position (reassignment-ийн үед) `Math.max(0, oldFilled - 1)`
 *
 * `readAndGuardAppointmentInTransaction`-ээс ирсэн context-ыг ашиглана.
 */
export function applyAppointmentPositionWrites(
    transaction: Transaction,
    context: AppointmentTransactionContext,
    newPositionRef: DocumentReference,
): void {
    if (context.oldPositionRef) {
        transaction.update(context.oldPositionRef, {
            filled: Math.max(0, context.oldPositionFilled - 1),
            updatedAt: Timestamp.now(),
        });
    }
    transaction.update(newPositionRef, {
        filled: increment(1),
        updatedAt: Timestamp.now(),
    });
}

// ─── Status transition guard ─────────────────────────────────────────────────

/**
 * Ажилтан шинэ appointment эхлүүлэх боломжтой эсэхийг шалгах — release-ийн
 * `canInitiateRelease`-тэй ижил concept.
 *
 * Terminated, releasing, suspended ажилтан томилогдох боломжгүй. Үлдсэн бүх
 * идэвхтэй болон recruitment/on_leave төлвөөс appointment эхлүүлж болно.
 */
export function canInitiateAppointment(status: EmployeeStatus | undefined | null): {
    allowed: boolean;
    reason?: string;
} {
    if (!status) {
        return { allowed: false, reason: 'Ажилтны төлөв тодорхойгүй байна.' };
    }
    if (isTerminalStatus(status)) {
        return { allowed: false, reason: 'Ажилтан аль хэдийн ажлаас гарсан байна.' };
    }
    if (isReleaseInProgressStatus(status)) {
        return {
            allowed: false,
            reason: 'Ажилтан дээр чөлөөлөх үйл явц явагдаж байна. Томилох боломжгүй.',
        };
    }
    if (status === 'suspended') {
        return {
            allowed: false,
            reason: 'Түр түдгэлзүүлсэн ажилтныг эхлээд сэргээнэ үү.',
        };
    }
    // active*, active_recruitment, appointing, on_leave — бүгд томилогдож болно.
    // (`appointing` нь idempotency check дамждаг — active appointment doc байгаа эсэхийг
    // checkAppointmentEligibility шалгана.)
    return { allowed: true };
}

/**
 * Status transition guard (sync). Dialog-д submit хийхэд эцсийн баталгаажуулалт
 * хийхэд ашиглана.
 *
 * @throws Invalid transition бол Error шидэнэ.
 */
export function assertAppointmentTransition(
    from: EmployeeStatus | undefined,
    to: EmployeeStatus,
): void {
    if (!from) {
        throw new Error('Ажилтны одоогийн төлөв тодорхойгүй байна.');
    }
    if (!canTransition(from, to)) {
        throw new Error(
            `Төлвийн шилжилт буруу байна: "${from}" → "${to}". ` +
                `Томилгоо хийх боломжгүй.`,
        );
    }
}

// ─── Eligibility check (main entry) ──────────────────────────────────────────

/**
 * Appointment эхлүүлэх боломжтой эсэхийг шалгах — status + active doc шалгалтыг
 * нэгтгэнэ. Dialog нээгдэхэд call хийх үндсэн функц.
 *
 * Note: Position capacity шалгалт нь positionData-г шаардах тул энд оруулаагүй —
 * caller нь `hasPositionCapacity` helper-ийг тусад нь дуудах ёстой.
 */
export async function checkAppointmentEligibility(params: {
    firestore: Firestore;
    companyPath: string | null;
    employeeId: string;
    employeeStatus: EmployeeStatus | undefined;
}): Promise<
    | { allowed: true }
    | {
          allowed: false;
          reason: string;
          activeAppointmentDoc?: ERDocument;
          activeReleaseDoc?: ERDocument;
      }
> {
    const { firestore, companyPath, employeeId, employeeStatus } = params;

    // 1. Status machine шалгалт
    const statusCheck = canInitiateAppointment(employeeStatus);
    if (!statusCheck.allowed) {
        // Дуусаагүй appointment doc байвал user-д линк харуулахад хэрэгтэй
        const activeDocs = await _findActiveApptDocs(
            firestore,
            companyPath,
            employeeId,
        );
        return {
            allowed: false,
            reason: statusCheck.reason || 'Томилгоо эхлүүлэх боломжгүй.',
            activeAppointmentDoc: activeDocs[0],
        };
    }

    // 2. Cross-workflow guard: дуусаагүй release doc байгаа бол шинэ томилгоо
    //    үүсгэх боломжгүй (offboarding нээлттэй үед onboarding эхлэхгүй).
    const activeReleaseDocs = await findActiveReleaseDocuments(
        firestore,
        companyPath,
        employeeId,
    );
    if (activeReleaseDocs.length > 0) {
        return {
            allowed: false,
            reason:
                'Ажилтан дээр дуусаагүй чөлөөлөх баримт байна. ' +
                'Эхлээд чөлөөлөх баримтыг шийдэж дараа нь томилгоо хийнэ үү.',
            activeReleaseDoc: activeReleaseDocs[0],
        };
    }

    // 3. Idempotency: байгаа appointment doc байгаа эсэх
    const activeDocs = await _findActiveApptDocs(firestore, companyPath, employeeId);
    if (activeDocs.length > 0) {
        return {
            allowed: false,
            reason: 'Ажилтан дээр дуусаагүй томилгооны баримт байна.',
            activeAppointmentDoc: activeDocs[0],
        };
    }

    return { allowed: true };
}

// ─── URL helper ──────────────────────────────────────────────────────────────

/**
 * Appointment ER document-ийн URL үүсгэх helper — banner-д "одоогийн appointment
 * руу очих" линк харуулахад ашиглана.
 */
export function getAppointmentDocumentUrl(docId: string): string {
    return `/dashboard/employment-relations/${docId}`;
}

// ─── Rollback ────────────────────────────────────────────────────────────────

/**
 * ER appointment document устгагдсан / татгалзсан үед employee-ийг өмнөх төлөвт
 * нь сэргээх. previousState snapshot ашигладаг — release-ийн
 * `rollbackReleaseDocument`-тай симметри.
 *
 * Хийх зүйлс:
 *  1. Employee status → previousState.status (transition guard-аар шалгана)
 *  2. positionId, jobTitle, departmentId → previousState-аас сэргээх
 *  3. Шинэ томилогдсон position-ы `filled` -1 (appointment dialog нь +1 хийсэн)
 *  4. appointedCompensation snapshot сэргээх
 *  5. lifecycleStage-ийг буцаах (хэрэв onboarding руу шилжсэн бол)
 *
 * Idempotent — ажилтан аль хэдийн terminated/final state-д бол no-op.
 *
 * @returns rollback хийгдсэн эсэх (false бол no-op)
 */
export async function rollbackAppointmentDocument(params: {
    firestore: Firestore;
    companyPath: string | null;
    document: ERDocument;
}): Promise<{ rolledBack: boolean; reason?: string }> {
    const { firestore, companyPath, document } = params;

    if (!document.employeeId) {
        return { rolledBack: false, reason: 'Document-д employeeId байхгүй.' };
    }
    const actionId = String(
        (document.metadata as Record<string, unknown>)?.actionId || '',
    );
    if (!actionId.startsWith('appointment_')) {
        return { rolledBack: false, reason: 'Appointment бус document.' };
    }
    if (!document.previousState) {
        return { rolledBack: false, reason: 'previousState snapshot байхгүй.' };
    }

    const empRef = tenantDoc(firestore, companyPath, 'employees', document.employeeId);
    const prev = document.previousState;
    const prevStatus = (prev.status as EmployeeStatus | undefined) || undefined;

    // Atomic transaction: read + guard + write
    const result = await runTransaction(firestore, async (txn) => {
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
        if (currentStatus && prevStatus && currentStatus !== prevStatus) {
            if (!canTransition(currentStatus, prevStatus)) {
                return {
                    rolledBack: false as const,
                    reason: `Rollback transition буруу: "${currentStatus}" → "${prevStatus}"`,
                };
            }
        }

        // 1. Employee restore — previousState snapshot-аас
        const employeeUpdate: Record<string, unknown> = {
            ...(prevStatus ? { status: prevStatus } : {}),
            positionId: prev.positionId ?? null,
            jobTitle: prev.jobTitle ?? null,
            departmentId: prev.departmentId ?? null,
            appointedCompensation: prev.appointedCompensation ?? null,
            updatedAt: Timestamp.now(),
        };
        if (prev.lifecycleStage !== undefined) {
            employeeUpdate.lifecycleStage = prev.lifecycleStage;
            employeeUpdate.previousLifecycleStage = null;
        }
        txn.update(empRef, employeeUpdate);

        // 2. Position filled count restore
        const newPositionId = document.positionId;
        if (newPositionId && newPositionId !== prev.positionId) {
            const posRef = tenantDoc(firestore, companyPath, 'positions', newPositionId);
            const posSnap = await txn.get(posRef);
            if (posSnap.exists()) {
                // Phase 5.1 — concurrent write race detection.
                // Appointment transaction `+1` хийхийн ӨМНӨХ filled утга previousState-д
                // хадгалагдсан. Rollback үед одоогийн filled нь `positionFilledBefore + 1`-тэй
                // тэнцүү байх ёстой. Тэнцүү биш бол өөр write concurrent орсон байна —
                // rollback-ийг хийх боловч forensics-д мэдэгдэнэ.
                const currentFilled =
                    typeof (posSnap.data() as Record<string, unknown>).filled === 'number'
                        ? ((posSnap.data() as Record<string, unknown>).filled as number)
                        : 0;
                const expectedFilled =
                    typeof prev.positionFilledBefore === 'number'
                        ? prev.positionFilledBefore + 1
                        : null;
                if (expectedFilled !== null && currentFilled !== expectedFilled) {
                    console.warn(
                        '[rollbackAppointmentDocument] position.filled race detected:',
                        {
                            positionId: newPositionId,
                            expected: expectedFilled,
                            actual: currentFilled,
                            delta: currentFilled - expectedFilled,
                        },
                    );
                }
                txn.update(posRef, {
                    filled: increment(-1),
                    updatedAt: Timestamp.now(),
                });
            }

            if (prev.positionId) {
                const oldPosRef = tenantDoc(firestore, companyPath, 'positions', prev.positionId);
                const oldPosSnap = await txn.get(oldPosRef);
                if (oldPosSnap.exists()) {
                    txn.update(oldPosRef, {
                        filled: increment(1),
                        updatedAt: Timestamp.now(),
                    });
                }
            }
        }

        return { rolledBack: true as const, currentStatus };
    });

    if (!result.rolledBack) {
        return result;
    }

    // Audit log — rollback нь өмнө нь silent явдаг байсан тул нэмж байна.
    // Fire-and-forget: алдаа гарвал rollback-ийг блоклохгүй.
    void logAudit({
        action: 'reject',
        resource: 'er_document',
        resourceId: document.id,
        resourceName: document.documentNumber || `Appointment document ${document.id}`,
        description: `Томилгооны баримтын rollback хийгдлээ: ${document.employeeId}`,
        metadata: {
            kind: 'rollback_appointment',
            actionId,
            employeeId: document.employeeId,
            previousStatus: result.currentStatus,
            restoredStatus: prevStatus,
            documentId: document.id,
        },
    });

    return { rolledBack: true };
}
