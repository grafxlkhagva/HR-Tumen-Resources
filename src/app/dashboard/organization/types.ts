export type Department = {
    id: string;
    name: string;
    typeId?: string;
    parentId?: string;
    // Locally computed properties
    children?: Department[];
    filled: number;
    typeName?: string;
    positions?: Position[];
    description?: string;
    vision?: string;
    managerId?: string;
    managerPositionId?: string;
    code?: string;
    createdAt?: string; // ISO date string
    status?: 'active' | 'inactive';
    color?: string;
};

export type DepartmentType = {
    id: string;
    name: string;
};

export type Position = {
    id: string;
    title: string;
    departmentId: string;
    filled: number;
    reportsTo?: string;
    levelId?: string;
    employmentTypeId?: string;
    jobCategoryId?: string;
    workScheduleId?: string;
    isActive?: boolean;
    createdAt?: string;
    canApproveAttendance?: boolean;
    hasPointBudget?: boolean;
    yearlyPointBudget?: number;
    remainingPointBudget?: number;
    onboardingProgramIds?: string[];
    canApproveVacation?: boolean;
    isApproved?: boolean;
    approvedAt?: string;
    approvedBy?: string;
    approvedByName?: string;
    disapprovedAt?: string;
    disapprovedBy?: string;
    disapprovedByName?: string;
    approvalHistory?: ApprovalLog[];
    description?: string;
    requirements?: string[];
    compensation?: {
        salaryRange?: {
            min: number;
            mid: number;
            max: number;
            currency: string;
            period: 'monthly' | 'yearly';
        };
        variablePay?: {
            bonusDescription?: string;
            commissionDescription?: string;
            equityDescription?: string;
        };
    };
    benefits?: {
        insuranceIds?: string[];
        isRemoteAllowed?: boolean;
        flexibleHours?: boolean;
        vacationDays?: number;
        otherBenefits?: string[];
    };
};

export type BenefitReference = {
    id: string;
    name: string;
    icon?: string;
    category: 'health' | 'finance' | 'lifestyle' | 'other';
};

export type ApprovalLog = {
    action: 'approve' | 'disapprove';
    userId: string;
    userName: string;
    timestamp: string;
    note?: string;
};

export type PositionLevel = {
    id: string;
    name: string;
};

export type EmploymentType = {
    id: string;
    name: string;
};

export type JobCategory = {
    id: string;
    name: string;
    code: string;
}

export type CompanyProfile = {
    name: string;
    legalName?: string;
}

export type WorkSchedule = {
    id: string;
    name: string;
}

export type DepartmentHistory = {
    id: string;
    departmentId: string;
    approvedAt: string;
    validTo?: string;
    snapshot: {
        positions: (Position & {
            levelName?: string;
            employees?: {
                id: string;
                firstName: string;
                lastName: string;
                employeeCode: string;
            }[];
        })[];
    }
};
