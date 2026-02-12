'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format, parseISO, differenceInDays, differenceInCalendarDays } from 'date-fns';
import { Project } from '@/types/project';
import { cn } from '@/lib/utils';
import { calculateProjectPoints } from '@/lib/points/project-points-service';
import { Star } from 'lucide-react';

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

  // Point budget calculations
  const hasPointBudget = !!project.pointBudget && project.pointBudget > 0;
  const pointInfo = React.useMemo(() => {
    if (!hasPointBudget) return null;

    const memberCount = project.teamMemberIds?.length || 1;

    // If already completed and distributed
    if (project.status === 'COMPLETED' && project.pointsDistributed && project.completedAt) {
      const { actualPoints, overdueDays, penaltyPercent } = calculateProjectPoints(
        project.pointBudget!,
        project.endDate,
        project.completedAt
      );
      const perMember = Math.floor(actualPoints / memberCount);
      return { actualPoints, perMember, overdueDays, penaltyPercent, distributed: true };
    }

    // If not completed yet, show projected points based on current date
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const { actualPoints, overdueDays, penaltyPercent } = calculateProjectPoints(
      project.pointBudget!,
      project.endDate,
      todayStr
    );
    const perMember = Math.floor(actualPoints / memberCount);
    return { actualPoints, perMember, overdueDays, penaltyPercent, distributed: false };
  }, [project, hasPointBudget]);

  const hasGrid3 = hasPointBudget;

  return (
    <Card className="bg-slate-900 dark:bg-slate-800 border-slate-700 overflow-hidden relative">
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl bg-gradient-to-br from-violet-500/10 to-purple-500/10" />
      <CardContent className="p-5 sm:p-6 relative z-10">
        <h3 className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-5">
          Dashboard | {project.name}
        </h3>

        <div className={cn('grid gap-4', hasGrid3 ? 'grid-cols-3' : 'grid-cols-2')}>
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

          {/* Оноо карт */}
          {hasPointBudget && pointInfo && (
            <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Star className="h-3 w-3" />
                Оноо
              </p>
              <div className="flex items-baseline gap-2">
                <span
                  className={cn(
                    'text-2xl font-bold tabular-nums',
                    pointInfo.distributed
                      ? 'text-emerald-400'
                      : pointInfo.penaltyPercent > 0
                      ? pointInfo.penaltyPercent >= 100
                        ? 'text-rose-400'
                        : 'text-amber-400'
                      : 'text-violet-400'
                  )}
                >
                  {pointInfo.perMember}
                </span>
                <span className="text-xs text-slate-500">/ гишүүн</span>
              </div>
              <div className="mt-1 space-y-0.5">
                <p className="text-[10px] text-slate-500">
                  Нийт төсөв: {project.pointBudget} оноо
                </p>
                {pointInfo.distributed ? (
                  <p className="text-[10px] text-emerald-500">
                    {pointInfo.overdueDays > 0
                      ? `Хуваарилагдсан (${pointInfo.penaltyPercent}% хасагдсан)`
                      : 'Хугацаандаа дууссан — бүрэн хуваарилагдсан'}
                  </p>
                ) : pointInfo.overdueDays > 0 ? (
                  <p className="text-[10px] text-rose-400">
                    {pointInfo.penaltyPercent >= 100
                      ? `${pointInfo.overdueDays} хоног хоцорсон — 0 оноо`
                      : `${pointInfo.overdueDays} хоног хоцорсон — ${pointInfo.penaltyPercent}% хасагдана`}
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    Хугацаандаа дуусвал бүрэн оноо
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
