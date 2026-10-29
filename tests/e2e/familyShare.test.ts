import 'dotenv/config';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient } from '@supabase/supabase-js';

const testSupabaseUrl = process.env.TEST_SUPABASE_URL;
const testSupabaseServiceRoleKey = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;
const testSupabaseAnonKey = process.env.TEST_SUPABASE_ANON_KEY;
const testApiBaseUrl = process.env.TEST_SUPABASE_API_URL
  || (testSupabaseUrl ? `${testSupabaseUrl}/functions/v1/api` : '');
const hasTestSupabase = !!testSupabaseUrl && !!testSupabaseServiceRoleKey && !!testSupabaseAnonKey;
const supabase = hasTestSupabase
  ? createClient(testSupabaseUrl!, testSupabaseServiceRoleKey!, { auth: { persistSession: false } })
  : null;

const describeE2E = hasTestSupabase ? describe : describe.skip;

describeE2E('E2E family sharing & cost-per-use', () => {
  const testPassword = 'LocalTestPassword123!';
  const createdUserIds: string[] = [];
  let ownerId: string;
  let memberId: string;
  let outsiderId: string;
  let ownerToken: string;
  let memberToken: string;
  let outsiderToken: string;
  let groupId: string;

  async function signIn(email: string) {
    const client = createClient(testSupabaseUrl!, testSupabaseAnonKey!, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: `family-e2e-${email}` },
    });
    const { data, error } = await client.auth.signInWithPassword({ email, password: testPassword });
    if (error || !data.session) throw error || new Error('Local test sign-in returned no session');
    return data.session.access_token;
  }

  function api(token: string) {
    const agent = request(testApiBaseUrl);
    return {
      get: (path: string) => agent.get(path)
        .set('apikey', testSupabaseAnonKey!)
        .set('Authorization', `Bearer ${token}`),
      post: (path: string) => agent.post(path)
        .set('apikey', testSupabaseAnonKey!)
        .set('Authorization', `Bearer ${token}`),
      put: (path: string) => agent.put(path)
        .set('apikey', testSupabaseAnonKey!)
        .set('Authorization', `Bearer ${token}`),
      delete: (path: string) => agent.delete(path)
        .set('apikey', testSupabaseAnonKey!)
        .set('Authorization', `Bearer ${token}`),
    };
  }

  beforeAll(async () => {
    if (!supabase) throw new Error('Local Supabase test credentials are not configured');

    ownerId = randomUUID();
    memberId = randomUUID();
    outsiderId = randomUUID();

    const users = await Promise.all(
      [ownerId, memberId, outsiderId].map((id) => supabase.auth.admin.createUser({
        id,
        email: `${id}@example.com`,
        password: testPassword,
        email_confirm: true,
      })),
    );
    createdUserIds.push(...users.flatMap(({ data }) => data.user ? [data.user.id] : []));
    const userCreationError = users.find(({ error }) => error)?.error;
    if (userCreationError) throw userCreationError;

    [ownerToken, memberToken, outsiderToken] = await Promise.all(
      [ownerId, memberId, outsiderId].map((id) => signIn(`${id}@example.com`)),
    );
  });

  afterAll(async () => {
    if (!supabase) return;
    for (const userId of createdUserIds) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    }
  });

  it('keeps family cost data private until a subscription is explicitly shared', async () => {
    if (!supabase) throw new Error('Local Supabase test credentials are not configured');

    const groupResponse = await api(ownerToken)
      .post('/family-groups')
      .send({ name: 'Local E2E family' })
      .expect(200);
    groupId = groupResponse.body.id;
    expect(groupId).toBeTruthy();

    const memberInvite = await api(ownerToken)
      .post(`/family-groups/${groupId}/members`)
      .send({ memberEmail: `${memberId}@example.com` })
      .expect(202);
    await api(memberToken)
      .post(`/family-invitations/${memberInvite.body.id}/accept`)
      .send({})
      .expect(200);

    const outsiderInvite = await api(ownerToken)
      .post(`/family-groups/${groupId}/members`)
      .send({ memberEmail: `${outsiderId}@example.com` })
      .expect(202);
    await api(outsiderToken)
      .post(`/family-invitations/${outsiderInvite.body.id}/accept`)
      .send({})
      .expect(200);

    const { error: planError } = await supabase.from('user_subscriptions').insert({
      id: randomUUID(),
      user_id: ownerId,
      status: 'active',
      plan_type: 'family',
    });
    if (planError) throw planError;

    await api(ownerToken)
      .put(`/family-groups/${groupId}/settings`)
      .send({ show_family_data: true })
      .expect(200);

    const makeSubscription = async (userId: string, name: string, amount: number, usageCount: number) => {
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          name,
          amount,
          frequency: 'monthly',
          status: 'active',
          is_detected: false,
          usage_count: usageCount,
          currency: 'USD',
          category: 'test',
          next_billing_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error || !data) throw error || new Error(`Failed to create ${name}`);
      return data;
    };

    const ownerSubscription = await makeSubscription(ownerId, 'OwnerSub', 20, 2);
    const memberSubscription = await makeSubscription(memberId, 'MemberSub', 10, 5);
    const outsiderSubscription = await makeSubscription(outsiderId, 'OutsiderSub', 5, 1);

    const memberCostBeforeShare = await api(memberToken)
      .get(`/analysis/cost-per-use?familyGroupId=${groupId}`)
      .expect(200);
    expect(memberCostBeforeShare.body.map((row: { name: string }) => row.name)).toEqual(['MemberSub']);

    const outsiderCost = await api(outsiderToken)
      .get(`/analysis/cost-per-use?familyGroupId=${groupId}`)
      .expect(200);
    expect(outsiderCost.body.map((row: { name: string }) => row.name)).toEqual(['OutsiderSub']);

    const shareResponse = await api(ownerToken)
      .post(`/family-groups/${groupId}/share-subscription`)
      .send({ subscriptionId: ownerSubscription.id, memberIds: [memberId] })
      .expect(201);
    const sharedId = shareResponse.body[0].id;

    const memberCostAfterShare = await api(memberToken)
      .get(`/analysis/cost-per-use?familyGroupId=${groupId}`)
      .expect(200);
    expect(memberCostAfterShare.body.map((row: { name: string }) => row.name).sort())
      .toEqual(['MemberSub', 'OwnerSub']);
    expect(memberCostAfterShare.body.some((row: { name: string }) => row.name === outsiderSubscription.name)).toBe(false);

    const splitResponse = await api(ownerToken)
      .post(`/family-groups/${groupId}/shared-subscriptions/${sharedId}/cost-splits`)
      .send({ userId: memberId, percentage: 30 })
      .expect(201);
    expect(splitResponse.body.user_id).toBe(memberId);
    expect(Number(splitResponse.body.percentage)).toBe(30);

    const memberFamilyData = await api(memberToken)
      .get(`/family-groups/${groupId}/family-data`)
      .expect(200);
    expect(memberFamilyData.body.subscriptions.some((subscription: { id: string }) => subscription.id === ownerSubscription.id)).toBe(true);
    expect(memberFamilyData.body.subscriptions.some((subscription: { id: string }) => subscription.id === outsiderSubscription.id)).toBe(false);

    await api(ownerToken)
      .delete(`/family-groups/${groupId}/shared-subscriptions/${sharedId}`)
      .expect(200);

    const memberCostAfterUnshare = await api(memberToken)
      .get(`/analysis/cost-per-use?familyGroupId=${groupId}`)
      .expect(200);
    expect(memberCostAfterUnshare.body.map((row: { name: string }) => row.name)).toEqual(['MemberSub']);

    const { error: disableSharingError } = await supabase
      .from('family_group_settings')
      .update({ show_family_data: false })
      .eq('family_group_id', groupId);
    if (disableSharingError) throw disableSharingError;

    const disabledFamilyCost = await api(ownerToken)
      .get(`/analysis/cost-per-use?familyGroupId=${groupId}`);
    expect(disabledFamilyCost.status).toBe(403);

    const personalCost = await api(ownerToken)
      .get('/analysis/cost-per-use')
      .expect(200);
    expect(personalCost.body.map((row: { name: string }) => row.name)).toEqual(['OwnerSub']);

    expect(memberCostBeforeShare.body[0].name).toBe(memberSubscription.name);
  }, 30000);
});
