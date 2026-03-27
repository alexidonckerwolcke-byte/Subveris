import type { FamilyGroup } from "@shared/schema";

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
  const subs = (familyData?.subscriptions || []).filter((s: any) => s.status !== 'deleted');
  const sharedRaw = (familyData?.sharedSubscriptions || []).filter((sh: any) => {
    const status = sh.status || sh.subscription?.status;
    return status !== 'deleted';
  });

  // Deduplicate: don't count a shared subscription twice if it already
  // appears in the main subscriptions list (common when owner shares their own)
  const sharedIds = new Set(sharedRaw.map((sh: any) => sh.subscription_id || sh.subscription?.id));
  const uniqueShared = sharedRaw.filter((sh: any) => !subs.some((s: any) => s.id === (sh.subscription_id || sh.subscription?.id)));

  const members = familyData?.members || [];

  const totalSubscriptions = subs.length + uniqueShared.length;
  const activeSubscriptions =
    subs.filter((s: any) => !s.status || s.status === 'active').length +
    uniqueShared.length;

  // monthly spend calculation largely unchanged from earlier code
  function toMonthly(item: any) {
    const amt = Number(item.amount) || 0;
    const freq = item.frequency || 'monthly';
    let monthly = amt;
    if (freq === 'yearly') monthly = amt / 12;
    if (freq === 'quarterly') monthly = amt / 3;
    if (freq === 'weekly') monthly = amt * 52 / 12;
    return monthly;
  }

  const monthlyFromSubs = subs.reduce((acc: number, s: any) => acc + toMonthly(s), 0);
  const monthlyFromShared = uniqueShared.reduce((acc: number, sh: any) => acc + toMonthly(sh), 0);

  const totalMonthlySpending = monthlyFromSubs + monthlyFromShared;

  return {
    totalSubscriptions,
    activeSubscriptions,
    totalMonthlySpending,
    memberCount: members.length,
  };
}
