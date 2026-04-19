import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

export type SubscriptionTier = "free" | "premium" | "family";

interface SubscriptionContextType {
  tier: SubscriptionTier;
  setTier: (tier: SubscriptionTier) => void;
  limits: {
    maxSubscriptions: number;
    maxCostPerUseSubscriptions: number;
    hasAIRecommendations: boolean;
    hasCostPerUse: boolean;
    hasBehavioralInsights: boolean;
    hasSavingsProjections: boolean;
    hasExportReports: boolean;
  };
  subscriptionStatus: {
    status: string;
    tier: SubscriptionTier;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  } | null;
  isLoading: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const TIER_LIMITS = {
  free: {
    maxSubscriptions: 5,
    maxCostPerUseSubscriptions: 2,
    hasAIRecommendations: false,
    hasCostPerUse: true,
    hasBehavioralInsights: false,
    hasSavingsProjections: false,
    hasExportReports: false,
  },
  premium: {
    maxSubscriptions: Infinity,
    maxCostPerUseSubscriptions: Infinity,
    hasAIRecommendations: true,
    hasCostPerUse: true,
    hasBehavioralInsights: true,
    hasSavingsProjections: true,
    hasExportReports: true,
  },
  family: {
    maxSubscriptions: Infinity,
    maxCostPerUseSubscriptions: Infinity,
    hasAIRecommendations: true,
    hasCostPerUse: true,
    hasBehavioralInsights: true,
    hasSavingsProjections: true,
    hasExportReports: true,
  },
};

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<SubscriptionTier>("free");

  // Fetch subscription status from our API
  const { data: subscriptionData, isLoading, refetch } = useQuery<{
    isPremium: boolean;
    planType: SubscriptionTier;
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
  } | null>({
    queryKey: ["/api/user/premium-status"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/user/premium-status");
        return res.json();
      } catch (error) {
        console.error("Failed to fetch subscription status:", error);
        return null;
      }
    },
    enabled: true, // Always enabled since we need to check auth status
    retry: false,
    staleTime: 0, // Always refetch when needed
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when network reconnects
  });

  const subscriptionStatus = subscriptionData ? {
    status: subscriptionData.status,
    tier: subscriptionData.planType || (subscriptionData.isPremium ? "premium" : "free") as SubscriptionTier,
    currentPeriodEnd: subscriptionData.currentPeriodEnd,
    cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd,
  } : null;

  useEffect(() => {
    if (subscriptionData?.planType) {
      setTierState(subscriptionData.planType);
    } else if (subscriptionData?.isPremium) {
      setTierState("premium");
    } else {
      setTierState("free");
    }
  }, [subscriptionData]);

  const setTier = (newTier: SubscriptionTier) => {
    // Invalidate the subscription status query to refresh from Stripe
    queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-status"] });
  };

  const limits = TIER_LIMITS[tier];

  return (
    <SubscriptionContext.Provider
      value={{
        tier,
        setTier,
        limits,
        subscriptionStatus,
        isLoading,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error("useSubscription must be used within a SubscriptionProvider");
  }
  return context;
}
