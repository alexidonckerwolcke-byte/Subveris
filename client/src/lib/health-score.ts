import { calculateMonthlyCost } from "./utils";

export function getSubscriptionUsageCount(sub: any): number {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const usageMonth = (sub?.usage_month ?? sub?.usageMonth) as string | null;
  const monthlyUsageCount = (sub?.monthly_usage_count ?? sub?.monthlyUsageCount) as number | undefined;
  const directUsageCount = (sub?.usage_count ?? sub?.usageCount) as number | undefined;

  if (monthlyUsageCount !== undefined) {
    return usageMonth === currentMonth ? monthlyUsageCount : 0;
  }

  if (directUsageCount !== undefined) {
    return Number(directUsageCount) || 0;
  }

  const fallbackUsage = Number(sub?.sessionsPerMonth ?? sub?.sessionCount ?? 0) || 0;
  return fallbackUsage;
}

export function getSubscriptionLastUsedDate(sub: any): Date | null {
  const lastUsedCandidate = sub?.lastUsedDate || sub?.last_used_at || sub?.lastUsed || sub?.last_used || sub?.lastUsedAt || sub?.last_used_date;
  if (!lastUsedCandidate) return null;

  const parsed = new Date(lastUsedCandidate);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface HealthScore {
  subscriptionId: string;
  score: number;
  category: "excellent" | "healthy" | "review" | "critical";
  usageFrequency: number;
  recency: number;
  costEfficiency: number;
}

/**
 * Calculate health score for a subscription (0-100)
 * Based on:
 * - Usage Frequency (40%)
 * - Recency (30%)
 * - Cost Efficiency (30%)
 */
export function calculateHealthScore(sub: any): HealthScore {
  const sessionsPerMonth = getSubscriptionUsageCount(sub);
  const lastUsedDate = getSubscriptionLastUsedDate(sub);
  const monthlyAmount = calculateMonthlyCost(sub.amount || 0, sub.frequency || "monthly");
  const costPerUse = sessionsPerMonth > 0 ? monthlyAmount / sessionsPerMonth : monthlyAmount;

  // Calculate recency score (30%)
  let recencyScore = 0;
  if (lastUsedDate) {
    const daysSinceUse = Math.floor(
      (new Date().getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceUse === 0) recencyScore = 100;
    else if (daysSinceUse <= 7) recencyScore = 90;
    else if (daysSinceUse <= 30) recencyScore = 70;
    else if (daysSinceUse <= 60) recencyScore = 40;
    else if (daysSinceUse <= 90) recencyScore = 20;
    else recencyScore = 0;
  }

  // Calculate usage frequency score (40%)
  let usageScore = 0;
  if (sessionsPerMonth === 0) usageScore = 0;
  else if (sessionsPerMonth <= 3) usageScore = 25;
  else if (sessionsPerMonth <= 10) usageScore = 60;
  else if (sessionsPerMonth <= 20) usageScore = 85;
  else usageScore = 100;

  // Calculate cost efficiency score (30%)
  let efficiencyScore = 0;
  if (costPerUse > 15) efficiencyScore = 0;
  else if (costPerUse >= 10) efficiencyScore = 25;
  else if (costPerUse >= 5) efficiencyScore = 60;
  else if (costPerUse >= 2) efficiencyScore = 85;
  else efficiencyScore = 100;

  // Calculate final score
  const finalScore = Math.round(
    usageScore * 0.4 + recencyScore * 0.3 + efficiencyScore * 0.3
  );

  // Determine category
  let category: "excellent" | "healthy" | "review" | "critical" = "healthy";
  if (finalScore >= 90) category = "excellent";
  else if (finalScore >= 70) category = "healthy";
  else if (finalScore >= 40) category = "review";
  else category = "critical";

  return {
    subscriptionId: sub.id,
    score: finalScore,
    category,
    usageFrequency: usageScore,
    recency: recencyScore,
    costEfficiency: efficiencyScore,
  };
}

/**
 * Filter subscriptions with critical health score (< 40)
 * These are the subscriptions that should be included in potential savings calculations
 */
export function getSubscriptionsForPotentialSavings(subscriptions: any[]): any[] {
  return subscriptions.filter((sub) => {
    if (!sub || sub.status === "deleted") return false;
    
    // Use health score if available
    const health = calculateHealthScore(sub);
    return health.score < 40;
  });
}

/**
 * Calculate total potential savings from subscriptions
 * Includes all subscriptions with health score < 40
 */
export function calculatePotentialSavings(
  subscriptions: any[],
  convertAmountFn?: (amount: number, from?: string, to?: string) => number
): number {
  const savingsSubs = getSubscriptionsForPotentialSavings(subscriptions);
  
  return savingsSubs.reduce((sum, sub) => {
    const monthlyCost = calculateMonthlyCost(Number(sub.amount) || 0, sub.frequency || "monthly");
    const convertedCost = convertAmountFn
      ? convertAmountFn(monthlyCost, (sub.currency as string) || "USD", "USD")
      : monthlyCost;
    return sum + convertedCost;
  }, 0);
}
