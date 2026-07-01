import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Users } from "lucide-react";
import { SubscriptionCalendar } from "@/components/subscription-calendar";
import { FamilySharing } from "@/components/family-sharing";
import { FamilyPlanGate } from "@/components/family-plan-gate";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { getVisibleFamilySubscriptions } from "@/lib/family-data";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { dedupeById, formatDateLocal, parseDateOnlyLocal } from "@/lib/utils";
import type { Subscription, CalendarEvent } from "@shared/schema";

export default function FamilyCalendarPage() {
  const { user } = useAuth();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();

  // Fetch personal subscriptions as fallback
  const { data: personalSubscriptions = [], isLoading: personalSubsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    queryFn: async () => {
      const res = await apiFetch("/api/subscriptions");
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return res.json();
    },
  });

  // Fetch family data for family mode
  const { data: familyData, isLoading: familyDataLoading } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "family-data"],
    enabled: !!familyGroupId,
    queryFn: async () => {
      if (!familyGroupId) return null;
      const res = await apiFetch(`/api/family-groups/${familyGroupId}/family-data`);
      if (!res.ok) throw new Error("Failed to fetch family data");
      return res.json();
    },
  });

  const subscriptions = useMemo<Subscription[]>(() => {
    if (showFamilyData === true) {
      const visibleFamilySubscriptions = familyData
        ? getVisibleFamilySubscriptions(familyData, user?.id)
        : [];
      const merged = [...personalSubscriptions];
      if (visibleFamilySubscriptions.length > 0) {
        merged.push(...visibleFamilySubscriptions);
      }
      return dedupeById(merged);
    }
    return personalSubscriptions;
  }, [showFamilyData, familyData, personalSubscriptions, user?.id]);

  const normalizedSubscriptions = useMemo<Subscription[]>(() => {
    return subscriptions.map((sub: any) => {
      const nextBillingDate = sub.nextBillingDate
        || sub.next_billing_date
        || sub.next_billing_at
        || sub.next_billing
        || sub.nextBilling
        || null;
      return {
        ...sub,
        nextBillingDate,
      } as Subscription;
    });
  }, [subscriptions]);

  const subsLoading = showFamilyData === true ? familyDataLoading : personalSubsLoading;

  // Fetch calendar events
  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
    queryFn: async () => {
      const res = await apiFetch("/api/calendar-events");
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      return res.json();
    },
  });

  const loading = subsLoading || eventsLoading;

  const familyCalendarEvents = useMemo(() => {
    if (showFamilyData === true) {
      const renewalEvents = normalizedSubscriptions
        .filter((sub) => sub && (sub.status === 'active' || sub.status === 'unused') && sub.nextBillingDate)
        .map((sub) => {
          const eventDate = typeof sub.nextBillingDate === 'string'
            ? sub.nextBillingDate.split('T')[0]
            : formatDateLocal(new Date(sub.nextBillingDate));

          return {
            id: `renewal-${sub.id}`,
            subscriptionId: sub.id,
            eventDate,
            title: `${sub.name} Renewal`,
            eventType: 'renewal',
            amount: sub.amount,
            userId: sub.user_id,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          } as CalendarEvent;
        });

      const merged = [...renewalEvents, ...calendarEvents];
      return dedupeById(merged);
    }
    return calendarEvents;
  }, [showFamilyData, normalizedSubscriptions, calendarEvents]);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
        <div className="mb-2">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Family & Calendar</h1>
          <p className="text-muted-foreground">
            Share subscriptions with family and manage renewal dates
          </p>
        </div>

        <Tabs defaultValue="calendar" className="space-y-4">
          <TabsList>
            <TabsTrigger value="calendar" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="family" className="gap-2">
              <Users className="h-4 w-4" />
              Family
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Loading calendar...</p>
                </CardContent>
              </Card>
            ) : (
              <SubscriptionCalendar
                subscriptions={subscriptions}
                calendarEvents={familyCalendarEvents}
              />
            )}
          </TabsContent>

          <TabsContent value="family" className="space-y-4">
            {subsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </CardContent>
              </Card>
            ) : (
              <FamilyPlanGate feature="Family Sharing" showBlurred={false}>
                <FamilySharing />
              </FamilyPlanGate>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
