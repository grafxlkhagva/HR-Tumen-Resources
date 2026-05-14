'use client';

import * as React from 'react';
import { format, eachDayOfInterval, getDay } from 'date-fns';
import {
    useCollection,
    useDoc,
    useFirebase,
    useMemoFirebase,
    tenantCollection,
    useTenantWrite,
} from '@/firebase';
import { collectionGroup, doc, query, where, orderBy, limit } from 'firebase/firestore';
import {
    resolveDayType,
    buildRecurringDayMap,
    type WorkCalendar,
    type DayType,
} from '@/lib/work-calendar-utils';
import { normalizeRequestStatus, REQUEST_STATUS } from '@/lib/attendance-status';
import type { Employee } from '@/app/dashboard/employees/data';
import type { Department, Position, WorkSchedule } from '@/app/dashboard/organization/types';
import type {
    AttendanceRecord,
    TimeOffRequest as CanonicalTimeOffRequest,
    AttendanceRequest as CanonicalAttendanceRequest,
    RequestStatus as CanonicalRequestStatus,
} from '@/types/attendance';

const WEEKDAY_KEY: Record<number, string> = {
    0: 'sunday', 1: 'monday', 2: 'tuesday', 3: 'wednesday',
    4: 'thursday', 5: 'friday', 6: 'saturday',
};

export type ReportStatus =
    | 'NORMAL'
    | 'LATE'
    | 'EARLY_DEPARTURE'
    | 'ABSENT'
    | 'TIME_OFF'
    | 'NO_SCHEDULE'
    | 'NON_WORKING';

export type ReportRow = {
    key: string;
    employeeId: string;
    date: string;
    dayOfWeek: number;
    dayType: DayType;
    expectedStart?: string;
    expectedEnd?: string;
    actualCheckIn?: string;
    actualCheckOut?: string;
    lateMinutes: number;
    earlyMinutes: number;
    /** Хуваарьт цаг (decimal hour). Зөвхөн ажиллах өдөр > 0. */
    expectedHours: number;
    /** Бодит ажилласан цаг (decimal hour). check-in/out хоёулаа байх ёстой. */
    actualHours: number;
    status: ReportStatus;
    manualEntry?: boolean;
};

export type StatusCounts = Record<ReportStatus, number>;

export type WorkScheduleFull = WorkSchedule & {
    category?: string;
    workingDays?: string[];
    startTime?: string;
    endTime?: string;
    isActive?: boolean;
};

export type DayOverride = {
    dayType: DayType;
    hours?: number;
    mode?: 'schedule' | 'manual';
    scheduleId?: string;
};

type EmployeeScheduleDoc = {
    id: string;
    employeeId?: string;
    year?: number;
    month?: number;
    days?: Record<string, DayOverride>;
};

// Канон типийг src/types/attendance.ts-аас авч хэрэглэнэ
export type RequestStatus = CanonicalRequestStatus;
export type TimeOffRequestDoc = CanonicalTimeOffRequest;
export type AttendanceRequestDoc = CanonicalAttendanceRequest;

export type RequestCounts = { timeOff: number; attendance: number };

function timeStrFromISO(iso?: string): string | undefined {
    if (!iso) return undefined;
    try { return format(new Date(iso), 'HH:mm'); } catch { return undefined; }
}

function diffMinutes(a: string, b: string): number {
    const [ah, am] = a.split(':').map(Number);
    const [bh, bm] = b.split(':').map(Number);
    return (ah * 60 + am) - (bh * 60 + bm);
}

export interface UseAttendanceMonthStatsResult {
    rows: ReportRow[];
    counts: StatusCounts;
    workingDays: number;
    /** Сарын нийт фонт цаг (ажлын хуанлид суурилсан, бүх ажилтанд нэг ижил). */
    monthFundHours: number;
    employees: Employee[];
    departments: Department[];
    positions: Position[];
    schedules: WorkScheduleFull[];
    employeeMap: Map<string, Employee>;
    departmentMap: Map<string, Department>;
    rowsByEmployee: Map<string, Map<string, ReportRow>>;
    timeOffsByEmployee: Map<string, TimeOffRequestDoc[]>;
    attendanceRequestsByEmployee: Map<string, AttendanceRequestDoc[]>;
    pendingCountsByEmployee: Map<string, RequestCounts>;
    pendingDayMarks: Map<string, 'timeOff' | 'attendance'>;
    days: Date[];
    isLoading: boolean;
    /** Хүсэлтийн query 500 limit-д хүрсэн — хуучин мэдээлэл алдагдсан байж магадгүй */
    truncated: boolean;
    /** Аль нэг query алдаатай дуусгасан */
    error: unknown;
}

/**
 * Сонгосон сард ажилтан бүрийн өдөр тутмын ирц-vs-хуваарийн харьцуулалтыг тооцно.
 * Status priority:
 *  1) Per-employee per-day override (employee_schedules)
 *  2) Public/company holiday (workCalendars)
 *  3) Schedule.workingDays
 *  4) Company calendar (weekend/working)
 */
export function useAttendanceMonthStats(year: number, month: number): UseAttendanceMonthStatsResult {
    const employeesQuery = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'employees') : null),
        []
    );
    const positionsQuery = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'positions') : null),
        []
    );
    const schedulesQuery = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'workSchedules') : null),
        []
    );
    const departmentsQuery = useMemoFirebase(
        ({ firestore, companyPath }) => (firestore ? tenantCollection(firestore, companyPath, 'departments') : null),
        []
    );
    // employee_schedules дотроос зөвхөн сонгосон (year, month)-той doc-уудыг л татна
    // (доод компатын үүднээс year/month field-гүй хуучин доку доош хасагдана — Хуваарь засварлагч
    //  хадгалахад автоматаар нэмэгддэг)
    const empSchedulesQuery = useMemoFirebase(
        ({ firestore, companyPath }) => {
            if (!firestore) return null;
            return query(
                tenantCollection(firestore, companyPath, 'employee_schedules'),
                where('year', '==', year),
                where('month', '==', month + 1)
            );
        },
        [year, month]
    );

    const { firestore } = useFirebase();
    const { companyPath } = useTenantWrite();

    const calendarDocRef = React.useMemo(
        () => (firestore ? doc(firestore, `workCalendars/calendar_${year}`) : null),
        [firestore, year]
    );

    const monthRange = React.useMemo(() => {
        const from = format(new Date(year, month, 1), 'yyyy-MM-dd');
        const to = format(new Date(year, month + 1, 0), 'yyyy-MM-dd');
        return { from, to };
    }, [year, month]);

    const attendanceQuery = useMemoFirebase(
        ({ firestore, companyPath }) => {
            if (!firestore) return null;
            return query(
                tenantCollection(firestore, companyPath, 'attendance'),
                where('date', '>=', monthRange.from),
                where('date', '<=', monthRange.to),
                orderBy('date', 'asc'),
                limit(2000)
            );
        },
        [monthRange.from, monthRange.to]
    );

    // Бүх төлөвтэй чөлөөний хүсэлт — сонгосон сарт хүрэлцэх хүсэлтийг л татна
    // (`endDate >= monthStart`). Хуучин дууссан хүсэлт татагдахгүй
    const REQUEST_LIMIT = 500;
    const timeOffQuery = useMemoFirebase(
        ({ firestore, companyPath }) => {
            if (!firestore || !companyPath) return null;
            const cid = companyPath.split('/')[1];
            return query(
                collectionGroup(firestore, 'timeOffRequests'),
                where('companyId', '==', cid),
                where('endDate', '>=', monthRange.from),
                orderBy('endDate', 'desc'),
                limit(REQUEST_LIMIT)
            );
        },
        [monthRange.from]
    );

    const attendanceRequestsQuery = useMemoFirebase(
        ({ firestore, companyPath }) => {
            if (!firestore || !companyPath) return null;
            const cid = companyPath.split('/')[1];
            return query(
                collectionGroup(firestore, 'attendanceRequests'),
                where('companyId', '==', cid),
                where('endDate', '>=', monthRange.from),
                orderBy('endDate', 'desc'),
                limit(REQUEST_LIMIT)
            );
        },
        [monthRange.from]
    );

    const { data: employees, isLoading: loadingEmp } = useCollection<Employee>(employeesQuery);
    const { data: positions, isLoading: loadingPos } = useCollection<Position>(positionsQuery);
    const { data: schedules, isLoading: loadingSch } = useCollection<WorkScheduleFull>(schedulesQuery);
    const { data: departments } = useCollection<Department>(departmentsQuery);
    const { data: workCalendar, isLoading: loadingCal } = useDoc<WorkCalendar>(calendarDocRef as any);
    const { data: attendance, isLoading: loadingAtt } = useCollection<AttendanceRecord>(attendanceQuery);
    const { data: timeOffs, isLoading: loadingTo, error: timeOffErr } = useCollection<TimeOffRequestDoc>(timeOffQuery);
    const { data: attendanceRequests, isLoading: loadingAttReq, error: attReqErr } = useCollection<AttendanceRequestDoc>(attendanceRequestsQuery);
    const { data: empSchedules, error: empSchedErr } = useCollection<EmployeeScheduleDoc>(empSchedulesQuery);

    const truncated = (timeOffs?.length ?? 0) >= REQUEST_LIMIT
        || (attendanceRequests?.length ?? 0) >= REQUEST_LIMIT;
    const error = timeOffErr || attReqErr || empSchedErr || null;

    const positionMap = React.useMemo(() => new Map((positions || []).map(p => [p.id, p])), [positions]);
    const scheduleMap = React.useMemo(() => new Map((schedules || []).map(s => [s.id, s])), [schedules]);
    const departmentMap = React.useMemo(() => new Map((departments || []).map(d => [d.id, d])), [departments]);
    const employeeMap = React.useMemo(() => new Map((employees || []).map(e => [e.id, e])), [employees]);

    const attendanceMap = React.useMemo(() => {
        const m = new Map<string, AttendanceRecord>();
        (attendance || []).forEach(r => m.set(`${r.employeeId}_${r.date}`, r));
        return m;
    }, [attendance]);

    const approvedTimeOffByEmployee = React.useMemo(() => {
        const m = new Map<string, TimeOffRequestDoc[]>();
        (timeOffs || []).forEach(t => {
            if (normalizeRequestStatus(t.status) !== REQUEST_STATUS.APPROVED) return;
            if (!m.has(t.employeeId)) m.set(t.employeeId, []);
            m.get(t.employeeId)!.push(t);
        });
        return m;
    }, [timeOffs]);

    const timeOffsByEmployee = React.useMemo(() => {
        const m = new Map<string, TimeOffRequestDoc[]>();
        (timeOffs || []).forEach(t => {
            if (!m.has(t.employeeId)) m.set(t.employeeId, []);
            m.get(t.employeeId)!.push(t);
        });
        return m;
    }, [timeOffs]);

    const attendanceRequestsByEmployee = React.useMemo(() => {
        const m = new Map<string, AttendanceRequestDoc[]>();
        (attendanceRequests || []).forEach(r => {
            if (!m.has(r.employeeId)) m.set(r.employeeId, []);
            m.get(r.employeeId)!.push(r);
        });
        return m;
    }, [attendanceRequests]);

    const pendingCountsByEmployee = React.useMemo(() => {
        const m = new Map<string, RequestCounts>();
        (timeOffs || []).forEach(t => {
            if (normalizeRequestStatus(t.status) !== REQUEST_STATUS.PENDING) return;
            const cur = m.get(t.employeeId) ?? { timeOff: 0, attendance: 0 };
            cur.timeOff++;
            m.set(t.employeeId, cur);
        });
        (attendanceRequests || []).forEach(r => {
            if (normalizeRequestStatus(r.status) !== REQUEST_STATUS.PENDING) return;
            const cur = m.get(r.employeeId) ?? { timeOff: 0, attendance: 0 };
            cur.attendance++;
            m.set(r.employeeId, cur);
        });
        return m;
    }, [timeOffs, attendanceRequests]);

    // Pending хүсэлтийн өдрүүд (matrix дээр indicator харуулах) — `${empId}_${date}` → 'timeOff'|'attendance'
    // Зөвхөн харагдаж байгаа сарын хүрээнд тооцоолно (буруу `endDate=2099-…` гэх мэт өгөгдөлд хамгаалалт)
    const pendingDayMarks = React.useMemo(() => {
        const m = new Map<string, 'timeOff' | 'attendance'>();
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 0);
        const addRange = (empId: string, startDate: string, endDate: string, kind: 'timeOff' | 'attendance') => {
            const s = (startDate || '').slice(0, 10);
            const e = (endDate || startDate || '').slice(0, 10);
            if (!s) return;
            const rawStart = new Date(s + 'T00:00:00');
            const rawEnd = new Date((e || s) + 'T00:00:00');
            // Сарын хүрээнд clamp хийж, давталтыг хязгаарлая
            const start = rawStart < monthStart ? monthStart : rawStart;
            const end = rawEnd > monthEnd ? monthEnd : rawEnd;
            if (start > end) return;
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const key = `${empId}_${format(d, 'yyyy-MM-dd')}`;
                if (!m.has(key)) m.set(key, kind);
            }
        };
        (timeOffs || []).forEach(t => {
            if (normalizeRequestStatus(t.status) === REQUEST_STATUS.PENDING) {
                addRange(t.employeeId, t.startDate, t.endDate, 'timeOff');
            }
        });
        (attendanceRequests || []).forEach(r => {
            if (normalizeRequestStatus(r.status) === REQUEST_STATUS.PENDING) {
                addRange(r.employeeId, r.startDate, r.endDate, 'attendance');
            }
        });
        return m;
    }, [timeOffs, attendanceRequests, year, month]);

    // Query нь сарын хүрээгээр шүүгдсэн тул бүх result-ыг шууд авна
    const dayOverrideMap = React.useMemo(() => {
        const m = new Map<string, DayOverride>();
        const suffix = `_${year}_${month + 1}`;
        (empSchedules || []).forEach(d => {
            // employeeId field-г илүүд үзнэ; үгүй бол хуучин doc id pattern-аас задлая
            const empId = d.employeeId
                ?? (d.id?.endsWith(suffix) ? d.id.slice(0, d.id.length - suffix.length) : null);
            if (!empId) return;
            Object.entries(d.days || {}).forEach(([date, override]) => {
                if (override) m.set(`${empId}_${date}`, override);
            });
        });
        return m;
    }, [empSchedules, year, month]);

    const recurringMap = React.useMemo(() => buildRecurringDayMap(workCalendar ?? null), [workCalendar]);

    const days = React.useMemo(() => eachDayOfInterval({
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
    }), [year, month]);

    const activeEmployees = React.useMemo(() => {
        return (employees || []).filter(e => {
            const status = (e as any).status;
            return status !== 'inactive' && status !== 'terminated';
        });
    }, [employees]);

    const rows: ReportRow[] = React.useMemo(() => {
        if (!employees || !positions || !schedules) return [];
        const out: ReportRow[] = [];

        activeEmployees.forEach(emp => {
            const positionId = (emp as any).positionId;
            const position = positionId ? positionMap.get(positionId) : undefined;
            const scheduleId = (position as any)?.workScheduleId;
            const schedule = scheduleId ? scheduleMap.get(scheduleId) : undefined;
            const empTimeOffs = approvedTimeOffByEmployee.get(emp.id) || [];

            days.forEach(date => {
                const dateStr = format(date, 'yyyy-MM-dd');
                const dow = getDay(date);
                const dayType = resolveDayType(date, workCalendar ?? null, recurringMap);
                const isHoliday = dayType === 'public_holiday' || dayType === 'company_holiday';
                const record = attendanceMap.get(`${emp.id}_${dateStr}`);

                const override = dayOverrideMap.get(`${emp.id}_${dateStr}`);
                let isScheduledWorkingDay: boolean;
                let activeSchedule: WorkScheduleFull | undefined = schedule;
                if (override?.scheduleId) {
                    activeSchedule = scheduleMap.get(override.scheduleId) ?? schedule;
                }
                if (override) {
                    isScheduledWorkingDay =
                        override.dayType === 'working'
                        || override.dayType === 'special_working'
                        || override.dayType === 'half_day';
                } else if (isHoliday) {
                    isScheduledWorkingDay = false;
                } else if (schedule?.workingDays && Array.isArray(schedule.workingDays) && schedule.workingDays.length > 0) {
                    isScheduledWorkingDay = schedule.workingDays.includes(WEEKDAY_KEY[dow]);
                } else {
                    isScheduledWorkingDay =
                        dayType === 'working' || dayType === 'special_working' || dayType === 'half_day';
                }

                let expectedStart: string | undefined;
                let expectedEnd: string | undefined;
                if (isScheduledWorkingDay && activeSchedule && ['fixed', 'shift'].includes(activeSchedule.category || '')) {
                    expectedStart = activeSchedule.startTime;
                    expectedEnd = activeSchedule.endTime;
                }

                const onTimeOff = empTimeOffs.some(t => {
                    const ts = (t.startDate || '').slice(0, 10);
                    const te = (t.endDate || '').slice(0, 10);
                    return ts && te && dateStr >= ts && dateStr <= te;
                });

                let status: ReportStatus = 'NORMAL';
                let lateMinutes = 0;
                let earlyMinutes = 0;
                const actualCheckIn = timeStrFromISO(record?.checkInTime);
                const actualCheckOut = timeStrFromISO(record?.checkOutTime);

                if (!isScheduledWorkingDay) {
                    status = 'NON_WORKING';
                } else if (!schedule && !override) {
                    status = record ? 'NORMAL' : 'NO_SCHEDULE';
                } else if (onTimeOff) {
                    status = 'TIME_OFF';
                } else if (!record) {
                    status = 'ABSENT';
                } else {
                    if (record.status === 'LATE') status = 'LATE';
                    else if (record.status === 'EARLY_DEPARTURE') status = 'EARLY_DEPARTURE';

                    if (expectedStart && actualCheckIn) {
                        const diff = diffMinutes(actualCheckIn, expectedStart);
                        if (diff > 0) {
                            lateMinutes = diff;
                            if (status === 'NORMAL') status = 'LATE';
                        }
                    }
                    if (expectedEnd && actualCheckOut) {
                        const diff = diffMinutes(expectedEnd, actualCheckOut);
                        if (diff > 0) {
                            earlyMinutes = diff;
                            if (status === 'NORMAL') status = 'EARLY_DEPARTURE';
                        }
                    }
                }

                // Хуваарьт цагийн нийлбэр (decimal hour)
                let expectedHours = 0;
                if (isScheduledWorkingDay) {
                    if (override?.hours !== undefined && override.hours > 0) {
                        expectedHours = override.hours;
                    } else if (expectedStart && expectedEnd) {
                        const startMin = (() => {
                            const [h, m] = expectedStart.split(':').map(Number);
                            return h * 60 + m;
                        })();
                        const endMin = (() => {
                            const [h, m] = expectedEnd.split(':').map(Number);
                            return h * 60 + m;
                        })();
                        if (endMin > startMin) expectedHours = (endMin - startMin) / 60;
                    } else if (activeSchedule?.category === 'flex' && (activeSchedule as any).flexTotalHours) {
                        expectedHours = (activeSchedule as any).flexTotalHours;
                    } else if (activeSchedule?.category === 'remote' && (activeSchedule as any).remoteTotalHoursDay) {
                        expectedHours = (activeSchedule as any).remoteTotalHoursDay;
                    }
                }

                // Бодит ажилласан цагийн нийлбэр (check-in → check-out зөрүү)
                let actualHours = 0;
                if (record?.checkInTime && record?.checkOutTime) {
                    const inMs = new Date(record.checkInTime).getTime();
                    const outMs = new Date(record.checkOutTime).getTime();
                    if (!isNaN(inMs) && !isNaN(outMs) && outMs > inMs) {
                        actualHours = (outMs - inMs) / 3_600_000;
                    }
                }

                out.push({
                    key: `${emp.id}_${dateStr}`,
                    employeeId: emp.id,
                    date: dateStr,
                    dayOfWeek: dow,
                    dayType,
                    expectedStart,
                    expectedEnd,
                    actualCheckIn,
                    actualCheckOut,
                    lateMinutes,
                    earlyMinutes,
                    expectedHours,
                    actualHours,
                    status,
                    manualEntry: (record as any)?.manualEntry,
                });
            });
        });

        return out;
    }, [
        // employees/positions/schedules — Map-уудаар дамжсан тул давхардуулсангүй
        activeEmployees, positionMap, scheduleMap,
        approvedTimeOffByEmployee, attendanceMap,
        workCalendar, recurringMap, dayOverrideMap, days,
    ]);

    const rowsByEmployee = React.useMemo(() => {
        const m = new Map<string, Map<string, ReportRow>>();
        rows.forEach(r => {
            if (!m.has(r.employeeId)) m.set(r.employeeId, new Map());
            m.get(r.employeeId)!.set(r.date, r);
        });
        return m;
    }, [rows]);

    const counts = React.useMemo(() => {
        const c: StatusCounts = {
            NORMAL: 0, LATE: 0, EARLY_DEPARTURE: 0, ABSENT: 0,
            TIME_OFF: 0, NO_SCHEDULE: 0, NON_WORKING: 0,
        };
        rows.forEach(r => { c[r.status]++; });
        return c;
    }, [rows]);

    const workingDays = counts.NORMAL + counts.LATE + counts.EARLY_DEPARTURE
        + counts.ABSENT + counts.TIME_OFF + counts.NO_SCHEDULE;

    // Сарын нийт фонт цаг — workCalendar-аас тооцоолно
    const monthFundHours = React.useMemo(() => {
        const standardHours = (workCalendar as any)?.workingTimeRules?.standardWorkingHoursPerDay ?? 8;
        const halfDayHours = (workCalendar as any)?.workingTimeRules?.halfDayHours ?? 4;
        let total = 0;
        days.forEach(d => {
            const dt = resolveDayType(d, workCalendar ?? null, recurringMap);
            const dayData = (workCalendar as any)?.days?.[format(d, 'yyyy-MM-dd')];
            if (dt === 'working' || dt === 'special_working') {
                total += dayData?.workingHours ?? standardHours;
            } else if (dt === 'half_day') {
                total += dayData?.workingHours ?? halfDayHours;
            }
        });
        return total;
    }, [days, workCalendar, recurringMap]);

    const isLoading = loadingEmp || loadingPos || loadingSch || loadingCal || loadingAtt || loadingTo || loadingAttReq;

    return {
        rows,
        counts,
        workingDays,
        monthFundHours,
        employees: activeEmployees,
        departments: departments || [],
        positions: positions || [],
        schedules: schedules || [],
        employeeMap,
        departmentMap,
        rowsByEmployee,
        timeOffsByEmployee,
        attendanceRequestsByEmployee,
        pendingCountsByEmployee,
        pendingDayMarks,
        days,
        isLoading,
        truncated,
        error,
    };
}
