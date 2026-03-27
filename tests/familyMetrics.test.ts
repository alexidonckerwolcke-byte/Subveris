import { describe, it, expect } from 'vitest';
import { computeFamilyMetrics } from '../client/src/lib/family-metrics';

// smoke tests for metrics logic used by the UI

describe('computeFamilyMetrics', () => {
  it('ignores deleted subscriptions and shared entries', () => {
    const data = {
      subscriptions: [
        { id: 'sub1', status: 'active', amount: 10, frequency: 'monthly' },
        { id: 'sub2', status: 'deleted', amount: 20, frequency: 'monthly' },
      ],
      sharedSubscriptions: [
        { id: 'sh1', subscription_id: 'sub1', status: null, amount: 10, frequency: 'monthly' },
        { id: 'sh2', subscription_id: 'sub3', status: 'deleted', amount: 5, frequency: 'monthly' },
      ],
      members: [{ user_id: 'm1' }, { user_id: 'm2' }],
    };

    const m = computeFamilyMetrics(data as any);
    // sub1 should count once, sub2 removed, sh2 removed, uniqueShared contains sh1 but its
    // subscription (=sub1) already in subscriptions so it is deduped and not counted.
    expect(m.totalSubscriptions).toBe(1);
    expect(m.activeSubscriptions).toBe(1);
    expect(m.memberCount).toBe(2);
    expect(m.totalMonthlySpending).toBeCloseTo(10);
  });

  it('counts unique shared subscriptions when owner shares someone else\'s', () => {
    const data = {
      subscriptions: [
        { id: 'sub1', status: 'active', amount: 10, frequency: 'monthly' },
      ],
      sharedSubscriptions: [
        { id: 'sh1', subscription_id: 'sub2', status: 'active', amount: 5, frequency: 'monthly' },
      ],
      members: [],
    };

    const m = computeFamilyMetrics(data as any);
    // both subs count
    expect(m.totalSubscriptions).toBe(2);
    expect(m.activeSubscriptions).toBe(2);
    expect(m.totalMonthlySpending).toBeCloseTo(15);
  });
});
