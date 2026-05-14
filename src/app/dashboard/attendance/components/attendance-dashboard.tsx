'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, UserCheck, Clock, LogOut, UserX, CalendarCheck2, FileBarChart } from 'lucide-react';
import { ActionIconButton } from '@/components/ui/action-icon-button';
import { useAttendanceMonthStats } from '../hooks/use-attendance-month-stats';
import { MN_MONTHS } from '@/lib/mn-date-labels';

interface Props {
  year: number;
  month: number;
}

export function AttendanceDashboard({ year, month }: Props) {
  const { counts, workingDays, isLoading } = useAttendanceMonthStats(year, month);

  if (isLoading) {
    return (
      <Card className="bg-slate-900 dark:bg-slate-800 border-slate-700">
        <CardContent className="p-5 sm:p-6">
          <Skeleton className="h-5 w-32 mb-5 bg-slate-700" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl bg-slate-700" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 dark:bg-slate-800 border-slate-700 overflow-hidden relative">
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl bg-gradient-to-br from-violet-500/10 to-purple-500/10" />
      <CardContent className="p-5 sm:p-6 relative z-10">
        <div className="flex items-center justify-between mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <h3 className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Dashboard | Ирц
            </h3>
            <span className="text-[10px] sm:text-[11px] text-slate-500">·</span>
            <span className="text-xs text-slate-300 tabular-nums">{year} · {MN_MONTHS[month]}</span>
          </div>
          <ActionIconButton
            label="Ирцийн тайлан"
            description="Ирцийн тайлангийн хуудас"
            icon={<FileBarChart className="h-4 w-4" />}
            variant="default"
            className="text-white"
            href="/dashboard/attendance/report"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={<Calendar className="h-3.5 w-3.5 text-slate-300" />} label="Ажлын өдөр" value={workingDays} valueClass="text-white" />
          <StatCard icon={<UserCheck className="h-3.5 w-3.5 text-emerald-400" />} label="Хэвийн" value={counts.NORMAL} valueClass="text-emerald-400" />
          <StatCard icon={<Clock className="h-3.5 w-3.5 text-amber-400" />} label="Хоцорсон" value={counts.LATE} valueClass="text-amber-400" />
          <StatCard icon={<LogOut className="h-3.5 w-3.5 text-orange-400" />} label="Эрт явсан" value={counts.EARLY_DEPARTURE} valueClass="text-orange-400" />
          <StatCard icon={<UserX className="h-3.5 w-3.5 text-red-400" />} label="Ирээгүй" value={counts.ABSENT} valueClass="text-red-400" />
          <StatCard icon={<CalendarCheck2 className="h-3.5 w-3.5 text-blue-400" />} label="Чөлөөтэй" value={counts.TIME_OFF} valueClass="text-blue-400" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({ icon, label, value, valueClass }: { icon: React.ReactNode; label: string; value: number; valueClass: string }) {
  return (
    <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        {icon}
        <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide truncate">
          {label}
        </p>
      </div>
      <div className={`text-2xl font-extrabold leading-none tabular-nums ${valueClass}`}>
        {value}
      </div>
    </div>
  );
}
