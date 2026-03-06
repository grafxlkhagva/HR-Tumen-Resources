import { addDays, format, getDay, startOfDay } from 'date-fns';

export type DayType =
    | 'working'
    | 'weekend'
    | 'public_holiday'
    | 'company_holiday'
    | 'special_working'
    | 'half_day';

export type CalendarDay = {
    date: string; // YYYY-MM-DD
    dayType: DayType;
    isRecurring?: boolean;
    workingHours?: number;
};

export type WorkCalendar = {
    id?: string;
    weekendDays: number[]; // 0=Sun..6=Sat
    days?: Record<string, CalendarDay>;
};

export type RecurringDayMap = Map<string, CalendarDay>; // key: MM-DD

export function buildRecurringDayMap(calendar: WorkCalendar | null | undefined): RecurringDayMap {
    const map: RecurringDayMap = new Map();
    const days = calendar?.days;
    if (!days) return map;

    Object.values(days).forEach((day) => {
        if (!day?.isRecurring) return;
        if (day.dayType !== 'public_holiday' && day.dayType !== 'company_holiday') return;
        // day.date is YYYY-MM-DD
        const [, monthStr, dayStr] = day.date.split('-');
        if (!monthStr || !dayStr) return;
        map.set(`${monthStr}-${dayStr}`, day);
    });

    return map;
}

export function resolveDayType(date: Date, calendar: WorkCalendar | null | undefined, recurringMap?: RecurringDayMap): DayType {
    const cal = calendar;
    const dateStr = format(date, 'yyyy-MM-dd');

    // 1) Specific date config
    const specific = cal?.days?.[dateStr];
    if (specific?.dayType) return specific.dayType;

    // 2) Recurring holiday (MM-DD)
    const mmdd = format(date, 'MM-dd');
    const recurring = recurringMap?.get(mmdd);
    if (recurring?.dayType) return recurring.dayType;

    // 3) Weekend by calendar weekendDays
    const dow = getDay(date); // 0=Sun..6=Sat
    if (Array.isArray(cal?.weekendDays) && cal!.weekendDays.includes(dow)) return 'weekend';

    // 4) Default working
    return 'working';
}

export function getVacationDayUnits(dayType: DayType): number {
    switch (dayType) {
        case 'working':
        case 'special_working':
            return 1;
        case 'half_day':
            return 0.5;
        case 'weekend':
        case 'public_holiday':
        case 'company_holiday':
        default:
            return 0;
    }
}

export function isVacationSelectableDayType(dayType: DayType): boolean {
    return getVacationDayUnits(dayType) > 0;
}

export function roundToHalf(n: number): number {
    return Math.round(n * 2) / 2;
}

export function countVacationUnitsInclusive(
    start: Date,
    end: Date,
    calendar: WorkCalendar | null | undefined,
    recurringMap?: RecurringDayMap
): number {
    const s = startOfDay(start);
    const e = startOfDay(end);

    let total = 0;
    for (let cur = s; cur <= e; cur = addDays(cur, 1)) {
        const dt = resolveDayType(cur, calendar, recurringMap);
        total += getVacationDayUnits(dt);
    }
    return roundToHalf(total);
}

export function formatVacationUnits(units: number): string {
    const rounded = roundToHalf(units);
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

