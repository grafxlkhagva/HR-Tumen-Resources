'use client';

/**
 * use-er-final-flow.ts
 * ─────────────────────────────────────────────────────────────────────
 * ER document эцсийн шатуудын action-уудыг нэгтгэсэн hook:
 *   • handleFinalApprove                         — REVIEWED → SIGNED (employee lifecycle apply)
 *   • handleSendToEmployeeForAcknowledgement    — SIGNED → SENT_TO_EMPLOYEE
 *   • handleFileUpload                           — эх хувь (scan) upload
 *
 * `applyEmployeeLifecycle` helper-ийг `../lib/apply-employee-lifecycle.ts`
 * рүү extract хийж, create page-ийн `handleCreateAndInstantApply`-тай
 * хуваан ашиглаж байна.
 *
 * Phase 4.3 extraction — `use-er-document-actions.ts`-аас хуваав.
 * Зан үйл өөрчлөгдөөгүй.
 */

import { useCallback, useRef } from 'react';
import {
    doc,
    Timestamp,
    updateDoc,
    writeBatch,
    Firestore,
    DocumentReference,
    CollectionReference,
} from 'firebase/firestore';
import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL,
    FirebaseStorage,
} from 'firebase/storage';
import type { Auth } from 'firebase/auth';
import type { ERDocument } from '../types';
import type { ERPermissions } from './use-er-permissions';
import { logAudit } from '@/lib/client/audit-client';
import { logERTransition } from '../lib/er-audit';
import { applyEmployeeLifecycle } from '../lib/apply-employee-lifecycle';
import {
    validateSignedDocFile,
    FileValidationError,
} from '../services/file-upload-validation';
import { captureERError, captureERMetric } from '../lib/sentry-capture';

interface ToastApi {
    (args: {
        title?: string;
        description?: string | React.ReactNode;
        variant?: 'default' | 'destructive';
    }): void;
}

interface UseERFinalFlowParams {
    id: string;
    document: ERDocument;
    firestore: Firestore | null;
    storage: FirebaseStorage | null;
    currentUserId: string | undefined;
    auth: Auth | null;
    companyPath: string | null;
    tDoc: (...path: string[]) => DocumentReference;
    tCollection: (...path: string[]) => CollectionReference;
    toast: ToastApi;
    permissions: ERPermissions;
    setIsSaving: (v: boolean) => void;
    setIsUploading: (v: boolean) => void;
}

export function useERFinalFlow({
    id,
    document,
    firestore,
    storage,
    currentUserId,
    auth,
    companyPath,
    tDoc,
    tCollection,
    toast,
    permissions,
    setIsSaving,
    setIsUploading,
}: UseERFinalFlowParams) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── Final approve (REVIEWED → SIGNED) ────────────────────────────────────
    const handleFinalApprove = useCallback(async () => {
        if (!firestore) return;
        // Phase 3 RBAC guard + Phase 4 P4-E: эцсийн батлалт зөвхөн finalApprove эрхтэй role-д.
        if (!permissions.can.finalApprove) {
            toast({
                variant: 'destructive',
                title: 'Эрх алга',
                description: 'Эцсийн баталгаажуулалт хийх эрх таньд алга.',
            });
            return;
        }

        if (!document.signedDocUrl) {
            toast({
                title: 'Анхааруулга',
                description: 'Баримтыг эцэслэн батлахын тулд эх хувийг (сканнердсан хувилбар) заавал хавсаргасан байх ёстой.',
                variant: 'destructive',
            });
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            batch.update(tDoc('er_documents', id), {
                status: 'SIGNED',
                updatedAt: Timestamp.now(),
            });
            batch.set(doc(tCollection('er_documents', id, 'activity')), {
                type: 'STATUS_CHANGE',
                actorId: currentUserId,
                content: 'Баримт баталгаажлаа (эх хувь хавсаргав)',
                createdAt: Timestamp.now(),
            });
            await batch.commit();

            // Audit log — final-approve (er_document resource) (Phase 3 P3-B).
            // NB: дараагийн lifecycle apply дотроос employee-resource audit (release/
            // appointment finalized) бичигдэнэ — давхар бичилт биш, өөр resource дээр.
            logERTransition('final_approve', { ...document, id, status: 'SIGNED' });

            // Phase 4 (P4-B) — approval latency metric: createdAt → SIGNED.
            // distribution-аар Sentry-д бичигдэнэ; SLA тайланд p50/p95 авна.
            try {
                const createdAt = document.createdAt as { toMillis?: () => number } | undefined;
                if (createdAt && typeof createdAt.toMillis === 'function') {
                    const elapsedMs = Date.now() - createdAt.toMillis();
                    const elapsedHours = elapsedMs / (60 * 60 * 1000);
                    captureERMetric('er.approval_latency', elapsedHours, {
                        documentId: id,
                        employeeId: document.employeeId,
                        actionId: String((document.metadata as Record<string, unknown>)?.actionId || ''),
                        extra: {
                            unit: 'hours',
                            elapsedDays: elapsedHours / 24,
                            documentNumber: document.documentNumber || null,
                        },
                    });
                }
            } catch {
                // metric илгээх алдаа гол flow-ыг блоклохгүй
            }

            // Employee status update — одоо awaited бөгөөд transition guard-тай.
            // Өмнө нь `.catch` дээр fire-and-forget хийдэг байсан бөгөөд race
            // condition үүсгэдэг байсан (signing гүйцэж батлагдаагүй байхад lifecycle
            // дуудагдах). Одоо batch commit дууссаны дараа awaited байдлаар дуудна.
            const lifecycleActionId = String((document.metadata as Record<string, unknown>)?.actionId || '');
            try {
                await applyEmployeeLifecycle({
                    actionId: lifecycleActionId,
                    employeeId: document?.employeeId,
                    customInputs: document?.customInputs,
                    tDoc,
                    firestore,
                    auth: auth ?? undefined,
                    companyPath,
                });

                // Audit log — release flow эцсийн баталгаажилт.
                // Зөвхөн release_* үйлдлүүдэд тэмдэглэнэ (appointment-д тэмдэглэхгүй).
                if (lifecycleActionId.startsWith('release_') && document?.employeeId) {
                    const employeeName = String(
                        (document.metadata as Record<string, unknown>)?.employeeName || '',
                    ) || 'Ажилтан';
                    logAudit({
                        action: 'delete',
                        resource: 'employee',
                        resourceId: document.employeeId,
                        resourceName: employeeName,
                        description: `Чөлөөлөх баримт баталгаажиж ажилтан халагдлаа: ${employeeName}`,
                        metadata: {
                            kind: 'release_finalized',
                            actionId: lifecycleActionId,
                            erDocumentId: id,
                            documentNumber: document.documentNumber || null,
                        },
                    });
                }

                // Audit log — appointment flow эцсийн баталгаажилт.
                // Ажилтан томилогдсон тухай бүртгэл — release-тэй ижил observability.
                if (lifecycleActionId.startsWith('appointment_') && document?.employeeId) {
                    const employeeName = String(
                        (document.metadata as Record<string, unknown>)?.employeeName || '',
                    ) || 'Ажилтан';
                    const appointmentStatus =
                        lifecycleActionId === 'appointment_probation'
                            ? 'active_probation'
                            : 'active_permanent';
                    logAudit({
                        action: 'create',
                        resource: 'employee',
                        resourceId: document.employeeId,
                        resourceName: employeeName,
                        description: `Томилгооны баримт баталгаажиж ажилтан томилогдлоо: ${employeeName}`,
                        metadata: {
                            kind: 'appointment_finalized',
                            actionId: lifecycleActionId,
                            erDocumentId: id,
                            documentNumber: document.documentNumber || null,
                            positionId: document.positionId || null,
                            departmentId: document.departmentId || null,
                            toStatus: appointmentStatus,
                        },
                    });

                    // Custom claims force-refresh — хэрэв өөрийн session бол role
                    // өөрчлөгдсөн байж мэдэх тул шууд force refresh хийнэ. Бусад
                    // ажилтны session-ийг force refresh хийх боломжгүй (server-side
                    // `set-tenant-claims` дуудагдсан бол дараагийн login-д хүчинтэй).
                    if (auth?.currentUser && document.employeeId === auth.currentUser.uid) {
                        try {
                            await auth.currentUser.getIdToken(true);
                        } catch (claimsErr) {
                            console.warn(
                                '[finalApprove] Custom claims refresh failed:',
                                claimsErr,
                            );
                            captureERError(claimsErr, {
                                flow: 'final-approve',
                                documentId: id,
                                employeeId: document?.employeeId,
                                extra: { phase: 'claims-refresh' },
                                severity: 'warning',
                            });
                        }
                    }
                }
            } catch (lifecycleErr) {
                // Lifecycle алдаа гарсан ч signing амжилттай байна тул user-д warning л харуулна.
                // Дараагийн retry буюу manual засвар шаардлагатай.
                console.warn('[finalApprove] Employee status update failed:', lifecycleErr);
                captureERError(lifecycleErr, {
                    flow: 'lifecycle-apply',
                    documentId: id,
                    employeeId: document?.employeeId,
                    actionId: lifecycleActionId,
                    extra: {
                        phase: 'post-sign-lifecycle',
                        documentStatus: document.status,
                    },
                });
                toast({
                    variant: 'destructive',
                    title: 'Ажилтны төлвийг шинэчлэхэд алдаа гарлаа',
                    description:
                        lifecycleErr instanceof Error
                            ? lifecycleErr.message
                            : 'Баримт баталгаажсан боловч ажилтны төлөв шинэчлэгдсэнгүй.',
                });
            }

            toast({ title: 'Баталгаажлаа', description: 'Баримт баталгаажлаа' });
        } catch (err) {
            captureERError(err, {
                flow: 'final-approve',
                documentId: id,
                employeeId: document?.employeeId,
                extra: { documentStatus: document.status },
            });
            toast({ title: 'Алдаа', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }, [firestore, id, currentUserId, document, tDoc, tCollection, toast, setIsSaving, auth, companyPath,
        permissions.can.finalApprove]);

    // ── Instant approve (DRAFT → ACKNOWLEDGED) ───────────────────────────────
    // Бүх үе шатыг (IN_REVIEW/REVIEWED/SIGNED/SENT_TO_EMPLOYEE) алгасаж
    // шууд ACKNOWLEDGED болгоно. Зөвхөн finalApprove эрхтэй role-д (admin/owner).
    // applyEmployeeLifecycle дуудагдаж employee-ийн статус (appointment/release)
    // мөн шууд хэрэгжинэ — `handleFinalApprove`-той ижил семантик.
    const handleInstantApprove = useCallback(async () => {
        if (!firestore) return;
        if (!permissions.can.finalApprove) {
            toast({
                variant: 'destructive',
                title: 'Эрх алга',
                description: 'Шууд батлах эрх таньд алга.',
            });
            return;
        }
        if (document.status !== 'DRAFT') {
            toast({
                variant: 'destructive',
                title: 'Үйлдэл буруу',
                description: 'Шууд батлах үйлдэл зөвхөн ноорог төлөвт ажиллана.',
            });
            return;
        }

        setIsSaving(true);
        try {
            const now = Timestamp.now();
            const batch = writeBatch(firestore);
            batch.update(tDoc('er_documents', id), {
                status: 'ACKNOWLEDGED',
                employeeAckRequired: true,
                employeeAckSentAt: now,
                employeeAckSentBy: currentUserId || null,
                employeeAckAt: now,
                employeeAckBy: document.employeeId || null,
                updatedAt: now,
            });
            batch.set(doc(tCollection('er_documents', id, 'activity')), {
                type: 'STATUS_CHANGE',
                actorId: currentUserId,
                content: 'Баримт шууд батлагдлаа (хяналт, танилцуулах үе шатыг алгассан)',
                createdAt: now,
            });
            await batch.commit();

            // Audit log — 3 transition-г тус тусад нь тэмдэглэнэ (хэдийгээр
            // нэг үйлдэл боловч compliance-ийн хувьд үе шат бүр lof-д үлдэнэ).
            logERTransition('final_approve', { ...document, id, status: 'ACKNOWLEDGED' }, {
                kind: 'er_instant_approve',
                skippedStages: ['IN_REVIEW', 'REVIEWED', 'SIGNED', 'SENT_TO_EMPLOYEE'],
            });
            logERTransition('send_to_employee', { ...document, id, status: 'ACKNOWLEDGED' }, {
                kind: 'er_instant_approve',
            });
            logERTransition('acknowledge', { ...document, id, status: 'ACKNOWLEDGED' }, {
                kind: 'er_instant_approve',
            });

            // Employee lifecycle apply — handleFinalApprove-той ижил код.
            const lifecycleActionId = String((document.metadata as Record<string, unknown>)?.actionId || '');
            try {
                await applyEmployeeLifecycle({
                    actionId: lifecycleActionId,
                    employeeId: document?.employeeId,
                    customInputs: document?.customInputs,
                    tDoc,
                    firestore,
                    auth: auth ?? undefined,
                    companyPath,
                });

                if (lifecycleActionId.startsWith('release_') && document?.employeeId) {
                    const employeeName = String(
                        (document.metadata as Record<string, unknown>)?.employeeName || '',
                    ) || 'Ажилтан';
                    logAudit({
                        action: 'delete',
                        resource: 'employee',
                        resourceId: document.employeeId,
                        resourceName: employeeName,
                        description: `Чөлөөлөх баримт шууд батлагдаж ажилтан халагдлаа: ${employeeName}`,
                        metadata: {
                            kind: 'release_finalized',
                            actionId: lifecycleActionId,
                            erDocumentId: id,
                            documentNumber: document.documentNumber || null,
                            instantApprove: true,
                        },
                    });
                }

                if (lifecycleActionId.startsWith('appointment_') && document?.employeeId) {
                    const employeeName = String(
                        (document.metadata as Record<string, unknown>)?.employeeName || '',
                    ) || 'Ажилтан';
                    const appointmentStatus =
                        lifecycleActionId === 'appointment_probation'
                            ? 'active_probation'
                            : 'active_permanent';
                    logAudit({
                        action: 'create',
                        resource: 'employee',
                        resourceId: document.employeeId,
                        resourceName: employeeName,
                        description: `Томилгооны баримт шууд батлагдаж ажилтан томилогдлоо: ${employeeName}`,
                        metadata: {
                            kind: 'appointment_finalized',
                            actionId: lifecycleActionId,
                            erDocumentId: id,
                            documentNumber: document.documentNumber || null,
                            positionId: document.positionId || null,
                            departmentId: document.departmentId || null,
                            toStatus: appointmentStatus,
                            instantApprove: true,
                        },
                    });

                    if (auth?.currentUser && document.employeeId === auth.currentUser.uid) {
                        try {
                            await auth.currentUser.getIdToken(true);
                        } catch (claimsErr) {
                            console.warn('[instantApprove] Custom claims refresh failed:', claimsErr);
                            captureERError(claimsErr, {
                                flow: 'instant-approve',
                                documentId: id,
                                employeeId: document?.employeeId,
                                extra: { phase: 'claims-refresh' },
                                severity: 'warning',
                            });
                        }
                    }
                }
            } catch (lifecycleErr) {
                console.warn('[instantApprove] Employee status update failed:', lifecycleErr);
                captureERError(lifecycleErr, {
                    flow: 'lifecycle-apply',
                    documentId: id,
                    employeeId: document?.employeeId,
                    actionId: lifecycleActionId,
                    extra: { phase: 'post-instant-approve-lifecycle' },
                });
                toast({
                    variant: 'destructive',
                    title: 'Ажилтны төлвийг шинэчлэхэд алдаа гарлаа',
                    description:
                        lifecycleErr instanceof Error
                            ? lifecycleErr.message
                            : 'Баримт батлагдсан боловч ажилтны төлөв шинэчлэгдсэнгүй.',
                });
            }

            toast({ title: 'Батлагдлаа', description: 'Баримт шууд хүчин төгөлдөр батлагдлаа.' });
        } catch (err) {
            captureERError(err, {
                flow: 'instant-approve',
                documentId: id,
                employeeId: document?.employeeId,
                extra: { documentStatus: document.status },
            });
            toast({ title: 'Алдаа', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }, [firestore, id, currentUserId, document, tDoc, tCollection, toast, setIsSaving, auth, companyPath,
        permissions.can.finalApprove]);

    // ── Send to employee for acknowledgement ──────────────────────────────────
    const handleSendToEmployeeForAcknowledgement = useCallback(async () => {
        if (!firestore) return;
        // Phase 3 RBAC guard + Phase 4 P4-E: sendToEmployee эрхтэй role.
        if (!permissions.can.sendToEmployee) {
            toast({
                variant: 'destructive',
                title: 'Эрх алга',
                description: 'Энэ үйлдлийг гүйцэтгэх эрх таньд алга.',
            });
            return;
        }
        if (!document?.employeeId) {
            toast({ variant: 'destructive', title: 'Алдаа', description: 'Ажилтан сонгогдоогүй байна.' });
            return;
        }

        setIsSaving(true);
        try {
            const batch = writeBatch(firestore);
            batch.update(tDoc('er_documents', id), {
                status: 'SENT_TO_EMPLOYEE',
                employeeAckRequired: true,
                employeeAckSentAt: Timestamp.now(),
                employeeAckSentBy: currentUserId || null,
                updatedAt: Timestamp.now(),
            });
            batch.set(doc(tCollection('er_documents', id, 'activity')), {
                type: 'STATUS_CHANGE',
                actorId: currentUserId,
                content: 'Ажилтанд танилцуулахаар илгээлээ',
                createdAt: Timestamp.now(),
            });
            await batch.commit();

            // Audit log — send-to-employee transition (Phase 3 P3-B).
            logERTransition('send_to_employee', { ...document, id, status: document.status });

            toast({ title: 'Илгээгдлээ', description: 'Ажилтанд танилцуулахаар илгээлээ.' });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Танилцуулахад алдаа гарлаа.';
            captureERError(e, {
                flow: 'send-to-employee',
                documentId: id,
                employeeId: document?.employeeId,
            });
            toast({ variant: 'destructive', title: 'Алдаа', description: msg });
        } finally {
            setIsSaving(false);
        }
    }, [firestore, id, currentUserId, document, tDoc, tCollection, toast, setIsSaving,
        permissions.can.sendToEmployee]);

    // ── File upload (signed doc) ──────────────────────────────────────────────
    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !storage) return;

        // Pre-upload validation: size, MIME, magic-bytes, filename sanitize.
        // Server-side talaas storage.rules мөн шалгалт хийнэ — энэ нь UX
        // зорилгоор сүлжээ үрэхгүй богино feedback өгнө.
        let validated: Awaited<ReturnType<typeof validateSignedDocFile>>;
        try {
            validated = await validateSignedDocFile(file);
        } catch (err) {
            const msg =
                err instanceof FileValidationError
                    ? err.message
                    : 'Файл шалгахад алдаа гарлаа';
            toast({ title: 'Файл буруу', description: msg, variant: 'destructive' });
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        try {
            const fileRef = storageRef(
                storage,
                `signed_docs/${id}/${Date.now()}_${validated.safeFilename}`,
            );
            await uploadBytes(fileRef, validated.file, {
                contentType: validated.file.type,
            });
            const downloadURL = await getDownloadURL(fileRef);

            await updateDoc(tDoc('er_documents', id), {
                signedDocUrl: downloadURL,
                updatedAt: Timestamp.now(),
            });

            toast({ title: 'Амжилттай', description: 'Эх хувь хавсрагдлаа' });
        } catch (uploadErr) {
            const msg = uploadErr instanceof Error ? uploadErr.message : 'Файл хуулахад алдаа гарлаа';
            captureERError(uploadErr, {
                flow: 'file-upload',
                documentId: id,
                extra: {
                    fileName: validated.safeFilename,
                    sizeBytes: validated.sizeBytes,
                    detectedType: validated.detectedType,
                },
            });
            toast({ title: 'Алдаа', description: msg, variant: 'destructive' });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [storage, id, tDoc, toast, setIsUploading]);

    return {
        fileInputRef,
        handleFinalApprove,
        handleInstantApprove,
        handleSendToEmployeeForAcknowledgement,
        handleFileUpload,
    };
}
