/**
 * TM санхүүгийн тооцоолол — pure utility. UI-гүй тул unit тест хийхэд
 * тохиромжтой, Sentry/telemetry-ээс хамаарахгүй.
 */

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
