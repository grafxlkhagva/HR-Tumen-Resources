import { format } from 'date-fns';
import type { TmsOneTimeTransport } from '@/app/tms/types';
import { OT_TYPE_META, OT_STATUS_MAP, OT_PAYMENT_STATUS_MAP, OT_URGENCY_LABELS } from './constants';
import { calcMargin, carrierPaidAmount, carrierTotalAmount } from './lib';

// ==================================================================
// Sheet (spreadsheet) баганын тодорхойлолт — prototype SHEET_COLUMNS порт.
// Нэг тээвэр = нэг мөр, бүх мэдээлэл хойшоо хэвтэж харагдана.
// ==================================================================

export interface OtSheetColumn {
  key: string;
  label: string;
  /** Байхгүй бол энгийн текст */
  type?: 'money' | 'num' | 'date' | 'datetime' | 'status';
  /** Түүхий утга — datetime багана Firestore Timestamp байж болно */
  get(t: TmsOneTimeTransport): unknown;
}

export const OT_SHEET_COLUMNS: OtSheetColumn[] = [
  { key: 'code', label: 'Код', get: (t) => t.code },
  { key: 'type', label: 'Төрөл', get: (t) => OT_TYPE_META[t.type]?.title ?? t.type },
  { key: 'scheduledDate', label: 'Эхлэх огноо', type: 'date', get: (t) => t.scheduledDate },
  { key: 'status', label: 'Төлөв', type: 'status', get: (t) => t.status },
  { key: 'customerName', label: 'Захиалагч', get: (t) => t.customerName },
  { key: 'customerEmployeeName', label: '👤 Менежер', get: (t) => t.customerEmployeeName },
  { key: 'kamEmployeeName', label: 'KAM', get: (t) => t.kamEmployeeName },
  { key: 'origin', label: 'Ачих', get: (t) => t.origin },
  { key: 'pickupAddress', label: 'Ачих нарийн хаяг', get: (t) => t.details?.pickupAddress },
  { key: 'destination', label: 'Буух', get: (t) => t.destination },
  { key: 'dropoffAddress', label: 'Буух нарийн хаяг', get: (t) => t.details?.dropoffAddress },
  {
    key: 'deliveryDeadline',
    label: 'Хүргэх эцсийн',
    type: 'date',
    get: (t) => t.details?.deliveryDeadline,
  },
  {
    key: 'urgency',
    label: 'Яаралтай',
    get: (t) => (t.details?.urgency ? OT_URGENCY_LABELS[t.details.urgency] : null),
  },
  {
    key: 'hasLoader',
    label: 'Ачигчтай',
    get: (t) => (t.details?.hasLoader == null ? null : t.details.hasLoader ? 'Тийм' : 'Үгүй'),
  },
  {
    key: 'craneCapacityTons',
    label: 'Краны даац (т)',
    type: 'num',
    get: (t) => t.details?.craneCapacityTons,
  },
  { key: 'craneServiceType', label: 'Үйлчилгээ', get: (t) => t.details?.craneServiceType },
  { key: 'unitRate', label: 'Нэгж үнэ (₮)', type: 'money', get: (t) => t.details?.unitRate },
  { key: 'quantity', label: 'Тоо хэмжээ', type: 'num', get: (t) => t.details?.quantity },
  { key: 'totalDistanceKm', label: 'Зай (км)', type: 'num', get: (t) => t.totalDistanceKm },
  { key: 'carrierName', label: 'Тээвэрлэгч', get: (t) => t.carrierName },
  { key: 'vehicleMakeName', label: '🚛 Машины төрөл', get: (t) => t.vehicleMakeName },
  { key: 'vehiclePlate', label: 'Машин', get: (t) => t.vehiclePlate },
  { key: 'bodyType', label: 'Тэвш', get: (t) => t.bodyType },
  { key: 'driverName', label: 'Жолооч', get: (t) => t.driverName },
  { key: 'driverPhone', label: 'Утас', get: (t) => t.driverPhone },
  { key: 'weightKg', label: 'Жин (кг)', type: 'num', get: (t) => t.weightKg },
  { key: 'volumeM3', label: 'Эзэлхүүн (м³)', type: 'num', get: (t) => t.volumeM3 },
  { key: 'cargoType', label: 'Ачааны төрөл', get: (t) => t.cargoType },
  { key: 'cargoDescription', label: 'Ачааны дэлгэрэнгүй', get: (t) => t.cargoDescription },
  { key: 'carrierTotal', label: 'Тээвэрчинд (₮)', type: 'money', get: (t) => carrierTotalAmount(t) },
  { key: 'carrierAdvancePct', label: 'Урьдчилгаа %', type: 'num', get: (t) => t.carrierAdvancePct },
  { key: 'carrierPaid', label: 'Төлсөн (₮)', type: 'money', get: (t) => carrierPaidAmount(t) },
  { key: 'basePrice', label: 'НӨАТ-гүй (₮)', type: 'money', get: (t) => t.basePrice },
  { key: 'vatAmount', label: 'НӨАТ (₮)', type: 'money', get: (t) => t.vatAmount },
  { key: 'totalPrice', label: 'Нийт дүн (₮)', type: 'money', get: (t) => t.totalPrice },
  { key: 'margin', label: 'Зөрүү (₮)', type: 'money', get: (t) => calcMargin(t) },
  { key: 'invoiceNumber', label: 'Нэхэмжлэх', get: (t) => t.invoiceNumber },
  {
    key: 'paymentStatus',
    label: '💳 Төлбөрийн төлөв',
    get: (t) => OT_PAYMENT_STATUS_MAP[t.paymentStatus ?? 'unpaid']?.label,
  },
  { key: 'startedAt', label: 'Эхэлсэн', type: 'datetime', get: (t) => t.startedAt },
  { key: 'completedAt', label: 'Дууссан', type: 'datetime', get: (t) => t.completedAt },
  { key: 'transitKm', label: '🛣 Транзит км', type: 'num', get: (t) => t.checkpoints?.transit?.km },
  {
    key: 'transitFuel',
    label: '⛽ Шатахуун (₮)',
    type: 'money',
    get: (t) => t.checkpoints?.transit?.fuelAmount,
  },
  { key: 'notes', label: '📝 Тэмдэглэл', get: (t) => t.notes },
  { key: 'createdAt', label: 'Үүсгэсэн', type: 'datetime', get: (t) => t.createdAt },
];

/** Firestore Timestamp эсэхийг шалгах (toDate функцтэй) */
function isTimestampLike(v: unknown): v is { toDate(): Date } {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { toDate?: unknown }).toDate === 'function'
  );
}

function isEmpty(v: unknown): boolean {
  return v == null || v === '';
}

/** Datetime утга → 'yyyy.MM.dd HH:mm' (Timestamp эсвэл ISO string хоёуланд) */
function formatDatetimeValue(v: unknown): string {
  if (isTimestampLike(v)) return format(v.toDate(), 'yyyy.MM.dd HH:mm');
  return String(v).slice(0, 16).replace('T', ' ');
}

/** Дэлгэцэд харуулах утга — sheet болон CSV-ийн хамтын форматлагч */
export function formatSheetDisplay(col: OtSheetColumn, t: TmsOneTimeTransport): string {
  const v = col.get(t);
  if (isEmpty(v)) return '—';
  switch (col.type) {
    case 'money':
    case 'num':
      return Number(v).toLocaleString();
    case 'date':
      return String(v).slice(0, 10);
    case 'datetime':
      return formatDatetimeValue(v);
    case 'status':
      return OT_STATUS_MAP[v as keyof typeof OT_STATUS_MAP]?.label ?? String(v);
    default:
      return String(v);
  }
}

/** CSV-д зориулсан түүхий утга — money/num тоо (эсвэл ''), бусад нь plain string */
export function sheetRawValue(col: OtSheetColumn, t: TmsOneTimeTransport): number | string {
  const v = col.get(t);
  if (isEmpty(v)) return '';
  switch (col.type) {
    case 'money':
    case 'num': {
      const n = Number(v);
      return Number.isNaN(n) ? '' : n;
    }
    case 'date':
      return String(v).slice(0, 10);
    case 'datetime':
      return formatDatetimeValue(v);
    case 'status':
      return OT_STATUS_MAP[v as keyof typeof OT_STATUS_MAP]?.label ?? String(v);
    default:
      return String(v);
  }
}
