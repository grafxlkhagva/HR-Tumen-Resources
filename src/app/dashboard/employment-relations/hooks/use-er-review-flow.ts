'use client';

/**
 * use-er-review-flow.ts
 * ─────────────────────────────────────────────────────────────────────
 * ER document хянах үе шатны action-уудыг нэгтгэсэн hook:
 *   • handleSendForReview — DRAFT → IN_REVIEW (эсвэл REVIEWED)
 *   • handleApprove       — Хянагч approve; бүгд approve-сон бол REVIEWED
 *   • handleReject        — Хянагч reject + коммент; IN_REVIEW → DRAFT
 *
 * Phase 4.2 extraction — `use-er-document-actions.ts`-аас хуваав.
 * Зан үйл өөрчлөгдөөгүй.
 */

import { useCallback } from 'react';
import {
    doc,
    Timestamp,
    writeBatch,
    runTransaction,
    Firestore,
    DocumentReference,
    CollectionReference,
} from 'firebase/firestore';
import type { ERDocument, ERTemplate } from '../types';
import type { ERPermissions } from './use-er-permissions';
import { validateCustomInputs, ERValidationError } from '../validation';
import { logERTransition } from '../lib/er-audit';
import { captureERError } from '../lib/sentry-capture';

interface ToastApi {
    (args: {
        title?: string;
        description?: string | React.ReactNode;
        variant?: 'default' | 'destructive';
    }): void;
}

interface UseERReviewFlowParams {
    id: string;
    document: ERDocument;
    firestore: Firestore | null;
    currentUserId: string | undefined;
    reviewers: string[];
    isReviewRequired: boolean;
    customInputValues: Record<string, unknown>;
    template: Pick<ERTemplate, 'content' | 'customInputs'> | undefined;
    tDoc: (...path: string[]) => DocumentReference;
    tCollection: (...path: string[]) => CollectionReference;
    toast: ToastApi;
    permissions: ERPermissions;
    setIsSaving: (v: boolean) => void;
}

export function useERReviewFlow({
    id,
    document,
    firestore,
    currentUserId,
    reviewers,
    isReviewRequired,
    customInputValues,
    template,
    tDoc,
    tCollection,
    toast,
    permissions,
    setIsSaving,
}: UseERReviewFlowParams) {
    // ── Send for review ──────────────────────────────────────────────────
    const handleSendForReview = useCallback(async () => {
        if (!firestore) return;
        if (!(permissions.isOwner || permissions.can.sendForReview)) {
            toast({
                variant: 'destructive',
                title: 'Эрх алга',
                description: 'Энэ баримтыг хянуулахаар илгээх эрх таньд алга.',
            });
            return;
        }

        // Хянагч сонгоогүй бол — хянахгүй шууд REVIEWED рүү явна (хуучин зан үйл).
        const effectiveReviewRequired = isReviewRequired && reviewers.length > 0;

        // customInputs validation — required + type + lifecycle rules
        try {
            const actionId = String(
                (document.metadata as Record<string, unknown> | undefined)?.actionId || '',
            );
            validateCustomInputs(template, customInputValues, { actionId });
        } catch (err) {
            if (err instanceof ERValidationError) {
                toast({
                    title: 'Шалгалт амжилтгүй',
                    description: err.message,
                    variant: 'destructive',
                });
                return;
            }
            throw err;
        }

        setIsSaving(true);
        try {
            const initialApprovalStatus: Record<string, unknown> = {};
            if (effectiveReviewRequired) {
                reviewers.forEach((uid) => {
                    initialApprovalStatus[uid] = { status: 'PENDING', updatedAt: Timestamp.now() };
                });
            }

            const nextStatus = effectiveReviewRequired ? 'IN_REVIEW' : 'REVIEWED';
            const batch = writeBatch(firestore);

            batch.update(tDoc('er_documents', id), {
                status: nextStatus,
                reviewers: effectiveReviewRequired ? reviewers : [],
                approvalStatus: initialApprovalStatus,
                updatedAt: Timestamp.now(),
            });
            batch.set(doc(tCollection('er_documents', id, 'activity')), {
                type: 'STATUS_CHANGE',
                actorId: currentUserId,
                content: nextStatus === 'REVIEWED' ? 'Хянагдсан төлөвт шилжив' : 'Хянахаар илгээв',
                createdAt: Timestamp.now(),
            });
            await batch.commit();

            logERTransition('send_for_review', { ...document, id, status: document.status }, {
                toStatus: nextStatus,
                reviewerCount: reviewers.length,
                isReviewRequired: effectiveReviewRequired,
            });

            toast({
                title: nextStatus === 'REVIEWED' ? 'Хянагдсан' : 'Илгээгдлээ',
                description:
                    nextStatus === 'REVIEWED'
                        ? 'Хянах шат алгасан хянагдсан төлөвт шилжлээ. Одоо эх хувийг хавсаргана уу.'
                        : 'Баримт хянах шат руу шилжлээ',
            });
        } catch (err) {
            captureERError(err, {
                flow: 'send-for-review',
                documentId: id,
                extra: { reviewerCount: reviewers.length, isReviewRequired },
            });
            toast({ title: 'Алдаа', description: 'Илгээхэд алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }, [
        firestore,
        id,
        isReviewRequired,
        reviewers,
        currentUserId,
        tDoc,
        tCollection,
        toast,
        setIsSaving,
        template,
        customInputValues,
        document,
        permissions.isOwner,
        permissions.can.sendForReview,
    ]);

    // ── Approve ──────────────────────────────────────────────────────────
    const handleApprove = useCallback(
        async (approveKeyForCurrentUser: string | null, comment?: string) => {
            if (!firestore || !currentUserId || !approveKeyForCurrentUser) return;
            if (!(permissions.isApprover || permissions.can.approve)) {
                toast({
                    variant: 'destructive',
                    title: 'Эрх алга',
                    description: 'Энэ баримтыг батлах эрх таньд алга.',
                });
                return;
            }
            setIsSaving(true);
            try {
                // Phase 6.2 — atomic read-modify-write of approvalStatus via
                // runTransaction. Өмнө нь writeBatch + local `document.approvalStatus`
                // spread хийдэг байсан. 2 reviewer зэрэг approve дарвал нэгнийх нь
                // approval дарагдаж байсан (race condition). Одоо Firestore
                // snapshot-аас уншиж, merge хийж, update хийнэ.
                const docRef = tDoc('er_documents', id);
                const activityRef = doc(tCollection('er_documents', id, 'activity'));
                const result = await runTransaction(firestore, async (txn) => {
                    const snap = await txn.get(docRef);
                    if (!snap.exists()) {
                        throw new Error('Баримт олдсонгүй.');
                    }
                    const data = snap.data() as ERDocument;
                    const freshApprovalStatus: Record<string, unknown> = {
                        ...(data.approvalStatus || {}),
                    };
                    freshApprovalStatus[approveKeyForCurrentUser] = {
                        status: 'APPROVED',
                        actorId: currentUserId,
                        ...(comment?.trim() ? { comment: comment.trim() } : {}),
                        updatedAt: Timestamp.now(),
                    };
                    const freshReviewers: string[] = data.reviewers || reviewers;
                    const allApproved = freshReviewers.every(
                        (r) =>
                            (freshApprovalStatus[r] as { status?: string } | undefined)?.status ===
                            'APPROVED',
                    );

                    txn.update(docRef, {
                        approvalStatus: freshApprovalStatus,
                        status: allApproved ? 'REVIEWED' : 'IN_REVIEW',
                        updatedAt: Timestamp.now(),
                    });
                    txn.set(activityRef, {
                        type: 'APPROVE',
                        actorId: currentUserId,
                        content: comment?.trim() ? `Батлав: ${comment.trim()}` : 'Баримтыг зөвшөөрөв',
                        createdAt: Timestamp.now(),
                    });

                    return { allApproved };
                });

                logERTransition('approve', { ...document, id, status: document.status }, {
                    approverId: currentUserId,
                    approveKey: approveKeyForCurrentUser,
                    allApproved: result.allApproved,
                    hasComment: !!comment?.trim(),
                });

                toast({
                    title: 'Зөвшөөрлөө',
                    description: result.allApproved
                        ? 'Бүх хянагчид зөвшөөрсөн. Эцсийн батлалт хүлээж байна.'
                        : 'Таны зөвшөөрөл бүртгэгдлээ',
                });
            } catch (err) {
                captureERError(err, {
                    flow: 'approve',
                    documentId: id,
                    extra: { approverId: currentUserId, approveKey: approveKeyForCurrentUser },
                });
                toast({ title: 'Алдаа', variant: 'destructive' });
            } finally {
                setIsSaving(false);
            }
        },
        [
            firestore,
            id,
            currentUserId,
            document,
            reviewers,
            tDoc,
            tCollection,
            toast,
            setIsSaving,
            permissions.isApprover,
            permissions.can.approve,
        ]
    );

    // ── Reject (IN_REVIEW → DRAFT) ───────────────────────────────────────
    const handleReject = useCallback(
        async (approveKeyForCurrentUser: string | null, comment: string) => {
            if (!firestore || !currentUserId || !approveKeyForCurrentUser) return;
            if (!(permissions.isApprover || permissions.can.approve)) {
                toast({
                    variant: 'destructive',
                    title: 'Эрх алга',
                    description: 'Энэ баримтыг буцаах эрх таньд алга.',
                });
                return;
            }
            if (!comment.trim()) {
                toast({
                    variant: 'destructive',
                    title: 'Коммент шаардлагатай',
                    description: 'Буцаах үндэслэлийг тайлбарласан коммент заавал бичнэ үү.',
                });
                return;
            }
            setIsSaving(true);
            try {
                // Phase 6.2 — atomic read-modify-write via runTransaction. Approve-той
                // ижил race prevention. Reject үед status-ийг шууд DRAFT руу шилжүүлнэ.
                const docRef = tDoc('er_documents', id);
                const activityRef = doc(tCollection('er_documents', id, 'activity'));
                await runTransaction(firestore, async (txn) => {
                    const snap = await txn.get(docRef);
                    if (!snap.exists()) {
                        throw new Error('Баримт олдсонгүй.');
                    }
                    const data = snap.data() as ERDocument;
                    const freshApprovalStatus: Record<string, unknown> = {
                        ...(data.approvalStatus || {}),
                    };
                    freshApprovalStatus[approveKeyForCurrentUser] = {
                        status: 'REJECTED',
                        actorId: currentUserId,
                        comment: comment.trim(),
                        updatedAt: Timestamp.now(),
                    };

                    txn.update(docRef, {
                        approvalStatus: freshApprovalStatus,
                        status: 'DRAFT',
                        updatedAt: Timestamp.now(),
                    });
                    txn.set(activityRef, {
                        type: 'REJECT',
                        actorId: currentUserId,
                        content: `Буцаав: ${comment.trim()}`,
                        createdAt: Timestamp.now(),
                    });
                });

                logERTransition('reject', { ...document, id, status: document.status }, {
                    rejecterId: currentUserId,
                    approveKey: approveKeyForCurrentUser,
                    hasComment: true,
                });

                toast({
                    title: 'Баримт буцаагдлаа',
                    description: 'Эзэмшигчид засвар хийх мэдэгдэл очлоо.',
                });
            } catch (err) {
                captureERError(err, {
                    flow: 'reject',
                    documentId: id,
                    extra: { rejecterId: currentUserId, approveKey: approveKeyForCurrentUser },
                });
                toast({ title: 'Алдаа', variant: 'destructive' });
            } finally {
                setIsSaving(false);
            }
        },
        [
            firestore,
            id,
            currentUserId,
            document,
            tDoc,
            tCollection,
            toast,
            setIsSaving,
            permissions.isApprover,
            permissions.can.approve,
        ]
    );

    return { handleSendForReview, handleApprove, handleReject };
}
