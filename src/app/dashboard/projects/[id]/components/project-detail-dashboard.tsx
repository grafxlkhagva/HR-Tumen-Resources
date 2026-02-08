'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Project } from '@/types/project';
import { cn } from '@/lib/utils';

interface ProjectDetailDashboardProps {
  project: Project;
  progressPercent: number;
  doneTasks: number;
  totalTasks: number;
}

export function ProjectDetailDashboard({
  project,
  progressPercent,
  doneTasks,
  totalTasks,
}: ProjectDetailDashboardProps) {
  const startDate = parseISO(project.startDate);
  const endDate = parseISO(project.endDate);
  const totalDays = differenceInDays(endDate, startDate);
  const elapsedDays = differenceInDays(new Date(), startDate);
  const daysLeft = differenceInDays(endDate, new Date());
  const timelinePercent = project.status === 'COMPLETED' ? 100 : Math.min(100, Math.max(0, (elapsedDays / totalDays) * 100));
  const isOverdue = daysLeft < 0 && !['COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(project.status);

  return (
    <Card className="bg-slate-900 dark:bg-slate-800 border-slate-700 overflow-hidden relative">
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl bg-gradient-to-br from-violet-500/10 to-purple-500/10" />
      <CardContent className="p-5 sm:p-6 relative z-10">
        <h3 className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-5">
          Dashboard | {project.name}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Явц карт */}
          <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Явц</p>
            <div className="flex items-center gap-4">
              <Progress value={progressPercent} className="h-3 flex-1 bg-slate-700 [&>div]:bg-emerald-500" />
              <span className="text-2xl font-bold text-white tabular-nums shrink-0">{progressPercent}%</span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">{doneTasks}/{totalTasks} таск</p>
          </div>

          {/* Хугацаа карт */}
          <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">Хугацаа</p>
            <div className="flex items-center gap-4">
              <Progress
                value={timelinePercent}
                className={cn(
                  'h-3 flex-1 bg-slate-700',
                  isOverdue ? '[&>div]:bg-rose-500' : '[&>div]:bg-amber-500'
                )}
              />
              <span
                className={cn(
                  'text-2xl font-bold tabular-nums shrink-0',
                  project.status === 'COMPLETED'
                    ? 'text-emerald-400'
                    : isOverdue
                    ? 'text-rose-400'
                    : 'text-amber-400'
                )}
              >
                {project.status === 'COMPLETED'
                  ? 'Дууссан'
                  : isOverdue
                  ? `${Math.abs(daysLeft)} өдөр хэтэрсэн`
                  : `${daysLeft} өдөр үлдсэн`}
              </span>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              {format(startDate, 'yyyy.MM.dd')} — {format(endDate, 'yyyy.MM.dd')}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
