import { describe, it, expect } from 'vitest';
import { getBillingMonthForRenewalUpdate, isSubscriptionBilledInMonth } from '../supabase/functions/api/index';

describe('current-month spending for deleted subscriptions', () => {
  it('uses the current month when auto-advancing a renewal with a stale billing month', () => {
    const billingMonth = getBillingMonthForRenewalUpdate(
      '2026-04',
      '2026-05',
      new Date('2026-05-05T00:00:00Z'),
      new Date('2026-06-05T00:00:00Z'),
      new Date('2026-05-10T00:00:00Z'),
      true,
    );

    expect(billingMonth).toBe('2026-05');
    expect(isSubscriptionBilledInMonth(
      { status: 'active', nextBillingDate: '2026-06-05', billing_month: billingMonth },
      new Date(Date.UTC(2026, 4, 1)),
      new Date(Date.UTC(2026, 4, 31, 23, 59, 59, 999)),
      new Date('2026-05-10T00:00:00Z'),
      true,
    )).toBe(true);
  });

  it('includes a deleted subscription when renewal date has already passed in the current month', () => {
    const sub = {
      status: 'deleted',
      nextBillingDate: '2026-05-03T12:00:00Z',
      frequency: 'monthly',
      amount: 10,
    };
    const now = new Date('2026-05-14T12:00:00Z');
    const monthStart = new Date(Date.UTC(2026, 4, 1));
    const monthEnd = new Date(Date.UTC(2026, 4, 31, 23, 59, 59, 999));

    expect(isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true)).toBe(true);
  });

  it('does not include a deleted subscription when renewal date is later in the current month', () => {
    const sub = {
      status: 'deleted',
      nextBillingDate: '2026-05-20T12:00:00Z',
      frequency: 'monthly',
      amount: 10,
    };
    const now = new Date('2026-05-14T12:00:00Z');
    const monthStart = new Date(Date.UTC(2026, 4, 1));
    const monthEnd = new Date(Date.UTC(2026, 4, 31, 23, 59, 59, 999));

    expect(isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true)).toBe(false);
  });

  it('does not include a deleted subscription when the renewal time is later today', () => {
    const sub = {
      status: 'deleted',
      nextBillingDate: '2026-05-16T23:00:00Z',
      frequency: 'monthly',
      amount: 10,
    };
    const now = new Date('2026-05-16T12:00:00Z');
    const monthStart = new Date(Date.UTC(2026, 4, 1));
    const monthEnd = new Date(Date.UTC(2026, 4, 31, 23, 59, 59, 999));

    expect(isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true)).toBe(false);
  });
});
