'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { WorkCalendar } from '../types';
import { 
    Calendar, 
    ChevronLeft, 
    ChevronRight, 
    Clock, 
    Globe,
    Building2,
} from 'lucide-react';

interface CalendarTypeSelectorProps {
    calendar: WorkCalendar | null;
    selectedYear: number;
    onYearChange: (year: number) => void;
    isLoading: boolean;
}

export function CalendarTypeSelector({
    calendar,
    selectedYear,
    onYearChange,
    isLoading,
}: CalendarTypeSelectorProps) {
    const availableYears = React.useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
    }, []);

    // Ажлын өдрийн тохиргоо текст
    const getWeekendText = (weekendDays: number[]) => {
        const dayNames = ['Ням', 'Дав', 'Мяг', 'Лха', 'Пүр', 'Баа', 'Бям'];
        if (weekendDays.length === 0) return '7 хоног ажлын';
        if (weekendDays.includes(0) && weekendDays.includes(6) && weekendDays.length === 2) {
            return '5/2 хуваарь';
        }
        if (weekendDays.includes(0) && weekendDays.length === 1) {
            return '6/1 хуваарь';
        }
        return `Амралт: ${weekendDays.map(d => dayNames[d]).join(', ')}`;
    };

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex flex-col gap-4">
                    {/* Дээд хэсэг: Календар нэр ба он */}
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        {/* Календар нэр */}
                        <div className="flex-1">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-lg bg-primary/10">
                                    <Calendar className="h-5 w-5 text-primary" />
                                </div>
                                {isLoading ? (
                                    <Skeleton className="h-6 w-64" />
                                ) : calendar ? (
                                    <h3 className="font-semibold text-lg">{calendar.name}</h3>
                                ) : (
                                    <span className="text-muted-foreground">Ажлын календар</span>
                                )}
                            </div>
                        </div>

                        {/* Он сонголт */}
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => onYearChange(selectedYear - 1)}
                                disabled={!availableYears.includes(selectedYear - 1)}
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Select
                                value={selectedYear.toString()}
                                onValueChange={(v) => onYearChange(Number(v))}
                            >
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableYears.map((year) => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => onYearChange(selectedYear + 1)}
                                disabled={!availableYears.includes(selectedYear + 1)}
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Календарын дэлгэрэнгүй мэдээлэл */}
                    {calendar && (
                        <>
                            <Separator />
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                                {/* Улс */}
                                {calendar.country && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Globe className="h-4 w-4" />
                                        <span>{calendar.country}</span>
                                    </div>
                                )}

                                {/* Ажлын цаг */}
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>{calendar.workingTimeRules?.standardWorkingHoursPerDay || 8} цаг/өдөр</span>
                                    <span className="text-muted-foreground/50">•</span>
                                    <span>{calendar.workingTimeRules?.workingHoursPerWeek || 40} цаг/7 хоног</span>
                                </div>

                                {/* Ажлын хуваарь */}
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Building2 className="h-4 w-4" />
                                    <span>{getWeekendText(calendar.weekendDays)}</span>
                                </div>

                                {/* Тайлбар */}
                                {calendar.description && (
                                    <span className="text-muted-foreground italic">
                                        {calendar.description}
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
