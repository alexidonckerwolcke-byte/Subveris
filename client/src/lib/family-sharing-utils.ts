import type { Subscription } from "@shared/schema";

/**
 * Returns the subset of `allSubs` that aren't deleted and aren't already
 * represented in the `sharedSubs` list.  The latter may contain either
 * `{ subscription_id }` rows or expanded `{ subscription: { id } }`
 * objects depending on how the server has joined the data.
 */
export function filterAvailableToShare(
  allSubs: Subscription[],
  sharedSubs?: any[]
): Subscription[] {
  const sharedIds = new Set(
    (sharedSubs || []).map((s: any) => s.subscription_id || s.subscription?.id)
  );
  return allSubs.filter(
    (s) => s.status !== 'deleted' && !sharedIds.has(s.id)
  );
}
