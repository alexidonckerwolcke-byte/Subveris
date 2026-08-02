import { AlertTriangle, Sparkles, Shield, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { Subscription } from '@shared/schema';

interface AutomationAlertsProps {
  isFreeTier: boolean;
  zeroUsageSubscriptions: Subscription[];
  onCancelSubscription: (subscriptionId: string) => void;
  isCancelling: boolean;
  cancellingSubscriptionId: string | null;
}

export function AutomationAlerts({
  isFreeTier,
  zeroUsageSubscriptions,
  onCancelSubscription,
  isCancelling,
  cancellingSubscriptionId,
}: AutomationAlertsProps) {
  const hasZeroUsage = zeroUsageSubscriptions.length > 0;

  return (
    <div className="space-y-4">
      {isFreeTier && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/10 via-background to-background">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">Autopilot locked</p>
                  <h3 className="mt-1 text-xl font-semibold">Your automation engine is ready, but the free plan keeps it on standby.</h3>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    Upgrade to Premium to turn on hands-off subscription cleanup, zero-usage alerts, and one-click cancellation workflows.
                  </p>
                </div>
              </div>
              <Button variant="outline" className="shrink-0">
                <Sparkles className="mr-2 h-4 w-4" />
                Upgrade to Premium
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {hasZeroUsage && (
        <Card className="border-amber-500/30 bg-amber-500/10">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Zero-usage alert</p>
                  <h3 className="mt-1 text-xl font-semibold">We noticed subscriptions you haven’t used in a while.</h3>
                  <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                    These services appear inactive. Cancel them in one click to stop paying for what you no longer use.
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {zeroUsageSubscriptions.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-background/70 px-3 py-2">
                    <div>
                      <p className="font-medium">{sub.name}</p>
                      <p className="text-xs text-muted-foreground">No recent usage detected</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onCancelSubscription(sub.id)}
                        disabled={isCancelling && cancellingSubscriptionId === sub.id}
                      >
                        {isCancelling && cancellingSubscriptionId === sub.id ? 'Cancelling...' : 'Cancel'}
                      </Button>
                      <Button size="sm" variant="ghost" className="px-2">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
