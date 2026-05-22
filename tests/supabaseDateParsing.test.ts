import { describe, it, expect } from 'vitest';
import { toDateOnlyLocal, toLocalDateTimeInOffset } from '../supabase/functions/api/index.ts';

describe('Supabase spending date parsing', () => {
  it('preserves date-only renewals as local dates', () => {
    const renewalDate = toLocalDateTimeInOffset('2026-05-17', -240);
    expect(renewalDate).not.toBeNull();
    expect(renewalDate?.getFullYear()).toBe(2026);
    expect(renewalDate?.getMonth()).toBe(4);
    expect(renewalDate?.getDate()).toBe(17);
  });

  it('does not shift date-only strings across time zones', () => {
    const localDate = toDateOnlyLocal('2026-12-25');
    expect(localDate).not.toBeNull();
    expect(localDate?.getFullYear()).toBe(2026);
    expect(localDate?.getMonth()).toBe(11);
    expect(localDate?.getDate()).toBe(25);
  });

  it('adjusts ISO timestamps by the client offset for local time comparisons', () => {
    const renewalDate = toLocalDateTimeInOffset('2026-05-17T18:00:00Z', -240);
    expect(renewalDate).not.toBeNull();
    expect(renewalDate?.getUTCFullYear()).toBe(2026);
    expect(renewalDate?.getUTCMonth()).toBe(4);
    expect(renewalDate?.getUTCDate()).toBe(17);
  });
});
