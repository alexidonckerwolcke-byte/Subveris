import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BarChart3, Calendar, Clock, DollarSign, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SpendingChart } from "@/components/spending-chart";
import { apiRequest } from "@/lib/queryClient";
import { useCurrency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { getVisibleFamilySubscriptions } from "@/lib/family-data";
import { calculatePotentialSavings } from "@/lib/health-score";
import { normalizeMonthlySpendingSeries } from "@/lib/utils";
import type { Subscription, MonthlySpending, SpendingByCategory } from "@shared/schema";

function parseBillingDate(date?: string | Date | null) {
  if (!date) return null;
  const parsed = date instanceof Date ? date : new Date(String(date));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatShortDate(date?: string | Date | null) {
  const parsed = parseBillingDate(date);
  if (!parsed) return "Unknown";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getCurrentMonthAmount(monthlyData: MonthlySpending[] | undefined) {
  if (!monthlyData || monthlyData.length === 0) return 0;
  const now = new Date();
  const currentMonthLabel = now.toLocaleString("en-US", { month: "short", year: "numeric" });
  const entry = monthlyData.find((item) => item.month === currentMonthLabel);
  return entry ? entry.amount : 0;
}

function getUpcomingRenewals(subscriptions: Subscription[] = []) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  return subscriptions
    .map((subscription) => {
      const rawDate =
        (subscription as any).nextBillingDate ||
        (subscription as any).next_billing_at ||
        (subscription as any).next_billing_date ||
        (subscription as any).next_billing ||
        null;
      const date = parseBillingDate(rawDate);
      if (!date) return null;
      return { subscription, date };
    })
    .filter((item): item is { subscription: Subscription; date: Date } => item !== null)
    .filter((item) => item.date.getFullYear() === currentYear && item.date.getMonth() === currentMonth)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 3)
    .map((item) => ({
      id: item.subscription.id,
      title: item.subscription.name || "Subscription",
      amount: Number(item.subscription.amount || 0),
      date: item.date,
      frequency: item.subscription.frequency || "monthly",
    }));
}

export default function Dashboard() {
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();
  const [, navigate] = useLocation();

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["/api/metrics"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/metrics");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: personalSubscriptions = [], isLoading: subscriptionsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/subscriptions");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: familyData } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "family-data"],
    enabled: !!familyGroupId,
    queryFn: async () => {
      if (!familyGroupId) return null;
      const response = await apiRequest("GET", `/api/family-groups/${familyGroupId}/family-data`);
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: monthlySpending, isLoading: monthlySpendingLoading } = useQuery<MonthlySpending[]>({
    queryKey: ["/api/spending/monthly"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/spending/monthly");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const { data: categorySpending, isLoading: categorySpendingLoading } = useQuery<SpendingByCategory[]>({
    queryKey: ["/api/spending/category"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/spending/category");
      return response.json();
    },
    refetchInterval: 30000,
  });

  const familySubscriptions = useMemo(
    () => getVisibleFamilySubscriptions(familyData, user?.id),
    [familyData, user?.id]
  );

  const subscriptions = showFamilyData === true ? familySubscriptions : personalSubscriptions;

  const monthlySpendingData = showFamilyData === true && familyData?.spending && familyData.spending.length > 0
    ? familyData.spending
    : monthlySpending;

  const categorySpendingData = showFamilyData === true && familyData?.byCategory && familyData.byCategory.length > 0
    ? familyData.byCategory
    : categorySpending;

  const normalizedMonthlySpending = normalizeMonthlySpendingSeries(monthlySpendingData, 6);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentMonthAmount = getCurrentMonthAmount(normalizedMonthlySpending);

  const yearToDateSpend = normalizedMonthlySpending.reduce((sum, entry) => {
    const parsed = new Date(`${entry.month} 1`);
    if (Number.isNaN(parsed.getTime()) || parsed.getFullYear() !== currentYear) return sum;
    return sum + entry.amount;
  }, 0);

  const remainingMonthsInYear = Math.max(0, 11 - currentMonth);
  const yearlyProjection = Math.round((yearToDateSpend + currentMonthAmount * remainingMonthsInYear) * 100) / 100;

  const totalMonthlySpend = metrics?.totalMonthlySpend ?? 0;
  const annualProjection = Number.isFinite(yearlyProjection) && yearlyProjection > 0
    ? yearlyProjection
    : Math.round(totalMonthlySpend * 12 * 100) / 100;
  const activeSubscriptions = (subscriptions || []).filter((sub) => sub?.status === "active").length;
  const potentialSavings = useMemo(
    () => calculatePotentialSavings(subscriptions || []),
    [subscriptions]
  );
  const unusedSubscriptionCount = metrics?.unusedSubscriptions ?? 0;
  const averageSubscriptionCost = activeSubscriptions > 0 ? Math.round((totalMonthlySpend / activeSubscriptions) * 100) / 100 : 0;
  const chartLoading = monthlySpendingLoading || categorySpendingLoading || (showFamilyData === true && !familyData);
  const heroTitle = potentialSavings > 0 ? `${formatAmount(potentialSavings)}/mo` : "No immediate savings";
  const heroSubtitle = potentialSavings > 0 ? `Subveris has identified ${formatAmount(potentialSavings)} in recoverable monthly spend.` : "Your subscriptions are currently balanced. Check back for new opportunities.";
  const metricCards = [
    {
      label: "Monthly spend",
      value: formatAmount(totalMonthlySpend),
      helper: "/mo",
      Icon: DollarSign,
      iconClass: "text-sky-500",
    },
    {
      label: "Yearly projection",
      value: formatAmount(annualProjection),
      helper: "/yr",
      Icon: BarChart3,
      iconClass: "text-emerald-500",
    },
    {
      label: "Active subscriptions",
      value: `${activeSubscriptions}`,
      helper: "active",
      Icon: Clock,
      iconClass: "text-violet-500",
    },
  ];

  const upcomingRenewals = useMemo(() => getUpcomingRenewals(subscriptions), [subscriptions]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
            Command Center
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            A clean overview of your subscription spend, top alerts, next renewals, and quick actions.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-6">
            <Card className="rounded-3xl border-transparent bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm dark:border-transparent dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-white">
              <CardHeader className="p-0">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.32em] text-slate-500 dark:text-slate-400">
                      Total potential savings
                    </p>
                    <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-900 dark:text-white">
                      {heroTitle}
                    </h2>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {heroSubtitle}
                    </p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-slate-900/10 text-slate-900 shadow-lg shadow-slate-900/10 dark:bg-white/10 dark:text-white">
                    <Sparkles className="h-7 w-7" />
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {metricCards.map((metric) => {
                const Icon = metric.Icon;
                return (
                  <Card key={metric.label} className="rounded-3xl shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 ${metric.iconClass} bg-opacity-20`}>
                        <Icon className={`h-5 w-5 ${metric.iconClass}`} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          {metric.label}
                        </p>
                        <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
                          {metric.value}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{metric.helper}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <Card className="rounded-3xl border-slate-200/80 bg-card p-6 shadow-sm">
              <CardHeader className="p-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                      Spending overview
                    </CardTitle>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Monthly trend and category breakdown.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <BarChart3 className="h-4 w-4" />
                    Chart
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-6 p-0">
                <SpendingChart
                  monthlyData={normalizedMonthlySpending}
                  categoryData={categorySpendingData}
                  isLoading={chartLoading}
                  trendLabel="Last 6 months"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="rounded-3xl border-slate-200/80 bg-card p-6 shadow-sm">
              <CardHeader className="p-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Quick actions</CardTitle>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage subscriptions faster.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-6 p-0">
                <div className="grid gap-3">
                  <Button
                    type="button"
                    className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                    onClick={() => window.location.assign("/subscriptions")}
                  >
                    + Add Subscription
                  </Button>

                  <Button
                    type="button"
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                    onClick={() => navigate("/cost-optimizer")}
                  >
                    Review AI recommendations
                  </Button>

                  <Button
                    type="button"
                    className="w-full rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900"
                    onClick={() => navigate("/calendar")}
                  >
                    View upcoming renewals
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-3xl border-slate-200/80 bg-card p-6 shadow-sm">
              <CardHeader className="p-0">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">Upcoming renewals</CardTitle>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Next 3 bills due this month.</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="mt-6 p-0">
                <div className="space-y-4">
                  {upcomingRenewals.length > 0 ? (
                    upcomingRenewals.map((renewal) => (
                      <div key={renewal.id} className="flex gap-4 rounded-3xl border border-slate-200/70 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950">
                          <Calendar className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-900 dark:text-white">{renewal.title}</p>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                              {renewal.frequency}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Due {formatShortDate(renewal.date)}</p>
                          <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                            {formatAmount(renewal.amount)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-3xl border border-dashed border-slate-300/70 bg-slate-50 px-4 py-10 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400">
                      No renewals due this month. Your next charges will appear here once they are scheduled.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
