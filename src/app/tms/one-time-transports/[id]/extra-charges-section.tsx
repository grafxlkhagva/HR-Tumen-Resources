'use client';

import * as React from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { TmsOneTimeTransport } from '@/app/tms/types';
import { formatMoney } from '../lib';
import { useCarrierPayments } from './use-carrier-payments';

/**
 * 📝 Нэмэлт төлбөр гараар бүртгэх (төлөвлөгөөнөөс гадуур) — prototype
 * shipments.js extra-pay-form порт. Зүүн тал = харилцагчаас нэмж авах
 * (нэхэмжлэхийн мөр + base/vat/total өснө), баруун тал = тээвэрчинд нэмж
 * өгөх (seq-3+ мөр + costPrice өснө). Дүн оруулсан тал шалтгаан ЗААВАЛ.
 */
export function ExtraChargesSection({ transport }: { transport: TmsOneTimeTransport }) {
  const { addExtraCarrierPayment, addExtraInvoiceLine } = useCarrierPayments(transport);

  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState(() => new Date().toISOString().slice(0, 10));
  const [custAmount, setCustAmount] = React.useState('');
  const [custReason, setCustReason] = React.useState('');
  const [carAmount, setCarAmount] = React.useState('');
  const [carReason, setCarReason] = React.useState('');
  const [carMethod, setCarMethod] = React.useState('bank');
  const [errors, setErrors] = React.useState<{
    cust?: string;
    car?: string;
    general?: string;
  }>({});
  const [saving, setSaving] = React.useState(false);

  if (transport.status === 'cancelled') return null;

  const carrierMissing = !transport.carrierName;
  const lines = transport.extraInvoiceLines ?? [];

  const handleSubmit = async () => {
    const custAmt = Math.round(Number(custAmount) || 0);
    const carAmt = Math.round(Number(carAmount) || 0);

    const nextErrors: typeof errors = {};
    if (custAmt <= 0 && carAmt <= 0) {
      nextErrors.general = 'Дор хаяж нэг талд дүн оруулна уу.';
    }
    // Прототипийн дүрэм: дүн оруулсан тал нь шалтгаанаа заавал бичнэ
    if (custAmt > 0 && !custReason.trim()) {
      nextErrors.cust = 'Дүн оруулсан тул шалтгаан заавал бичнэ.';
    }
    if (carAmt > 0 && !carReason.trim()) {
      nextErrors.car = 'Дүн оруулсан тул шалтгаан заавал бичнэ.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      if (custAmt > 0) {
        const ok = await addExtraInvoiceLine({
          amount: custAmt,
          notes: custReason.trim(),
          date: date || null,
        });
        if (ok) {
          setCustAmount('');
          setCustReason('');
        }
      }
      if (carAmt > 0 && !carrierMissing) {
        const ok = await addExtraCarrierPayment({
          amount: carAmt,
          notes: carReason.trim(),
          method: carMethod,
        });
        if (ok) {
          setCarAmount('');
          setCarReason('');
          setCarMethod('bank');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium">
          <span>📝 Нэмэлт төлбөр гараар бүртгэх (төлөвлөгөөнөөс гадуур)</span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="mt-3 space-y-4">
            {/* Огноо — хоёр талд хамаатай */}
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="ot-extra-date" className="text-xs">
                Огноо
              </Label>
              <Input
                id="ot-extra-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 🟦 Харилцагчаас нэмж авах */}
              <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  📥 Харилцагчаас нэмж авах
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="ot-extra-cust-amount" className="text-xs">
                    Дүн (НӨАТ-гүй, ₮)
                  </Label>
                  <Input
                    id="ot-extra-cust-amount"
                    type="number"
                    min={0}
                    step={1}
                    value={custAmount}
                    onChange={(e) => setCustAmount(e.target.value)}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ot-extra-cust-reason" className="text-xs">
                    Шалтгаан *
                  </Label>
                  <Input
                    id="ot-extra-cust-reason"
                    value={custReason}
                    onChange={(e) => setCustReason(e.target.value)}
                    placeholder="жишээ: Захиалагчийн хүсэлтээр нэмэлт ачаа"
                  />
                </div>
                {errors.cust ? (
                  <p className="text-xs text-destructive">{errors.cust}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  Нийт дүн + НӨАТ 10% автоматаар нэмэгдэнэ.
                </p>
              </div>

              {/* 🟥 Тээвэрчинд нэмж өгөх */}
              <div className="rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400">
                  📤 Тээвэрчинд нэмж өгөх
                </p>
                {carrierMissing ? (
                  <p className="text-xs text-muted-foreground">Тээвэрчин бүртгэгдээгүй</p>
                ) : null}
                <div className="space-y-1.5">
                  <Label htmlFor="ot-extra-car-amount" className="text-xs">
                    Дүн (₮)
                  </Label>
                  <Input
                    id="ot-extra-car-amount"
                    type="number"
                    min={0}
                    step={1}
                    value={carAmount}
                    onChange={(e) => setCarAmount(e.target.value)}
                    placeholder="0"
                    disabled={carrierMissing}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ot-extra-car-reason" className="text-xs">
                    Шалтгаан *
                  </Label>
                  <Input
                    id="ot-extra-car-reason"
                    value={carReason}
                    onChange={(e) => setCarReason(e.target.value)}
                    placeholder="жишээ: Машин эвдрэн засварт нэмэлт мөнгө"
                    disabled={carrierMissing}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Арга</Label>
                  <Select value={carMethod} onValueChange={setCarMethod} disabled={carrierMissing}>
                    <SelectTrigger>
                      <SelectValue placeholder="Арга сонгох" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank">🏦 Банк шилжүүлэг</SelectItem>
                      <SelectItem value="cash">💵 Бэлэн</SelectItem>
                      <SelectItem value="other">Бусад</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {errors.car ? <p className="text-xs text-destructive">{errors.car}</p> : null}
                <p className="text-xs text-muted-foreground">
                  Тээвэрчинд төлөх нийт өртөг автоматаар өснө.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <p className="text-xs text-muted-foreground">
                💡 Аль нэг талд дүн оруулбал тэр тал бүртгэгдэнэ. Дүн оруулсан тал шалтгаанаа
                заавал бичнэ.
              </p>
              <div className="flex items-center gap-2">
                {errors.general ? (
                  <span className="text-xs text-destructive">{errors.general}</span>
                ) : null}
                <Button size="sm" onClick={handleSubmit} disabled={saving}>
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Бүртгэх
                </Button>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Нэмэлт нэхэмжлэлийн мөрүүд — collapsible-аас гадна, үргэлж харагдана */}
      {lines.length > 0 ? (
        <div className="mt-3 space-y-1 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">
            📥 Нэмэлт нэхэмжлэлийн мөрүүд
          </p>
          {lines.map((line) => (
            <p key={line.id} className="text-xs text-muted-foreground">
              {line.date ?? '—'} · {line.notes || '—'} ·{' '}
              <span className="font-mono text-foreground">{formatMoney(line.amount)}</span>
            </p>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
