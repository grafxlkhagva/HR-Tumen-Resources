import type { TmsOneTimeTransport } from '@/app/tms/types';
import { OT_SHEET_COLUMNS, sheetRawValue } from './sheet-columns';

/** Текст утгыг CSV-д аюулгүй болгох — давхар хашилт давхарлана */
function quote(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Sheet харагдалтын мөрүүдийг CSV болгож татах (prototype exportSheetCsv порт).
 * - money/num — түүхий тоо (хашилтгүй), Excel-д шууд тоо болно
 * - бусад — давхар хашилттай, доторх хашилт давхарласан
 * - ﻿ BOM — Excel кирилл үсгийг зөв таних
 */
export function exportOtCsv(rows: TmsOneTimeTransport[]): void {
  const header = OT_SHEET_COLUMNS.map((c) => quote(c.label)).join(',');
  const lines = rows.map((t) =>
    OT_SHEET_COLUMNS.map((col) => {
      const raw = sheetRawValue(col, t);
      if (col.type === 'money' || col.type === 'num') return String(raw);
      return quote(String(raw));
    }).join(',')
  );
  const csv = '\uFEFF' + [header, ...lines].join('\r\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `one-time-transports-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
