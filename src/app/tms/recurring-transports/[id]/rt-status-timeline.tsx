'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TmsRecurringTransport } from '@/app/tms/types';
import { RT_STATUS_MAP, RT_STATUS_ORDER } from '../constants';

/**
 * Статусын timeline — planned → in_progress → completed → invoiced → paid.
 * Цуцлагдсан бол timeline-ийн оронд rose banner харуулна.
 */
export function RtStatusTimeline({ transport }: { transport: TmsRecurringTransport }) {
  if (transport.status === 'cancelled') {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/30 p-4 text-sm text-rose-700">
        <p className="font-medium">✗ Энэ тээвэр цуцлагдсан</p>
        {transport.cancelReason ? (
          <p className="mt-1 text-xs">Шалтгаан: {transport.cancelReason}</p>
        ) : null}
      </div>
    );
  }

  const status = transport.status;
  const currentIdx = RT_STATUS_ORDER.indexOf(status as (typeof RT_STATUS_ORDER)[number]);
  const invoicedIdx = RT_STATUS_ORDER.indexOf('invoiced');
  // Нэхэмжлэхийн дугаартай бол "Нэхэмжлэгдсэн" шатыг хүрсэнд тооцно
  const effectiveIdx = transport.invoiceNumber
    ? Math.max(currentIdx, invoicedIdx)
    : currentIdx;
  const allDone = status === 'paid';

  const startedStr =
    transport.startedAt?.toDate ? format(transport.startedAt.toDate(), 'yyyy.MM.dd HH:mm') : null;
  const completedStr =
    transport.completedAt?.toDate
      ? format(transport.completedAt.toDate(), 'yyyy.MM.dd HH:mm')
      : null;

  return (
    <Card className="p-4">
      <div className="flex items-center">
        {RT_STATUS_ORDER.map((step, idx) => {
          const done = allDone || idx < effectiveIdx;
          const active = !allDone && idx === effectiveIdx;
          return (
            <React.Fragment key={step}>
              {idx > 0 ? (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1',
                    allDone || idx <= effectiveIdx ? 'bg-emerald-500' : 'bg-muted'
                  )}
                />
              ) : null}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold',
                    done && 'bg-emerald-500 text-white',
                    active &&
                      'bg-amber-400 text-white ring-4 ring-amber-100 dark:ring-amber-900',
                    !done && !active && 'bg-muted text-muted-foreground'
                  )}
                >
                  {done ? '✓' : idx + 1}
                </div>
                <span className="text-xs mt-1 text-center">{RT_STATUS_MAP[step].label}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {startedStr || completedStr ? (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          {startedStr ? <span>▶ Эхэлсэн: {startedStr}</span> : null}
          {completedStr ? <span>✓ Дууссан: {completedStr}</span> : null}
        </div>
      ) : null}
    </Card>
  );
}
