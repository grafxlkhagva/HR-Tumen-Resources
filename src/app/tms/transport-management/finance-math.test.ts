import { describe, it, expect } from 'vitest';
import {
  computeFinance,
  computeMarginPercent,
  computeMultiServiceFinance,
  computeVatAmount,
  getPriceMultiplier,
} from './finance-math';
import type {
  TmsContractService,
  TmsQuotationCargo,
  TmsTransportSubUnit,
} from '@/app/tms/types';

describe('computeMarginPercent', () => {
  it('returns 0 when driverPrice is 0 or negative', () => {
    expect(computeMarginPercent(0, 100)).toBe(0);
    expect(computeMarginPercent(-100, 500)).toBe(0);
  });

  it('returns a positive percentage for profitable customer price', () => {
    expect(computeMarginPercent(1000, 1300)).toBeCloseTo(30, 5);
  });

  it('returns a negative percentage for loss-making customer price', () => {
    expect(computeMarginPercent(1000, 800)).toBeCloseTo(-20, 5);
  });

  it('returns 0 when customer price equals driver price', () => {
    expect(computeMarginPercent(1000, 1000)).toBe(0);
  });
});

describe('computeVatAmount', () => {
  it('returns 10% rounded', () => {
    expect(computeVatAmount(1000)).toBe(100);
    expect(computeVatAmount(1235)).toBe(124); // 123.5 → 124
  });

  it('returns 0 for 0/negative', () => {
    expect(computeVatAmount(0)).toBe(0);
    expect(computeVatAmount(-500)).toBe(0);
  });
});

describe('computeFinance', () => {
  it('computes profit/margin correctly for positive scenario', () => {
    const r = computeFinance(1000, 1500);
    expect(r.priceBeforeVat).toBe(1500);
    expect(r.profitAmount).toBe(500);
    expect(r.vatAmount).toBe(150);
    expect(r.priceWithVat).toBe(1650);
    expect(r.marginPercent).toBeCloseTo(50, 5);
  });

  it('handles customer price = 0', () => {
    const r = computeFinance(1000, 0);
    expect(r.priceBeforeVat).toBe(0);
    expect(r.profitAmount).toBe(-1000);
    expect(r.vatAmount).toBe(0);
    expect(r.priceWithVat).toBe(0);
    expect(r.marginPercent).toBeCloseTo(-100, 5);
  });

  it('handles loss (customer < driver)', () => {
    const r = computeFinance(2000, 1500);
    expect(r.profitAmount).toBe(-500);
    expect(r.marginPercent).toBeCloseTo(-25, 5);
  });

  it('gracefully handles driverPrice = 0 (no division by zero)', () => {
    const r = computeFinance(0, 1000);
    expect(r.marginPercent).toBe(0);
    expect(r.profitAmount).toBe(1000);
  });
});

describe('getPriceMultiplier', () => {
  it('returns subCount for per_day', () => {
    expect(getPriceMultiplier('per_day', 7, 0)).toBe(7);
    expect(getPriceMultiplier('per_day', 0, 0)).toBe(0);
  });

  it('returns cargoTons for per_ton', () => {
    expect(getPriceMultiplier('per_ton', 5, 12.5)).toBe(12.5);
    expect(getPriceMultiplier('per_ton', 5, 0)).toBe(0);
  });

  it('returns 1 for lump_sum, per_month, rental, null', () => {
    expect(getPriceMultiplier('lump_sum', 10, 50)).toBe(1);
    expect(getPriceMultiplier('per_month', 10, 50)).toBe(1);
    expect(getPriceMultiplier('rental', 10, 50)).toBe(1);
    expect(getPriceMultiplier(null, 10, 50)).toBe(1);
    expect(getPriceMultiplier(undefined, 10, 50)).toBe(1);
  });

  it('clamps negative sub/cargo to 0 (defensive)', () => {
    expect(getPriceMultiplier('per_day', -3, 0)).toBe(0);
    expect(getPriceMultiplier('per_ton', 0, -2)).toBe(0);
  });
});

describe('computeMultiServiceFinance', () => {
  const bongoSvc: TmsContractService = {
    id: 'svc-bongo',
    name: 'Бонго хөргүүртэй',
    customerPrice: 155_000,
    driverPrice: 0,
    priceType: 'per_day',
  };
  const maatiSvc: TmsContractService = {
    id: 'svc-maati',
    name: 'Маяти хөргүүртэй',
    customerPrice: 190_000,
    driverPrice: 0,
    priceType: 'per_day',
  };

  function sub(id: string, serviceId: string | null): TmsTransportSubUnit {
    return { id, subCode: id, contractServiceId: serviceId };
  }

  it('groups sub-transports by contractServiceId and multiplies by count for per_day', () => {
    const subs = [
      sub('s1', 'svc-bongo'),
      sub('s2', 'svc-bongo'),
      sub('s3', 'svc-bongo'),
      sub('s4', 'svc-bongo'),
      sub('s5', 'svc-bongo'),
      sub('s6', 'svc-bongo'),
      sub('s7', 'svc-bongo'),
      sub('s8', 'svc-maati'),
      sub('s9', 'svc-maati'),
      sub('s10', 'svc-maati'),
      sub('s11', 'svc-maati'),
      sub('s12', 'svc-maati'),
    ];
    const r = computeMultiServiceFinance(subs, [bongoSvc, maatiSvc]);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0]).toMatchObject({
      contractServiceId: 'svc-bongo',
      subCount: 7,
      multiplier: 7,
      unitCustomerPrice: 155_000,
      lineCustomer: 1_085_000,
      lineDriver: 0,
    });
    expect(r.lines[1]).toMatchObject({
      contractServiceId: 'svc-maati',
      subCount: 5,
      multiplier: 5,
      unitCustomerPrice: 190_000,
      lineCustomer: 950_000,
    });
    expect(r.totalCustomer).toBe(2_035_000);
    expect(r.totalDriver).toBe(0);
    expect(r.totalProfit).toBe(2_035_000);
    expect(r.vatAmount).toBe(203_500);
    expect(r.totalWithVat).toBe(2_238_500);
  });

  it('preserves order of first appearance in subs array', () => {
    const subs = [sub('a', 'svc-maati'), sub('b', 'svc-bongo'), sub('c', 'svc-maati')];
    const r = computeMultiServiceFinance(subs, [bongoSvc, maatiSvc]);
    expect(r.lines.map((l) => l.contractServiceId)).toEqual(['svc-maati', 'svc-bongo']);
  });

  it('returns empty when subs is empty or services missing', () => {
    const empty = computeMultiServiceFinance([], [bongoSvc]);
    expect(empty.lines).toHaveLength(0);
    expect(empty.totalCustomer).toBe(0);

    const noSvc = computeMultiServiceFinance([sub('s1', 'svc-bongo')], []);
    expect(noSvc.lines).toHaveLength(0);
  });

  it('skips subs missing contractServiceId', () => {
    const subs = [sub('s1', 'svc-bongo'), sub('s2', null)];
    const r = computeMultiServiceFinance(subs, [bongoSvc]);
    expect(r.lines[0]?.subCount).toBe(1);
  });

  it('skips subs referencing unknown service id', () => {
    const subs = [sub('s1', 'svc-bongo'), sub('s2', 'svc-unknown')];
    const r = computeMultiServiceFinance(subs, [bongoSvc]);
    expect(r.lines).toHaveLength(1);
    expect(r.lines[0]?.lineCustomer).toBe(155_000);
  });

  it('lump_sum: multiplies unit price by 1 regardless of sub count', () => {
    const lumpSvc: TmsContractService = {
      id: 'svc-lump',
      name: 'Багц',
      customerPrice: 500_000,
      driverPrice: 100_000,
      priceType: 'lump_sum',
    };
    const subs = [sub('a', 'svc-lump'), sub('b', 'svc-lump'), sub('c', 'svc-lump')];
    const r = computeMultiServiceFinance(subs, [lumpSvc]);
    expect(r.lines[0]?.multiplier).toBe(1);
    expect(r.totalCustomer).toBe(500_000);
    expect(r.totalDriver).toBe(100_000);
    expect(r.totalProfit).toBe(400_000);
  });

  it('per_ton: uses cargo tonnage (kg converted to tons)', () => {
    const tonSvc: TmsContractService = {
      id: 'svc-ton',
      name: 'Тоннын тээвэр',
      customerPrice: 50_000,
      driverPrice: 30_000,
      priceType: 'per_ton',
    };
    const cargos: TmsQuotationCargo[] = [
      { id: 'c1', name: 'Гурил', quantity: 5_000, unit: 'kg' },
      { id: 'c2', name: 'Давс', quantity: 2, unit: 'tons' },
    ];
    const r = computeMultiServiceFinance([sub('s1', 'svc-ton')], [tonSvc], cargos);
    expect(r.lines[0]?.multiplier).toBe(7); // 5 + 2
    expect(r.lines[0]?.lineCustomer).toBe(350_000);
    expect(r.lines[0]?.lineDriver).toBe(210_000);
  });

  it('mixed services with driver prices compute margin correctly', () => {
    const svcA: TmsContractService = {
      id: 'a',
      name: 'A',
      customerPrice: 100_000,
      driverPrice: 80_000,
      priceType: 'per_day',
    };
    const svcB: TmsContractService = {
      id: 'b',
      name: 'B',
      customerPrice: 200_000,
      driverPrice: 150_000,
      priceType: 'lump_sum',
    };
    const subs = [sub('s1', 'a'), sub('s2', 'a'), sub('s3', 'b')];
    const r = computeMultiServiceFinance(subs, [svcA, svcB]);
    // A: 2 × (100k / 80k) = 200k / 160k; B: 1 × (200k / 150k) = 200k / 150k
    expect(r.totalCustomer).toBe(400_000);
    expect(r.totalDriver).toBe(310_000);
    expect(r.totalProfit).toBe(90_000);
    expect(r.marginPercent).toBeCloseTo((90_000 / 310_000) * 100, 3);
  });

  it('falls back to deprecated `price` when customerPrice is missing', () => {
    const legacySvc: TmsContractService = {
      id: 'legacy',
      name: 'Хуучин',
      price: 120_000,
      priceType: 'per_day',
    };
    const r = computeMultiServiceFinance([sub('s1', 'legacy')], [legacySvc]);
    expect(r.lines[0]?.unitCustomerPrice).toBe(120_000);
    expect(r.totalCustomer).toBe(120_000);
  });
});
