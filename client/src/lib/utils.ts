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
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
      return (amount * 52) / 12;
    default:
      return amount;
  }
}

export function generateOpportunityCosts(monthlyAmount: number): { item: string; count: number; icon: string }[] {
  const items = [
    { item: "coffee drinks", unitCost: 5, icon: "coffee" },
    { item: "movie tickets", unitCost: 15, icon: "film" },
    { item: "lunch meals", unitCost: 12, icon: "utensils" },
    { item: "Spotify months", unitCost: 10.99, icon: "music" },
    { item: "Netflix months", unitCost: 15.49, icon: "tv" },
  ];

  return items
    .map((item) => ({
      item: item.item,
      count: Math.floor(monthlyAmount / item.unitCost),
      icon: item.icon,
    }))
    .filter((item) => item.count >= 1)
    .sort((a, b) => b.count - a.count)
    .slice(0, 1);
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
