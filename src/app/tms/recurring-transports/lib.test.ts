import { describe, it, expect } from 'vitest';
import {
  computeTonKmPricing,
  validateWeighing,
  validateRtBeforeStart,
  validateRtBeforeComplete,
  isRtStageActive,
  isTonKm,
} from './lib';
import type { TmsTransportCheckpoint } from '@/app/tms/types';

function checkpoint(): TmsTransportCheckpoint {
  return { completedAt: '2026-08-20T10:00:00.000Z', photoUrls: ['https://x/a.jpg'] };
}

describe('computeTonKmPricing', () => {
  it('prototype-ийн жишээ: 12,500 → 38,200 кг, 120 км, 550/600 ₮/т·км', () => {
    const p = computeTonKmPricing({
      emptyWeightKg: 12_500,
      loadedWeightKg: 38_200,
      distanceKm: 120,
      carrierRate: 550,
      customerRate: 600,
    });
    expect(p.cargoKg).toBe(25_700);
    expect(p.cargoTon).toBe(25.7);
    expect(p.cost).toBe(Math.round(25.7 * 120 * 550)); // 1,696,200
    expect(p.revenue).toBe(Math.round(25.7 * 120 * 600)); // 1,850,400
    expect(p.vat).toBe(Math.round(p.revenue / 10));
    expect(p.total).toBe(p.revenue + p.vat);
  });

  it('ачаатай ≤ хоосон бол cargo 0', () => {
    const p = computeTonKmPricing({
      emptyWeightKg: 20_000,
      loadedWeightKg: 15_000,
      distanceKm: 100,
      carrierRate: 500,
      customerRate: 600,
    });
    expect(p.cargoKg).toBe(0);
    expect(p.cost).toBe(0);
    expect(p.total).toBe(0);
  });

  it('тонн 3 орны нарийвчлалтай', () => {
    const p = computeTonKmPricing({
      emptyWeightKg: 10_000,
      loadedWeightKg: 11_234,
      distanceKm: 50,
      carrierRate: 500,
      customerRate: 500,
    });
    expect(p.cargoTon).toBe(1.234);
  });
});

describe('validateWeighing — дарааллын дагуу', () => {
  const ok = {
    emptyWeightKg: 12_000,
    loadedWeightKg: 30_000,
    distanceKm: 100,
    carrierRate: 500,
    customerRate: 600,
  };
  it('бүрэн зөв → null', () => {
    expect(validateWeighing(ok)).toBeNull();
  });
  it('жин дутуу', () => {
    expect(validateWeighing({ ...ok, emptyWeightKg: 0 })).toContain('хоёуланг');
  });
  it('ачаатай ≤ хоосон', () => {
    expect(validateWeighing({ ...ok, loadedWeightKg: 12_000 })).toContain('их байх ёстой');
  });
  it('зай тодорхойгүй', () => {
    expect(validateWeighing({ ...ok, distanceKm: 0 })).toContain('зай');
  });
  it('үнэлгээ тодорхойгүй', () => {
    expect(validateWeighing({ ...ok, carrierRate: 0, customerRate: 0 })).toContain('үнэлгээ');
  });
});

describe('validateRtBeforeStart', () => {
  const base = {
    contractPriceType: 'per_day' as const,
    contractDistanceKm: null,
    contractCarrierRate: 150_000,
    contractCustomerRate: 180_000,
    carrierName: 'Тээвэрчин ХХК',
    vehicleId: 'v1',
    driverId: 'd1',
    scheduledDate: '2026-08-21',
    costPrice: 150_000,
    basePrice: 180_000,
    origin: 'УБ',
    destination: 'Дархан',
    checkpoints: { readiness: checkpoint() },
  };

  it('энгийн үнэлгээ — бүрэн бол isComplete', () => {
    expect(validateRtBeforeStart(base).isComplete).toBe(true);
  });

  it('энгийн үнэлгээ — үнэ 0 бол шаардана', () => {
    const r = validateRtBeforeStart({ ...base, costPrice: 0, basePrice: 0 });
    expect(r.missing.map((m) => m.field)).toEqual(['costPrice', 'basePrice']);
  });

  it('per_ton_km — үнэ 0 байж болно, харин зай + үнэлгээ шаардана', () => {
    const tk = {
      ...base,
      contractPriceType: 'per_ton_km' as const,
      costPrice: 0,
      basePrice: 0,
      contractDistanceKm: 120,
      contractCarrierRate: 550,
    };
    expect(validateRtBeforeStart(tk).isComplete).toBe(true);
    const r2 = validateRtBeforeStart({ ...tk, contractDistanceKm: 0 });
    expect(r2.missing.some((m) => m.field === 'contractDistanceKm')).toBe(true);
    const r3 = validateRtBeforeStart({
      ...tk,
      contractCarrierRate: 0,
      contractCustomerRate: 0,
    });
    expect(r3.missing.some((m) => m.field === 'contractRate')).toBe(true);
  });

  it('readiness checkpoint заавал', () => {
    const r = validateRtBeforeStart({ ...base, checkpoints: {} });
    expect(r.missing.some((m) => m.field === 'checkpoint_readiness')).toBe(true);
  });
});

describe('validateRtBeforeComplete', () => {
  it('энгийн: зөвхөн буулгалт', () => {
    expect(
      validateRtBeforeComplete({
        contractPriceType: 'per_day',
        checkpoints: { unloading: checkpoint() },
        weighing: null,
      }).isComplete
    ).toBe(true);
  });

  it('per_ton_km: буулгалт + жин хоёул заавал', () => {
    const r = validateRtBeforeComplete({
      contractPriceType: 'per_ton_km',
      checkpoints: { unloading: checkpoint() },
      weighing: null,
    });
    expect(r.missing.map((m) => m.field)).toEqual(['weighing']);
    const ok = validateRtBeforeComplete({
      contractPriceType: 'per_ton_km',
      checkpoints: { unloading: checkpoint() },
      weighing: {
        emptyWeightKg: 1,
        loadedWeightKg: 2,
        cargoWeightKg: 1,
        cargoWeightTon: 0.001,
        weighedAt: '2026-08-20T11:00:00.000Z',
      },
    });
    expect(ok.isComplete).toBe(true);
  });
});

describe('isRtStageActive — 3 шатны идэвхжилт', () => {
  it('readiness зөвхөн planned үед', () => {
    expect(isRtStageActive('readiness', { status: 'planned' })).toBe(true);
    expect(isRtStageActive('readiness', { status: 'in_progress' })).toBe(false);
  });
  it('transit + unloading хоёул readiness дууссаны дараа нээлттэй (transit optional)', () => {
    const t = { status: 'in_progress' as const, checkpoints: { readiness: checkpoint() } };
    expect(isRtStageActive('transit', t)).toBe(true);
    expect(isRtStageActive('unloading', t)).toBe(true);
  });
  it("'loading' шат хэзээ ч идэвхжихгүй", () => {
    expect(
      isRtStageActive('loading', {
        status: 'in_progress',
        checkpoints: { readiness: checkpoint() },
      })
    ).toBe(false);
  });
});

describe('isTonKm', () => {
  it('per_ton_km үед true', () => {
    expect(isTonKm({ contractPriceType: 'per_ton_km' })).toBe(true);
    expect(isTonKm({ contractPriceType: 'per_day' })).toBe(false);
    expect(isTonKm({ contractPriceType: null })).toBe(false);
  });
});
