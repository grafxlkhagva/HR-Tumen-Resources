'use client';

import * as React from 'react';
import { doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFirebase, useUser } from '@/firebase';
import { useEmployeeProfile } from '@/hooks/use-employee-profile';
import { useToast } from '@/hooks/use-toast';
import { TMS_RECURRING_TRANSPORTS_COLLECTION } from '@/app/tms/types';
import type { TmsRecurringTransport, TmsRecurringWeighing } from '@/app/tms/types';
import { computeTonKmPricing, formatMoney, isTonKm, validateWeighing } from '../lib';

/**
 * ⚖ Төслийн гүйцэтгэл — пүүний жин бүртгэх + тонн-км үнэ автомат тооцох карт.
 * Зөвхөн per_ton_km үнэлгээтэй тээвэрт харагдана.
 */
export function WeighingCard({ transport }: { transport: TmsRecurringTransport }) {
  const { firestore } = useFirebase();
  const { user } = useUser();
  const { employeeProfile } = useEmployeeProfile();
  const { toast } = useToast();

  const [emptyKg, setEmptyKg] = React.useState('');
  const [loadedKg, setLoadedKg] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Одоогийн бүртгэлээс input-уудыг эхлүүлнэ
  React.useEffect(() => {
    setEmptyKg(
      transport.weighing?.emptyWeightKg != null ? String(transport.weighing.emptyWeightKg) : ''
    );
    setLoadedKg(
      transport.weighing?.loadedWeightKg != null ? String(transport.weighing.loadedWeightKg) : ''
    );
    setError(null);
  }, [transport.weighing?.emptyWeightKg, transport.weighing?.loadedWeightKg]);

  const distanceKm = Number(transport.contractDistanceKm || 0);
  const carrierRate = Number(transport.contractCarrierRate || 0);
  const customerRate = Number(transport.contractCustomerRate || 0);

  const preview = React.useMemo(
    () =>
      computeTonKmPricing({
        emptyWeightKg: Number(emptyKg) || 0,
        loadedWeightKg: Number(loadedKg) || 0,
        distanceKm,
        carrierRate,
        customerRate,
      }),
    [emptyKg, loadedKg, distanceKm, carrierRate, customerRate]
  );

  const locked = ['invoiced', 'paid', 'cancelled'].includes(transport.status);
  const weighedAt = transport.weighing?.weighedAt;

  const handleSave = React.useCallback(async () => {
    if (!firestore || locked) return;
    const input = {
      emptyWeightKg: Number(emptyKg) || 0,
      loadedWeightKg: Number(loadedKg) || 0,
      distanceKm,
      carrierRate,
      customerRate,
    };
    const validationError = validateWeighing(input);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const { cargoKg, cargoTon, cost, revenue, vat, total } = computeTonKmPricing(input);
      const byName = employeeProfile
        ? `${employeeProfile.firstName ?? ''} ${employeeProfile.lastName ?? ''}`.trim() || null
        : null;
      const weighing: TmsRecurringWeighing = {
        emptyWeightKg: input.emptyWeightKg,
        loadedWeightKg: input.loadedWeightKg,
        cargoWeightKg: cargoKg,
        cargoWeightTon: cargoTon,
        weighedAt: new Date().toISOString(),
        byEmployeeId: user?.uid ?? null,
        byEmployeeName: byName,
      };
      await updateDoc(doc(firestore, TMS_RECURRING_TRANSPORTS_COLLECTION, transport.id), {
        weighing,
        costPrice: cost,
        basePrice: revenue,
        vatAmount: vat,
        totalPrice: total,
        totalDistanceKm: distanceKm,
        updatedAt: serverTimestamp(),
      });
      toast({ title: '⚖ Жин бүртгэгдэж, үнэ шинэчлэгдлээ.' });
    } catch (e: unknown) {
      toast({
        variant: 'destructive',
        title: 'Алдаа',
        description: e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа.',
      });
    } finally {
      setSaving(false);
    }
  }, [
    firestore,
    locked,
    emptyKg,
    loadedKg,
    distanceKm,
    carrierRate,
    customerRate,
    employeeProfile,
    user,
    transport.id,
    toast,
  ]);

  if (!isTonKm(transport)) return null;

  return (
    <Card className="p-4 sm:p-5">
      {/* Толгой */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">🏗 ТӨСЛИЙН ГҮЙЦЭТГЭЛ · Тонн-км × Зай</h3>
        {weighedAt ? (
          <Badge variant="success">✓ Жин бүртгэгдсэн · {weighedAt.slice(0, 10)}</Badge>
        ) : (
          <Badge variant="warning">⏳ Жин бүртгээгүй</Badge>
        )}
      </div>

      {/* Гэрээний параметрүүд (зөвхөн харах) */}
      <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className="rounded-lg border p-2">
          <p className="text-[10px] text-muted-foreground">📏 Гэрээний зай</p>
          <p className="font-semibold">
            {transport.contractDistanceKm ?? '—'} <span className="text-[10px] text-muted-foreground">км</span>
          </p>
        </div>
        <div className="rounded-lg border p-2">
          <p className="text-[10px] text-muted-foreground">🔒 Тээвэрчинд</p>
          <p className="font-semibold">
            {formatMoney(carrierRate)}
            <span className="text-[10px] text-muted-foreground">/т·км</span>
          </p>
        </div>
        <div className="rounded-lg border p-2">
          <p className="text-[10px] text-muted-foreground">💵 Захиалагч</p>
          <p className="font-semibold">
            {formatMoney(customerRate)}
            <span className="text-[10px] text-muted-foreground">/т·км</span>
          </p>
        </div>
        <div className="rounded-lg border p-2">
          <p className="text-[10px] text-muted-foreground">📜 Гэрээ</p>
          <p className="font-semibold">{transport.contractCode ?? '—'}</p>
        </div>
      </div>

      {/* Жин хэмжих форм */}
      <div className="rounded-lg border p-3">
        <p className="mb-2 text-xs font-semibold">⚖ Пүүний жин (рейс бүрт)</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="rt-empty-kg" className="text-xs">
              🚚 Хоосон жин (kg)
            </Label>
            <Input
              id="rt-empty-kg"
              type="number"
              min={0}
              step={1}
              value={emptyKg}
              disabled={locked}
              onChange={(e) => setEmptyKg(e.target.value)}
              placeholder="Жишээ: 12,500"
              className="text-right font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Машин хоосон үед пүүнд</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="rt-loaded-kg" className="text-xs">
              📦 Ачаатай жин (kg)
            </Label>
            <Input
              id="rt-loaded-kg"
              type="number"
              min={0}
              step={1}
              value={loadedKg}
              disabled={locked}
              onChange={(e) => setLoadedKg(e.target.value)}
              placeholder="Жишээ: 38,200"
              className="text-right font-mono"
            />
            <p className="text-[10px] text-muted-foreground">Машин ачаатай үед пүүнд</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium">⚖ Ачааны жин (зөрүү)</p>
            <div className="rounded-md border-2 border-rose-200 bg-rose-50/60 px-2 py-1.5 text-right font-mono text-sm font-bold dark:border-rose-900 dark:bg-rose-950/30">
              {preview.cargoKg ? `${preview.cargoKg.toLocaleString('mn-MN')} kg` : '— kg'}
            </div>
            <p className="text-[10px] text-muted-foreground">= {preview.cargoTon.toFixed(3)} тонн</p>
          </div>
        </div>

        {/* Тооцооллын live preview */}
        <div className="mt-3 space-y-1 border-t pt-3 text-xs">
          <p>
            🔒 Тээвэрчинд: {preview.cargoTon.toFixed(3)} × {distanceKm} × {formatMoney(carrierRate)} ={' '}
            <strong>{formatMoney(preview.cost)}</strong>
          </p>
          <p>
            💵 Захиалагчид (НӨАТ-гүй): <strong>{formatMoney(preview.revenue)}</strong>
          </p>
          <p>
            📊 Нийт нэхэмжлэх (НӨАТ-тэй): {formatMoney(preview.revenue)} +{' '}
            {formatMoney(preview.vat)} НӨАТ = <strong>{formatMoney(preview.total)}</strong>
          </p>
        </div>

        {locked ? (
          <p className="mt-3 border-t pt-3 text-[11px] italic text-muted-foreground">
            🔒 Тээвэр нэхэмжлэгдсэн / цуцлагдсан учир жинг өөрчилж болохгүй.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            {error ? (
              <p className="text-xs font-medium text-destructive">{error}</p>
            ) : (
              <span />
            )}
            <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ⚖ Жин хадгалах + үнэ тооцох
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
