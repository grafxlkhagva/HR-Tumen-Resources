import { describe, it, expect } from 'vitest';
import { formatVehicleLabel } from './utils';

describe('formatVehicleLabel', () => {
  it('includes plate, make, model joined by ·', () => {
    expect(
      formatVehicleLabel({ id: 'v1', licensePlate: '1234УБА', makeName: 'Toyota', modelName: 'Hiace' }),
    ).toBe('1234УБА · Toyota · Hiace');
  });

  it('skips missing pieces', () => {
    expect(formatVehicleLabel({ id: 'v1', licensePlate: '1234УБА', makeName: 'Toyota' })).toBe(
      '1234УБА · Toyota',
    );
    expect(formatVehicleLabel({ id: 'v1', licensePlate: '1234УБА' })).toBe('1234УБА');
  });

  it('falls back to id when every visible field is empty', () => {
    expect(formatVehicleLabel({ id: 'vehicle-42' })).toBe('vehicle-42');
    expect(formatVehicleLabel({ id: 'vehicle-42', licensePlate: '' })).toBe('vehicle-42');
  });

  it('treats undefined as absent (no stray separators)', () => {
    expect(formatVehicleLabel({ id: 'v1', licensePlate: undefined, makeName: 'Toyota', modelName: undefined })).toBe(
      'Toyota',
    );
  });
});
