'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Pencil, AlertCircle } from 'lucide-react';
import { AppDialog, AppDialogContent, AppDialogHeader, AppDialogTitle, AppDialogBody } from '@/components/patterns';
import type { TmsTransportManagement } from '@/app/tms/types';

interface FinanceFormData {
  /** Өртөг / жолоочийн үнэ — гараар оруулна. */
  driverPrice: number;
  /** Харилцагчид өгч буй үнэ (НӨАТ-гүй) — гараар оруулна. */
  customerPrice: number;
  hasVat: boolean;
}

/**
 * Харилцагчийн үнэ ба жолоочийн үнийн зөрүүнээс ашгийн хувийг тооцоолно.
 * driverPrice = 0 үед NaN/Infinity гарахаас сэргийлж 0 буцаана.
 */
function computeMarginPercent(dp: number, cp: number): number {
  if (!dp || dp <= 0) return 0;
  return ((cp - dp) / dp) * 100;
}

/**
 * Санхүүгийн харагдах утгуудыг бэлтгэнэ. Харилцагчийн үнэ (НӨАТ-гүй) гараар
 * оруулсан утга — жолоочийн үнээс хасч ашгийн хэмжээг тооцоолно.
 */
function computeFinance(dp: number, cp: number, hasVat: boolean) {
  const priceBeforeVat = cp > 0 ? Math.round(cp) : 0;
  const profitAmount = priceBeforeVat - dp;
  const vatAmount = Math.round(priceBeforeVat * 0.1);
  const priceWithVat = priceBeforeVat + vatAmount;
  const marginPercent = computeMarginPercent(dp, priceBeforeVat);
  return { priceBeforeVat, profitAmount, vatAmount, priceWithVat, marginPercent };
}

interface TransportFinanceCardProps {
  transport: TmsTransportManagement;
  onFinanceChange: (changes: Partial<TmsTransportManagement>) => void;
}

export function TransportFinanceCard({ transport, onFinanceChange }: TransportFinanceCardProps) {
  const [open, setOpen] = React.useState(false);
  const [local, setLocal] = React.useState<FinanceFormData | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      // Хуучин баримтанд customerPrice хадгалагдаагүй бол (driverPrice * (1 + margin/100))-аар
      // нөхөж түлхэц болгон харуулна — хэрэглэгч шаардлагатай бол засч болно.
      const storedCustomer = transport.customerPrice;
      const dp = transport.driverPrice || 0;
      const margin = transport.profitMarginPercent || 0;
      const fallbackCustomer = dp > 0 ? Math.round(dp * (1 + margin / 100)) : 0;
      setLocal({
        driverPrice: dp,
        customerPrice:
          typeof storedCustomer === 'number' && storedCustomer > 0
            ? storedCustomer
            : fallbackCustomer,
        hasVat: transport.hasVat || false,
      });
      setValidationError(null);
    }
  }, [
    open,
    transport.driverPrice,
    transport.customerPrice,
    transport.profitMarginPercent,
    transport.hasVat,
  ]);

  const handleSave = () => {
    if (!local) return;
    if (local.driverPrice < 0) {
      setValidationError('Жолоочийн үнэ сөрөг байж болохгүй.');
      return;
    }
    if (local.customerPrice < 0) {
      setValidationError('Харилцагчийн үнэ сөрөг байж болохгүй.');
      return;
    }
    setValidationError(null);
    // Маржин %-г зөрүүнээс тооцоолон хамт хадгална (хуучин UI-тай нийцтэй).
    const derivedMargin = computeMarginPercent(local.driverPrice, local.customerPrice);
    onFinanceChange({
      driverPrice: local.driverPrice,
      customerPrice: local.customerPrice,
      profitMarginPercent: Number.isFinite(derivedMargin) ? Number(derivedMargin.toFixed(2)) : 0,
      hasVat: local.hasVat,
    });
    setOpen(false);
  };

  const dp = transport.driverPrice || 0;
  // Харилцагчийн үнэ хадгалагдсан бол түүнийг, үгүй бол хуучин маржин-аар тооцоолсон
  // утгаар fallback хийнэ (backward compat).
  const storedCustomer = transport.customerPrice;
  const cp =
    typeof storedCustomer === 'number' && storedCustomer > 0
      ? storedCustomer
      : dp > 0
        ? Math.round(dp * (1 + (transport.profitMarginPercent || 0) / 100))
        : 0;
  const display = computeFinance(dp, cp, transport.hasVat || false);

  const preview = local ? computeFinance(local.driverPrice, local.customerPrice, local.hasVat) : null;

  return (
    <>
      <Card className="flex flex-col h-full border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Санхүү</CardTitle>
          <Button variant="ghost" size="icon-sm" onClick={() => setOpen(true)} className="text-muted-foreground">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-2 flex-1">
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Өртөг / Жолоочийн үнэ</span>
              <span className="font-medium text-sm tabular-nums">{dp > 0 ? `${dp.toLocaleString()}₮` : '—'}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Харилцагчид өгч буй үнэ</span>
              <span className="font-medium text-sm tabular-nums">
                {display.priceBeforeVat > 0 ? `${display.priceBeforeVat.toLocaleString()}₮` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">НӨАТ (10%)</span>
              <span className="text-sm tabular-nums">{display.vatAmount > 0 ? `+${display.vatAmount.toLocaleString()}₮` : '—'}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Харилцагчийн үнэ (НӨАТ-тай)</span>
              <span className="text-sm tabular-nums">{display.priceWithVat > 0 ? `${display.priceWithVat.toLocaleString()}₮` : '—'}</span>
            </div>
          </div>
          <div className="border-t pt-2 flex justify-between items-baseline">
            <span className="text-xs font-medium">Ашиг</span>
            <span className="font-bold text-base tabular-nums text-primary">
              {display.profitAmount !== 0
                ? `${display.profitAmount.toLocaleString()}₮`
                : '—'}
              {display.marginPercent !== 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({display.marginPercent.toFixed(1)}%)
                </span>
              )}
            </span>
          </div>
        </CardContent>
      </Card>

      <AppDialog open={open} onOpenChange={setOpen}>
        <AppDialogContent>
          <AppDialogHeader><AppDialogTitle>Борлуулалтын үнэ тооцоо</AppDialogTitle></AppDialogHeader>
          {local && (
            <AppDialogBody className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Өртөг / Жолоочийн үнэ (₮)</Label>
                <Input
                  type="number"
                  min={0}
                  value={local.driverPrice || ''}
                  placeholder="0"
                  onChange={(e) =>
                    setLocal((p) => p && { ...p, driverPrice: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Харилцагчид өгч буй үнэ (НӨАТ-гүй) (₮)</Label>
                <Input
                  type="number"
                  min={0}
                  value={local.customerPrice || ''}
                  placeholder="0"
                  onChange={(e) =>
                    setLocal((p) => p && { ...p, customerPrice: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Жолоочийн үнэ ба харилцагчийн үнийн зөрүүнээс ашгийн хувь автоматаар
                  тооцоологдоно.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Ашгийн хувь (%) · автомат</Label>
                <Input
                  type="text"
                  readOnly
                  disabled
                  className="bg-muted"
                  value={
                    preview && local.driverPrice > 0
                      ? `${preview.marginPercent.toFixed(2)}%`
                      : '—'
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">НӨАТ (%)</Label>
                <Input type="number" value={10} disabled className="bg-muted" />
              </div>
              <div className="flex items-center h-10 gap-2">
                <Checkbox id="vat" checked={local.hasVat} onCheckedChange={(checked) => setLocal((p) => p && { ...p, hasVat: checked === true })} />
                <Label htmlFor="vat" className="font-normal cursor-pointer">НӨАТ багтсан эсэх</Label>
              </div>

              {preview && local.customerPrice > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Тооцоолол</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Харилцагчийн үнэ (НӨАТ-гүй)</span>
                    <span className="font-medium">{preview.priceBeforeVat.toLocaleString()}₮</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">НӨАТ</span>
                    <span>{preview.vatAmount.toLocaleString()}₮</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-1">
                    <span className="text-muted-foreground">Үнэ (НӨАТ-тай)</span>
                    <span className="font-medium">{preview.priceWithVat.toLocaleString()}₮</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-2">
                    <span className="text-muted-foreground">Ашиг (зөрүү)</span>
                    <span
                      className={
                        preview.profitAmount >= 0
                          ? 'font-bold text-primary'
                          : 'font-bold text-destructive'
                      }
                    >
                      {preview.profitAmount.toLocaleString()}₮
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ашгийн хувь</span>
                    <span
                      className={
                        preview.marginPercent >= 0
                          ? 'font-bold text-primary'
                          : 'font-bold text-destructive'
                      }
                    >
                      {preview.marginPercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              )}
              {validationError && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {validationError}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Цуцлах</Button>
                <Button onClick={handleSave}>Хадгалах</Button>
              </div>
            </AppDialogBody>
          )}
        </AppDialogContent>
      </AppDialog>
    </>
  );
}
