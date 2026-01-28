'use client';

// Offboarding Project Creator
// Converts offboarding configuration into projects and tasks (project-based model)

import { Firestore, collection, doc, Timestamp, writeBatch } from 'firebase/firestore';
import { addDays, format } from 'date-fns';

// Offboarding configuration types (from settings page)
export interface OffboardingTask {
    id: string;
    title: string;
    description?: string;
    policyId?: string;
}

export interface OffboardingStage {
    id: string;
    title: string;
    description: string;
    icon?: string;
    tasks: OffboardingTask[];
}

export interface OffboardingTaskPlanEntry {
    templateTaskId: string; // task.id from offboarding settings
    dueDate: string;        // YYYY-MM-DD
    ownerId: string;        // responsible employee id
}

export interface OffboardingStageTaskPlan {
    stageId: string;
    tasks: OffboardingTaskPlanEntry[];
}

// Default due date offsets for stages (days from start date) – used as fallback
const DEFAULT_STAGE_DUE_DATE_OFFSETS: Record<string, number> = {
    'exit-initiation': 7,
    'knowledge-handover': 14,
    'formal-separation': 21,
    'exit-review': 30,
};

export interface CreateOffboardingProjectsParams {
    firestore: Firestore;
    employeeId: string;           // Offboarding хийх ажилтан
    employeeName: string;         // Нэр (төслийн нэрэнд)
    initiatorId: string;          // HR/Manager who starts the program
    offboardingConfig: OffboardingStage[];
    startDate: string;            // Start date (YYYY-MM-DD)
    taskPlan?: OffboardingStageTaskPlan[]; // Optional per-task overrides
    alwaysCreateAllStages?: boolean;       // Wizard: create all stages even if empty
}

export interface OffboardingProjectResult {
    offboardingGroupId: string;
    projectIds: string[];
    taskCount: number;
}

export async function createOffboardingProjects(
    params: CreateOffboardingProjectsParams
): Promise<OffboardingProjectResult> {
    const {
        firestore,
        employeeId,
        employeeName,
        initiatorId,
        offboardingConfig,
        startDate,
        taskPlan,
        alwaysCreateAllStages,
    } = params;

    const taskPlanByStageId: Record<string, Record<string, OffboardingTaskPlanEntry>> = {};
    if (taskPlan && taskPlan.length > 0) {
        for (const stagePlan of taskPlan) {
            const map: Record<string, OffboardingTaskPlanEntry> = {};
            for (const t of stagePlan.tasks || []) {
                if (!t?.templateTaskId) continue;
                map[t.templateTaskId] = t;
            }
            taskPlanByStageId[stagePlan.stageId] = map;
        }
    }

    const offboardingGroupId = `off_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Timestamp.now();

    const hasExplicitTaskPlan = !!(taskPlan && taskPlan.length > 0);

    const stageCandidates = offboardingConfig.map((stage) => {
        let filteredTasks = stage.tasks || [];

        const planMap = taskPlanByStageId[stage.id];
        if (planMap && Object.keys(planMap).length > 0) {
            filteredTasks = filteredTasks.filter((task) => !!planMap[task.id]);
        } else if (hasExplicitTaskPlan) {
            filteredTasks = [];
        }

        return { ...stage, tasks: filteredTasks };
    });

    const stagesToCreate = (alwaysCreateAllStages || hasExplicitTaskPlan)
        ? stageCandidates
        : stageCandidates.filter((s) => (s.tasks || []).length > 0);

    const batch = writeBatch(firestore);
    let writeCount = 0;
    const projectIds: string[] = [];
    let totalTaskCount = 0;

    for (let i = 0; i < stagesToCreate.length; i++) {
        const stage = stagesToCreate[i];
        const isFirstStage = i === 0;
        const stagePlanMap = taskPlanByStageId[stage.id];

        // Stage end date = max dueDate among selected tasks, else default offset
        let stageEndDate: string | null = null;
        if (stagePlanMap && Object.keys(stagePlanMap).length > 0) {
            const dueDates = Object.values(stagePlanMap)
                .map((p) => p?.dueDate)
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
            const dueOffset = DEFAULT_STAGE_DUE_DATE_OFFSETS[stage.id] || 30;
            stageEndDate = format(addDays(new Date(startDate), dueOffset), 'yyyy-MM-dd');
        }

        // Team members: employee + initiator + any task owners
        const teamMemberSet = new Set<string>([employeeId, initiatorId].filter(Boolean));
        if (stagePlanMap) {
            Object.values(stagePlanMap).forEach((p) => {
                if (p?.ownerId) teamMemberSet.add(p.ownerId);
            });
        }
        const teamMemberIds = Array.from(teamMemberSet);

        const projectRef = doc(collection(firestore, 'projects'));
        const projectId = projectRef.id;
        projectIds.push(projectId);

        const projectData = {
            id: projectId,
            name: `${employeeName} - ${stage.title}`,
            goal: stage.description,
            expectedOutcome: `${stage.title} үе шатны бүх ажлуудыг амжилттай гүйцэтгэх`,
            startDate,
            endDate: stageEndDate,
            ownerId: initiatorId,
            teamMemberIds,
            status: isFirstStage ? 'ACTIVE' : 'DRAFT',
            priority: 'MEDIUM',
            createdAt: now,
            updatedAt: now,
            createdBy: initiatorId,
            type: 'offboarding' as const,
            offboardingGroupId,
            offboardingStageId: stage.id,
            offboardingEmployeeId: employeeId,
            stageOrder: i + 1,
        };

        batch.set(projectRef, projectData);
        writeCount++;

        for (const task of stage.tasks || []) {
            const taskRef = doc(collection(firestore, 'projects', projectId, 'tasks'));
            const taskId = taskRef.id;
            const plan = stagePlanMap?.[task.id];

            const taskDueDate = plan?.dueDate || stageEndDate;
            const ownerId = plan?.ownerId || undefined;
            const assignees = new Set<string>([employeeId]);
            if (ownerId) assignees.add(ownerId);

            const taskData = {
                id: taskId,
                projectId,
                title: task.title,
                dueDate: taskDueDate,
                assigneeIds: Array.from(assignees),
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
        throw new Error(`Offboarding үүсгэх write тоо хэт их байна: ${writeCount}. (Firestore batch лимит 500)`);
    }

    await batch.commit();

    return {
        offboardingGroupId,
        projectIds,
        taskCount: totalTaskCount,
    };
}

