'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  AppDialog,
  AppDialogBody,
  AppDialogContent,
  AppDialogDescription,
  AppDialogFooter,
  AppDialogHeader,
  AppDialogTitle,
} from '@/components/patterns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { TmsCarrierPayment, TmsOneTimeTransport } from '@/app/tms/types';
import { carrierPaymentSeqLabel } from '../constants';
import { formatMoney } from '../lib';
import { useCarrierPayments } from './use-carrier-payments';

interface EditScheduledPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transport: TmsOneTimeTransport;
  row: TmsCarrierPayment | null;
}

/**
 * ✏ КАМ — хуваарьт (scheduled) төлбөрийн дүн/огноо засах цонх.
 * Өөрчлөлтийн тайлбар ЗААВАЛ — notes-д хавсарч аудитын мөр болно.
 */
export function EditScheduledPaymentDialog({
  open,
  onOpenChange,
  transport,
  row,
}: EditScheduledPaymentDialogProps) {
  const { editScheduled } = useCarrierPayments(transport);

  const [amount, setAmount] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Нээгдэх бүрд тухайн мөрийн одоогийн утгуудаар шинэчилнэ
  React.useEffect(() => {
    if (!open || !row) return;
    setAmount(String(row.amount ?? ''));
    setDueDate(row.dueDate ? row.dueDate.slice(0, 10) : '');
    setReason('');
    setError(null);
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.id]);

  const handleSave = async () => {
    if (!row) return;
    const amt = Math.round(Number(amount) || 0);
    if (amt <= 0) {
      setError('⚠ Дүн 0-ээс их байх ёстой.');
      return;
    }
    if (!reason.trim()) {
      setError('⚠ Шалтгаан тайлбар заавал.');
      return;
    }
    setError(null);
    setSaving(true);
    const ok = await editScheduled(row.id, {
      amount: amt,
      dueDate: dueDate || null,
      reason: reason.trim(),
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  if (!row) return null;

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="sm" showClose>
        <AppDialogHeader>
          <AppDialogTitle>✏ Хуваарьт төлбөр засах</AppDialogTitle>
          <AppDialogDescription>
            {carrierPaymentSeqLabel(row.sequence)} — {formatMoney(row.amount)} · Хүлээгдэж буй
            төлбөрийн дүн/огноог засна.
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="esp-amount">Дүн (₮) *</Label>
            <Input
              id="esp-amount"
              type="number"
              step="1"
              min="0"
              className="font-mono"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="esp-date">Төлөх огноо</Label>
            <Input
              id="esp-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="esp-reason">Өөрчлөлтийн тайлбар *</Label>
            <Textarea
              id="esp-reason"
              rows={3}
              placeholder="Жишээ: Замдаа машин эвдрэн, засварын зардал нэмэв"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Энэ тайлбар санхүүгийн ажилтан, КАМ, аудитын лог дээр харагдана.
            </p>
          </div>
          {error && <p className="text-xs font-medium text-destructive">{error}</p>}
        </AppDialogBody>
        <AppDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}💾 Хадгалах
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
