import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useCurrency, type Currency } from "@/lib/currency-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Subscription } from "@shared/schema";

interface UsageLoggerModalProps {
  subscription: Subscription;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onUsageUpdated?: () => void;
}

export function UsageLoggerModal({
  subscription,
  isOpen,
  onOpenChange,
  onUsageUpdated,
}: UsageLoggerModalProps) {
  const { toast } = useToast();
  const { formatAmount } = useCurrency();
  const [usageCount, setUsageCount] = useState((subscription.monthlyUsageCount || 0).toString());
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateUsage = async () => {
    const newCount = parseInt(usageCount);
    
    if (isNaN(newCount) || newCount < 0) {
      toast({
        title: "Error",
        description: "Please enter a valid usage count",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest("PATCH", `/api/subscriptions/${subscription.id}/usage`, {
        usageCount: newCount,
      });

      toast({
        title: "Usage updated",
        description: `${subscription.name} usage count updated to ${newCount}`,
      });

      onOpenChange(false);
      // Invalidate and refetch subscriptions
      await queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"], exact: false });
      onUsageUpdated?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update usage count",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLog = async () => {
    setIsLoading(true);
    try {
      await apiRequest("POST", `/api/subscriptions/${subscription.id}/log-usage`);

      toast({
        title: "Usage recorded",
        description: `${subscription.name} usage incremented automatically`,
      });

      onOpenChange(false);
      onUsageUpdated?.();
    } catch (error: any) {
      const msg = error?.message || "Failed to record usage";
      const desc = msg === "Unauthorized"
        ? "You need to sign in again to log usage."
        : msg;
      toast({
        title: "Error",
        description: desc,
        variant: "destructive",
      });
      // if we got an auth-related error we don't bother invalidating the list
      setIsLoading(false);
      return;
    } finally {
      // clear loading even if later invalidation fails
      setIsLoading(false);
    }

    // attempt to refresh cached subscription list; don't treat this as fatal
    queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"], exact: false }).catch((e) => {
      console.warn("failed to invalidate subscriptions after log-usage", e);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log Usage - {subscription.name}</DialogTitle>
          <DialogDescription>
            Track how many times you've used this subscription
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Current monthly usage: <span className="font-semibold text-foreground">{subscription.monthlyUsageCount || 0} times</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Last used: {subscription.lastUsedDate ? new Date(subscription.lastUsedDate).toLocaleDateString() : "Never"}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="usage-count">Set Usage Count</Label>
            <Input
              id="usage-count"
              type="number"
              min="0"
              value={usageCount}
              onChange={(e) => setUsageCount(e.target.value)}
              placeholder="0"
              data-testid="input-usage-count"
            />
            <p className="text-xs text-muted-foreground">
              Cost per use: {(subscription.monthlyUsageCount || 0) > 0 ? formatAmount(subscription.amount / (subscription.monthlyUsageCount || 0), subscription.currency as Currency) : "N/A"}
            </p>
          </div>
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleQuickLog}
            disabled={isLoading}
            data-testid="button-quick-log"
          >
            {isLoading ? "Logging..." : "+1 Quick Log"}
          </Button>
          <Button
            onClick={handleUpdateUsage}
            disabled={isLoading}
            data-testid="button-update-usage"
          >
            {isLoading ? "Updating..." : "Update Count"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
