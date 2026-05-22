import type { CostPerUseAnalysis } from "@shared/schema";

/**
 * Given an array of subscriptions (as returned from the API), calculate the
 * cost‑per‑use analysis that the dashboard displays. This logic mirrors the
 * server’s `/api/analysis/cost-per-use` endpoint but runs client‑side when a
 * family‑level result isn’t available.
 */
export function computeCostPerUseFromSubs(subs: any[] | undefined): CostPerUseAnalysis[] {
  if (!subs || subs.length === 0) return [];
  return subs
    .filter(s => s && s.status !== 'deleted')
    .map((sub) => {
      const monthlyAmount =
        sub.frequency === 'yearly'
          ? sub.amount / 12
          : sub.frequency === 'quarterly'
          ? sub.amount / 3
          : sub.frequency === 'weekly'
          ? sub.amount * 4
          : sub.amount;
      // support both snake_case (raw rows) and camelCase (API response)
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usageMonth = (sub.usage_month ?? sub.usageMonth) as string | null;
      const monthlyUsageCount = (sub.monthly_usage_count ?? sub.monthlyUsageCount) as number | undefined;
      // also accept legacy/common fields `usage_count` or `usageCount`
      const directUsageCount = (sub.usage_count ?? sub.usageCount) as number | undefined;

      let usageCount = 0;
      if (monthlyUsageCount !== undefined) {
        // Cost per use resets to zero on the first day of each month
        // Only trust monthly count if it matches current month; otherwise reset to 0
        usageCount = usageMonth === currentMonth ? monthlyUsageCount : 0;
      } else if (directUsageCount !== undefined) {
        usageCount = directUsageCount;
      } else {
        usageCount = 0;
      }
      const costPerUse = usageCount > 0 ? monthlyAmount / usageCount : monthlyAmount;
      // Determine value rating based on both usage count and cost per use
      let valueRating: 'excellent' | 'good' | 'fair' | 'poor';
      if (usageCount <= 1) {
        valueRating = 'poor';
      } else if (usageCount <= 3) {
        valueRating = costPerUse <= 10 ? 'fair' : 'poor';
      } else {
        valueRating = costPerUse > 20 ? 'poor' : costPerUse > 10 ? 'fair' : 'good';
      }
      return {
        subscriptionId: sub.id,
        name: sub.name,
        monthlyAmount: Math.round(monthlyAmount * 100) / 100,
        usageCount,
        costPerUse: Math.round(costPerUse * 100) / 100,
        valueRating,
        currency: sub.currency || 'USD',
      } as CostPerUseAnalysis;
    });
}
