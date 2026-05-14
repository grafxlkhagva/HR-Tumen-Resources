import { Employee } from '@/types';
import { Position } from '../../../../types';
import { OffboardingStage } from '@/lib/offboarding-project-creator';
import { ERTemplate, ERDocument } from '../../../../../employment-relations/types';

export interface ReleaseEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    employee: Employee | null;
    position: Position | null;
}

export type EligibilityState =
    | null
    | { allowed: true }
    | { allowed: false; reason: string; activeReleaseDocId?: string };

export interface TaskPlanEntry {
    selected: boolean;
    dueDate?: string;
    ownerId?: string;
}

export type TaskPlanByStage = Record<string, Record<string, TaskPlanEntry>>;

export interface ReleaseType {
    id: string;
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
}

export const ACTION_REQUIREMENTS: Record<string, Array<{ label: string; key: string }>> = {
    release_company: [{ label: 'Ажлаас чөлөөлөх огноо', key: 'releaseDate' }],
    release_employee: [{ label: 'Ажлаас чөлөөлөх огноо', key: 'releaseDate' }],
    release_temporary: [{ label: 'Ажлаас чөлөөлөх огноо', key: 'releaseDate' }],
    release_temporary_longterm: [
        { label: 'Эхлэх огноо', key: 'startDate' },
        { label: 'Дуусах огноо', key: 'endDate' },
    ],
    release_temporary_maternity: [
        { label: 'Эхлэх огноо', key: 'startDate' },
        { label: 'Дуусах огноо', key: 'endDate' },
    ],
    release_temporary_childcare: [
        { label: 'Эхлэх огноо', key: 'startDate' },
        { label: 'Дуусах огноо', key: 'endDate' },
    ],
};

export type { Employee, Position, OffboardingStage, ERTemplate, ERDocument };
