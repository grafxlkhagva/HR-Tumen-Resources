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
    reportsToId?: string; // Standardized direct manager position id
    reportsTo?: string;   // Compatibility (legacy field)
    levelId?: string;
    employmentTypeId?: string;
    jobCategoryId?: string;
    workScheduleId?: string;
    isActive?: boolean;
    canApproveAttendance?: boolean;
    canApproveVacation?: boolean;

    filled: number;
    isApproved?: boolean;
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

export type LifecycleStage = 'attraction' | 'recruitment' | 'onboarding' | 'development' | 'retention' | 'offboarding' | 'alumni';

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
    status: 'Идэвхтэй бүрдүүлэлт' | 'Томилогдож буй' | 'Идэвхтэй' | 'Жирэмсний амралттай' | 'Хүүхэд асрах чөлөөтэй' | 'Урт хугацааны чөлөөтэй' | 'Ажлаас гарсан' | 'Түр түдгэлзүүлсэн';
    hireDate: string;
    terminationDate?: string;
    skills?: string[];
    jobHistory?: { title: string; company: string; duration: string }[];
    deviceId?: string;
    questionnaireCompletion?: number;
    lifecycleStage?: LifecycleStage;
    vacationConfig?: {
        baseDays: number;
        calculatedAt?: string; // ISO string
        breakdown?: {
            base: number;
            normalAdditional: number;
            normalMonths: number;
            abnormalAdditional: number;
            abnormalMonths: number;
        };
    };
    /** Нэвтрэх эрх идэвхгүй бол энэ талбар true. */
    loginDisabled?: boolean;
    /** Анкет засах эрхийг түгжих (ажилтан засах боломжгүй). */
    questionnaireLocked?: boolean;
    role?: 'admin' | 'employee';
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
