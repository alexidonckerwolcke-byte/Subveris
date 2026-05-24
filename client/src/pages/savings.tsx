import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { getVisibleFamilySubscriptions } from "@/lib/family-data";
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
import { useCurrency, type Currency } from "@/lib/currency-context";
import { calculateMonthlyCost, isSubscriptionBilledInMonth } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
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

function isDeletedThisMonth(sub: Subscription) {
  if (getSubscriptionStatus(sub) !== 'deleted') return false;
  const ts = getSubscriptionDeletedTimestamp(sub);
  if (ts) {
    const date = new Date(ts);
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return date >= currentMonth && date < nextMonth;
  }
  return true;
}

function getSubscriptionStatus(sub: Subscription) {
  return String((sub as any).status || '').trim().toLowerCase();
}

function getSubscriptionUserId(sub: Subscription) {
  return (sub as any).userId || (sub as any).user_id || null;
}

function normalizeSubscriptionForSavings(sub: Subscription) {
  const normalized = { ...(sub as any) } as any;
  if (!normalized.userId && normalized.user_id) normalized.userId = normalized.user_id;
  if (!normalized.deletedAt && normalized.deleted_at) normalized.deletedAt = normalized.deleted_at;
  if (!normalized.createdAt && normalized.created_at) normalized.createdAt = normalized.created_at;
  if (!normalized.nextBillingDate && normalized.next_billing_at) normalized.nextBillingDate = normalized.next_billing_at;
  normalized.status = getSubscriptionStatus(sub);
  return normalized as Subscription;
}

function computeMonthlySavingsFromSubscriptions(subscriptions: Subscription[]) {
  const ownerSavings = subscriptions
    .filter((sub) => isDeletedThisMonth(sub))
    .reduce((total, sub) => {
      const monthlyAmount = calculateMonthlyCost((sub as any).amount, (sub as any).frequency);
      return total + monthlyAmount;
    }, 0);

  return Math.round(ownerSavings * 100) / 100;
}

function getCurrentMonthAmount(monthlyData: MonthlySpending[] | undefined) {
  if (!monthlyData || monthlyData.length === 0) return 0;
  const now = new Date();
  const currentMonthLabel = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
  const exactMatch = monthlyData.find((entry) => entry.month === currentMonthLabel);
  return exactMatch ? exactMatch.amount : 0;
}

function computeFamilySavingsBreakdown(
  subscriptions: Subscription[],
  currentUserId: string | undefined,
  convertAmountFn: (amount: number, fromCurrency?: any, toCurrency?: any) => number,
) {
  const ownerSavings = subscriptions
    .filter((sub) => {
      return getSubscriptionUserId(sub) === currentUserId && isDeletedThisMonth(sub);
    })
    .reduce((total, sub) => {
      const monthlyAmount = calculateMonthlyCost((sub as any).amount, (sub as any).frequency);
      return total + convertAmountFn(monthlyAmount, (sub as any).currency || 'USD', 'USD');
    }, 0);

  const memberSavings = subscriptions
    .filter((sub) => {
      const subscriptionUserId = getSubscriptionUserId(sub);
      return subscriptionUserId && subscriptionUserId !== currentUserId && isDeletedThisMonth(sub);
    })
    .reduce((total, sub) => {
      const monthlyAmount = calculateMonthlyCost((sub as any).amount, (sub as any).frequency);
      return total + convertAmountFn(monthlyAmount, (sub as any).currency || 'USD', 'USD');
    }, 0);

  return {
    ownerSavings: Math.round(ownerSavings * 100) / 100,
    memberSavings: Math.round(memberSavings * 100) / 100,
    totalSavings: Math.round((ownerSavings + memberSavings) * 100) / 100,
  };
}

function computeDeletedSubscriptionSavings(subscriptions: Subscription[]) {
  return subscriptions
    .filter((sub) => getSubscriptionStatus(sub) === 'deleted' && isDeletedThisMonth(sub))
    .reduce((total, sub) => {
      const monthlyAmount = calculateMonthlyCost((sub as any).amount, (sub as any).frequency);
      return total + monthlyAmount;
    }, 0);
}

function resolveFamilySavingsValue(serverValue: unknown, fallbackValue?: number) {
  const numericServerValue = typeof serverValue === 'number' ? serverValue : Number(serverValue);
  const fallbackNumber = typeof fallbackValue === 'number' ? fallbackValue : 0;
  if (!Number.isFinite(numericServerValue)) {
    return fallbackNumber;
  }

  if (numericServerValue === 0 && fallbackNumber !== 0) {
    return fallbackNumber;
  }

  if (fallbackNumber !== 0 && Math.abs(numericServerValue - fallbackNumber) > 0.01) {
    return fallbackNumber;
  }

  return numericServerValue;
}

export default function Savings() {
  const { formatAmount, convertAmount, currency } = useCurrency();
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
    refetchInterval: 30000, // Refetch every 30 seconds to see member deletions
  });

  const { data: familySavingsResponse, isLoading: familySavingsLoading } = useQuery<any>({
    queryKey: ["/api/analytics/monthly-savings", "family"],
    enabled: showFamilyData && !!user?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/analytics/monthly-savings?family=true");
      return response.json();
    },
  });

  const { data: personalSubscriptions } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  const personalDeletedSavings = useMemo(() => {
    if (!personalSubscriptions || personalSubscriptions.length === 0) return 0;
    return Math.round(computeDeletedSubscriptionSavings(personalSubscriptions) * 100) / 100;
  }, [personalSubscriptions]);

  const familySubscriptions = useMemo<Subscription[]>(() => {
    return getVisibleFamilySubscriptions(familyData, user?.id);
  }, [familyData, user?.id]);

  const familySavingsComputed = useMemo(() => {
    if (!familySubscriptions || familySubscriptions.length === 0) {
      return {
        potentialSavings: 0,
        thisMonthSavings: 0,
        thisMonthSavingsOwner: 0,
        thisMonthSavingsMembers: 0,
        unusedSubscriptions: 0,
      };
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const currentUserId = user?.id;

    const isDeletedThisMonth = (sub: Subscription) => {
      if (getSubscriptionStatus(sub) !== 'deleted') return false;
      const ts = getSubscriptionDeletedTimestamp(sub);
      if (!ts) return true;
      const date = new Date(ts);
      return date >= currentMonthStart && date < nextMonthStart;
    };

    const potentialSavings = familySubscriptions
      .filter((sub) => sub && (sub.status === 'unused' || sub.status === 'to-cancel'))
      .reduce((sum: number, sub) => {
        const monthlyAmount = calculateMonthlyCost((sub as any).amount, (sub as any).frequency);
        return sum + convertAmount(monthlyAmount, (sub as any).currency || 'USD', 'USD');
      }, 0);

    const thisMonthSavings = familySubscriptions
      .filter(isDeletedThisMonth)
      .reduce((sum: number, sub) => {
        const monthlyAmount = calculateMonthlyCost((sub as any).amount, (sub as any).frequency);
        return sum + convertAmount(monthlyAmount, (sub as any).currency || 'USD', 'USD');
      }, 0);

    const thisMonthSavingsOwner = familySubscriptions
      .filter((sub) => isDeletedThisMonth(sub) && getSubscriptionUserId(sub) === currentUserId)
      .reduce((sum: number, sub) => {
        const monthlyAmount = calculateMonthlyCost((sub as any).amount, (sub as any).frequency);
        return sum + convertAmount(monthlyAmount, (sub as any).currency || 'USD', 'USD');
      }, 0);

    const thisMonthSavingsMembers = familySubscriptions
      .filter((sub) => {
        const subscriptionUserId = getSubscriptionUserId(sub);
        return isDeletedThisMonth(sub) && subscriptionUserId && subscriptionUserId !== currentUserId;
      })
      .reduce((sum: number, sub) => {
        const monthlyAmount = calculateMonthlyCost((sub as any).amount, (sub as any).frequency);
        return sum + convertAmount(monthlyAmount, (sub as any).currency || 'USD', 'USD');
      }, 0);

    const unusedSubscriptions = familySubscriptions.filter((sub) => getSubscriptionStatus(sub) === 'unused').length;

    return {
      potentialSavings: Math.round(potentialSavings * 100) / 100,
      thisMonthSavings: Math.round(thisMonthSavings * 100) / 100,
      thisMonthSavingsOwner: Math.round(thisMonthSavingsOwner * 100) / 100,
      thisMonthSavingsMembers: Math.round(thisMonthSavingsMembers * 100) / 100,
      unusedSubscriptions,
    };
  }, [familySubscriptions, user?.id, convertAmount]);

  // Personal behavioral insights (always load)


  // compute metrics depending on mode
  let metrics: DashboardMetrics & { thisMonthSavingsOwner?: number; thisMonthSavingsMembers?: number } | undefined;
  let metricsLoading = showFamilyData ? familyDataLoading : personalMetricsLoading;

  if (showFamilyData) {
    const hasServerFamilyMetrics = familyData?.metrics && typeof familyData.metrics.totalMonthlySpending === 'number';
    // Use server spending series for both owners and members
    const familyMonthlyData = familyData?.spending && familyData.spending.length > 0 ? familyData.spending : [];
    const totalMonthlySpendFromSpendingData = getCurrentMonthAmount(familyMonthlyData);

    if (hasServerFamilyMetrics) {
      metrics = {
        totalMonthlySpend: totalMonthlySpendFromSpendingData,
        activeSubscriptions: familyData.metrics.activeSubscriptions || 0,
        potentialSavings: familySubscriptions.length > 0
          ? familySavingsComputed.potentialSavings
          : (familyData.metrics.potentialSavings || 0),
        thisMonthSavings: familySubscriptions.length > 0
          ? familySavingsComputed.thisMonthSavings
          : (familyData.metrics.thisMonthSavings || 0),
        unusedSubscriptions: familySubscriptions.length > 0
          ? familySavingsComputed.unusedSubscriptions
          : 0,
        thisMonthSavingsOwner: familySubscriptions.length > 0
          ? familySavingsComputed.thisMonthSavingsOwner
          : 0,
        thisMonthSavingsMembers: familySubscriptions.length > 0
          ? familySavingsComputed.thisMonthSavingsMembers
          : 0,
        averageCostPerUse: 0,
        monthlySpendChange: 0,
        newServicesTracked: 0,
      };
      metricsLoading = familyDataLoading;
    } else {
      // In family mode, calculate from family data only when server metrics are absent.
      const subs = familySubscriptions;
      const now = new Date();
      let calculatedMetrics: DashboardMetrics & { thisMonthSavingsOwner?: number; thisMonthSavingsMembers?: number } = {
        totalMonthlySpend: 0,
        activeSubscriptions: 0,
        potentialSavings: 0,
        thisMonthSavings: 0,
        thisMonthSavingsOwner: 0,
        thisMonthSavingsMembers: 0,
        unusedSubscriptions: 0,
        averageCostPerUse: 0,
        monthlySpendChange: 0,
        newServicesTracked: 0,
      };

      if (subs.length > 0) {
        // Only include subscriptions renewing in the current month.
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const totalMonthlySpend = subs.reduce((sum: number, s: Subscription) => {
          if (s.status !== 'active' && s.status !== 'unused' && s.status !== 'to-cancel' && s.status !== 'canceled') return sum;
          if (!isSubscriptionBilledInMonth(s, currentMonthStart, currentMonthEnd, now, true)) return sum;
          const monthlyCost = calculateMonthlyCost((s as any).amount, (s as any).frequency);
          return sum + convertAmount(monthlyCost, (s as any).currency || 'USD', 'USD');
        }, 0);

        const activeSubscriptions = subs.filter((s) => s.status === 'active').length;
        const unusedSubscriptions = subs.filter((s) => s.status === 'unused').length;
        const potentialSavings = subs
          .filter((s) => s.status === 'unused' || s.status === 'to-cancel')
          .reduce((sum: number, s) => {
            const monthlyCost = calculateMonthlyCost((s as any).amount, (s as any).frequency);
            return sum + convertAmount(monthlyCost, (s as any).currency || 'USD', 'USD');
          }, 0);

        const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const currentUserId = user?.id;

        const isDeletedThisMonth = (s: Subscription) => {
          if (getSubscriptionStatus(s) !== 'deleted') return false;
          const ts = getSubscriptionDeletedTimestamp(s);
          if (ts) {
            const d = new Date(ts);
            return d >= currentMonth && d < nextMonth;
          }
          return true;
        };

        const ownerSavings = subs
          .filter((s) => isDeletedThisMonth(s) && getSubscriptionUserId(s) === currentUserId)
          .reduce((sum: number, s) => {
            const monthlyCost = calculateMonthlyCost((s as any).amount, (s as any).frequency);
            return sum + convertAmount(monthlyCost, (s as any).currency || 'USD', 'USD');
          }, 0);

        const memberSavings = subs
          .filter((s) => {
            const subscriptionUserId = getSubscriptionUserId(s);
            return isDeletedThisMonth(s) && subscriptionUserId && subscriptionUserId !== currentUserId;
          })
          .reduce((sum: number, s) => {
            const monthlyCost = calculateMonthlyCost((s as any).amount, (s as any).frequency);
            return sum + convertAmount(monthlyCost, (s as any).currency || 'USD', 'USD');
          }, 0);

        const thisMonthSavingsAmount = subs
          .filter(isDeletedThisMonth)
          .reduce((sum: number, s) => {
            const monthlyCost = calculateMonthlyCost((s as any).amount, (s as any).frequency);
            return sum + convertAmount(monthlyCost, (s as any).currency || 'USD', 'USD');
          }, 0);

        const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const currentMonthSubs = subs.filter((s) => {
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
          const monthlyCost = calculateMonthlyCost((s as any).amount, (s as any).frequency);
          return sum + convertAmount(monthlyCost, (s as any).currency || 'USD', 'USD');
        }, 0);

        const monthlySpendChange = previousMonthSpend > 0
          ? Math.round(((totalMonthlySpend - previousMonthSpend) / previousMonthSpend) * 100)
          : 0;
        const newServicesTracked = currentMonthSubs.length;

        calculatedMetrics = {
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
        };
      }

      metrics = calculatedMetrics;
      metricsLoading = familyDataLoading;
    }
  } else {
    // Use personal metrics when not in family mode
    metrics = personalMetrics;
    metricsLoading = personalMetricsLoading;
  }

  // Personal spending (always load)
  const { data: personalSpending, isLoading: personalSpendingLoading } = useQuery<MonthlySpending[]>({
    queryKey: ["/api/spending/monthly"],
  });

  const spendingLoading = showFamilyData ? familyDataLoading : personalSpendingLoading;

  // Compute monthly spending from subscriptions for family mode
  function computeMonthlySpendingFromFamilySubscriptions() {
    if (!familySubscriptions || familySubscriptions.length === 0) return [];
    
    const now = new Date();
    const currentDayOfMonth = now.getDate();
    const months: { [key: string]: number } = {};
    
    // Create labels for last 6 months + current month (7 total)
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      months[label] = 0;
    }
    
    // Add subscription costs to months where they renew
    for (const sub of familySubscriptions) {
      if (!sub || sub.status === 'deleted' || sub.status === 'canceled') continue;
      if (sub.status !== 'active' && sub.status !== 'unused' && sub.status !== 'to-cancel') continue;
      
      const monthlyCost = convertAmount(
        calculateMonthlyCost(sub.amount || 0, sub.frequency || 'monthly'),
        (sub.currency as Currency) || 'USD',
        'USD'
      );
      
      // Check each month to see if this subscription should be included
      for (const [monthLabel, _] of Object.entries(months)) {
        let includeInMonth = false;
        const monthDate = new Date(monthLabel + " 1");
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59);
        const isCurrentMonth = monthDate.getFullYear() === now.getFullYear() && monthDate.getMonth() === now.getMonth();
        
        // Get the renewal date for this subscription
        if (isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, isCurrentMonth)) {
          includeInMonth = true;
        }
        
        if (includeInMonth) {
          months[monthLabel] += monthlyCost;
        }
      }
    }
    
    return Object.entries(months).map(([month, amount]) => ({ 
      month, 
      amount: Math.round(amount * 100) / 100 
    }));
  }

  // Use server data if available for owner views, otherwise compute from visible family subscriptions.
  const effectiveMonthlySpending = showFamilyData
    ? ((familyData?.spending && familyData.spending.length > 0)
        ? familyData.spending
        : computeMonthlySpendingFromFamilySubscriptions())
    : (personalSpending || []);

  // Normalize monthly spending into a fixed-length recent months series (defaults to 6 months)
  // Includes the current month and the previous months, with zero-fill for missing months.
  function normalizeMonthlySeries(data: MonthlySpending[] | undefined, months = 6) {
    const now = new Date();
    const monthLabels: string[] = [];

    for (let i = months; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push(monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' }));
    }

    const monthAmountMap = new Map<string, number>(monthLabels.map((label) => [label, 0]));

    if (data && data.length > 0) {
      for (const entry of data) {
        if (!entry || typeof entry.month !== 'string') continue;
        const normalizedMonth = entry.month.trim();
        if (monthAmountMap.has(normalizedMonth)) {
          monthAmountMap.set(normalizedMonth, Math.round((entry.amount || 0) * 100) / 100);
        }
      }
    }

    return monthLabels.map((month) => ({
      month,
      amount: monthAmountMap.get(month) ?? 0,
    }));
  }

  const chartMonthlyData = normalizeMonthlySeries(effectiveMonthlySpending, 6);

  // Editable savings goal logic (store in user's selected currency)
  // Default goal is a fixed baseline; we no longer auto‑populate using
  // potential savings because that causes the goal to track the savings
  // value and makes the progress bar appear full immediately when a
  // subscription is deleted.
  const defaultGoal = 500; // in USD, will be converted to user's currency
  const [storedGoal, setStoredGoal] = useState<number>(defaultGoal);
  const [hasLoadedGoal, setHasLoadedGoal] = useState(false);

  // Load/migrate stored goal on mount and when user/family mode changes
  // BUT NOT on currency change alone, to prevent losing user's custom goal
  useEffect(() => {
    // Use family-specific key in family mode, otherwise user-specific
    const keySuffix = showFamilyData && familyGroupId ? `-${familyGroupId}` : (user?.id ? `-${user.id}` : '');
    
    // Try to load from all possible keys (current currency first, then legacy keys)
    let found = false;
    
    // Try current currency key
    const stored = localStorage.getItem(`subveris-savings-goal-${currency}${keySuffix}`);
    if (stored) {
      const goalValue = Number(stored);
      if (!isNaN(goalValue) && goalValue >= 0) {
        setStoredGoal(goalValue);
        setDisplayInput(String(goalValue));
        setHasLoadedGoal(true);
        return;
      }
    }
    
    // Try USD legacy key
    const usdStored = localStorage.getItem(`subveris-savings-goal-usd${keySuffix}`);
    if (usdStored) {
      const usdValue = Number(usdStored);
      if (!isNaN(usdValue) && usdValue >= 0) {
        const currencyValue = Math.round(convertAmount(usdValue, 'USD', currency) * 100) / 100;
        setStoredGoal(currencyValue);
        localStorage.setItem(`subveris-savings-goal-${currency}${keySuffix}`, String(currencyValue));
        localStorage.removeItem(`subveris-savings-goal-usd${keySuffix}`);
        setDisplayInput(String(currencyValue));
        setHasLoadedGoal(true);
        return;
      }
    }

    // Try generic legacy key
    const legacy = localStorage.getItem(`subveris-savings-goal${keySuffix}`);
    if (legacy) {
      const legacyNum = Number(legacy);
      if (!isNaN(legacyNum) && legacyNum > 0) {
        setStoredGoal(legacyNum);
        localStorage.setItem(`subveris-savings-goal-${currency}${keySuffix}`, String(legacyNum));
        localStorage.removeItem(`subveris-savings-goal${keySuffix}`);
        setDisplayInput(String(legacyNum));
        setHasLoadedGoal(true);
        return;
      }
    }

    // No stored value found, use constant default converted to user's currency
    const defaultInCurrency = Math.round(convertAmount(defaultGoal, 'USD', currency) * 100) / 100;
    setStoredGoal(defaultInCurrency);
    setDisplayInput(String(defaultInCurrency));
    setHasLoadedGoal(true);
  }, [showFamilyData, familyGroupId, user?.id]); // Only rerun on user/family mode change, NOT on currency alone

  // When currency changes, update the displayed input to show the new currency value
  // but don't change the actual stored goal
  useEffect(() => {
    if (!hasLoadedGoal) return; // Wait for goal to be loaded first
    
    const keySuffix = showFamilyData && familyGroupId ? `-${familyGroupId}` : (user?.id ? `-${user.id}` : '');
    const stored = localStorage.getItem(`subveris-savings-goal-${currency}${keySuffix}`);
    
    if (stored) {
      const goalValue = Number(stored);
      if (!isNaN(goalValue) && goalValue >= 0) {
        setStoredGoal(goalValue);
        // Only update display if not focused (user not actively typing)
        if (!isInputFocused) {
          setDisplayInput(String(goalValue));
        }
      }
    }
  }, [currency, hasLoadedGoal]);

  // displayGoal is shown in the input (in the user's selected currency)
  const computedDisplayGoal = storedGoal;

  // local input state to avoid immediate overwrite while typing
  const [displayInput, setDisplayInput] = useState<string>(String(computedDisplayGoal));
  const [isInputFocused, setIsInputFocused] = useState(false);

  // keep displayInput in sync when currency or storedGoal changes (unless user is actively typing)
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
    setStoredGoal(roundedDisplayVal);
    // Use family-specific key in family mode, otherwise user-specific
    const keySuffix = showFamilyData && familyGroupId ? `-${familyGroupId}` : (user?.id ? `-${user.id}` : '');
    localStorage.setItem(`subveris-savings-goal-${currency}${keySuffix}`, String(roundedDisplayVal));
    // Notify other components in this window that the savings goal was updated
    try {
      window.dispatchEvent(new CustomEvent('savingsGoalUpdated', { detail: convertAmount(roundedDisplayVal, currency, 'USD') }));
    } catch (e) {
      // ignore in non-browser environments
    }
    // Update display input with the rounded value
    setDisplayInput(String(roundedDisplayVal));
  };

  const fallbackFamilySavings = computeFamilySavingsBreakdown(familySubscriptions, user?.id, convertAmount);
  const familySavings = showFamilyData
    ? {
        totalSavings: resolveFamilySavingsValue(
          familySavingsResponse?.monthlySavings,
          metrics?.thisMonthSavings ?? fallbackFamilySavings.totalSavings,
        ),
        ownerSavings: resolveFamilySavingsValue(
          familySavingsResponse?.ownerMonthlySavings,
          metrics?.thisMonthSavingsOwner ?? fallbackFamilySavings.ownerSavings,
        ),
        memberSavings: resolveFamilySavingsValue(
          familySavingsResponse?.memberMonthlySavings,
          metrics?.thisMonthSavingsMembers ?? fallbackFamilySavings.memberSavings,
        ),
      }
    : { ownerSavings: 0, memberSavings: 0, totalSavings: 0 };

  const currentSavings = showFamilyData
    ? familySavings.totalSavings
    : Math.max(metrics?.thisMonthSavings ?? 0, personalDeletedSavings);
  const familyOwnerSavings = showFamilyData
    ? familySavings.ownerSavings
    : 0;
  const familyMemberSavings = showFamilyData
    ? familySavings.memberSavings
    : 0;

  const currentSavingsInCurrency = convertAmount(currentSavings, 'USD', currency);
  const familyOwnerSavingsInCurrency = convertAmount(familyOwnerSavings, 'USD', currency);
  const familyMemberSavingsInCurrency = convertAmount(familyMemberSavings, 'USD', currency);

  const savingsProgress = storedGoal > 0
    ? Math.min((currentSavingsInCurrency / storedGoal) * 100, 100)
    : 0;
  const projectedAnnualSavings = computedDisplayGoal * 12; // in user's currency

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-popover-border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{label}</p>
          <p className="text-sm text-chart-1">
            {formatAmount(payload[0].value, 'USD')}
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
            Track your progress and achieve your savings goals.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">
            Use this page to measure real savings, set a monthly target, and see what your family is saving together when shared mode is enabled.
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
                    {formatAmount(currentSavingsInCurrency, currency)}
                  </span>
                  {showFamilyData && (
                    <span className="text-xs text-muted-foreground mt-1 block" data-testid="text-current-savings-breakdown">
                      You: {formatAmount(familyOwnerSavingsInCurrency, currency)} · Members: {formatAmount(familyMemberSavingsInCurrency, currency)}
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
                    {formatAmount(metrics?.potentialSavings || 0, 'USD')}
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
                    {formatAmount(currentSavingsInCurrency, currency)} of {formatAmount(computedDisplayGoal, currency)}
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
                      interval={0}
                      minTickGap={12}
                    />
                    <YAxis
                      tickFormatter={(value) => formatAmount(value, 'USD')}
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
                      dot={{ r: 3, fill: "hsl(var(--chart-1))" }}
                      activeDot={{ r: 4 }}
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
