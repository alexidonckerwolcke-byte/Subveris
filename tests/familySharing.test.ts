import { vi, describe, it, expect, beforeEach } from 'vitest';

// create a fake supabase client that can be used for both "supabase" and "supabaseAdmin"
function makeFakeClient() {
  function defaultResult(table: string, chain: any) {
    if (table === 'family_groups') {
      // used to verify owner
      return { owner_id: 'owner123' };
    }

    if (table === 'user_subscriptions') {
      // queries vary by what is being selected
      const selecting = chain._select || '';
      // first call in addFamilyMember looks for plan_type/status
      if (selecting.includes('plan_type') && !chain._query.some((q: any) => q.op === 'in')) {
        return [{ plan_type: 'free', status: 'inactive' }];
      }
      // later call for existing subscription only selects id
      if (selecting.includes('id') && !chain._query.some((q: any) => q.op === 'in')) {
        return [];
      }
      // getFamilyMembersWithSubscriptions: in('user_id', [...])
      const inOp = chain._query.find((q: any) => q.op === 'in' && q.args[0] === 'user_id');
      if (selecting.includes('id') && inOp) {
        return [
          { id: 'sub1', user_id: inOp.args[1][0], plan_type: 'free', status: 'active' },
        ];
      }
      return [];
    }

    if (table === 'family_group_plan_backups') {
      if (chain._insertData) {
        return { ...chain._insertData };
      }
      return [];
    }

    if (table === 'family_group_members') {
      if (chain._insertData) {
        return {
          ...chain._insertData,
          id: 'new-member-id',
          joined_at: '2023-01-01T00:00:00Z',
        };
      }
      // default return for getFamilyMembers
      return [
        {
          id: 'm1',
          family_group_id: 'grp1',
          user_id: 'member1',
          role: 'member',
          joined_at: 'date',
          email: 'email',
        },
      ];
    }

    if (table === 'shared_subscriptions') {
      if (chain._insertData) {
        return {
          ...chain._insertData,
          id: 'shared1',
          shared_at: '2023-01-01T00:00:00Z',
        };
      }
      return [
        {
          id: 'shared1',
          family_group_id: 'grp1',
          subscription_id: 'sub1',
          shared_by_user_id: 'owner123',
          shared_at: '2023-01-01T00:00:00Z',
        },
      ];
    }

    if (table === 'cost_splits') {
      if (chain._insertData) {
        return {
          id: 'split1',
          shared_subscription_id: chain._insertData.shared_subscription_id,
          user_id: chain._insertData.user_id,
          percentage: chain._insertData.percentage,
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        };
      }
      return [
        {
          id: 'split1',
          shared_subscription_id: 'shared1',
          user_id: 'member1',
          percentage: 50,
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z',
        },
      ];
    }

    return null;
  }

  const client: any = {
    from: (table: string) => {
      const chain: any = { _table: table, _query: [], _select: '', _insertData: null };

      ['select', 'eq', 'in', 'neq', 'update', 'insert', 'upsert', 'delete'].forEach((op) => {
        chain[op] = (...args: any[]) => {
          if (op === 'select') {
            chain._select = args[0];
          }
          if (op === 'insert' || op === 'update' || op === 'upsert') {
            chain._insertData = args[0];
          }
          chain._query.push({ op, args });
          return chain;
        };
      });

      chain.single = async () => {
        const data = defaultResult(table, chain);
        return { data, error: null };
      };
      chain.then = (resolve: any) => {
        const data = defaultResult(table, chain);
        resolve({ data, error: null });
      };

      return chain;
    },
    auth: { admin: { getUserById: vi.fn().mockResolvedValue({ data: { user: { email: 'member@example.com' } }, error: null }) } },
  };

  return client;
}

// mock supabase client creation before importing the module under test
// we build the fake client entirely inside the factory so it never touches
// any variables that might be in the TDZ.  tests do not access the fake
// instance directly, they just exercise the exported functions.
vi.mock('@supabase/supabase-js', () => {
  const fake = makeFakeClient();
  return {
    createClient: () => fake,
  };
});

// patch randomUUID so that ids are predictable
vi.spyOn(require('crypto'), 'randomUUID').mockReturnValue('fixed-uuid');

import * as familySharing from '../server/family-sharing';


describe('family-sharing helpers', () => {
  // no beforeEach needed; the fake client lives inside the mock factory and its
  // methods already start fresh for each test file run.

  it('throws if non-owner adds member', async () => {
    await expect(familySharing.addFamilyMember('grp1', 'not-owner', 'member1')).rejects.toThrow(
      'Only group owner can add members'
    );
  });

  it('adds member when owner', async () => {
    const result = await familySharing.addFamilyMember('grp1', 'owner123', 'member1');
    expect(result.userId).toBe('member1');
    expect(result.email).toBe('member@example.com');
    expect(result.role).toBe('member');
    expect(result.id).toBe('new-member-id');
  });

  it('fetches family members', async () => {
    const members = await familySharing.getFamilyMembers('grp1');
    expect(members).toEqual([
      {
        id: 'm1',
        familyGroupId: 'grp1',
        userId: 'member1',
        role: 'member',
        joinedAt: 'date',
        email: 'email',
      },
    ]);
  });

  it('returns members with subscriptions', async () => {
    const members = await familySharing.getFamilyMembersWithSubscriptions('grp1');
    expect(members.length).toBe(1);
    expect(members[0].subscription).toEqual({
      id: 'sub1',
      user_id: 'member1',
      plan_type: 'free',
      status: 'active',
    });
  });

  it('can share a subscription and fetch the list', async () => {
    const shared = await familySharing.shareSubscription('grp1', 'sub1', 'owner123');
    expect(shared.id).toBe('shared1');
    expect(shared.subscriptionId).toBe('sub1');

    const list = await familySharing.getSharedSubscriptions('grp1');
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('shared1');
  });

  it('can set and retrieve cost splits', async () => {
    const split = await familySharing.setCostSplit('shared1', 'member1', 25);
    expect(split.id).toBe('split1');
    expect(split.percentage).toBe(25);

    const splits = await familySharing.getCostSplits('shared1');
    expect(splits).toHaveLength(1);
    expect(splits[0].userId).toBe('member1');
    expect(splits[0].percentage).toBe(50); // default data in fake
  });

  it('can unshare a subscription', async () => {
    await expect(familySharing.unshareSubscription('shared1')).resolves.toBeUndefined();
  });

  it('allows owner to remove members but not others', async () => {
    // non-owner removing someone else should fail
    await expect(
      familySharing.removeFamilyMember('grp1', 'not-owner', 'member1')
    ).rejects.toThrow('Only group owner or the member themselves can remove');

    // owner can remove another member (no error from fake client)
    await expect(
      familySharing.removeFamilyMember('grp1', 'owner123', 'member1')
    ).resolves.toBeUndefined();
  });

  it('prevents non-owner from deleting a group and allows owner', async () => {
    await expect(familySharing.deleteFamilyGroup('grp1', 'not-owner')).rejects.toThrow(
      'Only group owner can delete'
    );
    await expect(familySharing.deleteFamilyGroup('grp1', 'owner123')).resolves.toBeUndefined();
  });
});
