import type { FamilyGroup } from "@shared/schema";
import { isSubscriptionBilledInMonth } from "./utils";

export interface FamilyMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  totalMonthlySpending: number;
  memberCount: number;
}

/**
 * Compute simple metrics from server-provided family data. This mirrors the
 * logic originally embedded in FamilySharing component but is extracted so we
 * can unit test it and keep the component cleaner.
 */
export function computeFamilyMetrics(familyData: any): FamilyMetrics {
  const isSubscriptionActiveLike = (sub: any) => {
    const status = String(sub?.status || '').trim().toLowerCase();
    return status === 'active' || status === 'unused' || status === 'to-cancel';
  };

  const subs = (familyData?.subscriptions || []).filter((s: any) => isSubscriptionActiveLike(s));
  const sharedRaw = (familyData?.sharedSubscriptions || []).filter((sh: any) => {
    const status = String(sh?.status || sh.subscription?.status || '').trim().toLowerCase();
    return status === 'active' || status === 'unused' || status === 'to-cancel';
  });

  // Deduplicate: don't count a shared subscription twice if it already
  // appears in the main subscriptions list (common when owner shares their own)
  const sharedIds = new Set(sharedRaw.map((sh: any) => sh.subscription_id || sh.subscription?.id));
  const uniqueShared = sharedRaw.filter((sh: any) => !subs.some((s: any) => s.id === (sh.subscription_id || sh.subscription?.id)));

  const members = familyData?.members || [];

  const totalSubscriptions = subs.length + uniqueShared.length;
  const activeSubscriptions =
    subs.filter((s: any) => String(s.status || '').trim().toLowerCase() === 'active' || String(s.status || '').trim().toLowerCase() === 'unused').length +
    uniqueShared.filter((sh: any) => {
      const status = String(sh?.status || sh.subscription?.status || '').trim().toLowerCase();
      return status === 'active' || status === 'unused';
    }).length;

  function toMonthly(item: any) {
    const amt = Number(item.amount) || 0;
    const freq = (item.frequency || 'monthly').toLowerCase();
    if (freq === 'yearly') return amt / 12;
    if (freq === 'quarterly') return amt / 3;
    if (freq === 'weekly') return amt * 4;
    return amt;
  }

  const now = new Date();

  const isRenewingToday = (item: any) => {
    if (item.status !== 'active' && item.status !== 'unused' && item.status !== 'to-cancel') return false;
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return isSubscriptionBilledInMonth(item, monthStart, monthEnd, now, true);
  };

  const monthlyFromSubs = subs
    .filter(isRenewingToday)
    .reduce((acc: number, sub: any) => acc + toMonthly(sub), 0);

  const monthlyFromShared = uniqueShared
    .filter(isRenewingToday)
    .reduce((acc: number, sh: any) => acc + toMonthly(sh), 0);

  const totalMonthlySpending = monthlyFromSubs + monthlyFromShared;

  return {
    totalSubscriptions,
    activeSubscriptions,
    totalMonthlySpending,
    memberCount: members.length,
  };
}
