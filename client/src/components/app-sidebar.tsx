import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { useCurrency } from "@/lib/currency-context";
import { PER_PAGE } from "@/lib/constants";
import { getLocalDateQueryParams, getLocalMonthBounds, getLocalMonthKey } from "@/lib/savings-month";
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
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();
  const [currentMonthKey, setCurrentMonthKey] = useState(() => getLocalMonthKey(new Date()));

  useEffect(() => {
    const now = new Date();
    const nextMonthStart = getLocalMonthBounds(now).nextMonthStart;
    const timeoutId = window.setTimeout(() => {
      setCurrentMonthKey(getLocalMonthKey(new Date()));
    }, nextMonthStart.getTime() - now.getTime() + 1);

    return () => window.clearTimeout(timeoutId);
  }, [currentMonthKey]);

  useEffect(() => {
    if (!user?.id) return;

    const queries: Array<{ queryKey: unknown[]; url: string }> = [
      { queryKey: ["/api/metrics"], url: "/api/metrics" },
      { queryKey: ["/api/calendar-events"], url: "/api/calendar-events" },
      { queryKey: ["/api/insights/behavioral"], url: "/api/insights/behavioral" },
      { queryKey: ["/api/analysis/cost-per-use"], url: "/api/analysis/cost-per-use" },
      { queryKey: ["/api/insights"], url: "/api/insights" },
      { queryKey: ["/api/recommendations"], url: "/api/recommendations" },
      { queryKey: ["/api/family-groups"], url: "/api/family-groups" },
      { queryKey: ["/api/family-invitations"], url: "/api/family-invitations" },
      { queryKey: ["/api/family-groups/me/membership"], url: "/api/family-groups/me/membership" },
      { queryKey: ["/api/spending/monthly", false], url: "/api/spending/monthly" },
      { queryKey: ["/api/spending/category", false], url: "/api/spending/category" },
    ];

    if (familyGroupId) {
      queries.push(
        {
          queryKey: ["/api/family-groups", familyGroupId, "family-data"],
          url: `/api/family-groups/${familyGroupId}/family-data`,
        },
        {
          queryKey: ["/api/family-groups", familyGroupId, "family-data", "detected"],
          url: `/api/family-groups/${familyGroupId}/family-data?includeDetected=true`,
        },
        {
          queryKey: ["/api/family-groups", familyGroupId, "members"],
          url: `/api/family-groups/${familyGroupId}/members`,
        },
        {
          queryKey: ["/api/family-groups", familyGroupId, "settings"],
          url: `/api/family-groups/${familyGroupId}/settings`,
        },
        {
          queryKey: ["/api/family-groups", familyGroupId, "shared-subscriptions"],
          url: `/api/family-groups/${familyGroupId}/shared-subscriptions`,
        },
        {
          queryKey: ["/api/insights/behavioral", "family", familyGroupId],
          url: "/api/insights/behavioral?family=true",
        },
        {
          queryKey: [`/api/analysis/cost-per-use?familyGroupId=${familyGroupId}`],
          url: `/api/analysis/cost-per-use?familyGroupId=${familyGroupId}`,
        },
        {
          queryKey: ["/api/analytics/monthly-savings", true, currentMonthKey],
          url: `/api/analytics/monthly-savings?family=true&${getLocalDateQueryParams()}`,
        },
        {
          queryKey: ["/api/spending/monthly", true],
          url: "/api/spending/monthly?family=true",
        },
        {
          queryKey: ["/api/spending/category", true],
          url: "/api/spending/category?family=true",
        },
      );
    }

    const routeQueries = queries.map(({ queryKey, url }) =>
      queryClient.prefetchQuery({
        queryKey,
        queryFn: async () => {
          const response = await apiRequest("GET", url);
          return response.json();
        },
      })
    );

    routeQueries.push(queryClient.prefetchInfiniteQuery({
      queryKey: ["/api/subscriptions", PER_PAGE],
      initialPageParam: 1,
      queryFn: async ({ pageParam = 1 }) => {
        const response = await apiRequest(
          "GET",
          `/api/subscriptions?page=${pageParam}&perPage=${PER_PAGE}&excludeDetected=true`
        );
        const items = await response.json();
        const total = Number.parseInt(response.headers.get("x-total-count") || "0", 10);
        return { items, total };
      },
      getNextPageParam: (lastPage, pages) => {
        const loadedCount = pages.reduce((sum, page) => sum + page.items.length, 0);
        return loadedCount < lastPage.total ? pages.length + 1 : undefined;
      },
    }));

    void Promise.all(routeQueries);
  }, [currentMonthKey, familyGroupId, queryClient, user?.id]);

  useQuery({
    queryKey: ["/api/subscriptions"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/subscriptions");
      return response.json();
    },
  });

  useQuery({
    queryKey: ["/api/subscriptions", "detected"],
    enabled: !!user?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/subscriptions?includeDetected=true");
      return response.json();
    },
  });

  const savingsQuery = useQuery<{
    monthlySavings: number;
    ownerMonthlySavings?: number;
    memberMonthlySavings?: number;
  }>({
    queryKey: ["/api/analytics/monthly-savings", showFamilyData, currentMonthKey],
    enabled: !!user?.id,
    queryFn: async () => {
      const familyParam = showFamilyData ? "family=true&" : "";
      const url = `/api/analytics/monthly-savings?${familyParam}${getLocalDateQueryParams()}`;
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
