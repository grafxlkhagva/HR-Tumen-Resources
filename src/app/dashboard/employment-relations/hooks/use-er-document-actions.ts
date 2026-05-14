'use client';

/**
 * use-er-document-actions.ts
 *
 * Custom hook that encapsulates all write operations for an ER document detail page.
 * Extracted from [id]/page.tsx to keep the page component focused on rendering.
 *
 * Each action:
 *  - Uses writeBatch for atomic document + activity log writes
 *  - Handles optimistic UI via setIsSaving
 *  - Surfaces errors via toast
 */

import { useCallback } from 'react';
import { Timestamp, updateDoc } from 'firebase/firestore';
import { useAuth, useFirebase, useTenantWrite } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { ERDocument, ERTemplate, AppointmentDetails } from '../types';
import type { ERPermissions } from './use-er-permissions';
import { captureERError } from '../lib/sentry-capture';
import { useERDocumentDelete } from './use-er-document-delete';
import { useERReviewFlow } from './use-er-review-flow';
import { useERFinalFlow } from './use-er-final-flow';

interface UseERDocumentActionsParams {
    id: string;
    document: ERDocument;
    currentUserId: string | undefined;
    // Editable state (owned by parent — passed in, not owned here)
    editContent: string;
    selectedDept: string;
    selectedPos: string;
    reviewers: string[];
    isReviewRequired: boolean;
    customInputValues: Record<string, unknown>;
    /** Per-document placeholder overrides, keyed `{{field.path}}`. */
    fieldOverrides: Record<string, string>;
    /** Appointment action-ийн системийн утгуудын snapshot (null бол сэргэлгүй). */
    appointmentDetails: AppointmentDetails | null;
    departments: { id: string; name: string }[] | undefined;
    positions: { id: string; title: string }[] | undefined;
    template: Pick<ERTemplate, 'content' | 'customInputs'> | undefined;
    /**
     * Phase 3 (RBAC defense-in-depth): role-based guard-уудыг каждый action
     * handler-ийн эхэнд гүйцэтгэхийн тулд permissions-ыг гадны caller-аас өгнө.
     * Firestore rules болон UI disabled state-ийн дээр нэг давхар защита.
     */
    permissions: ERPermissions;
    setEditContent: (v: string) => void;
    setIsSaving: (v: boolean) => void;
    setIsUploading: (v: boolean) => void;
}

export function useERDocumentActions({
    id,
    document,
    currentUserId,
    editContent,
    selectedDept,
    selectedPos,
    reviewers,
    isReviewRequired,
    customInputValues,
    fieldOverrides,
    appointmentDetails,
    departments,
    positions,
    template,
    permissions,
    setEditContent,
    setIsSaving,
    setIsUploading,
}: UseERDocumentActionsParams) {
    const { firestore, storage } = useFirebase();
    const { tDoc, tCollection, companyPath } = useTenantWrite();
    const auth = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    // ── Restore template content ──────────────────────────────────────────────
    const restoreTemplateContent = useCallback(() => {
        if (!template?.content) {
            toast({ title: 'Алдаа', description: 'Эх загвар олдсонгүй', variant: 'destructive' });
            return;
        }
        setEditContent(template.content);
        toast({ title: 'Сэргээгдлээ', description: 'Баримтын агуулгыг анхны эх загвараар сольж сэргээлээ.' });
    }, [template, setEditContent, toast]);

    // ── Save draft ────────────────────────────────────────────────────────────
    const handleSaveDraft = useCallback(async () => {
        if (!firestore) return;
        // Phase 3 RBAC guard + Phase 4 P4-E: owner эсвэл saveDraft эрхтэй role.
        if (!(permissions.isOwner || permissions.can.saveDraft)) {
            toast({
                variant: 'destructive',
                title: 'Эрх алга',
                description: 'Энэ баримтыг засварлах эрх таньд алга.',
            });
            return;
        }
        setIsSaving(true);
        try {
            await updateDoc(tDoc('er_documents', id), {
                content: editContent,
                departmentId: selectedDept,
                positionId: selectedPos,
                reviewers,
                customInputs: customInputValues,
                fieldOverrides,
                ...(appointmentDetails ? { appointmentDetails } : {}),
                metadata: {
                    ...document.metadata,
                    departmentName: departments?.find(d => d.id === selectedDept)?.name,
                    positionName: positions?.find(p => p.id === selectedPos)?.title,
                },
                updatedAt: Timestamp.now(),
            });
            toast({ title: 'Хадгалагдлаа', description: 'Өөрчлөлтүүд амжилттай хадгалагдлаа' });
        } catch (err) {
            captureERError(err, { flow: 'save-draft', documentId: id });
            toast({ title: 'Алдаа', description: 'Хадгалахад алдаа гарлаа', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    }, [firestore, id, editContent, selectedDept, selectedPos, reviewers, customInputValues, fieldOverrides, appointmentDetails,
        document.metadata, departments, positions, tDoc, toast, setIsSaving,
        permissions.isOwner, permissions.can.saveDraft]);

    // handleSendForReview, handleApprove, handleReject — тусгай hook-д extract хийгдсэн (Phase 4.2).
    const { handleSendForReview, handleApprove, handleReject } = useERReviewFlow({
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
    });

    // handleFinalApprove, handleSendToEmployeeForAcknowledgement, handleFileUpload — тусгай hook-д
    // extract хийгдсэн (Phase 4.3). `applyEmployeeLifecycle` helper мөн тэнд байршсан.
    const {
        fileInputRef,
        handleFinalApprove,
        handleInstantApprove,
        handleSendToEmployeeForAcknowledgement,
        handleFileUpload,
    } = useERFinalFlow({
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
    });

    // ── Delete ────────────────────────────────────────────────────────────────
    // handleDelete — тусгай hook-д extract хийгдсэн (Phase 4.1).
    const { handleDelete } = useERDocumentDelete({
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
    });

    return {
        fileInputRef,
        restoreTemplateContent,
        handleSaveDraft,
        handleSendForReview,
        handleApprove,
        handleReject,
        handleFinalApprove,
        handleInstantApprove,
        handleSendToEmployeeForAcknowledgement,
        handleDelete,
        handleFileUpload,
    };
}
