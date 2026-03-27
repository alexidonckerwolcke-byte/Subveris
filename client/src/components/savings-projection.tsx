import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  PiggyBank,
  Target,
  TrendingUp,
  Calendar,
  Check,
  ArrowRight,
} from "lucide-react";
import { useCurrency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";
import { useFamilyDataMode } from "@/hooks/use-family-data";

interface SavingsProjectionProps {
  potentialSavings: number;
  currentSavings: number;
  unusedCount: number;
  toCancelCount: number;
  isLoading: boolean;
}

export function SavingsProjection({
  potentialSavings,
  currentSavings,
  unusedCount,
  toCancelCount,
  isLoading,
}: SavingsProjectionProps) {
  const { formatAmount, convertAmount } = useCurrency();
  const { user } = useAuth();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();
  const [, navigate] = useLocation();
  const [userGoalUSD, setUserGoalUSD] = useState<number | null>(null);

  // Load user's saved goal from localStorage (family-aware)
  useEffect(() => {
    // Use family-specific key in family mode, otherwise user-specific
    const keySuffix = showFamilyData && familyGroupId ? `-${familyGroupId}` : (user?.id ? `-${user.id}` : '');
    const storedGoal = localStorage.getItem(`subveris-savings-goal-usd${keySuffix}`);
    if (storedGoal) {
      const goalValue = Number(storedGoal);
      if (!isNaN(goalValue) && goalValue > 0) {
        setUserGoalUSD(goalValue);
      }
    }

    // Listen for updates dispatched by the Savings page when the user changes the goal
    const handler = (e: Event) => {
      try {
        const val = (e as CustomEvent).detail;
        const num = Number(val);
        if (!isNaN(num) && num >= 0) {
          setUserGoalUSD(num);
        }
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('savingsGoalUpdated', handler as EventListener);

    return () => {
      window.removeEventListener('savingsGoalUpdated', handler as EventListener);
    };
  }, [user?.id, showFamilyData, familyGroupId]);
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // If the user has explicitly set a goal, respect it. Otherwise use a
  // constant baseline (500 USD) rather than the volatile
  // `potentialSavings` value, which can drop to zero when subscriptions are
  // deleted and would make the progress bar regress to 0% immediately.
  const defaultGoalUSD = 500;
  const effectiveGoal = userGoalUSD !== null ? userGoalUSD : defaultGoalUSD;
  const savingsProgress = effectiveGoal > 0 
    ? Math.min((currentSavings / effectiveGoal) * 100, 100) 
    : 0;

  const projectedYearlySavings = effectiveGoal * 12;
  const actionableItems = unusedCount + toCancelCount;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-chart-2/10 to-chart-1/10 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/20">
            <PiggyBank className="h-5 w-5 text-chart-2" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">
              {showFamilyData ? "Family Savings Projection" : "Savings Projection"}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {showFamilyData ? "Your family's path to smarter spending" : "Your path to smarter spending"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Potential</span>
              <span className="text-2xl font-bold text-chart-2">
                {formatAmount(potentialSavings)}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {showFamilyData ? "Family progress to goal" : "Progress to goal"}
                </span>
                <span className="font-medium">{Math.round(savingsProgress)}%</span>
              </div>
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-chart-2 to-chart-1 transition-all duration-500 rounded-full"
                  style={{ width: `${savingsProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Saved: {formatAmount(currentSavings)}</span>
                <span>Goal: {formatAmount(effectiveGoal)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-4/10">
                <Calendar className="h-4 w-4 text-chart-4" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Yearly Projection</p>
                <p className="font-semibold">{formatAmount(projectedYearlySavings)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-chart-1/10">
                <Target className="h-4 w-4 text-chart-1" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Actions Available</p>
                <p className="font-semibold">{actionableItems} subscriptions to optimize</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border">
          <h4 className="text-sm font-medium mb-3">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            {unusedCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                data-testid="action-review-unused"
                onClick={() => navigate("/subscriptions?tab=unused")}
              >
                <Check className="h-4 w-4 mr-2" />
                Review {unusedCount} unused
              </Button>
            )}
            {toCancelCount > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                data-testid="action-cancel-pending"
                onClick={() => navigate("/subscriptions?tab=to-cancel")}
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Cancel {toCancelCount} pending
              </Button>
            )}
            <Button 
              variant="default" 
              size="sm" 
              data-testid="action-view-all-savings"
              onClick={() => navigate("/insights")}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              View All Savings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
