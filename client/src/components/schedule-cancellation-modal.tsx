import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "lucide-react";
import type { Subscription } from "@shared/schema";

interface ScheduleCancellationReminderModalProps {
  subscription: Subscription | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduled?: () => void;
}

export function ScheduleCancellationReminderModal({
  subscription,
  isOpen,
  onOpenChange,
  onScheduled,
}: ScheduleCancellationReminderModalProps) {
  const { user, getToken } = useAuth();
  const [selectedDate, setSelectedDate] = useState("");
  const [cancellationUrl, setCancellationUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!subscription) return null;

  // Calculate minimum date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  const handleSchedule = async () => {
    if (!selectedDate) {
      setError("Please select a date");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const token = await getToken();
      const response = await fetch(
        `/api/subscriptions/${subscription.id}/schedule-cancellation`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            scheduledDate: selectedDate,
            cancellationUrl: cancellationUrl || null,
          }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to schedule cancellation");
      }

      setSelectedDate("");
      setCancellationUrl("");
      onOpenChange(false);
      onScheduled?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedDate("");
    setCancellationUrl("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Cancellation Reminder</DialogTitle>
          <DialogDescription>
            Set a reminder to cancel <strong>{subscription.name}</strong> on a specific date. We'll send you a reminder email with a direct link to cancel.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4" />
                Cancellation Date
              </div>
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setError("");
              }}
              min={minDate}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground"
            />
            <p className="text-xs text-muted-foreground mt-2">
              You'll receive a reminder on this date with instructions to cancel.
            </p>
          </div>

          <div>
            <label htmlFor="cancellation-url" className="text-sm font-medium">
              Direct Cancellation Link <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="cancellation-url"
              type="url"
              placeholder="https://account.example.com/settings/cancel"
              value={cancellationUrl}
              onChange={(e) => {
                setCancellationUrl(e.target.value);
                setError("");
              }}
              className="w-full px-3 py-2 border border-input rounded-md bg-background text-foreground mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Paste the URL where you can cancel this subscription. This makes it super easy to cancel when you get the reminder!
            </p>
          </div>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSchedule} disabled={isLoading || !selectedDate}>
            {isLoading ? "Scheduling..." : "Set Reminder"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
