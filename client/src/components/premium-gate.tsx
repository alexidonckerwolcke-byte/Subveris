import { ReactNode } from "react";
import { Link } from "wouter";
import { Lock, Sparkles } from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PremiumGateProps {
  children?: ReactNode;
  feature: string;
  showBlurred?: boolean;
}

export function PremiumGate({ children, feature, showBlurred = true }: PremiumGateProps) {
  const { tier } = useSubscription();

  if (tier === "premium" || tier === "family") {
    return <>{children}</>;
  }

  return (
    <Card className="relative overflow-hidden">
      {showBlurred && (
        <div className="absolute inset-0 backdrop-blur-sm bg-background/50 z-10" />
      )}
      <CardContent className="relative z-20 flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Premium Feature</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          {feature} is available on the Premium and Family plans. Upgrade to unlock this feature.
        </p>
        <Link href="/pricing">
          <Button>
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

interface FeatureLimitGateProps {
  currentCount: number;
  maxAllowed: number;
  feature: string;
  children: ReactNode;
}

export function FeatureLimitGate({ currentCount, maxAllowed, feature, children }: FeatureLimitGateProps) {
  const { tier } = useSubscription();
  const isOverLimit = tier !== "premium" && tier !== "family" && currentCount > maxAllowed;

  return (
    <>
      {children}
      {isOverLimit && (
        <Card className="border-dashed mt-4">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Showing the first {maxAllowed} subscriptions
            </h3>
            <p className="text-muted-foreground mb-4 max-w-sm">
              {feature} is available for up to {maxAllowed} subscriptions on the Free plan. Upgrade to Premium to analyze all of your subscriptions.
            </p>
            <Link href="/pricing">
              <Button>
                <Sparkles className="h-4 w-4 mr-2" />
                Upgrade to Premium
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </>
  );
}

interface SubscriptionLimitGateProps {
  currentCount: number;
  children: ReactNode;
}

export function SubscriptionLimitGate({ currentCount, children }: SubscriptionLimitGateProps) {
  const { limits, tier } = useSubscription();

  if (tier === "premium" || tier === "family" || currentCount < limits.maxSubscriptions) {
    return <>{children}</>;
  }

  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Subscription Limit Reached</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          You've reached the maximum of {limits.maxSubscriptions} subscriptions on the Free plan.
          Upgrade to Premium or Family for unlimited subscriptions.
        </p>
        <Link href="/pricing">
          <Button>
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
