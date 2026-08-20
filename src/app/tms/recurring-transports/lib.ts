import type {
  TmsOneTimeCheckpointKey,
  TmsRecurringTransport,
} from '@/app/tms/types';
import { calcTotal, calcVat } from '../one-time-transports/lib';

export { calcVat, calcTotal, formatMoney } from '../one-time-transports/lib';

/** per_ton_km үнэлгээтэй эсэх (жин хэмжилт + 0-ээс эхлэх үнэ) */
export function isTonKm(t: Pick<TmsRecurringTransport, 'contractPriceType'>): boolean {
  return t.contractPriceType === 'per_ton_km';
}

export interface TonKmPricing {
  cargoKg: number;
  cargoTon: number;
  cost: number;
  revenue: number;
  vat: number;
  total: number;
}

/**
 * Тонн-км тооцоо (prototype-ийн томьёо):
 * cargoTon = max(0, ачаатай − хоосон) / 1000
 * cost = round(тонн × км × тээвэрчний ₮/т·км); revenue = мөн адил захиалагчийн үнээр
 */
export function computeTonKmPricing(input: {
  emptyWeightKg: number;
  loadedWeightKg: number;
  distanceKm: number;
  carrierRate: number;
  customerRate: number;
}): TonKmPricing {
  const cargoKg = Math.max(0, (input.loadedWeightKg || 0) - (input.emptyWeightKg || 0));
  const cargoTon = cargoKg / 1000;
  const cost = Math.round(cargoTon * (input.distanceKm || 0) * (input.carrierRate || 0));
  const revenue = Math.round(cargoTon * (input.distanceKm || 0) * (input.customerRate || 0));
  const vat = calcVat(revenue);
  const total = calcTotal(revenue);
  return { cargoKg, cargoTon: Number(cargoTon.toFixed(3)), cost, revenue, vat, total };
}

/** Жин хадгалахын өмнөх шалгалт — prototype-ийн 4 дүрэм, дарааллаараа */
export function validateWeighing(input: {
  emptyWeightKg: number;
  loadedWeightKg: number;
  distanceKm: number;
  carrierRate: number;
  customerRate: number;
}): string | null {
  if (!(input.emptyWeightKg > 0) || !(input.loadedWeightKg > 0)) {
    return '⚠ Хоосон болон ачаатай жинг хоёуланг оруулна уу.';
  }
  if (input.loadedWeightKg <= input.emptyWeightKg) {
    return '⚠ Ачаатай жин нь хоосон жинээс их байх ёстой.';
  }
  if (!(input.distanceKm > 0)) {
    return '⚠ Гэрээний зай (км) тодорхойгүй. Гэрээний үйлчилгээ дээр зай нэмнэ үү.';
  }
  if (!(input.carrierRate > 0) && !(input.customerRate > 0)) {
    return '⚠ Гэрээний үнэлгээ тодорхойгүй.';
  }
  return null;
}

export interface RtValidationResult {
  isComplete: boolean;
  missing: { field: string; label: string }[];
}

/**
 * ▶ Эхлүүлэхийн өмнөх шалгалт.
 * per_ton_km: үнийн оронд гэрээний зай + үнэлгээ шаардана (үнэ 0 байж болно).
 */
export function validateRtBeforeStart(
  t: Pick<
    TmsRecurringTransport,
    | 'contractPriceType'
    | 'contractDistanceKm'
    | 'contractCarrierRate'
    | 'contractCustomerRate'
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
): RtValidationResult {
  const missing: RtValidationResult['missing'] = [];
  if (!t.carrierName?.trim()) missing.push({ field: 'carrierName', label: '🚛 Тээвэрчин компани' });
  if (!t.vehicleId) missing.push({ field: 'vehicleId', label: '🚚 Машин' });
  if (!t.driverId) missing.push({ field: 'driverId', label: '👤 Жолооч' });
  if (!t.scheduledDate) missing.push({ field: 'scheduledDate', label: '📅 Эхлэх огноо' });
  if (isTonKm(t)) {
    if (!Number(t.contractDistanceKm || 0)) {
      missing.push({ field: 'contractDistanceKm', label: '📏 Гэрээний зай (км) — гэрээ дээр оруулна уу' });
    }
    if (!Number(t.contractCarrierRate || 0) && !Number(t.contractCustomerRate || 0)) {
      missing.push({ field: 'contractRate', label: '⚖ Гэрээний тонн-км үнэ' });
    }
  } else {
    if (!Math.round(t.costPrice || 0)) missing.push({ field: 'costPrice', label: '🔒 Тээвэрчинд төлөх дүн' });
    if (!Math.round(t.basePrice || 0)) missing.push({ field: 'basePrice', label: '💵 Захиалагчид нэхэмжлэх үнэ' });
  }
  if (!t.origin) missing.push({ field: 'origin', label: '📍 Хаанаас' });
  if (!t.destination) missing.push({ field: 'destination', label: '📍 Хаашаа' });
  const readiness = t.checkpoints?.readiness;
  if (!readiness?.completedAt) {
    missing.push({ field: 'checkpoint_readiness', label: '✅ Бэлэн байдлын зураг + checklist' });
  }
  return { isComplete: missing.length === 0, missing };
}

/**
 * ✓ Дуусгахын өмнөх шалгалт — гэрээт тээвэрт зөвхөн буулгалт
 * (+ per_ton_km-д пүүний жин заавал).
 */
export function validateRtBeforeComplete(
  t: Pick<TmsRecurringTransport, 'checkpoints' | 'contractPriceType' | 'weighing'>
): RtValidationResult {
  const missing: RtValidationResult['missing'] = [];
  if (!t.checkpoints?.unloading?.completedAt) {
    missing.push({ field: 'checkpoint_unloading', label: '📤 Буулгалтын зураг + баталгаа' });
  }
  if (isTonKm(t) && !t.weighing?.weighedAt) {
    missing.push({
      field: 'weighing',
      label: '⚖ Пүүний жин (хоосон + ачаатай) бүртгэгдээгүй',
    });
  }
  return { isComplete: missing.length === 0, missing };
}

/**
 * Checkpoint шат идэвхтэй эсэх — гэрээт хувилбар:
 * readiness зөвхөн planned үед; transit хийгдээгүй бол transit+unloading хоёул нээлттэй
 * (transit нь optional тул түүнийг хүлээхгүй).
 */
export function isRtStageActive(
  stageKey: TmsOneTimeCheckpointKey,
  t: Pick<TmsRecurringTransport, 'status' | 'checkpoints'>
): boolean {
  const cps = t.checkpoints ?? {};
  if (cps[stageKey]?.completedAt) return false;
  if (t.status === 'cancelled') return false;
  if (stageKey === 'readiness') return t.status === 'planned';
  const working = t.status === 'in_progress' || t.status === 'completed';
  if (!working) return false;
  if (stageKey === 'transit') return !!cps.readiness?.completedAt;
  if (stageKey === 'unloading') return !!cps.readiness?.completedAt;
  return false; // 'loading' давтамжит тээвэрт хэрэглэгдэхгүй
}
