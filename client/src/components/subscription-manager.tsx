import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSubscription } from "@/lib/subscription-context";
import { formatDate } from "@/lib/utils";
import {
  CreditCard,
  Crown,
  CheckCircle,
  XCircle,
  Calendar,
  AlertTriangle,
} from "lucide-react";

const PREMIUM_PRICE_ID = import.meta.env.VITE_STRIPE_PREMIUM_PRICE_ID || "price_premium_monthly"; // Replace with your actual Stripe price ID

export function SubscriptionManager() {
  const { toast } = useToast();
  const { tier, subscriptionStatus, isLoading } = useSubscription();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const createCheckoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/create-checkout-session", {
        priceId: PREMIUM_PRICE_ID,
      });
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start checkout process.",
        variant: "destructive",
      });
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/cancel-subscription", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stripe/subscription-status"] });
      setShowCancelDialog(false);
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription will remain active until the end of the current billing period.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel subscription.",
        variant: "destructive",
      });
    },
  });

  const handleUpgrade = () => {
    createCheckoutMutation.mutate();
  };

  const handleCancel = () => {
    cancelSubscriptionMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Subscription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${tier === 'premium' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
              {tier === 'premium' ? (
                <Crown className="h-5 w-5 text-yellow-600" />
              ) : (
                <CreditCard className="h-5 w-5 text-gray-600" />
              )}
            </div>
            <div>
              <h3 className="font-medium capitalize">{tier} Plan</h3>
              <p className="text-sm text-muted-foreground">
                {tier === 'premium' ? 'Full access to all features' : 'Limited features'}
              </p>
            </div>
          </div>
          <Badge variant={tier === 'premium' ? 'default' : 'secondary'}>
            {tier === 'premium' ? 'Active' : 'Free'}
          </Badge>
        </div>

        {/* Subscription Details */}
        {subscriptionStatus && subscriptionStatus.status !== 'inactive' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <div className="flex items-center gap-2">
                  {subscriptionStatus.status === 'active' ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : subscriptionStatus.status === 'canceled' ? (
                    <XCircle className="h-4 w-4 text-red-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  )}
                  <span className="capitalize">{subscriptionStatus.status.replace('_', ' ')}</span>
                </div>
              </div>

              {subscriptionStatus.currentPeriodEnd && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {subscriptionStatus.cancelAtPeriodEnd ? 'Expires' : 'Renews'}
                  </span>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{formatDate(subscriptionStatus.currentPeriodEnd)}</span>
                  </div>
                </div>
              )}

              {subscriptionStatus.cancelAtPeriodEnd && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Your subscription will be cancelled at the end of the current billing period.
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Action Buttons */}
        <Separator />
        <div className="flex gap-3">
          {tier === 'free' ? (
            <Button
              onClick={handleUpgrade}
              disabled={createCheckoutMutation.isPending}
              className="flex-1"
            >
              {createCheckoutMutation.isPending ? 'Loading...' : 'Upgrade to Premium'}
            </Button>
          ) : (
            <>
              {subscriptionStatus?.cancelAtPeriodEnd ? (
                <Button
                  variant="outline"
                  className="flex-1"
                  disabled
                >
                  Subscription Ending
                </Button>
              ) : (
                <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      Cancel Subscription
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Subscription</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to cancel your premium subscription?
                        You'll still have access to premium features until the end of your current billing period.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowCancelDialog(false)}
                      >
                        Keep Subscription
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={cancelSubscriptionMutation.isPending}
                      >
                        {cancelSubscriptionMutation.isPending ? 'Cancelling...' : 'Cancel Subscription'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </>
          )}
        </div>

        {/* Premium Features List */}
        {tier === 'free' && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="font-medium">Premium Features Include:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Unlimited subscriptions tracking</li>
                <li>• AI-powered recommendations</li>
                <li>• Browser extension tracking</li>
                <li>• Cost-per-use analysis</li>
                <li>• Behavioral insights</li>
                <li>• Savings projections</li>
                <li>• Export reports</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}