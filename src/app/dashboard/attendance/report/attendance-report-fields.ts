import { Employee, Department } from '@/types';
import { calculateDuration } from '@/lib/attendance';
import { format } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────
export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  checkInTime: string;
  checkOutTime?: string;
  status?: string;
};

export interface AttendanceReportField {
  key: string;
  label: string;
  group: string;
  getValue: (
    record: AttendanceRecord,
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

// ─── Helpers ────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Хэвийн',
  LEFT: 'Явсан',
  LATE: 'Хоцорсон',
  EARLY_DEPARTURE: 'Эрт явсан',
};

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
        getValue: (_r, emp) => emp?.jobTitle || '',
      },
      {
        key: 'department',
        label: 'Хэлтэс',
        group: 'employee',
        getValue: (_r, emp, depts) =>
          emp?.departmentId ? depts.get(emp.departmentId) || '' : '',
      },
    ],
  },
  {
    key: 'attendance',
    label: 'Ирцийн бүртгэл',
    fields: [
      {
        key: 'date',
        label: 'Огноо',
        group: 'attendance',
        getValue: (r) => format(new Date(r.date), 'yyyy.MM.dd'),
      },
      {
        key: 'checkInTime',
        label: 'Ирсэн цаг',
        group: 'attendance',
        getValue: (r) =>
          r.checkInTime ? format(new Date(r.checkInTime), 'HH:mm') : '—',
      },
      {
        key: 'checkOutTime',
        label: 'Явсан цаг',
        group: 'attendance',
        getValue: (r) =>
          r.checkOutTime ? format(new Date(r.checkOutTime), 'HH:mm') : '—',
      },
      {
        key: 'duration',
        label: 'Нийт цаг',
        group: 'attendance',
        getValue: (r) => calculateDuration(r.checkInTime, r.checkOutTime),
      },
      {
        key: 'status',
        label: 'Төлөв',
        group: 'attendance',
        getValue: (r) => STATUS_LABELS[r.status || ''] || r.status || '—',
      },
    ],
  },
];

export const ATTENDANCE_REPORT_PRESETS: AttendanceReportPreset[] = [
  {
    key: 'basic',
    label: 'Үндсэн',
    description: 'Код, Нэр, Огноо, Ирсэн/Явсан цаг, Нийт',
    fieldKeys: [
      'employeeCode',
      'lastName',
      'firstName',
      'date',
      'checkInTime',
      'checkOutTime',
      'duration',
    ],
  },
  {
    key: 'full',
    label: 'Бүрэн',
    description: 'Бүх ажилтан + ирцийн мэдээлэл',
    fieldKeys: [
      'employeeCode',
      'lastName',
      'firstName',
      'jobTitle',
      'department',
      'date',
      'checkInTime',
      'checkOutTime',
      'duration',
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
      'duration',
    ],
  },
];
