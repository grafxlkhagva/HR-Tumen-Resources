import { describe, it, expect } from 'vitest';
import { computeFinance, computeMarginPercent, computeVatAmount } from './finance-math';

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
