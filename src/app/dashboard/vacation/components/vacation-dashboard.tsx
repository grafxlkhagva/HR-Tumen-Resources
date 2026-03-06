'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCollection, useFirebase, useMemoFirebase } from '@/firebase';
import { collectionGroup, query, orderBy } from 'firebase/firestore';
import { isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { CalendarIcon, Clock, Palmtree } from 'lucide-react';
import type { VacationRequest } from '@/types/vacation';

export function VacationDashboard() {
  const today = startOfDay(new Date());

  const requestsQuery = useMemoFirebase(
    ({ firestore }) =>
      firestore ? query(collectionGroup(firestore, 'vacationRequests'), orderBy('startDate', 'desc')) : null,
    []
  );
  const { data: requests, isLoading } = useCollection<VacationRequest>(requestsQuery);

  const metrics = React.useMemo(() => {
    if (!requests) return null;

    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const onLeave = requests.filter((r) => {
      if (r.status !== 'APPROVED') return false;
      if (r.splits && r.splits.length > 0) {
        return r.splits.some((split) =>
          isWithinInterval(today, {
            start: startOfDay(parseISO(split.start)),
            end: endOfDay(parseISO(split.end)),
          })
        );
      }
      return isWithinInterval(today, {
        start: startOfDay(parseISO(r.startDate)),
        end: endOfDay(parseISO(r.endDate)),
      });
    }).length;

    return { total, pending, onLeave };
  }, [requests, today]);

  if (isLoading || !metrics) {
    return (
      <Card className="bg-slate-900 dark:bg-slate-800 border-slate-700">
        <CardContent className="p-5 sm:p-6">
          <Skeleton className="h-5 w-32 mb-5 bg-slate-700" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
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
        <h3 className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-5">
          Dashboard | Ээлжийн амралт
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-3.5 w-3.5 text-slate-400" />
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Нийт хүсэлт
              </p>
            </div>
            <div className="text-2xl font-extrabold text-white leading-none">
              {metrics.total}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Бүх цаг үеийн
            </p>
          </div>

          <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Шийдвэрлэх
              </p>
            </div>
            <div className="text-2xl font-extrabold text-amber-400 leading-none">
              {metrics.pending}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Хүлээгдэж буй хүсэлт
            </p>
          </div>

          <div className="rounded-xl bg-slate-800/50 dark:bg-slate-700/30 border border-slate-700/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Palmtree className="h-3.5 w-3.5 text-emerald-400" />
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                Амарч байгаа
              </p>
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 leading-none">
              {metrics.onLeave}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">
              Өнөөдөр амралтад
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
