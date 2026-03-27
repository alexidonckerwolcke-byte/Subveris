import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Users } from "lucide-react";
import { SubscriptionCalendar } from "@/components/subscription-calendar";
import { FamilySharing } from "@/components/family-sharing";
import { FamilyPlanGate } from "@/components/family-plan-gate";
import type { Subscription, CalendarEvent } from "@shared/schema";

export default function FamilyCalendarPage() {
  // Fetch subscriptions
  const { data: subscriptions = [], isLoading: subsLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
  });

  // Fetch calendar events
  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
  });

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
            {eventsLoading ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Loading calendar...</p>
                </CardContent>
              </Card>
            ) : (
              <SubscriptionCalendar
                subscriptions={subscriptions}
                calendarEvents={calendarEvents}
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
