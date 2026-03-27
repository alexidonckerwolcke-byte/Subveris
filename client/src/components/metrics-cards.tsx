import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, TrendingUp, CreditCard, AlertTriangle, PiggyBank, DollarSign } from "lucide-react";
import type { DashboardMetrics } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/lib/currency-context";

interface MetricsCardsProps {
  metrics: DashboardMetrics | undefined;
  isLoading: boolean;
}

export function MetricsCards({ metrics, isLoading }: MetricsCardsProps) {
  const { formatAmount } = useCurrency();
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Monthly Spend",
      value: formatAmount(metrics?.totalMonthlySpend ?? 0),
      change: metrics?.monthlySpendChange !== undefined 
        ? `${metrics.monthlySpendChange >= 0 ? '+' : ''}${metrics.monthlySpendChange}%`
        : "-12%",
      changeType: (metrics?.monthlySpendChange ?? -12) < 0 ? "decrease" as const : "increase" as const,
      icon: DollarSign,
      description: "vs last month",
      testId: "metric-total-spend",
    },
    {
      title: "Active Subscriptions",
      value: metrics?.activeSubscriptions?.toString() ?? "0",
      change: metrics?.newServicesTracked !== undefined 
        ? `+${metrics.newServicesTracked}`
        : "+2",
      changeType: "neutral" as const,
      icon: CreditCard,
      description: "services tracked",
      testId: "metric-active-subs",
    },
    {
      title: "Potential Savings",
      value: formatAmount(metrics?.potentialSavings ?? 0),
      change: "per month",
      changeType: "highlight" as const,
      icon: PiggyBank,
      description: "if optimized",
      testId: "metric-potential-savings",
    },
    {
      title: "Unused Services",
      value: metrics?.unusedSubscriptions?.toString() ?? "0",
      change: "low usage",
      changeType: "warning" as const,
      icon: AlertTriangle,
      description: "need attention",
      testId: "metric-unused",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title} className="hover-elevate">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {card.title}
              </span>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="mt-3">
              <span
                className="text-3xl font-bold tracking-tight"
                data-testid={card.testId}
              >
                {card.value}
              </span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {card.changeType === "decrease" && (
                <span className="flex items-center text-xs font-medium text-chart-2">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  {card.change}
                </span>
              )}
              {card.changeType === "increase" && (
                <span className="flex items-center text-xs font-medium text-chart-4">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {card.change}
                </span>
              )}
              {card.changeType === "neutral" && (
                <span className="flex items-center text-xs font-medium text-muted-foreground">
                  {card.change}
                </span>
              )}
              {card.changeType === "highlight" && (
                <span className="flex items-center text-xs font-medium text-chart-2">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  {card.change}
                </span>
              )}
              {card.changeType === "warning" && (
                <span className="flex items-center text-xs font-medium text-chart-4">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  {card.change}
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {card.description}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
