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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TmsCarrierPayment, TmsOneTimeTransport } from '@/app/tms/types';
import { carrierPaymentSeqLabel } from '../constants';
import { buildPaymentReference, formatMoney } from '../lib';
import { useCarrierPayments } from './use-carrier-payments';

interface MarkPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transport: TmsOneTimeTransport;
  row: TmsCarrierPayment | null;
}

/**
 * ✓ Санхүү — банкны гүйлгээ хийгдсэнийг бүртгэх цонх.
 * Гүйлгээний утга автоматаар бөглөгдөнө; гараар зассан бол дахин бөглөхгүй
 * ("⟳ Дахин бөглөх" товч сэргээнэ).
 */
export function MarkPaidDialog({ open, onOpenChange, transport, row }: MarkPaidDialogProps) {
  const { markPaid } = useCarrierPayments(transport);

  const [paymentDate, setPaymentDate] = React.useState('');
  const [method, setMethod] = React.useState('bank');
  const [reference, setReference] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const [dateError, setDateError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  // Нээгдэх бүрд default утгуудаар шинэчилнэ
  React.useEffect(() => {
    if (!open || !row) return;
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setMethod('bank');
    setTouched(false);
    setDateError(null);
    setSaving(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.id]);

  // Гүйлгээний утга — хэрэглэгч гараар засаагүй л бол автоматаар бөглөнө
  React.useEffect(() => {
    if (!open || !row || touched) return;
    setReference(buildPaymentReference(transport, carrierPaymentSeqLabel(row.sequence)));
  }, [open, row, touched, transport]);

  const regenerateReference = () => {
    if (!row) return;
    setReference(buildPaymentReference(transport, carrierPaymentSeqLabel(row.sequence)));
    setTouched(false);
  };

  const handleSave = async () => {
    if (!row) return;
    if (!paymentDate) {
      setDateError('⚠ Төлсөн огноо заавал.');
      return;
    }
    setSaving(true);
    const ok = await markPaid(row.id, {
      paymentDate,
      method,
      reference: reference.trim(),
    });
    setSaving(false);
    if (ok) onOpenChange(false);
  };

  if (!row) return null;

  return (
    <AppDialog open={open} onOpenChange={onOpenChange}>
      <AppDialogContent size="md" showClose>
        <AppDialogHeader>
          <AppDialogTitle>✓ Төлбөр төлсөн гэж бүртгэх</AppDialogTitle>
          <AppDialogDescription>
            {carrierPaymentSeqLabel(row.sequence)} — {formatMoney(row.amount)}
          </AppDialogDescription>
        </AppDialogHeader>
        <AppDialogBody className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mp-date">Төлсөн огноо *</Label>
              <Input
                id="mp-date"
                type="date"
                value={paymentDate}
                onChange={(e) => {
                  setPaymentDate(e.target.value);
                  if (e.target.value) setDateError(null);
                }}
              />
              {dateError && <p className="text-xs font-medium text-destructive">{dateError}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mp-method">Арга</Label>
              <Select value={method} onValueChange={setMethod}>
                <SelectTrigger id="mp-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank">🏦 Банк шилжүүлэг</SelectItem>
                  <SelectItem value="cash">💵 Бэлэн</SelectItem>
                  <SelectItem value="other">Бусад</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="mp-reference">
                Гүйлгээний утга{' '}
                <span className="text-[10px] font-normal text-muted-foreground">
                  (банкны гүйлгээнд хуулна)
                </span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px]"
                onClick={regenerateReference}
              >
                ⟳ Дахин бөглөх
              </Button>
            </div>
            <Input
              id="mp-reference"
              className="font-mono text-xs"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                setTouched(true);
              }}
            />
          </div>
        </AppDialogBody>
        <AppDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Болих
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}✓ Төлсөн
          </Button>
        </AppDialogFooter>
      </AppDialogContent>
    </AppDialog>
  );
}
