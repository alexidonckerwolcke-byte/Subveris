import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { PremiumGate } from "@/components/premium-gate";
import { useSubscription } from "@/lib/subscription-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { useCurrency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Zap,
  Activity,
  Clock,
  DollarSign,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import type { AIRecommendation, Subscription } from "@shared/schema";
import {
  calculateMonthlyCost,
  dedupeByKey,
} from "@/lib/utils";
import { getVisibleFamilySubscriptions } from "@/lib/family-data";
import {
  calculateHealthScore as computeBaseHealthScore,
  calculatePotentialSavings,
  getSubscriptionLastUsedDate,
  getSubscriptionUsageCount,
} from "@/lib/health-score";
import { generateRecommendationsFromSubscriptions } from "@/lib/recommendations";

interface HealthScore {
  subscriptionId: string;
  name: string;
  score: number;
  category: "excellent" | "healthy" | "review" | "critical";
  usageFrequency: number;
  recency: number;
  costEfficiency: number;
  lastUsed?: string;
  monthlyAmount: number;
  sessionsPerMonth: number;
  costPerUse: number;
}

interface WasteDetection {
  subscriptionId: string;
  name: string;
  issues: ("unused" | "underused" | "poor-value" | "declining-usage")[];
  lastUsed?: string;
  daysSinceUse: number;
  monthlyAmount: number;
  sessionsPerMonth: number;
  costPerUse: number;
  savingsPotential: number;
}

function calculateHealthScore(sub: any): HealthScore {
  const sessionsPerMonth = getSubscriptionUsageCount(sub);
  const lastUsedDate = getSubscriptionLastUsedDate(sub);
  const monthlyAmount = calculateMonthlyCost(sub.amount || 0, sub.frequency || "monthly");
  const costPerUse = sessionsPerMonth > 0 ? monthlyAmount / sessionsPerMonth : monthlyAmount;

  // Use shared library function to compute base health score
  const baseScore = computeBaseHealthScore(sub);

  return {
    subscriptionId: sub.id,
    name: sub.name,
    score: baseScore.score,
    category: baseScore.category,
    usageFrequency: baseScore.usageFrequency,
    recency: baseScore.recency,
    costEfficiency: baseScore.costEfficiency,
    lastUsed: sub.lastUsed,
    monthlyAmount,
    sessionsPerMonth,
    costPerUse,
  };
}

function detectWaste(sub: any): WasteDetection | null {
  const health = calculateHealthScore(sub);
  
  // Calculate days since last use with better logic
  let daysSinceUse = 0;
  
  const lastUsedDate = getSubscriptionLastUsedDate(sub);
  if (lastUsedDate) {
    daysSinceUse = Math.floor((new Date().getTime() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  const issues: WasteDetection["issues"] = [];

  // Unused: No activity > 60 days
  if (daysSinceUse > 60) {
    issues.push("unused");
  }

  // Underused: Less than 3 sessions per month (and not in unused category)
  if (health.sessionsPerMonth < 3 && daysSinceUse <= 60 && daysSinceUse > 0) {
    issues.push("underused");
  }

  // Poor Value: Cost per use > €10
  if (health.costPerUse > 10) {
    issues.push("poor-value");
  }

  // Declining Usage: Low usage frequency combined with high cost
  if (health.usageFrequency < 25 && health.costPerUse > 5) {
    issues.push("declining-usage");
  }

  if (issues.length === 0) return null;

  return {
    subscriptionId: sub.id,
    name: sub.name,
    issues,
    lastUsed: sub.lastUsed,
    daysSinceUse,
    monthlyAmount: health.monthlyAmount,
    sessionsPerMonth: health.sessionsPerMonth,
    costPerUse: health.costPerUse,
    savingsPotential: issues.includes("unused") ? health.monthlyAmount : 0,
  };
}

interface PriorityAction {
  subscriptionId: string;
  title: string;
  description: string;
  savings: number;
  confidence: number;
  priority: "critical" | "high" | "medium" | "low";
  action: string;
  recommendation: string;
  reasoning: string[];
  dataQuality: number;
  usageCount: number;
  lastUsedLabel: string;
  costPerUse: number;
}

function mapRecommendationToPriorityAction(rec: AIRecommendation, sub: any, health: HealthScore): PriorityAction {
  const priority = rec.confidence >= 0.9
    ? "critical"
    : rec.confidence >= 0.75
      ? "high"
      : rec.confidence >= 0.6
        ? "medium"
        : "low";

  const action =
    rec.type === "cancel"
      ? "Cancel subscription"
      : rec.type === "downgrade"
        ? "Downgrade plan"
        : rec.type === "negotiate"
          ? "Negotiate rate"
          : "Switch subscription";

  const reasoning = [
    rec.type === "cancel"
      ? "This is a strong cancellation candidate based on low recent usage and clear waste."
      : rec.type === "downgrade"
        ? "This looks overbuilt for the current usage pattern and may be a better fit at a lower tier."
        : rec.type === "negotiate"
          ? "The current spend appears high enough to justify a pricing conversation or better plan."
          : "A cheaper or better-fit alternative may offer more value for the same need.",
  ];

  const usageCount = getSubscriptionUsageCount(sub);
  const lastUsedDate = getSubscriptionLastUsedDate(sub);
  const lastUsedLabel = lastUsedDate
    ? `${Math.max(0, Math.floor((Date.now() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24)))}d ago`
    : "No recent usage";

  return {
    subscriptionId: rec.subscriptionId || sub?.id || "",
    title: rec.title,
    description: rec.description.split(".")[0].trim(),
    savings: rec.savings,
    confidence: Math.round(rec.confidence * 100),
    priority,
    action,
    recommendation: rec.description,
    reasoning,
    dataQuality: 95,
    usageCount,
    lastUsedLabel,
    costPerUse: health.costPerUse,
  };
}

function generatePriorityActions(subscriptions: any[], formatAmount?: (amount: number) => string): PriorityAction[] {
  const activeSubscriptions = (subscriptions || []).filter((sub) => sub && sub.status !== "deleted");
  const actionMap = new Map<string, PriorityAction>();

  for (const sub of activeSubscriptions) {
    const health = calculateHealthScore(sub);
    const waste = detectWaste(sub);
    const directRecommendations = generateRecommendationsFromSubscriptions([sub]);

    const directAction = directRecommendations[0]
      ? mapRecommendationToPriorityAction(directRecommendations[0], sub, health)
      : null;

    const fallbackAction = waste
      ? (() => {
          const monthlyAmount = health.monthlyAmount;
          const costPerUse = health.costPerUse;
          const sessionsPerMonth = waste.sessionsPerMonth;
          const daysSinceUse = waste.daysSinceUse;

          if (daysSinceUse > 90) {
            return {
              subscriptionId: sub.id,
              title: `Cancel ${sub.name}`,
              description: `No activity for ${daysSinceUse} days and no clear value left.` ,
              savings: monthlyAmount,
              confidence: 95,
              priority: "critical" as const,
              action: "Cancel subscription",
              recommendation: `${sub.name} has been inactive for ${daysSinceUse} days. Cancel it now to stop paying for dormant access.`,
              reasoning: [
                `No activity for ${daysSinceUse} days`,
                `This is costing you ${(formatAmount ? formatAmount(monthlyAmount) : monthlyAmount.toFixed(2))}/month with no current value`,
              ],
              dataQuality: 95,
              usageCount: getSubscriptionUsageCount(sub),
              lastUsedLabel: `${daysSinceUse}d ago`,
              costPerUse: health.costPerUse,
            };
          }

          if (daysSinceUse > 60 || costPerUse > 20 || (sessionsPerMonth < 1 && monthlyAmount > 10)) {
            return {
              subscriptionId: sub.id,
              title: `Reassess ${sub.name}`,
              description: `Usage is very low for the amount you are paying.`,
              savings: monthlyAmount * 0.7,
              confidence: 88,
              priority: "high" as const,
              action: "Cancel or downgrade",
              recommendation: `${sub.name} is costing too much for the value you are getting. Consider cancelling or moving to a cheaper plan.`,
              reasoning: [
                `Only ${sessionsPerMonth.toFixed(1)} uses/month`,
                `Cost per use is ${formatAmount ? formatAmount(costPerUse) : costPerUse.toFixed(2)}`,
              ],
              dataQuality: 92,
              usageCount: getSubscriptionUsageCount(sub),
              lastUsedLabel: `${daysSinceUse}d ago`,
              costPerUse: health.costPerUse,
            };
          }

          if (costPerUse > 10 || (sessionsPerMonth < 3 && monthlyAmount > 8)) {
            return {
              subscriptionId: sub.id,
              title: `Downgrade ${sub.name}`,
              description: `This looks like a good candidate for a cheaper tier.`,
              savings: monthlyAmount * 0.4,
              confidence: 74,
              priority: "medium" as const,
              action: "Downgrade plan",
              recommendation: `${sub.name} is being used sparingly. A lower tier or a pause could reduce spend without losing much value.`,
              reasoning: [
                `Usage is light at ${sessionsPerMonth.toFixed(1)} uses/month`,
                `The current spend is high relative to the value received`,
              ],
              dataQuality: 90,
              usageCount: getSubscriptionUsageCount(sub),
              lastUsedLabel: `${daysSinceUse}d ago`,
              costPerUse: health.costPerUse,
            };
          }

          return null;
        })()
      : null;

    const bestAction = [directAction, fallbackAction]
      .filter((action): action is PriorityAction => action !== null)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        if (a.savings !== b.savings) {
          return b.savings - a.savings;
        }
        return b.confidence - a.confidence;
      })[0];

    if (bestAction) {
      const existingAction = actionMap.get(bestAction.subscriptionId);
      if (!existingAction || bestAction.confidence > existingAction.confidence) {
        actionMap.set(bestAction.subscriptionId, bestAction);
      }
    }
  }

  return Array.from(actionMap.values())
    .sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      if (a.savings !== b.savings) {
        return b.savings - a.savings;
      }
      return b.confidence - a.confidence;
    })
    .slice(0, 5);
}

export default function CostOptimizer() {
  const { formatAmount } = useCurrency();
  const { tier } = useSubscription();
  const { user } = useAuth();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();

  const [refreshingHealthScores, setRefreshingHealthScores] = useState(false);

  // Load personal metrics
  const { data: personalMetrics } = useQuery<any>({
    queryKey: ["/api/metrics"],
    refetchOnMount: true,
  });

  // Load subscriptions
  const { data: personalSubscriptions } = useQuery<any[]>({
    queryKey: ["/api/subscriptions"],
    refetchOnMount: true,
  });

  const { data: familyData, refetch: refetchFamilyData } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "family-data"],
    enabled: !!familyGroupId,
    refetchOnMount: true,
  });

  const familySubscriptions = useMemo(
    () => getVisibleFamilySubscriptions(familyData, user?.id),
    [familyData, user?.id]
  );

  const subscriptions = showFamilyData ? familySubscriptions : personalSubscriptions;

  // Helper to get current month total
  function getCurrentMonthAmount(monthlyData: any[] | undefined) {
    if (!monthlyData || monthlyData.length === 0) return 0;
    const now = new Date();
    const currentMonthLabel = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const exactMatch = monthlyData.find((entry) => entry.month === currentMonthLabel);
    return exactMatch ? exactMatch.amount : 0;
  }

  // Calculate current month spending same as dashboard
  const currentMonthSpending = useMemo(() => {
    if (showFamilyData && familyData?.spending) {
      return getCurrentMonthAmount(familyData.spending);
    }
    return personalMetrics?.totalMonthlySpend || 0;
  }, [showFamilyData, familyData?.spending, personalMetrics?.totalMonthlySpend]);

  // Calculate metrics
  const healthScores = useMemo(
    () =>
      (subscriptions || [])
        .filter((s) => s && s.status !== "deleted")
        .map(calculateHealthScore)
        .sort((a, b) => a.score - b.score),
    [subscriptions]
  );

  const priorityActions = useMemo(
    () => generatePriorityActions(subscriptions || [], formatAmount),
    [subscriptions, formatAmount]
  );

  const wasteItems = useMemo(
    () =>
      (subscriptions || [])
        .map(detectWaste)
        .filter((w): w is WasteDetection => w !== null),
    [subscriptions]
  );

  const monthlySavingsPotential = useMemo(() => {
    return calculatePotentialSavings(subscriptions || []);
  }, [subscriptions]);

  const usageSnapshot = useMemo(() => {
    const activeSubscriptions = (subscriptions || []).filter((sub) => sub && sub.status !== "deleted");
    const usageCount = activeSubscriptions.reduce((sum, sub) => sum + getSubscriptionUsageCount(sub), 0);
    const recentlyUsed = activeSubscriptions.filter((sub) => {
      const lastUsedDate = getSubscriptionLastUsedDate(sub);
      if (!lastUsedDate) return false;
      return (Date.now() - lastUsedDate.getTime()) / (1000 * 60 * 60 * 24) <= 30;
    }).length;

    return {
      usageCount,
      activeSubscriptions: activeSubscriptions.length,
      recentlyUsed,
    };
  }, [subscriptions]);

  const criticalCount = healthScores.filter((h) => h.category === "critical").length;
  const reviewCount = healthScores.filter((h) => h.category === "review").length;
  const healthyCount = healthScores.filter((h) => h.category === "healthy").length;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "excellent":
        return "text-green-600";
      case "healthy":
        return "text-blue-600";
      case "review":
        return "text-yellow-600";
      case "critical":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getCategoryBgColor = (category: string) => {
    switch (category) {
      case "excellent":
        return "bg-green-50";
      case "healthy":
        return "bg-blue-50";
      case "review":
        return "bg-yellow-50";
      case "critical":
        return "bg-red-50";
      default:
        return "bg-gray-50";
    }
  };

  const getWasteIcon = (issue: string) => {
    switch (issue) {
      case "unused":
        return "⏸️";
      case "underused":
        return "📉";
      case "poor-value":
        return "💸";
      case "declining-usage":
        return "⬇️";
      default:
        return "⚠️";
    }
  };

  const getIssueLabel = (issue: string) => {
    switch (issue) {
      case "unused":
        return "Unused";
      case "underused":
        return "Underused";
      case "poor-value":
        return "Poor Value";
      case "declining-usage":
        return "Declining Usage";
      default:
        return issue;
    }
  };

  const getWasteActionLabel = (item: WasteDetection) => {
    if (item.issues.includes("unused")) return "Cancel or pause";
    if (item.issues.includes("underused")) return "Downgrade or pause";
    if (item.issues.includes("poor-value")) return "Switch to a cheaper plan";
    if (item.issues.includes("declining-usage")) return "Review and optimize";
    return "Review";
  };

  const handleRefresh = async () => {
    setRefreshingHealthScores(true);
    try {
      if (showFamilyData && familyGroupId) {
        await refetchFamilyData?.();
      } else {
        queryClient.removeQueries({ queryKey: ["/api/subscriptions"], exact: true });
        await queryClient.fetchQuery({
          queryKey: ["/api/subscriptions"],
          queryFn: async () => {
            const res = await apiRequest("GET", "/api/subscriptions");
            return res.json();
          },
          staleTime: 0,
        });
      }
    } finally {
      setRefreshingHealthScores(false);
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            AI Optimization
          </h1>
          <p className="text-muted-foreground">
            Your AI CFO for subscriptions. Find savings and maximize subscription value.
          </p>
        </div>

        {tier === "free" ? (
          <PremiumGate feature="AI Optimization" showBlurred={false} />
        ) : (
          <>
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-white">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-300/70 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-700 dark:border-white/15 dark:bg-white/10 dark:text-slate-200">
                    <Sparkles className="h-3.5 w-3.5" />
                    Premium subscription intelligence
                  </div>
                  <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                    Cut waste without losing the services you actually rely on.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    Each recommendation is backed by real usage, recency, and cost-to-value signals so you can act with confidence.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200/70 bg-white/70 p-4 backdrop-blur-sm dark:border-white/10 dark:bg-white/10">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600 dark:text-slate-300">
                    Potential monthly savings
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
                    {formatAmount(monthlySavingsPotential)}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                    {formatAmount(monthlySavingsPotential * 12)} / year
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-red-400/20 bg-red-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-red-700 dark:text-red-100">Immediate attention</p>
                    <AlertCircle className="h-4 w-4 text-red-700 dark:text-red-200" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-red-900 dark:text-white">{criticalCount}</p>
                </div>
                <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-amber-700 dark:text-amber-100">Worth reviewing</p>
                    <Activity className="h-4 w-4 text-amber-700 dark:text-amber-200" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-amber-900 dark:text-white">{reviewCount}</p>
                </div>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-100">Healthy</p>
                    <CheckCircle2 className="h-4 w-4 text-emerald-700 dark:text-emerald-200" />
                  </div>
                  <p className="mt-3 text-3xl font-semibold text-emerald-900 dark:text-white">{healthyCount}</p>
                </div>
              </div>
            </div>

            {priorityActions[0] && (
              <Card className="border-emerald-200 bg-emerald-50/80 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/30">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-emerald-700">Best next action</p>
                      <h3 className="mt-1 text-lg font-semibold text-slate-900">{priorityActions[0].title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{priorityActions[0].recommendation}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-200 bg-white/80 px-4 py-3 text-sm">
                      <p className="font-semibold text-emerald-700">Expected impact</p>
                      <p className="mt-1 text-lg font-semibold text-slate-900">
                        {formatAmount(priorityActions[0].savings)}/mo
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-600" />
                    Recommended actions
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Clear next steps grounded in what you’re actually using right now.
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshingHealthScores}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Usage this month</p>
                    <p className="mt-1 text-lg font-semibold">{usageSnapshot.usageCount}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Active subscriptions</p>
                    <p className="mt-1 text-lg font-semibold">{usageSnapshot.activeSubscriptions}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Used recently</p>
                    <p className="mt-1 text-lg font-semibold">{usageSnapshot.recentlyUsed}</p>
                  </div>
                </div>

                {!priorityActions || priorityActions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>All subscriptions are optimized!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {priorityActions.map((action, idx) => (
                      <Card
                        key={action.subscriptionId}
                        className={`border-l-4 shadow-sm ${
                          action.priority === "critical"
                            ? "border-l-red-600 bg-red-50/20"
                            : action.priority === "high"
                              ? "border-l-orange-600 bg-orange-50/20"
                              : action.priority === "medium"
                                ? "border-l-yellow-600 bg-yellow-50/20"
                                : "border-l-blue-600 bg-blue-50/20"
                        }`}
                      >
                        <CardContent className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className="font-bold text-lg">{action.title}</h3>
                                  {idx === 0 && action.priority === "critical" && (
                                    <Badge className="bg-red-100 text-red-800 text-xs animate-pulse">🔥 TOP PRIORITY</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground font-medium">{action.action}</p>
                              </div>
                              <Badge
                                className={`text-xs font-semibold whitespace-nowrap h-fit ${
                                  action.priority === "critical"
                                    ? "bg-red-100 text-red-800"
                                    : action.priority === "high"
                                      ? "bg-orange-100 text-orange-800"
                                      : action.priority === "medium"
                                        ? "bg-yellow-100 text-yellow-800"
                                        : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                {action.priority.toUpperCase()}
                              </Badge>
                            </div>

                            <div className="bg-white/70 rounded p-3 border border-current/10">
                              <p className="text-sm leading-relaxed font-medium text-foreground">
                                💡 {action.recommendation}
                              </p>
                            </div>

                            {action.reasoning.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-muted-foreground">Why this recommendation:</p>
                                <ul className="text-xs text-muted-foreground space-y-1">
                                  {action.reasoning.map((reason, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-current/40 mt-0.5">•</span>
                                      <span>{reason}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-current/5">
                              {action.savings > 0 && (
                                <div className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                                  <DollarSign className="h-4 w-4" />
                                  Save {formatAmount(action.savings)}/mo
                                </div>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {action.usageCount} uses this month
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {action.lastUsedLabel}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {formatAmount(action.costPerUse)}/use
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {action.confidence}% confident
                              </Badge>
                              {action.dataQuality < 70 && (
                                <Badge variant="outline" className="text-xs bg-yellow-50">
                                  ⚠️ Limited data
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Subscription Health Scores
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Overall health status based on usage, recency, and value efficiency
                </p>
              </CardHeader>
              <CardContent>
                {healthScores.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No subscriptions to analyze</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {healthScores.map((score) => (
                      <div key={score.subscriptionId} className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-medium truncate">{score.name}</h4>
                              <span className={`text-sm font-bold ${getCategoryColor(score.category)}`}>
                                {score.score}
                              </span>
                            </div>
                            <Progress value={score.score} className="h-2" />
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              <span>Usage: {score.usageFrequency}/100</span>
                              <span>Recency: {score.recency}/100</span>
                              <span>Value: {score.costEfficiency}/100</span>
                            </div>
                          </div>
                          <Badge
                            className={`text-xs font-semibold ${getCategoryBgColor(score.category)} ${getCategoryColor(score.category)}`}
                            variant="outline"
                          >
                            {score.category.charAt(0).toUpperCase() + score.category.slice(1)}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {score.category === "critical"
                            ? "Needs immediate attention"
                            : score.category === "review"
                              ? "Worth reviewing soon"
                              : "Healthy and stable"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Waste Detection
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Specific opportunities to cut spend or simplify subscriptions
                </p>
              </CardHeader>
              <CardContent>
                {wasteItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No waste detected!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {wasteItems.map((item) => (
                      <div key={item.subscriptionId} className="rounded-lg border border-red-100 bg-red-50/30 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <h4 className="font-medium">{item.name}</h4>
                              {item.savingsPotential > 0 && (
                                <Badge className="bg-green-100 text-green-800">
                                  Save {formatAmount(item.savingsPotential)}/mo
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {item.issues.map((issue) => (
                                <Badge key={issue} variant="secondary" className="text-xs">
                                  {getWasteIcon(issue)} {getIssueLabel(issue)}
                                </Badge>
                              ))}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p>
                                <Clock className="h-3 w-3 inline mr-1" />
                                {item.lastUsed
                                  ? `Last used: ${new Date(item.lastUsed).toLocaleDateString()}`
                                  : "No usage data"}
                              </p>
                              <p>
                                <Activity className="h-3 w-3 inline mr-1" />
                                {item.sessionsPerMonth} sessions/month
                              </p>
                              <p>
                                <DollarSign className="h-3 w-3 inline mr-1" />
                                {formatAmount(item.costPerUse)}/use
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-red-100 pt-3 text-xs text-muted-foreground">
                          <Badge variant="outline" className="bg-white">
                            Suggested move: {getWasteActionLabel(item)}
                          </Badge>
                          <span>Why flagged: {item.issues.join(", ")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Monthly AI Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">
                    Spending Overview
                  </p>
                  <p className="text-lg font-bold">
                    {formatAmount(currentMonthSpending)}
                  </p>
                  <p className="text-xs text-muted-foreground">on subscriptions this month</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-1">
                    Savings Potential
                  </p>
                  <p className="text-lg font-bold text-green-600">
                    {formatAmount(monthlySavingsPotential)}
                  </p>
                  <p className="text-xs text-muted-foreground">could potentially save</p>
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">
                    Critical Issues
                  </p>
                  {criticalCount > 0 ? (
                    <ul className="text-sm space-y-1">
                      {healthScores
                        .filter((h) => h.category === "critical")
                        .slice(0, 3)
                        .map((h) => (
                          <li key={h.subscriptionId} className="flex items-center gap-2">
                            <AlertCircle className="h-3 w-3 text-red-600" />
                            {h.name}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">No critical issues</p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-muted-foreground mb-2">
                    Best Value Subscriptions
                  </p>
                  <div className="space-y-1">
                    {healthScores
                      .filter((h) => h.category === "excellent")
                      .slice(0, 3)
                      .map((h) => (
                        <div key={h.subscriptionId} className="text-sm flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-green-600" />
                          <span>{h.name}</span>
                          <span className="text-xs text-muted-foreground">({h.score}/100)</span>
                        </div>
                      ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
