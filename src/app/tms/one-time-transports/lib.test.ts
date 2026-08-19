import { describe, it, expect } from 'vitest';
import {
  calcVat,
  calcTotal,
  computePricing,
  calcMargin,
  carrierPaidAmount,
  carrierTotalAmount,
  carrierOwedAmount,
  carrierPaymentRollup,
  buildCarrierPaymentSchedule,
  validateBeforeStart,
  validateBeforeComplete,
  isCheckpointStageActive,
} from './lib';
import type { TmsCarrierPayment, TmsTransportCheckpoint } from '@/app/tms/types';

function payment(overrides: Partial<TmsCarrierPayment>): TmsCarrierPayment {
  return {
    id: 'p1',
    sequence: 1,
    category: 'advance',
    status: 'scheduled',
    amount: 0,
    createdAt: '2026-08-19T00:00:00.000Z',
    ...overrides,
  };
}

function checkpoint(overrides?: Partial<TmsTransportCheckpoint>): TmsTransportCheckpoint {
  return {
    completedAt: '2026-08-19T10:00:00.000Z',
    photoUrls: ['https://example.com/a.jpg'],
    ...overrides,
  };
}

describe('calcVat / calcTotal', () => {
  it('НӨАТ = round(base / 10)', () => {
    expect(calcVat(1_000_000)).toBe(100_000);
    expect(calcTotal(1_000_000)).toBe(1_100_000);
  });

  it('float алдаагүй бүхэл тоо буцаана (1,500,000 → 1,499,999 bug)', () => {
    expect(calcVat(1_500_000)).toBe(150_000);
    expect(calcTotal(1_500_000)).toBe(1_650_000);
    expect(calcVat(333_335)).toBe(33_334); // round, truncate биш
  });

  it('хоосон/0 утгад 0', () => {
    expect(calcVat(0)).toBe(0);
    expect(calcTotal(0)).toBe(0);
  });
});

describe('computePricing', () => {
  it('үндсэн тооцоо: base 1,000,000 / cost 800,000 / урьдчилгаа 300,000', () => {
    const p = computePricing({
      basePrice: 1_000_000,
      costPrice: 800_000,
      carrierAdvanceAmount: 300_000,
    });
    expect(p.vat).toBe(100_000);
    expect(p.total).toBe(1_100_000);
    expect(p.margin).toBe(200_000);
    expect(p.marginPct).toBeCloseTo(20, 5);
    expect(p.advanceAmount).toBe(300_000);
    expect(p.advancePct).toBe(38); // round(300000/800000*100)
    expect(p.finalAmount).toBe(500_000);
  });

  it('урьдчилгааны дүн өгөөгүй бол default 50%-иар тооцно', () => {
    const p = computePricing({ basePrice: 0, costPrice: 800_000 });
    expect(p.advanceAmount).toBe(400_000);
    expect(p.advancePct).toBe(50);
    expect(p.finalAmount).toBe(400_000);
  });

  it('dotor төрөлд default 100%', () => {
    const p = computePricing({ basePrice: 0, costPrice: 500_000, type: 'dotor' });
    expect(p.advanceAmount).toBe(500_000);
    expect(p.finalAmount).toBe(0);
  });

  it('урьдчилгааг 0..cost хооронд clamp хийнэ', () => {
    expect(
      computePricing({ costPrice: 100_000, carrierAdvanceAmount: 999_999 }).advanceAmount
    ).toBe(100_000);
    expect(computePricing({ costPrice: 100_000, carrierAdvanceAmount: -5 }).advanceAmount).toBe(0);
  });

  it('сөрөг margin зөв гарна', () => {
    const p = computePricing({ basePrice: 500_000, costPrice: 800_000 });
    expect(p.margin).toBe(-300_000);
    expect(p.marginPct).toBeCloseTo(-60, 5);
  });
});

describe('calcMargin', () => {
  it('base − cost', () => {
    expect(calcMargin({ basePrice: 1_000_000, costPrice: 800_000 })).toBe(200_000);
    expect(calcMargin({})).toBe(0);
  });
});

describe('carrier payment rollups', () => {
  it('paid мөрүүдийн нийлбэр', () => {
    const t = {
      costPrice: 800_000,
      carrierPayments: [
        payment({ status: 'paid', amount: 300_000 }),
        payment({ id: 'p2', sequence: 2, status: 'scheduled', amount: 500_000 }),
      ],
    };
    expect(carrierPaidAmount(t)).toBe(300_000);
    expect(carrierTotalAmount(t)).toBe(800_000);
    expect(carrierOwedAmount(t)).toBe(500_000);
    expect(carrierPaymentRollup(t)).toBe('partial');
  });

  it('мөргүй үед costPrice-ийг нийт гэж үзнэ', () => {
    expect(carrierTotalAmount({ costPrice: 500_000 })).toBe(500_000);
    expect(carrierPaymentRollup({ costPrice: 500_000 })).toBe('unpaid');
  });

  it('costPrice 0 → na', () => {
    expect(carrierPaymentRollup({ costPrice: 0 })).toBe('na');
  });

  it('бүрэн төлөгдсөн → paid', () => {
    const t = {
      costPrice: 500_000,
      carrierPayments: [payment({ status: 'paid', amount: 500_000 })],
    };
    expect(carrierPaymentRollup(t)).toBe('paid');
  });

  it('нэмэлт мөр costPrice-ээс давсан үед нийт нь мөрийн нийлбэр', () => {
    const t = {
      costPrice: 500_000,
      carrierPayments: [
        payment({ status: 'paid', amount: 500_000 }),
        payment({ id: 'p3', sequence: 3, category: 'extra', status: 'scheduled', amount: 100_000 }),
      ],
    };
    expect(carrierTotalAmount(t)).toBe(600_000);
    expect(carrierOwedAmount(t)).toBe(100_000);
  });
});

describe('buildCarrierPaymentSchedule', () => {
  it('costPrice <= 0 → []', () => {
    expect(buildCarrierPaymentSchedule({ type: 'orn_nutag', costPrice: 0 })).toEqual([]);
  });

  it('энгийн төрөл → урьдчилгаа + үлдэгдэл (50/50 default)', () => {
    const rows = buildCarrierPaymentSchedule({
      type: 'orn_nutag',
      costPrice: 800_000,
      scheduledDate: '2026-08-20T09:00',
    });
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      sequence: 1,
      category: 'advance',
      status: 'scheduled',
      amount: 400_000,
      dueDate: '2026-08-20',
    });
    expect(rows[1]).toMatchObject({
      sequence: 2,
      category: 'final',
      amount: 400_000,
      dueDate: '2026-08-27', // +7 хоног
    });
  });

  it('яг дүнгээр өгсөн урьдчилгааг хэвээр хадгална (rounding drift байхгүй)', () => {
    const rows = buildCarrierPaymentSchedule({
      type: 'orn_nutag',
      costPrice: 1_800_000,
      carrierAdvanceAmount: 594_000, // 33%
      scheduledDate: '2026-08-20',
    });
    expect(rows[0].amount).toBe(594_000);
    expect(rows[1].amount).toBe(1_206_000);
    expect(rows[0].amount + rows[1].amount).toBe(1_800_000);
  });

  it('dotor → 100% нэг мөр', () => {
    const rows = buildCarrierPaymentSchedule({
      type: 'dotor',
      costPrice: 500_000,
      scheduledDate: '2026-08-20',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ sequence: 1, amount: 500_000 });
  });

  it('100% урьдчилгаатай энгийн төрөлд үлдэгдлийн мөр гарахгүй', () => {
    const rows = buildCarrierPaymentSchedule({
      type: 'orn_nutag',
      costPrice: 500_000,
      carrierAdvancePct: 100,
    });
    expect(rows).toHaveLength(1);
  });
});

describe('validateBeforeStart', () => {
  const complete = {
    type: 'orn_nutag' as const,
    carrierName: 'Тээвэрчин ХХК',
    vehicleId: 'v1',
    driverId: 'd1',
    scheduledDate: '2026-08-20T09:00',
    costPrice: 800_000,
    basePrice: 1_000_000,
    origin: 'Улаанбаатар',
    destination: 'Дархан',
    checkpoints: { readiness: checkpoint() },
  };

  it('бүрэн баримт → isComplete', () => {
    expect(validateBeforeStart(complete).isComplete).toBe(true);
  });

  it('дутуу талбар бүрийг Mongolian label-тай жагсаана', () => {
    const r = validateBeforeStart({ type: 'orn_nutag' });
    expect(r.isComplete).toBe(false);
    const fields = r.missing.map((m) => m.field);
    expect(fields).toEqual([
      'carrierName',
      'vehicleId',
      'driverId',
      'scheduledDate',
      'costPrice',
      'basePrice',
      'origin',
      'destination',
      'checkpoint_readiness',
    ]);
    expect(r.missing[0].label).toBe('🚛 Тээвэрчин компани');
  });

  it('автокран — destination шаардахгүй, origin нь байршил', () => {
    const r = validateBeforeStart({ ...complete, type: 'avtokran', destination: null });
    expect(r.isComplete).toBe(true);
    const r2 = validateBeforeStart({ ...complete, type: 'avtokran', origin: null });
    expect(r2.missing.some((m) => m.label === '📍 Үйлчилгээ үзүүлэх байршил')).toBe(true);
  });

  it('readiness checkpoint дутуу бол шаардана', () => {
    const r = validateBeforeStart({ ...complete, checkpoints: {} });
    expect(r.missing.some((m) => m.field === 'checkpoint_readiness')).toBe(true);
  });
});

describe('isCheckpointStageActive', () => {
  it('readiness — зөвхөн planned төлөвт идэвхтэй', () => {
    expect(isCheckpointStageActive('readiness', { status: 'planned' })).toBe(true);
    expect(isCheckpointStageActive('readiness', { status: 'in_progress' })).toBe(false);
    expect(
      isCheckpointStageActive('readiness', {
        status: 'planned',
        checkpoints: { readiness: checkpoint() },
      })
    ).toBe(false); // аль хэдийн дууссан
  });

  it('loading — in_progress + readiness дууссан үед', () => {
    expect(
      isCheckpointStageActive('loading', {
        status: 'in_progress',
        checkpoints: { readiness: checkpoint() },
      })
    ).toBe(true);
    expect(isCheckpointStageActive('loading', { status: 'in_progress' })).toBe(false);
    expect(
      isCheckpointStageActive('loading', {
        status: 'planned',
        checkpoints: { readiness: checkpoint() },
      })
    ).toBe(false);
  });

  it('unloading — transit алгассан ч loading дууссан бол нээлттэй', () => {
    expect(
      isCheckpointStageActive('unloading', {
        status: 'in_progress',
        checkpoints: { readiness: checkpoint(), loading: checkpoint() },
      })
    ).toBe(true);
  });

  it('cancelled төлөвт бүх шат хаалттай', () => {
    expect(
      isCheckpointStageActive('readiness', { status: 'cancelled' })
    ).toBe(false);
  });
});

describe('validateBeforeComplete', () => {
  it('loading + unloading хоёул дууссан → isComplete', () => {
    const r = validateBeforeComplete({
      checkpoints: { loading: checkpoint(), unloading: checkpoint() },
    });
    expect(r.isComplete).toBe(true);
  });

  it('дутуу шат бүрийг жагсаана', () => {
    const r = validateBeforeComplete({ checkpoints: {} });
    expect(r.missing.map((m) => m.field)).toEqual([
      'checkpoint_loading',
      'checkpoint_unloading',
    ]);
  });
});
