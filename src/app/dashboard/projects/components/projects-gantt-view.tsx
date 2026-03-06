'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, differenceInDays, addMonths, subMonths, startOfDay, isSameDay } from 'date-fns';
import { mn } from 'date-fns/locale';
import { Project, PROJECT_STATUS_LABELS } from '@/types/project';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-400',
  PLANNING: 'bg-slate-400',
  ACTIVE: 'bg-emerald-500',
  IN_PROGRESS: 'bg-emerald-500',
  ON_HOLD: 'bg-amber-500',
  COMPLETED: 'bg-blue-500',
  ARCHIVED: 'bg-zinc-400',
  CANCELLED: 'bg-zinc-400',
};

interface ProjectsGanttViewProps {
  projects: Project[];
}

const DAY_WIDTH = 24;
const ROW_HEIGHT = 44;

export function ProjectsGanttView({ projects }: ProjectsGanttViewProps) {
  const { startDate, endDate, days, totalDays } = useMemo(() => {
    if (projects.length === 0) {
      const today = new Date();
      const start = startOfMonth(today);
      const end = endOfMonth(addMonths(today, 2));
      const days = eachDayOfInterval({ start, end });
      return {
        startDate: start,
        endDate: end,
        days,
        totalDays: differenceInDays(end, start) + 1,
      };
    }
    let minStart = parseISO(projects[0].startDate);
    let maxEnd = parseISO(projects[0].endDate);
    projects.forEach((p) => {
      const s = parseISO(p.startDate);
      const e = parseISO(p.endDate);
      if (s < minStart) minStart = s;
      if (e > maxEnd) maxEnd = e;
    });
    const start = startOfMonth(subMonths(minStart, 1));
    const end = endOfMonth(addMonths(maxEnd, 1));
    const days = eachDayOfInterval({ start, end });
    return {
      startDate: start,
      endDate: end,
      days,
      totalDays: differenceInDays(end, start) + 1,
    };
  }, [projects]);

  const todayIndex = useMemo(() => {
    const today = startOfDay(new Date());
    if (today < startDate || today > endDate) return -1;
    return differenceInDays(today, startDate);
  }, [startDate, endDate]);

  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-700 p-12 text-center bg-slate-50/50 dark:bg-slate-900/30">
        <p className="text-muted-foreground">Төсөл байхгүй байна</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="overflow-x-auto overflow-y-visible">
        <div className="min-w-max flex">
          {/* Төслүүдийн багана - түгжигдсэн, хэвтээ гүйлгэхэд хөдөлдөггүй */}
          <div className="sticky left-0 z-20 shrink-0 w-[240px] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 shadow-[2px_0_8px_-2px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_8px_-2px_rgba(0,0,0,0.2)]">
            {/* Header - сар+өдөр мөртэй ижил өндөр */}
            <div className="border-b border-slate-200 dark:border-slate-700 p-3 font-medium text-sm flex flex-col justify-center min-h-[72px]">
              Төсөл
            </div>
            {/* Rows */}
            {projects.map((project, idx) => (
              <div
                key={project.id}
                className={cn(
                  'border-b border-slate-100 dark:border-slate-800 p-2 flex items-center gap-2',
                  idx % 2 === 1 && 'bg-slate-50/30 dark:bg-slate-900/20',
                  'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'
                )}
                style={{ minHeight: ROW_HEIGHT }}
              >
                <Link
                  href={`/dashboard/projects/${project.id}`}
                  className="font-medium text-sm truncate hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  {project.name}
                </Link>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {PROJECT_STATUS_LABELS[project.status] || project.status}
                </Badge>
              </div>
            ))}
          </div>

          {/* Календар/х Timeline - хэвтээ гүйлгэгдэнэ */}
          <div className="shrink-0 relative">
            {/* Header: сар + өдөр */}
            <div className="bg-white dark:bg-slate-900 sticky top-0 z-10">
              {/* Сар мөр */}
              <div className="flex border-b border-slate-100 dark:border-slate-800">
                {(() => {
                  const monthSpans: { month: Date; startIdx: number; count: number }[] = [];
                  let i = 0;
                  while (i < days.length) {
                    const d = days[i];
                    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
                    let count = 0;
                    while (i + count < days.length) {
                      const next = days[i + count];
                      if (`${next.getFullYear()}-${next.getMonth()}` !== monthKey) break;
                      count++;
                    }
                    monthSpans.push({ month: d, startIdx: i, count });
                    i += count;
                  }
                  return monthSpans.map(({ month, count }) => (
                    <div
                      key={month.toISOString()}
                      className="shrink-0 text-center text-[10px] font-medium text-slate-600 dark:text-slate-400 py-1.5 border-r border-slate-200 dark:border-slate-700"
                      style={{ width: count * DAY_WIDTH }}
                    >
                      {format(month, 'MMMM yyyy', { locale: mn })}
                    </div>
                  ));
                })()}
              </div>
              {/* Өдөр мөр */}
              <div className="flex border-b border-slate-200 dark:border-slate-700">
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "shrink-0 text-center text-[10px] py-2 border-r border-slate-100 dark:border-slate-800",
                      isSameDay(day, new Date()) ? "text-red-600 dark:text-red-400 font-semibold bg-red-50/50 dark:bg-red-950/30" : "text-muted-foreground"
                    )}
                    style={{ width: DAY_WIDTH }}
                  >
                    {format(day, 'd')}
                  </div>
                ))}
              </div>
            </div>

            {/* Өнөөдөрийн улаан шугам */}
            {todayIndex >= 0 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                style={{ left: todayIndex * DAY_WIDTH + DAY_WIDTH / 2 - 1 }}
              />
            )}

            {/* Rows: барууны бар */}
            {projects.map((project, idx) => {
              const pStart = parseISO(project.startDate);
              const pEnd = parseISO(project.endDate);
              const left = Math.max(0, differenceInDays(pStart, startDate)) * DAY_WIDTH;
              const width = Math.max(DAY_WIDTH * 2, (differenceInDays(pEnd, pStart) + 1) * DAY_WIDTH);
              const statusColor = STATUS_COLORS[project.status] || STATUS_COLORS.DRAFT;

              return (
                <div
                  key={project.id}
                  className={cn(
                    'flex border-b border-slate-100 dark:border-slate-800',
                    idx % 2 === 1 && 'bg-slate-50/30 dark:bg-slate-900/20'
                  )}
                >
                  <div
                    className="relative"
                    style={{ width: totalDays * DAY_WIDTH, height: ROW_HEIGHT }}
                  >
                    <Link
                      href={`/dashboard/projects/${project.id}`}
                      className={cn(
                        'absolute top-1.5 h-7 rounded-md flex items-center px-2 text-xs font-medium text-white truncate transition-opacity hover:opacity-90',
                        statusColor
                      )}
                      style={{
                        left,
                        width: Math.min(width, totalDays * DAY_WIDTH - left - 4),
                      }}
                    >
                      {format(pStart, 'MM/dd')} - {format(pEnd, 'MM/dd')}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
