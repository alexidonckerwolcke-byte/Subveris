import { describe, it, expect } from 'vitest';
import { filterAvailableToShare } from '../client/src/lib/family-sharing-utils';
import { getVisibleFamilySubscriptions } from '../client/src/lib/family-data';

describe('Family-mode deleted visibility', () => {
  it('filters out a soft-deleted family row from the active share pool even when status is still active', () => {
    const rows = [
      {
        id: 'sub-1',
        name: 'Streaming',
        status: 'active',
        deleted_at: '2026-01-01T00:00:00.000Z',
      },
    ];

    const result = filterAvailableToShare(rows as any, []);
    expect(result).toHaveLength(0);
  });

  it('keeps a member-owned soft-deleted family row in the family-data payload for the Deleted section', () => {
    const familyData = {
      isOwner: false,
      subscriptions: [
        {
          id: 'sub-2',
          user_id: 'member-1',
          name: 'Spotify',
          status: 'active',
          deleted_at: '2026-01-01T00:00:00.000Z',
          amount: 10,
          currency: 'USD',
          frequency: 'monthly',
          next_billing_at: '2026-01-01',
        },
      ],
      sharedSubscriptions: [],
      members: [],
    };

    const visible = getVisibleFamilySubscriptions(familyData, 'member-1');
    expect(visible.some((sub: any) => sub.id === 'sub-2')).toBe(true);
  });
});
