'use client';

import { Card, CardContent } from '@/components/ui/card';
import { WorkCalendar } from '../types';
import { MonthCalendar } from './month-calendar';

interface YearCalendarViewProps {
    year: number;
    calendar: WorkCalendar | null;
    onDayClick?: (date: Date) => void;
    selectedDate?: Date | null;
}

export function YearCalendarView({
    year,
    calendar,
    onDayClick,
    selectedDate,
}: YearCalendarViewProps) {
    const months = Array.from({ length: 12 }, (_, i) => i);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {months.map((month) => (
                <Card key={month} className="overflow-hidden">
                    <CardContent className="p-4">
                        <MonthCalendar
                            year={year}
                            month={month}
                            calendar={calendar}
                            onDayClick={onDayClick}
                            selectedDate={selectedDate}
                            compact
                        />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}
