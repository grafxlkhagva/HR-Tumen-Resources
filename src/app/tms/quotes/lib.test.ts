import { describe, it, expect } from 'vitest';
import {
  computeQuotePricing,
  isQuoteOverdue,
  quoteExpiryDate,
  transitDays,
  canTransition,
  QT_ALLOWED_TRANSITIONS,
  buildQuoteEmail,
  gmailComposeUrl,
} from './lib';
import type { TmsQuoteStatus } from '@/app/tms/types';

describe('computeQuotePricing', () => {
  it('үндсэн тооцоо: agent 800,000 / transport 1,000,000', () => {
    const p = computeQuotePricing({ agentPrice: 800_000, transportPrice: 1_000_000 });
    expect(p.vat).toBe(100_000);
    expect(p.total).toBe(1_100_000);
    expect(p.margin).toBe(200_000);
    expect(p.marginPct).toBeCloseTo(20, 5);
  });

  it('сөрөг margin', () => {
    const p = computeQuotePricing({ agentPrice: 1_200_000, transportPrice: 1_000_000 });
    expect(p.margin).toBe(-200_000);
    expect(p.marginPct).toBeCloseTo(-20, 5);
  });

  it('transport 0 үед marginPct 0 (хуваалт алдаагүй)', () => {
    const p = computeQuotePricing({ agentPrice: 500_000, transportPrice: 0 });
    expect(p.marginPct).toBe(0);
    expect(p.margin).toBe(-500_000);
  });

  it('хоосон утгууд 0 болно, rounding зөв', () => {
    expect(computeQuotePricing({}).total).toBe(0);
    expect(computeQuotePricing({ transportPrice: 1_500_000 }).vat).toBe(150_000);
  });
});

describe('quoteExpiryDate / isQuoteOverdue', () => {
  it('expiry = sentDate + validDays', () => {
    expect(quoteExpiryDate('2026-08-01', 30)).toBe('2026-08-31');
    expect(quoteExpiryDate('2026-08-01', null)).toBe('2026-08-31'); // default 30
  });

  it('sent + 31 хоног өнгөрсөн (default 30) → хэтэрсэн', () => {
    expect(
      isQuoteOverdue(
        { status: 'sent', sentDate: '2026-07-01', details: {} },
        new Date('2026-08-05')
      )
    ).toBe(true);
  });

  it('validDays 45 бол хараахан хэтрээгүй', () => {
    expect(
      isQuoteOverdue(
        { status: 'sent', sentDate: '2026-07-01', details: { validDays: 45 } },
        new Date('2026-08-05')
      )
    ).toBe(false);
  });

  it('draft/accepted статуст хэзээ ч хэтрэхгүй', () => {
    expect(
      isQuoteOverdue({ status: 'draft', sentDate: '2020-01-01' }, new Date('2026-08-05'))
    ).toBe(false);
    expect(
      isQuoteOverdue({ status: 'accepted', sentDate: '2020-01-01' }, new Date('2026-08-05'))
    ).toBe(false);
  });

  it('sentDate байхгүй бол хэтрэхгүй', () => {
    expect(isQuoteOverdue({ status: 'sent', sentDate: null }, new Date('2026-08-05'))).toBe(false);
  });
});

describe('transitDays', () => {
  it('энгийн зөрүү', () => {
    expect(transitDays('2026-08-01', '2026-08-04')).toBe(3);
  });
  it('ижил өдөр → дор хаяж 1', () => {
    expect(transitDays('2026-08-01', '2026-08-01')).toBe(1);
  });
  it('аль нэг нь байхгүй → null', () => {
    expect(transitDays(null, '2026-08-04')).toBeNull();
    expect(transitDays('2026-08-01', undefined)).toBeNull();
  });
});

describe('canTransition — бүрэн matrix', () => {
  const ALL: TmsQuoteStatus[] = ['draft', 'sent', 'accepted', 'rejected', 'converted', 'expired'];

  it('зөвшөөрөгдсөн шилжилтүүд', () => {
    expect(canTransition('draft', 'sent')).toBe(true);
    expect(canTransition('sent', 'draft')).toBe(true);
    expect(canTransition('sent', 'accepted')).toBe(true);
    expect(canTransition('sent', 'rejected')).toBe(true);
    expect(canTransition('sent', 'expired')).toBe(true);
    expect(canTransition('accepted', 'sent')).toBe(true);
    expect(canTransition('accepted', 'converted')).toBe(true);
    expect(canTransition('accepted', 'expired')).toBe(true);
    expect(canTransition('rejected', 'sent')).toBe(true);
    expect(canTransition('expired', 'sent')).toBe(true);
  });

  it('хориотой шилжилтүүд', () => {
    expect(canTransition('draft', 'accepted')).toBe(false);
    expect(canTransition('draft', 'converted')).toBe(false);
    expect(canTransition('sent', 'converted')).toBe(false);
    // converted — эцсийн төлөв, юу руу ч шилжихгүй
    for (const to of ALL) {
      expect(canTransition('converted', to)).toBe(false);
    }
  });

  it('matrix-д бүх статус тодорхойлогдсон', () => {
    for (const s of ALL) {
      expect(QT_ALLOWED_TRANSITIONS[s]).toBeDefined();
    }
  });
});

describe('buildQuoteEmail / gmailComposeUrl', () => {
  it('subject-д код + захиалагч орно', () => {
    const { subject, body } = buildQuoteEmail({
      code: 'QT-0001',
      customerName: 'Тест ХХК',
      fromLocation: 'Улаанбаатар',
      toLocation: 'Дархан',
      totalPrice: 1_100_000,
      kamEmployeeName: 'Бат',
      details: { validDays: 30 },
    });
    expect(subject).toBe('Үнийн санал QT-0001 — Тест ХХК');
    expect(body).toContain('Улаанбаатар → Дархан');
    expect(body).toContain('1,100,000₮');
    expect(body).toContain('30 хоног');
  });

  it('gmail URL зөв параметртэй', () => {
    const url = gmailComposeUrl('a@b.mn', 'Subj', 'Body');
    expect(url).toContain('mail.google.com');
    expect(url).toContain('to=a%40b.mn');
    expect(url).toContain('su=Subj');
  });
});
