import { describe, it, expect } from 'vitest';
import { TM_STATUS_MAP } from './constants';

describe('TM_STATUS_MAP', () => {
  it('covers every TmsTransportManagementStatus', () => {
    const keys = Object.keys(TM_STATUS_MAP).sort();
    expect(keys).toEqual(['active', 'cancelled', 'completed', 'draft', 'planning']);
  });

  it('each entry has label + valid Badge variant', () => {
    const allowed = new Set(['default', 'secondary', 'success', 'destructive']);
    for (const [, v] of Object.entries(TM_STATUS_MAP)) {
      expect(typeof v.label).toBe('string');
      expect(v.label.length).toBeGreaterThan(0);
      expect(allowed.has(v.variant)).toBe(true);
    }
  });
});
