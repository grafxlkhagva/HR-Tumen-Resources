'use client';

/**
 * use-er-document-delete.ts
 * ─────────────────────────────────────────────────────────────────────
 * ER document устгах flow — release/appointment-ийн employee lifecycle-
 * rollback, audit logging, metric capture, navigation back-тай бүрэн.
 *
 * Phase 4 extraction — `use-er-document-actions.ts`-ийн 200 мөр block-
 * ыг тусгай hook болгов. API болон зан үйл өөрчлөгдөөгүй.
 */

import { useCallback } from 'react';
import { deleteDoc, Firestore, DocumentReference } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import type { ERDocument } from '../types';
import type { ERPermissions } from './use-er-permissions';
import { rollbackReleaseDocument } from '@/lib/services/employee-release-service';
import { rollbackAppointmentDocument } from '@/lib/services/employee-appointment-service';
import { logAudit } from '@/lib/client/audit-client';
import { logERTransition } from '../lib/er-audit';
import { captureERError, captureERMetric } from '../lib/sentry-capture';

interface ToastApi {
    (args: {
        title?: string;
        description?: string | React.ReactNode;
        variant?: 'default' | 'destructive';
    }): void;
}

interface UseERDocumentDeleteParams {
    id: string;
    document: ERDocument;
    firestore: Firestore | null;
    companyPath: string | null;
    auth: Auth | null;
    tDoc: (...path: string[]) => DocumentReference;
    router: AppRouterInstance;
    toast: ToastApi;
    permissions: ERPermissions;
    setIsSaving: (v: boolean) => void;
}

export function useERDocumentDelete({
    id,
    document,
    firestore,
    companyPath,
    auth,
    tDoc,
    router,
    toast,
    permissions,
    setIsSaving,
}: UseERDocumentDeleteParams) {
    const handleDelete = useCallback(async (onDone?: () => void) => {
        if (!firestore) return;
        // Phase 3 RBAC guard + Phase 4 P4-E: owner (DRAFT only) эсвэл delete эрхтэй role.
        const isDraftOnly = document.status === 'DRAFT';
        const allowedOwnerDelete = permissions.isOwner && isDraftOnly;
        if (!(allowedOwnerDelete || permissions.can.delete)) {
            toast({
                variant: 'destructive',
                title: 'Эрх алга',
                description: 'Энэ баримтыг устгах эрх таньд алга.',
            });
            return;
        }
        setIsSaving(true);
        try {
            // Release flow rollback — release_* doc устгагдсан үед employee-ийг
            // өмнөх төлөвт нь сэргээх. SIGNED болсон бол rollbackReleaseDocument
            // дотроос isTerminalStatus check-ээр no-op хийгдэнэ.
            const actionId = String((document.metadata as Record<string, unknown>)?.actionId || '');
            const isReleaseDoc = actionId.startsWith('release_');
            const isAppointmentDoc = actionId.startsWith('appointment_');
            const isPreSignedStatus =
                document.status === 'DRAFT' ||
                document.status === 'IN_REVIEW' ||
                document.status === 'REVIEWED' ||
                document.status === 'APPROVED' ||
                document.status === 'SENT_TO_EMPLOYEE';

            if (isReleaseDoc && isPreSignedStatus) {
                try {
                    const result = await rollbackReleaseDocument({
                        firestore,
                        companyPath,
                        document,
                        auth: auth ?? undefined,
                    });
                    if (result.rolledBack) {
                        // Audit log — release rollback (employee төлвийг сэргээв).
                        if (document?.employeeId) {
                            const employeeName = String(
                                (document.metadata as Record<string, unknown>)?.employeeName || '',
                            ) || 'Ажилтан';
                            logAudit({
                                action: 'reject',
                                resource: 'employee',
                                resourceId: document.employeeId,
                                resourceName: employeeName,
                                description: `Чөлөөлөх процесс цуцлагдаж ажилтан сэргээгдлээ: ${employeeName}`,
                                metadata: {
                                    kind: 'release_rollback',
                                    actionId,
                                    erDocumentId: id,
                                    erDocumentStatus: document.status,
                                    documentNumber: document.documentNumber || null,
                                    restoredStatus: document.previousState?.status || null,
                                },
                            });

                            // Audit log — er_document reject (Phase 3 P3-B).
                            logERTransition('reject', { ...document, id, status: document.status }, {
                                rollback: true,
                                lifecycle: 'release',
                                actionId,
                            });

                            // Phase 4 (P4-B) — rollback counter metric.
                            captureERMetric('er.rollback', 1, {
                                documentId: id,
                                employeeId: document.employeeId,
                                actionId,
                                extra: { lifecycle: 'release', fromStatus: document.status },
                            });
                        }

                        toast({
                            title: 'Ажилтны төлөв сэргээгдлээ',
                            description: 'Чөлөөлөх процесс цуцлагдсан тул ажилтны өмнөх төлөв буцаагдлаа.',
                        });
                    } else if (result.reason) {
                        console.info('[handleDelete] Rollback skipped:', result.reason);
                    }
                } catch (rollbackErr) {
                    console.error('[handleDelete] Rollback failed:', rollbackErr);
                    captureERError(rollbackErr, {
                        flow: 'release-rollback',
                        documentId: id,
                        employeeId: document?.employeeId,
                        actionId,
                        extra: { documentStatus: document.status },
                    });
                    toast({
                        variant: 'destructive',
                        title: 'Анхааруулга: Ажилтны төлвийг сэргээж чадсангүй',
                        description:
                            rollbackErr instanceof Error
                                ? rollbackErr.message
                                : 'Manual үйл ажиллагаа шаардлагатай.',
                    });
                }
            }

            // Appointment flow rollback — appointment_* doc устгагдсан үед ажилтныг
            // өмнөх төлөвт нь сэргээх. previousState snapshot ашиглана.
            // SIGNED болсон бол rollback дотроос isTerminalStatus check-ээр no-op.
            if (isAppointmentDoc && isPreSignedStatus) {
                try {
                    const result = await rollbackAppointmentDocument({
                        firestore,
                        companyPath,
                        document,
                    });
                    if (result.rolledBack) {
                        if (document?.employeeId) {
                            const employeeName = String(
                                (document.metadata as Record<string, unknown>)?.employeeName || '',
                            ) || 'Ажилтан';
                            logAudit({
                                action: 'reject',
                                resource: 'employee',
                                resourceId: document.employeeId,
                                resourceName: employeeName,
                                description: `Томилгооны процесс цуцлагдаж ажилтан сэргээгдлээ: ${employeeName}`,
                                metadata: {
                                    kind: 'appointment_rollback',
                                    actionId,
                                    erDocumentId: id,
                                    erDocumentStatus: document.status,
                                    documentNumber: document.documentNumber || null,
                                    restoredStatus: document.previousState?.status || null,
                                    restoredPositionId: document.previousState?.positionId || null,
                                },
                            });

                            // Audit log — er_document reject (Phase 3 P3-B).
                            logERTransition('reject', { ...document, id, status: document.status }, {
                                rollback: true,
                                lifecycle: 'appointment',
                                actionId,
                            });

                            // Phase 4 (P4-B) — rollback counter metric.
                            captureERMetric('er.rollback', 1, {
                                documentId: id,
                                employeeId: document.employeeId,
                                actionId,
                                extra: { lifecycle: 'appointment', fromStatus: document.status },
                            });
                        }

                        toast({
                            title: 'Ажилтны төлөв сэргээгдлээ',
                            description: 'Томилгооны процесс цуцлагдсан тул ажилтны өмнөх төлөв буцаагдлаа.',
                        });
                    } else if (result.reason) {
                        console.info('[handleDelete] Appointment rollback skipped:', result.reason);
                    }
                } catch (rollbackErr) {
                    console.error('[handleDelete] Appointment rollback failed:', rollbackErr);
                    captureERError(rollbackErr, {
                        flow: 'appointment-rollback',
                        documentId: id,
                        employeeId: document?.employeeId,
                        actionId,
                        extra: { documentStatus: document.status },
                    });
                    toast({
                        variant: 'destructive',
                        title: 'Анхааруулга: Ажилтны төлвийг сэргээж чадсангүй',
                        description:
                            rollbackErr instanceof Error
                                ? rollbackErr.message
                                : 'Manual үйл ажиллагаа шаардлагатай.',
                    });
                }
            }

            await deleteDoc(tDoc('er_documents', id));
            toast({ title: 'Устгагдлаа', description: 'Баримт амжилттай устгагдлаа' });
            router.push('/dashboard/employment-relations');
            onDone?.();
        } catch (err) {
            captureERError(err, {
                flow: 'delete',
                documentId: id,
                employeeId: document?.employeeId,
                extra: { documentStatus: document.status },
            });
            toast({ title: 'Алдаа', description: 'Устгахад алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }, [firestore, id, tDoc, toast, router, setIsSaving, document, companyPath, auth,
        permissions.isOwner, permissions.can.delete]);

    return { handleDelete };
}
