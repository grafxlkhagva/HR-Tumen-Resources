'use client';

import * as React from 'react';
import Link from 'next/link';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/patterns/page-layout';
import { AttendanceDashboard } from './components/attendance-dashboard';
import { AttendanceReportTab } from './components/attendance-report-tab';

export default function AttendanceAndRequestsPage() {
    const now = new Date();
    const [year, setYear] = React.useState<number>(now.getFullYear());
    const [month, setMonth] = React.useState<number>(now.getMonth());

    return (
        <div className="flex flex-col h-full overflow-hidden bg-slate-50/50">
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6 pb-32">
                <PageHeader
                    title="Цаг бүртгэл"
                    description="Ажилтнуудын ирцийн түүх болон холбогдох хүсэлтүүдийг удирдах."
                    showBackButton={true}
                    hideBreadcrumbs={true}
                    backButtonPlacement="inline"
                    backBehavior="history"
                    fallbackBackHref="/dashboard"
                    actions={
                        <TooltipProvider delayDuration={150}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button asChild variant="outline" size="icon" aria-label="Тохиргоо">
                                        <Link href="/dashboard/attendance/settings">
                                            <Settings className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <div className="text-xs font-semibold">Цаг бүртгэлийн тохиргоо</div>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    }
                />

                <AttendanceDashboard year={year} month={month} />

                <AttendanceReportTab
                    year={year}
                    month={month}
                    onYearChange={setYear}
                    onMonthChange={setMonth}
                />
            </div>
        </div>
    );
}
