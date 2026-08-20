import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { apiFetch } from '../client/src/lib/api';

const testServer = process.env.VITE_API_URL || 'http://localhost:3000';

describe('Security Hardening', () => {
  describe('Input Validation', () => {
    it('should reject subscription with invalid name', async () => {
      const authToken = process.env.TEST_AUTH_TOKEN;
      if (!authToken) {
        console.log('Skipping: TEST_AUTH_TOKEN not set');
        return;
      }

      const res = await request(testServer)
        .patch('/api/subscriptions/test-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'a'.repeat(256), // Too long
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid name');
    });

    it('should reject subscription with invalid amount', async () => {
      const authToken = process.env.TEST_AUTH_TOKEN;
      if (!authToken) {
        console.log('Skipping: TEST_AUTH_TOKEN not set');
        return;
      }

      const res = await request(testServer)
        .patch('/api/subscriptions/test-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: -5, // Negative amount
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid amount');
    });

    it('should reject subscription with invalid currency code', async () => {
      const authToken = process.env.TEST_AUTH_TOKEN;
      if (!authToken) {
        console.log('Skipping: TEST_AUTH_TOKEN not set');
        return;
      }

      const res = await request(testServer)
        .patch('/api/subscriptions/test-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          currency: 'INVALID', // Wrong format
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid currency');
    });

    it('should reject subscription with invalid frequency', async () => {
      const authToken = process.env.TEST_AUTH_TOKEN;
      if (!authToken) {
        console.log('Skipping: TEST_AUTH_TOKEN not set');
        return;
      }

      const res = await request(testServer)
        .patch('/api/subscriptions/test-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          frequency: 'daily', // Not supported
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid frequency');
    });

    it('should accept valid subscription update', async () => {
      const authToken = process.env.TEST_AUTH_TOKEN;
      if (!authToken) {
        console.log('Skipping: TEST_AUTH_TOKEN not set');
        return;
      }

      const res = await request(testServer)
        .patch('/api/subscriptions/test-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Netflix',
          amount: 15.99,
          currency: 'USD',
          frequency: 'monthly',
        });

      // Should not be 400 (validation error)
      expect(res.status).not.toBe(400);
    });
  });

  describe('CSRF protection', () => {
    it('should attach session and CSRF headers for mutating requests', async () => {
      localStorage.setItem('supabase.auth.token', JSON.stringify({ access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signature' }));
      const fetchSpy = vi.spyOn(globalThis, 'fetch');
      fetchSpy
        .mockResolvedValueOnce(new Response(JSON.stringify({ sessionId: 'session-123', csrfToken: 'token-456' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }));

      await apiFetch('/api/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ name: 'Netflix' }),
        headers: { 'Content-Type': 'application/json' },
      });

      expect(fetchSpy).toHaveBeenCalledTimes(2);
      const mutationArgs = fetchSpy.mock.calls[1];
      const mutationHeaders = mutationArgs[1]?.headers as Record<string, string>;
      expect(mutationHeaders['X-Session-Id']).toBe('session-123');
      expect(mutationHeaders['X-CSRF-Token']).toBe('token-456');

      fetchSpy.mockRestore();
    });

    it('should issue an opaque extension session token instead of returning the raw bearer token', async () => {
      const authToken = process.env.TEST_AUTH_TOKEN;
      if (!authToken) {
        console.log('Skipping: TEST_AUTH_TOKEN not set');
        return;
      }

      const res = await request(testServer)
        .post('/api/security/extension-session')
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.sessionToken).toBeTruthy();
      expect(res.body.sessionToken).not.toBe(authToken);
      expect(res.body.expiresAt).toBeTruthy();
    });
  });

  describe('HTTP Security Headers', () => {
    // Note: These headers are set in server.js for the Node dev server
    // Run: npm run dev && curl -i http://localhost:3000 to verify
    it.skip('should include X-Content-Type-Options header', async () => {
      const res = await request(testServer)
        .get('/');

      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it.skip('should include X-Frame-Options header', async () => {
      const res = await request(testServer)
        .get('/');

      expect(res.headers['x-frame-options']).toBe('DENY');
    });

    it.skip('should include Referrer-Policy header', async () => {
      const res = await request(testServer)
        .get('/');

      expect(res.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    });

    it.skip('should include Permissions-Policy header', async () => {
      const res = await request(testServer)
        .get('/');

      expect(res.headers['permissions-policy']).toBeDefined();
      expect(res.headers['permissions-policy']).toContain('camera=()');
      expect(res.headers['permissions-policy']).toContain('microphone=()');
    });
  });
});
