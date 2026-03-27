import { describe, it, expect } from 'vitest';
import { filterAvailableToShare } from '../client/src/lib/family-sharing-utils';

// dummy subscription objects
const subs = [
  { id: 'a', status: 'active' },
  { id: 'b', status: 'deleted' },
  { id: 'c', status: 'active' },
];
const shared = [
  { subscription_id: 'c' },
  { subscription_id: 'x' },
];

describe('filterAvailableToShare', () => {
  it('removes deleted subs and those already shared', () => {
    const result = filterAvailableToShare(subs as any, shared as any);
    expect(result.map((s) => s.id)).toEqual(['a']);
  });

  it('returns all non-deleted when there are no shared entries', () => {
    const result = filterAvailableToShare(subs as any, []);
    expect(result.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('handles undefined shared list', () => {
    const result = filterAvailableToShare(subs as any, undefined);
    expect(result.map((s) => s.id)).toEqual(['a', 'c']);
  });
});
