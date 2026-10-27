import {
  selectLatestEligibleAffiliateClick,
  normalizeAffiliateCode,
} from "../../../shared/affiliate-policy.ts";

type AffiliateDependencies = {
  db: any;
  authClient: any;
  stripeSecretKey: string;
  adminUserIds: string[];
};

const VISITOR_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...headers },
  });
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch {
    return null;
  }
}

async function verifyUser(req: Request, authClient: any): Promise<any | null> {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const token = authorization.slice(7).trim();
  if (!token) return null;
  try {
    const { data, error } = await authClient.auth.getUser(token);
    return error ? null : data?.user ?? null;
  } catch {
    return null;
  }
}

async function hashToken(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function pageNumber(value: string | null): number {
  const parsed = Number.parseInt(value || "1", 10);
  return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 100_000)) : 1;
}

function csvCell(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  const safeText = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function generatedReferralCode(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return `sv-${Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("")}`;
}

async function getAffiliate(db: any, userId: string): Promise<any | null> {
  const { data, error } = await db.from("affiliates").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

async function getProgramSettings(db: any): Promise<any> {
  const { data, error } = await db.from("affiliate_program_settings").select("*").eq("id", true).single();
  if (error) throw error;
  return data;
}

function getEffectiveCreatorSettings(affiliate: any, settings: any) {
  return {
    commission_rate_bps: affiliate?.commission_rate_bps_override ?? settings.commission_rate_bps,
    attribution_window_days: affiliate?.attribution_window_days_override ?? settings.attribution_window_days,
    minimum_payout_cents: affiliate?.minimum_payout_cents_override ?? settings.minimum_payout_cents,
    commission_basis: settings.commission_basis,
  };
}

async function getHasPriorPaidSubscription(
  db: any,
  stripeSecretKey: string,
  user: any,
  clickedAt: string,
): Promise<boolean> {
  const { data: subscription, error } = await db
    .from("user_subscriptions")
    .select("plan_type,status,stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) throw error;

  if (
    ["premium", "family"].includes(String(subscription?.plan_type || ""))
    && ["active", "past_due", "canceled", "unpaid"].includes(String(subscription?.status || ""))
  ) {
    return true;
  }

  const customerId = subscription?.stripe_customer_id;
  if (!customerId) return false;
  if (!stripeSecretKey) throw new Error("Stripe history cannot be verified for this account.");

  const beforeClick = Math.floor(new Date(clickedAt).getTime() / 1000);
  const query = new URLSearchParams({
    customer: customerId,
    status: "paid",
    limit: "1",
    "created[lt]": String(beforeClick),
  });
  const response = await fetch(`https://api.stripe.com/v1/invoices?${query}`, {
    headers: { Authorization: `Bearer ${stripeSecretKey}` },
  });
  if (!response.ok) throw new Error("Could not verify prior Stripe payments.");
  const invoices = await response.json();
  return Array.isArray(invoices?.data) && invoices.data.length > 0;
}

async function trackReferralClick(req: Request, deps: AffiliateDependencies): Promise<Response> {
  const body = await readJson(req);
  const code = normalizeAffiliateCode(body?.code);
  const visitorToken = typeof body?.visitorToken === "string" ? body.visitorToken : "";
  if (!code || !VISITOR_TOKEN_PATTERN.test(visitorToken)) {
    return json({ error: "A valid referral code and consented visitor token are required." }, 400);
  }

  const { data: referralCode, error: codeError } = await deps.db
    .from("affiliate_referral_codes")
    .select("id,affiliate_id,affiliates!inner(status)")
    .eq("code", code)
    .eq("is_active", true)
    .eq("affiliates.status", "approved")
    .maybeSingle();
  if (codeError) throw codeError;
  if (!referralCode) return json({ error: "This referral link is not active." }, 404);

  const now = new Date();
  const [settings, affiliateResult] = await Promise.all([
    getProgramSettings(deps.db),
    deps.db.from("affiliates")
      .select("attribution_window_days_override")
      .eq("id", referralCode.affiliate_id)
      .single(),
  ]);
  if (affiliateResult.error) throw affiliateResult.error;
  const attributionWindowDays = affiliateResult.data.attribution_window_days_override ?? settings.attribution_window_days;
  const expiresAt = new Date(now.getTime() + attributionWindowDays * 86_400_000).toISOString();
  const visitorHash = await hashToken(visitorToken);
  const recentCutoff = new Date(now.getTime() - 30_000).toISOString();

  const { data: recentClick, error: recentError } = await deps.db
    .from("affiliate_clicks")
    .select("id,expires_at")
    .eq("visitor_hash", visitorHash)
    .eq("affiliate_id", referralCode.affiliate_id)
    .gte("created_at", recentCutoff)
    .limit(1)
    .maybeSingle();
  if (recentError) throw recentError;

  if (!recentClick) {
    const { error } = await deps.db.from("affiliate_clicks").insert({
      affiliate_id: referralCode.affiliate_id,
      referral_code_id: referralCode.id,
      visitor_hash: visitorHash,
      created_at: now.toISOString(),
      expires_at: expiresAt,
    });
    if (error) throw error;
  }

  return json({ recorded: true, expiresAt: recentClick?.expires_at ?? expiresAt });
}

async function attachReferral(req: Request, user: any, deps: AffiliateDependencies): Promise<Response> {
  const body = await readJson(req);
  const visitorToken = typeof body?.visitorToken === "string" ? body.visitorToken : "";
  if (!VISITOR_TOKEN_PATTERN.test(visitorToken)) return json({ error: "Invalid referral token." }, 400);

  const existing = await getAffiliateAttribution(deps.db, user.id);
  if (existing) return json({ attributed: false, locked: true });

  const visitorHash = await hashToken(visitorToken);
  const now = new Date().toISOString();
  const { data: clicks, error: clicksError } = await deps.db
    .from("affiliate_clicks")
    .select("id,affiliate_id,created_at,expires_at,affiliates!inner(user_id,status)")
    .eq("visitor_hash", visitorHash)
    .gt("expires_at", now)
    .lte("created_at", now)
    .eq("affiliates.status", "approved")
    .order("created_at", { ascending: false })
    .limit(100);
  if (clicksError) throw clicksError;

  const selectedClick = selectLatestEligibleAffiliateClick(
    (clicks || []).map((candidate: any) => ({
      record: candidate,
      affiliateUserId: String(candidate.affiliates?.user_id || ""),
      affiliateStatus: String(candidate.affiliates?.status || ""),
      clickedAt: candidate.created_at,
      expiresAt: candidate.expires_at,
    })),
    String(user.id),
    now,
  );
  const click = selectedClick?.record;
  if (!click) return json({ attributed: false, reason: "no_active_referral" });
  const affiliateOwnerId = String(click.affiliates?.user_id || "");
  const accountEmail = String(user.email || "").trim().toLowerCase();
  if (affiliateOwnerId && accountEmail) {
    const { data: affiliateOwner, error: ownerError } = await deps.db.auth.admin.getUserById(affiliateOwnerId);
    if (ownerError) throw ownerError;
    if (String(affiliateOwner?.user?.email || "").trim().toLowerCase() === accountEmail) {
      return json({ attributed: false, reason: "self_referral" });
    }
  }

  if (await getHasPriorPaidSubscription(deps.db, deps.stripeSecretKey, user, click.created_at)) {
    return json({ attributed: false, reason: "existing_paying_customer" });
  }

  const { data, error } = await deps.db.from("affiliate_attributions").insert({
    user_id: user.id,
    affiliate_id: click.affiliate_id,
    click_id: click.id,
    clicked_at: click.created_at,
    expires_at: click.expires_at,
    locked_at: new Date().toISOString(),
  }).select("id").maybeSingle();

  if (error?.code === "23505") {
    const locked = await getAffiliateAttribution(deps.db, user.id);
    return json({ attributed: false, locked: Boolean(locked) });
  }
  if (error) throw error;
  await deps.db.from("affiliate_clicks")
    .update({ visitor_hash: null })
    .eq("visitor_hash", visitorHash);
  return json({ attributed: Boolean(data), locked: false });
}

async function getAffiliateAttribution(db: any, userId: string): Promise<any | null> {
  const { data, error } = await db
    .from("affiliate_attributions")
    .select("id,affiliate_id,clicked_at,expires_at,first_paid_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function affiliateStatus(user: any, deps: AffiliateDependencies): Promise<Response> {
  const affiliate = await getAffiliate(deps.db, user.id);
  const settings = await getProgramSettings(deps.db);
  const creatorSettings = getEffectiveCreatorSettings(affiliate, settings);
  const rules = {
    rateBps: creatorSettings.commission_rate_bps,
    attributionWindowDays: creatorSettings.attribution_window_days,
    minimumPayoutMinor: creatorSettings.minimum_payout_cents,
    commissionBasis: creatorSettings.commission_basis,
  };
  if (!affiliate) {
    return json({ status: "not_applied", rules, isAdmin: deps.adminUserIds.includes(String(user.id).toLowerCase()) });
  }

  let code = null;
  if (affiliate.status === "approved") {
    const { data, error } = await deps.db.from("affiliate_referral_codes")
      .select("code,created_at")
      .eq("affiliate_id", affiliate.id)
      .eq("is_active", true)
      .maybeSingle();
    if (error) throw error;
    code = data;
  }

  return json({
    status: affiliate.status,
    affiliate: {
      id: affiliate.id,
      creatorName: affiliate.creator_name,
      platform: affiliate.platform,
      appliedAt: affiliate.applied_at,
    },
    code,
    rules,
    isAdmin: deps.adminUserIds.includes(String(user.id).toLowerCase()),
  });
}

async function applyToProgram(req: Request, user: any, deps: AffiliateDependencies): Promise<Response> {
  const body = await readJson(req);
  const creatorName = typeof body?.creatorName === "string" ? body.creatorName.trim() : "";
  const platform = typeof body?.platform === "string" ? body.platform.trim() : "";
  const promotionPlan = typeof body?.promotionPlan === "string" ? body.promotionPlan.trim() : "";
  const audienceSize = body?.audienceSize === null || body?.audienceSize === "" || body?.audienceSize === undefined
    ? null
    : Number(body.audienceSize);

  if (!creatorName || creatorName.length > 100 || !platform || platform.length > 100
    || !promotionPlan || promotionPlan.length > 1500
    || (audienceSize !== null && (!Number.isSafeInteger(audienceSize) || audienceSize < 0 || audienceSize > 1_000_000_000))) {
    return json({ error: "Complete the application with valid creator, platform, audience, and promotion details." }, 400);
  }

  const existing = await getAffiliate(deps.db, user.id);
  if (existing) return json({ error: "An affiliate application already exists.", status: existing.status }, 409);

  const { data, error } = await deps.db.from("affiliates").insert({
    user_id: user.id,
    creator_name: creatorName,
    platform,
    audience_size: audienceSize,
    promotion_plan: promotionPlan,
  }).select("id,status,applied_at").single();
  if (error) throw error;
  return json({ application: data }, 201);
}

async function affiliateDashboard(req: Request, user: any, deps: AffiliateDependencies): Promise<Response> {
  const affiliate = await getAffiliate(deps.db, user.id);
  if (!affiliate || affiliate.status !== "approved") return json({ error: "Affiliate access is not active." }, 403);

  const url = new URL(req.url);
  const referralsPage = pageNumber(url.searchParams.get("referralsPage"));
  const commissionsPage = pageNumber(url.searchParams.get("commissionsPage"));
  const payoutsPage = pageNumber(url.searchParams.get("payoutsPage"));
  const perPage = 25;
  const { data: stats, error: statsError } = await deps.db.rpc("affiliate_dashboard_stats", { p_affiliate_id: affiliate.id });
  if (statsError) throw statsError;

  const [codeResult, programSettings, referralsResult, commissionsResult, payoutsResult] = await Promise.all([
    deps.db.from("affiliate_referral_codes").select("code,created_at")
      .eq("affiliate_id", affiliate.id).eq("is_active", true).maybeSingle(),
    getProgramSettings(deps.db),
    deps.db.from("affiliate_attributions")
      .select("id,created_at,first_paid_at,first_paid_plan_type,first_paid_eligibility_reason,affiliate_commissions(amount_paid_cents,currency,commission_amount_cents,status,stripe_invoice_id,hold_reason,reversal_reason)", { count: "exact" })
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .range((referralsPage - 1) * perPage, referralsPage * perPage - 1),
    deps.db.from("affiliate_commissions")
      .select("id,stripe_invoice_id,amount_paid_cents,currency,commission_rate_bps,commission_amount_cents,commission_basis,eligibility_reason,status,paid_at,created_at,hold_reason,reversal_reason", { count: "exact" })
      .eq("affiliate_id", affiliate.id)
      .order("created_at", { ascending: false })
      .range((commissionsPage - 1) * perPage, commissionsPage * perPage - 1),
    deps.db.from("affiliate_payouts")
      .select("id,amount_cents,currency,paid_at,transaction_reference,created_at", { count: "exact" })
      .eq("affiliate_id", affiliate.id)
      .order("paid_at", { ascending: false })
      .range((payoutsPage - 1) * perPage, payoutsPage * perPage - 1),
  ]);

  for (const result of [codeResult, referralsResult, commissionsResult, payoutsResult]) {
    if (result.error) throw result.error;
  }
  const settings = getEffectiveCreatorSettings(affiliate, programSettings);

  const referrals = (referralsResult.data || []).map((row: any) => {
    const commission = Array.isArray(row.affiliate_commissions) ? row.affiliate_commissions[0] : row.affiliate_commissions;
    return {
      referralId: row.id.slice(0, 8),
      registeredAt: row.created_at,
      becamePayingCustomerAt: row.first_paid_at,
      paidPlan: row.first_paid_plan_type,
      paymentQualification: row.first_paid_eligibility_reason,
      paymentAmountCents: commission?.amount_paid_cents ?? null,
      currency: commission?.currency ?? null,
      commissionAmountCents: commission?.commission_amount_cents ?? null,
      commissionStatus: commission?.status ?? null,
      paymentReference: commission?.stripe_invoice_id ? String(commission.stripe_invoice_id).slice(-8) : null,
    };
  });

  const totalClicks = Number(stats?.total_clicks || 0);
  const payingCustomers = Number(stats?.paying_customers || 0);
  return json({
    affiliate: { id: affiliate.id, creatorName: affiliate.creator_name },
    link: codeResult.data ? `https://subveris.com/?ref=${encodeURIComponent(codeResult.data.code)}` : null,
    code: codeResult.data?.code ?? null,
    codeCreatedAt: codeResult.data?.created_at ?? null,
    rules: {
      rateBps: settings.commission_rate_bps,
      attributionWindowDays: settings.attribution_window_days,
      minimumPayoutCents: settings.minimum_payout_cents,
      commissionBasis: settings.commission_basis,
    },
    stats: {
      totalClicks,
      registrations: Number(stats?.registrations || 0),
      payingCustomers,
      conversionRate: totalClicks > 0 ? payingCustomers / totalClicks : 0,
      eligiblePayments: Number(stats?.eligible_payments || 0),
      earnedByCurrency: stats?.commissions_earned_by_currency || {},
      pendingByCurrency: stats?.commissions_pending_by_currency || {},
      approvedByCurrency: stats?.commissions_approved_by_currency || {},
      paidByCurrency: stats?.commissions_paid_by_currency || {},
    },
    referrals,
    referralsPage: { page: referralsPage, perPage, total: referralsResult.count || 0 },
    commissions: (commissionsResult.data || []).map((commission: any) => {
      const { stripe_invoice_id: invoiceId, ...safeCommission } = commission;
      return { ...safeCommission, payment_reference: invoiceId ? String(invoiceId).slice(-8) : null };
    }),
    commissionsPage: { page: commissionsPage, perPage, total: commissionsResult.count || 0 },
    payouts: payoutsResult.data || [],
    payoutsPage: { page: payoutsPage, perPage, total: payoutsResult.count || 0 },
  });
}

async function adminOverview(deps: AffiliateDependencies): Promise<Response> {
  const [affiliatesResult, codesResult, attributionsResult, commissionsResult, payoutsResult, auditResult, stripeRiskResult, settings] = await Promise.all([
    deps.db.from("affiliates").select("*").order("applied_at", { ascending: false }).limit(200),
    deps.db.from("affiliate_referral_codes").select("id,affiliate_id,code,is_active,created_at,revoked_at").order("created_at", { ascending: false }).limit(500),
    deps.db.from("affiliate_attributions").select("id,affiliate_id,user_id,clicked_at,expires_at,created_at,first_paid_at,first_paid_plan_type,first_paid_amount_minor,first_paid_currency,first_paid_eligibility_reason").order("created_at", { ascending: false }).limit(500),
    deps.db.from("affiliate_commissions").select("*").order("created_at", { ascending: false }).limit(200),
    deps.db.from("affiliate_payouts").select("*").order("paid_at", { ascending: false }).limit(100),
    deps.db.from("affiliate_admin_audit_logs").select("id,admin_user_id,action,entity_type,entity_id,reason,before_data,after_data,created_at").order("created_at", { ascending: false }).limit(100),
    deps.db.from("affiliate_webhook_events").select("stripe_event_id,event_type,commission_id,details,created_at").order("created_at", { ascending: false }).limit(100),
    getProgramSettings(deps.db),
  ]);
  for (const result of [affiliatesResult, codesResult, attributionsResult, commissionsResult, payoutsResult, auditResult, stripeRiskResult]) {
    if (result.error) throw result.error;
  }

  const affiliates = affiliatesResult.data || [];
  const withEmails = await Promise.all(affiliates.map(async (affiliate: any) => {
    const [userResult, statsResult] = await Promise.all([
      affiliate.user_id ? deps.db.auth.admin.getUserById(affiliate.user_id) : Promise.resolve({ data: null, error: null }),
      deps.db.rpc("affiliate_dashboard_stats", { p_affiliate_id: affiliate.id }),
    ]);
    if (userResult.error) console.warn("[Affiliate] Could not load application email:", userResult.error.message);
    if (statsResult.error) console.warn("[Affiliate] Could not load affiliate totals:", statsResult.error.message);
    return { ...affiliate, email: userResult.data?.user?.email ?? null, stats: statsResult.data ?? null };
  }));

  return json({
    affiliates: withEmails,
    codes: codesResult.data || [],
    attributions: attributionsResult.data || [],
    commissions: commissionsResult.data || [],
    payouts: payoutsResult.data || [],
    auditLogs: auditResult.data || [],
    stripeRiskEvents: stripeRiskResult.data || [],
    settings,
  });
}

async function adminExport(req: Request, deps: AffiliateDependencies): Promise<Response> {
  const affiliateId = new URL(req.url).searchParams.get("affiliateId");
  if (affiliateId && !UUID_PATTERN.test(affiliateId)) {
    return json({ error: "A valid affiliate ID is required." }, 400);
  }

  let commissionsQuery = deps.db.from("affiliate_commissions")
    .select("id,affiliate_id,referred_user_id,stripe_invoice_id,amount_paid_cents,currency,commission_rate_bps,commission_amount_cents,commission_basis,status,paid_at,created_at,affiliates!inner(creator_name)")
    .order("created_at", { ascending: false });
  if (affiliateId) commissionsQuery = commissionsQuery.eq("affiliate_id", affiliateId);
  const { data, error } = await commissionsQuery;
  if (error) throw error;

  const commissionIds = (data || []).map((row: any) => row.id);
  let payoutItems: any[] = [];
  if (commissionIds.length) {
    const payoutResult = await deps.db.from("affiliate_payout_items")
      .select("commission_id,amount_cents,affiliate_payouts!inner(paid_at,currency,transaction_reference)")
      .in("commission_id", commissionIds)
      .limit(10_000);
    if (payoutResult.error) throw payoutResult.error;
    payoutItems = payoutResult.data || [];
  }
  const payoutByCommission = new Map((payoutItems || []).map((item: any) => [item.commission_id, item]));
  const headings = ["commission_id", "affiliate", "customer_reference", "stripe_invoice_id", "payment_amount_minor", "currency", "rate_bps", "commission_minor", "basis", "status", "payout_date", "payout_reference", "created_at"];
  const rows = (data || []).map((row: any) => [
    row.id,
    row.affiliates?.creator_name,
    row.referred_user_id ? String(row.referred_user_id).slice(0, 8) : "deleted",
    row.stripe_invoice_id,
    row.amount_paid_cents,
    row.currency,
    row.commission_rate_bps,
    row.commission_amount_cents,
    row.commission_basis,
    row.status,
    (payoutByCommission.get(row.id) as any)?.affiliate_payouts?.paid_at ?? "",
    (payoutByCommission.get(row.id) as any)?.affiliate_payouts?.transaction_reference ?? "",
    row.created_at,
  ]);
  const csv = [headings, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=${affiliateId ? `affiliate-${affiliateId}-commissions.csv` : "affiliate-commissions.csv"}`,
      "Cache-Control": "no-store",
    },
  });
}

async function adminReview(req: Request, user: any, deps: AffiliateDependencies): Promise<Response> {
  const body = await readJson(req);
  const affiliateId = typeof body?.affiliateId === "string" ? body.affiliateId : "";
  const status = typeof body?.status === "string" ? body.status : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!UUID_PATTERN.test(affiliateId) || !["approved", "rejected", "suspended", "inactive"].includes(status)
    || !reason || reason.length > 1000) {
    return json({ error: "Valid affiliate, status, and reason are required." }, 400);
  }

  let lastError: any = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const referralCode = status === "approved" ? generatedReferralCode() : null;
    const { data, error } = await deps.db.rpc("affiliate_admin_review_application", {
      p_affiliate_id: affiliateId,
      p_new_status: status,
      p_code: referralCode,
      p_admin_user_id: user.id,
      p_reason: reason,
    });
    if (!error) return json({ result: data, referralCode });
    lastError = error;
    if (!String(error.code || "").startsWith("23")) break;
  }
  console.error("[Affiliate] Application review failed:", lastError);
  return json({ error: "Could not update the affiliate application." }, 409);
}

async function adminCodeAction(req: Request, user: any, deps: AffiliateDependencies): Promise<Response> {
  const body = await readJson(req);
  const action = typeof body?.action === "string" ? body.action : "";
  const affiliateId = typeof body?.affiliateId === "string" ? body.affiliateId : "";
  const codeId = typeof body?.codeId === "string" ? body.codeId : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!reason || reason.length > 1000) return json({ error: "A reason is required." }, 400);

  if (action === "revoke" && UUID_PATTERN.test(codeId)) {
    const { error } = await deps.db.rpc("affiliate_admin_revoke_code", {
      p_code_id: codeId,
      p_admin_user_id: user.id,
      p_reason: reason,
    });
    if (error) throw error;
    return json({ revoked: true });
  }

  if (action === "rotate" && UUID_PATTERN.test(affiliateId)) {
    let lastError: any = null;
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const referralCode = generatedReferralCode();
      const { data, error } = await deps.db.rpc("affiliate_admin_rotate_code", {
        p_affiliate_id: affiliateId,
        p_code: referralCode,
        p_admin_user_id: user.id,
        p_reason: reason,
      });
      if (!error) return json({ codeId: data, referralCode });
      lastError = error;
      if (!String(error.code || "").startsWith("23")) break;
    }
    throw lastError || new Error("Could not rotate referral code.");
  }

  return json({ error: "Invalid code action." }, 400);
}

async function adminSettings(req: Request, user: any, deps: AffiliateDependencies): Promise<Response> {
  const body = await readJson(req);
  const rateBps = Number(body?.rateBps);
  const windowDays = Number(body?.attributionWindowDays);
  const minimumPayoutCents = Number(body?.minimumPayoutCents);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!Number.isSafeInteger(rateBps) || rateBps < 1 || rateBps > 10_000
    || !Number.isSafeInteger(windowDays) || windowDays < 1 || windowDays > 365
    || !Number.isSafeInteger(minimumPayoutCents) || minimumPayoutCents < 0
    || !reason || reason.length > 1000) {
    return json({ error: "Valid rate, attribution window, minimum payout, and reason are required." }, 400);
  }

  const { error } = await deps.db.rpc("affiliate_admin_update_settings", {
    p_rate_bps: rateBps,
    p_window_days: windowDays,
    p_minimum_payout_cents: minimumPayoutCents,
    p_admin_user_id: user.id,
    p_reason: reason,
  });
  if (error) throw error;
  return json({ updated: true });
}

async function adminCreatorSettings(req: Request, user: any, deps: AffiliateDependencies): Promise<Response> {
  const body = await readJson(req);
  const affiliateId = typeof body?.affiliateId === "string" ? body.affiliateId : "";
  const useProgramDefaults = body?.useProgramDefaults === true;
  const rateBps = useProgramDefaults ? null : Number(body?.rateBps);
  const windowDays = useProgramDefaults ? null : Number(body?.attributionWindowDays);
  const minimumPayoutCents = useProgramDefaults ? null : Number(body?.minimumPayoutCents);
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!UUID_PATTERN.test(affiliateId)
    || (!useProgramDefaults && (
      !Number.isSafeInteger(rateBps) || rateBps! < 1 || rateBps! > 10_000
      || !Number.isSafeInteger(windowDays) || windowDays! < 1 || windowDays! > 365
      || !Number.isSafeInteger(minimumPayoutCents) || minimumPayoutCents! < 0
    ))
    || !reason || reason.length > 1000) {
    return json({ error: "Valid creator settings, affiliate, and reason are required." }, 400);
  }

  const { error } = await deps.db.rpc("affiliate_admin_update_creator_settings", {
    p_affiliate_id: affiliateId,
    p_rate_bps: rateBps,
    p_window_days: windowDays,
    p_minimum_payout_cents: minimumPayoutCents,
    p_admin_user_id: user.id,
    p_reason: reason,
  });
  if (error) throw error;
  return json({ updated: true, usingProgramDefaults: useProgramDefaults });
}

async function adminCommissionAction(req: Request, user: any, deps: AffiliateDependencies): Promise<Response> {
  const body = await readJson(req);
  const commissionId = typeof body?.commissionId === "string" ? body.commissionId : "";
  const status = typeof body?.status === "string" ? body.status : "";
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
  if (!UUID_PATTERN.test(commissionId) || !["approved", "reversed"].includes(status) || !reason || reason.length > 1000) {
    return json({ error: "Valid commission, action, and reason are required." }, 400);
  }

  const { data: commission, error: lookupError } = await deps.db.from("affiliate_commissions")
    .select("id,affiliate_id,affiliates!inner(user_id)")
    .eq("id", commissionId)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!commission) return json({ error: "Commission not found." }, 404);
  if (commission.affiliates?.user_id === user.id) return json({ error: "An affiliate cannot approve or reverse their own commission." }, 403);

  const { error } = await deps.db.rpc("affiliate_admin_transition_commission", {
    p_commission_id: commissionId,
    p_new_status: status,
    p_admin_user_id: user.id,
    p_reason: reason,
  });
  if (error) throw error;
  return json({ updated: true });
}

async function adminRecordPayout(req: Request, user: any, deps: AffiliateDependencies): Promise<Response> {
  const body = await readJson(req);
  const affiliateId = typeof body?.affiliateId === "string" ? body.affiliateId : "";
  const commissionIds = Array.isArray(body?.commissionIds) ? body.commissionIds : [];
  const paidAt = typeof body?.paidAt === "string" ? body.paidAt : "";
  const transactionReference = typeof body?.transactionReference === "string" ? body.transactionReference.trim() : "";
  const notes = typeof body?.notes === "string" ? body.notes.trim().slice(0, 1000) : null;
  const reason = typeof body?.reason === "string" ? body.reason.trim() : "";

  if (!UUID_PATTERN.test(affiliateId) || commissionIds.length === 0 || commissionIds.length > 100
    || commissionIds.some((id: unknown) => typeof id !== "string" || !UUID_PATTERN.test(id))
    || !Number.isFinite(Date.parse(paidAt)) || Date.parse(paidAt) > Date.now()
    || !transactionReference || transactionReference.length > 200
    || !reason || reason.length > 1000) {
    return json({ error: "Valid payout, commission, reference, date, and reason are required." }, 400);
  }

  const { data: affiliate, error: affiliateError } = await deps.db.from("affiliates")
    .select("user_id")
    .eq("id", affiliateId)
    .maybeSingle();
  if (affiliateError) throw affiliateError;
  if (!affiliate) return json({ error: "Affiliate not found." }, 404);
  if (affiliate.user_id === user.id) return json({ error: "An affiliate cannot record their own payout." }, 403);

  const { data, error } = await deps.db.rpc("affiliate_admin_record_payout", {
    p_affiliate_id: affiliateId,
    p_commission_ids: commissionIds,
    p_paid_at: new Date(paidAt).toISOString(),
    p_transaction_reference: transactionReference,
    p_notes: notes,
    p_admin_user_id: user.id,
    p_reason: reason,
  });
  if (error) throw error;
  return json({ payoutId: data });
}

export async function handleAffiliateApiRequest(
  req: Request,
  pathname: string,
  deps: AffiliateDependencies,
): Promise<Response | null> {
  if (!pathname.startsWith("/affiliate")) return null;

  try {
    if (pathname === "/affiliate/click" && req.method === "POST") {
      const { error: retentionError } = await deps.db.rpc("affiliate_cleanup_retention");
      if (retentionError) console.warn("[Affiliate] Retention cleanup did not complete:", retentionError.message);
      return await trackReferralClick(req, deps);
    }

    const user = await verifyUser(req, deps.authClient);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const isAdminPath = pathname.startsWith("/affiliate/admin");
    if (isAdminPath && !deps.adminUserIds.includes(String(user.id).toLowerCase())) {
      return json({ error: "Forbidden" }, 403);
    }

    const { error: retentionError } = await deps.db.rpc("affiliate_cleanup_retention");
    if (retentionError) console.warn("[Affiliate] Retention cleanup did not complete:", retentionError.message);

    if (pathname === "/affiliate/status" && req.method === "GET") {
      return await affiliateStatus(user, deps);
    }
    if (pathname === "/affiliate/apply" && req.method === "POST") {
      return await applyToProgram(req, user, deps);
    }
    if (pathname === "/affiliate/attribute" && req.method === "POST") {
      return await attachReferral(req, user, deps);
    }
    if (pathname === "/affiliate/dashboard" && req.method === "GET") {
      return await affiliateDashboard(req, user, deps);
    }

    if (pathname.startsWith("/affiliate/admin")) {
      if (pathname === "/affiliate/admin" && req.method === "GET") return await adminOverview(deps);
      if (pathname === "/affiliate/admin/export.csv" && req.method === "GET") return await adminExport(req, deps);
      if (pathname === "/affiliate/admin/review" && req.method === "POST") return await adminReview(req, user, deps);
      if (pathname === "/affiliate/admin/code" && req.method === "POST") return await adminCodeAction(req, user, deps);
      if (pathname === "/affiliate/admin/settings" && req.method === "POST") return await adminSettings(req, user, deps);
      if (pathname === "/affiliate/admin/creator-settings" && req.method === "POST") return await adminCreatorSettings(req, user, deps);
      if (pathname === "/affiliate/admin/commission" && req.method === "POST") return await adminCommissionAction(req, user, deps);
      if (pathname === "/affiliate/admin/payout" && req.method === "POST") return await adminRecordPayout(req, user, deps);
    }

    return json({ error: "Affiliate endpoint not found." }, 404);
  } catch (error) {
    console.error("[Affiliate API] Request failed:", error);
    const message = error instanceof Error ? error.message : "Affiliate request failed.";
    if (message.includes("Stripe history") || message.includes("Stripe payments")) return json({ error: message }, 503);
    return json({ error: "Affiliate request failed." }, 500);
  }
}