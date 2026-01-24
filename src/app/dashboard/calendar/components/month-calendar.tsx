'use client';

import { useMemo } from 'react';
import { CalendarDay, DayType, WorkCalendar } from '../types';
import { DayCell } from './day-cell';
import { 
    startOfMonth, 
    endOfMonth, 
    startOfWeek, 
    endOfWeek, 
    eachDayOfInterval,
    format,
    isSameMonth,
    isToday,
    getDay,
    getMonth,
    getDate
} from 'date-fns';
import { mn } from 'date-fns/locale';

interface MonthCalendarProps {
    year: number;
    month: number; // 0-indexed (0 = January)
    calendar: WorkCalendar | null;
    onDayClick?: (date: Date) => void;
    selectedDate?: Date | null;
    compact?: boolean;
}

const WEEKDAY_LABELS = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

export function MonthCalendar({
    year,
    month,
    calendar,
    onDayClick,
    selectedDate,
    compact = false,
}: MonthCalendarProps) {
    const monthDate = useMemo(() => new Date(year, month, 1), [year, month]);
    
    const days = useMemo(() => {
        const start = startOfWeek(startOfMonth(monthDate), { weekStartsOn: 1 });
        const end = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
        return eachDayOfInterval({ start, end });
    }, [monthDate]);

    // Жил бүр давтагдах баярын өдрүүдийг Map болгон бэлтгэх (MM-DD -> CalendarDay)
    const recurringHolidays = useMemo(() => {
        const holidays = new Map<string, CalendarDay>();
        if (calendar?.days) {
            Object.values(calendar.days).forEach((day) => {
                if (day.isRecurring && (day.dayType === 'public_holiday' || day.dayType === 'company_holiday')) {
                    const [, monthStr, dayStr] = day.date.split('-');
                    const key = `${monthStr}-${dayStr}`;
                    holidays.set(key, day);
                }
            });
        }
        return holidays;
    }, [calendar?.days]);

    // Жил бүр давтагдах үйл явдлуудыг Map болгон бэлтгэх (MM-DD -> CalendarEvent[])
    const recurringEvents = useMemo(() => {
        const eventsMap = new Map<string, CalendarDay['events']>();
        if (calendar?.days) {
            Object.values(calendar.days).forEach((day) => {
                if (day.events && day.events.length > 0) {
                    const recurringEventsForDay = day.events.filter(e => e.isRecurring);
                    if (recurringEventsForDay.length > 0) {
                        const [, monthStr, dayStr] = day.date.split('-');
                        const key = `${monthStr}-${dayStr}`;
                        const existing = eventsMap.get(key) || [];
                        eventsMap.set(key, [...existing, ...recurringEventsForDay]);
                    }
                }
            });
        }
        return eventsMap;
    }, [calendar?.days]);

    const getDayType = (date: Date): DayType => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayOfWeek = getDay(date);
        
        // 1. Эхлээд тухайн оны тодорхой өдрийн тохиргоог шалгах
        if (calendar?.days?.[dateStr]?.dayType) {
            return calendar.days[dateStr].dayType;
        }

        // 2. Жил бүр давтагдах баярын өдөр эсэхийг шалгах
        const monthDay = format(date, 'MM-dd'); // "01-01", "07-11"
        if (recurringHolidays.has(monthDay)) {
            return recurringHolidays.get(monthDay)!.dayType;
        }

        // 3. Амралтын өдөр эсэхийг шалгах
        if (calendar) {
            if (calendar.weekendDays.includes(dayOfWeek)) {
                return 'weekend';
            }
            return 'working';
        }

        // Default: Бямба, Ням амралтын
        return dayOfWeek === 0 || dayOfWeek === 6 ? 'weekend' : 'working';
    };

    const getDayData = (date: Date): CalendarDay | undefined => {
        if (!calendar) return undefined;
        const dateStr = format(date, 'yyyy-MM-dd');
        const monthDay = format(date, 'MM-dd');
        
        // Эхлээд тухайн оны тодорхой өдрийг шалгах
        const specificDayData = calendar.days?.[dateStr];
        
        // Жил бүр давтагдах үйл явдлуудыг авах
        const recurringEventsForDay = recurringEvents.get(monthDay);
        
        if (specificDayData) {
            // Тухайн өдрийн дата байвал, recurring events-ийг нэмж буцаах
            if (recurringEventsForDay && recurringEventsForDay.length > 0) {
                const existingEvents = specificDayData.events || [];
                // Давхардахгүй байхаар шалгах (ID-аар)
                const existingIds = new Set(existingEvents.map(e => e.id));
                const newEvents = recurringEventsForDay.filter(e => !existingIds.has(e.id));
                return {
                    ...specificDayData,
                    events: [...existingEvents, ...newEvents],
                };
            }
            return specificDayData;
        }

        // Жил бүр давтагдах баярын өдөр байвал түүнийг буцаах
        if (recurringHolidays.has(monthDay)) {
            const recurringDay = recurringHolidays.get(monthDay)!;
            return {
                ...recurringDay,
                date: dateStr,
                events: recurringEventsForDay || recurringDay.events,
            };
        }

        // Зөвхөн recurring events байвал
        if (recurringEventsForDay && recurringEventsForDay.length > 0) {
            return {
                date: dateStr,
                dayType: 'working',
                events: recurringEventsForDay,
            };
        }

        return undefined;
    };

    return (
        <div className="space-y-2">
            {/* Сарын гарчиг */}
            <h3 className={`font-semibold text-center ${compact ? 'text-sm' : 'text-base'}`}>
                {format(monthDate, 'LLLL', { locale: mn })}
            </h3>

            {/* 7 хоногийн гарчиг */}
            <div className="grid grid-cols-7 gap-1">
                {WEEKDAY_LABELS.map((label, index) => (
                    <div
                        key={index}
                        className={`text-center text-muted-foreground font-medium ${
                            compact ? 'text-[10px]' : 'text-xs'
                        }`}
                    >
                        {label}
                    </div>
                ))}
            </div>

            {/* Өдрүүдийн сүлжээ */}
            <div className="grid grid-cols-7 gap-1">
                {days.map((date) => {
                    const inMonth = isSameMonth(date, monthDate);
                    const dayType = getDayType(date);
                    const dayData = getDayData(date);
                    const today = isToday(date);
                    const isSelected = selectedDate 
                        ? format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                        : false;

                    if (!inMonth) {
                        return (
                            <div 
                                key={date.toISOString()} 
                                className={compact ? 'h-6' : 'h-8'}
                            />
                        );
                    }

                    return (
                        <DayCell
                            key={date.toISOString()}
                            date={date}
                            dayData={dayData}
                            dayType={dayType}
                            isToday={today}
                            isSelected={isSelected}
                            onClick={onDayClick}
                            compact={compact}
                        />
                    );
                })}
            </div>
        </div>
    );
}
