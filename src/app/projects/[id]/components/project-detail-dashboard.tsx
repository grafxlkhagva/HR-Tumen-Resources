'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays, startOfWeek, addWeeks, isBefore, isAfter } from 'date-fns';
import { Project, Task, Priority, PRIORITY_LABELS } from '@/types/project';
import { Employee } from '@/types';
import { cn } from '@/lib/utils';
import { calculateProjectPoints } from '@/lib/points/project-points-service';
import { Star, Target, ChevronRight, Link2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { FRAMEWORK_SHORT_LABELS } from '@/app/business-plan/types';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';

interface ProjectDetailDashboardProps {
  project: Project;
  tasks: Task[];
  teamMembers: Employee[];
  employeeMap: Map<string, Employee>;
}

// ── Өнгөний тохиргоо ──
const STATUS_COLORS = {
  TODO: '#64748b',
  IN_PROGRESS: '#f59e0b',
  DONE: '#10b981',
  OVERDUE: '#ef4444',
};

const PRIORITY_COLORS: Record<Priority, string> = {
  URGENT: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#3b82f6',
  LOW: '#94a3b8',
};

const PRIORITY_BADGE_STYLES: Record<Priority, string> = {
  URGENT: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  HIGH: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  MEDIUM: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

export function ProjectDetailDashboard({
  project,
  tasks,
  teamMembers,
  employeeMap,
}: ProjectDetailDashboardProps) {
  const today = new Date();
  const startDate = parseISO(project.startDate);
  const endDate = parseISO(project.endDate);
  const daysLeft = differenceInDays(endDate, today);
  const isOverdue = daysLeft < 0 && !['COMPLETED', 'ARCHIVED', 'CANCELLED', 'ON_HOLD'].includes(project.status);

  // ── KPI тооцоолол ──
  const kpi = React.useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    const overdue = tasks.filter(t => t.status !== 'DONE' && isBefore(parseISO(t.dueDate), today)).length;
    const completionPercent = total > 0 ? Math.round((done / total) * 100) : 0;

    // Хугацаандаа дууссан vs хоцорч дууссан
    let onTime = 0;
    let late = 0;
    let totalSavedDays = 0;
    tasks.filter(t => t.status === 'DONE').forEach(t => {
      const dueDate = parseISO(t.dueDate);
      if (t.completedAt) {
        const completedDate = t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt as any);
        const diff = differenceInDays(dueDate, completedDate); // + = өмнө, - = хоцорсон
        if (diff >= 0) {
          onTime++;
          totalSavedDays += diff;
        } else {
          late++;
        }
      } else {
        // completedAt байхгүй бол тодорхойгүй → onTime гэж тооцно
        onTime++;
      }
    });

    return { total, done, overdue, completionPercent, onTime, late, totalSavedDays };
  }, [tasks]);

  // ── Donut chart data ──
  const statusData = React.useMemo(() => {
    const todo = tasks.filter(t => t.status === 'TODO' && !isBefore(parseISO(t.dueDate), today)).length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS' && !isBefore(parseISO(t.dueDate), today)).length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    const overdue = tasks.filter(t => t.status !== 'DONE' && isBefore(parseISO(t.dueDate), today)).length;
    return [
      { name: 'Хийх', value: todo, color: STATUS_COLORS.TODO },
      { name: 'Гүйцэтгэж байна', value: inProgress, color: STATUS_COLORS.IN_PROGRESS },
      { name: 'Дууссан', value: done, color: STATUS_COLORS.DONE },
      { name: 'Хэтэрсэн', value: overdue, color: STATUS_COLORS.OVERDUE },
    ].filter(d => d.value > 0);
  }, [tasks]);

  // ── Burndown chart data ──
  const burndownData = React.useMemo(() => {
    if (tasks.length === 0) return [];
    const total = tasks.length;
    const projStart = startOfWeek(startDate, { weekStartsOn: 1 });
    const projEnd = startOfWeek(endDate, { weekStartsOn: 1 });
    const totalWeeks = Math.max(1, Math.ceil(differenceInDays(projEnd, projStart) / 7));

    const weeks: { week: string; ideal: number; actual: number | null }[] = [];
    for (let i = 0; i <= totalWeeks; i++) {
      const weekEnd = addWeeks(projStart, i);
      const weekLabel = `W${i + 1}`;
      const ideal = Math.round(total - (total * i) / totalWeeks);

      // Бодит: тухайн долоо хоног хүртэл дууссан таск тоог хасна
      let actual: number | null = null;
      if (!isAfter(weekEnd, today)) {
        const completedByWeek = tasks.filter(t => {
          if (t.status !== 'DONE' || !t.completedAt) return false;
          const completedDate = t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt as any);
          return isBefore(completedDate, weekEnd) || completedDate.getTime() === weekEnd.getTime();
        }).length;
        actual = total - completedByWeek;
      }

      weeks.push({ week: weekLabel, ideal, actual });
    }
    return weeks;
  }, [tasks, startDate, endDate]);

  // ── Эрсдэл жагсаалт ──
  const riskTasks = React.useMemo(() => {
    return tasks
      .filter(t => t.status !== 'DONE' && (isBefore(parseISO(t.dueDate), today) || t.priority === 'URGENT' || t.priority === 'HIGH'))
      .sort((a, b) => {
        const priorityOrder: Record<Priority, number> = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 4);
  }, [tasks]);

  const riskTotal = React.useMemo(() => {
    return tasks.filter(t => t.status !== 'DONE' && (isBefore(parseISO(t.dueDate), today) || t.priority === 'URGENT' || t.priority === 'HIGH')).length;
  }, [tasks]);

  // ── Priority явц ──
  const priorityProgress = React.useMemo(() => {
    const priorities: Priority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
    return priorities.map(p => {
      const all = tasks.filter(t => t.priority === p);
      const done = all.filter(t => t.status === 'DONE').length;
      const total = all.length;
      return {
        priority: p,
        label: PRIORITY_LABELS[p],
        done,
        total,
        percent: total > 0 ? Math.round((done / total) * 100) : 0,
        color: PRIORITY_COLORS[p],
      };
    }).filter(p => p.total > 0);
  }, [tasks]);

  // ── Гишүүдийн ачаалал ──
  const memberWorkload = React.useMemo(() => {
    const map = new Map<string, number>();
    tasks.filter(t => t.status !== 'DONE').forEach(t => {
      t.assigneeIds?.forEach(id => {
        map.set(id, (map.get(id) || 0) + 1);
      });
    });
    return Array.from(map.entries())
      .map(([id, count]) => ({ id, count, employee: employeeMap.get(id) }))
      .filter(m => m.employee)
      .sort((a, b) => b.count - a.count);
  }, [tasks, employeeMap]);

  const maxWorkload = Math.max(...memberWorkload.map(m => m.count), 1);

  // ── Points ──
  const hasPointBudget = !!project.pointBudget && project.pointBudget > 0;
  const pointInfo = React.useMemo(() => {
    if (!hasPointBudget) return null;
    const memberCount = project.teamMemberIds?.length || 1;
    if (project.status === 'COMPLETED' && project.pointsDistributed && project.completedAt) {
      const { actualPoints, overdueDays, penaltyPercent } = calculateProjectPoints(project.pointBudget!, project.endDate, project.completedAt);
      return { perMember: Math.floor(actualPoints / memberCount), overdueDays, penaltyPercent, distributed: true };
    }
    const todayStr = format(today, 'yyyy-MM-dd');
    const { actualPoints, overdueDays, penaltyPercent } = calculateProjectPoints(project.pointBudget!, project.endDate, todayStr);
    return { perMember: Math.floor(actualPoints / memberCount), overdueDays, penaltyPercent, distributed: false };
  }, [project, hasPointBudget]);

  // ── Card wrapper ──
  const MetricCard = ({ className, children }: { className?: string; children: React.ReactNode }) => (
    <div className={cn('rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-3', className)}>
      {children}
    </div>
  );

  return (
    <Card className="bg-slate-900 dark:bg-slate-800 border-slate-700 overflow-hidden relative">
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl bg-gradient-to-br from-violet-500/10 to-purple-500/10" />
      <CardContent className="p-4 sm:p-5 relative z-10">
        <h3 className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Dashboard | {project.name}
        </h3>

        {/* ── ROW 1: 4 KPI карт ── */}
        <div className={cn('grid gap-3', hasPointBudget ? 'grid-cols-5' : 'grid-cols-4')}>
          {/* Нийт таск */}
          <MetricCard>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Нийт таск</p>
            <p className="text-2xl font-bold text-white mt-1">{kpi.total}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{kpi.done} дууссан</p>
          </MetricCard>

          {/* Гүйцэтгэл */}
          <MetricCard>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Гүйцэтгэл</p>
            <p className="text-2xl font-bold text-emerald-400 mt-1">{kpi.completionPercent}%</p>
            <Progress value={kpi.completionPercent} className="h-1.5 mt-1.5 bg-slate-700 [&>div]:bg-emerald-500" />
          </MetricCard>

          {/* Хугацааны гүйцэтгэл */}
          <MetricCard>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Хугацааны гүйцэтгэл</p>
            {kpi.done > 0 ? (
              <>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-2xl font-bold text-emerald-400">{kpi.onTime}</span>
                  <span className="text-[10px] text-slate-500">цагтаа</span>
                  {kpi.late > 0 && (
                    <>
                      <span className="text-lg font-bold text-rose-400 ml-1">{kpi.late}</span>
                      <span className="text-[10px] text-slate-500">хоцорсон</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {kpi.totalSavedDays > 0 ? `${kpi.totalSavedDays} хоног хэмнэсэн` : kpi.late > 0 ? `${kpi.overdue} идэвхтэй хэтэрсэн` : 'бүгд хугацаандаа'}
                </p>
              </>
            ) : (
              <>
                <p className={cn('text-2xl font-bold mt-1', kpi.overdue > 0 ? 'text-rose-400' : 'text-slate-500')}>
                  {kpi.overdue > 0 ? kpi.overdue : '—'}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {kpi.overdue > 0 ? 'хэтэрсэн таск' : 'дууссан таск алга'}
                </p>
              </>
            )}
          </MetricCard>

          {/* Үлдсэн хоног */}
          <MetricCard>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Үлдсэн хоног</p>
            <p className={cn('text-2xl font-bold mt-1', isOverdue ? 'text-rose-400' : 'text-amber-400')}>
              {project.status === 'COMPLETED' ? '✓' : isOverdue ? Math.abs(daysLeft) : daysLeft}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {project.status === 'COMPLETED' ? 'Дууссан' : isOverdue ? 'хоног хэтэрсэн' : format(endDate, 'MM.dd') + ' хүртэл'}
            </p>
          </MetricCard>

          {/* Оноо (нэмэлт) */}
          {hasPointBudget && pointInfo && (
            <MetricCard>
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide flex items-center gap-1">
                <Star className="h-2.5 w-2.5" /> Оноо
              </p>
              <p className={cn('text-2xl font-bold mt-1',
                pointInfo.distributed ? 'text-emerald-400' : pointInfo.penaltyPercent > 0 ? 'text-amber-400' : 'text-violet-400'
              )}>
                {pointInfo.perMember}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">/ гишүүн</p>
            </MetricCard>
          )}
        </div>

        {/* ── ROW 2: Donut + Burndown + Эрсдэл ── */}
        <div className="grid grid-cols-3 gap-3 mt-3">
          {/* Donut Chart */}
          <MetricCard>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Даалгаварын төлөв</p>
            <div className="flex items-center gap-3">
              <div className="relative w-[100px] h-[100px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={46}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontSize: '11px', backgroundColor: '#1e293b', color: '#f8fafc' }}
                      formatter={(value: number, name: string) => [`${value} таск`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold text-white">{kpi.total}</span>
                </div>
              </div>
              <div className="space-y-1 min-w-0">
                {statusData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                    <span className="text-slate-400 truncate">{d.name}</span>
                    <span className="text-white font-medium ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </MetricCard>

          {/* Burndown Chart */}
          <MetricCard>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Burndown chart</p>
            {burndownData.length > 0 ? (
              <div className="h-[100px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={burndownData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', fontSize: '11px', backgroundColor: '#1e293b', color: '#f8fafc' }}
                      formatter={(value: any, name: string) => [value !== null ? `${value} таск` : '—', name === 'ideal' ? 'Идеал' : 'Бодит']}
                    />
                    <Line type="monotone" dataKey="ideal" stroke="#64748b" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="ideal" />
                    <Line type="monotone" dataKey="actual" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2.5, fill: '#8b5cf6' }} activeDot={{ r: 4 }} name="actual" connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-[10px] text-slate-500 text-center py-8">Таск байхгүй</p>
            )}
            <div className="flex items-center justify-center gap-4 mt-1.5">
              <span className="flex items-center gap-1 text-[9px] text-slate-500">
                <span className="w-3 h-px bg-slate-500 inline-block" style={{ borderTop: '1.5px dashed #64748b' }} /> Идеал
              </span>
              <span className="flex items-center gap-1 text-[9px] text-slate-500">
                <span className="w-3 h-0.5 bg-violet-500 inline-block rounded" /> Бодит
              </span>
            </div>
          </MetricCard>

          {/* Эрсдэл & Асуудал */}
          <MetricCard>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Эрсдэл & Асуудал
            </p>
            {riskTasks.length > 0 ? (
              <div className="space-y-1.5">
                {riskTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-300 truncate min-w-0">{task.title}</span>
                    <Badge className={cn('text-[9px] px-1.5 py-0 h-4 shrink-0', PRIORITY_BADGE_STYLES[task.priority])}>
                      {PRIORITY_LABELS[task.priority]}
                    </Badge>
                  </div>
                ))}
                {riskTotal > 4 && (
                  <p className="text-[10px] text-slate-500">+{riskTotal - 4} бусад</p>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center py-6">
                <p className="text-[10px] text-emerald-400">Эрсдэл байхгүй ✓</p>
              </div>
            )}
          </MetricCard>
        </div>

        {/* ── ROW 3: Priority явц + Гишүүдийн ачаалал ── */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {/* Priority явц */}
          <MetricCard>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Priority-н явц</p>
            <div className="space-y-2">
              {priorityProgress.map((p) => (
                <div key={p.priority}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-slate-300">{p.label}</span>
                    <span className="text-[10px] text-slate-400">{p.percent}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${p.percent}%`, backgroundColor: p.color }}
                    />
                  </div>
                </div>
              ))}
              {priorityProgress.length === 0 && (
                <p className="text-[10px] text-slate-500 text-center py-4">Таск байхгүй</p>
              )}
            </div>
          </MetricCard>

          {/* Гишүүдийн ачаалал */}
          <MetricCard>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide mb-2">Гишүүдийн ачаалал</p>
            <div className="space-y-2">
              {memberWorkload.slice(0, 5).map(({ id, count, employee }) => (
                <div key={id} className="flex items-center gap-2">
                  <Avatar className="h-5 w-5 shrink-0">
                    <AvatarImage src={employee?.photoURL} />
                    <AvatarFallback className="text-[8px] bg-violet-800 text-violet-300">
                      {employee?.firstName?.[0]}{employee?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[11px] text-slate-300 w-16 truncate shrink-0">
                    {employee?.lastName?.[0]}. {employee?.firstName}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(count / maxWorkload) * 100}%`,
                        backgroundColor: count > maxWorkload * 0.8 ? '#ef4444' : count > maxWorkload * 0.5 ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 tabular-nums shrink-0 w-12 text-right">{count} таск</span>
                </div>
              ))}
              {memberWorkload.length === 0 && (
                <p className="text-[10px] text-slate-500 text-center py-4">Хариуцагч байхгүй</p>
              )}
            </div>
          </MetricCard>
        </div>

        {/* ── Стратегийн холбоос ── */}
        {project.strategyLink?.planId && (
          <div className="mt-3 rounded-xl bg-violet-900/30 border border-violet-700/50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-violet-400" />
              <p className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">
                Стратегийн холбоос
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-violet-200">
                <span className="rounded bg-violet-800/60 px-1.5 py-0.5 text-[10px] font-medium text-violet-300">
                  {FRAMEWORK_SHORT_LABELS[project.strategyLink.framework]}
                </span>
                <span className="font-medium">{project.strategyLink.planTitle}</span>
              </div>
              {project.strategyLink.themeTitle && (
                <div className="flex items-center gap-1 text-xs text-violet-300">
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  {project.strategyLink.themeTitle}
                </div>
              )}
              {project.strategyLink.objectiveTitle && (
                <div className="flex items-center gap-1 text-xs text-violet-100 font-medium">
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  {project.strategyLink.objectiveTitle}
                </div>
              )}
              {project.strategyLink.keyResultTitle && (
                <div className="flex items-center gap-1 text-xs text-violet-300">
                  <ChevronRight className="h-3 w-3 shrink-0" />
                  {project.strategyLink.keyResultTitle}
                </div>
              )}
            </div>
            <Link
              href="/dashboard/hr/business-plan"
              className="mt-2 inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-200 transition-colors"
            >
              <Link2 className="h-3 w-3" />
              Бизнес төлөвлөгөөнд харах
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
