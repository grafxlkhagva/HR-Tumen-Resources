import { DocumentReference, Timestamp } from 'firebase/firestore';

export interface Department {
    id: string;
    name: string;
    color?: string;
}

export interface DepartmentType {
    id: string;
    name: string;
}

export interface Position {
    id: string;
    title: string;
    departmentId: string;
    reportsTo?: string;
    levelId?: string;
    employmentTypeId?: string;
    jobCategoryId?: string;
    workScheduleId?: string;
    isActive?: boolean;
    canApproveAttendance?: boolean;
    filled: number;
    description?: string;
    createdAt?: any;
}

export interface PositionLevel {
    id: string;
    name: string;
    value: number;
}

export interface EmploymentType {
    id: string;
    name: string;
}

export interface JobCategory {
    id: string;
    name: string;
}

export interface WorkSchedule {
    id: string;
    name: string;
}

export interface Employee {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    avatarId?: string;
    photoURL?: string;
    jobTitle: string;
    departmentId: string;
    positionId?: string;
    email: string;
    phoneNumber?: string;
    status: 'Идэвхтэй' | 'Жирэмсний амралттай' | 'Хүүхэд асрах чөлөөтэй' | 'Урт хугацааны чөлөөтэй' | 'Ажлаас гарсан' | 'Түр түдгэлзүүлсэн';
    hireDate: string;
    terminationDate?: string;
    skills?: string[];
    jobHistory?: { title: string; company: string; duration: string }[];
    deviceId?: string;
    questionnaireCompletion?: number;
}

export interface OnboardingProgram {
    id: string;
    title: string;
    description?: string;
    type: 'ONBOARDING' | 'OFFBOARDING';
    taskCount: number;
    stageCount: number;
    appliesTo?: {
        departmentIds?: string[];
        positionIds?: string[];
    };
    departmentIds?: string[];
    positionIds?: string[];
}

export interface OnboardingTaskTemplate {
    id: string;
    title: string;
    description?: string;
    assigneeType: 'NEW_HIRE' | 'MANAGER' | 'HR' | 'BUDDY' | 'SPECIFIC_PERSON' | 'DIRECT_MANAGER';
    dueDays: number;
    attachmentUrl?: string;
    attachmentName?: string;
    requiresVerification?: boolean;
    verificationRole?: 'MANAGER' | 'HR' | 'BUDDY' | 'DIRECT_MANAGER';
    guideEmployeeIds?: string[];
}

export interface OnboardingStage {
    id: string;
    title: string;
    order: number;
    tasks?: OnboardingTaskTemplate[];
}

export interface AssignedProgram {
    id: string;
    programId: string;
    employeeId: string;
    status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    progress: number;
    startDate: string;
    completedDate?: string;
    stages: AssignedStage[];
    title: string;
    description?: string;
}

export interface AssignedStage {
    stageId: string;
    title: string;
    order: number;
    tasks: AssignedTask[];
}

export interface AssignedTask {
    id: string;
    templateTaskId: string;
    title: string;
    description?: string;
    status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'VERIFIED';
    assigneeType: string;
    assignedToId?: string;
    dueDays: number;
    completedAt?: any;
    verifiedAt?: any;
    verifiedById?: string;
    requiresVerification?: boolean;
    verificationRole?: string;
    attachmentUrl?: string;
    attachmentName?: string;
    resultAttachmentUrl?: string;
    resultAttachmentName?: string;
    comment?: string;
}

export interface AttendanceRecord {
    id: string;
    employeeId: string;
    date: string;
    checkInTime: string;
    checkInLocationId?: string;
    checkInLocationName?: string;
    checkOutTime?: string;
    checkOutLocationId?: string;
    checkOutLocationName?: string;
    status: 'PRESENT' | 'LEFT' | 'LATE' | 'EARLY_DEPARTURE';
    lat?: number;
    lng?: number;
}

export interface AttendanceLocation {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    address?: string;
    isActive: boolean;
}

export type ReferenceItem = { id: string; name: string };
