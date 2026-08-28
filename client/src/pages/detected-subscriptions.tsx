import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";
import { useCurrency } from "@/lib/currency-context";
import { useAuth } from "@/lib/auth-context";
import { useSubscription } from "@/lib/subscription-context";
import { PremiumGate } from "@/components/premium-gate";
import { useFamilyDataMode } from "@/hooks/use-family-data";
import { getVisibleFamilySubscriptions } from "@/lib/family-data";
import { Sparkles, ExternalLink, Plus, ArrowRight } from "lucide-react";
import type { Subscription } from "@shared/schema";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

export default function DetectedSubscriptions() {
  const { formatAmount } = useCurrency();
  const { user } = useAuth();
  const { limits } = useSubscription();
  const { familyGroupId, showFamilyData } = useFamilyDataMode();
  const [, navigate] = useLocation();

  const { data: subscriptions = [], isLoading } = useQuery<Subscription[]>({
    queryKey: ["/api/subscriptions"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/subscriptions");
      return response.json();
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  const { data: familyData } = useQuery<any>({
    queryKey: ["/api/family-groups", familyGroupId, "family-data"],
    enabled: !!familyGroupId,
    queryFn: async () => {
      if (!familyGroupId) return null;
      const response = await apiRequest("GET", `/api/family-groups/${familyGroupId}/family-data`);
      return response.json();
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
  });

  const visibleSubscriptions = showFamilyData
    ? getVisibleFamilySubscriptions(familyData, user?.id)
    : subscriptions;

  const detectedSubscriptions = useMemo(() => {
    return (visibleSubscriptions || [])
      .filter((sub) => sub?.isDetected === true || (sub as any)?.is_detected === true)
      .sort((a, b) => (a?.name || "").localeCompare(b?.name || ""));
  }, [visibleSubscriptions]);

  const totalDetectedAmount = detectedSubscriptions.reduce((sum, sub) => sum + (Number(sub?.amount) || 0), 0);

  const categories = Array.from(new Set(detectedSubscriptions.map((sub) => sub?.category || "other")));

  const handleAddManually = () => {
    navigate("/subscriptions");
  };

  return (
    <PremiumGate feature="Extension Tracking" showBlurred={false}>
      <div className="flex-1 overflow-auto">
        <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
          <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-6 text-slate-900 shadow-sm dark:border-slate-700 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 dark:text-white">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-300">
                Browser detection
              </p>
              <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-8 w-8 text-amber-500" />
                Detected Subscriptions
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                Services discovered by the Subveris extension as you browse the web. Review and confirm each detection.
              </p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-3xl shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-500">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Detected Services
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
                  {detectedSubscriptions.length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">extension</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-500">
                <ArrowRight className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Monthly Cost
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
                  {formatAmount(totalDetectedAmount)}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">/mo</p>
              </div>
            </div>
          </Card>

          <Card className="rounded-3xl shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-500">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  Categories
                </p>
                <p className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
                  {categories.length}
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400">types</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main content */}
        {isLoading ? (
          <Card className="rounded-3xl border-slate-200/80 bg-card p-6 shadow-sm">
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400">Loading detected subscriptions...</p>
            </div>
          </Card>
        ) : detectedSubscriptions.length === 0 ? (
          <Card className="rounded-3xl border-slate-200/80 bg-card p-6 shadow-sm">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xl font-semibold text-slate-900 dark:text-white">
                No detected subscriptions yet
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <p className="text-slate-600 dark:text-slate-400">
                The Subveris extension detects subscriptions as you visit service websites. Detection works by identifying when you're on a known subscription service's site (like Netflix, Spotify, etc.).
              </p>
              <div className="rounded-lg bg-slate-50 dark:bg-slate-950/50 p-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-900 dark:text-white">To get detections:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Visit the websites or apps where you have subscriptions</li>
                  <li>The extension will detect your active sessions automatically</li>
                  <li>Detections will appear here for you to review</li>
                </ul>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Don't see a subscription you have? You can add it manually in the Subscriptions section.
              </p>
              <Button
                onClick={handleAddManually}
                className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
              >
                Add manually instead
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {detectedSubscriptions.map((sub) => (
              <Card
                key={sub.id}
                className="rounded-3xl border-slate-200/80 bg-card hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {sub.name}
                        </h3>
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          <Sparkles className="h-3 w-3 mr-1" />
                          Detected
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 capitalize">
                        {sub.category} • {sub.frequency || "monthly"}
                      </p>
                      {(sub as any)?.website_domain && (
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          {(sub as any)?.website_domain}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col lg:items-end gap-3">
                      <div className="text-right">
                        <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                          {formatAmount(sub.amount)}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 uppercase tracking-[0.1em]">
                          {sub.frequency || "monthly"}
                        </p>
                      </div>

                      <div className="flex gap-2 lg:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full text-slate-900 dark:text-slate-100"
                          onClick={() => navigate(`/subscriptions?id=${sub.id}`)}
                        >
                          Review
                        </Button>
                        <Button
                          size="sm"
                          className="rounded-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200"
                          onClick={() => navigate(`/subscriptions?id=${sub.id}`)}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Info section */}
        <Card className="rounded-3xl border-slate-200/80 bg-gradient-to-br from-amber-50 via-slate-50 to-slate-50 p-6 shadow-sm dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900">
          <CardHeader className="p-0 mb-4">
            <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              How extension detection works
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 text-sm text-slate-600 dark:text-slate-400 space-y-3">
            <div className="space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">What the extension detects:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>When you visit a known subscription service website</li>
                <li>Active sessions and logged-in status</li>
                <li>Service name, category, and browsing context</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-slate-900 dark:text-white">What the extension cannot detect:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Subscriptions you have but haven't visited recently</li>
                <li>Subscriptions managed through third-party platforms</li>
                <li>Subscriptions you pay for through app stores or carriers</li>
                <li>Services that require extra authentication or aren't recognized</li>
              </ul>
            </div>
            <div className="rounded-lg bg-slate-100 dark:bg-slate-800/50 p-3 space-y-1">
              <p className="font-semibold text-slate-900 dark:text-white">Best practice:</p>
              <p>
                Use detected subscriptions as a starting point. For a complete picture, add any subscriptions you know about manually in the Subscriptions section, especially older ones or services you manage through different platforms.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    </PremiumGate>
  );
}
