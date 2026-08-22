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
  const trackedSubscriptions = subscriptions.filter((sub) => {
    const websiteDomain = sub.websiteDomain || (sub as any).website_domain;
    return Boolean(websiteDomain) && sub.status !== "deleted" && sub.status !== "to-cancel";
  });

  if (trackedSubscriptions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Optional Browser Extension
          </CardTitle>
          <CardDescription>
            Connect the optional extension to add browser usage signals to your subscription overview
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <p className="text-muted-foreground">
              No subscriptions have website domains configured yet.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Edit your subscriptions and add a website domain (for example, spotify.com) to connect optional browser usage signals.
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
          Optional Browser Signals
        </CardTitle>
        <CardDescription>
            Optional browser signals connected to your subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trackedSubscriptions.map((sub) => {
            const websiteDomain = sub.websiteDomain || (sub as any).website_domain;
            return (
              <div
                key={sub.id}
                className="flex items-center justify-between p-3 bg-muted rounded-lg border border-muted-foreground/10"
              >
                <div className="flex items-center gap-3 flex-1">
                  <Globe className="h-4 w-4 text-primary" />
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{sub.name}</p>
                    <p className="text-xs text-muted-foreground">{websiteDomain}</p>
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
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-900 border border-blue-200">
          <p className="font-medium mb-1">💡 How it works:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Install the optional Subveris browser extension from your browser's app store</li>
            <li>Log in on Subveris to sync your account</li>
            <li>The extension automatically monitors time spent on linked subscription domains</li>
            <li>Usage counts update in real-time as you use these services</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
