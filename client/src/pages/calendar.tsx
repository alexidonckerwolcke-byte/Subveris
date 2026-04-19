import { SubscriptionCalendar } from "@/components/subscription-calendar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import type { Subscription, CalendarEvent } from "@shared/schema";
import { useMemo, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { dedupeById } from "@/lib/utils";

export default function Calendar() {
  const queryClient = useQueryClient();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();

  // Personal subscriptions (always load)
  const { data: personalSubscriptions = [] } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    queryFn: async () => {
      const token = JSON.parse(localStorage.getItem("supabase.auth.token") || "{}").access_token;
      const res = await fetch("/api/subscriptions", { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) throw new Error("Failed to fetch subscriptions");
      return res.json();
    },
  });

  // Family data (load if in family group)
  const { data: familyData } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "family-data"],
    enabled: !!familyGroupId,
  });

  // Build the subscriptions list. For family mode include both `subscriptions` and
  // any `sharedSubscriptions` mapped to their actual `subscription` objects
  let subscriptions: Subscription[] = personalSubscriptions;
  if (showFamilyData && familyData) {
    const familySubs: Subscription[] = familyData.subscriptions || [];
    // Some family-data responses include `sharedSubscriptions` entries that contain
    // a `subscription` field (added by the server). Map those into the list.
    const sharedFromMembers: Subscription[] = (familyData.sharedSubscriptions || [])
      .map((s: any) => s.subscription)
      .filter(Boolean);

    subscriptions = [...familySubs, ...sharedFromMembers];
  }

  // Normalize subscription objects to ensure `nextBillingDate` is available
  subscriptions = subscriptions.map((s: any) => {
    if (!s) return s;
    const nextBillingDate = s.nextBillingDate || s.next_billing_date || s.next_billing_at || s.next_billing || s.next_billingDate || null;
    return {
      ...s,
      nextBillingDate,
    } as Subscription;
  });

  // Deduplicate subscriptions by id before generating calendar events to avoid
  // duplicate renewal event IDs when the same subscription appears twice.
  subscriptions = dedupeById(subscriptions);

  // Personal calendar events (always load)
  const { data: personalCalendarEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar-events"],
    queryFn: async () => {
      const token = JSON.parse(localStorage.getItem("supabase.auth.token") || "{}").access_token;
      const res = await fetch("/api/calendar-events", { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      return res.json();
    },
  });

  const calendarEvents = personalCalendarEvents; // Calendar events are personal by nature

  // Update renewal date for a subscription
  const updateRenewalDateMutation = useMutation({
    mutationFn: async ({ subscriptionId, newDate }: { subscriptionId: string; newDate: string }) => {
      const res = await apiRequest("PATCH", `/api/subscriptions/${subscriptionId}`, { nextBillingDate: newDate });
      return res.json();
    },
    // Optimistic update so UI reflects change immediately
    onMutate: async ({ subscriptionId, newDate }: { subscriptionId: string; newDate: string }) => {
      console.log('[calendar] onMutate', { subscriptionId, newDate });
      await queryClient.cancelQueries({ queryKey: ["/api/subscriptions"] });
      const previous = queryClient.getQueryData<Subscription[]>(["/api/subscriptions"]);
      queryClient.setQueryData(["/api/subscriptions"], (old?: Subscription[]) => {
        if (!old) return old;
        return old.map(s => s.id === subscriptionId ? { ...s, nextBillingDate: newDate } : s);
      });
      return { previous };
    },
    onError: (err, variables, context: any) => {
      console.error('[calendar] update error', err);
      if (context?.previous) {
        queryClient.setQueryData(["/api/subscriptions"], context.previous);
      }
    },
    onSuccess: (data) => {
      console.log('[calendar] update success', data);
      // invalidate both normal and paginated subscriptions queries
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
      // Also invalidate family-data if we're viewing a family group so shared
      // member subscriptions reflect the updated renewal date.
      if (familyGroupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/family-groups", familyGroupId, "family-data"] });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
    },
  });

  // Automatically advance nextBillingDate for subscriptions whose date is in the past.
  useEffect(() => {
    if (!subscriptions || subscriptions.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const advanceDate = (d: Date, freq: string) => {
      const out = new Date(d);
      if (freq === 'monthly') {
        out.setMonth(out.getMonth() + 1);
      } else if (freq === 'yearly') {
        out.setFullYear(out.getFullYear() + 1);
      } else if (freq === 'weekly') {
        out.setDate(out.getDate() + 7);
      } else if (freq === 'quarterly') {
        out.setMonth(out.getMonth() + 3);
      } else {
        // default to monthly
        out.setMonth(out.getMonth() + 1);
      }
      out.setHours(0,0,0,0);
      return out;
    };

    // Process PERSONAL subscriptions only for auto-advance (not family members')
    (async () => {
      const updates: Array<Promise<any>> = [];
      for (const sub of personalSubscriptions) {
        try {
          console.debug('[calendar] checking subscription for auto-advance', { id: sub.id, name: sub.name, status: sub.status, nextBillingDate: sub.nextBillingDate, frequency: sub.frequency });
          if (!sub.nextBillingDate) continue;
          const raw = typeof sub.nextBillingDate === 'string' ? sub.nextBillingDate.split('T')[0] : new Date(sub.nextBillingDate).toISOString().split('T')[0];
          let next = new Date(raw);
          next.setHours(0,0,0,0);

          // Only consider active/unused subscriptions
          if (!(sub.status === 'active' || sub.status === 'unused')) continue;

          if (next < today) {
            // advance until next >= today
            let attempts = 0;
            while (next < today && attempts < 100) {
              next = advanceDate(next, sub.frequency as string);
              attempts++;
            }

            if (next >= today) {
              const newDateStr = next.toISOString().split('T')[0];
              // only trigger if changed
              if (newDateStr !== raw) {
                console.log('[calendar] auto-advancing', sub.id, raw, '->', newDateStr);
                // Use mutateAsync so we can await and log result
                updates.push(
                  updateRenewalDateMutation.mutateAsync({ subscriptionId: sub.id, newDate: newDateStr })
                    .then(res => {
                      console.log('[calendar] auto-advance success', sub.id, newDateStr, res);
                      return res;
                    })
                    .catch(err => {
                      console.error('[calendar] auto-advance failed', sub.id, err);
                      return Promise.reject(err);
                    })
                );
              }
            }
          }
        } catch (err) {
          console.warn('[calendar] failed to auto-advance for', sub.id, err);
        }
      }

      if (updates.length > 0) {
        try {
          await Promise.allSettled(updates);
          // Invalidate subscription and calendar queries once updates complete
          queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
          queryClient.invalidateQueries({ queryKey: ["/api/calendar-events"] });
          if (familyGroupId) {
            queryClient.invalidateQueries({ queryKey: ["/api/family-groups", familyGroupId, "family-data"] });
          }
        } catch (e) {
          console.warn('[calendar] error awaiting auto-advance updates', e);
        }
      }
    })();

  }, [personalSubscriptions, updateRenewalDateMutation]);

  // Combine calendar events with subscription renewal dates using useMemo
  const calendarEventsWithRenewals = useMemo(() => {
    console.log('[calendar] Creating renewal events from subscriptions:', {
      totalSubscriptions: subscriptions.length,
      subscriptionsWithDates: subscriptions.filter(s => s.nextBillingDate).length,
      subscriptions: subscriptions.map(s => ({
        id: s.id,
        name: s.name,
        status: s.status,
        nextBillingDate: s.nextBillingDate,
        allKeys: Object.keys(s),
      })),
    });
    
    // Debug: show what fields the subscription actually has
    if (subscriptions.length > 0 && !subscriptions[0].nextBillingDate) {
      console.log('[calendar] ⚠️ FIRST SUBSCRIPTION HAS NO nextBillingDate!', subscriptions[0]);
    }

    const renewalEvents: CalendarEvent[] = subscriptions.reduce<CalendarEvent[]>((acc, sub) => {
      if (!(sub.status === 'active' || sub.status === 'unused') || !sub.nextBillingDate) {
        return acc;
      }

      let dateOnly: string;
      if (typeof sub.nextBillingDate === 'string') {
        dateOnly = sub.nextBillingDate.split('T')[0];
      } else {
        const date = new Date(sub.nextBillingDate);
        if (isNaN(date.getTime())) {
          console.warn('[calendar] Invalid date for subscription', sub.id, sub.nextBillingDate);
          return acc;
        }
        dateOnly = date.toISOString().split('T')[0];
      }

      acc.push({
        id: `renewal-${sub.id}`,
        subscriptionId: sub.id,
        eventDate: dateOnly,
        title: `${sub.name} Renewal`,
        eventType: 'renewal',
        amount: sub.amount,
        userId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return acc;
    }, []);

    console.log('[calendar] Renewal events generated:', renewalEvents);

    // Merge events giving priority to generated renewal events so UI reflects
    // immediate subscription changes even if stored calendar events are stale.
    const mergedMap = new Map<string, CalendarEvent[]>();

    // First add renewal events keyed by date + subscriptionId so they take precedence
    for (const ev of renewalEvents) {
      const key = ev.eventDate;
      const arr = mergedMap.get(key) || [];
      arr.push(ev);
      mergedMap.set(key, arr);
    }

    // Then add stored calendar events but avoid duplicating renewal events for same subscription
    for (const ev of calendarEvents) {
      if (ev.eventType === 'renewal' && ev.subscriptionId) {
        // skip stored renewal events if we have a generated renewal for the same subscription
        const generated = renewalEvents.find(r => r.subscriptionId === ev.subscriptionId);
        if (generated && generated.eventDate === ev.eventDate) continue;
      }
      const key = ev.eventDate;
      const arr = mergedMap.get(key) || [];
      arr.push(ev);
      mergedMap.set(key, arr);
    }

    // Flatten map preserving order (renewals first)
    const merged: CalendarEvent[] = [];
    for (const events of mergedMap.values()) {
      merged.push(...events);
    }

    console.log('[calendar] Final merged calendar events:', merged);
    return merged;
  }, [subscriptions, calendarEvents]);

  // Choose an initial calendar month that contains the next upcoming event
  const initialCalendarDate = useMemo(() => {
    const today = new Date();
    const upcoming = [...calendarEventsWithRenewals]
      .map(e => ({ ...e, dateOnly: e.eventDate.includes('T') ? e.eventDate.split('T')[0] : e.eventDate }))
      .filter(e => new Date(e.dateOnly) >= new Date(today.toISOString().split('T')[0]))
      .sort((a, b) => new Date(a.dateOnly).getTime() - new Date(b.dateOnly).getTime())[0];

    if (upcoming) return upcoming.dateOnly;
    return undefined;
  }, [calendarEventsWithRenewals]);

  const handleRenewalDateChange = (subscriptionId: string, newDate: string) => {
    console.log('[calendar] handleRenewalDateChange', { subscriptionId, newDate });
    updateRenewalDateMutation.mutate({ subscriptionId, newDate });
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Subscription Calendar</h2>
          <p className="text-muted-foreground">Track renewal dates and manage your subscription timeline</p>
        </div>
      </div>

      <SubscriptionCalendar 
        subscriptions={subscriptions} 
        calendarEvents={calendarEventsWithRenewals}
        initialDate={initialCalendarDate}
        onRenewalDateChange={handleRenewalDateChange}
      />
    </div>
  );
}
