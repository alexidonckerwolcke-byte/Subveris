import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AIRecommendations } from "@/components/ai-recommendations";
import { BehavioralInsights } from "@/components/behavioral-insights";
import { CostPerUse } from "@/components/cost-per-use";
import { PremiumGate } from "@/components/premium-gate";
import { useSubscription } from "@/lib/subscription-context";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import {
  Lightbulb,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Target,
} from "lucide-react";
import type {
  AIRecommendation,
  OpportunityCost,
  CostPerUseAnalysis,
  Insight,
} from "@shared/schema";
import { useAuth } from "@/lib/auth-context";
import { useCurrency } from "@/lib/currency-context";
import { dedupeByKey, calculateMonthlyCost, generateOpportunityCosts } from "@/lib/utils";
import { generateRecommendationsFromSubscriptions } from "@/lib/recommendations";
import { getVisibleFamilySubscriptions } from "@/lib/family-data";
import { computeCostPerUseFromSubs } from "@/lib/cost-analysis";

export default function Insights() {
  const { formatAmount, convertAmount, currency: displayCurrency } = useCurrency();
  const { limits, tier } = useSubscription();
  const { user } = useAuth();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();

  const [refreshingRecommendations, setRefreshingRecommendations] = useState(false);
  const { data: personalRecommendations, isLoading: personalRecsLoading, isFetching: personalRecsFetching, refetch: refetchRecs } = useQuery<AIRecommendation[]>({
    queryKey: ["/api/recommendations"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Personal subscriptions (fallback source for recommendations)
  const { data: personalSubscriptions } = useQuery<any[]>({
    queryKey: ["/api/subscriptions"],
  });

  // Family recommendations
  const { data: familyData, isLoading: familyDataLoading, isFetching: familyDataFetching, refetch: refetchFamilyData } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "family-data"],
    enabled: !!familyGroupId,
  });

  const familySubscriptions = useMemo(() => getVisibleFamilySubscriptions(familyData, user?.id), [familyData, user?.id]);

  const recommendationsRaw = showFamilyData
    ? (familyData?.recommendations && familyData.recommendations.length
        ? familyData.recommendations
        : generateRecommendationsFromSubscriptions(familySubscriptions)
      )
    : (personalRecommendations && personalRecommendations.length
        ? personalRecommendations
        : generateRecommendationsFromSubscriptions(personalSubscriptions || [])
      );
  const personalSubscriptionCount = (personalSubscriptions || []).filter((s) => s && s.status !== 'deleted').length;
  const recommendations: AIRecommendation[] = dedupeByKey(recommendationsRaw, "subscriptionId") as AIRecommendation[];
  const recsLoading = showFamilyData ? familyDataLoading : personalRecsLoading;
  const recsRefreshing = showFamilyData ? familyDataFetching : personalRecsFetching;

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
      console.error("[Insights] Failed to refresh recommendations", error);
    } finally {
      setRefreshingRecommendations(false);
    }
  };

  // Personal behavioral insights
  const { data: personalMetrics, isLoading: personalMetricsLoading } = useQuery<any>({
    queryKey: ["/api/metrics"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const { data: personalBehavioralInsights, isLoading: personalBehavioralLoading, refetch: refetchBehavioral } = useQuery<OpportunityCost[]>({
    queryKey: ["/api/insights/behavioral"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Family behavioral insights
  const { data: familyBehavioralInsights, isLoading: familyBehavioralLoading } = useQuery<OpportunityCost[]>({
    queryKey: ["/api/insights/behavioral", "family", familyGroupId],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/insights/behavioral?family=true");
      return res.json();
    },
    enabled: showFamilyData && !!familyGroupId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  function computeBehavioralFromSubs(subs: any[] | undefined) {
    if (!subs || subs.length === 0) return [];
    // Strictly filter only unused and to-cancel, never active
    return subs
      .filter(s => s && (
        (s.status === 'unused' || s.status === 'to-cancel') ||
        (s.subStatus === 'unused' || s.subStatus === 'to-cancel')
      ))
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

  const computedFamilyBehavioral = showFamilyData ? computeBehavioralFromSubs(familyData?.subscriptions || []) : [];
  const behavioralInsights = showFamilyData
    ? ((familyBehavioralInsights && familyBehavioralInsights.length > (computedFamilyBehavioral.length || 0))
        ? familyBehavioralInsights
        : computedFamilyBehavioral)
    : (
        (personalBehavioralInsights || []).filter((i: any) =>
          i && (
            (i.subStatus === 'unused' || i.subStatus === 'to-cancel') ||
            (i.status === 'unused' || i.status === 'to-cancel')
          )
        ).length > 0
          ? (personalBehavioralInsights || []).filter((i: any) =>
              i && (
                (i.subStatus === 'unused' || i.subStatus === 'to-cancel') ||
                (i.status === 'unused' || i.status === 'to-cancel')
              )
            )
          : computeBehavioralFromSubs(personalSubscriptions || [])
      );
  const behavioralLoading = showFamilyData ? familyBehavioralLoading : personalBehavioralLoading;

  // Personal cost analysis
  const { data: personalCostAnalysis, isLoading: personalAnalysisLoading } = useQuery<CostPerUseAnalysis[]>({
    queryKey: ["/api/analysis/cost-per-use"],
    // react-query typings expect boolean or 'always'; 'stale' was accepted
    // at runtime but now yields a compile error so we switch to the
    // equivalent boolean behaviour (refetch if stale).
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Family cost analysis (load if in family mode)
  const { data: familyCostAnalysis, isLoading: familyAnalysisLoading } = useQuery<CostPerUseAnalysis[]>({
    queryKey: [`/api/analysis/cost-per-use?familyGroupId=${familyGroupId}`],
    enabled: showFamilyData && !!familyGroupId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const analysisLoading = showFamilyData ? familyAnalysisLoading : personalAnalysisLoading;

  const computedFamilyCostAnalysis = showFamilyData ? computeCostPerUseFromSubs(familySubscriptions) : [];

  function buildPerMemberAnalyses() {
    if (!showFamilyData || !familyData?.members || familyData.members.length === 0) return [];
    const subs = familySubscriptions || [];
    const perMember: any[] = [];
    for (const m of familyData.members) {
      // If the member record lacks any identifying fields, skip creating
      // a per-member analysis label (fall back to base analysis instead).
      if (!m) continue;
      const hasIdentity = Boolean(m.displayName || m.email || m.userId || m.user_id);
      if (!hasIdentity) continue;

      const memberName = m.displayName || m.email || m.userId || m.user_id || 'Member';
      const memberId = m.userId ?? m.user_id;
      const memberSubs = subs.filter((s: any) => s && (s.user_id === memberId || s.userId === memberId || s.owner_id === memberId));
      if (!memberSubs || memberSubs.length === 0) continue;
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
  // Prefer server/base analysis entries (which contain canonical subscription names)
  // and only use per-member prefixed analyses as a fallback so we don't label
  // owner or shared subscriptions as "Member" unless the member-specific
  // analysis is actually the authoritative one.
  const costAnalysis: CostPerUseAnalysis[] | undefined = showFamilyData
    ? (dedupeByKey([...(baseAnalysis || []), ...perMemberAnalyses], 'subscriptionId') as CostPerUseAnalysis[])
    : baseAnalysis;
  const displayCostAnalysis = !showFamilyData && tier === "free"
    ? (costAnalysis?.slice(0, limits.maxCostPerUseSubscriptions) ?? [])
    : costAnalysis;

  // Personal insights
  const { data: personalInsights, isLoading: personalInsightsLoading, refetch: refetchInsights } = useQuery<Insight[]>({
    queryKey: ["/api/insights"],
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const insights = showFamilyData ? familyData?.insights : personalInsights;
  const insightsLoading = showFamilyData ? familyDataLoading : personalInsightsLoading;

  // Force refetch of behavioral insights when page loads
  useEffect(() => {
    if (!showFamilyData) {
      refetchBehavioral();
    }
  }, [refetchBehavioral, showFamilyData]);

  // compute potential savings using server metrics when available (no pagination issues)
  const totalPotentialSavings = (() => {
    if (showFamilyData) {
      const fromFamilyMetrics = familyData?.metrics?.potentialSavings;
      if (typeof fromFamilyMetrics === 'number') {
        return fromFamilyMetrics;
      }
      const subs: any[] = familyData?.subscriptions || [];
      return subs
        .filter(s => s && (s.status === 'unused' || s.status === 'to-cancel'))
        .reduce((sum: number, s: any) => sum + calculateMonthlyCost(s.amount || 0, s.frequency || 'monthly'), 0);
    }

    if (personalMetrics?.potentialSavings != null) {
      return personalMetrics.potentialSavings;
    }

    const subs: any[] = personalSubscriptions || [];
    if (!subs || subs.length === 0) return 0;
    return subs
      .filter(s => s && (s.status === 'unused' || s.status === 'to-cancel'))
      .reduce((sum: number, s: any) => sum + calculateMonthlyCost(s.amount || 0, s.frequency || 'monthly'), 0);
  })();

  const highPriorityCount = (insights as any)?.filter((i: any) => i?.priority === 1)?.length || 0;

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "savings":
        return TrendingUp;
      case "warning":
        return AlertCircle;
      case "tip":
        return Lightbulb;
      default:
        return CheckCircle2;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "savings":
        return "bg-chart-2/10 text-chart-2";
      case "warning":
        return "bg-chart-5/10 text-chart-5";
      case "tip":
        return "bg-chart-3/10 text-chart-3";
      default:
        return "bg-chart-1/10 text-chart-1";
    }
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="mb-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Insights & Opportunities</h1>
          <p className="text-muted-foreground">
            AI-powered analysis to highlight wasted spend, unused services, and smart cost-saving decisions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Total Potential Savings
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-2/10">
                  <TrendingUp className="h-4 w-4 text-chart-2" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight text-chart-2">
                  {formatAmount(totalPotentialSavings)}
                </span>
                <span className="text-sm text-muted-foreground">/mo</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Recommendations
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-1/10">
                  <Lightbulb className="h-4 w-4 text-chart-1" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight">
                  {recommendations?.length || 0}
                </span>
                <span className="text-sm text-muted-foreground ml-2">available</span>
              </div>
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  High Priority
                </span>
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-5/10">
                  <AlertCircle className="h-4 w-4 text-chart-5" />
                </div>
              </div>
              <div className="mt-3">
                <span className="text-3xl font-bold tracking-tight">
                  {highPriorityCount}
                </span>
                <span className="text-sm text-muted-foreground ml-2">actions needed</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <AIRecommendations
          recommendations={recommendations}
          isLoading={recsLoading}
          onRefresh={handleRefreshRecommendations}
          isRefreshing={refreshingRecommendations || recsRefreshing}
          expandable={true}
        />

        <div className="grid gap-6 lg:grid-cols-2">
          {limits.hasCostPerUse ? (
            <CostPerUse
              analyses={displayCostAnalysis}
              isLoading={analysisLoading}
              showUpgradePrompt={tier === "free"}
              totalSubscriptions={personalSubscriptionCount}
              maxAllowed={limits.maxCostPerUseSubscriptions}
            />
          ) : (
            <PremiumGate feature="Cost-per-use analytics" showBlurred={false} />
          )}
          {limits.hasBehavioralInsights ? (
            <BehavioralInsights 
              insights={behavioralInsights} 
              isLoading={behavioralLoading}
              familyMembers={familyData?.members}
              currentUserId={familyData?.currentUserId}
              showMemberLabels={showFamilyData}
            />
          ) : (
            <PremiumGate feature="Behavioral insights" showBlurred={false} />
          )}
        </div>

        {highPriorityCount > 0 && (
          <Card className="border-chart-5/20 bg-chart-5/5">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-chart-5">
                <AlertCircle className="h-5 w-5" />
                High Priority Actions
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                These insights require your immediate attention to maximize savings.
              </p>
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {(insights as any)
                    ?.filter((i: any) => i?.priority === 1)
                    ?.map((insight: Insight) => {
                      const Icon = getInsightIcon(insight.type);
                      return (
                        <div
                          key={insight.id}
                          className="flex items-start gap-4 p-4 rounded-lg border border-chart-5/20 bg-background hover:bg-muted/50 transition-colors"
                          data-testid={`high-priority-insight-${insight.id}`}
                        >
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getInsightColor(insight.type)}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{insight.title}</h4>
                              <Badge variant="secondary" className="text-xs">
                                {insight.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {insight.description}
                            </p>
                            {insight.potentialSavings && (
                              <p className="text-sm font-semibold text-chart-2 mt-2">
                                💰 Potential savings: {formatAmount(insight.potentialSavings)}/mo
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Target className="h-5 w-5" />
              All Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            {insightsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : insights && insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight: any) => {
                  const Icon = getInsightIcon(insight.type);
                  return (
                    <div
                      key={insight.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border border-border ${
                        insight.isRead ? "opacity-60" : ""
                      }`}
                      data-testid={`insight-item-${insight.id}`}
                    >
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${getInsightColor(insight.type)}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{insight.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {insight.type}
                          </Badge>
                          {insight.priority === 1 && (
                            <Badge className="bg-chart-5/10 text-chart-5 text-xs">
                              High Priority
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {insight.description}
                        </p>
                        {insight.potentialSavings && (
                          <p className="text-sm font-medium text-chart-2 mt-1">
                            Potential savings: {formatAmount(insight.potentialSavings)}/mo
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No insights available yet.</p>
                <p className="text-sm">Add more subscriptions to get personalized insights.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
