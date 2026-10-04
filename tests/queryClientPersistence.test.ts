import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../client/src/lib/supabase', () => ({
  supabase: null,
  supabaseAnonKeyOverride: '',
}));

describe('session query cache', () => {
  beforeEach(() => {
    vi.resetModules();
    window.sessionStorage.clear();
  });

  it('restores successful API data immediately after a page reload', async () => {
    const firstApp = await import('../client/src/lib/queryClient');
    firstApp.restoreQueryCacheForUser('user-1');
    firstApp.queryClient.setQueryData(['/api/subscriptions'], [{ id: 'sub-1', name: 'Copilot' }]);

    expect(window.sessionStorage.getItem('subveris.query-cache.v1:user-1')).toContain('Copilot');

    vi.resetModules();
    const reloadedApp = await import('../client/src/lib/queryClient');
    reloadedApp.restoreQueryCacheForUser('user-1');

    expect(reloadedApp.queryClient.getQueryData(['/api/subscriptions'])).toEqual([
      { id: 'sub-1', name: 'Copilot' },
    ]);
  });

  it('clears a previous user cache on logout or account switch', async () => {
    const app = await import('../client/src/lib/queryClient');
    app.restoreQueryCacheForUser('user-1');
    app.queryClient.setQueryData(['/api/subscriptions'], [{ id: 'sub-1' }]);

    app.restoreQueryCacheForUser(null);

    expect(window.sessionStorage.getItem('subveris.query-cache.v1:user-1')).toBeNull();
    expect(app.queryClient.getQueryData(['/api/subscriptions'])).toBeUndefined();
  });
});