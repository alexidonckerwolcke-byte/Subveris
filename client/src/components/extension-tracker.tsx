import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, TrendingUp, Activity } from "lucide-react";
import type { Subscription } from "@shared/schema";

interface ExtensionTrackerProps {
  subscriptions: Subscription[];
}

export function ExtensionTracker({ subscriptions }: ExtensionTrackerProps) {
  // Filter subscriptions that have a websiteDomain set
  const trackedSubscriptions = subscriptions.filter(
    (sub) => sub.websiteDomain && sub.status !== "deleted" && sub.status !== "to-cancel"
  );

  if (trackedSubscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Browser Extension Tracking
          </CardTitle>
          <CardDescription>
            Set website domains for your subscriptions to enable automatic usage tracking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">
              No subscriptions have website domains configured yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Edit your subscriptions and add a website domain (e.g., netflix.com) to enable automatic usage tracking.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Browser Extension Tracking
        </CardTitle>
        <CardDescription>
          Subscriptions being tracked by the browser extension
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trackedSubscriptions.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between p-3 bg-muted rounded-lg border border-muted-foreground/10"
            >
              <div className="flex items-center gap-3 flex-1">
                <Globe className="h-4 w-4 text-primary" />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{sub.name}</p>
                  <p className="text-xs text-muted-foreground">{sub.websiteDomain}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {sub.usageCount || 0} uses
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-900 border border-blue-200">
          <p className="font-medium mb-1">💡 How it works:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Install the Subveris browser extension from your browser's app store</li>
            <li>Log in on Subveris to sync your account</li>
            <li>The extension automatically tracks time spent on tracked domains</li>
            <li>Usage counts update in real-time as you visit these websites</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
