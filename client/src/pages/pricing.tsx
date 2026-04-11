import { Check, Sparkles, ArrowRight, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSubscription, SubscriptionTier } from "@/lib/subscription-context";
import { useToast } from "@/hooks/use-toast";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { useLocation } from "wouter";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useCurrency } from "@/lib/currency-context";

interface Plan {
  name: string;
  tier: SubscriptionTier;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
}

// Plans are now defined inside the component to use localized currency

export default function PricingPage() {
  const { tier: currentTier, subscriptionStatus } = useSubscription();
  const { toast } = useToast();
  const { familyGroupId, isInFamily } = useFamilyDataMode();
  const { formatAmount } = useCurrency();
  const [, setLocation] = useLocation();
  // Message state for redirect
  const [redirectMsg, setRedirectMsg] = useState<string | null>(null);

  const plans: Plan[] = [
    {
      name: "Free",
      tier: "free",
      price: "0,00 €",
      period: "forever",
      description: "Perfect for getting started with subscription tracking",
      features: [
        "Track up to 5 subscriptions",
        "Basic spending overview",
        "Monthly spending reports",
        "Manual subscription entry",
        "Email support",
      ],
      popular: false,
    },
    {
      name: "Premium",
      tier: "premium",
      price: "9,99 €",
      period: "per month",
      description: "Unlock powerful insights and automation features",
      features: [
        "Unlimited subscriptions",
        "AI-powered recommendations",
        "Browser extension tracking",
        "Cost-per-use analytics",
        "Behavioral insights",
        "Savings projections",
        "Priority support",
        "Export reports (CSV/PDF)",
      ],
      popular: false,
    },
    {
      name: "Family",
      tier: "family",
      price: "14,99 €",
      period: "per month",
      description: "Share subscriptions and manage family finances together",
      features: [
        "All Premium Features",
        "Unlimited subscriptions",
        "AI-powered recommendations",
        "Browser extension tracking",
        "Cost-per-use analytics",
        "Behavioral insights",
        "Savings projections",
        "Family group management",
        "Share subscriptions with family",
        "Split costs with family members",
        "Family spending overview",
        "Priority support",
        "Export reports (CSV/PDF)",
      ],
      popular: true,
    },
  ];

  const createCheckoutMutation = useMutation({
    mutationFn: async (tier: "premium" | "family") => {
      // Hardcode the correct Stripe price IDs to guarantee correct value
      const priceIdMap = {
        premium: "price_1T3jhIJpTYwzr88x8pGboTSU",
        family: "price_1T3jikJpTYwzr88xIxkKHkKu",
      };
      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        priceId: priceIdMap[tier],
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "No checkout URL received. Please try again.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      const errorMessage = error instanceof Error ? error.message : "Failed to start checkout process";
      toast({
        title: "Error",
        description: errorMessage.includes("log in") 
          ? "Please log in first to upgrade your plan"
          : errorMessage,
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/cancel-subscription");
      return res.json();
    },
    onSuccess: () => {
      // Only remove family-related queries and storage, not all user data
      try {
        // Remove family-related localStorage/sessionStorage keys
        localStorage.removeItem('familyGroupId');
        localStorage.removeItem('familySettings');
        localStorage.removeItem('showFamilyData');
        sessionStorage.removeItem('familyGroupId');
        sessionStorage.removeItem('familySettings');
        sessionStorage.removeItem('showFamilyData');
      } catch (e) {
        console.warn('[Pricing] Failed to clear family data from storage:', e);
      }
      // Remove/invalidate only family-related queries
      queryClient.removeQueries({ queryKey: ["/api/family-groups"] });
      queryClient.removeQueries({ queryKey: ["/api/family-groups", "settings"] });
      queryClient.removeQueries({ queryKey: ["/api/family-groups", "members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-status"] });
      // Optionally, refetch personal subscriptions if needed (not required if query is auto-refetched)
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled. You'll keep premium access until the end of your billing period.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel subscription.",
        variant: "destructive",
      });
    },
  });

  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/reactivate-subscription");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-status"] });
      toast({
        title: "Subscription Reactivated",
        description: "Your subscription has been reactivated. Welcome back!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reactivate subscription.",
        variant: "destructive",
      });
    },
  });

  const handleSelectPlan = (plan: Plan) => {
    if (plan.tier === currentTier) return;
    // If downgrading from family and user has a family group, force them to delete it first
    if (
      currentTier === "family" &&
      (plan.tier === "premium" || plan.tier === "free") &&
      isInFamily && familyGroupId
    ) {
      // Set flag for family-sharing page to show message
      if (typeof window !== "undefined") {
        sessionStorage.setItem("downgradeRedirect", "1");
      }
      setLocation("/family-sharing");
      return;
    }
    if (plan.tier === "premium" || plan.tier === "family") {
      // Upgrade to premium or family - use Stripe checkout
      createCheckoutMutation.mutate(plan.tier);
    } else if (plan.tier === "free" && (currentTier === "premium" || currentTier === "family")) {
      if (subscriptionStatus?.cancelAtPeriodEnd) {
        // Reactivate subscription
        reactivateSubscriptionMutation.mutate();
      } else {
        // Cancel subscription
        cancelSubscriptionMutation.mutate();
      }
    }
  };

  const getButtonText = (plan: Plan) => {
    if (plan.tier === currentTier) {
      if (plan.tier === "free" && subscriptionStatus?.cancelAtPeriodEnd) {
        return "Subscription Cancelled";
      }
      return "Current Plan";
    }
    
    if (plan.tier === "premium" || plan.tier === "family") {
      return createCheckoutMutation.isPending ? "Redirecting..." : plan.tier === "family" ? "Upgrade to Family" : "Upgrade to Premium";
    }
    
    if (plan.tier === "free" && (currentTier === "premium" || currentTier === "family")) {
      if (subscriptionStatus?.cancelAtPeriodEnd) {
        return reactivateSubscriptionMutation.isPending ? "Reactivating..." : "Reactivate Subscription";
      }
      return cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription";
    }
    
    return "Select Plan";
  };

  console.log('VITE_STRIPE_PREMIUM_PRICE_ID:', import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID);
  console.log('VITE_STRIPE_FAMILY_PRICE_ID:', import.meta.env.VITE_STRIPE_FAMILY_PRICE_ID);

  // Show redirect message if set
  if (redirectMsg) {
    toast({
      title: "Action Required",
      description: redirectMsg,
      variant: "destructive",
    });
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      <div className="container max-w-6xl py-16 px-6">
        <div className="text-center mb-20 relative">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -z-10" />
          
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Premium Plans
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
            Choose the perfect plan for your subscription management needs. Upgrade, downgrade, or cancel anytime with complete flexibility.
          </p>
          {currentTier === "premium" && (
            <Badge className="inline-block px-6 py-2 text-base font-semibold bg-gradient-to-r from-primary to-blue-600">
              <Sparkles className="h-4 w-4 mr-2 fill-white" />
              {subscriptionStatus?.cancelAtPeriodEnd 
                ? "Premium (Ending Soon)" 
                : "Premium Plan Active"
              }
            </Badge>
          )}
          {currentTier === "family" && (
            <Badge className="inline-block px-6 py-2 text-base font-semibold bg-gradient-to-r from-purple-600 to-pink-600">
              <Sparkles className="h-4 w-4 mr-2 fill-white" />
              {subscriptionStatus?.cancelAtPeriodEnd 
                ? "Family (Ending Soon)" 
                : "Family Plan Active"
              }
            </Badge>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-10 max-w-7xl mx-auto mb-16">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative flex flex-col transition-all duration-300 border ${
                plan.tier === currentTier
                  ? plan.tier === "family"
                    ? "border-purple-500 shadow-2xl ring-2 ring-purple-500/50 bg-gradient-to-br from-purple-500/5 to-pink-500/5"
                    : "border-primary shadow-2xl ring-2 ring-primary/50 bg-gradient-to-br from-card to-card/50"
                  : plan.popular && plan.tier === "family"
                  ? "border-purple-500/50 shadow-xl scale-[1.02] hover:shadow-2xl bg-gradient-to-br from-purple-500/5 to-pink-500/5"
                  : plan.popular
                  ? "border-primary/50 shadow-xl scale-[1.02] hover:shadow-2xl bg-gradient-to-br from-card/50 to-card"
                  : "border-border/50 shadow-md hover:shadow-lg hover:border-primary/30 bg-card/50"
              }`}
            >
              {plan.popular && plan.tier !== currentTier && (
                <Badge className={`absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 text-white font-semibold shadow-lg ${
                  plan.tier === "family"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600"
                    : "bg-gradient-to-r from-primary to-blue-600"
                }`}>
                  {plan.tier === "family" ? (
                    <>
                      <Users className="h-4 w-4 mr-2" />
                      Best for Families
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2 fill-white" />
                      Recommended
                    </>
                  )}
                </Badge>
              )}
              {plan.tier === currentTier && (
                <Badge className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow-lg">
                  <Check className="h-4 w-4 mr-2" />
                  Current Plan
                </Badge>
              )}
              <CardHeader className="text-center pb-6 pt-10">
                <CardTitle className="text-3xl font-bold">{plan.name}</CardTitle>
                <div className="mt-6">
                  <span className={`text-5xl font-bold bg-clip-text text-transparent ${
                    plan.tier === "family"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600"
                      : "bg-gradient-to-r from-primary to-blue-500"
                  }`}>{plan.price}</span>
                  <span className="text-muted-foreground ml-3 text-lg">/{plan.period}</span>
                </div>
                <CardDescription className="mt-4 text-base leading-relaxed">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 pb-8">
                <ul className="space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <Check className={`h-5 w-5 shrink-0 mt-0.5 font-bold ${
                        plan.tier === "family" ? "text-purple-600" : "text-primary"
                      }`} />
                      <span className="text-sm font-medium leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="pt-0">
                <Button
                  className={`w-full font-semibold py-7 text-base ${
                    plan.tier === currentTier 
                      ? "border-2 hover:bg-muted/50" 
                      : plan.popular
                      ? plan.tier === "family"
                        ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg text-white"
                        : "bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 shadow-lg text-white"
                      : "border-2 hover:bg-muted/50"
                  }`}
                  variant={plan.tier === currentTier ? "outline" : "default"}
                  size="lg"
                  onClick={() => handleSelectPlan(plan)}
                  disabled={
                    plan.tier === currentTier || 
                    createCheckoutMutation.isPending || 
                    cancelSubscriptionMutation.isPending ||
                    reactivateSubscriptionMutation.isPending
                  }
                >
                  {getButtonText(plan)}
                  {plan.tier !== currentTier && <ArrowRight className="ml-2 h-5 w-5" />}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="max-w-2xl mx-auto text-center bg-card/50 border border-border/50 rounded-lg p-8 backdrop-blur">
          <p className="text-lg font-semibold mb-2">100% Satisfaction Guaranteed</p>
          <p className="text-muted-foreground">
            ✓ 14-day money-back guarantee • ✓ Cancel anytime • ✓ No hidden fees • ✓ Upgrade or downgrade instantly
          </p>
        </div>
      </div>
    </div>
  );
}
