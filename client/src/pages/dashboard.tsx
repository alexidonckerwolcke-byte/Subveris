import { useQuery, useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import { useAuth } from "@/lib/auth-context";
import { dedupeByKey, calculateMonthlyCost, generateOpportunityCosts, isSubscriptionBilledInMonth, isSubscriptionDeleted } from "@/lib/utils";
import { getVisibleFamilySubscriptions } from "@/lib/family-data";
import { generateRecommendationsFromSubscriptions } from "@/lib/recommendations";
import { useCurrency, type Currency } from "@/lib/currency-context";
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
  const { limits, tier } = useSubscription();
  const { user } = useAuth();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();
  const { convertAmount, currency: displayCurrency } = useCurrency();

  // Personal metrics (always load)
  const { data: personalMetrics, isLoading: personalMetricsLoading } = useQuery({
    queryKey: ["/api/metrics"],
    refetchInterval: 30000, // Refetch every 30 seconds to stay fresh
    select: (data: any) => ({
      totalMonthlySpend: data.totalMonthlySpend || 0,
      activeSubscriptions: data.activeSubscriptions || 0,
      potentialSavings: data.potentialSavings || 0,
      thisMonthSavings: data.thisMonthSavings || 0,
      unusedSubscriptions: data.inactiveSubscriptions || 0,
      averageCostPerUse: data.averageCostPerUse || 0,
      monthlySpendChange: data.monthlySpendChange,
      newServicesTracked: data.newServicesTracked,
    }),
  });

  // Family data (load if in family group)
  const { data: familyData, isLoading: familyDataLoading, isFetching: familyDataFetching, refetch: refetchFamilyData } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "family-data"],
    enabled: !!familyGroupId,
    refetchInterval: 30000, // Refetch every 30 seconds to see member deletions
  });

  const familySubscriptions = useMemo<Subscription[]>(() => {
    return getVisibleFamilySubscriptions(familyData, user?.id);
  }, [familyData, user?.id]);

  const familySavingsComputed = useMemo(() => {
    if (!familySubscriptions || familySubscriptions.length === 0) {
      return {
        potentialSavings: 0,
        thisMonthSavings: 0,
        unusedSubscriptions: 0,
      };
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const isDeletedThisMonth = (sub: Subscription) => {
      if (!sub || !isSubscriptionDeleted(sub)) return false;
      const deletedAt = (sub as any).deletedAt || (sub as any).deleted_at || (sub as any).updatedAt || (sub as any).updated_at;
      if (!deletedAt) return true;
      const deletedDate = new Date(deletedAt);
      return deletedDate >= currentMonthStart && deletedDate <= currentMonthEnd;
    };

    const potentialSavings = familySubscriptions
      .filter((sub) => sub && (sub.status === 'unused' || sub.status === 'to-cancel'))
      .reduce((sum, sub) => {
        const monthlyCost = calculateMonthlyCost(Number(sub.amount) || 0, sub.frequency || 'monthly');
        return sum + convertAmount(monthlyCost, (sub.currency as Currency) || 'USD', 'USD');
      }, 0);

    const thisMonthSavings = familySubscriptions
      .filter(isDeletedThisMonth)
      .reduce((sum, sub) => {
        const monthlyCost = calculateMonthlyCost(Number(sub.amount) || 0, sub.frequency || 'monthly');
        return sum + convertAmount(monthlyCost, (sub.currency as Currency) || 'USD', 'USD');
      }, 0);

    const unusedSubscriptions = familySubscriptions.filter((sub) => sub?.status === 'unused').length;

    return {
      potentialSavings: Math.round(potentialSavings * 100) / 100,
      thisMonthSavings: Math.round(thisMonthSavings * 100) / 100,
      unusedSubscriptions,
    };
  }, [familySubscriptions, convertAmount]);

  function getCurrentMonthAmount(monthlyData: MonthlySpending[] | undefined) {
    if (!monthlyData || monthlyData.length === 0) return 0;
    const now = new Date();
    const currentMonthLabel = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const exactMatch = monthlyData.find((entry) => entry.month === currentMonthLabel);
    if (exactMatch) return exactMatch.amount;
    return 0;
  }

  // Calculate metrics reactively based on family mode
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Use server-provided spending series for both owners and members
    const familyMonthlyDataForDashboard = showFamilyData
      ? (familyData?.spending && familyData.spending.length > 0 ? familyData.spending : [])
      : [];

    const totalMonthlySpendFromSpendingData = getCurrentMonthAmount(familyMonthlyDataForDashboard);
    
    if (showFamilyData) {
      console.log('[Dashboard] Family mode - familyData:', familyData);
      console.log('[Dashboard] Family mode - familyMonthlyDataForDashboard:', familyMonthlyDataForDashboard);
      console.log('[Dashboard] Family mode - totalMonthlySpendFromSpendingData:', totalMonthlySpendFromSpendingData);
      console.log('[Dashboard] Family mode - familyData.metrics:', familyData?.metrics);
    }

    const defaultMetrics = {
      totalMonthlySpend: 0,
      activeSubscriptions: 0,
      potentialSavings: 0,
      thisMonthSavings: 0,
      unusedSubscriptions: 0,
      averageCostPerUse: 0,
      monthlySpendChange: 0,
      newServicesTracked: 0,
    };

    const serverMetrics = showFamilyData && familyData?.metrics && typeof familyData.metrics.totalMonthlySpending === 'number'
      ? {
          totalMonthlySpend: familyMonthlyDataForDashboard.length
            ? totalMonthlySpendFromSpendingData
            : Number(familyData.metrics.totalMonthlySpending) || 0,
          activeSubscriptions: familyData.metrics.activeSubscriptions || 0,
          potentialSavings: familySavingsComputed.potentialSavings || familyData.metrics.potentialSavings || 0,
          thisMonthSavings: familySavingsComputed.thisMonthSavings || familyData.metrics.thisMonthSavings || 0,
          unusedSubscriptions: familySavingsComputed.unusedSubscriptions || familyData.metrics.unusedSubscriptions || 0,
          averageCostPerUse: familyData.metrics.averageCostPerUse || 0,
          monthlySpendChange: familyData.metrics.monthlySpendChange || 0,
          newServicesTracked: familyData.metrics.newServicesTracked || 0,
        }
      : personalMetrics || defaultMetrics;

    // For members in family mode, trust the server metrics completely
    // The server has already calculated all metrics including the member's own subscriptions
    if (showFamilyData && familyData) {
      console.log('[Dashboard] Returning serverMetrics for family mode:', serverMetrics);
      return serverMetrics;
    }

    return serverMetrics;
  }, [
    showFamilyData,
    familyData,
    familySubscriptions,
    personalMetrics,
  ]);

  // Metrics loading flag (value computed below after subscriptions are known)
  const metricsLoading = showFamilyData ? familyDataLoading : personalMetricsLoading;

  // Personal subscriptions (always load)
  const { data: personalSubscriptions, isLoading: personalSubsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    refetchInterval: 30000, // Refetch every 30 seconds to stay fresh
  });

  const rawSubscriptions = showFamilyData ? familySubscriptions : personalSubscriptions || [];
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
    refetchInterval: 30000, // Refetch every 30 seconds to stay fresh
  });

  const monthlySpending = showFamilyData
    ? ((familyData?.spending && familyData.spending.length > 0)
        ? familyData.spending
        : computeMonthlySpendingFromFamilySubscriptions())
    : personalMonthlySpending;
  const monthlyLoading = showFamilyData ? familyDataLoading : personalMonthlyLoading;

  // Compute monthly spending from subscriptions for family mode
  function computeMonthlySpendingFromFamilySubscriptions() {
    if (!familyData?.subscriptions || familyData.subscriptions.length === 0) return [];
    
    const now = new Date();
    const currentDayOfMonth = now.getDate();
    const months: { [key: string]: number } = {};
    
    // Create labels for last 6 months + current month (7 total)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      months[label] = 0;
    }
    
    // Add subscription costs to months where they renew
    for (const sub of familySubscriptions) {
      if (!sub || isSubscriptionDeleted(sub) || sub.status === 'canceled') continue;
      if (sub.status !== 'active' && sub.status !== 'unused' && sub.status !== 'to-cancel') continue;
      
      const monthlyCost = calculateMonthlyCost(sub.amount || 0, sub.frequency || 'monthly');
      
      // Check each month to see if this subscription should be included
      for (const [monthLabel, _] of Object.entries(months)) {
        let includeInMonth = false;
        const monthDate = new Date(monthLabel + " 1");
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
        const isCurrentMonth = monthDate.getFullYear() === now.getFullYear() && monthDate.getMonth() === now.getMonth();
        
        // Get the renewal date for this subscription
        if (isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, isCurrentMonth)) {
          includeInMonth = true;
        }
        
        if (includeInMonth) {
          months[monthLabel] += convertAmount(monthlyCost, (sub.currency as Currency) || 'USD', 'USD');
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
    ? (function () {
        if (familyData?.spending && familyData.spending.length > 0) return familyData.spending;
        if (familyData?.metrics && typeof familyData.metrics.totalMonthlySpending === 'number') {
          const now = new Date();
          const label = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          return [{ month: label, amount: Math.round(Number(familyData.metrics.totalMonthlySpending) * 100) / 100 }];
        }
        return computeMonthlySpendingFromFamilySubscriptions();
      })()
    : (personalMonthlySpending || []);

  // Normalize monthly spending into a fixed-length recent months series.
  // `months` is the number of months before the current month, so `3` means current month + 3 prior months.
  function normalizeMonthlySeries(data: MonthlySpending[] | undefined, months = 6) {
    const now = new Date();
    const monthKeys: string[] = [];
    const monthMap = new Map<string, number>();

    for (let i = months; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      monthKeys.push(key);
      monthMap.set(key, 0);
    }

    if (data && data.length > 0) {
      for (const entry of data) {
        const amount = Number(entry.amount) || 0;
        if (monthMap.has(entry.month)) {
          monthMap.set(entry.month, monthMap.get(entry.month)! + amount);
        }
      }
    }

    return monthKeys.map((month) => ({
      month,
      amount: Math.round((monthMap.get(month) || 0) * 100) / 100,
    }));
  }

  const chartMonthlyData = normalizeMonthlySeries(effectiveMonthlySpending, 3);

  // Calculate monthlySpendChange and newServicesTracked dynamically
  const dynamicMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });

    // Calculate monthly spend change
    const spending = (effectiveMonthlySpending as MonthlySpending[]) || [];
    const currentMonthSpend = spending.find(m => m.month === currentMonth)?.amount || 0;
    const lastMonthSpend = spending.find(m => m.month === lastMonth)?.amount || 0;
    const spendChange = lastMonthSpend > 0 ? Math.round(((currentMonthSpend - lastMonthSpend) / lastMonthSpend) * 100) : 0;

    // Calculate newServicesTracked based on active subscriptions in current mode
    const activeCount = subscriptions.filter((s: Subscription) => s.status === 'active').length;

    return {
      monthlySpendChange: spendChange,
      newServicesTracked: activeCount,
    };
  }, [effectiveMonthlySpending, subscriptions]);

  // Apply dynamic metrics to override server values
  const finalMetrics = useMemo((): DashboardMetrics => {
    const base = metrics || {
      totalMonthlySpend: 0,
      activeSubscriptions: 0,
      potentialSavings: 0,
      thisMonthSavings: 0,
      unusedSubscriptions: 0,
      averageCostPerUse: 0,
      monthlySpendChange: 0,
      newServicesTracked: 0,
    };

    // Recalculate activeSubscriptions based on actual subscriptions to match current mode
    const activeSubsCount = subscriptions.filter((s: Subscription) => s.status === 'active').length;

    const now = new Date();
    const currentMonthLabel = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const currentChartTotal = chartMonthlyData.find((entry) => entry.month === currentMonthLabel)?.amount || 0;

    return {
      ...base,
      totalMonthlySpend: showFamilyData ? currentChartTotal : base.totalMonthlySpend,
      activeSubscriptions: activeSubsCount,
      monthlySpendChange: dynamicMetrics.monthlySpendChange,
      newServicesTracked: dynamicMetrics.newServicesTracked,
    };
  }, [metrics, dynamicMetrics, subscriptions, showFamilyData, chartMonthlyData]);

  // Personal category spending (always load)
  const { data: personalCategorySpending, isLoading: personalCategoryLoading } = useQuery<SpendingByCategory[]>({
    queryKey: ["/api/spending/category"],
    refetchInterval: 30000, // Refetch every 30 seconds to stay fresh
  });

  const categorySpending = personalCategorySpending;
  const categoryLoading = showFamilyData ? familyDataLoading : personalCategoryLoading;

  function computeSpendingByCategoryFromSubs(subs: any[] | undefined) {
    if (!subs || subs.length === 0) return [];
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const categoryMap = new Map<string, { amount: number; count: number }>();

    for (const sub of subs) {
      if (!sub) continue;
      if (isSubscriptionDeleted(sub)) continue;
      if (!isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true)) continue;

      const frequency = (sub.frequency || 'monthly').toString().toLowerCase();
      const amount = Number(sub.amount) || 0;
      const monthlyAmount = calculateMonthlyCost(amount, frequency);

      const existing = categoryMap.get(sub.category) || { amount: 0, count: 0 };
      categoryMap.set(sub.category, {
        amount: existing.amount + monthlyAmount,
        count: existing.count + 1,
      });
    }

    const totalAmount = Array.from(categoryMap.values()).reduce((sum, v) => sum + v.amount, 0);
    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: Math.round(data.amount * 100) / 100,
      percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
      count: data.count,
    }));
  }

  const categorySpendingComputed = showFamilyData
    ? ((familyData?.byCategory && familyData.byCategory.length)
        ? familyData.byCategory
        : computeSpendingByCategoryFromSubs(familySubscriptions))
    : personalCategorySpending;

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

  // If family mode and server didn't return analyses, compute a simple fallback from visible family subscriptions
  const computedFamilyCostAnalysis = showFamilyData ? computeCostPerUseFromSubs(familySubscriptions) : [];

  // Build per-member analyses (label subscriptions with member name) and merge into the effective analyses
  function buildPerMemberAnalyses() {
    if (!showFamilyData || !familyData?.members || familyData.members.length === 0) return [];
    const subs = familySubscriptions;
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

  const baseAnalysis = showFamilyData
    ? ((familyData?.isOwner && familyCostAnalysis && familyCostAnalysis.length)
        ? familyCostAnalysis
        : computedFamilyCostAnalysis)
    : personalCostAnalysis;
  // Prefer per-member labeled entries when deduping, so put them first
  const mergedAnalyses = showFamilyData ? dedupeByKey([...perMemberAnalyses, ...(baseAnalysis || [])], 'subscriptionId') : baseAnalysis;
  const effectiveCostAnalysis = mergedAnalyses;
  const displayCostAnalysis = !showFamilyData && tier === "free"
    ? (effectiveCostAnalysis?.slice(0, limits.maxCostPerUseSubscriptions) ?? [])
    : effectiveCostAnalysis;

  // Compute family-derived metrics after subscriptions are available

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
        const rawMonthlyAmount = calculateMonthlyCost(sub.amount || 0, sub.frequency || 'monthly');
        const monthlyAmount = Math.round(convertAmount(rawMonthlyAmount, (sub.currency || 'USD') as any, displayCurrency) * 100) / 100;
        const equivalents = generateOpportunityCosts(monthlyAmount, displayCurrency);

        return {
          subscriptionId: sub.id,
          subscriptionName: sub.name,
          monthlyAmount,
          currency: displayCurrency,
          equivalents,
        };
      });
  }

  const computedFamilyBehavioral = showFamilyData ? computeBehavioralFromSubs(familySubscriptions) : [];
  const baseInsights = showFamilyData
    ? ((familyBehavioralInsights && familyBehavioralInsights.length > (computedFamilyBehavioral.length || 0))
        ? familyBehavioralInsights
        : computedFamilyBehavioral)
    : personalBehavioralInsights;
  const behavioralInsights = baseInsights;

  // Personal recommendations (always load)
  const [refreshingRecommendations, setRefreshingRecommendations] = useState(false);
  const { data: personalRecommendations, isLoading: personalRecsLoading, isFetching: personalRecsFetching, refetch: refetchRecs } = useQuery<AIRecommendation[]>({
    queryKey: ["/api/recommendations"],
  });

  const recommendationsRaw: AIRecommendation[] = showFamilyData
    ? (familyData?.recommendations && familyData.recommendations.length
        ? (familyData.recommendations as AIRecommendation[])
        : generateRecommendationsFromSubscriptions(familySubscriptions)
      )
    : (personalRecommendations && personalRecommendations.length
        ? personalRecommendations
        : generateRecommendationsFromSubscriptions(personalSubscriptions || [])
      );
  const allRecommendations = dedupeByKey(recommendationsRaw, "subscriptionId");
  const recommendations = allRecommendations.slice(0, 3);
  const hasMoreRecommendations = allRecommendations.length > 3;
  const recsLoading = showFamilyData ? familyDataLoading : personalRecsLoading;
  const recsRefreshing = showFamilyData ? familyDataFetching : personalRecsFetching;

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

  const handleRefreshRecommendations = async () => {
    setRefreshingRecommendations(true);
    try {
      if (showFamilyData && familyGroupId) {
        queryClient.removeQueries({ queryKey: ["/api/family-groups", familyGroupId, "family-data"], exact: true });
        queryClient.removeQueries({ queryKey: ["/api/subscriptions"], exact: true });

        await queryClient.fetchQuery({
          queryKey: ["/api/family-groups", familyGroupId, "family-data"],
          queryFn: async () => {
            const res = await apiRequest("GET", `/api/family-groups/${familyGroupId}/family-data`);
            return res.json();
          },
          staleTime: 0,
        });

        await queryClient.fetchQuery({
          queryKey: ["/api/subscriptions"],
          queryFn: async () => {
            const res = await apiRequest("GET", "/api/subscriptions");
            return res.json();
          },
          staleTime: 0,
        });

        await refetchFamilyData?.();
      } else {
        queryClient.removeQueries({ queryKey: ["/api/recommendations"], exact: true });
        queryClient.removeQueries({ queryKey: ["/api/subscriptions"], exact: true });

        await queryClient.fetchQuery({
          queryKey: ["/api/recommendations"],
          queryFn: async () => {
            const res = await apiRequest("GET", "/api/recommendations");
            return res.json();
          },
          staleTime: 0,
        });

        await queryClient.fetchQuery({
          queryKey: ["/api/subscriptions"],
          queryFn: async () => {
            const res = await apiRequest("GET", "/api/subscriptions");
            return res.json();
          },
          staleTime: 0,
        });

        await refetchRecs?.();
      }
    } catch (error) {
      console.error("[Dashboard] Failed to refresh recommendations", error);
    } finally {
      setRefreshingRecommendations(false);
    }
  };

  const activeSubscriptions = subscriptions?.filter((s: Subscription) => s.status === "active") || [];
  const unusedCount = subscriptions?.filter((s: Subscription) => s.status === "unused").length || 0;
  const toCancelCount = subscriptions?.filter((s: Subscription) => s.status === "to-cancel").length || 0;
  const costPerUseSubscriptionCount = subscriptions?.filter((s: Subscription) => !isSubscriptionDeleted(s)).length || 0;

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-muted/5">
      <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
        <div className="mb-4 animate-slide-in-right">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent mb-2">Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Discover subscriptions you're paying for but barely use.
          </p>
        </div>

        <FamilyMembershipBanner />

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Spend snapshot</p>
            <p className="mt-3 text-2xl font-semibold">{subscriptions?.length || 0} services</p>
            <p className="mt-2 text-sm text-muted-foreground">Track what matters most in one place.</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Savings focus</p>
            <p className="mt-3 text-2xl font-semibold">{unusedCount + toCancelCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Unused or at-risk payments to review.</p>
          </div>
          <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Family mode</p>
            <p className="mt-3 text-2xl font-semibold">{showFamilyData ? "Enabled" : "Personal"}</p>
            <p className="mt-2 text-sm text-muted-foreground">View the right set of subscriptions for your account.</p>
          </div>
        </div>

        <MetricsCards metrics={finalMetrics} isLoading={metricsLoading} />

        <div className="grid gap-6 lg:grid-cols-2">
          <SpendingChart
            monthlyData={chartMonthlyData}
            categoryData={categorySpendingComputed}
            isLoading={monthlyLoading || categoryLoading}
            trendLabel="4-Month Trend"
          />
          {limits.hasSavingsProjections ? (
            <>
                  <SavingsProjection
                    potentialSavings={showFamilyData ? familySavingsComputed.potentialSavings : (metrics?.potentialSavings || 0)}
                    currentSavings={showFamilyData ? familySavingsComputed.thisMonthSavings : (metrics?.thisMonthSavings || 0)}
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
            <CostPerUse
              analyses={displayCostAnalysis}
              isLoading={analysisLoading}
              showUpgradePrompt={tier === "free"}
              totalSubscriptions={costPerUseSubscriptionCount}
              maxAllowed={limits.maxCostPerUseSubscriptions}
            />
          ) : (
            <PremiumGate feature="Cost-per-use analytics" showBlurred={false} />
          )}
          {limits.hasBehavioralInsights ? (
            <BehavioralInsights 
              insights={behavioralInsights} 
              isLoading={insightsLoading}
              familyMembers={familyData?.members}
              currentUserId={familyData?.currentUserId}
              showMemberLabels={showFamilyData}
            />
          ) : (
            <PremiumGate feature="Behavioral insights" showBlurred={false} />
          )}
        </div>

        {limits.hasAIRecommendations ? (
          <AIRecommendations
            recommendations={recommendations}
            isLoading={recsLoading}
            onRefresh={handleRefreshRecommendations}
            isRefreshing={refreshingRecommendations || recsRefreshing}
            maxRecommendations={3}
            showViewAll={hasMoreRecommendations}
            totalCount={allRecommendations.length}
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
