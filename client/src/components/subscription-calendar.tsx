import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, ChevronLeft, ChevronRight, Edit2 } from 'lucide-react';
import type { CalendarEvent, Subscription } from '@shared/schema';
import { useCurrency, type Currency } from '@/lib/currency-context';
import { advanceDateByFrequency, dedupeById, formatDate, parseDateOnlyLocal } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function formatDateLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

interface SubscriptionCalendarProps {
  subscriptions?: Subscription[];
  calendarEvents?: CalendarEvent[];
  initialDate?: string;
  onEventCreate?: (event: Partial<CalendarEvent>) => void;
  onEventDelete?: (eventId: string) => void;
  onRenewalDateChange?: (subscriptionId: string, newDate: string) => void;
}

export function SubscriptionCalendar({
  subscriptions = [],
  calendarEvents = [],
  initialDate,
  onEventCreate,
  onEventDelete,
  onRenewalDateChange,
}: SubscriptionCalendarProps) {
  const { formatAmount } = useCurrency();
  const [currentDate, setCurrentDate] = useState(parseDateOnlyLocal(initialDate) ?? new Date());
  const [monthView, setMonthView] = useState<CalendarEvent[][]>([]);
  const [editingEvent, setEditingEvent] = useState<{ event: CalendarEvent; subscription: Subscription } | null>(null);
  const [newDate, setNewDate] = useState('');

  // Debug: Log what we're receiving
  console.log('[SubscriptionCalendar] Component received:', {
    eventCount: calendarEvents.length,
    events: calendarEvents.map(e => ({ id: e.id, title: e.title, eventDate: e.eventDate, type: e.eventType })),
  });

  // Generate calendar grid for current month
  useEffect(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Create events map for easy lookup
    const eventMap = new Map<string, CalendarEvent[]>();
    calendarEvents.forEach((event) => {
      const dateKey = event.eventDate;
      if (!eventMap.has(dateKey)) {
        eventMap.set(dateKey, []);
      }
      eventMap.get(dateKey)?.push(event);
    });

    console.log('[SubscriptionCalendar] Event map created:', {
      eventMapSize: eventMap.size,
      dateKeys: Array.from(eventMap.keys()),
      mappedEvents: Array.from(eventMap.entries()).map(([date, events]) => ({ date, count: events.length, titles: events.map(e => e.title) })),
    });

    // Generate calendar grid
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const grid: CalendarEvent[][] = [];
    let currentGrid: CalendarEvent[] = [];

    for (let i = 0; i < 42; i++) {
      const dateStr = formatDateLocal(startDate);
      const dayEvents = eventMap.get(dateStr) || [];
      currentGrid.push(...dayEvents);

      if (currentGrid.length > 0 && (i + 1) % 7 === 0) {
        grid.push(currentGrid);
        currentGrid = [];
      }
      startDate.setDate(startDate.getDate() + 1);
    }

    setMonthView(grid);
  }, [currentDate, calendarEvents]);

  const getDaysInMonth = () => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const handleEditRenewalDate = (event: CalendarEvent) => {
    if (event.id.startsWith('renewal-')) {
      const subscriptionId = event.id.replace('renewal-', '');
      const subscription = subscriptions.find(s => s.id === subscriptionId);
      if (subscription) {
        // Auto-advance renewal date if it's in the past
        let renewalDate = parseDateOnlyLocal(event.eventDate) ?? parseDateOnlyLocal(new Date()) ?? new Date(event.eventDate);
        const today = parseDateOnlyLocal(new Date()) ?? new Date();
        if (event.eventType === 'renewal' && renewalDate < today) {
          while (renewalDate < today) {
            renewalDate = advanceDateByFrequency(renewalDate, subscription.frequency || 'monthly');
          }
        }
        setEditingEvent({ event, subscription });
        setNewDate(formatDateLocal(renewalDate));
      }
    }
  };

  const handleSaveRenewalDate = () => {
    if (editingEvent && onRenewalDateChange && newDate) {
      onRenewalDateChange(editingEvent.subscription.id, newDate);
      setEditingEvent(null);
      setNewDate('');
    }
  };

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'renewal':
        return 'bg-chart-2/10 text-chart-2';
      case 'trial_end':
        return 'bg-chart-4/10 text-chart-4';
      case 'custom':
        return 'bg-muted/20 text-foreground';
      default:
        return 'bg-muted/20 text-foreground';
    }
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Create calendar grid
  const calendarGrid: (CalendarEvent[] | null)[][] = [];
  let week: (CalendarEvent[] | null)[] = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < getFirstDayOfMonth(); i++) {
    week.push(null);
  }

  // Add calendar days
  const daysInMonth = getDaysInMonth();
  for (let day = 1; day <= daysInMonth; day++) {
    // Create date string in YYYY-MM-DD format without timezone issues
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day).padStart(2, '0');
    const dateStr = `${currentDate.getFullYear()}-${month}-${dayStr}`;
    const dayEvents = calendarEvents.filter((e) => {
      // Normalize event date to YYYY-MM-DD format
      const eventDateStr = e.eventDate.includes('T') ? e.eventDate.split('T')[0] : e.eventDate;
      return eventDateStr === dateStr;
    });

    // Push all events for the day (or null if no events)
    week.push(dayEvents.length > 0 ? dayEvents : null);

    if (week.length === 7) {
      calendarGrid.push([...week]);
      week = [];
    }
  }

  // Fill remaining cells
  while (week.length > 0 && week.length < 7) {
    week.push(null);
  }
  if (week.length > 0) {
    calendarGrid.push(week);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Subscription Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-40 text-center font-medium text-sm">{monthName}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextMonth}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {/* Calendar Grid */}
          <div className="border rounded-lg overflow-hidden border-border">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-0 bg-muted/30">
              {daysOfWeek.map((day) => (
                <div key={day} className="p-2 text-center text-xs font-semibold text-muted-foreground border-r border-b border-border last:border-r-0">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            {calendarGrid.map((week, weekIdx) => (
              <div key={weekIdx} className="grid grid-cols-7 gap-0">
                {week.map((dayEvents, dayIdx) => {
                  const dayOfMonth = weekIdx * 7 + dayIdx - getFirstDayOfMonth() + 1;
                  const isCurrentMonth = dayOfMonth > 0 && dayOfMonth <= daysInMonth;
                  const isToday =
                    isCurrentMonth &&
                    dayOfMonth === new Date().getDate() &&
                    currentDate.getMonth() === new Date().getMonth() &&
                    currentDate.getFullYear() === new Date().getFullYear();

                  return (
                    <div
                      key={`${weekIdx}-${dayIdx}`}
                      className={`min-h-24 p-2 border-r border-b border-border last:border-r-0 ${
                        isCurrentMonth ? 'bg-background' : 'bg-muted/5'
                      } ${isToday ? 'bg-chart-2/5' : ''}`}
                    >
                      {isCurrentMonth && (
                        <div className="space-y-1">
                          <div className={`text-xs font-semibold ${isToday ? 'text-foreground' : 'text-muted-foreground'}`}> 
                            {dayOfMonth}
                          </div>
                          {dayEvents && dayEvents.length > 0 && (
                            <div className="space-y-1 flex flex-col gap-1">
                              {dayEvents.map((event) => (
                                <div 
                                  key={event.id}
                                  className="cursor-pointer group"
                                  onClick={() => handleEditRenewalDate(event)}
                                >
                                  <Badge className={`text-xs py-0 px-1 ${getEventColor(event.eventType)}`}> 
                                    {event.title}
                                  </Badge>
                                  {event.amount && (
                                    <div className="text-xs text-muted-foreground mt-0.5">
                                      {formatAmount(event.amount, subscriptions?.find(s => s.id === event.subscriptionId)?.currency as Currency)}
                                    </div>
                                  )}
                                  {event.eventType === 'renewal' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 mt-0.5"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditRenewalDate(event);
                                      }}
                                    >
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Events Summary */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Upcoming Events</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
                {dedupeById(calendarEvents).length === 0 ? (
                <p className="text-sm text-muted-foreground">No events scheduled</p>
              ) : (
                  dedupeById(calendarEvents)
                  .sort((a, b) => {
                    const aDate = parseDateOnlyLocal(a.eventDate) ?? new Date(a.eventDate);
                    const bDate = parseDateOnlyLocal(b.eventDate) ?? new Date(b.eventDate);
                    return aDate.getTime() - bDate.getTime();
                  })
                  .slice(0, 5)
                  .map((event) => {
                    const subscription = subscriptions.find((s) => s.id === event.subscriptionId);
                    return (
                      <div key={event.id} className="flex items-center justify-between p-2 bg-muted/5 rounded border border-border text-sm">
                        <div>
                          <div className="font-medium text-foreground">{event.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(event.eventDate)} • <span className="font-semibold text-foreground">{subscription?.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {event.amount && <span className="font-medium text-foreground">{formatAmount(event.amount, subscription?.currency as Currency)}</span>}
                          {event.eventType === 'renewal' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRenewalDate(event)}
                              className="h-6 w-6 p-0 text-foreground hover:bg-muted"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                          {onEventDelete && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEventDelete(event.id)}
                              className="h-6 w-6 p-0"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Edit Renewal Date Dialog */}
      <Dialog open={!!editingEvent} onOpenChange={(open) => !open && setEditingEvent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Renewal Date</DialogTitle>
            <DialogDescription>
              Update the renewal date for {editingEvent?.subscription.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="renewal-date">Renewal Date</Label>
              <Input
                id="renewal-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            {editingEvent && (
              <div className="text-sm text-muted-foreground">
                <p>Amount: {formatAmount(editingEvent.event.amount || editingEvent.subscription.amount, editingEvent.subscription.currency as Currency)}</p>
                <p>Billing Frequency: {editingEvent.subscription.frequency}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEvent(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRenewalDate}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
