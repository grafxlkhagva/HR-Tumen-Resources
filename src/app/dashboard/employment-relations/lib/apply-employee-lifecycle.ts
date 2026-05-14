/**
 * apply-employee-lifecycle.ts
 *
 * ER actionId-ийн дагуу ажилтны lifecycle (status, position, loginDisabled,
 * Firebase Auth enable/disable, side-effects) шинэчилнэ.
 *
 * Extracted from `hooks/use-er-final-flow.ts` so it can be reused by:
 *   • `handleFinalApprove` — REVIEWED → SIGNED дээр дуудагдана
 *   • `handleInstantApprove` — DRAFT → ACKNOWLEDGED дээр дуудагдана
 *   • Create page-ийн `handleCreateAndInstantApply` — шууд үүсгээд хэрэгжүүлэх
 *
 * Зан өөрчлөгдөөгүй — зөвхөн reference-ээр нь задлав.
 */
'use client';

import {
    Timestamp,
    updateDoc,
    getDoc,
    Firestore,
    DocumentReference,
} from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { Employee, EmployeeStatus } from '@/types';
import { canTransition, isTerminalStatus } from '@/lib/employee-status-machine';
import { isTemporaryReleaseAction } from '@/lib/services/employee-release-service';
import { setEmployeeAuthDisabled } from '@/lib/services/employee-auth-service';
import { cleanupEmployeeSideEffects } from '@/lib/services/employee-side-effects';
import { captureERError } from './sentry-capture';

interface LifecycleParams {
    actionId: string;
    employeeId?: string;
    customInputs?: Record<string, unknown>;
    tDoc: (col: string, ...segs: string[]) => DocumentReference;
    firestore: Firestore;
    /** Caller-ийн auth instance — disable-auth API дуудахад id token авна */
    auth?: Auth;
    /** Side effects cleanup-д ашиглах tenant path */
    companyPath?: string | null;
}

export async function applyEmployeeLifecycle({
    actionId,
    employeeId,
    customInputs,
    tDoc,
    firestore,
    auth,
    companyPath,
}: LifecycleParams): Promise<void> {
    if (!employeeId || !actionId) return;

    // Idempotency guard — ажилтны одоогийн статусыг уншаад аль хэдийн эцсийн төлөвт
    // байгаа эсэхийг шалгана. terminated бол no-op (дахин бичихгүй).
    const empRef = tDoc('employees', employeeId);
    const empSnap = await getDoc(empRef);
    if (!empSnap.exists()) {
        throw new Error(`Ажилтан олдсонгүй: ${employeeId}`);
    }
    const currentStatus = (empSnap.data() as Employee).status as EmployeeStatus | undefined;
    const currentLifecycleStage = (empSnap.data() as Employee).lifecycleStage;

    if (actionId.startsWith('release_')) {
        // Аль хэдийн terminated бол skip (idempotent)
        if (isTerminalStatus(currentStatus)) {
            console.info('[applyEmployeeLifecycle] Employee already terminated, skip.');
            return;
        }

        const ci = (customInputs || {}) as Record<string, string>;
        const terminationDate =
            (typeof ci.releaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ci.releaseDate)
                ? ci.releaseDate
                : null) ||
            (typeof ci['Ажлаас чөлөөлөх огноо'] === 'string' &&
                /^\d{4}-\d{2}-\d{2}$/.test(ci['Ажлаас чөлөөлөх огноо'])
                ? ci['Ажлаас чөлөөлөх огноо']
                : null);

        const targetStatus: EmployeeStatus =
            isTemporaryReleaseAction(actionId) ? 'on_leave' : 'terminated';

        // Transition guard — employee-status-machine ашиглан шилжилтийг шалгана.
        if (currentStatus && !canTransition(currentStatus, targetStatus)) {
            throw new Error(
                `Invalid transition on release lifecycle: "${currentStatus}" → "${targetStatus}"`,
            );
        }

        if (targetStatus === 'on_leave') {
            await updateDoc(empRef, {
                status: 'on_leave',
                updatedAt: Timestamp.now(),
            });
        } else {
            // terminated руу шилжиж байгаа үед terminationDate-ийг заавал тавина.
            // customInputs-оос авч чадахгүй бол одоогийн огноог fallback болгоно.
            // Lifecycle stage-ийг автоматаар `alumni` руу шилжүүлнэ.
            const empRole = (empSnap.data() as any).role as string | undefined;
            const canDisableLogin = empRole !== 'super_admin' && empRole !== 'company_super_admin';
            await updateDoc(empRef, {
                status: 'terminated',
                terminationDate: terminationDate || new Date().toISOString(),
                ...(canDisableLogin ? { loginDisabled: true } : {}),
                lifecycleStage: 'alumni',
                previousLifecycleStage: currentLifecycleStage ?? null,
                updatedAt: Timestamp.now(),
            });

            // Firebase Auth account-ыг disable хийх (Admin SDK API).
            if (auth) {
                const releaseCompanyId = companyPath ? companyPath.split('/')[1] : undefined;
                try {
                    await setEmployeeAuthDisabled(auth, employeeId, true, releaseCompanyId);
                } catch (authErr) {
                    console.warn(
                        '[applyEmployeeLifecycle] Auth disable failed (Firestore flag set):',
                        authErr,
                    );
                    captureERError(authErr, {
                        flow: 'lifecycle-auth-disable',
                        employeeId,
                        actionId,
                        extra: { phase: 'release-auth-disable' },
                        severity: 'warning',
                    });
                }
            } else {
                console.warn(
                    '[applyEmployeeLifecycle] auth instance байхгүй тул Auth disable алгасав.',
                );
            }

            // Side effects cleanup — department head, pending vacation, onboarding projects.
            if (companyPath !== undefined) {
                try {
                    const sideEffects = await cleanupEmployeeSideEffects({
                        firestore,
                        companyPath,
                        employeeId,
                    });
                    if (sideEffects.errors.length > 0) {
                        console.warn(
                            '[applyEmployeeLifecycle] Side effects errors:',
                            sideEffects.errors,
                        );
                        captureERError(
                            new Error('Side effects partial failure'),
                            {
                                flow: 'lifecycle-side-effects',
                                employeeId,
                                actionId,
                                extra: { errors: sideEffects.errors },
                                severity: 'warning',
                            },
                        );
                    }
                } catch (sideErr) {
                    console.warn(
                        '[applyEmployeeLifecycle] Side effects cleanup failed:',
                        sideErr,
                    );
                    captureERError(sideErr, {
                        flow: 'lifecycle-side-effects',
                        employeeId,
                        actionId,
                        severity: 'warning',
                    });
                }
            }
        }
        return;
    }

    if (actionId.startsWith('appointment_')) {
        const appointmentStatus: EmployeeStatus =
            actionId === 'appointment_probation' ? 'active_probation' : 'active_permanent';

        // Appointment үед ч terminated төлвийг скип хийнэ.
        if (isTerminalStatus(currentStatus)) {
            console.info('[applyEmployeeLifecycle] Cannot appoint terminated employee.');
            return;
        }
        // Idempotency guard — аль хэдийн зорилтот appointment төлөвт байгаа бол
        // дахин lifecycle apply хийхгүй.
        if (currentStatus === appointmentStatus) {
            console.info(
                '[applyEmployeeLifecycle] Employee already in target appointment status, skip.',
            );
            return;
        }
        if (currentStatus && !canTransition(currentStatus, appointmentStatus)) {
            throw new Error(
                `Invalid transition on appointment lifecycle: "${currentStatus}" → "${appointmentStatus}"`,
            );
        }
        const empDataSnap = empSnap.data() as Employee;
        const wasLoginDisabled = !!empDataSnap.loginDisabled;

        await updateDoc(empRef, {
            status: appointmentStatus,
            lifecycleStage: 'onboarding',
            previousLifecycleStage: currentLifecycleStage ?? null,
            loginDisabled: false,
            terminationDate: null,
            updatedAt: Timestamp.now(),
        });

        // Firebase Auth re-enable — release disable-тай симметри.
        if (auth && wasLoginDisabled) {
            const appointCompanyId = companyPath ? companyPath.split('/')[1] : undefined;
            try {
                await setEmployeeAuthDisabled(auth, employeeId, false, appointCompanyId);
            } catch (authErr) {
                console.warn(
                    '[applyEmployeeLifecycle] Auth re-enable failed (Firestore flag cleared):',
                    authErr,
                );
                captureERError(authErr, {
                    flow: 'lifecycle-auth-enable',
                    employeeId,
                    actionId,
                    extra: { phase: 'rehire-auth-enable' },
                    severity: 'warning',
                });
            }
        }
    }
}
