'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { format, parseISO, addDays, differenceInDays, isValid } from 'date-fns';
import { mn } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Project } from '@/types/project';

type Range = { start: Date; end: Date; totalDays: number };

function clampRange(start: Date, end: Date, maxDays: number): Range {
  const totalDays = Math.max(1, differenceInDays(end, start) + 1);
  if (totalDays <= maxDays) return { start, end, totalDays };
  const clampedEnd = addDays(start, maxDays - 1);
  return { start, end: clampedEnd, totalDays: maxDays };
}

function getProjectBarClass(status: string) {
  switch (status) {
    case 'COMPLETED':
      return 'bg-emerald-500';
    case 'ON_HOLD':
      return 'bg-amber-500';
    case 'ACTIVE':
    case 'IN_PROGRESS':
      return 'bg-primary';
    case 'ARCHIVED':
    case 'CANCELLED':
      return 'bg-slate-400';
    default:
      return 'bg-slate-500';
  }
}

export function ProjectsGantt({ projects }: { projects: Project[] }) {
  const router = useRouter();

  const parsed = React.useMemo(() => {
    return projects
      .map((p) => {
        const start = parseISO(p.startDate);
        const end = parseISO(p.endDate);
        if (!isValid(start) || !isValid(end)) return null;
        return { project: p, start, end };
      })
      .filter(Boolean) as Array<{ project: Project; start: Date; end: Date }>;
  }, [projects]);

  const range = React.useMemo<Range>(() => {
    const today = new Date();
    if (parsed.length === 0) {
      const start = addDays(today, -7);
      const end = addDays(today, 28);
      return clampRange(start, end, 90);
    }
    let min = parsed[0]!.start;
    let max = parsed[0]!.end;
    for (const item of parsed) {
      if (item.start < min) min = item.start;
      if (item.end > max) max = item.end;
    }
    const paddedStart = addDays(min, -3);
    const paddedEnd = addDays(max, 3);
    return clampRange(paddedStart, paddedEnd, 120);
  }, [parsed]);

  const pxPerDay = 8; // mobile-friendly density
  const timelineWidth = range.totalDays * pxPerDay;

  const weekTicks = React.useMemo(() => {
    const ticks: Array<{ dayIndex: number; label: string }> = [];
    for (let i = 0; i < range.totalDays; i += 7) {
      const d = addDays(range.start, i);
      ticks.push({ dayIndex: i, label: format(d, 'MM.dd', { locale: mn }) });
    }
    return ticks;
  }, [range.start, range.totalDays]);

  const todayIndex = React.useMemo(() => {
    const idx = differenceInDays(new Date(), range.start);
    if (idx < 0 || idx > range.totalDays) return null;
    return idx;
  }, [range.start, range.totalDays]);

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="flex">
        {/* Left column */}
        <div className="w-44 shrink-0 border-r border-slate-100">
          <div className="px-4 py-3 text-[11px] font-semibold text-slate-500 bg-white">
            Төсөл
          </div>
          <div className="divide-y divide-slate-50">
            {parsed.map(({ project }) => (
              <button
                key={project.id}
                type="button"
                onClick={() => router.push(`/mobile/projects/${project.id}`)}
                className="w-full px-4 py-3 text-left hover:bg-slate-50 active:bg-slate-100 transition-colors"
              >
                <div className="text-[12px] font-semibold text-slate-900 line-clamp-2">
                  {project.name}
                </div>
                <div className="mt-1 text-[10px] font-medium text-slate-500">
                  {format(parseISO(project.endDate), 'yyyy.MM.dd')}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="flex-1 overflow-x-auto">
          <div style={{ width: timelineWidth }} className="relative">
            {/* Header ticks */}
            <div className="h-10 border-b border-slate-100 bg-white">
              {weekTicks.map((t) => (
                <div
                  key={t.dayIndex}
                  className="absolute top-0 h-full"
                  style={{ left: t.dayIndex * pxPerDay }}
                >
                  <div className="h-full border-l border-slate-100" />
                  <div className="absolute top-2 left-2 text-[10px] font-semibold text-slate-500">
                    {t.label}
                  </div>
                </div>
              ))}
            </div>

            {/* Today marker */}
            {todayIndex !== null ? (
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-rose-500/70"
                style={{ left: todayIndex * pxPerDay }}
              />
            ) : null}

            {/* Rows */}
            <div className="divide-y divide-slate-50">
              {parsed.map(({ project, start, end }) => {
                const startOffset = Math.max(0, differenceInDays(start, range.start));
                const endOffset = Math.min(range.totalDays - 1, differenceInDays(end, range.start));
                const left = startOffset * pxPerDay;
                const width = Math.max(10, (endOffset - startOffset + 1) * pxPerDay);
                return (
                  <div key={project.id} className="h-[52px] relative bg-white">
                    {/* Grid line every week */}
                    {weekTicks.map((t) => (
                      <div
                        key={t.dayIndex}
                        className="absolute top-0 bottom-0 border-l border-slate-100"
                        style={{ left: t.dayIndex * pxPerDay }}
                      />
                    ))}

                    <div
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 h-3 rounded-full',
                        getProjectBarClass(project.status)
                      )}
                      style={{ left, width }}
                    />

                    <div
                      className={cn(
                        'absolute top-1/2 -translate-y-1/2 h-3 rounded-full opacity-20',
                        getProjectBarClass(project.status)
                      )}
                      style={{ left, width }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

