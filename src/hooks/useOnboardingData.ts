'use client';

import * as React from 'react';
import { useFirebase, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { OnboardingProgram } from '@/app/dashboard/settings/onboarding/page';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED';

export type AssignedTask = {
    templateTaskId: string;
    title: string;
    status: TaskStatus;
    dueDate: string;
    completedAt?: string;
    assigneeId: string;
    assigneeName?: string;
};

export type AssignedProgram = {
    id: string;
    programId: string;
    programName: string;
    status: 'IN_PROGRESS' | 'COMPLETED';
    startDate: string;
    progress: number;
    tasks: AssignedTask[];
}

export function useOnboardingData(employeeId: string) {
    const { firestore } = useFirebase();

    // Query for the active assigned program for the specific employee
    const assignedProgramsQuery = useMemoFirebase(
        () => firestore && employeeId ? query(
            collection(firestore, `employees/${employeeId}/assignedPrograms`),
            where('status', '==', 'IN_PROGRESS')
        ) : null,
        [firestore, employeeId]
    );

    // Query for all program templates (for the 'Assign Program' dialog)
    const programTemplatesQuery = useMemoFirebase(
        () => firestore ? collection(firestore, 'onboardingPrograms') : null,
        [firestore]
    );

    const { data: assignedPrograms, isLoading: isLoadingAssigned } = useCollection<AssignedProgram>(assignedProgramsQuery);
    const { data: programTemplates, isLoading: isLoadingTemplates } = useCollection<OnboardingProgram>(programTemplatesQuery);

    const assignedProgram = assignedPrograms && assignedPrograms.length > 0 ? assignedPrograms[0] : null;

    const calculateProgress = React.useCallback((tasks: AssignedTask[]): number => {
        if (!tasks || tasks.length === 0) return 0;
        
        const totalValue = tasks.length;
        const completedValue = tasks.filter(task => task.status === 'DONE' || task.status === 'VERIFIED').length;
        const inProgressValue = tasks.filter(task => task.status === 'IN_PROGRESS').length;
        
        // Each completed task is 1 point, each in-progress is 0.5
        const currentValue = completedValue + (inProgressValue * 0.5);

        return Math.round((currentValue / totalValue) * 100);
    }, []);

    // Function to update a task's status
    const updateTaskStatus = React.useCallback(async (programId: string, taskId: string, newStatus: TaskStatus) => {
        if (!firestore || !employeeId || !assignedProgram) return;
        
        const programDocRef = doc(firestore, `employees/${employeeId}/assignedPrograms`, programId);

        const newTasks = assignedProgram.tasks.map(task => 
            task.templateTaskId === taskId ? { ...task, status: newStatus } : task
        );
        
        const newProgress = calculateProgress(newTasks);

        const finalTasks = newTasks.map(task => {
            if (task.templateTaskId === taskId) {
                const updatedTask = { ...task, status: newStatus };
                if (newStatus === 'DONE' && !task.completedAt) {
                    updatedTask.completedAt = new Date().toISOString();
                }
                return updatedTask;
            }
            return task;
        });

        await updateDocumentNonBlocking(programDocRef, {
            tasks: finalTasks,
            progress: newProgress,
        });

    }, [firestore, employeeId, assignedProgram, calculateProgress]);


    return {
        assignedProgram,
        programTemplates,
        isLoading: isLoadingAssigned || isLoadingTemplates,
        updateTaskStatus,
    };
}
