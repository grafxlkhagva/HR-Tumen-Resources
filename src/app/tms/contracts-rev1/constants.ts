import type {
  TmsCr1BillingPeriod,
  TmsCr1RateUnit,
  TmsCr1ServiceType,
} from '@/app/tms/types';

/** Үйлчилгээний төрлийн label (prototype SERVICE_TYPE_LABEL үгчлэн) */
export const CR1_SERVICE_TYPE_LABELS: Record<TmsCr1ServiceType, string> = {
  tugeelt: '🚚 Түгээлт',
  orn_nutag: '🛣 Орон нутаг',
  dotor: '🏙 Хот доторх',
  avtokran: '🏗 Автокран',
  project: '🏗 Төсөл',
  other: '📦 Бусад',
};

/** Үнэлгээний нэгжийн label (prototype RATE_UNIT_LABEL үгчлэн) */
export const CR1_RATE_UNIT_LABELS: Record<TmsCr1RateUnit, string> = {
  daily: '📅 Өдрийн',
  per_trip: '🚚 Рейсийн',
  per_ton_km: '⚖ Тонн-км',
  per_km: '🛣 Км',
  fixed: '🏷 Тогтсон',
  hourly: '⏱ Цагийн',
  other: 'Бусад',
};

/** Нэгж үнийн подсказка (₮/т·км, ₮/км, ₮) */
export const CR1_RATE_UNIT_HINT: Record<TmsCr1RateUnit, string> = {
  daily: '₮/өдөр',
  per_trip: '₮/рейс',
  per_ton_km: '₮/т·км',
  per_km: '₮/км',
  fixed: '₮',
  hourly: '₮/цаг',
  other: '₮',
};

/** Нэхэмжлэх давтамжийн label (prototype BILLING_LABEL) */
export const CR1_BILLING_LABELS: Record<TmsCr1BillingPeriod, string> = {
  weekly: '7 хоног',
  biweekly: '14 хоног',
  monthly: 'Сар',
  custom: 'Захиалгат',
};

/** Энэ нэгжид зай (км) заавал эсэх */
export function cr1NeedsDistance(rateUnit: TmsCr1RateUnit): boolean {
  return rateUnit === 'per_ton_km' || rateUnit === 'per_km';
}

/** Төсөл сонгоход rate unit автоматаар тонн-км болно (prototype-ийн зан төлөв) */
export function cr1DefaultRateUnit(serviceType: TmsCr1ServiceType): TmsCr1RateUnit {
  return serviceType === 'project' ? 'per_ton_km' : 'daily';
}
