
/**
 * Calculates the progress of an assigned onboarding program.
 * 
 * Logic:
 * - VERIFIED: 100% (1.0 weight)
 * - DONE (if requires verification): 80% (0.8 weight)
 * - DONE (if no verification required): 100% (1.0 weight)
 * - IN_PROGRESS: 40% (0.4 weight)
 * - TODO: 0%
 */
export function calculateOnboardingProgress(stages: any[]): number {
    if (!stages || !Array.isArray(stages) || stages.length === 0) return 0;

    let totalTasks = 0;
    let completedWeight = 0;

    stages.forEach(stage => {
        if (stage.tasks && Array.isArray(stage.tasks)) {
            stage.tasks.forEach((task: any) => {
                totalTasks++;
                if (task.status === 'VERIFIED') {
                    completedWeight += 1;
                } else if (task.status === 'DONE') {
                    if (task.requiresVerification) {
                        completedWeight += 0.8;
                    } else {
                        completedWeight += 1;
                    }
                } else if (task.status === 'IN_PROGRESS') {
                    completedWeight += 0.4;
                }
            });
        }
    });

    if (totalTasks === 0) return 0;
    const progress = (completedWeight / totalTasks) * 100;
    return Math.round(progress * 10) / 10; // Round to 1 decimal place
}

/**
 * Gets the display text for a task status.
 */
export function getTaskStatusLabel(status: string): string {
    switch (status) {
        case 'VERIFIED': return 'Баталгаажсан';
        case 'DONE': return 'Дууссан';
        case 'IN_PROGRESS': return 'Хийгдэж буй';
        case 'TODO': return 'Хүлээгдэж буй';
        default: return status;
    }
}
