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
  driverPrice: number;
  profitMarginPercent: number;
  hasVat: boolean;
}

function computeFinance(dp: number, margin: number, hasVat: boolean) {
  const sellingPrice = dp > 0 ? Math.round(dp * (1 + margin / 100)) : 0;
  const profitAmount = sellingPrice - dp;
  const vatAmount = hasVat ? Math.round(sellingPrice * 0.1) : 0;
  const transportPrice = sellingPrice + vatAmount;
  return { sellingPrice, profitAmount, vatAmount, transportPrice };
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
      setLocal({
        driverPrice: transport.driverPrice || 0,
        profitMarginPercent: transport.profitMarginPercent || 0,
        hasVat: transport.hasVat || false,
      });
      setValidationError(null);
    }
  }, [open, transport.driverPrice, transport.profitMarginPercent, transport.hasVat]);

  const handleSave = () => {
    if (!local) return;
    if (local.driverPrice < 0) {
      setValidationError('Тээвэрчиний үнэ сөрөг байж болохгүй.');
      return;
    }
    if (local.profitMarginPercent < 0) {
      setValidationError('Ашгийн хувь сөрөг байж болохгүй.');
      return;
    }
    setValidationError(null);
    onFinanceChange(local);
    setOpen(false);
  };

  const dp = transport.driverPrice || 0;
  const margin = transport.profitMarginPercent || 0;
  const display = computeFinance(dp, margin, transport.hasVat || false);

  const preview = local ? computeFinance(local.driverPrice, local.profitMarginPercent, local.hasVat) : null;

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
              <span className="text-xs text-muted-foreground">Тээвэрчиний үнэ</span>
              <span className="font-medium text-sm tabular-nums">{dp > 0 ? `${dp.toLocaleString()}₮` : '—'}</span>
            </div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-muted-foreground">Ашиг ({margin}%)</span>
              <span className="text-sm tabular-nums">{display.profitAmount > 0 ? `+${display.profitAmount.toLocaleString()}₮` : '—'}</span>
            </div>
            {transport.hasVat && (
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">НӨАТ</span>
                <span className="text-sm tabular-nums">+{display.vatAmount.toLocaleString()}₮</span>
              </div>
            )}
          </div>
          <div className="border-t pt-2 flex justify-between items-baseline">
            <span className="text-xs font-medium">Нийт</span>
            <span className="font-bold text-base tabular-nums text-primary">{display.transportPrice > 0 ? `${display.transportPrice.toLocaleString()}₮` : '—'}</span>
          </div>
        </CardContent>
      </Card>

      <AppDialog open={open} onOpenChange={setOpen}>
        <AppDialogContent>
          <AppDialogHeader><AppDialogTitle>Санхүүгийн мэдээлэл засах</AppDialogTitle></AppDialogHeader>
          {local && (
            <AppDialogBody className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Тээвэрчиний үнэ (₮)</Label>
                <Input type="number" min={0} value={local.driverPrice || ''} placeholder="0" onChange={(e) => setLocal((p) => p && { ...p, driverPrice: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Ашгийн хувь (%)</Label>
                <Input type="number" min={0} value={local.profitMarginPercent} onChange={(e) => setLocal((p) => p && { ...p, profitMarginPercent: Number(e.target.value) })} />
              </div>
              <div className="flex items-center h-10 gap-2">
                <Checkbox id="vat" checked={local.hasVat} onCheckedChange={(checked) => setLocal((p) => p && { ...p, hasVat: checked === true })} />
                <Label htmlFor="vat" className="font-normal cursor-pointer">НӨАТ-тэй эсэх (10%)</Label>
              </div>
              {preview && local.driverPrice > 0 && (
                <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Тооцоолол</div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Тээвэрчиний үнэ</span>
                    <span>{local.driverPrice.toLocaleString()}₮</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ашиг ({local.profitMarginPercent}%)</span>
                    <span>+{preview.profitAmount.toLocaleString()}₮</span>
                  </div>
                  <div className="flex justify-between text-sm border-t pt-1">
                    <span className="text-muted-foreground">Борлуулах үнэ</span>
                    <span className="font-medium">{preview.sellingPrice.toLocaleString()}₮</span>
                  </div>
                  {local.hasVat && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">НӨАТ (10%)</span>
                      <span>+{preview.vatAmount.toLocaleString()}₮</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t pt-2 text-primary">
                    <span>Тээврийн үнэ</span>
                    <span>{preview.transportPrice.toLocaleString()}₮</span>
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
