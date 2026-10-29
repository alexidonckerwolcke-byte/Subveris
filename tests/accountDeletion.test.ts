import request from 'supertest';
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

describe.skipIf(!hasTestSupabase)('Account Deletion', () => {
  const email = `account-delete-${crypto.randomUUID()}@example.com`;
  const password = 'LocalTestPassword123!';
  let userId: string;
  let authToken: string;
  let subscriptionId: string;

  beforeAll(async () => {
    if (!supabase) throw new Error('Local Supabase test credentials are not configured');

    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !createdUser.user) throw createError || new Error('Failed to create account-deletion test user');
    userId = createdUser.user.id;

    const anonClient = createClient(testSupabaseUrl!, testSupabaseAnonKey!, {
      auth: { autoRefreshToken: false, persistSession: false, storageKey: `account-deletion-${userId}` },
    });
    const { data: sessionData, error: signInError } = await anonClient.auth.signInWithPassword({ email, password });
    if (signInError || !sessionData.session) throw signInError || new Error('Test user sign-in returned no session');
    authToken = sessionData.session.access_token;

    const { data: subscription, error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        name: 'Local account deletion test',
        category: 'test',
        amount: 9.99,
        currency: 'USD',
        frequency: 'monthly',
        next_billing_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    if (subscriptionError || !subscription) throw subscriptionError || new Error('Failed to create test subscription');
    subscriptionId = subscription.id;
  });

  afterAll(async () => {
    if (!supabase || !userId) return;
    const { data, error: lookupError } = await supabase.auth.admin.getUserById(userId);
    if (lookupError?.status === 404) return;
    if (lookupError) throw lookupError;
    if (!data.user) return;
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;
  });

  function api() {
    const agent = request(testApiBaseUrl);
    return {
      get: (path: string) => agent.get(path)
        .set('apikey', testSupabaseAnonKey!)
        .set('Authorization', `Bearer ${authToken}`),
      post: (path: string) => agent.post(path)
        .set('apikey', testSupabaseAnonKey!)
        .set('Authorization', `Bearer ${authToken}`),
      delete: (path: string) => agent.delete(path)
        .set('apikey', testSupabaseAnonKey!)
        .set('Authorization', `Bearer ${authToken}`),
    };
  }

  it('should verify subscriptions exist before deletion', async () => {
    if (!supabase) throw new Error('Local Supabase test credentials are not configured');
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId);

    if (error) throw error;
    expect(data?.map((row) => row.id)).toContain(subscriptionId);
  });

  it('should delete account and all associated data', async () => {
    const response = await api()
      .delete('/account')
      .expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.success).toBe(true);
  });

  it('should verify no subscriptions exist after deletion', async () => {
    if (!supabase) throw new Error('Local Supabase test credentials are not configured');
    const [{ data: subscriptions, error: subscriptionError }, { data: authUser, error: authError }] = await Promise.all([
      supabase.from('subscriptions').select('id').eq('user_id', userId),
      supabase.auth.admin.getUserById(userId),
    ]);

    if (subscriptionError) throw subscriptionError;
    expect(subscriptions).toEqual([]);
    expect(authUser.user).toBeNull();
    expect(authError?.status).toBe(404);
  });

  it('should reject operations on deleted account', async () => {
    const response = await api()
      .post('/subscriptions')
      .send({
        name: 'Must not be created',
        amount: 5,
        currency: 'USD',
      });

    expect([401, 403, 404]).toContain(response.status);
  });
});
