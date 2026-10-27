import { useEffect, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Download, RotateCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { usePageMeta } from "@/lib/usePageMeta";
import { getCurrencyExponent } from "@shared/affiliate-policy";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: currency.toUpperCase() })
      .format(amount / 10 ** getCurrencyExponent(currency));
  } catch {
    const exponent = getCurrencyExponent(currency);
    return `${(amount / 10 ** exponent).toFixed(exponent)} ${currency.toUpperCase()}`;
  }
}

function formatMoneyTotals(totals: Record<string, number> | undefined) {
  const entries = Object.entries(totals || {});
  return entries.length ? entries.map(([currency, amount]) => formatMoney(Number(amount), currency)).join(" · ") : "-";
}

export default function AffiliateAdminPage() {
  usePageMeta({
    title: "Affiliate Program Administration | Subveris",
    description: "Restricted Subveris affiliate program administration.",
    canonical: "https://subveris.com/affiliate/admin",
  });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState("");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [creatorSettingsOpen, setCreatorSettingsOpen] = useState<Record<string, boolean>>({});
  const [creatorSettingsDrafts, setCreatorSettingsDrafts] = useState<Record<string, { ratePercent: string; windowDays: string; minimumPayoutMinor: string }>>({});
  const [creatorSettingsReasons, setCreatorSettingsReasons] = useState<Record<string, string>>({});
  const [selectedCommissions, setSelectedCommissions] = useState<Record<string, boolean>>({});
  const [payout, setPayout] = useState({ paidAt: new Date().toISOString().slice(0, 16), reference: "", notes: "", reason: "" });

  const adminQuery = useQuery<any>({
    queryKey: ["/api/affiliate/admin", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => (await apiRequest("GET", "/api/affiliate/admin")).json(),
    retry: false,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["/api/affiliate/admin", user?.id] });
  };

  const reviewMutation = useMutation({
    mutationFn: async (input: { affiliateId: string; status: string; reason: string }) => {
      const response = await apiRequest("POST", "/api/affiliate/admin/review", input);
      return response.json();
    },
    onSuccess: async (result) => {
      setFeedback(result.referralCode ? `Approved. New referral code: ${result.referralCode}` : "Application updated.");
      await refresh();
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Could not update application."),
  });

  const codeMutation = useMutation({
    mutationFn: async (input: Record<string, string>) => {
      const response = await apiRequest("POST", "/api/affiliate/admin/code", input);
      return response.json();
    },
    onSuccess: async (result) => {
      setFeedback(result.referralCode ? `Referral code rotated: ${result.referralCode}` : "Referral code revoked.");
      await refresh();
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Could not update referral code."),
  });

  const creatorSettingsMutation = useMutation({
    mutationFn: async (input: {
      affiliateId: string;
      creatorName: string;
      ratePercent?: string;
      windowDays?: string;
      minimumPayoutMinor?: string;
      reason: string;
      useProgramDefaults?: boolean;
    }) => {
      const response = await apiRequest("POST", "/api/affiliate/admin/creator-settings", {
        affiliateId: input.affiliateId,
        useProgramDefaults: input.useProgramDefaults,
        rateBps: input.ratePercent === undefined ? undefined : Math.round(Number(input.ratePercent) * 100),
        attributionWindowDays: input.windowDays === undefined ? undefined : Number(input.windowDays),
        minimumPayoutCents: input.minimumPayoutMinor === undefined ? undefined : Number(input.minimumPayoutMinor),
        reason: input.reason,
      });
      await response.json();
      return input;
    },
    onSuccess: async (input) => {
      setFeedback(input.useProgramDefaults
        ? `${input.creatorName}'s terms now use the program defaults.`
        : `${input.creatorName}'s terms were updated.`);
      setCreatorSettingsReasons((current) => ({ ...current, [input.affiliateId]: "" }));
      if (input.useProgramDefaults) {
        setCreatorSettingsDrafts((current) => {
          const next = { ...current };
          delete next[input.affiliateId];
          return next;
        });
      }
      await refresh();
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Could not update creator terms."),
  });

  const commissionMutation = useMutation({
    mutationFn: async (input: { commissionId: string; status: string; reason: string }) => {
      const response = await apiRequest("POST", "/api/affiliate/admin/commission", input);
      return response.json();
    },
    onSuccess: async () => {
      setFeedback("Commission status updated and audited.");
      await refresh();
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Could not update commission."),
  });

  const payoutMutation = useMutation({
    mutationFn: async () => {
      const selected = (adminQuery.data?.commissions || []).filter((commission: any) => selectedCommissions[commission.id]);
      const affiliates = new Set(selected.map((commission: any) => commission.affiliate_id));
      const currencies = new Set(selected.map((commission: any) => commission.currency));
      if (!selected.length || affiliates.size !== 1 || currencies.size !== 1) {
        throw new Error("Select approved commissions for one affiliate and one currency.");
      }
      const response = await apiRequest("POST", "/api/affiliate/admin/payout", {
        affiliateId: selected[0].affiliate_id,
        commissionIds: selected.map((commission: any) => commission.id),
        paidAt: new Date(payout.paidAt).toISOString(),
        transactionReference: payout.reference,
        notes: payout.notes,
        reason: payout.reason,
      });
      return response.json();
    },
    onSuccess: async () => {
      setFeedback("Completed payout recorded and audited.");
      setSelectedCommissions({});
      setPayout((value) => ({ ...value, reference: "", notes: "", reason: "" }));
      await refresh();
    },
    onError: (error) => setFeedback(error instanceof Error ? error.message : "Could not record payout."),
  });

  const exportCsv = async (affiliate?: { id: string; creator_name: string }) => {
    try {
      const query = affiliate ? `?affiliateId=${encodeURIComponent(affiliate.id)}` : "";
      const response = await apiRequest("GET", `/api/affiliate/admin/export.csv${query}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      const creatorSlug = affiliate?.creator_name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      anchor.download = affiliate
        ? `affiliate-${creatorSlug || affiliate.id}-commissions.csv`
        : "affiliate-commissions.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      setFeedback(affiliate ? `Commission report exported for ${affiliate.creator_name}.` : "Commission report exported.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Could not export commission report.");
    }
  };

  const reasonFor = (id: string) => reasons[id] || "";
  const setReasonFor = (id: string, value: string) => setReasons((current) => ({ ...current, [id]: value }));

  if (!user) {
    return <AdminShell><h1 className="text-3xl font-semibold">Administrator sign-in required</h1><p className="text-muted-foreground">Sign in with an approved program administrator account.</p><Button asChild><Link href={`/login?next=${encodeURIComponent("/affiliate/admin")}`}>Sign in</Link></Button></AdminShell>;
  }
  if (adminQuery.isLoading) return <AdminShell><p role="status" className="text-sm text-muted-foreground">Checking administrator access...</p></AdminShell>;
  if (adminQuery.isError) {
    const status = (adminQuery.error as Error & { status?: number })?.status;
    return <AdminShell><h1 className="text-2xl font-semibold">{status === 404 ? "Affiliate API is not deployed" : "Administrator access unavailable"}</h1><p role="alert" className="text-sm text-muted-foreground">{status === 404 ? "Apply the affiliate migration and deploy the updated Supabase api function." : status === 403 ? "This account is not in the server-side affiliate administrator allowlist." : "Could not verify affiliate administrator access. Refresh and try again."}</p></AdminShell>;
  }

  const data = adminQuery.data;
  const activeSelections = Object.values(selectedCommissions).some(Boolean);
  const creatorSettingsDraft = (affiliate: any) => creatorSettingsDrafts[affiliate.id] || {
    ratePercent: String((affiliate.commission_rate_bps_override ?? data.settings.commission_rate_bps) / 100),
    windowDays: String(affiliate.attribution_window_days_override ?? data.settings.attribution_window_days),
    minimumPayoutMinor: String(affiliate.minimum_payout_cents_override ?? data.settings.minimum_payout_cents),
  };

  return (
    <AdminShell>
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
        <div><p className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck className="h-4 w-4" /> Restricted operations</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Affiliate administration</h1><p className="mt-2 text-sm text-muted-foreground">Review applications, commission eligibility, policy, and completed manual payouts.</p></div>
        <Button variant="outline" onClick={() => exportCsv()}><Download className="mr-2 h-4 w-4" />Export commission CSV</Button>
      </header>

      {feedback ? <p role="status" className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">{feedback}</p> : null}

      <section className="space-y-3" aria-labelledby="affiliate-applications-heading">
        <div className="border-b border-border pb-3"><h2 id="affiliate-applications-heading" className="text-xl font-semibold">Applications and accounts</h2><p className="mt-1 text-sm text-muted-foreground">Creator contact details are visible only in this allowlisted administrator view.</p></div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Creator</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Platform / audience</th><th className="px-4 py-3">Activity · 24 months</th><th className="px-4 py-3">Promotion plan</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Referral code</th><th className="px-4 py-3">Review / export</th></tr></thead>
            <tbody className="divide-y">
              {data.affiliates.length ? data.affiliates.map((affiliate: any) => {
                const activeCode = (data.codes || []).find((code: any) => code.affiliate_id === affiliate.id && code.is_active);
                return <tr key={affiliate.id}>
                  <td className="px-4 py-3"><div className="font-medium">{affiliate.creator_name}</div><div className="text-xs text-muted-foreground">Applied {formatDate(affiliate.applied_at)}</div></td>
                  <td className="px-4 py-3">{affiliate.email || "Deleted account"}</td>
                  <td className="px-4 py-3">{affiliate.platform}<div className="text-xs text-muted-foreground">{affiliate.audience_size?.toLocaleString() ?? "Audience not stated"}</div></td>
                    <td className="px-4 py-3">{affiliate.stats?.total_clicks ?? 0} clicks<div className="text-xs text-muted-foreground">{affiliate.stats?.registrations ?? 0} registered · {affiliate.stats?.paying_customers ?? 0} paid</div><div className="text-xs text-muted-foreground">Earned {formatMoneyTotals(affiliate.stats?.commissions_earned_by_currency)}</div></td>
                  <td className="max-w-56 px-4 py-3 text-muted-foreground">{affiliate.promotion_plan}</td>
                  <td className="px-4 py-3">{affiliate.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">{activeCode?.code || "-"}</td>
                  <td className="min-w-64 px-4 py-3">
                    <Button className="mb-2" size="sm" variant="outline" onClick={() => exportCsv(affiliate)}><Download className="mr-1 h-3 w-3" />Export commissions</Button>
                    <Button className="mb-2" size="sm" variant="outline" onClick={() => setCreatorSettingsOpen((current) => ({ ...current, [affiliate.id]: !current[affiliate.id] }))}>
                      {creatorSettingsOpen[affiliate.id] ? "Hide creator terms" : "Creator terms"}
                    </Button>
                    {creatorSettingsOpen[affiliate.id] ? (() => {
                      const draft = creatorSettingsDraft(affiliate);
                      const hasCreatorOverrides = affiliate.commission_rate_bps_override !== null && affiliate.commission_rate_bps_override !== undefined
                        || affiliate.attribution_window_days_override !== null && affiliate.attribution_window_days_override !== undefined
                        || affiliate.minimum_payout_cents_override !== null && affiliate.minimum_payout_cents_override !== undefined;
                      return <form className="mb-3 space-y-2 rounded-md border p-3" onSubmit={(event) => {
                        event.preventDefault();
                        creatorSettingsMutation.mutate({
                          affiliateId: affiliate.id,
                          creatorName: affiliate.creator_name,
                          ...draft,
                          reason: creatorSettingsReasons[affiliate.id] || "",
                        });
                      }}>
                        <p className="text-xs font-medium">Commission terms for {affiliate.creator_name}</p>
                        <p className="text-xs text-muted-foreground">{hasCreatorOverrides ? "Creator-specific overrides are active." : "This creator currently uses program defaults."}</p>
                        <div className="space-y-1"><Label htmlFor={`creator-rate-${affiliate.id}`}>Commission rate (%)</Label><Input id={`creator-rate-${affiliate.id}`} type="number" min="0.01" max="100" step="0.01" required value={draft.ratePercent} onChange={(event) => setCreatorSettingsDrafts((current) => ({ ...current, [affiliate.id]: { ...draft, ratePercent: event.target.value } }))} /></div>
                        <div className="space-y-1"><Label htmlFor={`creator-window-${affiliate.id}`}>Attribution days</Label><Input id={`creator-window-${affiliate.id}`} type="number" min="1" max="365" step="1" required value={draft.windowDays} onChange={(event) => setCreatorSettingsDrafts((current) => ({ ...current, [affiliate.id]: { ...draft, windowDays: event.target.value } }))} /></div>
                        <div className="space-y-1"><Label htmlFor={`creator-minimum-${affiliate.id}`}>Minimum payout (minor units)</Label><Input id={`creator-minimum-${affiliate.id}`} type="number" min="0" step="1" required value={draft.minimumPayoutMinor} onChange={(event) => setCreatorSettingsDrafts((current) => ({ ...current, [affiliate.id]: { ...draft, minimumPayoutMinor: event.target.value } }))} /></div>
                        <Input aria-label={`Audit reason for ${affiliate.creator_name} terms`} placeholder="Required audit reason" maxLength={1000} required value={creatorSettingsReasons[affiliate.id] || ""} onChange={(event) => setCreatorSettingsReasons((current) => ({ ...current, [affiliate.id]: event.target.value }))} />
                        <div className="flex flex-wrap gap-1">
                          <Button size="sm" type="submit" disabled={creatorSettingsMutation.isPending}>{creatorSettingsMutation.isPending ? "Saving..." : "Save terms"}</Button>
                          <Button size="sm" type="button" variant="outline" disabled={creatorSettingsMutation.isPending || !creatorSettingsReasons[affiliate.id]?.trim()} onClick={() => creatorSettingsMutation.mutate({
                            affiliateId: affiliate.id,
                            creatorName: affiliate.creator_name,
                            reason: creatorSettingsReasons[affiliate.id] || "",
                            useProgramDefaults: true,
                          })}>Use program defaults</Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Program defaults: {(data.settings.commission_rate_bps / 100).toFixed(2)}%, {data.settings.attribution_window_days} days, {data.settings.minimum_payout_cents} minor units. Attribution changes apply to future referral clicks; commission rate changes apply to future eligible payments.</p>
                      </form>;
                    })() : null}
                    <Input className="mb-2 h-8" aria-label={`Reason for ${affiliate.creator_name}`} placeholder="Required reason" value={reasonFor(affiliate.id)} onChange={(event) => setReasonFor(affiliate.id, event.target.value)} />
                    <div className="flex flex-wrap gap-1">
                      {(affiliate.status === "pending" ? ["approved", "rejected"] : ["approved", "suspended", "inactive"]).map((nextStatus: string) => <Button key={nextStatus} size="sm" variant={nextStatus === "approved" ? "default" : "outline"} disabled={!reasonFor(affiliate.id).trim() || reviewMutation.isPending} onClick={() => reviewMutation.mutate({ affiliateId: affiliate.id, status: nextStatus, reason: reasonFor(affiliate.id) })}>{nextStatus}</Button>)}
                    </div>
                    {activeCode ? <div className="mt-2 flex gap-1"><Button size="sm" variant="outline" disabled={!reasonFor(affiliate.id).trim()} onClick={() => codeMutation.mutate({ action: "rotate", affiliateId: affiliate.id, reason: reasonFor(affiliate.id) })}><RotateCw className="mr-1 h-3 w-3" />Rotate</Button><Button size="sm" variant="outline" disabled={!reasonFor(affiliate.id).trim()} onClick={() => codeMutation.mutate({ action: "revoke", codeId: activeCode.id, reason: reasonFor(affiliate.id) })}>Revoke</Button></div> : null}
                  </td>
                </tr>;
              }) : <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No affiliate applications yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="affiliate-attributions-heading">
        <div className="border-b border-border pb-3"><h2 id="affiliate-attributions-heading" className="text-xl font-semibold">Referral attribution register</h2><p className="mt-1 text-sm text-muted-foreground">Customer account IDs are shown only in this allowlisted administrator view; affiliates receive shortened referral references.</p></div>
        <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Referral</th><th className="px-4 py-3">Customer account</th><th className="px-4 py-3">Affiliate</th><th className="px-4 py-3">Clicked</th><th className="px-4 py-3">Registered</th><th className="px-4 py-3">First paid</th><th className="px-4 py-3">First plan</th></tr></thead>
          <tbody className="divide-y">{data.attributions?.length ? data.attributions.map((item: any) => <tr key={item.id}><td className="px-4 py-3 font-mono text-xs">{item.id.slice(0, 8)}</td><td className="px-4 py-3 font-mono text-xs">{item.user_id || "deleted"}</td><td className="px-4 py-3">{data.affiliates.find((affiliate: any) => affiliate.id === item.affiliate_id)?.creator_name || item.affiliate_id.slice(0, 8)}</td><td className="px-4 py-3">{formatDate(item.clicked_at)}</td><td className="px-4 py-3">{formatDate(item.created_at)}</td><td className="px-4 py-3">{formatDate(item.first_paid_at)}</td><td className="px-4 py-3">{item.first_paid_plan_type || "-"}{item.first_paid_amount_minor !== null ? <div className="text-xs">{formatMoney(item.first_paid_amount_minor, item.first_paid_currency)}</div> : null}<div className="text-xs text-muted-foreground">{item.first_paid_eligibility_reason?.replaceAll("_", " ") || "No payment yet"}</div></td></tr>) : <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No attributed accounts recorded.</td></tr>}</tbody>
        </table></div>
      </section>

      <section className="space-y-3" aria-labelledby="affiliate-commissions-heading">
        <div className="border-b border-border pb-3"><h2 id="affiliate-commissions-heading" className="text-xl font-semibold">Commission review</h2><p className="mt-1 text-sm text-muted-foreground">Only verified Stripe payments create records. Approval and reversal require an audit reason.</p></div>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Payout</th><th className="px-4 py-3">Affiliate / customer</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Admin action</th></tr></thead>
            <tbody className="divide-y">
              {data.commissions.length ? data.commissions.map((commission: any) => {
                const affiliate = data.affiliates.find((item: any) => item.id === commission.affiliate_id);
                const canReview = ["pending_review", "approved", "held"].includes(commission.status);
                return <tr key={commission.id}>
                  <td className="px-4 py-3">{commission.status === "approved" ? <input type="checkbox" aria-label={`Select commission ${commission.id} for payout`} checked={Boolean(selectedCommissions[commission.id])} onChange={(event) => setSelectedCommissions((current) => ({ ...current, [commission.id]: event.target.checked }))} /> : "-"}</td>
                  <td className="px-4 py-3">{affiliate?.creator_name || commission.affiliate_id.slice(0, 8)}<div className="text-xs text-muted-foreground">Customer {commission.referred_user_id ? commission.referred_user_id.slice(0, 8) : "deleted"}</div></td>
                  <td className="px-4 py-3">{formatMoney(commission.amount_paid_cents, commission.currency)}<div className="font-mono text-xs text-muted-foreground">{commission.stripe_invoice_id}</div></td>
                  <td className="px-4 py-3">{formatMoney(commission.commission_amount_cents, commission.currency)}<div className="text-xs text-muted-foreground">{(commission.commission_rate_bps / 100).toFixed(2)}%</div></td>
                  <td className="px-4 py-3">{commission.status}{commission.hold_reason || commission.reversal_reason ? <div className="max-w-48 text-xs text-muted-foreground">{commission.hold_reason || commission.reversal_reason}</div> : null}</td>
                  <td className="min-w-64 px-4 py-3">
                    {canReview ? <>
                      <Input className="mb-2 h-8" aria-label={`Reason for commission ${commission.id}`} placeholder="Required reason" value={reasonFor(commission.id)} onChange={(event) => setReasonFor(commission.id, event.target.value)} />
                      <div className="flex gap-1">
                        {commission.status === "pending_review" ? <Button size="sm" disabled={!reasonFor(commission.id).trim() || commissionMutation.isPending} onClick={() => commissionMutation.mutate({ commissionId: commission.id, status: "approved", reason: reasonFor(commission.id) })}>Approve</Button> : null}
                        <Button size="sm" variant="destructive" disabled={!reasonFor(commission.id).trim() || commissionMutation.isPending} onClick={() => commissionMutation.mutate({ commissionId: commission.id, status: "reversed", reason: reasonFor(commission.id) })}>Reverse</Button>
                      </div>
                    </> : "-"}
                  </td>
                </tr>;
              }) : <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No commission records yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <Card className="rounded-md shadow-none">
        <CardHeader><CardTitle className="text-lg">Record a completed manual payout</CardTitle><CardDescription>Only approved commissions can be paid. The database calculates the amount and prevents duplicate allocation. Do not submit a scheduled payment as completed.</CardDescription></CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => { event.preventDefault(); payoutMutation.mutate(); }}>
            <div className="space-y-2"><Label htmlFor="payout-date">Completed at</Label><Input id="payout-date" type="datetime-local" required max={new Date().toISOString().slice(0, 16)} value={payout.paidAt} onChange={(event) => setPayout((value) => ({ ...value, paidAt: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="payout-reference">Payment transaction reference</Label><Input id="payout-reference" maxLength={200} required value={payout.reference} onChange={(event) => setPayout((value) => ({ ...value, reference: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="payout-notes">Notes (optional)</Label><Input id="payout-notes" maxLength={1000} value={payout.notes} onChange={(event) => setPayout((value) => ({ ...value, notes: event.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="payout-reason">Audit reason</Label><Input id="payout-reason" maxLength={1000} required value={payout.reason} onChange={(event) => setPayout((value) => ({ ...value, reason: event.target.value }))} /></div>
            <div className="md:col-span-2"><p className="mb-3 text-xs text-muted-foreground">Selected commissions must belong to one affiliate and one currency. {activeSelections ? "Selection ready for validation." : "Select approved commission rows above."}</p><Button type="submit" disabled={!activeSelections || payoutMutation.isPending}>{payoutMutation.isPending ? "Recording..." : "Record completed payout"}</Button></div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3" aria-labelledby="affiliate-payout-history-heading">
        <div className="border-b border-border pb-3"><h2 id="affiliate-payout-history-heading" className="text-xl font-semibold">Payout history</h2></div>
        <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Affiliate</th><th className="px-4 py-3">Completed</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Reference</th></tr></thead>
          <tbody className="divide-y">{data.payouts.length ? data.payouts.map((item: any) => <tr key={item.id}><td className="px-4 py-3">{data.affiliates.find((affiliate: any) => affiliate.id === item.affiliate_id)?.creator_name || item.affiliate_id.slice(0, 8)}</td><td className="px-4 py-3">{formatDate(item.paid_at)}</td><td className="px-4 py-3">{formatMoney(item.amount_cents, item.currency)}</td><td className="px-4 py-3 font-mono text-xs">{item.transaction_reference}</td></tr>) : <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No payouts recorded.</td></tr>}</tbody>
        </table></div>
      </section>
      <section className="space-y-3" aria-labelledby="affiliate-audit-heading">
        <div className="border-b border-border pb-3"><h2 id="affiliate-audit-heading" className="text-xl font-semibold">Administrative audit trail</h2><p className="mt-1 text-sm text-muted-foreground">Recent approval, commission, code, settings, and payout changes with administrator and reason.</p></div>
        <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Administrator</th><th className="px-4 py-3">Action</th><th className="px-4 py-3">Record</th><th className="px-4 py-3">Reason</th></tr></thead>
          <tbody className="divide-y">{data.auditLogs?.length ? data.auditLogs.map((entry: any) => <tr key={entry.id}><td className="px-4 py-3">{formatDate(entry.created_at)}</td><td className="px-4 py-3 font-mono text-xs">{entry.admin_user_id?.slice(0, 8) || "System"}</td><td className="px-4 py-3">{entry.action}</td><td className="px-4 py-3">{entry.entity_type} {entry.entity_id?.slice(0, 8) || ""}</td><td className="max-w-72 px-4 py-3 text-muted-foreground">{entry.reason}</td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No administrative changes recorded.</td></tr>}</tbody>
        </table></div>
      </section>

      <section className="space-y-3" aria-labelledby="affiliate-risk-events-heading">
        <div className="border-b border-border pb-3"><h2 id="affiliate-risk-events-heading" className="text-xl font-semibold">Stripe refund and dispute events</h2><p className="mt-1 text-sm text-muted-foreground">Verified webhook events are retained for idempotency and commission review.</p></div>
        <div className="overflow-x-auto rounded-md border"><table className="w-full min-w-[680px] text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Commission</th><th className="px-4 py-3">Reason / details</th></tr></thead>
          <tbody className="divide-y">{data.stripeRiskEvents?.length ? data.stripeRiskEvents.map((entry: any) => <tr key={entry.stripe_event_id}><td className="px-4 py-3">{formatDate(entry.created_at)}</td><td className="px-4 py-3">{entry.event_type}</td><td className="px-4 py-3 font-mono text-xs">{entry.commission_id?.slice(0, 8) || "-"}</td><td className="max-w-80 px-4 py-3 text-muted-foreground">{entry.details?.reason || entry.details?.dispute_outcome || "-"}</td></tr>) : <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No refund or dispute events recorded.</td></tr>}</tbody>
        </table></div>
      </section>
    </AdminShell>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"><Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to Subveris</Link>{children}</main>;
}