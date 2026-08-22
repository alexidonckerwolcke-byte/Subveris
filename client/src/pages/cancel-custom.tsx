import { ExternalLink, Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/queryClient";

function getQueryValue(search: string, key: string) {
  return new URLSearchParams(search).get(key) || "";
}

export default function CancelCustomPage() {
  const [location] = useLocation();
  const search = location.split("?")[1] || "";
  const name = getQueryValue(search, "name") || "This subscription";
  const providerUrl = getQueryValue(search, "url");
  const [scan, setScan] = useState<{ candidates?: Array<{ url: string; label: string; score: number; pageTitle?: string }>; scannedPages?: string[]; guideSteps?: Array<{ title: string; description: string }>; note?: string } | null>(null);
  const [scanError, setScanError] = useState("");

  useEffect(() => {
    if (!providerUrl) return;
    let cancelled = false;
    apiRequest("POST", "/api/cancellation-guides/scan", { websiteUrl: providerUrl })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "The provider site could not be scanned.");
        if (!cancelled) setScan(data);
      })
      .catch((error) => {
        if (!cancelled) setScanError(error instanceof Error ? error.message : "The provider site could not be scanned.");
      });
    return () => { cancelled = true; };
  }, [providerUrl]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="rounded-3xl border border-emerald-500/20 bg-white p-8 shadow-sm dark:bg-slate-900">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">Subveris cancellation guide</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">How to cancel {name}</h1>
          <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
            This is a custom guide created from the provider URL you added. Subveris does not sign in, submit forms, or cancel the subscription for you.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <ol className="space-y-6">
            {!scan && !scanError && providerUrl ? <li><p className="font-semibold">Scanning the provider website...</p><p className="mt-2 text-slate-600 dark:text-slate-300">Subveris is looking through public pages for the provider's account, billing, and cancellation route.</p></li> : null}
            {(scan?.guideSteps || []).map((step, index) => (
              <li key={`${step.title}-${index}`}>
                <p className="font-semibold">{index + 1}. {step.title}</p>
                <p className="mt-2 text-slate-600 dark:text-slate-300">{step.description}</p>
              </li>
            ))}
            <li>
              <p className="font-semibold">{(scan?.guideSteps?.length || 0) + 1}. Open the provider page</p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Use the official provider page below and sign in yourself. Check that you are managing the correct account and subscription.
              </p>
              {providerUrl ? (
                <a
                  href={providerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-500"
                >
                  Open provider page
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <p className="mt-3 text-sm text-amber-700">No provider URL was saved. Return to Subveris and add one to generate a more useful guide.</p>
              )}
              {!scan && !scanError && providerUrl && (
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Scanning public provider pages for account and cancellation links...</p>
              )}
              {scanError && <p className="mt-4 text-sm text-amber-700">{scanError} Follow the provider page manually.</p>}
            </li>
            {scan?.candidates?.length ? (
              <li>
                <p className="font-semibold">Discovered provider routes</p>
                <div className="mt-3 space-y-2">
                  {scan.candidates.map((candidate) => (
                    <a key={candidate.url} href={candidate.url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                      <span>{candidate.label}</span><ExternalLink className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </li>
            ) : null}
            {!scan?.guideSteps?.length ? <li>
              <p className="font-semibold">Use the provider's account and billing settings</p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Look for Account, Billing, Membership, Plan, Subscription, Manage plan, or Turn off recurring billing. If you subscribed through Apple, Google Play, or another provider, use that billing account instead.
              </p>
            </li> : null}
            {!scan?.guideSteps?.length ? <li>
              <p className="font-semibold">Complete and verify cancellation</p>
              <p className="mt-2 text-slate-600 dark:text-slate-300">
                Follow the provider's prompts until it confirms the change. Save the confirmation email or final status screen, then return to Subveris and mark the subscription as cancelled.
              </p>
            </li> : null}
          </ol>
        </section>

        <Link href="/subscriptions" className="inline-block text-sm font-semibold text-emerald-700 hover:underline dark:text-emerald-300">
          Back to subscriptions
        </Link>
      </div>
    </main>
  );
}
