import { describe, expect, it } from 'vitest';
import { getVisibleFamilySubscriptions } from '../client/src/lib/family-data';

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
});
