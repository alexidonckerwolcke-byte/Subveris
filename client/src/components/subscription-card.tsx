import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Play,
  Pause,
  Trash2,
  ExternalLink,
  TrendingDown,
  TrendingUp,
  ActivitySquare,
  Clock,
  Mail,
} from "lucide-react";
import { UsageLoggerModal } from "@/components/usage-logger-modal";
import { ScheduleCancellationReminderModal } from "@/components/schedule-cancellation-modal";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { PER_PAGE as PER_PAGE_CONST } from "@/lib/constants";
import type { Subscription, SubscriptionStatus } from "@shared/schema";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { getCategoryIcon, getStatusColor } from "@/lib/utils";
import { useCurrency, type Currency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";

interface SubscriptionCardProps {
  subscription: Subscription;
  onStatusChange: (id: string, status: SubscriptionStatus) => void;
  onDelete: (id: string) => void;
  isPremium?: boolean;
}


export function invalidateAfterUsage(showFamilyData: boolean, familyGroupId?: string) {
  queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
  queryClient.invalidateQueries({ queryKey: ["/api/subscriptions", PER_PAGE_CONST] });
  queryClient.invalidateQueries({ queryKey: ["/api/metrics"] });
  // always invalidate personal cost-per-use; if family mode also invalidate family query
  queryClient.invalidateQueries({ queryKey: ["/api/analysis/cost-per-use"] });
  if (showFamilyData && familyGroupId) {
    queryClient.invalidateQueries({ queryKey: [`/api/analysis/cost-per-use?familyGroupId=${familyGroupId}`] });
    // also refresh the cached family-data itself so computed analytics update
    queryClient.invalidateQueries({ queryKey: ["/api/family-groups", familyGroupId, "family-data"] });
  }
}

export function SubscriptionCard({
  subscription,
  onStatusChange,
  onDelete,
  isPremium = false,
}: SubscriptionCardProps) {
  const { formatAmount } = useCurrency();
  const { getToken } = useAuth();
  const { toast } = useToast();
  const [usageModalOpen, setUsageModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [isSendingReminder, setIsSendingReminder] = useState(false);
  
  const { familyGroupId, showFamilyData } = useFamilyDataMode();

  const handleUsageUpdated = () => {
    invalidateAfterUsage(showFamilyData, familyGroupId);
  };

  const handleScheduled = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/subscriptions", PER_PAGE_CONST] });
  };

  const handleSendReminder = async () => {
    setIsSendingReminder(true);
    try {
      const token = await getToken();
      const response = await fetch(
        `/api/subscriptions/${subscription.id}/send-cancellation-reminder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send reminder");
      }

      toast({
        title: "Reminder sent",
        description: `Cancellation reminder sent for ${subscription.name}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send reminder",
        variant: "destructive",
      });
    } finally {
      setIsSendingReminder(false);
    }
  };

  const CategoryIcon = getCategoryIcon(subscription.category);
  const statusColors = getStatusColor(subscription.status);
  
  const monthlyAmount = subscription.frequency === "yearly" 
    ? subscription.amount / 12 
    : subscription.frequency === "quarterly"
    ? subscription.amount / 3
    : subscription.frequency === "weekly"
    ? subscription.amount * 4
    : subscription.amount;

  const costPerUse = (subscription.monthlyUsageCount || 0) > 0 
    ? monthlyAmount / (subscription.monthlyUsageCount || 0)
    : monthlyAmount;

  const valueRating = costPerUse <= 2 ? "excellent" : costPerUse <= 5 ? "good" : costPerUse <= 10 ? "fair" : "poor";

  return (
    <>
      <Card 
        className="hover-elevate group"
        data-testid={`subscription-card-${subscription.id}`}
      >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
              <CategoryIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">{subscription.name}</h3>
              <p className="text-sm text-muted-foreground capitalize">
                {subscription.category.replace("-", " ")}
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                data-testid={`subscription-menu-${subscription.id}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {subscription.status !== 'deleted' && (
                <DropdownMenuItem
                  onClick={() => setUsageModalOpen(true)}
                  data-testid={`action-log-usage-${subscription.id}`}
                >
                  <ActivitySquare className="mr-2 h-4 w-4" />
                  Log Usage
                </DropdownMenuItem>
              )}
              {subscription.status === 'deleted' && (
                <DropdownMenuItem disabled>
                  <ActivitySquare className="mr-2 h-4 w-4" />
                  Log Usage (deleted)
                </DropdownMenuItem>
              )}
              {isPremium && !subscription.scheduledCancellationDate && (
                <DropdownMenuItem
                  onClick={() => setScheduleModalOpen(true)}
                  data-testid={`action-schedule-cancel-${subscription.id}`}
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Schedule Cancellation
                </DropdownMenuItem>
              )}
              {subscription.scheduledCancellationDate && (
                <DropdownMenuItem
                  onClick={handleSendReminder}
                  disabled={isSendingReminder}
                  data-testid={`action-send-reminder-${subscription.id}`}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isSendingReminder ? "Sending..." : "Send Reminder Email"}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {subscription.status !== "active" && (
                <DropdownMenuItem
                  onClick={() => onStatusChange(subscription.id, "active")}
                  data-testid={`action-activate-${subscription.id}`}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Mark as Active
                </DropdownMenuItem>
              )}
              {subscription.status !== "unused" && (
                <DropdownMenuItem
                  onClick={() => onStatusChange(subscription.id, "unused")}
                  data-testid={`action-unused-${subscription.id}`}
                >
                  <Pause className="mr-2 h-4 w-4" />
                  Mark as Unused
                </DropdownMenuItem>
              )}
              {subscription.status !== "to-cancel" && (
                <DropdownMenuItem
                  onClick={() => onStatusChange(subscription.id, "to-cancel")}
                  data-testid={`action-cancel-${subscription.id}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Mark to Cancel
                </DropdownMenuItem>
              )}
              {subscription.status !== "deleted" && (
                <DropdownMenuItem
                  onClick={() => onStatusChange(subscription.id, "deleted")}
                  data-testid={`action-mark-deleted-${subscription.id}`}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Mark as Deleted
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(subscription.id)}
                className="text-destructive focus:text-destructive"
                data-testid={`action-delete-${subscription.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold">
              {formatAmount(subscription.amount, subscription.currency as Currency)}
              <span className="text-sm font-normal text-muted-foreground">
                /{subscription.frequency === "yearly" ? "yr" : subscription.frequency === "monthly" ? "mo" : subscription.frequency === "quarterly" ? "qtr" : "wk"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Next billing: {
                (() => {
                  const raw = subscription.nextBillingDate || subscription.next_billing_at || subscription.next_billing_date || subscription.nextBillingDate || subscription.createdAt || subscription.created_at;
                  if (!raw) return '—';
                  const d = new Date(raw);
                  if (!isNaN(d.getTime())) return d.toLocaleDateString();
                  // Try extracting date portion if contains T
                  try {
                    const dateOnly = typeof raw === 'string' ? raw.split('T')[0] : null;
                    if (dateOnly) {
                      const d2 = new Date(dateOnly);
                      if (!isNaN(d2.getTime())) return d2.toLocaleDateString();
                    }
                  } catch (e) {}
                  return '—';
                })()
              }
            </p>
            {subscription.scheduledCancellationDate && (
              <p className="text-xs text-chart-5 mt-1 font-medium">
                Scheduled to cancel: {
                  (() => {
                    const raw = subscription.scheduledCancellationDate || subscription.scheduled_cancellation_date;
                    if (!raw) return '—';
                    const d = new Date(raw);
                    if (!isNaN(d.getTime())) return d.toLocaleDateString();
                    try {
                      const dateOnly = typeof raw === 'string' ? raw.split('T')[0] : null;
                      if (dateOnly) {
                        const d2 = new Date(dateOnly);
                        if (!isNaN(d2.getTime())) return d2.toLocaleDateString();
                      }
                    } catch (e) {}
                    return '—';
                  })()
                }
              </p>
            )}
          </div>
          <Badge className={statusColors}>
            {subscription.status === "to-cancel" ? "To Cancel" : subscription.status === "deleted" ? "Deleted" : subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
          </Badge>
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Usage:</span>
              <span className="font-medium">{subscription.monthlyUsageCount || 0}x this month</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Cost/use:</span>
              <span className={`font-medium ${
                valueRating === "excellent" || valueRating === "good" 
                  ? "text-chart-2" 
                  : valueRating === "fair" 
                  ? "text-chart-4" 
                  : "text-chart-5"
              }`}>
                {formatAmount(costPerUse, subscription.currency as Currency)}
              </span>
              {valueRating === "poor" && (
                <TrendingDown className="h-3 w-3 text-chart-5" />
              )}
              {(valueRating === "excellent" || valueRating === "good") && (
                <TrendingUp className="h-3 w-3 text-chart-2" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    <UsageLoggerModal
      subscription={subscription}
      isOpen={usageModalOpen}
      onOpenChange={setUsageModalOpen}
      onUsageUpdated={handleUsageUpdated}
    />
    <ScheduleCancellationReminderModal
      subscription={subscription}
      isOpen={scheduleModalOpen}
      onOpenChange={setScheduleModalOpen}
      onScheduled={handleScheduled}
    />
    </>
  );
}
