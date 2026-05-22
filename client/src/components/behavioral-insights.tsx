import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Coffee, Film, Utensils, Music, Tv, Plane, ShoppingBag, Fuel, Dumbbell, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { OpportunityCost } from "@shared/schema";
import { useCurrency, type Currency } from "@/lib/currency-context";
import { dedupeByKey } from "@/lib/utils";

interface BehavioralInsightsProps {
  insights: OpportunityCost[] | undefined;
  isLoading: boolean;
  familyMembers?: any[];
  currentUserId?: string;
  showMemberLabels?: boolean;
}

const iconMap: Record<string, typeof Coffee> = {
  coffee: Coffee,
  film: Film,
  utensils: Utensils,
  music: Music,
  tv: Tv,
  plane: Plane,
  shopping: ShoppingBag,
  fuel: Fuel,
  dumbbell: Dumbbell,
};

export function BehavioralInsights({ 
  insights, 
  isLoading, 
  familyMembers = [], 
  currentUserId, 
  showMemberLabels = false 
}: BehavioralInsightsProps) {
  const { formatAmount } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Map member IDs to member names
  const getMemberName = (userId: string | undefined) => {
    if (!userId || userId === currentUserId) return null;
    const member = familyMembers.find((m: any) => m.userId === userId || m.user_id === userId);
    return member?.displayName || member?.email || member?.name || null;
  };

  const getSubscriptionLabel = (insight: OpportunityCost) => {
    if (!showMemberLabels) return insight.subscriptionName;
    const memberName = getMemberName(insight.userId as string);
    return memberName ? `${memberName} — ${insight.subscriptionName}` : insight.subscriptionName;
  };
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-muted/10">
              <Skeleton className="h-5 w-32 mb-3" />
              <div className="flex gap-4">
                <Skeleton className="h-16 w-16 rounded-lg" />
                <Skeleton className="h-16 w-16 rounded-lg" />
                <Skeleton className="h-16 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!insights || insights.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            What Your Money Could Buy
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Visualize the real value of your unused subscriptions
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-foreground">No unused or to-cancel subscriptions detected.</p>
            <p className="text-sm text-muted-foreground">Great job managing your subscriptions!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">
          What Your Money Could Buy
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Visualize the real value of your unused or to-cancel subscriptions
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dedupeByKey(insights, 'subscriptionId')
            .slice(0, isExpanded ? undefined : 3)
            .map((insight) => (
            <div
              key={insight.subscriptionId}
              className="p-3 rounded-xl border border-border bg-background/80 shadow-sm"
              data-testid={`insight-${insight.subscriptionId}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-foreground text-sm">{getSubscriptionLabel(insight)}</span>
                <span className="text-xs font-semibold text-chart-2">
                  {formatAmount(insight.monthlyAmount, insight.currency as Currency)}/mo
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                This subscription equals:
              </p>
              <div className="flex flex-wrap gap-2">
                {insight.equivalents.map((equiv, idx) => {
                  const Icon = iconMap[equiv.icon] || Coffee;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-2 py-1 rounded-lg border border-border bg-muted/5"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-chart-2/10">
                        <Icon className="h-4 w-4 text-chart-2" />
                      </div>
                      <div className="text-xs">
                        <span className="font-semibold text-foreground">{equiv.count}</span>
                        <span className="text-muted-foreground ml-1">{equiv.item}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {insights && insights.length > 3 && (
          <div className="mt-4 border-t border-border pt-4">
            <Button className="w-full" variant="outline" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show All {insights.length} Insights
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
