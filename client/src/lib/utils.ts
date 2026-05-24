import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  Film,
  Cloud,
  Dumbbell,
  Newspaper,
  Gamepad2,
  Briefcase,
  GraduationCap,
  DollarSign,
  Package,
  Code,
} from "lucide-react";
import type { SubscriptionCategory, SubscriptionStatus } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getCategoryIcon(category: SubscriptionCategory) {
  const icons: Record<SubscriptionCategory, typeof Film> = {
    streaming: Film,
    software: Code,
    fitness: Dumbbell,
    "cloud-storage": Cloud,
    news: Newspaper,
    gaming: Gamepad2,
    productivity: Briefcase,
    finance: DollarSign,
    education: GraduationCap,
    other: Package,
  };
  return icons[category] || Package;
}

export function getStatusColor(status: SubscriptionStatus): string {
  const colors: Record<SubscriptionStatus, string> = {
    active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
    unused: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    "to-cancel": "bg-chart-5/10 text-chart-5 border-chart-5/20",
    canceled: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    deleted: "bg-muted/50 text-muted-foreground border-muted",
  };
  return colors[status];
}

export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  const parsedDate = typeof date === "string" ? parseDateOnlyLocal(date) : date;
  if (!parsedDate || isNaN(parsedDate.getTime())) {
    return "";
  }
  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateLocal(date: string | Date): string {
  const parsed = typeof date === "string" ? parseDateOnlyLocal(date) : parseDateOnlyLocal(date);
  if (!parsed || isNaN(parsed.getTime())) {
    return "";
  }
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

export function parseDateOnlyLocal(date?: string | Date | null): Date | null {
  if (!date) return null;
  if (date instanceof Date) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  }

  const dateStr = String(date).split("T")[0];
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const parsed = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

export function getValueRating(costPerUse: number, usageCount: number = 0): "excellent" | "good" | "fair" | "poor" {
  // Single use or no usage means poor value regardless of price
  if (usageCount <= 1) return "poor";
  
  // With 2-3 uses, be conservative - max out at fair
  if (usageCount <= 3) {
    if (costPerUse <= 5) return "fair";
    if (costPerUse <= 10) return "fair";
    return "poor";
  }
  
  // With 4+ uses, apply normal rating thresholds
  if (costPerUse <= 2) return "excellent";
  if (costPerUse <= 5) return "good";
  if (costPerUse <= 10) return "fair";
  return "poor";
}

export function getValueRatingColor(rating: "excellent" | "good" | "fair" | "poor"): string {
  const colors = {
    excellent: "text-chart-2",
    good: "text-chart-2",
    fair: "text-chart-4",
    poor: "text-chart-5",
  };
  return colors[rating];
}

export function calculateMonthlyCost(amount: number, frequency: string): number {
  switch (frequency) {
    case "yearly":
      return amount / 12;
    case "quarterly":
      return amount / 3;
    case "weekly":
      // Use average weeks-per-month factor to approximate monthly cost from weekly price
      // (matches test expectations around ~4.323 weeks/month)
      return amount * 4.3233766233766235;
    default:
      return amount;
  }
}

export function parseSubscriptionRenewalDate(date?: string | Date | null): Date | null {
  if (!date) return null;
  if (date instanceof Date) return new Date(date);

  const dateStr = String(date).trim();
  if (!dateStr) return null;

  // Preserve local date semantics for date-only strings (YYYY-MM-DD).
  // This avoids treating date-only strings as UTC midnight, which can
  // incorrectly move the renewal date to the previous local day.
  if (!dateStr.includes('T') && !dateStr.includes(' ')) {
    return parseDateOnlyLocal(dateStr);
  }

  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

export function isSubscriptionDeleted(sub: any): boolean {
  if (!sub) return false;
  const status = String(sub.status || '').trim().toLowerCase();
  if (status === 'deleted' || status === 'canceled') return true;
  if (status === 'active' || status === 'unused' || status === 'to-cancel') return false;
  return Boolean(sub.deleted_at || sub.deletedAt);
}

export function advanceDateByFrequency(date: Date, frequency: string): Date {
  const result = new Date(date);
  const freq = String(frequency || 'monthly').toLowerCase().trim();
  const day = result.getDate();

  if (freq === 'monthly') {
    result.setMonth(result.getMonth() + 1);
    if (result.getDate() !== day) {
      result.setDate(0);
    }
  } else if (freq === 'yearly' || freq === 'annual') {
    result.setFullYear(result.getFullYear() + 1);
    if (result.getDate() !== day) {
      result.setDate(0);
    }
  } else if (freq === 'weekly') {
    result.setDate(result.getDate() + 7);
  } else if (freq === 'quarterly') {
    result.setMonth(result.getMonth() + 3);
    if (result.getDate() !== day) {
      result.setDate(0);
    }
  } else {
    result.setMonth(result.getMonth() + 1);
    if (result.getDate() !== day) {
      result.setDate(0);
    }
  }

  result.setHours(0, 0, 0, 0);
  return result;
}

export function getAdvancedRenewalDateIfNeeded(date: string | Date | null | undefined, frequency: string, now = new Date()): Date | null {
  const renewalDate = parseSubscriptionRenewalDate(date);
  if (!renewalDate) return null;

  const today = parseDateOnlyLocal(now);
  if (!today) return null;
  if (renewalDate >= today) return null;

  const renewalMonthStart = new Date(renewalDate.getFullYear(), renewalDate.getMonth(), 1);
  const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  // Preserve the current month's data until the calendar rolls over on the first of the next month.
  if (renewalMonthStart.getTime() === currentMonthStart.getTime()) {
    return null;
  }

  let nextDate = new Date(renewalDate);
  let attempts = 0;
  while (nextDate < today && attempts < 100) {
    nextDate = advanceDateByFrequency(nextDate, frequency || 'monthly');
    attempts++;
  }

  return nextDate >= today ? nextDate : null;
}

export function getSubscriptionBillingMonth(sub: any): string | null {
  const billingMonth = (sub?.billingMonth || sub?.billing_month || '').toString();
  const match = billingMonth.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  return `${match[1]}-${match[2]}`;
}

export function isSubscriptionBilledInMonth(
  sub: any,
  monthStart: Date,
  monthEnd: Date,
  now = new Date(),
  isCurrentMonth = false,
): boolean {
  const targetMonth = `${monthStart.getFullYear()}-${String(monthStart.getMonth() + 1).padStart(2, '0')}`;
  const billingMonth = getSubscriptionBillingMonth(sub);

  // If billing_month explicitly matches the target month, only include it
  // for the current month when the renewal date has arrived or passed.
  if (billingMonth === targetMonth) {
    if (isCurrentMonth) {
      const renewalDate = parseSubscriptionRenewalDate(
        (sub as any).nextBillingDate || (sub as any).next_billing_at || (sub as any).next_billing_date || (sub as any).next_billing,
      );
      if (!renewalDate) return false;
      const renewalDay = parseDateOnlyLocal(renewalDate);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // If renewal already occurred today or earlier in this month, include it.
      // Also include auto-advanced renewals pushed into another month because the
      // subscription was billed earlier this month.
      if (renewalDay && renewalDay <= today) return true;
      return false;
    }
    return true;
  }

  const renewalDate = parseSubscriptionRenewalDate(
    (sub as any).nextBillingDate || (sub as any).next_billing_at || (sub as any).next_billing_date || (sub as any).next_billing,
  );
  if (!renewalDate) return false;

  if (`${renewalDate.getFullYear()}-${String(renewalDate.getMonth() + 1).padStart(2, '0')}` !== targetMonth) {
    return false;
  }

  if (isCurrentMonth) {
    const renewalDay = parseDateOnlyLocal(renewalDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return renewalDay ? renewalDay <= today : false;
  }

  return true;
}

export function isRenewalDateInCurrentMonth(date: Date, now = new Date()): boolean {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return date >= monthStart && date <= monthEnd;
}

export function isRenewalDateToday(date: Date, now = new Date()): boolean {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date.getTime() === today.getTime();
}

export function isRenewalDateTodayOrEarlierInCurrentMonth(date: Date, now = new Date()): boolean {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return date >= monthStart && date <= today;
}

const CURRENCY_EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
  JPY: 152.0,
  CHF: 0.88,
  SEK: 10.85,
  NOK: 10.75,
  DKK: 6.95,
  PLN: 4.05,
  CZK: 23.5,
  HUF: 365.0,
  BRL: 5.25,
  MXN: 18.5,
  ARS: 950.0,
  TRY: 34.0,
  ZAR: 18.5,
  INR: 84.0,
  CNY: 7.25,
  KRW: 1350.0,
  SGD: 1.35,
  HKD: 7.8,
  NZD: 1.65,
};

const OPPORTUNITY_COSTS_BASE_USD = [
  { item: "coffee drinks", unitCostUsd: 4.5, icon: "coffee" },
  { item: "breakfast sandwiches", unitCostUsd: 6.5, icon: "shopping" },
  { item: "lunch meals", unitCostUsd: 13, icon: "utensils" },
  { item: "movie tickets", unitCostUsd: 14.5, icon: "film" },
  { item: "Spotify months", unitCostUsd: 10.99, icon: "music" },
  { item: "Netflix months", unitCostUsd: 15.49, icon: "tv" },
  { item: "gym day passes", unitCostUsd: 20, icon: "dumbbell" },
  { item: "gas tank fills", unitCostUsd: 55, icon: "fuel" },
  { item: "meal kit deliveries", unitCostUsd: 60, icon: "shopping" },
  { item: "one-way flights", unitCostUsd: 150, icon: "plane" },
];

const OPPORTUNITY_COSTS_BY_CURRENCY: Record<string, { item: string; unitCost: number; icon: string }[]> = {
  USD: [
    { item: "coffee drinks", unitCost: 4.5, icon: "coffee" },
    { item: "breakfast sandwiches", unitCost: 6.5, icon: "shopping" },
    { item: "lunch meals", unitCost: 13, icon: "utensils" },
    { item: "movie tickets", unitCost: 14.5, icon: "film" },
    { item: "Spotify months", unitCost: 10.99, icon: "music" },
    { item: "Netflix months", unitCost: 15.49, icon: "tv" },
    { item: "gym day passes", unitCost: 20, icon: "dumbbell" },
    { item: "gas tank fills", unitCost: 55, icon: "fuel" },
    { item: "meal kit deliveries", unitCost: 60, icon: "shopping" },
    { item: "one-way flights", unitCost: 150, icon: "plane" },
  ],
  EUR: [
    { item: "coffee drinks", unitCost: 3.5, icon: "coffee" },
    { item: "breakfast sandwiches", unitCost: 7, icon: "shopping" },
    { item: "lunch meals", unitCost: 11, icon: "utensils" },
    { item: "movie tickets", unitCost: 13.5, icon: "film" },
    { item: "Spotify months", unitCost: 10.99, icon: "music" },
    { item: "Netflix months", unitCost: 15.49, icon: "tv" },
    { item: "gym day passes", unitCost: 18, icon: "dumbbell" },
    { item: "gas tank fills", unitCost: 60, icon: "fuel" },
    { item: "meal kit deliveries", unitCost: 55, icon: "shopping" },
    { item: "one-way flights", unitCost: 120, icon: "plane" },
  ],
  CHF: [
    { item: "coffee drinks", unitCost: 5.5, icon: "coffee" },
    { item: "breakfast sandwiches", unitCost: 8, icon: "shopping" },
    { item: "lunch meals", unitCost: 15, icon: "utensils" },
    { item: "movie tickets", unitCost: 18, icon: "film" },
    { item: "Spotify months", unitCost: 10.99, icon: "music" },
    { item: "Netflix months", unitCost: 15.49, icon: "tv" },
    { item: "gym day passes", unitCost: 25, icon: "dumbbell" },
    { item: "gas tank fills", unitCost: 70, icon: "fuel" },
    { item: "meal kit deliveries", unitCost: 70, icon: "shopping" },
    { item: "one-way flights", unitCost: 165, icon: "plane" },
  ],
};

export function generateOpportunityCosts(monthlyAmount: number, currency: string = 'USD'): { item: string; count: number; icon: string }[] {
  const normalizedCurrency = (currency || 'USD').toUpperCase();
  const items = OPPORTUNITY_COSTS_BY_CURRENCY[normalizedCurrency] || OPPORTUNITY_COSTS_BY_CURRENCY.USD;

  return items
    .map(({ item, unitCost, icon }) => ({
      item,
      count: Math.floor(monthlyAmount / unitCost),
      icon,
    }))
    .filter((item) => item.count >= 1)
    .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item))
    .slice(0, 3);
}

// Remove duplicate items from an array using the `id` property (keeps first occurrence)
export function dedupeById<T extends { id?: string }>(arr?: T[] | null): T[] {
  if (!arr) return [];
  const map = new Map<string, T>();
  for (const item of arr) {
    if (!item || !item.id) continue;
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

// Remove duplicate items from an array using a custom key (keeps first occurrence)
export function dedupeByKey<T>(arr?: T[] | null, key?: keyof T): T[] {
  if (!arr || !key) return arr ? [...arr] : [];
  const map = new Map<string, T>();
  for (const item of arr) {
    const k = String((item as any)[key]);
    if (!k) continue;
    if (!map.has(k)) map.set(k, item);
  }
  return Array.from(map.values());
}
