'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { FolderKanban, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { Project, ProjectStatus } from '@/types/project';
import { isPast, parseISO } from 'date-fns';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#94a3b8',
  PLANNING: '#94a3b8',
  ACTIVE: '#10b981',
  IN_PROGRESS: '#10b981',
  ON_HOLD: '#f59e0b',
  COMPLETED: '#3b82f6',
  ARCHIVED: '#64748b',
  CANCELLED: '#64748b',
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Ноорог',
  PLANNING: 'Ноорог',
  ACTIVE: 'Идэвхтэй',
  IN_PROGRESS: 'Идэвхтэй',
  ON_HOLD: 'Түр зогссон',
  COMPLETED: 'Дууссан',
  ARCHIVED: 'Архивласан',
  CANCELLED: 'Архивласан',
};

const STATUS_ORDER: ProjectStatus[] = ['DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'];

interface ProjectsDashboardProps {
  projects: Project[] | null;
  isLoading: boolean;
}

export function ProjectsDashboard({ projects, isLoading }: ProjectsDashboardProps) {
  const metrics = React.useMemo(() => {
    if (!projects) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        overdue: 0,
        statusData: [] as { name: string; value: number; color: string }[],
      };
    }

    const today = new Date();
    const total = projects.length;
    const active = projects.filter(
      (p) => p.status === 'ACTIVE' || p.status === 'IN_PROGRESS'
    ).length;
    const completed = projects.filter((p) => p.status === 'COMPLETED').length;
    const overdue = projects.filter((p) => {
      if (['COMPLETED', 'ARCHIVED', 'CANCELLED'].includes(p.status)) return false;
      return isPast(parseISO(p.endDate));
    }).length;

    const statusCounts: Record<string, number> = {};
    STATUS_ORDER.forEach((s) => {
      statusCounts[s] = 0;
    });
    projects.forEach((p) => {
      if (p.status === 'PLANNING') statusCounts['DRAFT'] = (statusCounts['DRAFT'] || 0) + 1;
      else if (p.status === 'IN_PROGRESS') statusCounts['ACTIVE'] = (statusCounts['ACTIVE'] || 0) + 1;
      else if (p.status === 'CANCELLED') statusCounts['ARCHIVED'] = (statusCounts['ARCHIVED'] || 0) + 1;
      else if (STATUS_ORDER.includes(p.status)) {
        statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
      }
    });

    const statusData = STATUS_ORDER.map((status) => ({
      name: STATUS_LABELS[status] || status,
      value: statusCounts[status] || 0,
      color: STATUS_COLORS[status] || '#94a3b8',
    })).filter((d) => d.value > 0);

    return { total, active, completed, overdue, statusData };
  }, [projects]);

  if (isLoading) {
    return (
      <Card className="bg-slate-900 dark:bg-slate-800 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-5 w-48 bg-slate-700" />
            <Skeleton className="h-9 w-9 rounded-lg bg-slate-700" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-48 w-full rounded-xl bg-slate-700" />
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg bg-slate-700" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 dark:bg-slate-800 border-slate-700 overflow-hidden relative">
      <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full blur-3xl bg-gradient-to-br from-violet-500/10 to-purple-500/10" />
      <CardContent className="p-5 sm:p-6 relative z-10">
        <div className="mb-5">
          <h3 className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Dashboard | төсөл
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Donut chart */}
          <div>
            <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4 h-full flex flex-col">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                Төслийн төлөв
              </p>
              {metrics.statusData.length > 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-full h-[170px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics.statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {metrics.statusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: '8px',
                            border: 'none',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            fontSize: '12px',
                            backgroundColor: '#1e293b',
                            color: '#f8fafc',
                          }}
                          formatter={(value: number, name: string) => [`${value} төсөл`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <div className="text-2xl font-extrabold text-white leading-none">{metrics.total}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">нийт төсөл</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-3">
                    {metrics.statusData.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[11px] text-slate-400 whitespace-nowrap">
                          {item.name} ({item.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-xs text-slate-500">
                  Мэдээлэл байхгүй
                </div>
              )}
            </div>
          </div>

          {/* Stats grid */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <FolderKanban className="h-3.5 w-3.5 text-violet-400" />
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Нийт төсөл</p>
              </div>
              <div className="text-2xl font-extrabold text-white leading-none">{metrics.total}</div>
            </div>

            <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Идэвхтэй</p>
              </div>
              <div className="text-2xl font-extrabold text-emerald-400 leading-none">{metrics.active}</div>
            </div>

            <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Дууссан</p>
              </div>
              <div className="text-2xl font-extrabold text-blue-400 leading-none">{metrics.completed}</div>
            </div>

            <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-3.5 w-3.5 text-rose-400" />
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Хэтэрсэн</p>
              </div>
              <div className="text-2xl font-extrabold text-rose-400 leading-none">{metrics.overdue}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
