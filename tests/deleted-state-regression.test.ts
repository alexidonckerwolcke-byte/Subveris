import { describe, it, expect } from 'vitest';
import { isSubscriptionDeleted } from '../client/src/lib/utils';

describe('Deleted subscription visibility contract', () => {
  it('treats a status-active row with deleted_at metadata as deleted', () => {
    const row = {
      id: 'sub-1',
      name: 'Netflix',
      status: 'active',
      deleted_at: '2025-01-01T00:00:00.000Z',
    };

    expect(isSubscriptionDeleted(row)).toBe(true);
  });

  it('keeps a soft-deleted row out of the live subscription status groups', () => {
    const row = {
      id: 'sub-2',
      name: 'Spotify',
      status: 'active',
      deletedAt: '2025-01-01T00:00:00.000Z',
    };

    expect(isSubscriptionDeleted(row)).toBe(true);
  });
});
