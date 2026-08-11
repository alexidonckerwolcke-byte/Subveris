import type { Subscription } from "@shared/schema";
import { isSubscriptionDeleted } from "@/lib/utils";

function normalizeId(value: any): string | undefined {
  if (!value && value !== 0) return undefined;
  const normalized = String(value).trim();
  return normalized === '' ? undefined : normalized;
}

function normalizeSubscriptionOwnerId(sub: any): string | undefined {
  return normalizeId(sub?.userId || sub?.user_id);
}

function normalizeMembershipUserId(member: any): string | undefined {
  return normalizeId(member?.userId || member?.user_id);
}

function isOwnerFromMembers(familyData: any, currentUserId?: string): boolean {
  if (!currentUserId || !Array.isArray(familyData?.members)) return false;
  return familyData.members.some((member: any) => {
    const memberId = normalizeMembershipUserId(member);
    const role = String(member?.role || '').toLowerCase();
    return memberId === currentUserId && role === 'owner';
  });
}

function normalizeFamilySubscription(sub: any): Subscription {
  if (!sub || typeof sub !== 'object') return sub;
  if (sub.websiteDomain || sub.website_domain) {
    return {
      ...sub,
      websiteDomain: sub.websiteDomain || sub.website_domain,
    };
  }
  return sub;
}

function getSubscriptionCandidateFromShared(shared: any): Subscription | null {
  if (!shared) return null;
  if (shared.subscription && shared.subscription.id) {
    return normalizeFamilySubscription(shared.subscription);
  }

  if (shared.id && shared.name && shared.amount !== undefined) {
    return normalizeFamilySubscription(shared as Subscription);
  }

  return null;
}

export function getVisibleFamilySubscriptions(familyData: any, currentUserId?: string): Subscription[] {
  const sharedSubscriptions = Array.isArray(familyData?.sharedSubscriptions) ? familyData.sharedSubscriptions : [];
  const subscriptions = Array.isArray(familyData?.subscriptions) ? familyData.subscriptions.map(normalizeFamilySubscription) : [];
  if (subscriptions.length === 0 && sharedSubscriptions.length === 0) return [];

  const allSubs: Subscription[] = [...subscriptions];

  for (const shared of sharedSubscriptions) {
    const candidate = getSubscriptionCandidateFromShared(shared);
    if (candidate?.id) {
      allSubs.push(candidate);
    }
  }

  const uniqueSubs = new Map<string, Subscription>();
  for (const sub of allSubs) {
    if (!sub?.id) continue;
    if (!uniqueSubs.has(sub.id)) {
      uniqueSubs.set(sub.id, sub);
    }
  }

  const isOwner = familyData?.isOwner === true
    || isOwnerFromMembers(familyData, currentUserId);

  if (!isOwner && currentUserId) {
    const visibleIds = new Set<string>();
    const memberDeletedIds = new Set<string>();

    for (const sub of subscriptions) {
      const ownerId = normalizeSubscriptionOwnerId(sub);
      if (sub?.id && ownerId === currentUserId) {
        visibleIds.add(sub.id);
        if (isSubscriptionDeleted(sub)) {
          memberDeletedIds.add(sub.id);
        }
      }
    }

    for (const shared of sharedSubscriptions) {
      const sharedId = shared?.subscription?.id || shared?.subscription_id;
      if (sharedId) visibleIds.add(sharedId);
    }

    return Array.from(uniqueSubs.values()).filter((sub) => {
      if (!sub?.id) return false;
      return visibleIds.has(sub.id) || memberDeletedIds.has(sub.id);
    });
  }

  return Array.from(uniqueSubs.values());
}
