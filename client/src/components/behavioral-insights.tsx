import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Coffee, Film, Utensils, Music, Tv, Plane, ShoppingBag, Fuel } from "lucide-react";
import type { OpportunityCost } from "@shared/schema";
import { useCurrency, type Currency } from "@/lib/currency-context";
import { dedupeByKey } from "@/lib/utils";

interface BehavioralInsightsProps {
  insights: OpportunityCost[] | undefined;
  isLoading: boolean;
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
};

export function BehavioralInsights({ insights, isLoading }: BehavioralInsightsProps) {
  const { formatAmount } = useCurrency();
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-50">
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
          <p className="text-sm text-gray-600 mt-2">
            Visualize the real value of your unused subscriptions
          </p>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-600">
            <p className="text-gray-900">No unused or to-cancel subscriptions detected.</p>
            <p className="text-sm text-gray-600">Great job managing your subscriptions!</p>
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
        <p className="text-sm text-gray-600 mt-2">
          Visualize the real value of your unused or to-cancel subscriptions
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {dedupeByKey(insights, 'subscriptionId').map((insight) => (
            <div
              key={insight.subscriptionId}
              className="p-4 rounded-lg bg-gray-50 border border-gray-200"
              data-testid={`insight-${insight.subscriptionId}`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900">{insight.subscriptionName}</span>
                <span className="text-sm font-semibold text-green-600">
                  {formatAmount(insight.monthlyAmount, insight.currency as Currency)}/mo
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                This subscription equals:
              </p>
              <div className="flex flex-wrap gap-3">
                {insight.equivalents.map((equiv, idx) => {
                  const Icon = iconMap[equiv.icon] || Coffee;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-sm">
                        <span className="font-semibold text-gray-900">{equiv.count}</span>
                        <span className="text-gray-600 ml-1">{equiv.item}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
