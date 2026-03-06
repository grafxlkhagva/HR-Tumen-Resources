// Attendance Types

export type AttendanceStatus = 'PRESENT' | 'LEFT' | 'LATE' | 'EARLY_DEPARTURE';
export type RequestStatus = 'Хүлээгдэж буй' | 'Зөвшөөрсөн' | 'Татгалзсан';
export type AttendanceRequestType = 'OVERTIME' | 'LATE_ARRIVAL' | 'REMOTE_WORK' | 'CORRECTION';
export type BreakType = 'LUNCH' | 'SHORT';

export interface AttendanceRecord {
    id: string;
    employeeId: string;
    date: string; // yyyy-MM-dd
    checkInTime: string;
    checkInLocationId?: string;
    checkInLocationName?: string;
    checkOutTime?: string;
    checkOutLocationId?: string;
    checkOutLocationName?: string;
    status: AttendanceStatus;
    lat?: number;
    lng?: number;
    breaks?: BreakRecord[];
    totalBreakMinutes?: number;
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

export interface TimeOffRequest {
    id: string;
    employeeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    type: string;
    status: RequestStatus;
    createdAt: string;
    approverId: string;
    approverName: string;
}

export interface AttendanceRequest {
    id: string;
    employeeId: string;
    startDate: string;
    endDate: string;
    reason: string;
    type: AttendanceRequestType;
    startTime?: string;
    endTime?: string;
    hours?: number;
    status: RequestStatus;
    createdAt: string;
    approverId: string;
    approverName: string;
}

export interface BreakRecord {
    id: string;
    employeeId: string;
    attendanceId: string;
    startTime: string;
    endTime?: string;
    type: BreakType;
    durationMinutes?: number;
}

export interface TimeOffRequestConfig {
    requestDeadlineDays: number;
}

export interface Position {
    id: string;
    workScheduleId?: string;
    canApproveAttendance?: boolean;
}

export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    positionId?: string;
    deviceId?: string;
    photoURL?: string;
}

export interface ReferenceItem {
    id: string;
    name: string;
}

// Status config for badges
export const statusConfig: Record<RequestStatus, { 
    variant: 'default' | 'secondary' | 'destructive' | 'outline'; 
    className: string; 
    label: string;
}> = {
    "Хүлээгдэж буй": { variant: 'secondary', className: 'bg-yellow-500/80 text-yellow-foreground', label: 'Хүлээгдэж буй' },
    "Зөвшөөрсөн": { variant: 'default', className: 'bg-green-500/80 text-green-foreground', label: 'Зөвшөөрсөн' },
    "Татгалзсан": { variant: 'destructive', className: '', label: 'Татгалзсан' },
};

export const attendanceRequestTypeLabels: Record<AttendanceRequestType, string> = {
    'OVERTIME': 'Илүү цаг',
    'LATE_ARRIVAL': 'Хоцролт',
    'REMOTE_WORK': 'Гадуур ажиллах',
    'CORRECTION': 'Ирц засах',
};

export const breakTypeLabels: Record<BreakType, string> = {
    'LUNCH': 'Өдрийн хоол',
    'SHORT': 'Богино амралт',
};
