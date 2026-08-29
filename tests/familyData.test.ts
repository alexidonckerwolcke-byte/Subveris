import { describe, expect, it } from 'vitest';
import { getVisibleFamilySubscriptions } from '../client/src/lib/family-data';
import { shouldUseFamilyAwareSpending } from '../client/src/hooks/use-family-data';
import { computeFamilyMetrics, getCurrentMonthFamilySpend } from '../client/src/lib/family-metrics';

describe('getVisibleFamilySubscriptions', () => {
  it('normalizes snake_case website_domain in family-data subscriptions', () => {
    const familyData = {
      subscriptions: [
        {
          id: 'sub1',
          user_id: 'owner1',
          name: 'Spotify',
          status: 'active',
          website_domain: 'spotify.com',
        },
      ],
      sharedSubscriptions: [
        {
          subscription_id: 'sub2',
          subscription: {
            id: 'sub2',
            name: 'Netflix',
            status: 'active',
            website_domain: 'netflix.com',
          },
        },
      ],
      members: [
        { user_id: 'member1', role: 'member' },
      ],
    };

    const visibleSubscriptions = getVisibleFamilySubscriptions(familyData, 'member1');

    expect(visibleSubscriptions).toHaveLength(1);
    expect(visibleSubscriptions[0].id).toBe('sub2');
    expect(visibleSubscriptions[0].websiteDomain).toBe('netflix.com');
  });

  it('keeps members limited to their own subscriptions even when other members are present in the payload', () => {
    const familyData = {
      isOwner: false,
      familyDataSharingEnabled: true,
      subscriptions: [
        {
          id: 'member-sub',
          user_id: 'member-1',
          name: 'Spotify',
          status: 'active',
          amount: 12,
          currency: 'USD',
          frequency: 'monthly',
        },
        {
          id: 'owner-sub',
          user_id: 'owner-1',
          name: 'Netflix',
          status: 'active',
          amount: 15,
          currency: 'USD',
          frequency: 'monthly',
        },
      ],
      sharedSubscriptions: [
        {
          subscription_id: 'owner-sub',
          shared_with_user_id: 'owner-1',
          subscription: {
            id: 'owner-sub',
            user_id: 'owner-1',
            name: 'Netflix',
            status: 'active',
            amount: 15,
            currency: 'USD',
            frequency: 'monthly',
          },
        },
      ],
      members: [
        { user_id: 'owner-1', role: 'owner' },
        { user_id: 'member-1', role: 'member' },
      ],
    };

    const visibleSubscriptions = getVisibleFamilySubscriptions(familyData, 'member-1');

    expect(visibleSubscriptions.map((sub) => sub.id)).toEqual(['member-sub']);
  });

  it('requires explicit owner opt-in before exposing all family subscriptions', () => {
    const familyData = {
      isOwner: true,
      familyDataSharingEnabled: false,
      subscriptions: [
        {
          id: 'member-sub',
          user_id: 'member-1',
          name: 'Spotify',
          status: 'active',
          amount: 12,
          currency: 'USD',
          frequency: 'monthly',
        },
        {
          id: 'owner-sub',
          user_id: 'owner-1',
          name: 'Netflix',
          status: 'active',
          amount: 15,
          currency: 'USD',
          frequency: 'monthly',
        },
      ],
      sharedSubscriptions: [],
      members: [
        { user_id: 'owner-1', role: 'owner' },
        { user_id: 'member-1', role: 'member' },
      ],
    };

    const visibleSubscriptions = getVisibleFamilySubscriptions(familyData, 'owner-1');

    expect(visibleSubscriptions.map((sub) => sub.id)).toEqual(['owner-sub']);
  });

  it('shows all family subscriptions for the owner even when the payload omits the explicit flag', () => {
    const familyData = {
      isOwner: true,
      subscriptions: [
        {
          id: 'member-sub',
          user_id: 'member-1',
          name: 'Spotify',
          status: 'active',
          amount: 12,
          currency: 'USD',
          frequency: 'monthly',
        },
        {
          id: 'owner-sub',
          user_id: 'owner-1',
          name: 'Netflix',
          status: 'active',
          amount: 15,
          currency: 'USD',
          frequency: 'monthly',
        },
      ],
      sharedSubscriptions: [],
      members: [
        { user_id: 'owner-1', role: 'owner' },
        { user_id: 'member-1', role: 'member' },
      ],
    };

    const visibleSubscriptions = getVisibleFamilySubscriptions(familyData, 'owner-1');

    expect(visibleSubscriptions.map((sub) => sub.id)).toEqual(['member-sub', 'owner-sub']);
  });

  it('only shows another member\'s subscription when it was explicitly shared with the current member', () => {
    const familyData = {
      isOwner: false,
      familyDataSharingEnabled: true,
      subscriptions: [
        {
          id: 'other-sub',
          user_id: 'owner-1',
          name: 'Netflix',
          status: 'active',
          amount: 15,
          currency: 'USD',
          frequency: 'monthly',
        },
        {
          id: 'my-sub',
          user_id: 'member-1',
          name: 'Spotify',
          status: 'active',
          amount: 12,
          currency: 'USD',
          frequency: 'monthly',
        },
      ],
      sharedSubscriptions: [
        {
          subscription_id: 'other-sub',
          subscription: {
            id: 'other-sub',
            user_id: 'owner-1',
            name: 'Netflix',
            status: 'active',
            amount: 15,
            currency: 'USD',
            frequency: 'monthly',
          },
        },
      ],
      members: [
        { user_id: 'owner-1', role: 'owner' },
        { user_id: 'member-1', role: 'member' },
      ],
    };

    const visibleSubscriptions = getVisibleFamilySubscriptions(familyData, 'member-1');

    expect(visibleSubscriptions.map((sub) => sub.id)).toEqual(['my-sub']);
  });

  it('keeps member family spend enabled even when the owner has not turned on show-family-data', () => {
    expect(shouldUseFamilyAwareSpending('family-1', false, false)).toBe(true);
    expect(shouldUseFamilyAwareSpending('family-1', true, true)).toBe(true);
    expect(shouldUseFamilyAwareSpending('family-1', false, true)).toBe(false);
  });

  it('counts a shared subscription in the current month spend for the member dashboard', () => {
    const now = new Date();
    const currentMonthDay = String(new Date(now.getFullYear(), now.getMonth(), 10).getDate()).padStart(2, '0');
    const familyData = {
      subscriptions: [
        {
          id: 'my-sub',
          user_id: 'member-1',
          name: 'Spotify',
          status: 'active',
          amount: 12,
          currency: 'USD',
          frequency: 'monthly',
          next_billing_at: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${currentMonthDay}`,
        },
      ],
      sharedSubscriptions: [
        {
          id: 'shared-123',
          subscription_id: 'shared-sub',
          shared_with_user_id: 'member-1',
          subscription: {
            id: 'shared-sub',
            user_id: 'owner-1',
            name: 'Netflix',
            status: 'active',
            amount: 18,
            currency: 'USD',
            frequency: 'monthly',
            next_billing_at: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${currentMonthDay}`,
          },
        },
      ],
      members: [
        { user_id: 'owner-1', role: 'owner' },
        { user_id: 'member-1', role: 'member' },
      ],
    };

    const metrics = computeFamilyMetrics(familyData);
    expect(metrics.totalMonthlySpending).toBe(30);
  });

  it('prefers the current month family spend series over stale family metrics for the owner dashboard', () => {
    const familyData = {
      metrics: { totalMonthlySpending: 5 },
      spending: [
        { month: 'May 2026', amount: 48, isCurrentMonth: false },
        { month: 'Jun 2026', amount: 72, isCurrentMonth: true },
      ],
    };

    expect(getCurrentMonthFamilySpend(familyData, [{ month: 'Jun 2026', amount: 72, isCurrentMonth: true }])).toBe(72);
  });
});
