import { describe, it, expect } from 'vitest';
import { computeFamilyMetrics } from '../client/src/lib/family-metrics';

// smoke tests for metrics logic used by the UI

describe('computeFamilyMetrics', () => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1); // Yesterday

  it('ignores deleted subscriptions and shared entries', () => {
    const data = {
      subscriptions: [
        { id: 'sub1', status: 'active', amount: 10, frequency: 'monthly', next_billing_at: today },
        { id: 'sub2', status: 'deleted', amount: 20, frequency: 'monthly', next_billing_at: today },
      ],
      sharedSubscriptions: [
        { id: 'sh1', subscription_id: 'sub1', status: null, amount: 10, frequency: 'monthly', next_billing_at: today },
        { id: 'sh2', subscription_id: 'sub3', status: 'deleted', amount: 5, frequency: 'monthly', next_billing_at: today },
      ],
      members: [{ user_id: 'm1' }, { user_id: 'm2' }],
    };

    const m = computeFamilyMetrics(data as any);
    // sub1 should count once (active and renewing today), sub2 removed (deleted), sh2 removed (deleted), uniqueShared contains sh1 but its
    // subscription (=sub1) already in subscriptions so it is deduped and not counted.
    expect(m.totalSubscriptions).toBe(1);
    expect(m.activeSubscriptions).toBe(1);
    expect(m.memberCount).toBe(2);
    expect(m.totalMonthlySpending).toBeCloseTo(10);
  });

  it('counts unique shared subscriptions when owner shares someone else\'s', () => {
    const data = {
      subscriptions: [
        { id: 'sub1', status: 'active', amount: 10, frequency: 'monthly', next_billing_at: today },
      ],
      sharedSubscriptions: [
        { id: 'sh1', subscription_id: 'sub2', status: 'active', amount: 5, frequency: 'monthly', next_billing_at: today },
      ],
      members: [],
    };

    const m = computeFamilyMetrics(data as any);
    // both subs count (both renewing today)
    expect(m.totalSubscriptions).toBe(2);
    expect(m.activeSubscriptions).toBe(2);
    expect(m.totalMonthlySpending).toBeCloseTo(15);
  });

  it('excludes canceled subscriptions from family metrics', () => {
    const data = {
      subscriptions: [
        { id: 'sub1', status: 'active', amount: 10, frequency: 'monthly', next_billing_at: today },
        { id: 'sub2', status: 'canceled', amount: 20, frequency: 'monthly', next_billing_at: today },
      ],
      sharedSubscriptions: [],
      members: [],
    };

    const m = computeFamilyMetrics(data as any);
    expect(m.totalSubscriptions).toBe(1);
    expect(m.activeSubscriptions).toBe(1);
    expect(m.totalMonthlySpending).toBeCloseTo(10);
  });
});
