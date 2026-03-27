import { describe, it, expect } from 'vitest';
import { calculateMonthlyCost } from '../client/src/lib/utils';

describe('calculateMonthlyCost', () => {
  it('should calculate monthly cost for monthly subscriptions', () => {
    expect(calculateMonthlyCost(9.99, 'monthly')).toBe(9.99);
  });

  it('should calculate monthly cost for yearly subscriptions', () => {
    expect(calculateMonthlyCost(119.88, 'yearly')).toBeCloseTo(9.99, 2);
  });

  it('should calculate monthly cost for quarterly subscriptions', () => {
    expect(calculateMonthlyCost(29.97, 'quarterly')).toBeCloseTo(9.99, 2);
  });

  it('should calculate monthly cost for weekly subscriptions', () => {
    expect(calculateMonthlyCost(2.31, 'weekly')).toBeCloseTo(9.99, 1);
  });

  it('should handle zero amounts', () => {
    expect(calculateMonthlyCost(0, 'monthly')).toBe(0);
  });

  it('should handle negative amounts gracefully', () => {
    // Should handle edge case - ideally not allow negative, but calculate if passed
    expect(calculateMonthlyCost(-10, 'monthly')).toBe(-10);
  });

  it('should default to monthly for unknown frequency', () => {
    expect(calculateMonthlyCost(9.99, 'unknown' as any)).toBe(9.99);
  });

  it('should handle very large amounts', () => {
    expect(calculateMonthlyCost(99999.99, 'monthly')).toBe(99999.99);
  });

  it('should handle decimal precision', () => {
    expect(calculateMonthlyCost(9.995, 'monthly')).toBe(9.995);
  });
});
