import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { useQuery, useMutation, useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SubscriptionCard } from "@/components/subscription-card";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PER_PAGE } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Filter } from "lucide-react";
import type { Subscription, SubscriptionStatus, SubscriptionCategory, BillingFrequency } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const addSubscriptionSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required").transform((val) => parseFloat(val)),
  frequency: z.string().min(1, "Frequency is required"),
  nextBillingDate: z.string().min(1, "Next billing date is required"),
  websiteDomain: z.string().optional(), // e.g., "netflix.com", "spotify.com"
});

type AddSubscriptionForm = z.infer<typeof addSubscriptionSchema>;

export default function Subscriptions() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { limits, tier } = useSubscription();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmittingLocal, setIsSubmittingLocal] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>("all");
  const submissionInFlightRef = useRef<boolean>(false);  // Track if submission is in progress

  // pagination state for personal subscriptions
  // PER_PAGE constant is imported from shared constants above.

  // Declare form early so it can be used in useEffect
  const form = useForm<AddSubscriptionForm>({
    resolver: zodResolver(addSubscriptionSchema),
    defaultValues: {
      name: "",
      category: "",
      amount: "" as any,
      frequency: "monthly",
      nextBillingDate: new Date().toISOString().split("T")[0],
    },
  });

  const tabFromUrl = useMemo(() => {
    const params = new URLSearchParams(location.split("?")[1] || "");
    return params.get("tab") || "all";
  }, [location]);

  useEffect(() => {
    setCurrentTab(tabFromUrl);
  }, [tabFromUrl]);

  // Ensure form is cleared when dialog closes to prevent accidental resubmissions
  useEffect(() => {
    if (!dialogOpen) {
      // Clear form and submission flag when dialog closes
      form.reset();
      submissionInFlightRef.current = false;
      console.log('[Subscriptions] Dialog closed, form cleared and submission flag reset');
    }
  }, [dialogOpen]);

  // when search or category changes, purge paginated cache so we start from page 1
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ["/api/subscriptions", PER_PAGE] });
  }, [searchQuery, categoryFilter, showFamilyData]);

  // Personal subscriptions (paginated)
  interface SubscriptionsPage {
    items: Subscription[];
    total: number;
  }

  const {
    data: personalSubscriptionPages,
    isLoading: personalLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery<SubscriptionsPage, Error, InfiniteData<SubscriptionsPage>, [string, number]>({
    queryKey: ["/api/subscriptions", PER_PAGE],
    initialPageParam: 1,
    queryFn: async ({ pageParam = 1 }) => {
      const res = await apiRequest("GET", `/api/subscriptions?page=${pageParam}&perPage=${PER_PAGE}`);
      const items: Subscription[] = await res.json();
      const total = parseInt(res.headers.get("x-total-count") || "0", 10);
      return { items, total };
    },
    getNextPageParam: (lastPage, allPages) => {
      // if there are more items beyond what we've already loaded
      const alreadyLoaded = allPages.reduce((sum, p) => sum + p.items.length, 0);
      if (alreadyLoaded < lastPage.total) {
        return allPages.length + 1;
      }
      return undefined;
    },
  });

  // flatten pages into a single array for rendering
  const personalSubscriptions = useMemo(() => {
    if (!personalSubscriptionPages) return [] as Subscription[];
    return personalSubscriptionPages.pages.flatMap(p => p.items);
  }, [personalSubscriptionPages]);

  // Family subscriptions
  const { data: familyData, isLoading: familyLoading } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "family-data"],
    enabled: !!familyGroupId,
    queryFn: async () => {
      if (!familyGroupId) return null;
      const response = await apiRequest('GET', `/api/family-groups/${familyGroupId}/family-data`);
      return response.json();
    },
  });

  // Use family subscriptions if enabled, otherwise personal (paginated)
  const rawSubscriptions = showFamilyData ? familyData?.subscriptions : personalSubscriptions;

  // dedupe subscriptions by id to avoid duplicate-key warnings and duplicated UI items
  const subscriptions = useMemo(() => {
    if (!rawSubscriptions) return [] as Subscription[];
    const map = new Map<string, Subscription>();
    for (const s of rawSubscriptions) {
      if (!s || !s.id) continue;
      if (!map.has(s.id)) map.set(s.id, s);
    }
    const result = Array.from(map.values());
    
    // Debug logging - show ALL fields for first subscription
    if (result.length > 0) {
      console.log('[Subscriptions] First subscription object - ALL FIELDS:', {
        ...result[0],
        allKeys: Object.keys(result[0]),
      });
    }
    
    console.log('[Subscriptions] Subscriptions loaded:', {
      count: result.length,
      subscriptions: result.map(s => ({
        id: s.id,
        name: s.name,
        nextBillingDate: s.nextBillingDate,
        status: s.status,
      })),
    });
    
    return result;
  }, [rawSubscriptions, showFamilyData]);
  const isLoading = showFamilyData ? familyLoading : personalLoading;

  const addMutation = useMutation({
    mutationFn: async (data: AddSubscriptionForm) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      console.log('[Subscriptions] Starting subscription creation', { name: data.name, amount: data.amount });
      const res = await apiRequest("POST", "/api/subscriptions", {
        ...data,
        status: "active",
        usageCount: 0,
        isDetected: false,
      });
      return res.json();
    },
    onSuccess: () => {
      console.log('[Subscriptions] Subscription created successfully, clearing submission flag');
      submissionInFlightRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
      // also invalidate paginated queries
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions", PER_PAGE] });
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups"] });
      if (familyGroupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/family-groups", familyGroupId, "family-data"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
      // refresh cost-per-use analytics for both personal and family views
      queryClient.invalidateQueries({ queryKey: ["/api/analysis/cost-per-use"] });
      if (showFamilyData && familyGroupId) {
        queryClient.invalidateQueries({ queryKey: [`/api/analysis/cost-per-use?familyGroupId=${familyGroupId}`] });
      }
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Subscription added",
        description: "Your subscription has been added successfully.",
      });
    },
    onError: (error) => {
      console.error('[Subscriptions] Subscription creation failed:', error);
      submissionInFlightRef.current = false;
      toast({
        title: "Error",
        description: `Failed to add subscription: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: SubscriptionStatus }) => {
      console.log(`[Subscriptions] Updating subscription ${id} status to ${status}`);
      const res = await apiRequest("PATCH", `/api/subscriptions/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      console.log("[Subscriptions] Status update succeeded, refetching all caches");
      queryClient.refetchQueries({ queryKey: ["/api/subscriptions", PER_PAGE] });
      if (familyGroupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/family-groups", familyGroupId, "family-data"] });
      }
      queryClient.refetchQueries({ queryKey: ["/api/metrics"] });
      queryClient.refetchQueries({ queryKey: ["/api/insights"] });
      queryClient.refetchQueries({ queryKey: ["/api/insights/behavioral"] });
      queryClient.refetchQueries({ queryKey: ["/api/analysis/cost-per-use"] });
      if (showFamilyData && familyGroupId) {
        queryClient.refetchQueries({ queryKey: [`/api/analysis/cost-per-use?familyGroupId=${familyGroupId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/monthly-savings"], exact: false });
      queryClient.refetchQueries({ queryKey: ["/api/spending/monthly"] });
      queryClient.refetchQueries({ queryKey: ["/api/spending/category"] });
      queryClient.refetchQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Status updated",
        description: "Subscription status has been updated.",
      });
    },
    onError: (error) => {
      console.error("[Subscriptions] Status update failed:", error);
      toast({
        title: "Error",
        description: `Failed to update status: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/subscriptions/${id}`);
      // 204 No Content has no body, so don't try to parse JSON
      if (res.status === 204) {
        return { success: true };
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/subscriptions", PER_PAGE] });
      if (familyGroupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/family-groups", familyGroupId, "family-data"] });
      }
      queryClient.refetchQueries({ queryKey: ["/api/metrics"] });
      queryClient.refetchQueries({ queryKey: ["/api/insights"] });
      queryClient.refetchQueries({ queryKey: ["/api/insights/behavioral"] });
      queryClient.refetchQueries({ queryKey: ["/api/analysis/cost-per-use"] });
      if (showFamilyData && familyGroupId) {
        queryClient.refetchQueries({ queryKey: [`/api/analysis/cost-per-use?familyGroupId=${familyGroupId}`] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/analytics/monthly-savings"], exact: false });
      queryClient.refetchQueries({ queryKey: ["/api/spending/monthly"] });
      queryClient.refetchQueries({ queryKey: ["/api/spending/category"] });
      queryClient.refetchQueries({ queryKey: ["/api/recommendations"] });
      toast({
        title: "Subscription deleted",
        description: "The subscription has been removed.",
      });
    },
  });

  const handleStatusChange = (id: string, status: SubscriptionStatus) => {
    updateStatusMutation.mutate({ id, status });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const onSubmit = async (data: AddSubscriptionForm) => {
    // Triple-check to prevent duplicate submissions
    if (isSubmittingLocal || addMutation.isPending || submissionInFlightRef.current) {
      console.warn('[Subscriptions] Blocking duplicate submission attempt', { 
        isSubmittingLocal, 
        isPending: addMutation.isPending, 
        inFlight: submissionInFlightRef.current 
      });
      return;
    }

    // Check subscription limit
    const activeCount = subscriptions?.filter((s: Subscription) => s.status === "active").length || 0;
    if (activeCount >= limits.maxSubscriptions) {
      toast({
        title: "Subscription limit reached",
        description: `You can only have ${limits.maxSubscriptions} active ${limits.maxSubscriptions === 1 ? "subscription" : "subscriptions"} on the free plan. Upgrade to Premium for unlimited subscriptions.`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmittingLocal(true);
      submissionInFlightRef.current = true;
      console.log('[Subscriptions] Form submission started', { name: data.name });
      await addMutation.mutateAsync(data);
    } catch (error) {
      console.error('[Subscriptions] Form submission error:', error);
    } finally {
      setIsSubmittingLocal(false);
      // Note: submissionInFlightRef is cleared in the mutation callback
    }
  };

  const filteredSubscriptions = subscriptions?.filter((sub: Subscription) => {
    const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || sub.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const activeSubscriptions = filteredSubscriptions?.filter((s: Subscription) => s.status === "active") || [];
  const unusedSubscriptions = filteredSubscriptions?.filter((s: Subscription) => s.status === "unused") || [];
  const toCancelSubscriptions = filteredSubscriptions?.filter((s: Subscription) => s.status === "to-cancel") || [];
  const deletedSubscriptions = filteredSubscriptions?.filter((s: Subscription) => s.status === "deleted") || [];

  const categories: SubscriptionCategory[] = [
    "streaming", "software", "fitness", "cloud-storage", "news",
    "gaming", "productivity", "finance", "education", "other"
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Subscriptions</h1>
            <p className="text-muted-foreground">
              Manage and track all your recurring payments
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-subscription">
                <Plus className="h-4 w-4 mr-2" />
                Add Subscription
              </Button>
            </DialogTrigger>
            <DialogContent aria-describedby="add-subscription-desc">
              <DialogHeader>
                <DialogTitle>Add New Subscription</DialogTitle>
                <DialogDescription id="add-subscription-desc">
                  Manually add a subscription that wasn't automatically detected.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    console.log('[Subscriptions] Form submit event fired, dialogOpen=', dialogOpen);
                    if (!dialogOpen) {
                      console.warn('[Subscriptions] Form submitted but dialog not open, ignoring');
                      return;
                    }
                    form.handleSubmit(onSubmit)(e);
                  }} 
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Netflix, Spotify, etc." {...field} data-testid="input-sub-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="9.99" {...field} data-testid="input-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Billing Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-frequency">
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                              <SelectItem value="quarterly">Quarterly</SelectItem>
                              <SelectItem value="yearly">Yearly</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="nextBillingDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Next Billing Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-billing-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="websiteDomain"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website Domain</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., netflix.com, spotify.com" {...field} data-testid="input-website-domain" />
                        </FormControl>
                        <div className="text-xs text-muted-foreground">
                          Add the site domain here if you want browser extension visits to be auto-tracked.
                          Leave blank if you only want to track the subscription manually.
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addMutation.isPending || isSubmittingLocal || submissionInFlightRef.current} 
                      data-testid="button-submit-subscription"
                    >
                      {addMutation.isPending || isSubmittingLocal ? "Adding..." : "Add Subscription"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search subscriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-48" data-testid="filter-category">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace("-", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs value={currentTab} onValueChange={(tab) => {
          setCurrentTab(tab);
          setLocation(`/subscriptions?tab=${tab}`);
        }} className="w-full">
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All ({filteredSubscriptions?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="active" data-testid="tab-active">
              Active ({activeSubscriptions.length})
            </TabsTrigger>
            <TabsTrigger value="unused" data-testid="tab-unused">
              Unused ({unusedSubscriptions.length})
            </TabsTrigger>
            <TabsTrigger value="to-cancel" data-testid="tab-to-cancel">
              To Cancel ({toCancelSubscriptions.length})
            </TabsTrigger>
            <TabsTrigger value="deleted" data-testid="tab-deleted">
              Deleted ({deletedSubscriptions.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-6 space-y-8">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : filteredSubscriptions && filteredSubscriptions.length > 0 ? (
              <>
                {activeSubscriptions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Active</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {activeSubscriptions.map((sub: Subscription) => (
                        <SubscriptionCard
                          key={sub.id}
                          subscription={sub}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                          isPremium={tier === "premium"}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {unusedSubscriptions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Unused</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {unusedSubscriptions.map((sub: Subscription) => (
                        <SubscriptionCard
                          key={sub.id}
                          subscription={sub}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                          isPremium={tier === "premium"}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {toCancelSubscriptions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">To Cancel</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {toCancelSubscriptions.map((sub: Subscription) => (
                        <SubscriptionCard
                          key={sub.id}
                          subscription={sub}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                          isPremium={tier === "premium"}
                        />
                      ))}
                    </div>
                  </div>
                )}
                {deletedSubscriptions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-foreground">Deleted</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {deletedSubscriptions.map((sub: Subscription) => (
                        <SubscriptionCard
                          key={sub.id}
                          subscription={sub}
                          onStatusChange={handleStatusChange}
                          onDelete={handleDelete}
                          isPremium={tier === "premium"}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* pagination: load more button when additional pages available */}
                {!showFamilyData && hasNextPage && (
                  <div className="text-center mt-8">
                    <Button onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                      {isFetchingNextPage ? "Loading..." : "Load more"}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <p>No subscriptions found.</p>
              </div>
            )}
          </TabsContent>
          <TabsContent value="active" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />
                ))
              ) : activeSubscriptions.length > 0 ? (
                activeSubscriptions.map((sub: Subscription) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    isPremium={tier === "premium"}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <p>No active subscriptions found.</p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="unused" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {unusedSubscriptions.length > 0 ? (
                unusedSubscriptions.map((sub: Subscription) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    isPremium={tier === "premium"}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <p>No unused subscriptions.</p>
                  <p className="text-sm">Great job staying on top of your subscriptions!</p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="to-cancel" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {toCancelSubscriptions.length > 0 ? (
                toCancelSubscriptions.map((sub: Subscription) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDelete}
                    isPremium={tier === "premium"}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <p>No subscriptions marked for cancellation.</p>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="deleted" className="mt-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {deletedSubscriptions.length > 0 ? (
                <>
                  <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground mb-4">
                    Subscriptions marked deleted are kept for the current month and are permanently removed on the first day of the next month.
                  </div>
                  {deletedSubscriptions.map((sub: Subscription) => (
                    <SubscriptionCard
                      key={sub.id}
                      subscription={sub}
                      onStatusChange={handleStatusChange}
                      onDelete={handleDelete}
                      isPremium={tier === "premium"}
                    />
                  ))}
                </>
              ) : (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <p>No deleted subscriptions yet.</p>
                  <p className="text-sm">When you mark subscriptions as deleted, they'll appear here.</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
