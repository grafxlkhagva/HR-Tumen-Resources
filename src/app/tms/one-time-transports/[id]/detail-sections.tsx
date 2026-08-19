'use client';

import * as React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { TmsOneTimeTransport } from '@/app/tms/types';
import { useTmsReferenceData } from '@/app/tms/reference-data-context';
import {
  OT_PAYMENT_STATUS_MAP,
  OT_RATE_UNIT_LABELS,
  OT_RATE_UNIT_QTY_META,
  OT_URGENCY_LABELS,
  hasLoaderLabels,
} from '../constants';
import {
  calcMargin,
  carrierOwedAmount,
  carrierPaidAmount,
  carrierTotalAmount,
  formatMoney,
} from '../lib';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs uppercase text-muted-foreground mb-2">{children}</p>;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  if (value == null || value === '') return null;
  return (
    <div>
      <span className="text-muted-foreground">{label}: </span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

/** Захиалагч / Машин / Жолооч — гурван карт */
export function OpsInfoStrip({ transport }: { transport: TmsOneTimeTransport }) {
  const loaderLabels = hasLoaderLabels(transport.type);
  const hasLoader = transport.details?.hasLoader;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-4">
        <SectionTitle>🏢 Захиалагч</SectionTitle>
        <p className="font-medium">{transport.customerName || '—'}</p>
        {transport.customerEmployeeName ? (
          <p className="text-xs text-muted-foreground mt-1">
            Менежер: {transport.customerEmployeeName}
          </p>
        ) : null}
        {transport.kamEmployeeName ? (
          <p className="text-xs text-muted-foreground">KAM: {transport.kamEmployeeName}</p>
        ) : null}
        {hasLoader != null ? (
          <span className="mt-2 inline-block rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs">
            {hasLoader ? loaderLabels.yes : loaderLabels.no}
          </span>
        ) : null}
      </Card>

      <Card className="p-4">
        <SectionTitle>🚛 Машин</SectionTitle>
        {transport.vehicleId ? (
          <>
            <p className="font-mono font-medium">{transport.vehiclePlate || '—'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {[transport.vehicleMakeName, transport.bodyType].filter(Boolean).join(' · ') || '—'}
            </p>
            {transport.carrierName ? (
              <p className="text-xs text-muted-foreground">Тээвэрчин: {transport.carrierName}</p>
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

/** Ачааны мэдээллийн тууз — талбар байхгүй бол харагдахгүй */
export function CargoStrip({ transport }: { transport: TmsOneTimeTransport }) {
  const { packagingTypes } = useTmsReferenceData();
  const packagingName = transport.packagingTypeId
    ? packagingTypes.find((p) => p.id === transport.packagingTypeId)?.name
    : null;

  const hasAny =
    transport.cargoType ||
    transport.weightKg != null ||
    transport.volumeM3 != null ||
    packagingName ||
    transport.cargoDescription;
  if (!hasAny) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 p-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
      {transport.cargoType ? <span className="font-medium">{transport.cargoType}</span> : null}
      {transport.weightKg != null ? (
        <span>⚖ {Number(transport.weightKg).toLocaleString()} кг</span>
      ) : null}
      {transport.volumeM3 != null ? <span>📐 {transport.volumeM3} м³</span> : null}
      {packagingName ? <span>🎁 {packagingName}</span> : null}
      {transport.cargoDescription ? (
        <span className="text-muted-foreground w-full">{transport.cargoDescription}</span>
      ) : null}
    </div>
  );
}

/** Тээврийн төрлөөс хамаарсан дэлгэрэнгүй блок */
export function TypeSpecificBlock({ transport }: { transport: TmsOneTimeTransport }) {
  const d = transport.details ?? {};

  if (transport.type === 'orn_nutag') {
    return (
      <Card className="p-4">
        <SectionTitle>🛣 Маршрут</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div className="sm:col-span-2 font-medium">
            {transport.origin || '—'} → {transport.destination || '—'}
          </div>
          <InfoRow label="Ачих хаяг" value={d.pickupAddress} />
          <InfoRow label="Буулгах хаяг" value={d.dropoffAddress} />
          <InfoRow
            label="Нийт зам"
            value={transport.totalDistanceKm != null ? `🛣 ${transport.totalDistanceKm} км` : null}
          />
          <InfoRow
            label="Хүргэх эцсийн хугацаа"
            value={d.deliveryDeadline ? d.deliveryDeadline.replace('T', ' ') : null}
          />
        </div>
      </Card>
    );
  }

  if (transport.type === 'dotor') {
    return (
      <Card className="p-4 border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900">
        <SectionTitle>🏙 Хот доторх</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
          <div className="sm:col-span-2 font-medium">
            {transport.origin || '—'} → {transport.destination || '—'}
          </div>
          <InfoRow
            label="Яаралтай зэрэглэл"
            value={d.urgency ? OT_URGENCY_LABELS[d.urgency] : 'Стандарт'}
          />
          <InfoRow
            label="Нийт зам"
            value={transport.totalDistanceKm != null ? `${transport.totalDistanceKm} км` : null}
          />
          <InfoRow label="Ачих хаяг" value={d.pickupAddress} />
          <InfoRow label="Буулгах хаяг" value={d.dropoffAddress} />
        </div>
      </Card>
    );
  }

  // avtokran
  const qty = d.quantity != null ? Number(d.quantity) : null;
  const rate = d.unitRate != null ? Number(d.unitRate) : null;
  return (
    <Card className="p-4 border-amber-200 bg-amber-50/60 dark:bg-amber-950/20 dark:border-amber-900">
      <SectionTitle>🏗 Автокраны тооцоо</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        <InfoRow
          label="Даац"
          value={d.craneCapacityTons != null ? `${d.craneCapacityTons} т` : null}
        />
        <InfoRow label="Үйлчилгээ" value={d.craneServiceType} />
        <InfoRow label="Оператор" value={d.operatorName} />
        <InfoRow label="Нэгж" value={d.rateUnit ? OT_RATE_UNIT_LABELS[d.rateUnit] : null} />
        <InfoRow
          label={d.rateUnit ? OT_RATE_UNIT_QTY_META[d.rateUnit].label : 'Тоо хэмжээ'}
          value={qty != null ? qty : null}
        />
        <InfoRow label="Нэгж үнэ" value={rate != null ? formatMoney(rate) : null} />
        {qty != null && rate != null ? (
          <div className="sm:col-span-2">
            <span className="text-muted-foreground">Тооцоо: </span>
            <span className="font-medium">
              {qty} × {formatMoney(rate)} = {formatMoney(Math.round(qty * rate))}
            </span>
          </div>
        ) : null}
        {d.rateUnit === 'per_hour' ? (
          <InfoRow
            label="Бэлтгэх"
            value={d.setupTimeMin != null ? `${d.setupTimeMin} мин` : null}
          />
        ) : null}
        <InfoRow label="Байршил" value={d.serviceAddress} />
      </div>
    </Card>
  );
}

/** Үнийн хоёр тал — захиалагчид нэхэмжлэх / тээвэрчинд төлөх (дотоод) */
export function PricingPanel({ transport }: { transport: TmsOneTimeTransport }) {
  const margin = calcMargin(transport);
  const base = Math.round(transport.basePrice || 0);
  const marginPct = base > 0 ? (margin / base) * 100 : 0;
  const paid = carrierPaidAmount(transport);
  const owed = carrierOwedAmount(transport);
  const paymentMeta = transport.paymentStatus
    ? OT_PAYMENT_STATUS_MAP[transport.paymentStatus]
    : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-4 border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-900">
        <SectionTitle>💵 Захиалагчид нэхэмжлэх</SectionTitle>
        <p className="text-2xl font-bold">{formatMoney(transport.totalPrice)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          үүнээс НӨАТ: {formatMoney(transport.vatAmount)} · НӨАТ-гүй:{' '}
          {formatMoney(transport.basePrice)}
        </p>
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
        <p className="text-2xl font-bold">{formatMoney(carrierTotalAmount(transport))}</p>
        <p
          className={cn(
            'text-sm mt-1 font-medium',
            margin >= 0 ? 'text-emerald-600' : 'text-rose-600'
          )}
        >
          Зөрүү: {formatMoney(margin)} ({margin >= 0 ? '+' : ''}
          {marginPct.toFixed(1)}%)
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Төлсөн: {formatMoney(paid)} · Үлдэгдэл: {formatMoney(owed)}
        </p>
      </Card>
    </div>
  );
}
