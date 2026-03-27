/**
 * Subscription Health Score Calculator
 * 
 * Calculates a 0-100 health score based on:
 * - Unused subscriptions
 * - Cost per use
 * - Usage decline patterns
 * - Recent activity
 */

export interface HealthScoreInput {
  totalSubscriptions: number;
  unusedSubscriptions: number;
  subscriptions: {
    costPerUse: number;
    usageLastMonth: number;
    usagePreviousMonth: number;
    lastUsedDate: Date | null;
    isActive: boolean;
  }[];
}

export interface HealthScore {
  score: number;
  status: 'Poor' | 'Moderate' | 'Good' | 'Excellent';
  emoji: string;
  message: string;
  penalties: {
    unusedSubscriptions: number;
    highCostPerUse: number;
    declinedUsage: number;
    inactiveSubscriptions: number;
  };
  yearlyWaste: number;
  estimatedSavings: number;
}

export function calculateHealthScore(input: HealthScoreInput, userPremium: boolean = false): HealthScore {
  let baseScore = 100;
  const penalties = {
    unusedSubscriptions: 0,
    highCostPerUse: 0,
    declinedUsage: 0,
    inactiveSubscriptions: 0,
  };

  // Penalty: Unused subscriptions (-15 each)
  const unusedCount = input.unusedSubscriptions || 0;
  penalties.unusedSubscriptions = Math.min(unusedCount * 15, 40);

  // Penalty: High cost per use (-10 if cost > €5)
  let highCostCount = 0;
  let totalYearlyWaste = 0;

  input.subscriptions.forEach((sub) => {
    if (sub.costPerUse > 5) {
      highCostCount++;
    }
    if (sub.costPerUse > 5 && !sub.isActive) {
      totalYearlyWaste += sub.costPerUse * 52; // Rough estimate
    }
  });

  penalties.highCostPerUse = Math.min(highCostCount * 10, 30);

  // Penalty: Declining usage (-5 per subscription if declined > 50%)
  let decliningCount = 0;
  input.subscriptions.forEach((sub) => {
    if (sub.usagePreviousMonth > 0) {
      const declinePercentage = (sub.usagePreviousMonth - sub.usageLastMonth) / sub.usagePreviousMonth;
      if (declinePercentage > 0.5) {
        decliningCount++;
      }
    }
  });

  penalties.declinedUsage = Math.min(decliningCount * 5, 25);

  // Penalty: Inactive subscriptions (-5 if not used in 30+ days)
  let inactiveCount = 0;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  input.subscriptions.forEach((sub) => {
    if (!sub.lastUsedDate || sub.lastUsedDate < thirtyDaysAgo) {
      inactiveCount++;
    }
  });

  penalties.inactiveSubscriptions = Math.min(inactiveCount * 5, 20);

  // Calculate total penalties
  const totalPenalties =
    penalties.unusedSubscriptions +
    penalties.highCostPerUse +
    penalties.declinedUsage +
    penalties.inactiveSubscriptions;

  // Final score (clamped 0-100)
  let finalScore = Math.max(0, Math.min(100, baseScore - totalPenalties));

  // Determine status and message
  let status: 'Poor' | 'Moderate' | 'Good' | 'Excellent';
  let emoji: string;
  let message: string;

  if (finalScore >= 80) {
    status = 'Excellent';
    emoji = '🟢';
    message = 'Your subscriptions are well optimized!';
  } else if (finalScore >= 60) {
    status = 'Good';
    emoji = '🟡';
    message = 'You can optimize your subscriptions further.';
  } else if (finalScore >= 40) {
    status = 'Moderate';
    emoji = '🟠';
    message = 'You may be overspending on subscriptions.';
  } else {
    status = 'Poor';
    emoji = '🔴';
    message = 'Your subscription spending needs attention.';
  }

  // Estimate yearly waste (simplified)
  const estimatedSavings = totalYearlyWaste * 0.3; // Assume 30% could be saved

  return {
    score: Math.round(finalScore),
    status,
    emoji,
    message,
    penalties,
    yearlyWaste: Math.round(totalYearlyWaste),
    estimatedSavings: Math.round(estimatedSavings),
  };
}

export function getHealthScoreTier(score: number): 'Poor' | 'Moderate' | 'Good' | 'Excellent' {
  if (score >= 80) return 'Excellent';
  if (score >= 60) return 'Good';
  if (score >= 40) return 'Moderate';
  return 'Poor';
}
