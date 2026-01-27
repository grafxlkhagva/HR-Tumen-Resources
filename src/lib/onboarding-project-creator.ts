// Onboarding Project Creator
// Converts onboarding configuration into projects and tasks

import { Firestore, collection, doc, setDoc, Timestamp } from 'firebase/firestore';
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
    } = params;

    // Generate unique onboardingGroupId
    const onboardingGroupId = `onb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Build team member list
    const teamMemberIds = [employeeId];
    if (mentorId && !teamMemberIds.includes(mentorId)) {
        teamMemberIds.push(mentorId);
    }
    if (appointerId && !teamMemberIds.includes(appointerId)) {
        teamMemberIds.push(appointerId);
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

    // Filter stages that have tasks (after position filtering)
    const filteredStages = onboardingConfig
        .map(stage => {
            // If positionOnboardingIds is provided, filter tasks
            let filteredTasks = stage.tasks;
            if (positionOnboardingIds && positionOnboardingIds.length > 0) {
                filteredTasks = stage.tasks.filter(task => 
                    positionOnboardingIds.includes(task.id)
                );
                console.log(`[Onboarding] Stage "${stage.title}": ${stage.tasks.length} tasks -> ${filteredTasks.length} after filtering`);
            }
            return { ...stage, tasks: filteredTasks };
        })
        .filter(stage => stage.tasks.length > 0);
    
    console.log('[Onboarding] Filtered stages:', filteredStages.map(s => ({
        id: s.id,
        title: s.title,
        taskCount: s.tasks.length,
        taskTitles: s.tasks.map(t => t.title)
    })));

    // Create a project for each stage
    for (let i = 0; i < filteredStages.length; i++) {
        const stage = filteredStages[i];
        const isFirstStage = i === 0;
        
        // Calculate due date for this stage
        const dueOffset = STAGE_DUE_DATE_OFFSETS[stage.id] || 30;
        const stageEndDate = format(addDays(new Date(startDate), dueOffset), 'yyyy-MM-dd');
        
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

        await setDoc(projectRef, projectData);

        // Create tasks for this project
        for (const task of stage.tasks) {
            const taskRef = doc(collection(firestore, 'projects', projectId, 'tasks'));
            const taskId = taskRef.id;
            
            const taskData = {
                id: taskId,
                projectId: projectId,
                title: task.title,
                dueDate: stageEndDate,
                ownerId: undefined,
                assigneeIds: [employeeId], // Assigned to the new employee
                status: 'TODO',
                priority: 'MEDIUM',
                createdAt: now,
                updatedAt: now,
                // Onboarding-specific fields
                policyId: task.policyId || undefined,
            };

            await setDoc(taskRef, taskData);
            totalTaskCount++;
        }
    }

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
