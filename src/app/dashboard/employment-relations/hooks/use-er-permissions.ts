'use client';

/**
 * use-er-permissions.ts
 *
 * Derives all permission flags for the ER document detail page.
 * Extracted from [id]/page.tsx to centralize access-control logic.
 *
 * Phase 4 P4-E: `rbacMatrix` param-аар dynamic RBAC matrix хүлээн авч,
 * granular `can: ERPermissionMap` field буцаана. `isAdmin` нь deprecated —
 * `can.finalApprove`-тэй тэнцүү утга (backward compat).
 */

import { useMemo } from 'react';
import type { ERDocument } from '../types';
import { buildERPermissionMap, type ERPermissionMap, type ERRbacMatrix } from '../lib/rbac-matrix';

interface UseERPermissionsParams {
    document: ERDocument | undefined | null;
    currentUserId: string | undefined;
    currentUserProfile: { role?: string; positionId?: string; id?: string } | undefined | null;
    reviewers: string[];
    /** Dynamic RBAC matrix (Firestore-аас). Null → DEFAULT_ER_MATRIX fallback. */
    rbacMatrix?: ERRbacMatrix | null;
}

export interface ERPermissions {
    /** Current user is the document creator */
    isOwner: boolean;
    /**
     * @deprecated — `can.finalApprove`-тэй тэнцүү. Шинэ code-д `can.*` ашиглана уу.
     * Backward compat: Phase 3 handler guard-ууд `isAdmin`-г шалгаж байгаа тул хадгалав.
     */
    isAdmin: boolean;
    /** Current user is listed as a reviewer (by positionId or uid) */
    isApprover: boolean;
    /**
     * The Firestore key to use when reading/writing approvalStatus for the current user.
     * Resolves to positionId if the reviewer entry matches by position, otherwise uid.
     */
    approveKeyForCurrentUser: string | null;
    /** Whether the current user can still approve (status=IN_REVIEW, is approver, not yet approved) */
    canApproveFromCommentBox: boolean;
    /** Phase 4 P4-E: 8 ER permission-ийн granular flag. Matrix + role-аас тооцоолсон. */
    can: ERPermissionMap;
}

export function useERPermissions({
    document,
    currentUserId,
    currentUserProfile,
    reviewers,
    rbacMatrix,
}: UseERPermissionsParams): ERPermissions {
    const isOwner = useMemo(
        () => !!document && !!currentUserId && document.creatorId === currentUserId,
        [document, currentUserId]
    );

    // Phase 4 P4-E: granular permission map (matrix-based).
    const can = useMemo(
        () => buildERPermissionMap(rbacMatrix, currentUserProfile?.role),
        [rbacMatrix, currentUserProfile?.role]
    );

    // isAdmin = can.finalApprove (backward compat — strongest admin-like check).
    const isAdmin = can.finalApprove;

    const isApprover = useMemo(() => {
        if (!document?.reviewers || !currentUserProfile) return false;
        return document.reviewers.some(
            rid =>
                rid === currentUserProfile.positionId ||
                rid === currentUserProfile.id
        );
    }, [document?.reviewers, currentUserProfile]);

    const approveKeyForCurrentUser = useMemo(() => {
        const rid = reviewers.find(
            r =>
                r === currentUserId ||
                (currentUserProfile?.positionId && r === currentUserProfile.positionId)
        );
        return rid || currentUserId || null;
    }, [reviewers, currentUserId, currentUserProfile?.positionId]);

    const canApproveFromCommentBox = useMemo(() => {
        if (document?.status !== 'IN_REVIEW') return false;
        if (!(isApprover || isAdmin)) return false;
        if (!approveKeyForCurrentUser) return false;
        return document?.approvalStatus?.[approveKeyForCurrentUser]?.status !== 'APPROVED';
    }, [document?.status, document?.approvalStatus, isApprover, isAdmin, approveKeyForCurrentUser]);

    return {
        isOwner,
        isAdmin,
        isApprover,
        approveKeyForCurrentUser,
        canApproveFromCommentBox,
        can,
    };
}
