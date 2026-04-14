import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import {
  PiggyBank,
  TrendingUp,
  Target,
  Calendar,
  ChevronRight,
  Trophy,
  Zap,
} from "lucide-react";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DashboardMetrics, MonthlySpending, Subscription } from "@shared/schema";
import { useCurrency } from "@/lib/currency-context";
import { calculateMonthlyCost } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
 
function isTimestampInCurrentMonth(timestamp?: string | null) {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return date >= currentMonth && date < nextMonth;
}

function getSubscriptionDeletedTimestamp(sub: Subscription) {
  return (
    (sub as any).deleted_at ||
    (sub as any).deletedAt ||
    (sub as any).updated_at ||
    (sub as any).updatedAt ||
    null
  ) as string | null;
}

export default function Savings() {
  const { formatAmount, convertAmount } = useCurrency();
  const { user } = useAuth();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();

  // Personal metrics (always load)
  const { data: personalMetrics, isLoading: personalMetricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/metrics"],
  });

  // Family data (load if in family group)
  const { data: familyData, isLoading: familyDataLoading } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "family-data"],
    enabled: !!familyGroupId,
  });

  // Personal behavioral insights (always load)


  // compute metrics depending on mode
  let metrics: DashboardMetrics & { thisMonthSavingsOwner?: number; thisMonthSavingsMembers?: number } | undefined = personalMetrics;
  let metricsLoading = showFamilyData ? familyDataLoading : personalMetricsLoading;

  if (showFamilyData) {
    if (familyData?.subscriptions && familyData.subscriptions.length > 0) {
      const subs = familyData.subscriptions as Subscription[];
      const totalMonthlySpend = subs.reduce((sum: number, s: Subscription) => {
        return sum + calculateMonthlyCost((s as any).amount, (s as any).frequency);
      }, 0);
      const activeSubscriptions = subs.filter((s) => s.status === "active").length;
      const unusedSubscriptions = subs.filter((s) => s.status === "unused").length;
      const potentialSavings = subs
        .filter((s) => s.status === "unused" || s.status === "to-cancel")
        .reduce((sum: number, s) => sum + calculateMonthlyCost((s as any).amount, (s as any).frequency), 0);

      // actual savings this month should be based on subscriptions the user has
      // deleted (they represent money they've actually removed). "to-cancel"
      // remains only for planning/potential calculation.
      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const ownerId = user?.id;

      const isDeletedThisMonth = (s: Subscription) => {
        if (s.status !== "deleted") return false;
        const ts = getSubscriptionDeletedTimestamp(s);
        return isTimestampInCurrentMonth(ts);
      };

      const ownerSavings = subs
        .filter((s) => isDeletedThisMonth(s) && s.userId === ownerId)
        .reduce((sum: number, s) => {
          const monthlyCost = calculateMonthlyCost((s as any).amount, (s as any).frequency);
          // Convert to USD for consistent goal comparison
          return sum + convertAmount(monthlyCost, (s as any).currency || 'USD', 'USD');
        }, 0);

      const memberSavings = subs
        .filter((s) => isDeletedThisMonth(s) && s.userId !== ownerId)
        .reduce((sum: number, s) => {
          const monthlyCost = calculateMonthlyCost((s as any).amount, (s as any).frequency);
          // Convert to USD for consistent goal comparison
          return sum + convertAmount(monthlyCost, (s as any).currency || 'USD', 'USD');
        }, 0);

      const thisMonthSavingsAmount = ownerSavings + memberSavings;

      const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      const currentMonthSubs = subs.filter((s) => {
        // subscription records coming over the wire may have either
        // `created_at` or `createdAt` depending on origin; neither property is
        // typed on the shared Subscription interface, so just coerce to `any`.
        const ts = (s as any).created_at || (s as any).createdAt;
        const d = ts ? new Date(ts) : new Date();
        return d >= currentMonth && d < nextMonth;
      });
      const previousMonthSubs = subs.filter((s) => {
        const ts = (s as any).created_at || (s as any).createdAt;
        const d = ts ? new Date(ts) : new Date();
        return d >= previousMonth && d < currentMonth;
      });

      const previousMonthSpend = previousMonthSubs.reduce((sum: number, s: Subscription) => {
        return sum + calculateMonthlyCost((s as any).amount, (s as any).frequency);
      }, 0);

      const monthlySpendChange = previousMonthSpend > 0
        ? Math.round(((totalMonthlySpend - previousMonthSpend) / previousMonthSpend) * 100)
        : 0;
      const newServicesTracked = currentMonthSubs.length;

      metrics = {
        totalMonthlySpend,
        activeSubscriptions,
        potentialSavings,
        thisMonthSavings: thisMonthSavingsAmount,
        thisMonthSavingsOwner: ownerSavings,
        thisMonthSavingsMembers: memberSavings,
        unusedSubscriptions,
        averageCostPerUse: 0,
        monthlySpendChange,
        newServicesTracked,
      } as DashboardMetrics & { thisMonthSavingsOwner?: number; thisMonthSavingsMembers?: number };
    }
    metricsLoading = familyDataLoading;
  }

  // Personal spending (always load)
  const { data: personalSpending, isLoading: personalSpendingLoading } = useQuery<MonthlySpending[]>({
    queryKey: ["/api/spending/monthly"],
  });

  const spendingLoading = showFamilyData ? familyDataLoading : personalSpendingLoading;

  // Compute monthly spending from subscriptions for family mode
  function computeMonthlySpendingFromFamilySubscriptions() {
    if (!familyData?.subscriptions || familyData.subscriptions.length === 0) return [];
    
    const now = new Date();
    const months: { [key: string]: number } = {};
    
    // Create labels for last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      months[label] = 0;
    }
    
    // Add subscription costs to appropriate months
    for (const sub of familyData.subscriptions) {
      if (!sub || sub.status === 'deleted' || sub.status === 'canceled') continue;
      const monthlyCost = calculateMonthlyCost(sub.amount || 0, sub.frequency || 'monthly');
      
      // Only add subscription cost from creation month forward
      const createdDate = sub.createdAt ? new Date(sub.createdAt) : now;
      const createdMonthLabel = createdDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      
      // Find if created month exists in our 12-month range
      let foundStart = false;
      for (const label of Object.keys(months)) {
        if (label === createdMonthLabel) foundStart = true;
        if (foundStart) {
          months[label] += monthlyCost;
        }
      }
      
      // If subscription was created before our 12-month window, add to all months
      if (!foundStart) {
        for (const label of Object.keys(months)) {
          months[label] += monthlyCost;
        }
      }
    }
    
    return Object.entries(months).map(([month, amount]) => ({ 
      month, 
      amount: Math.round(amount * 100) / 100 
    }));
  }

  // Use server data if available, otherwise compute from subscriptions for family mode
  const effectiveMonthlySpending = showFamilyData
    ? (familyData?.spending && familyData.spending.length > 0 ? familyData.spending : computeMonthlySpendingFromFamilySubscriptions())
    : (personalSpending || []);

  // Normalize monthly spending into a fixed-length recent months series (defaults to 6 months)
  // Shows the last 6 COMPLETE months (not including current month) so historical data stays fixed
  function normalizeMonthlySeries(data: MonthlySpending[] | undefined, months = 6) {
    if (!data || data.length === 0) {
      return [];
    }

    // Sort data by date (assuming month format is "MMM YYYY")
    const sortedData = [...data].sort((a, b) => {
      const dateA = new Date(a.month + " 1");
      const dateB = new Date(b.month + " 1");
      return dateA.getTime() - dateB.getTime();
    });

    // Get the most recent months, excluding current month
    const now = new Date();
    const currentMonthKey = now.toLocaleString("en-US", { month: "short", year: "numeric" });

    // Filter out current month and get the last 'months' entries
    const historicalData = sortedData.filter(item => item.month !== currentMonthKey);
    return historicalData.slice(-months);
  }

  const chartMonthlyData = normalizeMonthlySeries(effectiveMonthlySpending, 6);

  // Editable savings goal logic (store canonical value in USD)
  // Default goal is a fixed baseline; we no longer auto‑populate using
  // potential savings because that causes the goal to track the savings
  // value and makes the progress bar appear full immediately when a
  // subscription is deleted.
  const defaultGoalUSD = 500; // USD
  const { currency } = useCurrency();

  const [storedGoalUSD, setStoredGoalUSD] = useState<number>(defaultGoalUSD);

  // Load/migrate stored goal on mount and when family mode changes
  useEffect(() => {
    // Use family-specific key in family mode, otherwise user-specific
    const keySuffix = showFamilyData && familyGroupId ? `-${familyGroupId}` : (user?.id ? `-${user.id}` : '');
    const usdStored = localStorage.getItem(`subveris-savings-goal-usd${keySuffix}`);
    const legacy = localStorage.getItem(`subveris-savings-goal${keySuffix}`);
    
    if (usdStored) {
      const usdValue = Number(usdStored);
      if (!isNaN(usdValue) && usdValue >= 0) {
        setStoredGoalUSD(usdValue);
        // Update display input when goal changes
        const displayBack = Math.round(convertAmount(usdValue, 'USD', currency) * 100) / 100;
        setDisplayInput(String(displayBack));
      }
      return;
    }
    
    if (legacy) {
      // Legacy value might have been stored in the user's selected currency — convert to USD
      const legacyNum = Number(legacy);
      if (!isNaN(legacyNum) && legacyNum >= 0) {
        try {
          const migrated = Math.round(convertAmount(legacyNum, currency, 'USD') * 100) / 100;
          setStoredGoalUSD(migrated);
          localStorage.setItem(`subveris-savings-goal-usd${keySuffix}`, String(migrated));
          localStorage.removeItem(`subveris-savings-goal${keySuffix}`);
          // Update display input when goal changes
          const displayBack = Math.round(convertAmount(migrated, 'USD', currency) * 100) / 100;
          setDisplayInput(String(displayBack));
        } catch (e) {
          setStoredGoalUSD(defaultGoalUSD);
          setDisplayInput(String(defaultGoalUSD));
        }
      } else {
        setStoredGoalUSD(defaultGoalUSD);
        setDisplayInput(String(defaultGoalUSD));
      }
      return;
    }
    
    // No stored value, use constant default
    setStoredGoalUSD(defaultGoalUSD);
    setDisplayInput(String(defaultGoalUSD));
  }, [showFamilyData, familyGroupId, user?.id, currency]); // Include all dependencies

  // displayGoal is shown in the input (in the user's selected currency)
  const computedDisplayGoal = Math.round(convertAmount(storedGoalUSD, 'USD', currency) * 100) / 100;

  // local input state to avoid immediate overwrite while typing
  const [displayInput, setDisplayInput] = useState<string>(String(computedDisplayGoal));
  const [isInputFocused, setIsInputFocused] = useState(false);

  // keep displayInput in sync when currency or storedGoalUSD changes (unless user is actively typing)
  useEffect(() => {
    // Only update if the input is not focused (user is not actively typing)
    if (!isInputFocused) {
      setDisplayInput(String(computedDisplayGoal));
    }
  }, [computedDisplayGoal, currency, isInputFocused]);

  const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // allow user to type freely; we'll validate/commit on blur
    setDisplayInput(e.target.value);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    setIsInputFocused(false);
    commitDisplayInput();
  };

  const commitDisplayInput = () => {
    const displayVal = Math.max(0, Number(displayInput) || 0);
    // Round to 2 decimal places to avoid precision issues
    const roundedDisplayVal = Math.round(displayVal * 100) / 100;
    const usd = convertAmount(roundedDisplayVal, currency, 'USD');
    // Round USD value to avoid accumulating precision errors
    const roundedUSD = Math.round(usd * 100) / 100;
    setStoredGoalUSD(roundedUSD);
    // Use family-specific key in family mode, otherwise user-specific
    const keySuffix = showFamilyData && familyGroupId ? `-${familyGroupId}` : (user?.id ? `-${user.id}` : '');
    localStorage.setItem(`subveris-savings-goal-usd${keySuffix}`, String(roundedUSD));
    // Notify other components in this window that the savings goal was updated
    try {
      window.dispatchEvent(new CustomEvent('savingsGoalUpdated', { detail: roundedUSD }));
    } catch (e) {
      // ignore in non-browser environments
    }
    // Update display input with the properly converted value
    const displayBack = Math.round(convertAmount(roundedUSD, 'USD', currency) * 100) / 100;
    setDisplayInput(String(displayBack));
  };

  const currentSavings = metrics?.thisMonthSavings || 0; // USD
  const familyOwnerSavings = showFamilyData ? metrics?.thisMonthSavingsOwner || 0 : 0;
  const familyMemberSavings = showFamilyData ? metrics?.thisMonthSavingsMembers || 0 : 0;
  const savingsProgress = storedGoalUSD > 0 ? Math.min((currentSavings / storedGoalUSD) * 100, 100) : 0;
  const projectedAnnualSavings = computedDisplayGoal * 12; // in user's currency

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-popover-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-chart-1">
            {formatAmount(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="mb-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Savings</h1>
          <p className="text-muted-foreground">
            Track your progress and achieve your savings goals
          </p>
        </div>



        <div className="grid gap-4 md:grid-cols-4">
          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-2/10">
                  <PiggyBank className="h-5 w-5 text-chart-2" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  This Month
                </span>
              </div>
              {metricsLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <>
                  <span className="text-3xl font-bold text-chart-2 dark:text-foreground" data-testid="text-current-savings">
                    {formatAmount(currentSavings)}
                  </span>
                  {showFamilyData && (
                    <span className="text-xs text-muted-foreground mt-1 block" data-testid="text-current-savings-breakdown">
                      You: {formatAmount(familyOwnerSavings)} · Members: {formatAmount(familyMemberSavings)}
                    </span>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-1/10">
                  <Zap className="h-5 w-5 text-chart-1" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Potential
                </span>
              </div>
              {metricsLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <span className="text-3xl font-bold text-chart-2 dark:text-foreground" data-testid="text-potential-savings">
                  {formatAmount(metrics?.potentialSavings || 0)}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </span>
              )}
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-4/10">
                  <Calendar className="h-5 w-5 text-chart-4" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Yearly Projection
                </span>
              </div>
              {metricsLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <span className="text-3xl font-bold text-chart-2 dark:text-foreground" data-testid="text-yearly-projection">
                  {formatAmount(projectedAnnualSavings, currency)}
                </span>
              )}
            </CardContent>
          </Card>

          <Card className="hover-elevate">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-chart-3/10">
                  <Trophy className="h-5 w-5 text-chart-3" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">
                  Goal Progress
                </span>
              </div>
              {metricsLoading ? (
                <Skeleton className="h-9 w-24" />
              ) : (
                <span className="text-3xl font-bold text-foreground">
                  {Math.round(savingsProgress)}%
                </span>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Target className="h-5 w-5" />
                {showFamilyData ? "Family Savings Goal" : "Savings Goal"}
              </CardTitle>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={displayInput}
                  onChange={handleGoalChange}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  className="w-24 px-2 py-1 border rounded text-right font-mono text-base focus:outline-none focus:ring-2 focus:ring-primary bg-background dark:bg-slate-800 dark:text-white"
                  aria-label="Edit savings goal"
                />
                <span className="text-muted-foreground text-sm">/mo</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {showFamilyData ? "Family progress this month" : "Progress this month"}
                  </span>
                  <span className="font-medium">
                    {formatAmount(currentSavings)} of {formatAmount(computedDisplayGoal, currency)}
                  </span>
                </div>
                <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-chart-2 to-chart-1 transition-all duration-500 rounded-full"
                    style={{ width: `${savingsProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Spending Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {spendingLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px]" data-testid="chart-savings-trend">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartMonthlyData}
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorSpending" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tickFormatter={(value) => formatAmount(value)}
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={{ stroke: "hsl(var(--border))" }}
                      tickLine={{ stroke: "hsl(var(--border))" }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorSpending)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
