import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo } from "react";
import { MetricsCards } from "@/components/metrics-cards";
import { SpendingChart } from "@/components/spending-chart";
import { CostPerUse } from "@/components/cost-per-use";
import { BehavioralInsights } from "@/components/behavioral-insights";
import { AIRecommendations } from "@/components/ai-recommendations";
import { SavingsProjection } from "@/components/savings-projection";
import { SubscriptionCard } from "@/components/subscription-card";
import { PremiumGate } from "@/components/premium-gate";
import { FamilyMembershipBanner } from "@/components/family-membership-banner";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/lib/subscription-context";
import { dedupeByKey, calculateMonthlyCost } from "@/lib/utils";
import { useCurrency } from "@/lib/currency-context";
import { computeCostPerUseFromSubs } from "@/lib/cost-analysis";
import type {
  DashboardMetrics,
  MonthlySpending,
  SpendingByCategory,
  CostPerUseAnalysis,
  OpportunityCost,
  AIRecommendation,
  Subscription,
  SubscriptionStatus,
} from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const { limits } = useSubscription();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();
  const { convertAmount } = useCurrency();

  // Personal metrics (always load)
  const { data: personalMetrics, isLoading: personalMetricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/metrics"],
  });

  // Family data (load if in family group)
  const { data: familyData, isLoading: familyDataLoading } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "family-data"],
    enabled: !!familyGroupId,
  });

  // Calculate metrics reactively based on family mode
  const metrics = useMemo(() => {
    if (showFamilyData && familyData?.subscriptions) {
      const subs = familyData.subscriptions as Subscription[];
      const totalMonthlySpend = subs
        .filter(s => s.status !== 'deleted')
        .reduce((sum: number, s: Subscription) => {
          return sum + calculateMonthlyCost((s as any).amount, (s as any).frequency);
        }, 0);

      const activeSubscriptions = subs.filter((s) => s.status === "active" || s.status === "unused").length;
      const unusedSubscriptions = subs.filter((s) => s.status === "unused").length;
      const potentialSavings = subs
        .filter((s) => s.status === "unused" || s.status === "to-cancel")
        .reduce((sum: number, s) => sum + calculateMonthlyCost((s as any).amount, (s as any).frequency), 0);

      // Calculate this month's savings: subscriptions deleted in current month
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const isDeletedThisMonth = (s: Subscription) => {
        if (s.status !== "deleted") return false;
        const ts = (s as any).deletedAt || (s as any).deleted_at || (s as any).updatedAt || (s as any).updated_at;
        if (ts) {
          const d = new Date(ts);
          return d >= currentMonth && d < nextMonth;
        }
        return true; // fallback
      };

      const thisMonthSavings = subs
        .filter(isDeletedThisMonth)
        .reduce((sum: number, s) => {
          const monthlyCost = calculateMonthlyCost((s as any).amount, (s as any).frequency);
          return sum + convertAmount(monthlyCost, (s as any).currency || 'USD', 'USD');
        }, 0);

      const calculatedMetrics = {
        totalMonthlySpend,
        activeSubscriptions,
        potentialSavings,
        thisMonthSavings,
        unusedSubscriptions,
        averageCostPerUse: 0,
        monthlySpendChange: 0,
        newServicesTracked: 0
      };
      return calculatedMetrics;
    } else {
      return personalMetrics;
    }
  }, [showFamilyData, familyData?.subscriptions, personalMetrics]);

  // Metrics loading flag (value computed below after subscriptions are known)
  const metricsLoading = showFamilyData ? familyDataLoading : personalMetricsLoading;

  // Personal subscriptions (always load)
  const { data: personalSubscriptions, isLoading: personalSubsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const rawSubscriptions = showFamilyData ? (familyData?.subscriptions || []) : personalSubscriptions || [];
  // dedupe by id to avoid duplicate keys when family aggregation returns duplicates
  const subscriptions = (function () {
    const map = new Map<string, Subscription>();
    for (const s of rawSubscriptions || []) {
      if (!s || !s.id) continue;
      if (!map.has(s.id)) map.set(s.id, s);
    }
    return Array.from(map.values());
  })();
  const subsLoading = showFamilyData ? familyDataLoading : personalSubsLoading;

  // Personal spending (always load)
  const { data: personalMonthlySpending, isLoading: personalMonthlyLoading } = useQuery<MonthlySpending[]>({
    queryKey: ["/api/spending/monthly"],
  });

  const monthlySpending = showFamilyData ? (familyData?.spending || []) : personalMonthlySpending;
  const monthlyLoading = showFamilyData ? familyDataLoading : personalMonthlyLoading;

  // Compute monthly spending from subscriptions for family mode
  function computeMonthlySpendingFromFamilySubscriptions() {
    if (!familyData?.subscriptions || familyData.subscriptions.length === 0) return [];
    
    const now = new Date();
    const months: { [key: string]: number } = {};
    
    // Create labels for last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      months[label] = 0;
    }
    
    // Add subscription costs to appropriate months
    for (const sub of familyData.subscriptions) {
      if (!sub || sub.status === 'deleted' || sub.status === 'canceled') continue;
      const monthlyCost = calculateMonthlyCost(sub.amount || 0, sub.frequency || 'monthly');
      
      // Only add subscription cost from creation month forward
      const createdDate = sub.createdAt ? new Date(sub.createdAt) : now;
      const createdMonthLabel = createdDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      
      // Find if created month exists in our 12-month range
      let foundStart = false;
      for (const label of Object.keys(months)) {
        if (label === createdMonthLabel) foundStart = true;
        if (foundStart) {
          months[label] += monthlyCost;
        }
      }
      
      // If subscription was created before our 12-month window, add to all months
      if (!foundStart) {
        for (const label of Object.keys(months)) {
          months[label] += monthlyCost;
        }
      }
    }
    
    return Object.entries(months).map(([month, amount]) => ({ 
      month, 
      amount: Math.round(amount * 100) / 100 
    }));
  }

  // Use server data if available, otherwise compute from subscriptions for family mode
  const effectiveMonthlySpending = showFamilyData 
    ? (familyData?.spending && familyData.spending.length > 0 ? familyData.spending : computeMonthlySpendingFromFamilySubscriptions())
    : (personalMonthlySpending || []);

  // Normalize monthly spending into a fixed-length recent months series (defaults to 6 months)
  // Shows the last 6 COMPLETE months (not including current month) so historical data stays fixed
  function normalizeMonthlySeries(data: MonthlySpending[] | undefined, months = 6) {
    if (!data || data.length === 0) {
      return [];
    }

    // Sort data by date (assuming month format is "MMM YYYY")
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.month + " 1");
      const dateB = new Date(b.month + " 1");
      return dateA.getTime() - dateB.getTime();
    });

    // Get the most recent months, excluding current month
    const now = new Date();
    const currentMonthKey = now.toLocaleString("en-US", { month: "short", year: "numeric" });

    // Filter out current month and get the last 'months' entries
    const historicalData = sortedData.filter(item => item.month !== currentMonthKey);
    return historicalData.slice(-months);
  }

  const chartMonthlyData = normalizeMonthlySeries(effectiveMonthlySpending, 6);

  // Personal category spending (always load)
  const { data: personalCategorySpending, isLoading: personalCategoryLoading } = useQuery<SpendingByCategory[]>({
    queryKey: ["/api/spending/category"],
  });

  const categorySpending = personalCategorySpending;
  const categoryLoading = personalCategoryLoading;

  // Personal cost analysis (always load)
  const { data: personalCostAnalysis, isLoading: personalAnalysisLoading } = useQuery<CostPerUseAnalysis[]>({
    queryKey: ["/api/analysis/cost-per-use"],
  });

  // Family cost analysis (load if in family mode)
  const { data: familyCostAnalysis, isLoading: familyAnalysisLoading } = useQuery<CostPerUseAnalysis[]>({
    queryKey: [`/api/analysis/cost-per-use?familyGroupId=${familyGroupId}`],
    enabled: showFamilyData && !!familyGroupId,
  });

  const analysisLoading = showFamilyData ? familyAnalysisLoading : personalAnalysisLoading;

  // If family mode and server didn't return analyses, compute a simple fallback from family subscriptions
  const computedFamilyCostAnalysis = showFamilyData ? computeCostPerUseFromSubs(familyData?.subscriptions || []) : [];

  // Build per-member analyses (label subscriptions with member name) and merge into the effective analyses
  function buildPerMemberAnalyses() {
    if (!showFamilyData || !familyData?.members || familyData.members.length === 0) return [];
    const subs = familyData?.subscriptions || [];
    const perMember: any[] = [];
    for (const m of familyData.members) {
      const memberName = m.displayName || m.email || m.userId || 'Member';
      const memberSubs = subs.filter((s: any) => s && (s.user_id === m.userId || s.userId === m.userId || s.owner_id === m.userId));
      const analyses = computeCostPerUseFromSubs(memberSubs || []).map((a: any) => ({ ...a, name: `${memberName} — ${a.name}` }));
      perMember.push(...analyses);
    }
    return perMember;
  }

  const perMemberAnalyses = buildPerMemberAnalyses();

  const baseAnalysis = showFamilyData ? (familyCostAnalysis && familyCostAnalysis.length ? familyCostAnalysis : computedFamilyCostAnalysis) : personalCostAnalysis;
  // Prefer per-member labeled entries when deduping, so put them first
  const mergedAnalyses = showFamilyData ? dedupeByKey([...perMemberAnalyses, ...(baseAnalysis || [])], 'subscriptionId') : baseAnalysis;
  const effectiveCostAnalysis = mergedAnalyses;

  // Compute family-derived metrics after subscriptions are available
  function calculateMonthlyCost(amount: number | null | undefined, frequency: string | null | undefined) {
    if (!amount || isNaN(Number(amount))) return 0;
    switch (frequency) {
      case "monthly":
        return Number(amount);
      case "yearly":
        return Number(amount) / 12;
      case "weekly":
        return (Number(amount) * 52) / 12;
      case "daily":
        return (Number(amount) * 365) / 12;
      default:
        return Number(amount);
    }
  }

  // Personal behavioral insights (always load)
  const { data: personalBehavioralInsights, isLoading: personalInsightsLoading } = useQuery<OpportunityCost[]>({
    queryKey: ["/api/insights/behavioral"],
  });

  // Family behavioral insights (load if in family mode)
  const { data: familyBehavioralInsights, isLoading: familyInsightsLoading } = useQuery<OpportunityCost[]>({
    queryKey: ["/api/insights/behavioral", "family", familyGroupId],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/insights/behavioral?family=true");
      return res.json();
    },
    enabled: showFamilyData && !!familyGroupId,
  });

  const insightsLoading = showFamilyData ? familyInsightsLoading : personalInsightsLoading;
  function computeBehavioralFromSubs(subs: any[] | undefined) {
    if (!subs || subs.length === 0) return [];
    return subs
      .filter(s => s && (s.status === 'unused' || s.status === 'to-cancel'))
      .map(sub => {
        const monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'quarterly' ? sub.amount / 3 : sub.frequency === 'weekly' ? sub.amount * 4 : sub.amount;
        const items = [
          { item: 'coffee drinks', unitCost: 5, icon: 'coffee' },
          { item: 'movie tickets', unitCost: 15, icon: 'film' },
          { item: 'lunch meals', unitCost: 12, icon: 'utensils' }
        ];
        const equivalents = items
          .map(e => ({
            item: e.item,
            count: Math.floor(monthlyAmount / e.unitCost),
            icon: e.icon,
            totalCost: Math.floor(monthlyAmount / e.unitCost) * e.unitCost
          }))
          .filter(e => e.count >= 1)
          .sort((a, b) => b.count - a.count)
          .slice(0, 1);

        return {
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          monthlyAmount: Math.round(monthlyAmount * 100) / 100,
          equivalents,
        };
      });
  }

  const computedFamilyBehavioral = showFamilyData ? computeBehavioralFromSubs(familyData?.subscriptions || []) : [];
  const baseInsights = showFamilyData ? (familyBehavioralInsights && familyBehavioralInsights.length ? familyBehavioralInsights : computedFamilyBehavioral) : personalBehavioralInsights;
  const behavioralInsights = baseInsights;

  // Personal recommendations (always load)
  const { data: personalRecommendations, isLoading: personalRecsLoading, refetch: refetchRecs } = useQuery<AIRecommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  function computeRecommendationsFromSubs(subs: any[] | undefined) {
    if (!subs || subs.length === 0) return [];
    const recommendations: any[] = [];
    const allSubs = subs.filter(s => s && s.status !== 'deleted');

    const adobeSub = allSubs.find(s => s.name && s.name.toLowerCase().includes('adobe'));
    if (adobeSub) {
      recommendations.push({
        id: (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `rec-${Date.now()}`,
        type: 'alternative',
        title: 'Switch from Adobe to Affinity',
        description: 'Affinity offers similar professional design tools with a one-time purchase instead of monthly fees.',
        currentCost: adobeSub.amount,
        suggestedCost: 0,
        savings: adobeSub.amount || 0,
        subscriptionId: adobeSub.id,
        confidence: 0.85,
        currency: adobeSub.currency || 'USD',
      });
    }

    const unusedSubs = allSubs.filter(s => s.status === 'unused');
    for (const sub of unusedSubs) {
      recommendations.push({
        id: (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `rec-${Date.now()}-${Math.random()}`,
        type: 'cancel',
        title: `Cancel ${sub.name}`,
        description: `You've barely used ${sub.name} this month. Consider cancelling to save money.`,
        currentCost: sub.amount,
        suggestedCost: 0,
        savings: sub.amount || 0,
        subscriptionId: sub.id,
        confidence: 0.92,
        currency: sub.currency || 'USD',
      });
    }

    const toCancelSubs = allSubs.filter(s => s.status === 'to-cancel');
    for (const sub of toCancelSubs) {
      recommendations.push({
        id: (typeof crypto !== 'undefined' && (crypto as any).randomUUID) ? (crypto as any).randomUUID() : `rec-${Date.now()}-${Math.random()}`,
        type: 'cancel',
        title: `Complete cancellation of ${sub.name}`,
        description: `${sub.name} is marked for cancellation. Finalize the cancellation to stop future charges.`,
        currentCost: sub.amount,
        suggestedCost: 0,
        savings: sub.amount || 0,
        subscriptionId: sub.id,
        confidence: 0.95,
        currency: sub.currency || 'USD',
      });
    }

    return recommendations;
  }

  const recommendationsRaw = showFamilyData
    ? (familyData?.recommendations && familyData.recommendations.length
        ? familyData.recommendations
        : computeRecommendationsFromSubs([...(familyData?.subscriptions || []), ...(familyData?.sharedSubscriptions?.map((s:any)=>(s.subscription || s)) || [])])
      )
    : personalRecommendations;
  const recommendations = dedupeByKey(recommendationsRaw, "subscriptionId");
  const recsLoading = showFamilyData ? familyDataLoading : personalRecsLoading;

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SubscriptionStatus }) => {
      const res = await apiRequest("PATCH", `/api/subscriptions/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.refetchQueries({ queryKey: ["/api/metrics"] });
      queryClient.refetchQueries({ queryKey: ["/api/insights"] });
      queryClient.refetchQueries({ queryKey: ["/api/insights/behavioral"] });
      queryClient.refetchQueries({ queryKey: ["/api/analysis/cost-per-use"] });
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/monthly-savings"], exact: false });
      queryClient.refetchQueries({ queryKey: ["/api/spending/monthly"] });
      queryClient.refetchQueries({ queryKey: ["/api/spending/category"] });
      queryClient.refetchQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Status updated",
        description: "Subscription status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update subscription status.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/subscriptions/${id}`);
      // 204 No Content has no body, so don't try to parse JSON
      if (res.status === 204) {
        return { success: true };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/subscriptions"] });
      queryClient.refetchQueries({ queryKey: ["/api/metrics"] });
      queryClient.refetchQueries({ queryKey: ["/api/insights"] });
      queryClient.refetchQueries({ queryKey: ["/api/insights/behavioral"] });
      toast({
        title: "Subscription deleted",
        description: "The subscription has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete subscription.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (id: string, status: SubscriptionStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleRefreshRecommendations = () => {
    refetchRecs();
  };

  const activeSubscriptions = subscriptions?.filter((s: Subscription) => s.status === "active") || [];
  const unusedCount = subscriptions?.filter((s: Subscription) => s.status === "unused").length || 0;
  const toCancelCount = subscriptions?.filter((s: Subscription) => s.status === "to-cancel").length || 0;

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-muted/5">
      <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
        <div className="mb-4 animate-slide-in-right">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-2">Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Real-time insights into your subscription spending
          </p>
        </div>

        <FamilyMembershipBanner />

        <MetricsCards metrics={metrics} isLoading={metricsLoading} />

        <div className="grid gap-6 lg:grid-cols-2">
          <SpendingChart
            monthlyData={chartMonthlyData}
            categoryData={categorySpending}
            isLoading={monthlyLoading || categoryLoading}
          />
          {limits.hasSavingsProjections ? (
            <>
              {console.log('[Dashboard] Rendering SavingsProjection with:', {
                potentialSavings: metrics?.potentialSavings || 0,
                currentSavings: metrics?.thisMonthSavings || 0,
                unusedCount,
                toCancelCount,
                isLoading: metricsLoading,
                showFamilyData,
                metrics
              })}
              <SavingsProjection
                potentialSavings={metrics?.potentialSavings || 0}
                currentSavings={metrics?.thisMonthSavings || 0}
                unusedCount={unusedCount}
                toCancelCount={toCancelCount}
                isLoading={metricsLoading}
              />
            </>
          ) : (
            <PremiumGate feature="Savings Projections" showBlurred={false} />
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {limits.hasCostPerUse ? (
            <CostPerUse analyses={effectiveCostAnalysis} isLoading={analysisLoading} />
          ) : (
            <PremiumGate feature="Cost-per-use analytics" showBlurred={false} />
          )}
          {limits.hasBehavioralInsights ? (
            <BehavioralInsights insights={behavioralInsights} isLoading={insightsLoading} />
          ) : (
            <PremiumGate feature="Behavioral insights" showBlurred={false} />
          )}
        </div>

        {limits.hasAIRecommendations ? (
          <AIRecommendations
            recommendations={recommendations}
            isLoading={recsLoading}
            onRefresh={handleRefreshRecommendations}
            isRefreshing={recsLoading}
          />
        ) : (
          <PremiumGate feature="AI-powered recommendations" showBlurred={false} />
        )}

        <div className="mt-12">
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight">Active Subscriptions</h2>
            <p className="text-muted-foreground mt-1">Manage and monitor your subscriptions</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {subsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 rounded-lg bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
              ))
            ) : activeSubscriptions.length > 0 ? (
              activeSubscriptions.slice(0, 6).map((sub: Subscription) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-16 px-6">
                <div className="bg-card/50 border border-border/50 rounded-lg p-12">
                  <p className="text-lg text-muted-foreground font-medium mb-2">No active subscriptions found</p>
                  <p className="text-sm text-muted-foreground">Install our browser extension and manually add your subscriptions to start tracking usage</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
