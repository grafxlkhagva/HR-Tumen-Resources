'use client';

import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { TmsCarrierPayment, TmsOneTimeTransport } from '@/app/tms/types';
import { carrierPaymentSeqLabel } from '../constants';
import {
  carrierOwedAmount,
  carrierPaidAmount,
  carrierTotalAmount,
  formatMoney,
} from '../lib';
import { useCarrierPayments } from './use-carrier-payments';
import { EditScheduledPaymentDialog } from './edit-scheduled-payment-dialog';
import { MarkPaidDialog } from './mark-paid-dialog';

/** Төлбөрийн арга — богино label */
function methodLabel(method?: string | null): string {
  if (method === 'bank') return '🏦 Банк';
  if (method === 'cash') return '💵 Бэлэн';
  return method || '—';
}

type LaneTone = 'amber' | 'blue' | 'emerald';

const LANE_CLASSES: Record<LaneTone, { box: string; header: string; subtitle: string }> = {
  amber: {
    box: 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/30',
    header: 'text-amber-800 dark:text-amber-300',
    subtitle: 'text-amber-600 dark:text-amber-400',
  },
  blue: {
    box: 'border-blue-200 bg-blue-50/60 dark:border-blue-900 dark:bg-blue-950/30',
    header: 'text-blue-800 dark:text-blue-300',
    subtitle: 'text-blue-600 dark:text-blue-400',
  },
  emerald: {
    box: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30',
    header: 'text-emerald-800 dark:text-emerald-300',
    subtitle: 'text-emerald-600 dark:text-emerald-400',
  },
};

function Lane({
  tone,
  title,
  subtitle,
  children,
}: {
  tone: LaneTone;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const c = LANE_CLASSES[tone];
  return (
    <div className={cn('rounded-lg border p-3 space-y-2', c.box)}>
      <div className="flex flex-wrap items-center justify-between gap-x-2">
        <span className={cn('text-[10px] font-bold uppercase tracking-wider', c.header)}>
          {title}
        </span>
        {subtitle ? <span className={cn('text-[10px]', c.subtitle)}>{subtitle}</span> : null}
      </div>
      {children}
    </div>
  );
}

/**
 * 💸 Тээвэрчний төлбөрийн 3 эгнээт самбар:
 * КАМ (scheduled, amber) → Санхүү (approved, blue) → Төлсөн (paid, emerald).
 */
export function CarrierPaymentsSection({ transport }: { transport: TmsOneTimeTransport }) {
  const { setStatus, unmarkPaid, removeRow, regenerateSchedule } = useCarrierPayments(transport);

  const rows = transport.carrierPayments ?? [];
  const costPrice = Math.round(transport.costPrice || 0);

  const [editRow, setEditRow] = React.useState<TmsCarrierPayment | null>(null);
  const [payRow, setPayRow] = React.useState<TmsCarrierPayment | null>(null);
  const [deleteRow, setDeleteRow] = React.useState<TmsCarrierPayment | null>(null);
  const [unpayRow, setUnpayRow] = React.useState<TmsCarrierPayment | null>(null);
  const [regenBusy, setRegenBusy] = React.useState(false);

  if (costPrice <= 0 && rows.length === 0) return null;

  const scheduled = rows.filter((p) => p.status === 'scheduled');
  const approved = rows.filter((p) => p.status === 'approved');
  const paid = rows.filter((p) => p.status === 'paid');

  const handleRegen = async () => {
    setRegenBusy(true);
    try {
      await regenerateSchedule();
    } finally {
      setRegenBusy(false);
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold">💸 Тээвэрчинд төлсөн төлбөр</h3>
        <p className="text-xs text-muted-foreground">
          Нийт: {formatMoney(carrierTotalAmount(transport))} · Төлсөн:{' '}
          {formatMoney(carrierPaidAmount(transport))} · Үлдэгдэл:{' '}
          {formatMoney(carrierOwedAmount(transport))}
        </p>
      </div>

      <div className="space-y-3">
        {/* ── ЭГНЭЭ 1 — КАМ (scheduled) ─────────────────────────────── */}
        {scheduled.length > 0 && (
          <Lane
            tone="amber"
            title="📅 КАМ — ШАЛГАХ / ИЛГЭЭХ"
            subtitle="Тээвэр үүсэхэд автомат бичигдсэн хуваарь"
          >
            {scheduled.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 border-t border-amber-200/70 pt-2 text-sm first:border-t-0 first:pt-0 dark:border-amber-900/60"
              >
                <div className="min-w-0">
                  <p className="font-medium">{carrierPaymentSeqLabel(p.sequence)}</p>
                  <p className="text-xs text-muted-foreground">
                    📅 {p.dueDate ? p.dueDate.slice(0, 10) : '—'}
                  </p>
                  {p.notes ? (
                    <p className="text-xs text-muted-foreground">📝 {p.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="font-mono text-sm font-medium">{formatMoney(p.amount)}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    title="Дүн/огноо засах"
                    onClick={() => setEditRow(p)}
                  >
                    ✏
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    title="Санхүүгийн ажилтанд илгээх"
                    onClick={() => void setStatus(p.id, 'approved', 'Санхүү рүү шилжүүллээ.')}
                  >
                    📤 Санхүү
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    title="Устгах"
                    onClick={() => setDeleteRow(p)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </Lane>
        )}

        {/* ── ЭГНЭЭ 2 — САНХҮҮ (approved) ───────────────────────────── */}
        {approved.length > 0 && (
          <Lane
            tone="blue"
            title="🏦 САНХҮҮ — ШИЛЖҮҮЛЭХ"
            subtitle="КАМ зөвшөөрсөн, банкны гүйлгээ хүлээж буй"
          >
            {approved.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 border-t border-blue-200/70 pt-2 text-sm first:border-t-0 first:pt-0 dark:border-blue-900/60"
              >
                <div className="min-w-0">
                  <p className="font-medium">{carrierPaymentSeqLabel(p.sequence)}</p>
                  <p className="text-xs text-muted-foreground">
                    📅 {p.dueDate ? p.dueDate.slice(0, 10) : '—'}
                  </p>
                  {p.notes ? (
                    <p className="text-xs text-muted-foreground">📝 {p.notes}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="font-mono text-sm font-medium">{formatMoney(p.amount)}</span>
                  <Button type="button" size="sm" onClick={() => setPayRow(p)}>
                    ✓ Шилжүүлсэн
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    title="КАМ-руу буцаах (буруу илгээсэн бол)"
                    onClick={() => void setStatus(p.id, 'scheduled', 'КАМ руу буцаалаа.')}
                  >
                    ⤺
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    title="Устгах"
                    onClick={() => setDeleteRow(p)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </Lane>
        )}

        {/* ── ЭГНЭЭ 3 — ТӨЛСӨН (paid) ───────────────────────────────── */}
        {paid.length > 0 && (
          <Lane tone="emerald" title="✓ ТӨЛСӨН" subtitle="Банкны гүйлгээ дууссан">
            {paid.map((p) => (
              <div
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-emerald-200/70 pt-2 text-sm first:border-t-0 first:pt-0 dark:border-emerald-900/60"
              >
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="text-xs text-muted-foreground">
                    {p.paymentDate ? p.paymentDate.slice(0, 10) : '—'}
                  </span>
                  <span className="font-medium">{carrierPaymentSeqLabel(p.sequence)}</span>
                  <span className="text-xs text-muted-foreground">{methodLabel(p.method)}</span>
                  {p.reference ? (
                    <span
                      className="max-w-[160px] truncate font-mono text-[11px] text-muted-foreground"
                      title={p.reference}
                    >
                      {p.reference}
                    </span>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="font-mono text-sm font-medium">{formatMoney(p.amount)}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    title="Төлснийг буцаах"
                    onClick={() => setUnpayRow(p)}
                  >
                    ⤺
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    title="Устгах"
                    onClick={() => setDeleteRow(p)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </Lane>
        )}

        {/* ── Хоосон — хуваарь дахин үүсгэх ─────────────────────────── */}
        {rows.length === 0 && costPrice > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-center dark:border-amber-900 dark:bg-amber-950/30">
            <p className="mb-2 text-sm text-amber-800 dark:text-amber-300">
              Төлбөрийн төлөвлөгөө байхгүй. Энэ тээвэрт{' '}
              <strong>{formatMoney(costPrice)}</strong> өглөгтэй боловч хуваарь бичигдээгүй байна.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={regenBusy}
              onClick={() => void handleRegen()}
            >
              {regenBusy ? '⏳ Үүсгэж байна...' : '🔄 Өглөгийн төлөвлөгөө дахин үүсгэх'}
            </Button>
            <p className="mt-1 text-[10px] text-amber-600 dark:text-amber-400">
              Урьдчилгаа + Үлдэгдэл автомат үүснэ
            </p>
          </div>
        )}
      </div>

      {/* ── Диалогууд ───────────────────────────────────────────────── */}
      <EditScheduledPaymentDialog
        open={!!editRow}
        onOpenChange={(o) => !o && setEditRow(null)}
        transport={transport}
        row={editRow}
      />
      <MarkPaidDialog
        open={!!payRow}
        onOpenChange={(o) => !o && setPayRow(null)}
        transport={transport}
        row={payRow}
      />

      {/* × Устгах баталгаажуулалт */}
      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Төлбөрийн мөр устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow
                ? `${carrierPaymentSeqLabel(deleteRow.sequence)} — ${formatMoney(deleteRow.amount)} мөр бүрмөсөн устгагдана.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteRow) void removeRow(deleteRow.id);
              }}
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ⤺ Төлснийг буцаах баталгаажуулалт */}
      <AlertDialog open={!!unpayRow} onOpenChange={(o) => !o && setUnpayRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Төлснийг буцаах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              {unpayRow
                ? `${carrierPaymentSeqLabel(unpayRow.sequence)} — ${formatMoney(unpayRow.amount)} төлбөр Санхүү эгнээ рүү буцаж, төлсөн огноо арилна.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (unpayRow) void unmarkPaid(unpayRow.id);
              }}
            >
              ⤺ Буцаах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
