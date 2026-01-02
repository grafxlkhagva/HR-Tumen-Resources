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
