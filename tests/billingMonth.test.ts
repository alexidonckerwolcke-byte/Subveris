import { describe, it, expect } from 'vitest';
import { formatDateLocal, getSubscriptionBillingMonth, getAdvancedRenewalDateIfNeeded, isSubscriptionBilledInMonth, parseSubscriptionRenewalDate } from '../client/src/lib/utils';

describe('billing month helpers', () => {
  it('parses billingMonth from subscription payload', () => {
    const sub = { billing_month: '2026-05' };
    expect(getSubscriptionBillingMonth(sub)).toBe('2026-05');
  });

  it('does not count future-month renewals in current month even with billing_month set to current month', () => {
    const sub = {
      nextBillingDate: '2026-06-09',
      billing_month: '2026-05',
      status: 'active',
    };
    const now = new Date('2026-05-10');
    const monthStart = new Date(2026, 4, 1);
    const monthEnd = new Date(2026, 4, 31, 23, 59, 59, 999);
    expect(isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true)).toBe(false);
  });

  it('counts same-day renewals as current-month spend', () => {
    const sub = {
      nextBillingDate: '2026-05-16T18:00:00Z',
      billing_month: '2026-05',
      status: 'active',
    };
    const now = new Date('2026-05-16T12:00:00Z');
    const monthStart = new Date(2026, 4, 1);
    const monthEnd = new Date(2026, 4, 31, 23, 59, 59, 999);

    expect(isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true)).toBe(true);
  });

  it('does not count future-month renewals without billing_month for the current month', () => {
    const sub = {
      nextBillingDate: '2026-06-09',
      status: 'active',
    };
    const now = new Date('2026-05-10');
    const monthStart = new Date(2026, 4, 1);
    const monthEnd = new Date(2026, 4, 31, 23, 59, 59, 999);

    expect(isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true)).toBe(false);
  });

  it('does not count same-month future renewals without billing_month for the current month', () => {
    const sub = {
      nextBillingDate: '2026-05-26',
      status: 'active',
    };
    const now = new Date('2026-05-17');
    const monthStart = new Date(2026, 4, 1);
    const monthEnd = new Date(2026, 4, 31, 23, 59, 59, 999);

    expect(isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true)).toBe(false);
  });

  it('parses date-only renewal dates as local dates', () => {
    const originalTz = process.env.TZ;
    process.env.TZ = 'America/Los_Angeles';

    const parsed = parseSubscriptionRenewalDate('2026-05-26');
    expect(parsed).not.toBeNull();
    if (parsed) {
      expect(parsed.getFullYear()).toBe(2026);
      expect(parsed.getMonth()).toBe(4);
      expect(parsed.getDate()).toBe(26);
      expect(parsed.getHours()).toBe(0);
      expect(parsed.getMinutes()).toBe(0);
    }

    process.env.TZ = originalTz;
  });

  it('auto-advances a past renewal date only after month rollover', () => {
    const now = new Date('2026-06-01');
    const next = getAdvancedRenewalDateIfNeeded('2026-05-15', 'monthly', now);
    expect(next).not.toBeNull();
    if (next) {
      expect(formatDateLocal(next)).toBe('2026-06-15');
    }
  });

  it('does not auto-advance a renewal date while still in the same month', () => {
    const now = new Date('2026-05-20');
    const next = getAdvancedRenewalDateIfNeeded('2026-05-05', 'monthly', now);
    expect(next).toBeNull();
  });
});
