import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Ban,
  ChevronDown,
} from "lucide-react";
import type { AIRecommendation } from "@shared/schema";
import { useCurrency, type Currency } from "@/lib/currency-context";

interface AIRecommendationsProps {
  recommendations: AIRecommendation[] | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function AIRecommendations({
  recommendations,
  isLoading,
  onRefresh,
  isRefreshing,
}: AIRecommendationsProps) {
  const { formatAmount } = useCurrency();
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-border">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-3" />
              <Skeleton className="h-8 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const getTypeConfig = (type: AIRecommendation["type"]) => {
    const configs = {
      alternative: {
        icon: ArrowRight,
        label: "Switch",
        color: "bg-chart-1/10 text-chart-1",
      },
      cancel: {
        icon: Ban,
        label: "Cancel",
        color: "bg-chart-5/10 text-chart-5",
      },
      negotiate: {
        icon: TrendingDown,
        label: "Negotiate",
        color: "bg-chart-3/10 text-chart-3",
      },
      downgrade: {
        icon: ChevronDown,
        label: "Downgrade",
        color: "bg-chart-4/10 text-chart-4",
      },
    };
    return configs[type];
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-chart-3/10">
            <Sparkles className="h-4 w-4 text-chart-3" />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">AI Recommendations</CardTitle>
            <p className="text-xs text-muted-foreground">Powered by smart analysis</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          data-testid="button-refresh-recommendations"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations?.map((rec) => {
            const config = getTypeConfig(rec.type);
            const Icon = config.icon;
            return (
              <div
                key={rec.id}
                className="p-4 rounded-lg border border-border hover-elevate"
                data-testid={`recommendation-${rec.id}`}
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={config.color}>
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                    <span className="text-sm font-medium">{rec.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold text-chart-2">
                      Save {formatAmount(rec.savings, rec.currency as Currency)}
                    </span>
                    <span className="text-xs text-muted-foreground">/mo</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {rec.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Current: </span>
                      <span className="font-medium line-through text-chart-5">
                        {formatAmount(rec.currentCost, rec.currency as Currency)}
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <span className="text-muted-foreground">Suggested: </span>
                      <span className="font-medium text-chart-2">
                        {formatAmount(rec.suggestedCost, rec.currency as Currency)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="h-2 w-2 rounded-full bg-chart-2" />
                    <span className="text-xs text-muted-foreground">
                      {Math.round(rec.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {(!recommendations || recommendations.length === 0) && (
          <div className="text-center py-8 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recommendations available yet.</p>
            <p className="text-sm">Click refresh to get AI-powered insights.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
