import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const TEST_SUPABASE_URL = process.env.TEST_SUPABASE_URL;
const TEST_SUPABASE_SERVICE_ROLE_KEY = process.env.TEST_SUPABASE_SERVICE_ROLE_KEY;

describe.skipIf(!TEST_SUPABASE_URL || !TEST_SUPABASE_SERVICE_ROLE_KEY)('Account Deletion', () => {
  let testUserId: string;
  let authToken: string;
  const testServer = process.env.VITE_API_URL || 'http://localhost:3000';

  beforeAll(async () => {
    // Create test user and subscription
    const signUpRes = await request(testServer)
      .post('/auth/signup')
      .send({
        email: `test-delete-${Date.now()}@test.com`,
        password: 'TempPassword123!',
      });

    if (signUpRes.status === 200 && signUpRes.body?.session?.access_token) {
      authToken = signUpRes.body.session.access_token;
      testUserId = signUpRes.body.user?.id;

      // Create a test subscription
      await request(testServer)
        .post('/api/subscriptions')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Netflix',
          amount: 9.99,
          currency: 'USD',
          frequency: 'monthly',
          category: 'Entertainment',
        });
    }
  });

  it('should verify subscriptions exist before deletion', async () => {
    const res = await request(testServer)
      .get('/api/subscriptions')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('should delete account and all associated data', async () => {
    const deleteRes = await request(testServer)
      .delete('/api/account')
      .set('Authorization', `Bearer ${authToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });

  it('should verify no subscriptions exist after deletion', async () => {
    // If the deletion worked, this token should be invalid or
    // there should be no subscriptions accessible
    const res = await request(testServer)
      .get('/api/subscriptions')
      .set('Authorization', `Bearer ${authToken}`);

    // Either unauthorized (token deleted) or empty array (user data gone)
    if (res.status === 200) {
      expect(res.body).toEqual([]);
    } else {
      expect([401, 403]).toContain(res.status);
    }
  });

  it('should reject operations on deleted account', async () => {
    const res = await request(testServer)
      .post('/api/subscriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Should Fail',
        amount: 5,
        currency: 'USD',
      });

    // Should be unauthorized or forbidden
    expect([401, 403, 404]).toContain(res.status);
  });
});
