import { Employee } from '@/types';
import { Position } from '../../../../types';

export const ACTION_REQUIREMENTS: Record<string, Array<{ label: string; key: string }>> = {
    appointment_permanent: [{ label: 'Томилогдсон огноо', key: 'appointmentDate' }],
    appointment_probation: [
        { label: 'Туршилтын эхлэх огноо', key: 'probationStartDate' },
        { label: 'Туршилтын дуусах огноо', key: 'probationEndDate' },
    ],
    appointment_reappoint: [{ label: 'Эргүүлэн томилсон огноо', key: 'reappointmentDate' }],
};

export interface AppointEmployeeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    position: Position | null;
    initialEmployee?: Employee | null;
    onSuccess?: (employeeId: string) => void;
    /**
     * 'prepared' — томилгоо position_preparation дуусгасан хэвийн замаар хийгдэж байна (default)
     * 'quick'    — хэрэглэгч бэлтгэлийг алгасаж шуурхай томилгоо сонгосон
     * ER document-ийн metadata-д хадгалагдана.
     */
    appointmentPath?: 'prepared' | 'quick';
}

// Full position data fetched from Firestore
export interface FullPositionData extends Position {
    salarySteps?: {
        items: { name: string; value: number }[];
        activeIndex: number;
        currency: string;
    };
    incentives?: {
        type: string;
        description: string;
        amount: number;
        currency: string;
        unit: string;
        frequency?: string;
    }[];
    allowances?: {
        type: string;
        amount: number;
        currency: string;
        period: string;
    }[];
}

// Wizard steps
export const WIZARD_STEPS = {
    EMPLOYEE_SELECT: 1,
    APPOINTMENT_TYPE: 2,
    SALARY_STEP: 3,
    INCENTIVES: 4,
    ALLOWANCES: 5,
    ONBOARDING: 6,
    ONBOARDING_PRE: 7,
    ONBOARDING_ORIENTATION: 8,
    ONBOARDING_INTEGRATION: 9,
    ONBOARDING_PRODUCTIVITY: 10,
    DOCUMENT_INPUTS: 11,
};

export type OnboardingStageId = 'pre-onboarding' | 'orientation' | 'integration' | 'productivity';

export const ONBOARDING_STAGE_ORDER: OnboardingStageId[] = ['pre-onboarding', 'orientation', 'integration', 'productivity'];

export const ONBOARDING_STAGE_TITLES: Record<OnboardingStageId, string> = {
    'pre-onboarding': 'Урьдчилсан бэлтгэл үе',
    orientation: 'Дасан зохицох, танилцах үе',
    integration: 'Ажлын үүрэгт уусах үе',
    productivity: 'Тогтворжилт, бүтээмжийн үе',
};

export const ONBOARDING_STAGE_DUE_OFFSETS: Record<OnboardingStageId, number> = {
    'pre-onboarding': 7,
    orientation: 30,
    integration: 60,
    productivity: 90,
};

export type EligibilityState = {
    allowed: true;
} | {
    allowed: false;
    reason: string;
    activeAppointmentDocId?: string;
    activeReleaseDocId?: string;
}

export type OffboardingStatus = 'checking' | 'active' | 'none';

export interface OnboardingTaskPlanEntry {
    selected: boolean;
    dueDate?: string;
    ownerId?: string;
}

export type OnboardingTaskPlanState = Record<string, Record<string, OnboardingTaskPlanEntry>>;
