'use client';

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TmsOneTimeTransport } from '@/app/tms/types';
import { OT_STATUS_MAP } from './constants';
import { OT_SHEET_COLUMNS, formatSheetDisplay } from './sheet-columns';

interface OtSheetViewProps {
  items: TmsOneTimeTransport[];
  onRowClick: (id: string) => void;
}

/**
 * Spreadsheet харагдалт — нэг тээвэр = нэг мөр, бүх багана хойшоо
 * (prototype renderSheetShell порт). Толгой мөр sticky, хүрээ дотроо scroll-тай.
 */
export function OtSheetView({ items, onRowClick }: OtSheetViewProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border p-8 text-center text-sm text-muted-foreground">
        Тээвэр байхгүй.
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border max-h-[calc(100vh-320px)]">
      <table className="min-w-full text-[11px] whitespace-nowrap">
        <thead>
          <tr>
            {OT_SHEET_COLUMNS.map((col) => (
              <th
                key={col.key}
                className="sticky top-0 z-10 bg-muted px-2 py-1.5 text-left font-medium border-b"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr
              key={t.id}
              className="cursor-pointer hover:bg-muted/50 border-b"
              onClick={() => onRowClick(t.id)}
            >
              {OT_SHEET_COLUMNS.map((col) => {
                const display = formatSheetDisplay(col, t);
                let content: React.ReactNode = display;
                if (col.type === 'status') {
                  const info = OT_STATUS_MAP[t.status] ?? {
                    label: display,
                    variant: 'secondary' as const,
                  };
                  content = (
                    <Badge variant={info.variant} className="px-1.5 py-0 text-[10px]">
                      {info.label}
                    </Badge>
                  );
                } else if (display === '—') {
                  content = <span className="text-muted-foreground/50">—</span>;
                }
                return (
                  <td
                    key={col.key}
                    className={cn(
                      'px-2 py-1',
                      (col.type === 'money' || col.type === 'num') && 'text-right font-mono'
                    )}
                  >
                    {content}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
