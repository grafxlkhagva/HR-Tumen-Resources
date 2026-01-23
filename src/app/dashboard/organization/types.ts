export type Department = {
    id: string;
    name: string;
    typeId?: string;
    parentId?: string;
    // Locally computed properties
    children?: Department[];
    filled: number;
    approvedCount?: number;
    typeName?: string;
    typeLevel?: number;
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
    level: number;
};

export type Position = {
    id: string;
    title: string;
    code?: string;
    departmentId: string;
    filled: number;
    reportsToId?: string; // Standardized
    reportsTo?: string; // Compatibility
    levelId?: string;
    employmentTypeId?: string;
    jobCategoryId?: string;
    workScheduleId?: string;
    companyType?: 'main' | 'subsidiary'; // main company or subsidiary
    subsidiaryName?: string; // Name of subsidiary if companyType is 'subsidiary'
    isActive?: boolean;
    createdAt?: string;
    canApproveAttendance?: boolean;
    canApproveVacation?: boolean;
    hasPointBudget?: boolean;
    yearlyPointBudget?: number;
    remainingPointBudget?: number;
    onboardingProgramIds?: string[];
    offboardingProgramIds?: string[];
    isApproved?: boolean;
    approvedAt?: string;
    approvedBy?: string;
    approvedByName?: string;
    disapprovedAt?: string;
    disapprovedBy?: string;
    disapprovedByName?: string;
    approvalHistory?: ApprovalLog[];
    purpose?: string;
    responsibilities?: { title: string; description: string }[];
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
        isRemoteAllowed?: boolean;
        flexibleHours?: boolean;
        vacationDays?: number;
        otherBenefits?: string[];
    };
    salaryRange?: {
        min: number;
        max: number;
        currency: string;
        id?: string; // Linked preset ID
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
    permissions?: {
        canApproveVacation: boolean;
        canApproveLeave: boolean;
    };
    budget?: {
        yearlyBudget: number;
        currency: string;
    };
    jobDescriptionFile?: {
        name: string;
        url: string;
        size: number;
        uploadedAt: string;
    };
    skills?: {
        name: string;
        level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    }[];
    experience?: {
        totalYears: number;
        educationLevel: string;
        leadershipYears?: number;
        professions?: string[];
    };
    salarySteps?: {
        items: {
            name: string;
            value: number;
        }[];
        activeIndex: number;
        currency: string;
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

export type SalaryRangeVersion = {
    id: string;
    name: string;
    min: number;
    max: number;
    currency: string;
}

export type DepartmentHistory = {
    id: string;
    departmentId: string;
    approvedAt: string;
    validTo?: string;
    isDissolution?: boolean;
    snapshot: {
        departmentName?: string;
        disbandReason?: string;
        disbandedAt?: string;
        disbandedByName?: string;
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
