export type VacationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type VacationSplit = {
    start: string;
    end: string;
    days: number;
};

export type VacationRequest = {
    id: string;
    employeeId: string;
    startDate: string; // ISO Date
    endDate: string;   // ISO Date
    totalDays: number;
    status: VacationStatus;
    requestDate: string; // ISO Date string
    reason?: string;
    splits?: VacationSplit[];

    // Approval
    approverId?: string;
    approvedAt?: string;
    decisionAt?: string;
    rejectionReason?: string;

    // Work Year Context
    workYearStart: string;
    workYearEnd: string;
};

export type EmployeeVacationConfig = {
    baseDays: number; // e.g., 15 days
    carryOverDays?: number; // Days carried over from last year (optional for future)
    customEntitlement?: number; // Override calculation
};
