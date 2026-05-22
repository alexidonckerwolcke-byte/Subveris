import { Card, CardContent, CardHeader, CardTitle } from "./ui/card.js";
import { Button } from "./ui/button.js";
import { Badge } from "./ui/badge.js";
import { Skeleton } from "./ui/skeleton.js";
import {
  Sparkles,
  ArrowRight,
  TrendingDown,
  RefreshCw,
  Ban,
  ChevronDown,
  ChevronRight,
  ChevronUp,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import type { AIRecommendation } from "@shared/schema";
import { useCurrency, type Currency } from "../lib/currency-context.js";

interface AIRecommendationsProps {
  recommendations: AIRecommendation[] | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
  maxRecommendations?: number;
  showViewAll?: boolean;
  totalCount?: number;
  expandable?: boolean;
}

export function AIRecommendations({
  recommendations,
  isLoading,
  onRefresh,
  isRefreshing,
  maxRecommendations,
  showViewAll = false,
  totalCount,
  expandable = false,
}: AIRecommendationsProps) {
  const { formatAmount } = useCurrency();
  const [isExpanded, setIsExpanded] = useState(false);

  // For expandable mode, show 3 initially, otherwise use maxRecommendations
  const effectiveMaxRecommendations = expandable
    ? (isExpanded ? undefined : 3)
    : maxRecommendations;

  // Limit recommendations based on effective max
  const displayRecommendations = effectiveMaxRecommendations && recommendations
    ? recommendations.slice(0, effectiveMaxRecommendations)
    : recommendations;

  // Check if there are more recommendations than the limit
  const hasMoreRecommendations = totalCount ? totalCount > (maxRecommendations || 0) : false;

  // For expandable mode, check if there are more than 3 recommendations
  const hasExpandableRecommendations = expandable && recommendations && recommendations.length > 3;
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
    return configs[type] || {
      icon: Sparkles,
      label: type || "Recommendation",
      color: "bg-chart-2/10 text-chart-2",
    };
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
            <p className="text-xs text-muted-foreground">Powered by advanced subscription intelligence</p>
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
        <div className="space-y-2">
          {displayRecommendations?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No recommendations available at this time.
            </p>
          ) : (
            displayRecommendations?.map((rec) => {
              if (!rec || !rec.type) return null;
              const config = getTypeConfig(rec.type);
              const Icon = config?.icon || Sparkles;
              return (
                <div
                  key={rec.id}
                  className="space-y-2 rounded-xl border border-border bg-background/80 p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  data-testid={`recommendation-${rec.id}`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={config?.color || "bg-chart-2/10 text-chart-2"}>
                        <Icon className="h-3 w-3" />
                        {config?.label || "Recommendation"}
                      </Badge>
                      <span className="text-sm font-semibold text-foreground">{rec.title}</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-semibold text-chart-2">
                      <span>Save {formatAmount(rec.savings, rec.currency as Currency)}</span>
                      <span className="text-muted-foreground">/mo</span>
                    </div>
                  </div>
                  <p className="text-sm leading-5 text-muted-foreground">{rec.description}</p>
                  {rec.alternativeName ? (
                    <div className="rounded-lg border border-border/50 bg-muted/5 px-2 py-1.5 text-sm text-muted-foreground">
                      Suggested alternative: <span className="font-medium text-foreground">{rec.alternativeName}</span>
                    </div>
                  ) : null}
                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div className="rounded-lg border border-border/70 bg-muted/5 p-1.5">
                      <p className="text-muted-foreground">Current spend</p>
                      <p className="mt-1 font-semibold text-chart-5 line-through">
                        {formatAmount(rec.currentCost, rec.currency as Currency)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/70 bg-muted/5 p-1.5">
                      <p className="text-muted-foreground">Suggested spend</p>
                      <p className="mt-1 font-semibold text-chart-2">
                        {formatAmount(rec.suggestedCost, rec.currency as Currency)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border px-2 py-1">
                      <span className="h-2 w-2 rounded-full bg-chart-2" />
                      {Math.round(rec.confidence * 100)}% confidence
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border px-2 py-1">
                      <span className="font-medium text-foreground">Impact:</span>
                      {rec.currentCost > 0
                        ? `${Math.round((rec.savings / rec.currentCost) * 100)}% lower cost`
                        : "Immediate savings"}
                    </span>
                  </div>
                </div>
              );
            })
          )}

          {/* Expand/Collapse button for expandable mode */}
          {expandable && hasExpandableRecommendations && (
            <div className="pt-2 border-t border-border">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? (
                  <>
                    <ChevronUp className="h-4 w-4 mr-2" />
                    Show Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 mr-2" />
                    Show All {recommendations?.length} Recommendations
                  </>
                )}
              </Button>
            </div>
          )}

          {/* View All button for non-expandable mode */}
          {showViewAll && hasMoreRecommendations && !expandable && (
            <div className="pt-2 border-t border-border">
              <Link href="/insights">
                <Button variant="outline" className="w-full">
                  <ChevronRight className="h-4 w-4 mr-2" />
                  View All {totalCount || recommendations?.length} Recommendations
                </Button>
              </Link>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
