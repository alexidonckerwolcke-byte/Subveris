import { useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { usePageMeta } from "@/lib/usePageMeta";
import { getCurrencyExponent } from "@shared/affiliate-policy";

type AffiliateStatus = {
  status: "not_applied" | "pending" | "approved" | "rejected" | "suspended" | "inactive";
  affiliate?: { id: string; creatorName: string; platform: string; appliedAt: string };
  code?: { code: string; created_at: string } | null;
  rules?: { rateBps: number; attributionWindowDays: number; minimumPayoutMinor: number; commissionBasis: string };
};

function formatMoneyByCurrency(totals: Record<string, number> | undefined) {
  const entries = Object.entries(totals || {}).filter(([, amount]) => Number.isFinite(Number(amount)));
  if (!entries.length) return "0";
  return entries.map(([currency, amount]) => {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() })
        .format(Number(amount) / 10 ** getCurrencyExponent(currency));
    } catch {
      const exponent = getCurrencyExponent(currency);
      return `${(Number(amount) / 10 ** exponent).toFixed(exponent)} ${currency.toUpperCase()}`;
    }
  }).join(" · ");
}

function formatMoney(amount: number | null | undefined, currency: string | null | undefined) {
  if (amount === null || amount === undefined || !currency) return "Not yet paid";
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() })
      .format(amount / 10 ** getCurrencyExponent(currency));
  } catch {
    const exponent = getCurrencyExponent(currency);
    return `${(amount / 10 ** exponent).toFixed(exponent)} ${currency.toUpperCase()}`;
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function StatusPill({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending_review: "bg-amber-100 text-amber-900",
    approved: "bg-emerald-100 text-emerald-900",
    paid: "bg-blue-100 text-blue-900",
    held: "bg-orange-100 text-orange-900",
    reversed: "bg-red-100 text-red-900",
  };
  return <span className={`inline-flex rounded-sm px-2 py-1 text-xs font-medium ${colors[status] || "bg-muted text-foreground"}`}>{status.replaceAll("_", " ")}</span>;
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to Subveris
      </Link>
      {children}
    </main>
  );
}

export default function AffiliatePage() {
  usePageMeta({
    title: "Subveris Affiliate Program",
    description: "Apply to promote Subveris or review your approved affiliate referrals and commissions.",
    canonical: "https://subveris.com/affiliate",
  });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ creatorName: "", platform: "", audienceSize: "", promotionPlan: "" });
  const [formError, setFormError] = useState("");
  const [copied, setCopied] = useState(false);
  const [referralsPage, setReferralsPage] = useState(1);
  const [commissionsPage, setCommissionsPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);

  const statusQuery = useQuery<AffiliateStatus>({
    queryKey: ["/api/affiliate/status", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await apiRequest("GET", "/api/affiliate/status")).json(),
    retry: false,
  });

  const applicationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/affiliate/apply", {
        ...form,
        audienceSize: form.audienceSize,
      });
      return response.json();
    },
    onSuccess: async () => {
      setFormError("");
      await queryClient.invalidateQueries({ queryKey: ["/api/affiliate/status", user?.id] });
    },
    onError: (error) => setFormError(error instanceof Error ? error.message : "Could not submit the application."),
  });

  const dashboardQuery = useQuery<any>({
    queryKey: ["/api/affiliate/dashboard", user?.id, referralsPage, commissionsPage, payoutsPage],
    enabled: statusQuery.data?.status === "approved",
    queryFn: async () => {
      const params = new URLSearchParams({
        referralsPage: String(referralsPage),
        commissionsPage: String(commissionsPage),
        payoutsPage: String(payoutsPage),
      });
      return (await apiRequest("GET", `/api/affiliate/dashboard?${params}`)).json();
    },
    retry: false,
  });

  const copyLink = async () => {
    const link = dashboardQuery.data?.link;
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  if (!user) {
    return (
      <PageShell>
        <section className="max-w-2xl space-y-3 border-l-2 border-primary pl-5">
          <h1 className="text-3xl font-semibold tracking-tight">Subveris Affiliate Program</h1>
          <p className="text-muted-foreground">Sign in to apply or access an approved creator dashboard.</p>
          <Button asChild><Link href="/login?next=%2Faffiliate">Sign in</Link></Button>
        </section>
      </PageShell>
    );
  }

  if (statusQuery.isLoading) {
    return <PageShell><p role="status" className="text-sm text-muted-foreground">Loading affiliate access...</p></PageShell>;
  }

  if (statusQuery.isError) {
    const status = (statusQuery.error as Error & { status?: number })?.status;
    const message = status === 404
      ? "The affiliate API route is not deployed yet. Apply the affiliate migration and deploy the updated Supabase api function."
      : "Could not load affiliate access. Refresh and try again.";
    return <PageShell><p role="alert" className="max-w-2xl text-sm text-destructive">{message}</p></PageShell>;
  }

  if (statusQuery.data?.status === "approved") {
    const data = dashboardQuery.data;
    const stats = data?.stats;
    const percent = (data?.rules?.rateBps ?? 2000) / 100;
    const referralPages = Math.max(1, Math.ceil((data?.referralsPage?.total || 0) / (data?.referralsPage?.perPage || 25)));
    const commissionPages = Math.max(1, Math.ceil((data?.commissionsPage?.total || 0) / (data?.commissionsPage?.perPage || 25)));
    const payoutPages = Math.max(1, Math.ceil((data?.payoutsPage?.total || 0) / (data?.payoutsPage?.perPage || 25)));

    return (
      <PageShell>
        <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="text-sm font-medium text-primary">Creator workspace</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Affiliate dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Referral activity and commission records for {data?.affiliate?.creatorName || "your account"}.</p>
          </div>
        </header>

        {dashboardQuery.isError ? <p role="alert" className="text-sm text-destructive">Could not load affiliate totals.</p> : null}
        {dashboardQuery.isLoading ? <p role="status" className="text-sm text-muted-foreground">Loading referral and payment history...</p> : null}

        {data ? <>
          <section aria-label="Affiliate overview" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Referral clicks · 24 months", String(stats.totalClicks)],
              ["Registrations · 24 months", String(stats.registrations)],
              ["Paying customers · 24 months", `${stats.payingCustomers} · ${(stats.conversionRate * 100).toFixed(1)}% of clicks`],
              ["Eligible Premium payments", String(stats.eligiblePayments)],
              ["Commissions earned", formatMoneyByCurrency(stats.earnedByCurrency)],
              ["Pending review or held", formatMoneyByCurrency(stats.pendingByCurrency)],
              ["Approved, unpaid", formatMoneyByCurrency(stats.approvedByCurrency)],
              ["Paid historically", formatMoneyByCurrency(stats.paidByCurrency)],
            ].map(([label, value]) => (
              <Card key={label} className="rounded-md shadow-none">
                <CardHeader className="pb-2"><CardDescription>{label}</CardDescription></CardHeader>
                <CardContent><p className="text-xl font-semibold tabular-nums">{value}</p></CardContent>
              </Card>
            ))}
          </section>

          <Card className="rounded-md shadow-none">
            <CardHeader>
              <CardTitle className="text-lg">Referral link</CardTitle>
              <CardDescription>Code created {formatDate(data.codeCreatedAt)}. A customer is credited only after an eligible first Premium payment.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-2">
                <Label htmlFor="affiliate-link">Your link</Label>
                <Input id="affiliate-link" readOnly value={data.link || "No active referral code"} />
                <p className="text-xs text-muted-foreground">{percent}% of the first collected Premium payment, within {data.rules.attributionWindowDays} days. The basis is the amount paid after discounts, including tax. Browser tracking requires visitor opt-in.</p>
              </div>
              <Button type="button" variant="outline" onClick={copyLink} disabled={!data.link} aria-label="Copy referral link">
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </Button>
              {data.link ? <a href={data.link} target="_blank" rel="noreferrer" aria-label="Open referral link" className="inline-flex h-10 items-center justify-center rounded-md border px-3 text-sm"><ExternalLink className="h-4 w-4" /></a> : null}
            </CardContent>
          </Card>

          <section className="space-y-3" aria-labelledby="affiliate-referrals-heading">
            <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
              <div><h2 id="affiliate-referrals-heading" className="text-xl font-semibold">Referral history</h2><p className="mt-1 text-sm text-muted-foreground">Customers are shown by a short referral reference, not by name or email.</p></div>
              <Pager page={referralsPage} totalPages={referralPages} onChange={setReferralsPage} />
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Referral</th><th className="px-4 py-3">Registered</th><th className="px-4 py-3">Paying</th><th className="px-4 py-3">Eligible payment</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">Status</th></tr></thead>
                <tbody className="divide-y">
                  {data.referrals.length ? data.referrals.map((referral: any) => (
                    <tr key={referral.referralId}>
                      <td className="px-4 py-3 font-mono text-xs">{referral.referralId}</td>
                      <td className="px-4 py-3">{formatDate(referral.registeredAt)}</td>
                      <td className="px-4 py-3">{referral.becamePayingCustomerAt ? formatDate(referral.becamePayingCustomerAt) : "Not yet"}</td>
                      <td className="px-4 py-3">{referral.paymentAmountCents !== null ? formatMoney(referral.paymentAmountCents, referral.currency) : referral.becamePayingCustomerAt ? `${referral.paidPlan || "Paid"} · not commissionable` : "No successful payment"}<div className="text-xs text-muted-foreground">{referral.paymentQualification?.replaceAll("_", " ") || ""}</div></td>
                      <td className="px-4 py-3">{formatMoney(referral.commissionAmountCents, referral.currency)}</td>
                      <td className="px-4 py-3">{referral.commissionStatus ? <StatusPill status={referral.commissionStatus} /> : "-"}</td>
                    </tr>
                  )) : <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No attributed registrations yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="affiliate-commissions-heading">
            <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
              <div><h2 id="affiliate-commissions-heading" className="text-xl font-semibold">Commission history</h2><p className="mt-1 text-sm text-muted-foreground">Pending and held amounts are not payable. A payout is recorded as paid only after completion.</p></div>
              <Pager page={commissionsPage} totalPages={commissionPages} onChange={setCommissionsPage} />
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Payment ref.</th><th className="px-4 py-3">Basis</th><th className="px-4 py-3">Rate</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payout date</th></tr></thead>
                <tbody className="divide-y">
                  {data.commissions.length ? data.commissions.map((commission: any) => (
                    <tr key={commission.id}>
                      <td className="px-4 py-3">{formatDate(commission.created_at)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{commission.payment_reference || "-"}</td>
                      <td className="px-4 py-3">{formatMoney(commission.amount_paid_cents, commission.currency)}</td>
                      <td className="px-4 py-3">{(commission.commission_rate_bps / 100).toFixed(2)}%</td>
                      <td className="px-4 py-3">{formatMoney(commission.commission_amount_cents, commission.currency)}</td>
                      <td className="px-4 py-3"><StatusPill status={commission.status} />{commission.hold_reason || commission.reversal_reason ? <p className="mt-1 max-w-48 text-xs text-muted-foreground">{commission.hold_reason || commission.reversal_reason}</p> : null}</td>
                      <td className="px-4 py-3">{formatDate(commission.paid_at)}</td>
                    </tr>
                  )) : <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No eligible payments yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3" aria-labelledby="affiliate-payouts-heading">
            <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
              <div><h2 id="affiliate-payouts-heading" className="text-xl font-semibold">Completed payouts</h2><p className="mt-1 text-sm text-muted-foreground">This history includes only payouts recorded as completed by an administrator.</p></div>
              <Pager page={payoutsPage} totalPages={payoutPages} onChange={setPayoutsPage} />
            </div>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Paid date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Transaction reference</th></tr></thead>
                <tbody className="divide-y">
                  {data.payouts.length ? data.payouts.map((payout: any) => (
                    <tr key={payout.id}><td className="px-4 py-3">{formatDate(payout.paid_at)}</td><td className="px-4 py-3">{formatMoney(payout.amount_cents, payout.currency)}</td><td className="px-4 py-3 font-mono text-xs">{payout.transaction_reference}</td></tr>
                  )) : <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No completed payouts yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </> : null}
      </PageShell>
    );
  }

  if (statusQuery.data?.status && statusQuery.data.status !== "not_applied") {
    const statusCopy: Record<string, { title: string; description: string }> = {
      pending: { title: "Application under review", description: "Your application is saved. We’ll show your referral link here after it is reviewed." },
      rejected: { title: "Application not approved", description: "This application was not approved. Contact support if you need clarification." },
      suspended: { title: "Affiliate access suspended", description: "Your referral code is inactive while the program team reviews your account." },
      inactive: { title: "Affiliate access inactive", description: "Your referral code is no longer active. Existing commission and payout records remain available to the program team." },
    };
    const copy = statusCopy[statusQuery.data.status] || statusCopy.pending;
    return <PageShell><section className="max-w-2xl space-y-3 border-l-2 border-primary pl-5"><p className="text-sm font-medium text-primary">Affiliate program</p><h1 className="text-3xl font-semibold">{copy.title}</h1><p className="text-muted-foreground">{copy.description}</p></section></PageShell>;
  }

  return (
    <PageShell>
      <section className="max-w-3xl border-b border-border pb-6">
        <p className="text-sm font-medium text-primary">Creator partnerships</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Apply to the Subveris affiliate program</h1>
        <p className="mt-3 text-muted-foreground">Applications are reviewed by the Subveris team. Approved creators receive a unique link and a private dashboard. Referral clicks, free registrations, failed payments, Family payments, and renewals do not earn commission; if a customer&apos;s first paid plan is Family, a later Premium payment is not eligible either.</p>
      </section>
      <Card className="max-w-3xl rounded-md shadow-none">
        <CardHeader><CardTitle className="text-lg">Creator application</CardTitle><CardDescription>We use these details to review your audience and promotion plan. Do not include private customer information.</CardDescription></CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); setFormError(""); applicationMutation.mutate(); }}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="creator-name">Creator or organization name</Label><Input id="creator-name" maxLength={100} required value={form.creatorName} onChange={(event) => setForm((value) => ({ ...value, creatorName: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="creator-platform">Primary platform</Label><Input id="creator-platform" maxLength={100} required placeholder="YouTube, Instagram, newsletter..." value={form.platform} onChange={(event) => setForm((value) => ({ ...value, platform: event.target.value }))} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="creator-audience">Approximate audience size</Label><Input id="creator-audience" type="number" min="0" step="1" value={form.audienceSize} onChange={(event) => setForm((value) => ({ ...value, audienceSize: event.target.value }))} /></div>
              <div className="space-y-2"><Label htmlFor="creator-plan">How will you promote Subveris?</Label><Input id="creator-plan" maxLength={1500} required value={form.promotionPlan} onChange={(event) => setForm((value) => ({ ...value, promotionPlan: event.target.value }))} /></div>
            </div>
            {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
            <p className="text-xs leading-5 text-muted-foreground">The current rate is {((statusQuery.data?.rules?.rateBps ?? 2000) / 100).toFixed(2)}% of the first successfully collected Premium payment during the {statusQuery.data?.rules?.attributionWindowDays ?? 30}-day attribution window. The commission basis is the amount paid after discounts, including tax. The minimum payout is {statusQuery.data?.rules?.minimumPayoutMinor ? `${statusQuery.data.rules.minimumPayoutMinor} minor units in a single currency` : "disabled"}. Refunds reverse unpaid commissions; disputes hold a commission until resolved. Paid commissions remain visible in payout history if a later refund occurs. Administrators may update program terms prospectively.</p>
            <Button type="submit" disabled={applicationMutation.isPending}>{applicationMutation.isPending ? "Submitting..." : "Submit application"}</Button>
          </form>
        </CardContent>
      </Card>
    </PageShell>
  );
}

function Pager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="tabular-nums text-muted-foreground">{page} / {totalPages}</span>
      <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>Previous</Button>
      <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Next</Button>
    </div>
  );
}