import type { Employee, Department } from '@/types';
import type { ReportRow } from '@/app/dashboard/attendance/hooks/use-attendance-month-stats';
import { format } from 'date-fns';

const MN_WEEKDAY_SHORT = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

const STATUS_LABELS: Record<string, string> = {
    NORMAL: 'Хэвийн',
    LATE: 'Хоцорсон',
    EARLY_DEPARTURE: 'Эрт явсан',
    ABSENT: 'Ирээгүй',
    TIME_OFF: 'Чөлөөтэй',
    NO_SCHEDULE: 'Хуваарьгүй',
    NON_WORKING: 'Амралт',
};

function fmtHours(h: number): string {
    if (!h || h <= 0) return '';
    const r = Math.round(h * 10) / 10;
    return Number.isInteger(r) ? `${r}` : `${r.toFixed(1)}`;
}

function fmtMinAsHours(min: number): string {
    if (!min || min <= 0) return '';
    if (min < 60) return `${min}м`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m === 0 ? `${h}ц` : `${h}ц ${m}м`;
}

export interface AttendanceReportField {
    key: string;
    label: string;
    group: string;
    /** Detail mode-д нэг ReportRow-аас утга гаргана */
    getValue: (
        row: ReportRow,
        employee: Employee | null,
        departmentMap: Map<string, string>,
    ) => string | number;
}

export interface AttendanceReportFieldGroup {
    key: string;
    label: string;
    fields: AttendanceReportField[];
}

export interface AttendanceReportPreset {
    key: string;
    label: string;
    description: string;
    fieldKeys: string[];
}

// ─── Field definitions ──────────────────────────────────────────────────────

export const ATTENDANCE_REPORT_FIELD_GROUPS: AttendanceReportFieldGroup[] = [
    {
        key: 'employee',
        label: 'Ажилтан',
        fields: [
            {
                key: 'employeeCode',
                label: 'Ажилтны код',
                group: 'employee',
                getValue: (_r, emp) => emp?.employeeCode || '',
            },
            {
                key: 'lastName',
                label: 'Овог',
                group: 'employee',
                getValue: (_r, emp) => emp?.lastName || '',
            },
            {
                key: 'firstName',
                label: 'Нэр',
                group: 'employee',
                getValue: (_r, emp) => emp?.firstName || '',
            },
            {
                key: 'jobTitle',
                label: 'Албан тушаал',
                group: 'employee',
                getValue: (_r, emp) => (emp as any)?.jobTitle || '',
            },
            {
                key: 'department',
                label: 'Хэлтэс',
                group: 'employee',
                getValue: (_r, emp, depts) =>
                    (emp as any)?.departmentId ? depts.get((emp as any).departmentId) || '' : '',
            },
        ],
    },
    {
        key: 'date',
        label: 'Огноо',
        fields: [
            {
                key: 'date',
                label: 'Огноо',
                group: 'date',
                getValue: r => r.date,
            },
            {
                key: 'weekday',
                label: 'Гараг',
                group: 'date',
                getValue: r => MN_WEEKDAY_SHORT[r.dayOfWeek] ?? '',
            },
        ],
    },
    {
        key: 'schedule',
        label: 'Хуваарь',
        fields: [
            {
                key: 'expectedStart',
                label: 'Хүлээгдсэн эхлэх',
                group: 'schedule',
                getValue: r => r.expectedStart || '',
            },
            {
                key: 'expectedEnd',
                label: 'Хүлээгдсэн дуусах',
                group: 'schedule',
                getValue: r => r.expectedEnd || '',
            },
            {
                key: 'expectedHours',
                label: 'Хуваарьт цаг',
                group: 'schedule',
                getValue: r => fmtHours(r.expectedHours),
            },
        ],
    },
    {
        key: 'attendance',
        label: 'Бодит ирц',
        fields: [
            {
                key: 'checkInTime',
                label: 'Ирсэн цаг',
                group: 'attendance',
                getValue: r => r.actualCheckIn || '',
            },
            {
                key: 'checkOutTime',
                label: 'Явсан цаг',
                group: 'attendance',
                getValue: r => r.actualCheckOut || '',
            },
            {
                key: 'actualHours',
                label: 'Бодит цаг',
                group: 'attendance',
                getValue: r => fmtHours(r.actualHours),
            },
            {
                key: 'lateMinutes',
                label: 'Хоцролт',
                group: 'attendance',
                getValue: r => fmtMinAsHours(r.lateMinutes),
            },
            {
                key: 'earlyMinutes',
                label: 'Эрт явсан',
                group: 'attendance',
                getValue: r => fmtMinAsHours(r.earlyMinutes),
            },
            {
                key: 'status',
                label: 'Төлөв',
                group: 'attendance',
                getValue: r => STATUS_LABELS[r.status] ?? r.status,
            },
        ],
    },
    {
        key: 'audit',
        label: 'Аудит',
        fields: [
            {
                key: 'manualEntry',
                label: 'Гараар бүртгэсэн',
                group: 'audit',
                getValue: r => (r.manualEntry ? 'Тийм' : ''),
            },
        ],
    },
];

export const ATTENDANCE_REPORT_PRESETS: AttendanceReportPreset[] = [
    {
        key: 'basic',
        label: 'Үндсэн',
        description: 'Код, Нэр, Огноо, Ирсэн/Явсан цаг, Нийт цаг',
        fieldKeys: [
            'employeeCode',
            'lastName',
            'firstName',
            'date',
            'checkInTime',
            'checkOutTime',
            'actualHours',
        ],
    },
    {
        key: 'full',
        label: 'Бүрэн',
        description: 'Хуваарь vs бодит харьцуулалт + статус',
        fieldKeys: [
            'employeeCode',
            'lastName',
            'firstName',
            'department',
            'date',
            'weekday',
            'expectedStart',
            'expectedEnd',
            'checkInTime',
            'checkOutTime',
            'expectedHours',
            'actualHours',
            'lateMinutes',
            'earlyMinutes',
            'status',
        ],
    },
    {
        key: 'byDept',
        label: 'Хэлтсээр',
        description: 'Хэлтэс, ажилтан, ирцийн мэдээлэл',
        fieldKeys: [
            'department',
            'employeeCode',
            'lastName',
            'firstName',
            'date',
            'checkInTime',
            'checkOutTime',
            'actualHours',
            'status',
        ],
    },
    {
        key: 'lateOnly',
        label: 'Хоцорсон',
        description: 'Зөвхөн хоцорсон болон эрт явсан өдрүүд',
        fieldKeys: [
            'employeeCode',
            'lastName',
            'firstName',
            'department',
            'date',
            'expectedStart',
            'checkInTime',
            'lateMinutes',
            'earlyMinutes',
            'status',
        ],
    },
    {
        key: 'audit',
        label: 'Аудит',
        description: 'Гараар бүртгэсэн ирцүүд',
        fieldKeys: [
            'employeeCode',
            'lastName',
            'firstName',
            'date',
            'checkInTime',
            'checkOutTime',
            'manualEntry',
            'status',
        ],
    },
];

// ─── Summary mode ─────────────────────────────────────────────────────────────
// Нэг ажилтан = 1 мөр. Сарын нэгтгэл.

export interface AttendanceSummaryField {
    key: string;
    label: string;
}

export const ATTENDANCE_SUMMARY_FIELDS: AttendanceSummaryField[] = [
    { key: 'employeeCode', label: 'Ажилтны код' },
    { key: 'lastName', label: 'Овог' },
    { key: 'firstName', label: 'Нэр' },
    { key: 'department', label: 'Хэлтэс' },
    { key: 'workDays', label: 'Ажлын өдөр' },
    { key: 'normalDays', label: 'Хэвийн' },
    { key: 'lateDays', label: 'Хоцорсон' },
    { key: 'earlyDays', label: 'Эрт явсан' },
    { key: 'absentDays', label: 'Ирээгүй' },
    { key: 'timeOffDays', label: 'Чөлөөтэй' },
    { key: 'totalLate', label: 'Нийт хоцролт' },
    { key: 'totalEarly', label: 'Нийт эрт явсан' },
    { key: 'scheduledHours', label: 'Хуваарьт цаг' },
    { key: 'actualHours', label: 'Гүйцэтгэл цаг' },
    { key: 'attendanceRate', label: 'Гүйцэтгэлийн %' },
];
