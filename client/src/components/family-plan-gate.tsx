import { ReactNode } from "react";
import { Link } from "wouter";
import { Lock, Sparkles } from "lucide-react";
import { useSubscription } from "@/lib/subscription-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface FamilyPlanGateProps {
  children?: ReactNode;
  feature?: string;
  showBlurred?: boolean;
}

export function FamilyPlanGate({ children, feature = "Family Sharing", showBlurred = true }: FamilyPlanGateProps) {
  const { tier } = useSubscription();

  if (tier === "family") {
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
        <h3 className="text-lg font-semibold mb-2">Family Plan Only</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          {feature} is available exclusively on the Family plan. Upgrade to unlock this feature and share subscriptions with your family.
        </p>
        <Link href="/pricing">
          <Button>
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade to Family Plan
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
