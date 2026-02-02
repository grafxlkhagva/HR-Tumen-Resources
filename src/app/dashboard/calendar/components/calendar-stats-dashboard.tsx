'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs } from '@/components/ui/tabs';
import { VerticalTabMenu } from '@/components/ui/vertical-tab-menu';
import { CalendarStats, MonthlyStats, QuarterlyStats, StatsPeriodType, STATS_VIEW_CONFIGS } from '../types';
import { 
    Calendar, 
    Clock, 
    Sun, 
    PartyPopper, 
    Timer, 
    CalendarDays,
    Building2,
    CalendarClock,
    CalendarCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CalendarStatsDashboardProps {
    stats: CalendarStats | null;
    isLoading: boolean;
    year: number;
}

// Жилийн нэгтгэл статистик карт
function YearlyStatsCard({ 
    label, 
    value, 
    icon: Icon, 
    color, 
    bgColor,
    suffix
}: {
    label: string;
    value: number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    suffix?: string;
}) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg border bg-card">
            <div className={cn('p-2 rounded-lg', bgColor)}>
                <Icon className={cn('h-4 w-4', color)} />
            </div>
            <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-semibold">
                    {value.toLocaleString()}
                    {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
                </p>
            </div>
        </div>
    );
}

// Сарын статистик хүснэгт
function MonthlyStatsTable({ monthly }: { monthly: MonthlyStats[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Сар</th>
                        <th className="text-right py-2 px-3 font-medium">Нийт</th>
                        <th className="text-right py-2 px-3 font-medium">Ажлын</th>
                        <th className="text-right py-2 px-3 font-medium">Амралт</th>
                        <th className="text-right py-2 px-3 font-medium">Баяр</th>
                        <th className="text-right py-2 px-3 font-medium">Цаг</th>
                    </tr>
                </thead>
                <tbody>
                    {monthly.map((m) => (
                        <tr key={m.month} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-3 font-medium">{m.monthName}</td>
                            <td className="text-right py-2 px-3">{m.totalDays}</td>
                            <td className="text-right py-2 px-3 text-green-600">{m.workingDays}</td>
                            <td className="text-right py-2 px-3 text-slate-500">{m.weekendDays}</td>
                            <td className="text-right py-2 px-3 text-red-600">{m.publicHolidays + m.companyHolidays}</td>
                            <td className="text-right py-2 px-3 text-purple-600">{m.totalWorkingHours}ц</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-muted/50 font-semibold">
                        <td className="py-2 px-3">Нийт</td>
                        <td className="text-right py-2 px-3">{monthly.reduce((a, b) => a + b.totalDays, 0)}</td>
                        <td className="text-right py-2 px-3 text-green-600">{monthly.reduce((a, b) => a + b.workingDays, 0)}</td>
                        <td className="text-right py-2 px-3 text-slate-500">{monthly.reduce((a, b) => a + b.weekendDays, 0)}</td>
                        <td className="text-right py-2 px-3 text-red-600">{monthly.reduce((a, b) => a + b.publicHolidays + b.companyHolidays, 0)}</td>
                        <td className="text-right py-2 px-3 text-purple-600">{monthly.reduce((a, b) => a + b.totalWorkingHours, 0)}ц</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

// Улирлын статистик хүснэгт
function QuarterlyStatsTable({ quarterly }: { quarterly: QuarterlyStats[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Улирал</th>
                        <th className="text-right py-2 px-3 font-medium">Нийт</th>
                        <th className="text-right py-2 px-3 font-medium">Ажлын</th>
                        <th className="text-right py-2 px-3 font-medium">Амралт</th>
                        <th className="text-right py-2 px-3 font-medium">Баяр</th>
                        <th className="text-right py-2 px-3 font-medium">Цаг</th>
                    </tr>
                </thead>
                <tbody>
                    {quarterly.map((q) => (
                        <tr key={q.quarter} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-3 font-medium">{q.quarterName}</td>
                            <td className="text-right py-2 px-3">{q.totalDays}</td>
                            <td className="text-right py-2 px-3 text-green-600">{q.workingDays}</td>
                            <td className="text-right py-2 px-3 text-slate-500">{q.weekendDays}</td>
                            <td className="text-right py-2 px-3 text-red-600">{q.publicHolidays + q.companyHolidays}</td>
                            <td className="text-right py-2 px-3 text-purple-600">{q.totalWorkingHours}ц</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="bg-muted/50 font-semibold">
                        <td className="py-2 px-3">Нийт</td>
                        <td className="text-right py-2 px-3">{quarterly.reduce((a, b) => a + b.totalDays, 0)}</td>
                        <td className="text-right py-2 px-3 text-green-600">{quarterly.reduce((a, b) => a + b.workingDays, 0)}</td>
                        <td className="text-right py-2 px-3 text-slate-500">{quarterly.reduce((a, b) => a + b.weekendDays, 0)}</td>
                        <td className="text-right py-2 px-3 text-red-600">{quarterly.reduce((a, b) => a + b.publicHolidays + b.companyHolidays, 0)}</td>
                        <td className="text-right py-2 px-3 text-purple-600">{quarterly.reduce((a, b) => a + b.totalWorkingHours, 0)}ц</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}

// Хагас жилийн статистик
function HalfYearlyStats({ stats }: { stats: CalendarStats }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">1-р хагас жил (1-6 сар)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Ажлын өдөр</p>
                            <p className="text-2xl font-bold text-green-600">{stats.firstHalf.workingDays}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Ажлын цаг</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.firstHalf.totalWorkingHours}ц</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">2-р хагас жил (7-12 сар)</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-xs text-muted-foreground">Ажлын өдөр</p>
                            <p className="text-2xl font-bold text-green-600">{stats.secondHalf.workingDays}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground">Ажлын цаг</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.secondHalf.totalWorkingHours}ц</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export function CalendarStatsDashboard({ stats, isLoading, year }: CalendarStatsDashboardProps) {
    const [selectedPeriod, setSelectedPeriod] = React.useState<StatsPeriodType>('yearly');

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <Skeleton key={i} className="h-20" />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    if (!stats) return null;

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{year} оны нэгтгэл</CardTitle>
                    <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as StatsPeriodType)}>
                        <VerticalTabMenu
                            orientation="horizontal"
                            triggerClassName="text-xs"
                            items={STATS_VIEW_CONFIGS.map((config) => ({
                                value: config.period,
                                label: config.label,
                            }))}
                        />
                    </Tabs>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Жилийн нэгтгэл статистик */}
                {selectedPeriod === 'yearly' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
                        <YearlyStatsCard
                            label="Нийт өдөр"
                            value={stats.totalDays}
                            icon={Calendar}
                            color="text-blue-500"
                            bgColor="bg-blue-100 dark:bg-blue-900/30"
                        />
                        <YearlyStatsCard
                            label="Ажлын өдөр"
                            value={stats.workingDays}
                            icon={CalendarDays}
                            color="text-green-500"
                            bgColor="bg-green-100 dark:bg-green-900/30"
                        />
                        <YearlyStatsCard
                            label="Амралтын өдөр"
                            value={stats.weekendDays}
                            icon={Sun}
                            color="text-slate-500"
                            bgColor="bg-slate-100 dark:bg-slate-800"
                        />
                        <YearlyStatsCard
                            label="Улсын баяр"
                            value={stats.publicHolidays}
                            icon={PartyPopper}
                            color="text-red-500"
                            bgColor="bg-red-100 dark:bg-red-900/30"
                        />
                        <YearlyStatsCard
                            label="Байгууллагын амралт"
                            value={stats.companyHolidays}
                            icon={Building2}
                            color="text-orange-500"
                            bgColor="bg-orange-100 dark:bg-orange-900/30"
                        />
                        <YearlyStatsCard
                            label="Нөхөж ажиллах"
                            value={stats.specialWorkingDays}
                            icon={CalendarClock}
                            color="text-blue-500"
                            bgColor="bg-blue-100 dark:bg-blue-900/30"
                        />
                        <YearlyStatsCard
                            label="Хагас өдөр"
                            value={stats.halfDays}
                            icon={Timer}
                            color="text-amber-500"
                            bgColor="bg-amber-100 dark:bg-amber-900/30"
                        />
                        <YearlyStatsCard
                            label="Нийт цаг"
                            value={stats.totalWorkingHours}
                            icon={Clock}
                            color="text-purple-500"
                            bgColor="bg-purple-100 dark:bg-purple-900/30"
                            suffix="ц"
                        />
                    </div>
                )}

                {/* Сарын нэгтгэл */}
                {selectedPeriod === 'monthly' && stats.monthly && (
                    <MonthlyStatsTable monthly={stats.monthly} />
                )}

                {/* Улирлын нэгтгэл */}
                {selectedPeriod === 'quarterly' && stats.quarterly && (
                    <QuarterlyStatsTable quarterly={stats.quarterly} />
                )}

                {/* Хагас жилийн нэгтгэл */}
                {selectedPeriod === 'half_yearly' && (
                    <HalfYearlyStats stats={stats} />
                )}
            </CardContent>
        </Card>
    );
}
