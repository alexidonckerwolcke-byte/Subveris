import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useFamilyDataMode } from "@/hooks/use-family-data";
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
    title: "Insights",
    url: "/insights",
    icon: Lightbulb,
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
    title: "Files",
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
  const { showFamilyData } = useFamilyDataMode();

  const savingsQuery = useQuery<{
    monthlySavings: number;
    ownerMonthlySavings?: number;
    memberMonthlySavings?: number;
  }>({
    queryKey: ["/api/analytics/monthly-savings", showFamilyData],
    queryFn: async () => {
      const token = JSON.parse(localStorage.getItem("supabase.auth.token") || "{}").access_token;
      let url = "/api/analytics/monthly-savings";
      if (showFamilyData) {
        url += "?family=true";
      }
      const response = await fetch(url, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `HTTP ${response.status}`);
      }
      return await response.json();
    },
  });
  
  const data = savingsQuery.data;
  const isLoading = savingsQuery.isLoading;

  const monthlySavings = data?.monthlySavings ?? 0;
  const ownerMonthlySavings = data?.ownerMonthlySavings ?? 0;
  const memberMonthlySavings = data?.memberMonthlySavings ?? 0;
  const loading = isLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4 bg-gradient-to-r from-primary/90 to-indigo-500/80 text-primary-foreground">
        <Link href={disabled ? "#" : "/"} className={`flex items-center gap-3 ${disabled ? 'pointer-events-none opacity-70' : ''}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white shadow-md backdrop-blur">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white">Subveris</span>
            <span className="text-xs text-indigo-100/90">Smart Financial HQ</span>
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
      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className={`flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3 ${disabled ? 'opacity-50' : ''}`}>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <PiggyBank className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium">
              {showFamilyData ? "This Month (family)" : "This Month"}
            </span>
            <span className="text-sm font-semibold text-chart-2">
              {loading ? "Loading..." : (
                monthlySavings > 0
                  ? `+${formatCurrency(monthlySavings)}`
                  : formatCurrency(monthlySavings)
              )}
            </span>
            {showFamilyData && !loading && (
              <span className="text-xs text-gray-100">
                You: {ownerMonthlySavings > 0 ? `+${formatCurrency(ownerMonthlySavings)}` : formatCurrency(ownerMonthlySavings)} · Members: {memberMonthlySavings > 0 ? `+${formatCurrency(memberMonthlySavings)}` : formatCurrency(memberMonthlySavings)}
              </span>
            )}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
