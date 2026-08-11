import type { Subscription } from "@shared/schema";
import { isSubscriptionDeleted } from "@/lib/utils";

/**
 * Returns the subset of `allSubs` that aren't deleted and aren't already
 * represented in the `sharedSubs` list. The latter may contain either
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
  const list = Array.isArray(allSubs) ? allSubs : [];
  return list.filter((s) => s && !isSubscriptionDeleted(s) && !sharedIds.has(s.id));
}
