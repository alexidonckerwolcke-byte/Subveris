import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CostPerUseAnalysis } from "@shared/schema";
import { getValueRatingColor, dedupeByKey } from "@/lib/utils";
import { useCurrency, type Currency } from "@/lib/currency-context";

interface CostPerUseProps {
  analyses: CostPerUseAnalysis[] | undefined;
  isLoading: boolean;
}

export function CostPerUse({ analyses, isLoading }: CostPerUseProps) {
  const { formatAmount } = useCurrency();
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const getRatingBadge = (rating: CostPerUseAnalysis["valueRating"]) => {
    const config = {
      excellent: { label: "Excellent Value", className: "bg-chart-2/10 text-chart-2" },
      good: { label: "Good Value", className: "bg-chart-2/10 text-chart-2" },
      fair: { label: "Fair Value", className: "bg-chart-4/10 text-chart-4" },
      poor: { label: "Poor Value", className: "bg-chart-5/10 text-chart-5" },
    };
    return config[rating];
  };

  // Strip any leading uuid-like token from a name string (e.g. "3c2085b7-... - Netflix")
  const stripUuidPrefix = (name?: string) => {
    if (!name) return "";
    // UUID v4 pattern (lower/upper hex with dashes)
    const uuidPrefixRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\s*[-—–:]?\s*/;
    return name.replace(uuidPrefixRegex, "");
  };

  // Progress and color based on usage count: 0 => red, low => orange, many => green
  const getProgressPercentByUsage = (usageCount: number | undefined) => {
    const u = Number(usageCount || 0);
    if (u <= 0) return 3;
    if (u === 1) return 25;
    if (u === 2) return 50;
    if (u === 3) return 75;
    return 100;
  };

  const getProgressColorByUsage = (usageCount: number | undefined) => {
    const u = Number(usageCount || 0);
    if (u <= 0) return "bg-chart-5"; // red
    if (u <= 2) return "bg-chart-4"; // orange
    return "bg-chart-2"; // green
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          Cost Per Use Analysis
          <Badge variant="secondary" className="text-xs font-normal">
            Value Score
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-5">
          {dedupeByKey(analyses, 'subscriptionId').map((analysis) => {
            const ratingConfig = getRatingBadge(analysis.valueRating);
            const usageCount = Number(analysis.usageCount || 0);
            const percent = getProgressPercentByUsage(usageCount);
            const progressColor = getProgressColorByUsage(usageCount);
            const displayName = stripUuidPrefix(analysis.name || "");
            return (
              <div
                key={analysis.subscriptionId}
                className="space-y-2"
                data-testid={`cost-analysis-${analysis.subscriptionId}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{displayName}</span>
                    <Badge className={ratingConfig.className}>
                      {ratingConfig.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${getValueRatingColor(analysis.valueRating)}`}>
                      {formatAmount(analysis.costPerUse, analysis.currency as Currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">/use</span>
                  </div>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`absolute left-0 top-0 h-full transition-all duration-500 rounded-full ${progressColor}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {formatAmount(analysis.monthlyAmount, analysis.currency as Currency)}/mo
                  </span>
                  <span>
                    {usageCount} uses this month
                  </span>
                </div>
              </div>
            );
          })}
        </div>
        {(!analyses || analyses.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No usage data available yet.</p>
            <p className="text-sm">Connect your accounts to start tracking.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
