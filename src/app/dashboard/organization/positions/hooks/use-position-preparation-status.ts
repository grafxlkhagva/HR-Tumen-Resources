'use client';

import { useEffect, useState } from 'react';
import type { Firestore } from 'firebase/firestore';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useCollection, useMemoFirebase, tenantCollection, useTenantWrite } from '@/firebase';
import type { Project, Task } from '@/types/project';

export type PreparationStatus =
    | { state: 'none'; prepProjectId: null; total: 0; done: 0 }
    | { state: 'in_progress'; prepProjectId: string; total: number; done: number }
    | { state: 'completed'; prepProjectId: string; total: number; done: number };

export const PREP_STATUS_NONE: PreparationStatus = {
    state: 'none',
    prepProjectId: null,
    total: 0,
    done: 0,
};

function deriveStatus(
    prepProjects: Project[] | null | undefined,
    total: number,
    done: number
): PreparationStatus {
    if (!prepProjects || prepProjects.length === 0) return PREP_STATUS_NONE;
    const sorted = [...prepProjects].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
    const primaryId = sorted[0].id;
    const allProjectsCompleted = prepProjects.every((p) => p.status === 'COMPLETED');
    if (allProjectsCompleted) {
        return { state: 'completed', prepProjectId: primaryId, total, done };
    }
    if (total === 0) {
        return { state: 'completed', prepProjectId: primaryId, total, done };
    }
    if (done === total && total > 0) {
        return { state: 'completed', prepProjectId: primaryId, total, done };
    }
    return { state: 'in_progress', prepProjectId: primaryId, total, done };
}

/**
 * Reactive preparation status for a position.
 * Listens to position_preparation projects and aggregates task progress on the primary project.
 */
export function usePositionPreparationStatus(positionId: string | null | undefined) {
    const { tCollection } = useTenantWrite();

    const prepProjectsQuery = useMemoFirebase(({ firestore, companyPath }) => {
        if (!firestore || !positionId) return null;
        return query(
            tenantCollection(firestore, companyPath, 'projects'),
            where('type', '==', 'position_preparation'),
            where('positionPreparationPositionId', '==', positionId)
        );
    }, [positionId]);
    const { data: prepProjects, isLoading } = useCollection<Project>(prepProjectsQuery as any);

    const [taskAgg, setTaskAgg] = useState<{ total: number; done: number } | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!prepProjects || prepProjects.length === 0) {
                if (!cancelled) setTaskAgg(null);
                return;
            }
            const sorted = [...prepProjects].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
            const primary = sorted[0];
            try {
                const snap = await getDocs(tCollection('projects', primary.id, 'tasks'));
                let total = 0;
                let done = 0;
                snap.forEach((d) => {
                    const t = d.data() as Task;
                    total += 1;
                    if (t.status === 'DONE') done += 1;
                });
                if (!cancelled) setTaskAgg({ total, done });
            } catch {
                if (!cancelled) setTaskAgg({ total: 0, done: 0 });
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [prepProjects, tCollection]);

    const status: PreparationStatus = deriveStatus(
        prepProjects,
        taskAgg?.total ?? 0,
        taskAgg?.done ?? 0
    );

    return { status, isLoading: isLoading || (!!prepProjects?.length && taskAgg === null) };
}

/**
 * One-shot fetch of preparation status — use from event handlers (e.g., drag-drop onConnect).
 */
export async function fetchPositionPreparationStatus(
    firestore: Firestore,
    companyPath: string,
    positionId: string
): Promise<PreparationStatus> {
    const projectsSnap = await getDocs(
        query(
            tenantCollection(firestore, companyPath, 'projects'),
            where('type', '==', 'position_preparation'),
            where('positionPreparationPositionId', '==', positionId)
        )
    );
    if (projectsSnap.empty) return PREP_STATUS_NONE;

    const prepProjects: Project[] = projectsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const sorted = [...prepProjects].sort((a, b) => (a.stageOrder || 0) - (b.stageOrder || 0));
    const primaryDoc = projectsSnap.docs.find((d) => d.id === sorted[0].id) ?? projectsSnap.docs[0];

    const tasksSnap = await getDocs(collection(primaryDoc.ref, 'tasks'));
    let total = 0;
    let done = 0;
    tasksSnap.forEach((d) => {
        const t = d.data() as Task;
        total += 1;
        if (t.status === 'DONE') done += 1;
    });

    return deriveStatus(prepProjects, total, done);
}
