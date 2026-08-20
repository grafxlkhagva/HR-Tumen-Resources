'use client';

import * as React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TmsRecurringTransport } from '@/app/tms/types';
import { OT_PAYMENT_STATUS_MAP } from '../../one-time-transports/constants';
import { formatMoney, isTonKm } from '../lib';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase text-muted-foreground mb-2">{children}</p>;
}

/** Захиалагч / Машин / Жолооч — гурван карт */
export function OpsInfoStrip({ transport }: { transport: TmsRecurringTransport }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">
        <SectionTitle>🏢 Захиалагч</SectionTitle>
        <p className="font-medium">{transport.customerName || '—'}</p>
        {transport.kamEmployeeName ? (
          <p className="text-xs text-muted-foreground mt-1">KAM: {transport.kamEmployeeName}</p>
        ) : null}
      </Card>

      <Card className="p-4">
        <SectionTitle>🚛 Машин</SectionTitle>
        {transport.vehicleId ? (
          <>
            <p className="font-mono font-medium">{transport.vehiclePlate || '—'}</p>
            {transport.carrierName ? (
              <p className="text-xs text-muted-foreground mt-1">
                Тээвэрчин: {transport.carrierName}
              </p>
            ) : null}
          </>
        ) : (
          <p className="text-amber-600 text-sm">⚠ Томилогдоогүй</p>
        )}
      </Card>

      <Card className="p-4">
        <SectionTitle>👤 Жолооч</SectionTitle>
        {transport.driverId ? (
          <>
            <p className="font-medium">{transport.driverName || '—'}</p>
            {transport.driverPhone ? (
              <p className="text-xs text-muted-foreground mt-1">📞 {transport.driverPhone}</p>
            ) : null}
          </>
        ) : (
          <p className="text-amber-600 text-sm">⚠ Томилогдоогүй</p>
        )}
      </Card>
    </div>
  );
}

/** Үнийн хоёр тал — захиалагчид нэхэмжлэх / тээвэрчинд төлөх (дотоод) */
export function PricingPanel({ transport }: { transport: TmsRecurringTransport }) {
  const tonKmPending = isTonKm(transport) && !transport.weighing?.weighedAt;
  const base = Math.round(transport.basePrice || 0);
  const cost = Math.round(transport.costPrice || 0);
  const margin = base - cost;
  const marginPct = base > 0 ? (margin / base) * 100 : 0;
  const paymentMeta = transport.paymentStatus
    ? OT_PAYMENT_STATUS_MAP[transport.paymentStatus]
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4 border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900">
        <SectionTitle>💵 Захиалагчид нэхэмжлэх</SectionTitle>
        {tonKmPending ? (
          <p className="text-sm text-muted-foreground">
            ⚖ Пүүний жин бүртгэгдээгүй — үнэ тооцоологдоогүй
          </p>
        ) : (
          <>
            <p className="text-2xl font-bold">{formatMoney(transport.totalPrice)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              үүнээс НӨАТ: {formatMoney(transport.vatAmount)} · НӨАТ-гүй:{' '}
              {formatMoney(transport.basePrice)}
            </p>
          </>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {transport.invoiceNumber ? (
            <span className="font-mono text-xs">🧾 {transport.invoiceNumber}</span>
          ) : null}
          {paymentMeta ? (
            <Badge variant={paymentMeta.variant} className="text-xs">
              {paymentMeta.label}
            </Badge>
          ) : null}
        </div>
      </Card>

      <Card className="p-4 border-rose-200 bg-rose-50/60 dark:bg-rose-950/20 dark:border-rose-900">
        <SectionTitle>🔒 Тээвэрчинд төлөх (дотоод)</SectionTitle>
        {tonKmPending ? (
          <p className="text-sm text-muted-foreground">
            ⚖ Пүүний жин бүртгэгдээгүй — үнэ тооцоологдоогүй
          </p>
        ) : (
          <>
            <p className="text-2xl font-bold">{formatMoney(cost)}</p>
            <p
              className={cn(
                'text-sm mt-1 font-medium',
                margin >= 0 ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              Зөрүү: {formatMoney(margin)} ({margin >= 0 ? '+' : ''}
              {marginPct.toFixed(1)}%)
            </p>
          </>
        )}
      </Card>
    </div>
  );
}

/**
 * Гэрээт тээврийн banner — тээвэрчний төлбөр тусдаа хадгалагдахгүй,
 * тайлант үеэр нэгтгэн тооцоо (settlement) хийгдэнэ гэдгийг сануулна.
 * per_ton_km-д гэрээний зай + үнэлгээний параметрүүдийг мөн харуулна.
 */
export function ContractBanner({ transport }: { transport: TmsRecurringTransport }) {
  const tonKmParams = isTonKm(transport) ? (
    <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs border-t border-current/20 pt-2">
      <span>
        📏 Гэрээний зай:{' '}
        <span className="font-medium">
          {transport.contractDistanceKm != null ? `${transport.contractDistanceKm} км` : '—'}
        </span>
      </span>
      <span>
        🔒 Тээвэрчин:{' '}
        <span className="font-medium">
          {transport.contractCarrierRate != null
            ? `${Number(transport.contractCarrierRate).toLocaleString()}₮/т·км`
            : '—'}
        </span>
      </span>
      <span>
        💵 Захиалагч:{' '}
        <span className="font-medium">
          {transport.contractCustomerRate != null
            ? `${Number(transport.contractCustomerRate).toLocaleString()}₮/т·км`
            : '—'}
        </span>
      </span>
    </div>
  ) : null;

  if (transport.settledAt) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-sm text-emerald-700">
        ✅ Өглөг нэгтгэгдсэн — энэ тээвэр гэрээт нэгтгэлд багтсан. Огноо: {transport.settledAt}
        {tonKmParams}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-4 text-sm text-blue-700">
      💡 Гэрээт тээвэр — тээвэрчинд төлөх төлбөр энэ тээвэрт тусдаа хадгалагдахгүй. Тайлант үеэр
      нэгтгэн тооцоо (settlement) хийгдэнэ. Гэрээ:{' '}
      <Link
        href={'/tms/contracts/' + transport.contractId}
        className="font-medium underline hover:text-blue-900 dark:hover:text-blue-300"
      >
        📜 {transport.contractCode || 'Гэрээ'}
      </Link>
      {transport.contractServiceName ? (
        <> · Үйлчилгээ: {transport.contractServiceName}</>
      ) : null}
      {tonKmParams}
    </div>
  );
}
