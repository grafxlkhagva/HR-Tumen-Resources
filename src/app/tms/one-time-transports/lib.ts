import type {
  TmsCarrierPayment,
  TmsOneTimeCheckpointKey,
  TmsOneTimeTransport,
  TmsOneTimeTransportType,
} from '@/app/tms/types';

// ⚡ Бүх мөнгөн тооцоо Math.round ашиглаж бүхэл тоонд буулгана —
// float-ын алдаа нэг ширхэгээр ялгаатай үлдэхээс сэргийлнэ (1,500,000 → 1,499,999 bug).

/** НӨАТ — үргэлж 10% */
export function calcVat(basePrice: number): number {
  return Math.round((basePrice || 0) / 10);
}

/** Нийт дүн = НӨАТ-гүй + НӨАТ */
export function calcTotal(basePrice: number): number {
  return Math.round(basePrice || 0) + calcVat(basePrice);
}

export interface OtPricing {
  base: number;
  vat: number;
  total: number;
  cost: number;
  margin: number;
  marginPct: number;
  /** 0..cost хооронд clamp хийсэн урьдчилгааны дүн */
  advanceAmount: number;
  advancePct: number;
  finalAmount: number;
}

/**
 * Үнийн бүрэн тооцоо — формын live preview болон хадгалалтад хоёуланд нь.
 * advanceAmount өгөөгүй бол advancePct-ээс (default 50, dotor = 100) тооцно.
 */
export function computePricing(input: {
  basePrice?: number | null;
  costPrice?: number | null;
  carrierAdvanceAmount?: number | null;
  carrierAdvancePct?: number | null;
  type?: TmsOneTimeTransportType;
}): OtPricing {
  const base = Math.round(Number(input.basePrice) || 0);
  const cost = Math.round(Number(input.costPrice) || 0);
  const vat = calcVat(base);
  const total = base + vat;
  const margin = base - cost;
  const marginPct = base > 0 ? (margin / base) * 100 : 0;

  const defaultPct = input.type === 'dotor' ? 100 : 50;
  const pct = input.carrierAdvancePct ?? defaultPct;
  const rawAdvance =
    input.carrierAdvanceAmount != null
      ? Math.round(Number(input.carrierAdvanceAmount) || 0)
      : Math.round((cost * pct) / 100);
  const advanceAmount = Math.min(Math.max(rawAdvance, 0), cost);
  const advancePct = cost > 0 ? Math.round((advanceAmount / cost) * 100) : 0;
  const finalAmount = Math.max(0, cost - advanceAmount);

  return { base, vat, total, cost, margin, marginPct, advanceAmount, advancePct, finalAmount };
}

/** Ашиг (зөрүү) = НӨАТ-гүй үнэ − тээвэрчинд төлөх өртөг */
export function calcMargin(t: Pick<TmsOneTimeTransport, 'basePrice' | 'costPrice'>): number {
  return Math.round(t.basePrice || 0) - Math.round(t.costPrice || 0);
}

/** Тээвэрчинд төлсөн нийт (status='paid' мөрүүдийн нийлбэр) */
export function carrierPaidAmount(t: Pick<TmsOneTimeTransport, 'carrierPayments'>): number {
  return (t.carrierPayments ?? [])
    .filter((p) => p.status === 'paid')
    .reduce((sum, p) => sum + (p.amount || 0), 0);
}

/** Тээвэрчинд төлөх нийт (бүх мөрийн нийлбэр; хоосон бол costPrice) */
export function carrierTotalAmount(
  t: Pick<TmsOneTimeTransport, 'carrierPayments' | 'costPrice'>
): number {
  const rows = t.carrierPayments ?? [];
  if (!rows.length) return Math.round(t.costPrice || 0);
  const sum = rows.reduce((s, p) => s + (p.amount || 0), 0);
  return Math.max(sum, Math.round(t.costPrice || 0));
}

/** Тээвэрчинд төлөх үлдэгдэл */
export function carrierOwedAmount(
  t: Pick<TmsOneTimeTransport, 'carrierPayments' | 'costPrice'>
): number {
  return Math.max(0, carrierTotalAmount(t) - carrierPaidAmount(t));
}

export type OtCarrierPaymentRollup = 'na' | 'unpaid' | 'partial' | 'paid';

/** Тээвэрчний төлбөрийн нэгдсэн төлөв */
export function carrierPaymentRollup(
  t: Pick<TmsOneTimeTransport, 'carrierPayments' | 'costPrice'>
): OtCarrierPaymentRollup {
  const total = carrierTotalAmount(t);
  if (total <= 0) return 'na';
  const paid = carrierPaidAmount(t);
  if (paid <= 0) return 'unpaid';
  if (paid < total) return 'partial';
  return 'paid';
}

/** ISO огнооноос days хоног нэмэх — 'YYYY-MM-DD' буцаана */
function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

let uidCounter = 0;
function genId(): string {
  // crypto.randomUUID клиент/тест хоёуланд байдаг; fallback нь давхардалгүй suffix
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  uidCounter += 1;
  return `cp-${Date.now()}-${uidCounter}`;
}

/**
 * Тээвэрчний төлбөрийн хуваарь үүсгэх (prototype create_carrier_payment_schedule порт).
 * - costPrice <= 0 → []
 * - dotor → 100% нэг мөр (нэг өдөртөө дуусдаг тул урьдчилгаа/үлдэгдэл хуваагдахгүй)
 * - бусад → Урьдчилгаа (due = scheduledDate) + Үлдэгдэл (due = scheduledDate + 7 хоног)
 * Идэвхтэй мөр аль хэдийн байвал давхардуулж дуудахгүй байх нь дуудагчийн үүрэг.
 */
export function buildCarrierPaymentSchedule(input: {
  type: TmsOneTimeTransportType;
  costPrice?: number | null;
  scheduledDate?: string | null;
  carrierAdvanceAmount?: number | null;
  carrierAdvancePct?: number | null;
  now?: string;
}): TmsCarrierPayment[] {
  const cost = Math.round(Number(input.costPrice) || 0);
  if (cost <= 0) return [];

  const nowIso = input.now ?? new Date().toISOString();
  const schedDate = input.scheduledDate ? input.scheduledDate.slice(0, 10) : null;

  if (input.type === 'dotor') {
    return [
      {
        id: genId(),
        sequence: 1,
        category: 'advance',
        status: 'scheduled',
        amount: cost,
        dueDate: schedDate,
        notes: 'Бүрэн төлбөр (хот доторх — нэг удаагийн)',
        createdAt: nowIso,
      },
    ];
  }

  const { advanceAmount, finalAmount } = computePricing({
    basePrice: 0,
    costPrice: cost,
    carrierAdvanceAmount: input.carrierAdvanceAmount,
    carrierAdvancePct: input.carrierAdvancePct,
    type: input.type,
  });

  const rows: TmsCarrierPayment[] = [];
  if (advanceAmount > 0) {
    rows.push({
      id: genId(),
      sequence: 1,
      category: 'advance',
      status: 'scheduled',
      amount: advanceAmount,
      dueDate: schedDate,
      notes: 'Урьдчилгаа (тээврийн өмнө)',
      createdAt: nowIso,
    });
  }
  if (finalAmount > 0) {
    rows.push({
      id: genId(),
      sequence: 2,
      category: 'final',
      status: 'scheduled',
      amount: finalAmount,
      dueDate: schedDate ? addDaysIso(schedDate, 7) : null,
      notes: 'Үлдэгдэл (тээврийн дараа)',
      createdAt: nowIso,
    });
  }
  return rows;
}

export interface OtValidationResult {
  isComplete: boolean;
  missing: { field: string; label: string }[];
}

/**
 * ▶ Эхлүүлэхээс өмнөх шалгалт (prototype validateBeforeStart порт).
 * Шаардлага: тээвэрчин, машин, жолооч, эхлэх огноо, өртөг, үнэ,
 * чиглэл (автокран — зөвхөн байршил), бэлэн байдлын checkpoint (зурагтай).
 */
export function validateBeforeStart(
  t: Pick<
    TmsOneTimeTransport,
    | 'type'
    | 'carrierName'
    | 'vehicleId'
    | 'driverId'
    | 'scheduledDate'
    | 'costPrice'
    | 'basePrice'
    | 'origin'
    | 'destination'
    | 'checkpoints'
  >
): OtValidationResult {
  const missing: OtValidationResult['missing'] = [];
  if (!t.carrierName?.trim()) missing.push({ field: 'carrierName', label: '🚛 Тээвэрчин компани' });
  if (!t.vehicleId) missing.push({ field: 'vehicleId', label: '🚚 Машин' });
  if (!t.driverId) missing.push({ field: 'driverId', label: '👤 Жолооч' });
  if (!t.scheduledDate) missing.push({ field: 'scheduledDate', label: '📅 Эхлэх огноо' });
  if (!Math.round(t.costPrice || 0)) missing.push({ field: 'costPrice', label: '🔒 Тээвэрчинд төлөх дүн' });
  if (!Math.round(t.basePrice || 0)) missing.push({ field: 'basePrice', label: '💵 Захиалагчид нэхэмжлэх үнэ' });
  if (t.type === 'avtokran') {
    // Автокран — нэг л байрлалд ажилладаг тул "хаашаа" шаардахгүй
    if (!t.origin) missing.push({ field: 'origin', label: '📍 Үйлчилгээ үзүүлэх байршил' });
  } else {
    if (!t.origin) missing.push({ field: 'origin', label: '📍 Хаанаас' });
    if (!t.destination) missing.push({ field: 'destination', label: '📍 Хаашаа' });
  }
  // Бэлэн байдлын check-point — заавал хийгдсэн байх ёстой (зурагтай)
  const readiness = t.checkpoints?.readiness;
  if (!readiness?.completedAt) {
    missing.push({ field: 'checkpoint_readiness', label: '✅ Бэлэн байдлын зураг + checklist' });
  }
  return { isComplete: missing.length === 0, missing };
}

/** ✓ Дуусгахаас өмнөх шалгалт — ачилт + буулгалтын checkpoint зурагтай байх */
export function validateBeforeComplete(
  t: Pick<TmsOneTimeTransport, 'checkpoints'>
): OtValidationResult {
  const missing: OtValidationResult['missing'] = [];
  const cps = t.checkpoints ?? {};
  if (!cps.loading?.completedAt) {
    missing.push({ field: 'checkpoint_loading', label: '📦 Ачилтын зураг + баталгаа' });
  }
  if (!cps.unloading?.completedAt) {
    missing.push({ field: 'checkpoint_unloading', label: '📤 Буулгалтын зураг + баталгаа' });
  }
  return { isComplete: missing.length === 0, missing };
}

/** Мөнгөн дүн — 1,234,567₮ хэлбэрт */
export function formatMoney(value?: number | null): string {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString()}₮`;
}

/**
 * Банкны гүйлгээний утга автомат үүсгэх (prototype fmt.buildPaymentReference порт).
 * Хэлбэр: "огноо / чиглэл / захиалагч / код / төлбөрийн нэр"
 */
export function buildPaymentReference(
  t: Pick<
    TmsOneTimeTransport,
    'scheduledDate' | 'origin' | 'destination' | 'customerName' | 'code' | 'type'
  >,
  seqLabel: string
): string {
  const parts: string[] = [];
  if (t.scheduledDate) parts.push(t.scheduledDate.slice(0, 10));
  const route = [t.origin, t.destination].filter(Boolean).join('→');
  if (route) parts.push(route);
  if (t.customerName) parts.push(t.customerName);
  if (t.code) parts.push(t.code);
  parts.push(seqLabel);
  return parts.join(' / ');
}

/**
 * Checkpoint шат идэвхтэй (баталгаажуулж болох) эсэх — prototype isActive порт.
 * - readiness: зөвхөн planned төлөвт
 * - loading: in_progress/completed + readiness дууссан
 * - transit: loading дууссан
 * - unloading: transit дууссан ЭСВЭЛ transit алгассан ч loading дууссан
 *   (transit нь optional шат тул түүнийг хүлээхгүй)
 */
export function isCheckpointStageActive(
  stageKey: TmsOneTimeCheckpointKey,
  t: Pick<TmsOneTimeTransport, 'status' | 'checkpoints'>
): boolean {
  const cps = t.checkpoints ?? {};
  if (cps[stageKey]?.completedAt) return false; // аль хэдийн дууссан
  if (t.status === 'cancelled') return false;
  if (stageKey === 'readiness') return t.status === 'planned';
  const working = t.status === 'in_progress' || t.status === 'completed';
  if (!working) return false;
  if (stageKey === 'loading') return !!cps.readiness?.completedAt;
  if (stageKey === 'transit') return !!cps.loading?.completedAt;
  // unloading — transit optional тул loading дууссан бол нээлттэй
  return !!cps.loading?.completedAt;
}
