// Onboarding Project Creator
// Converts onboarding configuration into projects and tasks

import { Firestore, collection, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { addDays, format } from 'date-fns';

// Onboarding configuration types (from settings page)
export interface OnboardingTask {
    id: string;
    title: string;
    description?: string;
    policyId?: string;
}

export interface OnboardingStage {
    id: string;
    title: string;
    description: string;
    tasks: OnboardingTask[];
}

export interface OnboardingTaskPlanEntry {
    templateTaskId: string; // task.id from onboarding settings
    dueDate: string;        // YYYY-MM-DD
    ownerId: string;        // responsible employee id
}

export interface OnboardingStageTaskPlan {
    stageId: string; // 'pre-onboarding' | 'orientation' | 'integration' | 'productivity' (or custom)
    tasks: OnboardingTaskPlanEntry[];
}

// Due date offsets for each stage (in days from start date)
const STAGE_DUE_DATE_OFFSETS: Record<string, number> = {
    'pre-onboarding': 7,    // 1 week
    'orientation': 30,      // 1 month
    'integration': 60,      // 2 months
    'productivity': 90,     // 3 months
};

// Stage order mapping
const STAGE_ORDER: Record<string, number> = {
    'pre-onboarding': 1,
    'orientation': 2,
    'integration': 3,
    'productivity': 4,
};

export interface CreateOnboardingProjectsParams {
    firestore: Firestore;
    employeeId: string;           // Шинэ ажилтан
    employeeName: string;         // Нэр (төслийн нэрэнд)
    mentorId?: string;            // Ментор (optional)
    appointerId: string;          // Томилогч = HR Manager
    onboardingConfig: OnboardingStage[];
    positionOnboardingIds?: string[];  // Position-specific filtering
    startDate: string;            // Ажилд орсон огноо (YYYY-MM-DD)
    taskPlan?: OnboardingStageTaskPlan[]; // Optional per-task overrides
    /**
     * Wizard-ээр onboarding үүсгэх үед 4 үе шат бүрээр тусдаа төсөл заавал үүсгэх.
     * (Таск 0 байж болно.)
     */
    alwaysCreateAllStages?: boolean;
}

export interface OnboardingProjectResult {
    onboardingGroupId: string;
    projectIds: string[];
    taskCount: number;
}

/**
 * Creates onboarding projects from onboarding configuration
 * - Creates 4 projects (one for each stage)
 * - Creates tasks within each project
 * - Links all projects with onboardingGroupId
 */
export async function createOnboardingProjects(
    params: CreateOnboardingProjectsParams
): Promise<OnboardingProjectResult> {
    const {
        firestore,
        employeeId,
        employeeName,
        mentorId,
        appointerId,
        onboardingConfig,
        positionOnboardingIds,
        startDate,
        taskPlan,
        alwaysCreateAllStages,
    } = params;

    const taskPlanByStageId: Record<string, Record<string, OnboardingTaskPlanEntry>> = {};
    if (taskPlan && taskPlan.length > 0) {
        for (const stagePlan of taskPlan) {
            const map: Record<string, OnboardingTaskPlanEntry> = {};
            for (const t of stagePlan.tasks || []) {
                if (!t?.templateTaskId) continue;
                map[t.templateTaskId] = t;
            }
            taskPlanByStageId[stagePlan.stageId] = map;
        }
    }

    // Generate unique onboardingGroupId
    const onboardingGroupId = `onb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build team member list
    const baseTeamMemberIds: string[] = [employeeId];
    if (mentorId && !baseTeamMemberIds.includes(mentorId)) {
        baseTeamMemberIds.push(mentorId);
    }
    if (appointerId && !baseTeamMemberIds.includes(appointerId)) {
        baseTeamMemberIds.push(appointerId);
    }

    const now = Timestamp.now();
    const projectIds: string[] = [];
    let totalTaskCount = 0;

    // Debug logging
    console.log('[Onboarding] Starting project creation for:', employeeName);
    console.log('[Onboarding] Position onboarding IDs:', positionOnboardingIds);
    console.log('[Onboarding] All config stages:', onboardingConfig.map(s => ({
        id: s.id,
        title: s.title,
        taskIds: s.tasks.map(t => t.id)
    })));

    const hasExplicitTaskPlan = !!(taskPlan && taskPlan.length > 0);

    // Filter tasks per stage (after position filtering and/or taskPlan)
    const stageCandidates = onboardingConfig
        .map(stage => {
            // If positionOnboardingIds is provided, filter tasks
            let filteredTasks = stage.tasks;
            if (positionOnboardingIds && positionOnboardingIds.length > 0) {
                filteredTasks = stage.tasks.filter(task => 
                    positionOnboardingIds.includes(task.id)
                );
                console.log(`[Onboarding] Stage "${stage.title}": ${stage.tasks.length} tasks -> ${filteredTasks.length} after filtering`);
            }

            // If taskPlan is provided, only include selected tasks for this stage
            const planMap = taskPlanByStageId[stage.id];
            if (planMap && Object.keys(planMap).length > 0) {
                filteredTasks = filteredTasks.filter(task => !!planMap[task.id]);
            } else if (taskPlan && taskPlan.length > 0) {
                // taskPlan exists but no tasks selected for this stage => no tasks
                filteredTasks = [];
            }

            return { ...stage, tasks: filteredTasks };
        });
    
    const stagesToCreate = (alwaysCreateAllStages || hasExplicitTaskPlan)
        ? stageCandidates
        : stageCandidates.filter(stage => stage.tasks.length > 0);

    // Sort by known stage order when possible
    const orderedStages = [...stagesToCreate].sort((a, b) => {
        const ao = STAGE_ORDER[a.id] ?? 999;
        const bo = STAGE_ORDER[b.id] ?? 999;
        return ao - bo;
    });

    console.log('[Onboarding] Stages to create:', orderedStages.map(s => ({
        id: s.id,
        title: s.title,
        taskCount: s.tasks.length,
        taskTitles: s.tasks.map(t => t.title)
    })));

    const batch = writeBatch(firestore);
    let writeCount = 0;

    // Create a project for each stage
    for (let i = 0; i < orderedStages.length; i++) {
        const stage = orderedStages[i];
        const isFirstStage = i === 0;
        
        const stagePlanMap = taskPlanByStageId[stage.id];

        // Calculate end date for this stage (max task dueDate if overrides exist)
        let stageEndDate: string | null = null;
        if (stagePlanMap && Object.keys(stagePlanMap).length > 0) {
            const dueDates = Object.values(stagePlanMap)
                .map(p => p?.dueDate)
                .filter(Boolean) as string[];
            if (dueDates.length > 0) {
                stageEndDate = dueDates.reduce((max, cur) => {
                    const maxD = new Date(max);
                    const curD = new Date(cur);
                    return curD > maxD ? cur : max;
                }, dueDates[0]);
            }
        }
        if (!stageEndDate) {
            const dueOffset = STAGE_DUE_DATE_OFFSETS[stage.id] || 30;
            stageEndDate = format(addDays(new Date(startDate), dueOffset), 'yyyy-MM-dd');
        }
        
        // Build team members for this stage (include task owners if provided)
        const teamMemberSet = new Set(baseTeamMemberIds);
        if (stagePlanMap) {
            Object.values(stagePlanMap).forEach(p => {
                if (p?.ownerId) teamMemberSet.add(p.ownerId);
            });
        }
        const teamMemberIds = Array.from(teamMemberSet);

        // Create project document
        const projectRef = doc(collection(firestore, 'projects'));
        const projectId = projectRef.id;
        projectIds.push(projectId);
        
        const projectData = {
            id: projectId,
            name: `${employeeName} - ${stage.title}`,
            goal: stage.description,
            expectedOutcome: `${stage.title} үе шатны бүх ажлуудыг амжилттай гүйцэтгэх`,
            startDate: startDate,
            endDate: stageEndDate,
            ownerId: appointerId,
            teamMemberIds: teamMemberIds,
            status: isFirstStage ? 'ACTIVE' : 'DRAFT',
            priority: 'MEDIUM',
            createdAt: now,
            updatedAt: now,
            createdBy: appointerId,
            // Onboarding-specific fields
            type: 'onboarding',
            onboardingGroupId: onboardingGroupId,
            onboardingStageId: stage.id,
            onboardingEmployeeId: employeeId,
            stageOrder: STAGE_ORDER[stage.id] || i + 1,
        };

        batch.set(projectRef, projectData);
        writeCount++;

        // Create tasks for this project
        for (const task of stage.tasks) {
            const taskRef = doc(collection(firestore, 'projects', projectId, 'tasks'));
            const taskId = taskRef.id;

            const plan = stagePlanMap?.[task.id];
            const taskDueDate = plan?.dueDate || stageEndDate;
            const ownerId = plan?.ownerId || undefined;
            const assignees = new Set<string>([employeeId]);
            if (ownerId) assignees.add(ownerId);
            
            const taskData = {
                id: taskId,
                projectId: projectId,
                title: task.title,
                dueDate: taskDueDate,
                assigneeIds: Array.from(assignees), // Employee + responsible
                status: 'TODO' as const,
                priority: 'MEDIUM' as const,
                createdAt: now,
                updatedAt: now,
                ...(ownerId ? { ownerId } : {}),
                ...(task.policyId ? { policyId: task.policyId } : {}),
            };
            batch.set(taskRef, taskData);
            writeCount++;
            totalTaskCount++;
        }
    }

    if (writeCount > 450) {
        throw new Error(`Onboarding үүсгэх write тоо хэт их байна: ${writeCount}. (Firestore batch лимит 500)`);
    }

    await batch.commit();

    return {
        onboardingGroupId,
        projectIds,
        taskCount: totalTaskCount,
    };
}

/**
 * Get all onboarding task IDs from configuration
 * Useful for position-specific onboarding setup
 */
export function getAllOnboardingTaskIds(config: OnboardingStage[]): string[] {
    return config.flatMap(stage => stage.tasks.map(task => task.id));
}
