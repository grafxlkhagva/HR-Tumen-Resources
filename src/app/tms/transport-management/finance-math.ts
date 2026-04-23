/**
 * TM санхүүгийн тооцоолол — pure utility. UI-гүй тул unit тест хийхэд
 * тохиромжтой, Sentry/telemetry-ээс хамаарахгүй.
 */

import type {
  TmsContractPriceType,
  TmsContractService,
  TmsQuotationCargo,
  TmsTransportSubUnit,
} from '@/app/tms/types';

/**
 * Жолоочийн үнэ (өртөг) ба харилцагчийн үнэ (НӨАТ-гүй)-гээс ашгийн хувийг
 * тооцоолно. Жолоочийн үнэ 0/null үед NaN/Infinity гаргахгүйгээр 0 буцаана.
 */
export function computeMarginPercent(driverPrice: number, customerPrice: number): number {
  if (!driverPrice || driverPrice <= 0) return 0;
  return ((customerPrice - driverPrice) / driverPrice) * 100;
}

/** 10%-ийн НӨАТ энгийн тооцоолол. Floor биш зориуд round (MNT мөнгөн тэмдэгт). */
export function computeVatAmount(priceBeforeVat: number): number {
  if (!priceBeforeVat || priceBeforeVat <= 0) return 0;
  return Math.round(priceBeforeVat * 0.1);
}

export interface FinanceComputation {
  /** Харилцагчийн гараар оруулсан үнэ (НӨАТ-гүй). */
  priceBeforeVat: number;
  /** Ашиг = харилцагчийн үнэ − жолоочийн үнэ. */
  profitAmount: number;
  /** НӨАТ = priceBeforeVat × 10% (round). */
  vatAmount: number;
  /** НӨАТ багтсан эцсийн үнэ. */
  priceWithVat: number;
  /** Ашгийн хувь. */
  marginPercent: number;
}

export function computeFinance(driverPrice: number, customerPrice: number): FinanceComputation {
  const priceBeforeVat = customerPrice > 0 ? Math.round(customerPrice) : 0;
  const profitAmount = priceBeforeVat - driverPrice;
  const vatAmount = computeVatAmount(priceBeforeVat);
  const priceWithVat = priceBeforeVat + vatAmount;
  const marginPercent = computeMarginPercent(driverPrice, priceBeforeVat);
  return { priceBeforeVat, profitAmount, vatAmount, priceWithVat, marginPercent };
}

// ── Multi-service finance ───────────────────────────────────────────
//
// Нэг TM дор хэд хэдэн гэрээний үйлчилгээ (жишээ: "Бонго хөргүүртэй" + "Маяти
// хөргүүртэй") байгаа үед үйлчилгээ бүрийн нэгж үнэ өөр. Доорх функцууд нь
// үйлчилгээ бүрийг бие даасан мөр болгож, multiplier-аар үржүүлж дүнг нэгтгэнэ.

/**
 * `priceType` тус бүрд sub-transport тоо / cargo жингийн харьцааг тодорхойлно.
 * - `per_day`   → 1 sub = 1 өдөр, олон sub = олон өдрийн тооцоо
 * - `per_ton`   → ачааны нийт жин (цагт хамаарахгүй)
 * - `lump_sum`, `per_month`, `rental`, null → 1 (нэгж үнийг нэг удаа тооцно)
 */
export function getPriceMultiplier(
  priceType: TmsContractPriceType | null | undefined,
  subCount: number,
  cargoTons: number,
): number {
  switch (priceType) {
    case 'per_day':
      return Math.max(0, subCount);
    case 'per_ton':
      return Math.max(0, cargoTons);
    default:
      return 1;
  }
}

export interface ServiceFinanceLine {
  contractServiceId: string;
  name: string;
  priceType: TmsContractPriceType | null;
  unitCustomerPrice: number;
  unitDriverPrice: number;
  subCount: number;
  multiplier: number;
  lineCustomer: number;
  lineDriver: number;
  lineProfit: number;
}

export interface MultiServiceFinance {
  lines: ServiceFinanceLine[];
  totalCustomer: number;
  totalDriver: number;
  totalProfit: number;
  vatAmount: number;
  totalWithVat: number;
  marginPercent: number;
}

/**
 * Ачааны жинг тонн руу хөрвүүлж нэгтгэнэ. `kg` бол /1000, `tons` бол шууд.
 * `pcs`/`liters`/`m3` нь жинтэй шууд холбоогүй тул алгасна (per_ton үнэд хамаарахгүй).
 */
function sumCargoTons(cargos?: TmsQuotationCargo[] | null): number {
  if (!cargos || cargos.length === 0) return 0;
  return cargos.reduce((acc, c) => {
    const q = typeof c?.quantity === 'number' ? c.quantity : 0;
    if (q <= 0) return acc;
    if (c.unit === 'kg') return acc + q / 1000;
    if (c.unit === 'tons') return acc + q;
    return acc;
  }, 0);
}

/**
 * Олон-үйлчилгээт TM-ийн санхүүг гэрээнээс live тооцоолно. `subs`-г
 * `contractServiceId`-ээр групплэж, гэрээний үйлчилгээ тус бүртэй тааруулан
 * multiplier × unit-г дараа нэгтгэнэ.
 *
 * Гэрээ / үйлчилгээ олдоогүй sub-г алгасна (худал өгөгдөл дамжихгүй).
 */
export function computeMultiServiceFinance(
  subs: readonly TmsTransportSubUnit[],
  contractServices: readonly TmsContractService[] | undefined,
  cargos?: TmsQuotationCargo[] | null,
): MultiServiceFinance {
  const empty: MultiServiceFinance = {
    lines: [],
    totalCustomer: 0,
    totalDriver: 0,
    totalProfit: 0,
    vatAmount: 0,
    totalWithVat: 0,
    marginPercent: 0,
  };
  if (!subs || subs.length === 0 || !contractServices || contractServices.length === 0) {
    return empty;
  }

  // subs-г contractServiceId-ээр групплэнэ (хэвлэх дарааллыг хадгална).
  const order: string[] = [];
  const counts = new Map<string, number>();
  for (const s of subs) {
    const id = s?.contractServiceId;
    if (!id) continue;
    if (!counts.has(id)) order.push(id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const totalCargoTons = sumCargoTons(cargos);

  const lines: ServiceFinanceLine[] = [];
  for (const serviceId of order) {
    const svc = contractServices.find((s) => s.id === serviceId);
    if (!svc) continue;
    const subCount = counts.get(serviceId) ?? 0;
    // `price` нь хуучин backward-compat — customerPrice байхгүй бол fallback.
    const unitCustomerPrice = svc.customerPrice ?? svc.price ?? 0;
    const unitDriverPrice = svc.driverPrice ?? 0;
    const priceType = svc.priceType ?? null;
    const multiplier = getPriceMultiplier(priceType, subCount, totalCargoTons);
    const lineCustomer = Math.round(unitCustomerPrice * multiplier);
    const lineDriver = Math.round(unitDriverPrice * multiplier);
    lines.push({
      contractServiceId: serviceId,
      name: svc.name || svc.serviceTypeName || '—',
      priceType,
      unitCustomerPrice,
      unitDriverPrice,
      subCount,
      multiplier,
      lineCustomer,
      lineDriver,
      lineProfit: lineCustomer - lineDriver,
    });
  }

  const totalCustomer = lines.reduce((acc, l) => acc + l.lineCustomer, 0);
  const totalDriver = lines.reduce((acc, l) => acc + l.lineDriver, 0);
  const vatAmount = computeVatAmount(totalCustomer);
  return {
    lines,
    totalCustomer,
    totalDriver,
    totalProfit: totalCustomer - totalDriver,
    vatAmount,
    totalWithVat: totalCustomer + vatAmount,
    marginPercent: computeMarginPercent(totalDriver, totalCustomer),
  };
}
