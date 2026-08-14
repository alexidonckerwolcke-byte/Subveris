import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useCurrency } from "@/lib/currency-context";
import {
  LayoutDashboard,
  CreditCard,
  TrendingUp,
  Lightbulb,
  Settings,
  Wallet,
  PiggyBank,
  Sparkles,
  HelpCircle,
  FileText,
  Zap,
  Calendar,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const mainNavItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Subscriptions",
    url: "/subscriptions",
    icon: CreditCard,
  },
  {
    title: "Detected",
    url: "/detected-subscriptions",
    icon: Sparkles,
  },
  {
    title: "Insights",
    url: "/insights",
    icon: Lightbulb,
  },
  {
    title: "AI Optimization",
    url: "/cost-optimizer",
    icon: Zap,
  },
  {
    title: "Savings",
    url: "/savings",
    icon: PiggyBank,
  },
  {
    title: "Calendar",
    url: "/calendar",
    icon: Calendar,
  },
  {
    title: "Family Sharing",
    url: "/family-sharing",
    icon: Users,
  },
];

const settingsItems = [
  {
    title: "Autopilot",
    url: "/files",
    icon: FileText,
  },
  {
    title: "Docs",
    url: "/docs",
    icon: FileText,
    newTab: true,
  },
  {
    title: "Pricing",
    url: "/pricing",
    icon: Sparkles,
  },
  {
    title: "Support",
    url: "/support",
    icon: HelpCircle,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
];

export function AppSidebar({ disabled = false }: { disabled?: boolean }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const { showFamilyData } = useFamilyDataMode();

  const savingsQuery = useQuery<{
    monthlySavings: number;
    ownerMonthlySavings?: number;
    memberMonthlySavings?: number;
  }>({
    queryKey: ["/api/analytics/monthly-savings", showFamilyData],
    enabled: !!user?.id,
    queryFn: async () => {
      let url = "/api/analytics/monthly-savings";
      if (showFamilyData) {
        url += "?family=true";
      }
      const response = await apiRequest("GET", url);
      return await response.json();
    },
  });
  
  const data = savingsQuery.data;
  const isLoading = savingsQuery.isLoading;

  const monthlySavings = data?.monthlySavings ?? 0;
  const ownerMonthlySavings = data?.ownerMonthlySavings ?? 0;
  const memberMonthlySavings = data?.memberMonthlySavings ?? 0;
  const loading = isLoading;
  const { formatAmount } = useCurrency();

  const formatCurrency = (amount: number) => {
    return formatAmount(amount);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border/70 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-6 py-4 text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-white">
        <Link href={disabled ? "#" : "/"} className={`flex items-center gap-3 ${disabled ? 'pointer-events-none opacity-70' : ''}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl overflow-hidden shadow-md bg-white/80 ring-1 ring-slate-200 dark:bg-white/10 dark:ring-white/10">
            <img src="/assets/logo.png" alt="Subveris Logo" width={40} height={40} className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-semibold tracking-tight">Subveris</span>
            <span className="text-xs text-slate-600 dark:text-slate-300">Subscription intelligence</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase()}`}
                    disabled={disabled}
                  >
                    <Link href={disabled ? "#" : item.url} className={disabled ? 'pointer-events-none opacity-50' : ''}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.title.toLowerCase().replace(" ", "-")}`}
                    disabled={disabled}
                  >
                    {item.newTab ? (
                      <a
                        href={disabled ? "#" : item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={disabled ? 'pointer-events-none opacity-50' : ''}
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    ) : (
                      <Link href={disabled ? "#" : item.url} className={disabled ? 'pointer-events-none opacity-50' : ''}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 p-4">
        <div className={`rounded-xl border border-slate-200 bg-white/80 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 ${disabled ? 'opacity-50' : ''}`}>
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <PiggyBank className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">
                {showFamilyData ? "This month (family)" : "This month"}
              </span>
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {loading ? "Loading..." : (
                  monthlySavings > 0
                    ? `+${formatCurrency(monthlySavings)}`
                    : formatCurrency(monthlySavings)
                )}
              </span>
            </div>
          </div>
          {showFamilyData && !loading && (
            <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
              You: {ownerMonthlySavings > 0 ? `+${formatCurrency(ownerMonthlySavings)}` : formatCurrency(ownerMonthlySavings)} · Members: {memberMonthlySavings > 0 ? `+${formatCurrency(memberMonthlySavings)}` : formatCurrency(memberMonthlySavings)}
            </p>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
