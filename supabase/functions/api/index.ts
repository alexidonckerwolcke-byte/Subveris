import { createClient } from "@supabase/supabase-js";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve?: (handler: (req: Request) => Promise<Response>) => void;
} | undefined;
const runtimeDeno = typeof globalThis !== "undefined" ? (globalThis as any).Deno : undefined;
const SUPABASE_URL = runtimeDeno?.env?.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = runtimeDeno?.env?.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = runtimeDeno?.env?.get("SUPABASE_ANON_KEY") ?? "";

// Client for auth verification
let supabaseAuth: any = null;
if (SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
}

// Client for database operations (service role bypasses RLS)
let supabase: any = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization,Content-Type,x-test-user-id",
  "Access-Control-Expose-Headers": "x-total-count",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
  "Vary": "Origin",
};

const EXCHANGE_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  CAD: 1.35,
  AUD: 1.52,
  JPY: 152.0,
  CHF: 0.88,
  SEK: 10.85,
  NOK: 10.75,
  DKK: 6.95,
  PLN: 4.05,
  CZK: 23.5,
  HUF: 365.0,
  BRL: 5.25,
  MXN: 18.5,
  ARS: 950.0,
  TRY: 34.0,
  ZAR: 18.5,
  INR: 84.0,
  CNY: 7.25,
  KRW: 1350.0,
  SGD: 1.35,
  HKD: 7.8,
  NZD: 1.65,
};

function getExchangeRate(currency: string | undefined) {
  return EXCHANGE_RATES[(currency || "USD").trim().toUpperCase()] ?? 1;
}

function convertToUSD(amount: number, currency: string | undefined) {
  return amount / getExchangeRate(currency);
}

function calculateMonthlyCost(amount: number, frequency: string | undefined) {
  const normalizedFrequency = (frequency || "monthly").toLowerCase();
  if (normalizedFrequency === "yearly") return amount / 12;
  if (normalizedFrequency === "quarterly") return amount / 3;
  if (normalizedFrequency === "weekly") return amount * 4;
  return amount;
}

function addCorsHeaders(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([key, value]) => {
    newHeaders.set(key, value);
  });
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...corsHeaders,
    ...init.headers,
  };
  return new Response(JSON.stringify(body), {
    headers,
    ...init,
  });
}

function generateId() {
  return crypto.randomUUID();
}

function extractUserId(req: Request): string | null {
  // Allow x-test-user-id header for testing
  const testUserId = req.headers.get("x-test-user-id");
  if (testUserId) {
    return testUserId;
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(
          atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")).split("").map((c) => c.charCodeAt(0))
        )
      )
    );
    return payload.sub;
  } catch {
    return null;
  }
}

export function normalizeSubscriptionDate(sub: any): string | null {
  const date = (
    sub.nextBillingDate ||
    sub.next_billing_at ||
    sub.next_billing_date ||
    sub.next_billing ||
    null
  );
  const dateStr = date instanceof Date ? date.toISOString() : (typeof date === 'string' ? date : null);
  return dateStr && dateStr.trim() !== '' ? dateStr : null;
}

function normalizeSubscriptionStatus(status: any): string {
  return String(status || '').trim().toLowerCase();
}

function isSubscriptionDeleted(sub: any): boolean {
  return normalizeSubscriptionStatus(sub.status) === 'deleted' || Boolean(sub.deleted_at || sub.deletedAt);
}

function isSubscriptionCanceled(sub: any): boolean {
  return normalizeSubscriptionStatus(sub.status) === 'canceled';
}

function isSubscriptionVisible(sub: any): boolean {
  if (isSubscriptionDeleted(sub) || isSubscriptionCanceled(sub)) return false;
  const status = normalizeSubscriptionStatus(sub.status);
  return status === 'active' || status === 'unused' || status === 'to-cancel';
}

function isSubscriptionBilledInCurrentMonth(sub: any, now: Date, renewalDate?: Date): boolean {
  const renewal = renewalDate ?? toDateOnlyLocal(normalizeSubscriptionDate(sub) || '');
  if (!renewal) return false;

  const targetMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const renewalMonth = `${renewal.getFullYear()}-${String(renewal.getMonth() + 1).padStart(2, '0')}`;
  if (renewalMonth !== targetMonth) return false;
  return renewal <= now;
}

function calculateTotalMonthlySpending(subscriptions: any[], monthStart: Date, monthEnd: Date, now: Date): number {
  const renewalRelevantSubs = subscriptions.filter((sub: any) => {
    const status = normalizeSubscriptionStatus(sub.status);
    return (
      status === 'active' ||
      status === 'unused' ||
      status === 'to-cancel'
    );
  });

  return renewalRelevantSubs.reduce((sum: number, sub: any) => {
    const renewalDateStr = normalizeSubscriptionDate(sub);
    if (!renewalDateStr) return sum;

    const renewalDate = toDateOnlyLocal(renewalDateStr);
    if (!renewalDate) return sum;

    if (!isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true, renewalDate)) {
      return sum;
    }

    const monthlyAmount = calculateMonthlyCost(Number(sub.amount) || 0, sub.frequency);
    return sum + convertToUSD(monthlyAmount, sub.currency);
  }, 0);
}

function formatBillingMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getSubscriptionBillingMonth(sub: any): string | null {
  const billingMonth = sub?.billing_month || sub?.billingMonth || null;
  if (!billingMonth || typeof billingMonth !== 'string') return null;
  const match = billingMonth.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return null;
  return `${match[1]}-${String(match[2]).padStart(2, '0')}`;
}

export function isSubscriptionBilledInMonth(
  sub: any,
  monthStart: Date,
  monthEnd: Date,
  now: Date,
  isCurrentMonth: boolean,
  renewalDate?: Date
): boolean {
  const targetMonth = formatBillingMonth(monthStart);
  const billingMonth = getSubscriptionBillingMonth(sub);
  // If billing_month explicitly matches the target month, only include it for
  // the current month when the renewal date has arrived or passed.
  if (billingMonth === targetMonth) {
    if (isCurrentMonth) {
      let renewal: Date | undefined = renewalDate;
      if (!renewal) {
        const renewalDateStr = normalizeSubscriptionDate(sub);
        if (!renewalDateStr) return false;
        renewal = parseSubscriptionDate(renewalDateStr) || undefined;
      }
      if (!renewal || isNaN(renewal.getTime())) return false;
      const renewalDay = toDateOnlyLocal(renewal);
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      // Include if renewal already occurred today or earlier in this month.
      // Also include auto-advanced renewals pushed into another month because
      // the subscription was billed earlier this month.
      if (renewalDay && renewalDay <= today) return true;
      return false;
    }
    return true;
  }

  let renewal: Date | undefined = renewalDate;
  if (!renewal) {
    const renewalDateStr = normalizeSubscriptionDate(sub);
    if (!renewalDateStr) return false;
    renewal = parseSubscriptionDate(renewalDateStr) || undefined;
  }

  if (!renewal || isNaN(renewal.getTime())) {
    return false;
  }

  if (formatBillingMonth(renewal) !== targetMonth) {
    return false;
  }

  if (isCurrentMonth) {
    const renewalDay = toDateOnlyLocal(renewal);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return renewalDay ? renewalDay <= today : false;
  }

  return true;
}

function getNestedFamilyGroup(m: any) {
  const nested = m?.family_groups;
  if (Array.isArray(nested)) {
    return nested[0];
  }
  return nested;
}

function parseSubscriptionDate(dateInput: string | Date): Date | null {
  if (!dateInput) return null;
  const parsed = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(parsed.getTime())) return null;
  return parsed;
}

export function toDateOnlyLocal(dateInput: string | Date): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    const d = new Date(dateInput);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  // Parse only date-only strings (YYYY-MM-DD) as local dates to avoid UTC shifts
  const dateStr = String(dateInput).trim();
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]) - 1;
  const d = Number(match[3]);
  const dt = new Date(y, mo, d);
  dt.setHours(0, 0, 0, 0);
  return dt;
}

export function toLocalDateTimeInOffset(dateInput: string | Date, offsetMinutes = 0): Date | null {
  if (!dateInput) return null;

  if (!(dateInput instanceof Date)) {
    const dateOnly = toDateOnlyLocal(dateInput);
    if (dateOnly) {
      return dateOnly;
    }
  }

  const parsed = dateInput instanceof Date ? new Date(dateInput) : new Date(dateInput);
  if (isNaN(parsed.getTime())) return null;
  const adjustedMs = parsed.getTime() - offsetMinutes * 60 * 1000;
  return new Date(adjustedMs);
}

function getRequestOffsetMinutes(url: URL): number {
  const offsetParam = url.searchParams.get("offsetMinutes");
  if (!offsetParam) return 0;
  const offset = Number(offsetParam);
  return Number.isFinite(offset) ? offset : 0;
}

function getRequestLocalNow(url: URL): Date {
  const localDate = url.searchParams.get("localDate");
  if (localDate) {
    const parsedLocalDate = toDateOnlyLocal(localDate);
    if (parsedLocalDate) {
      return parsedLocalDate;
    }
  }

  const offsetMinutes = getRequestOffsetMinutes(url);
  return new Date(Date.now() + offsetMinutes * 60 * 1000);
}

function isRenewalDateInCurrentMonth(date: Date, now = new Date()): boolean {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return date >= monthStart && date <= monthEnd;
}

function isRenewalDateToday(date: Date, now = new Date()): boolean {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return date.getTime() === today.getTime();
}

function isRenewalDateTodayOrEarlierInCurrentMonth(date: Date, now = new Date()): boolean {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return date >= monthStart && date <= today;
}

function buildSubscriptionTotals(subscriptions: any[]) {
  const nonDeletedSubscriptions = subscriptions.filter(sub => sub && sub.status !== 'deleted');
  const activeSubscriptions = nonDeletedSubscriptions.filter(
    (sub: any) => sub.status === "active"
  );
  
  // Only include subscriptions renewing in the current month
  const now = new Date();
  const totalMonthlySpending = nonDeletedSubscriptions.reduce((sum: number, sub: any) => {
    const billingDate = normalizeSubscriptionDate(sub);
    if (!billingDate) return sum;

    const nextBilling = parseSubscriptionDate(billingDate);
    if (!nextBilling) {
      return sum;
    }

    if (isSubscriptionBilledInMonth(sub, new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999), now, true, nextBilling)) {
      const amount = Number(sub.amount) || 0;
      const frequency = (sub.frequency || "monthly").toLowerCase();
      const monthlyAmount = frequency === "yearly"
        ? amount / 12
        : frequency === "quarterly"
        ? amount / 3
        : frequency === "weekly"
        ? amount * 4
        : amount;
      return sum + monthlyAmount;
    }
    return sum;
  }, 0);

  return {
    totalSubscriptions: nonDeletedSubscriptions.length,
    activeSubscriptions: activeSubscriptions.length,
    totalMonthlySpending: Math.round(totalMonthlySpending * 100) / 100,
    memberCount: 1,
  };
}

async function loadSubscriptions(userId: string, page = 1, perPage = 1000) {
  const rangeStart = (page - 1) * perPage;
  const rangeEnd = page * perPage - 1;
  const { data, count, error } = await supabase
    .from("subscriptions")
    .select("*", { count: "exact" })
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(rangeStart, rangeEnd);

  if (error) {
    throw error;
  }

  // Transform snake_case to camelCase to match frontend expectations
  const transformedData = ((data as any[]) || []).map((sub: any) => ({
    ...sub,
    usageCount: sub.usage_count,
    monthlyUsageCount: sub.monthly_usage_count,
    usageMonth: sub.usage_month,
    lastUsedDate: sub.last_used_at,
    logoUrl: sub.logo_url,
    isDetected: sub.is_detected,
    websiteDomain: sub.website_domain,
    scheduledCancellationDate: sub.scheduled_cancellation_date,
    cancellationUrl: sub.cancellation_url,
    nextBillingDate: (() => {
      const raw = sub.next_billing_at || sub.next_billing_date;
      const parsed = toDateOnlyLocal(raw);
      return parsed ? formatDateLocal(parsed) : raw;
    })(),
  }));

  return {
    subscriptions: transformedData,
    count: count ?? 0,
  };
}

async function loadAllSubscriptions(userId: string) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const transformedData = (data || []).map((sub: any) => ({
    ...sub,
    usageCount: sub.usage_count,
    monthlyUsageCount: sub.monthly_usage_count,
    usageMonth: sub.usage_month,
    lastUsedDate: sub.last_used_at,
    logoUrl: sub.logo_url,
    isDetected: sub.is_detected,
    websiteDomain: sub.website_domain,
    scheduledCancellationDate: sub.scheduled_cancellation_date,
    cancellationUrl: sub.cancellation_url,
    nextBillingDate: (() => {
      const raw = sub.next_billing_at || sub.next_billing_date;
      const parsed = toDateOnlyLocal(raw);
      return parsed ? formatDateLocal(parsed) : raw;
    })(),
  }));

  return { subscriptions: transformedData, count: data?.length ?? 0 };
}

async function updateSubscription(userId: string, subscriptionId: string, updates: any) {
  // Remove any stored calendar renewal events for this subscription so
  // generated renewal events (from the subscription row) take precedence.
  try {
    await supabase
      .from('subscription_calendar_events')
      .delete()
      .eq('subscription_id', subscriptionId)
      .eq('user_id', userId)
      .eq('event_type', 'renewal');
  } catch (err) {
    // non-fatal: log and continue with the update
    console.warn('[API] Failed to delete stored renewal calendar events', { subscriptionId, userId, err });
  }

  console.log('[API] updateSubscription calling supabase.update with payload:', updates);
  const { data, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .select()
    .single();

  console.log('[API] supabase update response (single):', { data, error });

  if (error) {
    throw error;
  }

  const normalizeSubscription = (sub: any) => ({
    ...sub,
    usageCount: sub.usage_count,
    monthlyUsageCount: sub.monthly_usage_count,
    usageMonth: sub.usage_month,
    lastUsedDate: sub.last_used_at,
    logoUrl: sub.logo_url,
    isDetected: sub.is_detected,
    websiteDomain: sub.website_domain,
    scheduledCancellationDate: sub.scheduled_cancellation_date,
    cancellationUrl: sub.cancellation_url,
    nextBillingDate: (() => {
      const raw = sub.next_billing_at || sub.next_billing_date;
      const parsed = toDateOnlyLocal(raw);
      return parsed ? formatDateLocal(parsed) : raw;
    })(),
  });

  // When using .single() we get the single updated row in `data`.
  if (data) return normalizeSubscription(data);
  return null;
}


async function deleteSubscription(userId: string, subscriptionId: string) {
  const { error } = await supabase
    .from("subscriptions")
    .update({ status: "deleted", deleted_at: new Date().toISOString() })
    .eq("id", subscriptionId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }

  return true;
}

async function incrementSubscriptionUsageCount(userId: string, subscriptionId: string) {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("usage_count, monthly_usage_count, usage_month")
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  const currentUsage = Number((data as any)?.usage_count || 0);
  const currentMonthly = Number((data as any)?.monthly_usage_count || 0);
  const currentMonth = new Date().toISOString().slice(0, 7);

  let nextMonthly = currentMonthly + 1;
  let usageMonth = (data as any)?.usage_month || currentMonth;
  if ((data as any)?.usage_month !== currentMonth) {
    nextMonthly = 1;
    usageMonth = currentMonth;
  }

  const updates: any = {
    usage_count: currentUsage + 1,
    monthly_usage_count: nextMonthly,
    usage_month: usageMonth,
    last_used_at: new Date().toISOString().split("T")[0],
  };

  if (currentUsage + 1 > 0) {
    updates.status = "active";
  }

  return updateSubscription(userId, subscriptionId, updates);
}

function buildCostPerUseAnalysis(subscriptions: any[]) {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
  return (subscriptions || [])
    .filter(sub => sub && sub.status !== 'deleted')
    .map((sub: any) => {
    const amount = Number(sub.amount) || 0;
    const frequency = (sub.frequency || "monthly").toLowerCase();
    const monthlyCost = frequency === "yearly"
      ? amount / 12
      : frequency === "quarterly"
      ? amount / 3
      : frequency === "weekly"
      ? amount * 4
      : amount;
    
    // Use monthly usage count if available and current month, otherwise reset to 0 for new month
    const usageMonth = sub.usage_month || sub.usageMonth;
    const monthlyUsageCount = sub.monthly_usage_count ?? sub.monthlyUsageCount;
    const usageCount = usageMonth === currentMonth && monthlyUsageCount !== undefined
      ? monthlyUsageCount
      : 0;
    const costPerUse = usageCount > 0 ? monthlyCost / usageCount : monthlyCost;

    // Calculate value rating based on usage count and cost per use
    let valueRating: "excellent" | "good" | "fair" | "poor" = "good";
    if (usageCount <= 1) {
      // 0 or 1 use is always poor value
      valueRating = "poor";
    } else if (usageCount <= 3) {
      // 2-3 uses: fair if cost per use is reasonable, otherwise poor
      valueRating = costPerUse <= 10 ? "fair" : "poor";
    } else {
      // 4+ uses: apply normal rating thresholds
      valueRating = costPerUse > 20 ? "poor" : costPerUse > 10 ? "fair" : "good";
    }

    return {
      subscriptionId: sub.id,
      name: sub.name,
      monthlyAmount: Math.round(monthlyCost * 100) / 100,
      usageCount: usageCount,
      costPerUse: Math.round(costPerUse * 100) / 100,
      currency: sub.currency || "USD",
      valueRating,
    };
  });
}

function buildHealthScore(subscriptions: any[]) {
  const nonDeletedSubscriptions = subscriptions.filter(sub => sub && sub.status !== 'deleted');
  const total = nonDeletedSubscriptions.length;
  const unused = nonDeletedSubscriptions.filter((sub) => sub.status === "unused" || sub.status === "to-cancel").length;
  const monthlyWaste = nonDeletedSubscriptions
    .filter((sub) => sub.status === "unused" || sub.status === "to-cancel")
    .reduce((sum, sub) => sum + (Number(sub.amount) || 0), 0);

  const base = Math.max(0, 100 - unused * 10 - Math.max(0, total - 3) * 5);
  const score = Math.min(100, Math.max(0, Math.round(base)));
  const status = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Moderate" : "Poor";
  const emoji = score >= 80 ? "🚀" : score >= 60 ? "👍" : score >= 40 ? "⚠️" : "❗";
  const message = score >= 80
    ? "Your subscriptions look healthy. Keep tracking usage and cancel unused plans."
    : score >= 60
    ? "Good job, but some subscriptions could be optimized."
    : score >= 40
    ? "There are a few subscriptions costing you more than they should."
    : "A lot of your subscriptions look unused or expensive. Review them soon.";

  return {
    score,
    status,
    emoji,
    message,
    yearlyWaste: Math.round(monthlyWaste * 12 * 100) / 100,
    estimatedSavings: Math.round(monthlyWaste * 12 * 100) / 100,
    tooManySubscriptions: total > 8,
    maxAnalyzedSubscriptions: 8,
  };
}

function buildCalendarEvents(subscriptions: any[]) {
  return (subscriptions || [])
    .filter(sub => sub && sub.status !== 'deleted')
    .map((sub: any) => {
      const rawDate = normalizeSubscriptionDate(sub);
      if (!rawDate) return null;
      const parsed = toDateOnlyLocal(rawDate);
      if (!parsed) return null;
      const dateString = formatDateLocal(parsed);
      return {
        id: `renewal-${sub.id}`,
        subscriptionId: sub.id,
        eventDate: dateString,
        title: `${sub.name} Renewal`,
        eventType: "renewal",
        amount: Number(sub.amount) || 0,
        userId: sub.user_id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    })
    .filter(Boolean) as any[];
}

runtimeDeno?.serve?.(async (req: Request) => {
  try {
    console.log(`[API] ${req.method} ${req.url}`);
    
    // Handle CORS preflight - MUST be first to never fail
    if (req.method === "OPTIONS") {
      console.log("[API] Returning 204 for OPTIONS");
      return addCorsHeaders(new Response(null, { status: 204 }));
    }

    const url = new URL(req.url);
    let pathname = url.pathname.replace(/^\/functions\/v1\/api/, "").replace(/^\/api/, "") || "/";
    if (pathname === "") {
      pathname = "/";
    }

    // Test route
    if (pathname === "/test" && req.method === "GET") {
      return jsonResponse({ message: "API is working!" });
    }

    // Test route
    if (pathname === "/test" && req.method === "GET") {
      return jsonResponse({ message: "API is working!" });
    }

    // Get subscriptions
    if (pathname === "/subscriptions" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse([]);
      }

      const page = Number(url.searchParams.get("page") || "1");
      const perPage = Number(url.searchParams.get("perPage") || "1000");

      try {
        const { subscriptions, count } = await loadSubscriptions(userId, page, perPage);
        return jsonResponse(subscriptions, {
          headers: {
            "x-total-count": String(count),
          },
        });
      } catch (err) {
        console.error("Error fetching subscriptions:", err);
        return jsonResponse([], { status: 500 });
      }
    }

    // Update subscription fields
    if (pathname.match(/^\/subscriptions\/[^/]+$/) && req.method === "PATCH") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Login required" }, { status: 401 });
      }

      const subscriptionId = pathname.split('/')[2];
      const body = await req.json();
      if (!subscriptionId) {
        return jsonResponse({ error: "Missing subscription ID" }, { status: 400 });
      }

      const updates: any = {};
      if (body.nextBillingDate) {
        // Normalize incoming date to a local date-only string (YYYY-MM-DD)
        const parsed = toDateOnlyLocal(body.nextBillingDate);
        if (parsed) {
          updates.next_billing_at = formatDateLocal(parsed);
        } else {
          // Fallback to raw value if parsing failed
          updates.next_billing_at = body.nextBillingDate;
        }
      }
      if (body.status) {
        updates.status = body.status;
      }
      if (body.usageCount !== undefined) {
        updates.usage_count = body.usageCount;
      }
      if (body.monthlyUsageCount !== undefined) {
        updates.monthly_usage_count = body.monthlyUsageCount;
      }
      if (body.name !== undefined) {
        updates.name = body.name;
      }
      if (body.category !== undefined) {
        updates.category = body.category;
      }
      if (body.amount !== undefined) {
        updates.amount = body.amount;
      }

      if (body.nextBillingDate) {
        console.log(`[API] PATCH /subscriptions/${subscriptionId} incoming nextBillingDate:`, body.nextBillingDate);
        const { data: existingSub, error: existingError } = await supabase
          .from('subscriptions')
          .select('next_billing_at, billing_month')
          .eq('id', subscriptionId)
          .eq('user_id', userId)
          .single();

        if (!existingError && existingSub) {
          const parsedNewDate = toDateOnlyLocal(body.nextBillingDate);
          console.log(`[API] PATCH /subscriptions/${subscriptionId} parsedNewDate:`, parsedNewDate);
          const today = toDateOnlyLocal(new Date());
          console.log(`[API] PATCH /subscriptions/${subscriptionId} today:`, today);
          const existingRenewal = toDateOnlyLocal(existingSub.next_billing_at);
          console.log(`[API] PATCH /subscriptions/${subscriptionId} existingRenewal:`, existingRenewal);
          if (parsedNewDate && today) {
            // Only preserve an existing billing_month when this update was
            // triggered by the auto-advance flow on the client. Manual edits
            // should not be forced to preserve the old billing_month.
            const isAutoAdvance = Boolean(body.autoAdvanced);
            if (isAutoAdvance && existingRenewal && existingRenewal <= today && parsedNewDate > today) {
              updates.billing_month = existingSub.billing_month || formatBillingMonth(existingRenewal);
            } else {
              updates.billing_month = parsedNewDate <= today ? formatBillingMonth(today) : formatBillingMonth(parsedNewDate);
            }
            console.log(`[API] PATCH /subscriptions/${subscriptionId} computed billing_month:`, updates.billing_month, { autoAdvanced: isAutoAdvance });
          }
        }
      }

      if (Object.keys(updates).length === 0) {
        return jsonResponse({ error: "No updatable fields provided" }, { status: 400 });
      }

      try {
        console.log(`[API] PATCH /subscriptions/${subscriptionId} update payload:`, updates);
        const updated = await updateSubscription(userId, subscriptionId, updates);
        console.log(`[API] PATCH /subscriptions/${subscriptionId} update result:`, updated);
        return jsonResponse(updated || { success: true });
      } catch (err) {
        console.error("Error updating subscription:", err);
        return jsonResponse({ error: "Failed to update subscription" }, { status: 500 });
      }
    }

    // Update subscription status endpoint alias
    if (pathname.match(/^\/subscriptions\/[^/]+\/status$/) && req.method === "PATCH") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Login required" }, { status: 401 });
      }

      const subscriptionId = pathname.split('/')[2];
      const body = await req.json();
      if (!subscriptionId || !body.status) {
        return jsonResponse({ error: "Missing subscription ID or status" }, { status: 400 });
      }

      try {
        const updated = await updateSubscription(userId, subscriptionId, { status: body.status });
        return jsonResponse(updated || { success: true });
      } catch (err) {
        console.error("Error updating subscription status:", err);
        return jsonResponse({ error: "Failed to update subscription status" }, { status: 500 });
      }
    }

    // Update subscription usage count
    if (pathname.match(/^\/subscriptions\/[^/]+\/usage$/) && req.method === "PATCH") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Login required" }, { status: 401 });
      }

      const subscriptionId = pathname.split('/')[2];
      const body = await req.json();
      if (!subscriptionId || body.monthlyUsageCount === undefined) {
        return jsonResponse({ error: "Missing subscription ID or monthlyUsageCount" }, { status: 400 });
      }

      try {
        const currentMonth = new Date().toISOString().slice(0, 7);
        const updated = await updateSubscription(userId, subscriptionId, {
          usage_count: body.monthlyUsageCount,
          monthly_usage_count: body.monthlyUsageCount,
          usage_month: currentMonth,
          last_used_at: new Date().toISOString().split("T")[0],
        });
        return jsonResponse(updated || { success: true });
      } catch (err) {
        console.error("Error updating subscription usage:", err);
        return jsonResponse({ error: "Failed to update subscription usage" }, { status: 500 });
      }
    }

    // Log subscription usage
    if (pathname.match(/^\/subscriptions\/[^/]+\/log-usage$/) && req.method === "POST") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Login required" }, { status: 401 });
      }

      const subscriptionId = pathname.split('/')[2];
      if (!subscriptionId) {
        return jsonResponse({ error: "Missing subscription ID" }, { status: 400 });
      }

      try {
        const updated = await incrementSubscriptionUsageCount(userId, subscriptionId);
        return jsonResponse(updated || { success: true });
      } catch (err) {
        console.error("Exception logging subscription usage:", err);
        return jsonResponse({ error: "Failed to log usage" }, { status: 500 });
      }
    }

    // Schedule a cancellation request
    if (pathname.match(/^\/subscriptions\/[^/]+\/schedule-cancellation$/) && req.method === "POST") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Login required" }, { status: 401 });
      }

      const subscriptionId = pathname.split('/')[2];
      if (!subscriptionId) {
        return jsonResponse({ error: "Missing subscription ID" }, { status: 400 });
      }

      try {
        const updated = await updateSubscription(userId, subscriptionId, { status: "to-cancel" });
        return jsonResponse(updated || { success: true });
      } catch (err) {
        console.error("Error scheduling cancellation:", err);
        return jsonResponse({ error: "Failed to schedule cancellation" }, { status: 500 });
      }
    }

    // Send cancellation reminder
    if (pathname.match(/^\/subscriptions\/[^/]+\/send-cancellation-reminder$/) && req.method === "POST") {
      return jsonResponse({ success: true });
    }

    // Delete subscription
    if (pathname.match(/^\/subscriptions\/[^/]+$/) && req.method === "DELETE") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Login required" }, { status: 401 });
      }

      const subscriptionId = pathname.split('/')[2];
      if (!subscriptionId) {
        return jsonResponse({ error: "Missing subscription ID" }, { status: 400 });
      }

      try {
        await deleteSubscription(userId, subscriptionId);
        return jsonResponse({ success: true });
      } catch (err) {
        console.error("Error deleting subscription:", err);
        return jsonResponse({ error: "Failed to delete subscription" }, { status: 500 });
      }
    }

    // Get premium status
    if (pathname === "/user/premium-status" && req.method === "GET") {
      const userId = extractUserId(req);
      
      if (!userId) {
        return jsonResponse({
          isPremium: false,
          planType: "free",
          status: "free",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        });
      }

      try {
        // Get user's subscription data from the user_subscriptions table
        const { data: userData, error: userError } = await supabase
          .from("user_subscriptions")
          .select("stripe_subscription_id, stripe_price_id, plan_type, status, current_period_end, cancel_at_period_end")
          .eq("user_id", userId)
          .single();

        if (userError || !userData) {
          console.log("No subscription found for user:", userId);
          return jsonResponse({
            isPremium: false,
            planType: "free",
            status: "active",
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
          });
        }

        // Use the stored plan_type from database
        const planType: "free" | "premium" | "family" = (userData.plan_type || "free") as "free" | "premium" | "family";
        const isPremium = (planType === "premium" || planType === "family") && userData.status === "active";

        return jsonResponse({
          isPremium,
          planType,
          status: userData.status || "active",
          cancelAtPeriodEnd: userData.cancel_at_period_end || false,
          currentPeriodEnd: userData.current_period_end,
        });
      } catch (err) {
        console.error("Exception fetching premium status:", err);
        return jsonResponse({
          isPremium: false,
          planType: "free",
          status: "active",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        });
      }
    }

    // Get notification preferences
    if (pathname === "/account/notification-preferences" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const { data, error } = await supabase
          .from("notification_preferences")
          .select("email_notifications, push_notifications, weekly_digest")
          .eq("user_id", userId)
          .single();

        if (error || !data) {
          // Return defaults for new users
          return jsonResponse({
            emailNotifications: true,
            pushNotifications: true,
            weeklyDigest: true,
          });
        }

        return jsonResponse({
          emailNotifications: data.email_notifications ?? true,
          pushNotifications: data.push_notifications ?? true,
          weeklyDigest: data.weekly_digest ?? true,
        });
      } catch (error) {
        console.error("[Preferences] Error fetching:", error);
        return jsonResponse({ error: "Failed to fetch preferences" }, { status: 500 });
      }
    }

    // Update notification preferences
    if (pathname === "/account/notification-preferences" && req.method === "PATCH") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = await req.json();
        const { emailNotifications, pushNotifications, weeklyDigest } = body;

        // Try to update existing preferences
        const { error: updateError } = await supabase
          .from("notification_preferences")
          .update({
            email_notifications: emailNotifications,
            push_notifications: pushNotifications,
            weekly_digest: weeklyDigest,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        // If no row exists, insert a new one
        if (updateError && updateError.message.includes("No rows")) {
          const { error: insertError } = await supabase
            .from("notification_preferences")
            .insert({
              user_id: userId,
              email_notifications: emailNotifications,
              push_notifications: pushNotifications,
              weekly_digest: weeklyDigest,
            });

          if (insertError) {
            console.error("[Preferences] Error inserting:", insertError);
            return jsonResponse({ error: "Failed to save preferences" }, { status: 500 });
          }
        } else if (updateError) {
          console.error("[Preferences] Error updating:", updateError);
          return jsonResponse({ error: "Failed to save preferences" }, { status: 500 });
        }

        return jsonResponse({
          emailNotifications,
          pushNotifications,
          weeklyDigest,
        });
      } catch (error) {
        console.error("[Preferences] Error saving:", error);
        return jsonResponse({ error: "Failed to save preferences" }, { status: 500 });
      }
    }

    // Initialize 2FA
    if (pathname === "/account/2fa/init" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!authToken) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const authBase = new URL('auth/v1/', process.env.SUPABASE_URL || '').href;
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
        
        const response = await fetch(new URL('factors', authBase).href, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': anonKey || '',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            friendly_name: 'Authenticator App',
            factor_type: 'totp',
            issuer: 'Subveris',
          }),
        });

        const data = await response.json().catch(() => null);
        if (!response.ok || !data || !data.id || !data.totp) {
          console.error('[2FA] init error', response.status, data);
          return jsonResponse({ error: "Failed to initialize 2FA" }, { status: 500 });
        }

        const otpauthUrl = data.totp.uri ?? data.totp.qr_code ?? '';
        const secret = data.totp.secret ?? (() => {
          const match = String(data.totp?.uri ?? '').match(/[?&]secret=([^&]+)/i);
          return match ? decodeURIComponent(match[1]) : '';
        })();

        console.log('[2FA][function] init response from supabase:', {
          id: data.id,
          hasTotp: !!data.totp,
          totpKeys: Object.keys(data.totp || {}),
          otpauthUrlLength: typeof otpauthUrl === 'string' ? otpauthUrl.length : 0,
          secretPresent: !!secret,
        });

        return jsonResponse({
          id: data.id,
          secret,
          otpauthUrl,
        });
      } catch (error) {
        console.error("[2FA] Exception initializing 2FA:", error);
        return jsonResponse({ error: "Failed to initialize 2FA" }, { status: 500 });
      }
    }

    // Enable 2FA (verify code)
    if (pathname === "/account/2fa" && req.method === "POST") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!authToken) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = await req.json();
        const { code, factorId } = body;

        if (!code || !factorId) {
          return jsonResponse({ error: "Code and factor ID are required" }, { status: 400 });
        }

        const authBase = new URL('auth/v1/', process.env.SUPABASE_URL || '').href;
        const response = await fetch(new URL(`factors/${factorId}/verify`, authBase).href, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ code }),
        });

        const verifyData = await response.json().catch(() => null);
        if (!response.ok || !verifyData) {
          console.error('[2FA] verify error', response.status, verifyData);
          return jsonResponse({ error: "Invalid authentication code" }, { status: 400 });
        }

        // Send 2FA enabled email notification
        try {
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
          if (!userError && userData.user?.email) {
            console.log(`[2FA] 2FA enabled for user ${userId}`);
          }
        } catch (emailError) {
          console.error("[2FA] Error sending notification email:", emailError);
        }

        return jsonResponse({
          success: true,
          message: "Two-factor authentication enabled",
        });
      } catch (error) {
        console.error("[2FA] Exception enabling 2FA:", error);
        return jsonResponse({ error: "Failed to enable 2FA" }, { status: 500 });
      }
    }

    // Export user data
    if (pathname === "/account/export" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        // Get user's subscriptions
        const subscriptions = await loadAllSubscriptions(userId);

        // Get insights (we'll use a simplified version since we don't have the full insights system)
        const insights = [];

        // Get transactions (we'll use a simplified version since we don't have the full transaction system)
        const transactions = [];

        const exportData = {
          exportDate: new Date().toISOString(),
          subscriptions,
          transactions,
          insights,
        };

        return jsonResponse(exportData, {
          headers: {
            "Content-Disposition": "attachment; filename=subveris-data.json",
          },
        });
      } catch (error) {
        console.error("[Export] Error exporting data:", error);
        return jsonResponse({ error: "Failed to export data" }, { status: 500 });
      }
    }

    // Change email
    if (pathname === "/account/email" && req.method === "PATCH") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!authToken) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = await req.json();
        const { newEmail, password } = body;

        if (!newEmail || !password) {
          return jsonResponse({ error: "Missing email or password" }, { status: 400 });
        }

        // Use service role to update email via Auth API
        const authBase = new URL('auth/v1/', process.env.SUPABASE_URL || '').href;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        const response = await fetch(new URL('admin/users/' + userId, authBase).href, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey || '',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            email: newEmail,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[Email] Update failed:', response.status, errorData);
          return jsonResponse({ error: errorData.message || "Failed to update email" }, { status: response.status });
        }

        console.log('[Email] Updated for user:', userId);
        return jsonResponse({ success: true, email: newEmail });
      } catch (error) {
        console.error("[Email] Exception updating email:", error);
        return jsonResponse({ error: "Failed to update email" }, { status: 500 });
      }
    }

    // Change password
    if (pathname === "/account/password" && req.method === "PATCH") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!authToken) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = await req.json();
        const { newPassword } = body;

        if (!newPassword || newPassword.length < 6) {
          return jsonResponse({ error: "Password must be at least 6 characters" }, { status: 400 });
        }

        // Use service role to update password via Auth API
        const authBase = new URL('auth/v1/', process.env.SUPABASE_URL || '').href;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        const response = await fetch(new URL('admin/users/' + userId, authBase).href, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey || '',
            'Authorization': `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            password: newPassword,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[Password] Update failed:', response.status, errorData);
          return jsonResponse({ error: errorData.message || "Failed to update password" }, { status: response.status });
        }

        console.log('[Password] Updated for user:', userId);
        return jsonResponse({ success: true });
      } catch (error) {
        console.error("[Password] Exception updating password:", error);
        return jsonResponse({ error: "Failed to update password" }, { status: 500 });
      }
    }

    // Delete account
    if (pathname === "/account" && req.method === "DELETE") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
      if (!authToken) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        // Delete all user data from database tables
        await Promise.all([
          supabase.from('subscriptions').delete().eq('user_id', userId),
          supabase.from('notification_preferences').delete().eq('user_id', userId),
          supabase.from('users').delete().eq('id', userId),
          supabase.from('family_groups').delete().eq('created_by', userId),
          supabase.from('family_group_members').delete().eq('user_id', userId),
        ]);

        console.log('[Account] Deleted user data for:', userId);

        // Delete user from Auth using service role
        const authBase = new URL('auth/v1/', process.env.SUPABASE_URL || '').href;
        const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

        const response = await fetch(new URL('admin/users/' + userId, authBase).href, {
          method: 'DELETE',
          headers: {
            'apikey': serviceKey || '',
            'Authorization': `Bearer ${serviceKey}`,
          },
        });

        if (!response.ok && response.status !== 404) {
          const errorData = await response.json().catch(() => ({}));
          console.error('[Account] Delete auth failed:', response.status, errorData);
          return jsonResponse({ error: errorData.message || "Failed to delete account" }, { status: response.status });
        }

        console.log('[Account] Deleted auth user:', userId);
        return jsonResponse({ success: true });
      } catch (error) {
        console.error("[Account] Exception deleting account:", error);
        return jsonResponse({ error: "Failed to delete account" }, { status: 500 });
      }
    }

    // Update user currency preference
    if (pathname === "/user/currency" && req.method === "PATCH") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = await req.json();
        const currency = String(body.currency || '').toUpperCase();

        // Validate currency code (3-letter uppercase)
        if (!currency || !/^[A-Z]{3}$/.test(currency)) {
          return jsonResponse({ error: "Invalid currency code" }, { status: 400 });
        }

        // Update user metadata in auth
        try {
          await supabase.auth.admin.updateUserById(userId, {
            user_metadata: { currency }
          });
        } catch (authError) {
          console.warn("[Currency] Auth update error:", authError);
        }

        // Also persist to users table for consistency
        try {
          await supabase.from('users').upsert({ id: userId, currency });
        } catch (dbError) {
          console.warn("[Currency] Failed to upsert currency into users table:", dbError);
        }

        return jsonResponse({ currency });
      } catch (error) {
        console.error("[Currency] Error updating currency:", error);
        return jsonResponse({ error: "Failed to update currency" }, { status: 500 });
      }
    }

    // Create subscription
    if (pathname === "/subscriptions" && req.method === "POST") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse(
          { error: "Login required to create subscriptions" },
          { status: 401 }
        );
      }

      const body = await req.json();
      const {
        name,
        amount,
        category = "other",
        currency = "USD",
        frequency = "monthly",
        nextBillingDate,
      } = body;

      if (!name || amount === undefined) {
        return jsonResponse(
          { error: "Missing required fields: name, amount" },
          { status: 400 }
        );
      }

      const subscriptionId = generateId();
      let dateStr: string;
      if (nextBillingDate) {
        const parsedDate = toDateOnlyLocal(nextBillingDate);
        if (!parsedDate) {
          return jsonResponse(
            { error: "Invalid nextBillingDate" },
            { status: 400 }
          );
        }
        dateStr = `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}-${String(parsedDate.getDate()).padStart(2, '0')}`;
      } else {
        const fallbackDate = new Date();
        fallbackDate.setHours(0, 0, 0, 0);
        if (frequency === "monthly") fallbackDate.setMonth(fallbackDate.getMonth() + 1);
        else if (frequency === "yearly") fallbackDate.setFullYear(fallbackDate.getFullYear() + 1);
        else if (frequency === "quarterly") fallbackDate.setMonth(fallbackDate.getMonth() + 3);
        else if (frequency === "weekly") fallbackDate.setDate(fallbackDate.getDate() + 7);
        dateStr = `${fallbackDate.getFullYear()}-${String(fallbackDate.getMonth() + 1).padStart(2, '0')}-${String(fallbackDate.getDate()).padStart(2, '0')}`;
      }

      try {
        // Use PostgREST API directly to avoid Supabase JS client schema cache issue
        const restApiUrl = `${SUPABASE_URL}/rest/v1/subscriptions`;
        const now = new Date();
        
        // Calculate billing_month based on next billing date
        let billingMonth: string;
        if (nextBillingDate) {
          const parsedDate = toDateOnlyLocal(nextBillingDate);
          if (parsedDate) {
            // If renewal date is in the past or today, bill for current month
            // Otherwise, bill for the month of the renewal date
            const renewalMonth = parsedDate.getMonth();
            const renewalYear = parsedDate.getFullYear();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            
            if (parsedDate <= now) {
              // Renewal date is today or in the past, bill for current month
              billingMonth = `${String(currentMonth + 1).padStart(2, '0')}-${currentYear}`;
            } else {
              // Future renewal date, bill for that month
              billingMonth = `${String(renewalMonth + 1).padStart(2, '0')}-${renewalYear}`;
            }
          } else {
            billingMonth = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
          }
        } else {
          // No next billing date provided, use current month
          billingMonth = `${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
        }
        billingMonth = billingMonth.split('-').reverse().join('-'); // Convert to YYYY-MM format
        
        const postgresResponse = await fetch(restApiUrl, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
          body: JSON.stringify({
            id: subscriptionId,
            user_id: userId,
            name,
            category,
            amount,
            currency,
            frequency,
            next_billing_at: dateStr,
            status: 'active',
            usage_count: 0,
            is_detected: false,
            billing_month: billingMonth,
          }),
        });

        if (!postgresResponse.ok) {
          const errorText = await postgresResponse.text();
          console.error("PostgREST error:", postgresResponse.status, errorText);
          return jsonResponse(
            { error: "Failed to create subscription", details: errorText },
            { status: 500 }
          );
        }

        const createdSubscription = await postgresResponse.json();
        return jsonResponse(createdSubscription[0] || { id: subscriptionId }, { status: 201 });
      } catch (err) {
        console.error("Exception during subscription creation:", err);
        return jsonResponse(
          { error: "Failed to create subscription", details: String(err) },
          { status: 500 }
        );
      }
    }

    // Get insights
    if (pathname === "/insights" && req.method === "GET") {
      const userId = extractUserId(req);
      // If no user, return empty for dev purposes
      if (!userId) {
        return jsonResponse([]);
      }

      const { data, error } = await supabase
        .from("insights")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching insights:", error);
        return jsonResponse(
          { error: "Failed to fetch insights" },
          { status: 500 }
        );
      }

      return jsonResponse(data || []);
    }

    // Get recommendations (same as insights for now)
    if (pathname === "/recommendations" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse([]);
      }

      const normalizeText = (value: any) => String(value || "").trim().toLowerCase();
      const safeNumber = (value: any) => (typeof value === "number" ? value : Number(value) || 0);
      const calculateMonthlyCostFor = (sub: any) => {
        const amount = safeNumber(sub.amount);
        const frequency = normalizeText(sub.frequency) || "monthly";
        if (frequency === "yearly") return amount / 12;
        if (frequency === "quarterly") return amount / 3;
        if (frequency === "weekly") return amount * 4;
        return amount;
      };
      const getUsageValue = (sub: any) => {
        const usage = sub.monthly_usage_count ?? sub.monthlyUsageCount ?? sub.usage_count ?? sub.usageCount;
        return typeof usage === "number" ? usage : null;
      };
      const getRenewalText = (sub: any) => {
        const nextBilling = sub.nextBillingDate || sub.next_billing_date || sub.next_billing_at || sub.next_billing;
        if (!nextBilling) return "";
        const date = new Date(nextBilling);
        if (Number.isNaN(date.getTime())) return "";
        return ` Next payment is due ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`;
      };
      const isStreaming = (sub: any) => {
        const lower = normalizeText(sub.name);
        return sub.category === "streaming" || /(netflix|disney|hulu|prime video|hbomax|peacock|paramount|spotify|streaming)/.test(lower);
      };
      const isProductivity = (sub: any) => {
        const lower = normalizeText(sub.name);
        return sub.category === "productivity" || sub.category === "software" || /(adobe|microsoft 365|office|photoshop|illustrator|creative cloud|notion|figma|canva)/.test(lower);
      };
      const isCloudStorage = (sub: any) => {
        const lower = normalizeText(sub.name);
        return sub.category === "cloud-storage" || /(dropbox|google drive|icloud|onedrive|box|cloud storage|storage)/.test(lower);
      };
      const isAnnual = (sub: any) => normalizeText(sub.frequency) === "yearly";

      try {
        const { data: subscriptions, error: subsError } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId);

        if (subsError) {
          console.error("Error fetching subscriptions for recommendations:", subsError);
          return jsonResponse(
            { error: "Failed to fetch subscriptions" },
            { status: 500 }
          );
        }

        const recommendations: any[] = [];
        const allSubs = (subscriptions || []).filter((sub: any) => isSubscriptionVisible(sub));
        const activeStreamingSubs = allSubs.filter((sub: any) => sub.status === "active" && isStreaming(sub));
        const streamingTotal = activeStreamingSubs.reduce((sum: number, sub: any) => sum + calculateMonthlyCostFor(sub), 0);

        if (activeStreamingSubs.length >= 2 && streamingTotal >= 30) {
          const sample = activeStreamingSubs[0];
          recommendations.push({
            id: `rec-streaming-bundle-${sample.id}`,
            type: "downgrade",
            title: "Consolidate or rotate streaming services",
            description: `You are paying ${streamingTotal.toFixed(2)} ${sample.currency || "USD"}/mo for ${activeStreamingSubs.length} streaming services. Pausing one service and rotating each month can lower this spend without missing your favorites.`,            currentCost: streamingTotal,
            suggestedCost: Math.round((streamingTotal * 0.65) * 100) / 100,
            savings: Math.round((streamingTotal * 0.35) * 100) / 100,
            subscriptionId: sample.id,
            confidence: 0.9,
            currency: sample.currency || "USD",
          });
        }

        for (const sub of allSubs) {
          const monthlyCost = calculateMonthlyCostFor(sub);
          const usage = getUsageValue(sub);
          const renewalText = getRenewalText(sub);
          const name = String(sub.name || "Service");
          const currency = sub.currency || "USD";
          const lowerName = normalizeText(name);

          if (sub.status === "unused") {
            const usageMessage = usage === null ? "You have not used it recently." : usage === 0 ? "You have not used it recently." : `You used it only ${usage} time${usage === 1 ? "" : "s"} this month.`;
            recommendations.push({
              id: `rec-${sub.id}-unused`,
              type: "cancel",
              title: `Cancel ${name}`,
              description: `${usageMessage} ${name} costs ${monthlyCost.toFixed(2)} ${currency}/mo. Canceling now avoids another renewal.${renewalText}`,
              currentCost: monthlyCost,
              suggestedCost: 0,
              savings: monthlyCost,
              subscriptionId: sub.id,
              confidence: 0.98,
              currency,
            });
            continue;
          }

          if (sub.status === "to-cancel") {
            recommendations.push({
              id: `rec-${sub.id}-tocancel`,
              type: "cancel",
              title: `Complete cancellation of ${name}`,
              description: `${name} is marked for cancellation. Finalize it before the next charge to stop future fees.${renewalText}`,
              currentCost: monthlyCost,
              suggestedCost: 0,
              savings: monthlyCost,
              subscriptionId: sub.id,
              confidence: 0.95,
              currency,
            });
            continue;
          }

          if (sub.status === "active") {
            if (usage === 0 && monthlyCost >= 8) {
              recommendations.push({
                id: `rec-${sub.id}-zero-usage`,
                type: "cancel",
                title: `Cancel ${name} — no usage this month`,
                description: `You did not use ${name} this month, yet it costs ${monthlyCost.toFixed(2)} ${currency}/mo. Cancel it to reclaim budget immediately.${renewalText}`,
                currentCost: monthlyCost,
                suggestedCost: 0,
                savings: monthlyCost,
                subscriptionId: sub.id,
                confidence: 0.97,
                currency,
              });
              continue;
            }

            if (isProductivity(sub) && monthlyCost >= 12) {
              recommendations.push({
                id: `rec-${sub.id}-productivity`,
                type: "alternative",
                title: `Explore a lighter productivity plan for ${name}`,
                description: `${name} costs ${monthlyCost.toFixed(2)} ${currency}/mo. If your work is mostly documents, notes, or basic design, a simpler alternative should save more than 40%.`,                currentCost: monthlyCost,
                suggestedCost: Math.round((monthlyCost * 0.45) * 100) / 100,
                savings: Math.round((monthlyCost * 0.55) * 100) / 100,
                subscriptionId: sub.id,
                alternativeName: "Affinity, Canva, or Google Workspace",
                confidence: 0.86,
                currency,
              });
              continue;
            }

            if (isStreaming(sub) && monthlyCost >= 14 && (usage === null || usage <= 3)) {
              recommendations.push({
                id: `rec-${sub.id}-streaming`,
                type: "downgrade",
                title: `Rotate or share ${name}`,
                description: `${name} costs ${monthlyCost.toFixed(2)} ${currency}/mo. If you only watch it occasionally, a shared plan or alternating services can cut your monthly streaming spend.`,                currentCost: monthlyCost,
                suggestedCost: Math.round((monthlyCost * 0.65) * 100) / 100,
                savings: Math.round((monthlyCost * 0.35) * 100) / 100,
                subscriptionId: sub.id,
                confidence: 0.88,
                currency,
              });
              continue;
            }

            if (isCloudStorage(sub) && monthlyCost >= 10 && (usage === null || usage <= 2)) {
              recommendations.push({
                id: `rec-${sub.id}-storage`,
                type: "downgrade",
                title: `Review storage tier for ${name}`,
                description: `${name} costs ${monthlyCost.toFixed(2)} ${currency}/mo. If you are using little capacity, a lower tier can keep your files safe while trimming the bill.`,                currentCost: monthlyCost,
                suggestedCost: Math.round((monthlyCost * 0.65) * 100) / 100,
                savings: Math.round((monthlyCost * 0.35) * 100) / 100,
                subscriptionId: sub.id,
                confidence: 0.84,
                currency,
              });
              continue;
            }

            if (isAnnual(sub) && monthlyCost >= 15) {
              recommendations.push({
                id: `rec-${sub.id}-annual`,
                type: "negotiate",
                title: `Review annual pricing for ${name}`,
                description: `${name} is billed annually. Check whether switching to monthly, negotiating a loyalty discount, or using a promo can reduce the effective monthly cost.`,                currentCost: monthlyCost,
                suggestedCost: Math.round((monthlyCost * 0.75) * 100) / 100,
                savings: Math.round((monthlyCost * 0.25) * 100) / 100,
                subscriptionId: sub.id,
                confidence: 0.78,
                currency,
              });
              continue;
            }

            if (monthlyCost >= 25) {
              const usageDescriptor = usage === null ? "" : `You used it ${usage} time${usage === 1 ? "" : "s"} this month.`;
              recommendations.push({
                id: `rec-${sub.id}-high-cost`,
                type: "negotiate",
                title: `Review ${name} for potential savings`,
                description: `${name} costs ${monthlyCost.toFixed(2)} ${currency}/mo. ${usageDescriptor} A lower tier, promotion, or alternate vendor could shrink this cost by 20–40%.`,                currentCost: monthlyCost,
                suggestedCost: Math.round((monthlyCost * 0.7) * 100) / 100,
                savings: Math.round((monthlyCost * 0.3) * 100) / 100,
                subscriptionId: sub.id,
                confidence: 0.7,
                currency,
              });
              continue;
            }

            if (usage !== null && usage <= 2 && monthlyCost >= 10) {
              recommendations.push({
                id: `rec-${sub.id}-low-use`,
                type: "downgrade",
                title: `Check value for ${name}`,
                description: `You used ${name} only ${usage} time${usage === 1 ? "" : "s"} this month, while it costs ${monthlyCost.toFixed(2)} ${currency}/mo. A smaller plan may still cover what you need.`,                currentCost: monthlyCost,
                suggestedCost: Math.round((monthlyCost * 0.8) * 100) / 100,
                savings: Math.round((monthlyCost * 0.2) * 100) / 100,
                subscriptionId: sub.id,
                confidence: 0.68,
                currency,
              });
            }
          }
        }

        return jsonResponse(recommendations);
      } catch (error) {
        console.error("Error generating recommendations:", error);
        return jsonResponse(
          { error: "Failed to generate recommendations" },
          { status: 500 }
        );
      }
    }

    // Metrics
    if (pathname === "/metrics" && req.method === "GET") {
      const userId = extractUserId(req);
      // If no user, return empty for dev purposes
      if (!userId) {
        return jsonResponse({
          totalMonthlySpend: 0,
          totalItems: 0,
          activeSubscriptions: 0,
          inactiveSubscriptions: 0,
          potentialSavings: 0,
          thisMonthSavings: 0,
          averageCostPerUse: 0,
          metrics: { healthScore: 100 },
        });
      }

      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching metrics:", error);
        return jsonResponse(
          { error: "Failed to fetch metrics" },
          { status: 500 }
        );
      }

      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
      
      const allSubs = data || [];
      const activeSubs = allSubs.filter((s) => normalizeSubscriptionStatus(s.status) === "active");
      const renewalRelevantSubs = allSubs.filter((s) => {
        const status = normalizeSubscriptionStatus(s.status);
        return status === "active" || status === "unused" || status === "to-cancel" || isSubscriptionDeleted(s) || isSubscriptionCanceled(s);
      });
      const unusedSubs = allSubs.filter((s) => normalizeSubscriptionStatus(s.status) === "unused");
      const toCancelSubs = allSubs.filter((s) => normalizeSubscriptionStatus(s.status) === "to-cancel");
      
      // Calculate total monthly spend only for subscriptions renewing in this month.
      // Includes active, unused, and to-cancel subscriptions when their next renewal falls in the current month.
      // Also includes subscriptions that have already renewed in this month (created_at day has passed).
      const dayOfMonth = now.getDate();
      
      const totalCost = calculateTotalMonthlySpending(allSubs, monthStart, monthEnd, now);

      // Potential savings are from unused and to-cancel subscriptions (if cancelled)
      const potentialSavings = [...unusedSubs, ...toCancelSubs].reduce((sum, s) => {
        const monthlyAmount = calculateMonthlyCost(Number(s.amount) || 0, s.frequency);
        return sum + convertToUSD(monthlyAmount, s.currency);
      }, 0);
      
      const deletedSubs = allSubs.filter((s) => isSubscriptionDeleted(s));
      
      // Calculate this month's savings (subscriptions deleted this month)
      const thisMonthSavings = deletedSubs
        .filter((s) => {
          const deletedAt = s.deleted_at || s.deletedAt;
          if (!deletedAt) return false;
          const deleted = new Date(deletedAt);
          return deleted >= monthStart && deleted <= now;
        })
        .reduce((sum, s) => {
          const monthlyAmount = calculateMonthlyCost(Number(s.amount) || 0, s.frequency);
          return sum + convertToUSD(monthlyAmount, s.currency);
        }, 0);

      return jsonResponse({
        totalMonthlySpend: totalCost,
        totalItems: allSubs.length,
        activeSubscriptions: allSubs.filter((s: any) => s.status === 'active').length,
        inactiveSubscriptions: unusedSubs.length + toCancelSubs.length,
        potentialSavings: potentialSavings,
        thisMonthSavings: thisMonthSavings,
        averageCostPerUse: 0,
        metrics: { healthScore: 100 },
      });
    }

    if (pathname === "/family-groups" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse([]);
      }

      try {
        // Only fetch groups where user is the owner to avoid RLS issues on family_group_members
        const { data: ownerGroups, error: ownerError } = await supabase
          .from("family_groups")
          .select("id,name,created_at,owner_id")
          .eq("owner_id", userId);
        if (ownerError) {
          console.error("Error fetching owner groups:", ownerError);
          // Continue with empty array if fetch fails
        }

        return jsonResponse(
          (ownerGroups || []).map((group: any) => ({
            id: group.id,
            name: group.name,
            createdAt: group.created_at,
            ownerId: group.owner_id,
          }))
        );
      } catch (err) {
        console.error("Error fetching family groups:", err);
        // Return empty array to allow app to continue
        return jsonResponse([]);
      }
    }

    if (pathname === "/family-groups/me/membership" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ groups: [], isMemberOfFamily: false, membershipCount: 0, membershipInfo: [] });
      }

      try {
        // Get groups where user is owner
        const { data: ownerGroups, error: ownerError } = await supabase
          .from("family_groups")
          .select("id, name, created_at")
          .eq("owner_id", userId);

        if (ownerError) {
          console.error("Error fetching owned groups:", ownerError);
          return jsonResponse({ groups: [], isMemberOfFamily: false, membershipCount: 0, membershipInfo: [] });
        }

        // Get groups where user is a member
        const { data: memberRows, error: memberError } = await supabase
          .from("family_group_members")
          .select("family_group_id, role, joined_at, family_groups(id, name, created_at, owner_id)")
          .eq("user_id", userId);

        if (memberError) {
          console.error("Error fetching member groups:", memberError);
          return jsonResponse({ groups: [], isMemberOfFamily: false, membershipCount: 0, membershipInfo: [] });
        }

        const getNestedFamilyGroup = (m: any) => {
          const nested = m?.family_groups;
          if (Array.isArray(nested)) {
            return nested[0];
          }
          return nested;
        };

        const allGroups = [
          ...(ownerGroups || []).map(g => ({ ...g, role: 'owner' })),
          ...(memberRows || []).map(m => {
            const nestedGroup = getNestedFamilyGroup(m);
            return {
              id: nestedGroup?.id,
              name: nestedGroup?.name,
              created_at: nestedGroup?.created_at,
              role: m.role,
            };
          }).filter(g => g.id)
        ];

        const membershipInfo = (memberRows || []).map(m => {
          const nestedGroup = getNestedFamilyGroup(m);
          return {
            groupId: m.family_group_id,
            role: m.role,
            joinedAt: m.joined_at,
            groupName: nestedGroup?.name,
            isOwner: nestedGroup?.owner_id === userId,
          };
        });

        return jsonResponse({
          groups: allGroups,
          isMemberOfFamily: allGroups.length > 0,
          membershipCount: allGroups.length,
          membershipInfo
        });
      } catch (err) {
        console.error("Error fetching membership:", err);
        return jsonResponse({ groups: [], isMemberOfFamily: false, membershipCount: 0, membershipInfo: [] });
      }
    }

    if (pathname === "/family-groups/me/family-data" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ familyData: null, isMemberOfFamily: false });
      }

      try {
        // Get user's family group membership
        const { data: membership, error: memberError } = await supabase
          .from("family_group_members")
          .select("family_group_id, role, family_groups(id, name, owner_id, created_at)")
          .eq("user_id", userId)
          .single();

        if (memberError && memberError.code !== 'PGRST116') { // PGRST116 is "not found"
          console.error("Error fetching membership:", memberError);
          return jsonResponse({ familyData: null, isMemberOfFamily: false });
        }

        // Check if user is owner of a group
        const { data: ownedGroup, error: ownerError } = await supabase
          .from("family_groups")
          .select("id, name, owner_id, created_at")
          .eq("owner_id", userId)
          .single();

        if (ownerError && ownerError.code !== 'PGRST116') {
          console.error("Error fetching owned group:", ownerError);
          return jsonResponse({ familyData: null, isMemberOfFamily: false });
        }

        const familyGroup = ownedGroup || getNestedFamilyGroup(membership);
        const normalizedFamilyGroup = Array.isArray(familyGroup) ? familyGroup[0] : familyGroup;
        const isOwner = !!ownedGroup;
        const isMember = !!membership;
        const isMemberOfFamily = isOwner || isMember;

        if (!isMemberOfFamily || !normalizedFamilyGroup?.id) {
          return jsonResponse({ familyData: null, isMemberOfFamily: false });
        }

        // Get all members of the family group
        const { data: members, error: membersError } = await supabase
          .from("family_group_members")
          .select(`
            user_id,
            role,
            joined_at,
            profiles:user_id (
              id,
              email,
              full_name,
              avatar_url
            )
          `)
          .eq("family_group_id", normalizedFamilyGroup.id);

        if (membersError) {
          console.error("Error fetching members:", membersError);
          return jsonResponse({ familyData: null, isMemberOfFamily: false });
        }

        // Get owner profile
        const { data: ownerProfile, error: ownerProfileError } = await supabase
          .from("profiles")
          .select("id, email, full_name, avatar_url")
          .eq("id", normalizedFamilyGroup.owner_id)
          .single();

        if (ownerProfileError) {
          console.error("Error fetching owner profile:", ownerProfileError);
          return jsonResponse({ familyData: null, isMemberOfFamily: false });
        }

        const familyData = {
          group: {
            id: normalizedFamilyGroup.id,
            name: normalizedFamilyGroup.name,
            ownerId: normalizedFamilyGroup.owner_id,
            createdAt: normalizedFamilyGroup.created_at,
            owner: ownerProfile
          },
          members: members || [],
          userRole: isOwner ? 'owner' : membership?.role || 'member',
          isOwner,
          isMember
        };

        return jsonResponse({ familyData, isMemberOfFamily: true });
      } catch (err) {
        console.error("Error fetching family data:", err);
        return jsonResponse({ familyData: null, isMemberOfFamily: false });
      }
    }

    if (pathname === "/family-groups/me/family-metrics" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ familyMetrics: null, isMemberOfFamily: false });
      }

      try {
        // Get user's family group
        const { data: membership, error: memberError } = await supabase
          .from("family_group_members")
          .select("family_group_id, family_groups(id, name, owner_id)")
          .eq("user_id", userId)
          .single();

        if (memberError && memberError.code !== 'PGRST116') {
          console.error("Error fetching membership:", memberError);
          return jsonResponse({ familyMetrics: null, isMemberOfFamily: false });
        }

        // Check if user owns a group
        const { data: ownedGroup, error: ownerError } = await supabase
          .from("family_groups")
          .select("id, name, owner_id")
          .eq("owner_id", userId)
          .single();

        if (ownerError && ownerError.code !== 'PGRST116') {
          console.error("Error fetching owned group:", ownerError);
          return jsonResponse({ familyMetrics: null, isMemberOfFamily: false });
        }

        const familyGroup = ownedGroup || getNestedFamilyGroup(membership);
        const normalizedFamilyGroup = Array.isArray(familyGroup) ? familyGroup[0] : familyGroup;
        if (!normalizedFamilyGroup?.id) {
          return jsonResponse({ familyMetrics: null, isMemberOfFamily: false });
        }

        // Get all members of the family group
        const { data: members, error: membersError } = await supabase
          .from("family_group_members")
          .select("user_id")
          .eq("family_group_id", normalizedFamilyGroup.id);

        if (membersError) {
          console.error("Error fetching members:", membersError);
          return jsonResponse({ familyMetrics: null, isMemberOfFamily: false });
        }

        const memberIds = members?.map(m => m.user_id) || [];
        if (!memberIds.includes(userId)) {
          memberIds.push(userId); // Include owner if not already in members
        }

        // Get metrics for all family members
        const { data: metrics, error: metricsError } = await supabase
          .from("user_metrics")
          .select("*")
          .in("user_id", memberIds);

        if (metricsError) {
          console.error("Error fetching family metrics:", metricsError);
          return jsonResponse({ familyMetrics: null, isMemberOfFamily: false });
        }

        // Aggregate metrics
        const totalSavings = (metrics || []).reduce((sum, m) => sum + (m.total_savings || 0), 0);
        const totalSpent = (metrics || []).reduce((sum, m) => sum + (m.total_spent || 0), 0);
        const activeSubscriptions = (metrics || []).reduce((sum, m) => sum + (m.active_subscriptions || 0), 0);
        const cancelledSubscriptions = (metrics || []).reduce((sum, m) => sum + (m.cancelled_subscriptions || 0), 0);

        const familyMetrics = {
          totalSavings,
          totalSpent,
          activeSubscriptions,
          cancelledSubscriptions,
          memberCount: memberIds.length,
          individualMetrics: metrics || []
        };

        return jsonResponse({ familyMetrics, isMemberOfFamily: true });
      } catch (err) {
        console.error("Error fetching family metrics:", err);
        return jsonResponse({ familyMetrics: null, isMemberOfFamily: false });
      }
    }

    if (pathname === "/family-groups" && req.method === "POST") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = await req.json();
        const name = body.name || "My family";

        // Check if user already has a family group
        const { data: existingGroups, error: checkError } = await supabase
          .from("family_groups")
          .select("id")
          .eq("owner_id", userId);

        if (checkError) {
          return jsonResponse({ error: "Failed to check existing groups" }, { status: 500 });
        }

        if ((existingGroups?.length ?? 0) >= 1) {
          return jsonResponse({ error: "You can only create 1 family group." }, { status: 400 });
        }

        // Create the family group
        const { data: createdGroup, error: createError } = await supabase
          .from("family_groups")
          .insert({
            name,
            owner_id: userId,
          })
          .select()
          .single();

        if (createError || !createdGroup) {
          console.error("Failed to create family group:", createError);
          return jsonResponse({ error: "Failed to create family group" }, { status: 500 });
        }

        // Get owner's email for member record
        let ownerEmail: string | null = null;
        try {
          const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
          if (!userError && user?.email) {
            ownerEmail = user.email;
          }
        } catch (err) {
          console.error('Error fetching owner email:', err);
        }

        // Add the owner as a member
        const { error: memberError } = await supabase
          .from("family_group_members")
          .insert({
            family_group_id: createdGroup.id,
            user_id: userId,
            role: "owner",
            email: ownerEmail,
          });

        if (memberError) {
          console.error("Failed to add owner as member:", memberError);
          // Don't fail the whole request, the group was created
        }

        // Initialize the settings record
        const { error: settingsError } = await supabase
          .from("family_group_settings")
          .insert({
            family_group_id: createdGroup.id,
            owner_id: userId,
            show_family_data: false,
          });

        if (settingsError) {
          console.error("Failed to create settings for family group:", settingsError);
          // Don't fail the whole request, the group was created
        }

        return jsonResponse({
          id: createdGroup.id,
          name: createdGroup.name,
          ownerId: createdGroup.owner_id,
          createdAt: createdGroup.created_at,
        });
      } catch (error) {
        console.error("Error creating family group:", error);
        return jsonResponse({ error: "Failed to create family group" }, { status: 500 });
      }
    }

    if (pathname.match(/^\/family-groups\/[^/]+$/) && req.method === "DELETE") {
      return jsonResponse({ success: true });
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/members$/) && req.method === "GET") {
      const match = pathname.match(/^\/family-groups\/([^/]+)\/members$/);
      const groupId = match?.[1];
      if (!groupId) {
        return jsonResponse({ error: 'Invalid family group ID' }, { status: 400 });
      }

      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
      }

      try {
        const { data: groupRow, error: groupRowError } = await supabase
          .from('family_groups')
          .select('owner_id')
          .eq('id', groupId)
          .single();

        if (groupRowError || !groupRow) {
          return jsonResponse({ error: 'Family group not found' }, { status: 404 });
        }

        if (groupRow.owner_id !== userId) {
          const { data: membership, error: membershipError } = await supabase
            .from('family_group_members')
            .select('id')
            .eq('family_group_id', groupId)
            .eq('user_id', userId)
            .single();

          if (membershipError || !membership) {
            return jsonResponse({ error: 'Not authorized to view family members' }, { status: 403 });
          }
        }

        const { data: members, error: membersError } = await supabase
          .from('family_group_members')
          .select('*')
          .eq('family_group_id', groupId);

        if (membersError) {
          console.error('Error fetching family members:', membersError);
          return jsonResponse({ error: 'Failed to fetch family members' }, { status: 500 });
        }

        // Fetch emails from auth service for members without email data
        const membersWithEmails = await Promise.all((members || []).map(async (member: any) => {
          let email = member.email;
          
          // If email is missing, try to fetch from auth service
          if (!email) {
            try {
              const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
              email = userData?.user?.email || null;
            } catch (err) {
              console.error(`Error fetching email for user ${member.user_id}:`, err);
            }
          }
          
          return {
            id: member.id,
            familyGroupId: member.family_group_id,
            userId: member.user_id,
            role: member.role,
            joinedAt: member.joined_at,
            email: email,
          };
        }));

        return jsonResponse(membersWithEmails);
      } catch (error) {
        console.error('Error in GET /family-groups/:id/members:', error);
        return jsonResponse({ error: 'Failed to fetch family members' }, { status: 500 });
      }
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/members$/) && req.method === "POST") {
      const match = pathname.match(/^\/family-groups\/([^/]+)\/members$/);
      const groupId = match?.[1];
      if (!groupId) {
        return jsonResponse({ error: 'Invalid family group ID' }, { status: 400 });
      }

      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
      }

      let body: any;
      try {
        body = await req.json();
      } catch (error) {
        return jsonResponse({ error: 'Invalid request body' }, { status: 400 });
      }

      const rawIdentifier = (body.memberIdentifier || body.memberEmail || body.memberId || '').trim();
      if (!rawIdentifier || typeof rawIdentifier !== 'string') {
        return jsonResponse({ error: 'Missing member email or user ID' }, { status: 400 });
      }

      if (rawIdentifier === groupId) {
        return jsonResponse({ error: 'Member identifier cannot be the family group ID; provide an exact email or user ID' }, { status: 400 });
      }

      try {
        const { data: groupRow, error: groupRowError } = await supabase
          .from('family_groups')
          .select('owner_id')
          .eq('id', groupId)
          .single();

        if (groupRowError || !groupRow) {
          return jsonResponse({ error: 'Family group not found' }, { status: 404 });
        }

        if (groupRow.owner_id !== userId) {
          return jsonResponse({ error: 'Only group owner can add members' }, { status: 403 });
        }

        let memberUserId: string | null = null;
        const isEmail = rawIdentifier.includes('@');
        const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawIdentifier) || /^[0-9a-fA-F]{32}$/.test(rawIdentifier);

        if (isUuid) {
          try {
            const { data: userData, error: userError } = await supabase.auth.admin.getUserById(rawIdentifier);
            if (!userError && userData?.user?.id) {
              memberUserId = userData.user.id;
            }
          } catch (error) {
            // ignore admin lookup failures and fall back
          }
        }

        if (!memberUserId && isEmail) {
          const emailCandidate = rawIdentifier.toLowerCase();
          const { data: userRow, error: userRowError } = await supabase
            .from('users')
            .select('id')
            .eq('email', emailCandidate)
            .single();
          if (!userRowError && userRow?.id) {
            memberUserId = userRow.id;
          }
        }

        if (!memberUserId) {
          const { data: userRow, error: userRowError } = await supabase
            .from('users')
            .select('id')
            .or(`id.eq.${rawIdentifier},email.eq.${rawIdentifier.toLowerCase()}`)
            .single();
          if (!userRowError && userRow?.id) {
            memberUserId = userRow.id;
          }
        }

        if (!memberUserId) {
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const users = listData?.users ?? [];
          if (!listError) {
            const found = users.find((u: any) => u.id === rawIdentifier || u.email?.toLowerCase() === rawIdentifier.toLowerCase());
            if (found) {
              memberUserId = found.id;
            }
          }
        }

        if (!memberUserId) {
          return jsonResponse({ error: 'User not found; please use an exact registered email or user ID' }, { status: 404 });
        }

        // Fetch the member's email
        let memberEmail: string | null = null;
        try {
          const { data: userData } = await supabase.auth.admin.getUserById(memberUserId);
          if (userData?.user?.email) {
            memberEmail = userData.user.email;
          }
        } catch (err) {
          console.error('Error fetching member email:', err);
        }

        const { data: insertData, error: insertError } = await supabase
          .from('family_group_members')
          .insert({
            family_group_id: groupId,
            user_id: memberUserId,
            role: 'member',
            email: memberEmail,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting family member:', insertError);
          return jsonResponse({ error: 'Failed to add family member' }, { status: 500 });
        }

        return jsonResponse({
          id: insertData.id,
          familyGroupId: insertData.family_group_id,
          userId: insertData.user_id,
          role: insertData.role,
          joinedAt: insertData.joined_at,
          email: insertData.email || memberEmail,
        }, { status: 201 });
      } catch (error) {
        console.error('Error in POST /family-groups/:id/members:', error);
        return jsonResponse({ error: 'Failed to add family member' }, { status: 500 });
      }
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/members\/[^/]+\/dashboard$/) && req.method === "GET") {
      const match = pathname.match(/^\/family-groups\/([^/]+)\/members\/([^/]+)\/dashboard$/);
      const groupId = match?.[1];
      const memberId = match?.[2];
      if (!groupId || !memberId) {
        return jsonResponse({ error: 'Invalid request' }, { status: 400 });
      }

      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
      }

      try {
        // Verify the requested member exists in the group
        const { data: member, error: memberError } = await supabase
          .from('family_group_members')
          .select('*')
          .eq('family_group_id', groupId)
          .eq('user_id', memberId)
          .single();

        if (memberError || !member) {
          return jsonResponse({ error: 'Member not found in group' }, { status: 404 });
        }

        // If requester is the member themselves, return their dashboard
        if (userId === memberId) {
          const { data: subscriptions, error: subsError } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', memberId);

          const { data: userSub } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', memberId)
            .single();

          return jsonResponse({
            member,
            subscriptions: subscriptions || [],
            userSubscription: userSub || null,
          });
        }

        // Otherwise, requester must be the group owner to view other member info
        const { data: groupInfo, error: groupInfoError } = await supabase
          .from('family_groups')
          .select('owner_id')
          .eq('id', groupId)
          .single();

        if (groupInfoError || !groupInfo) {
          return jsonResponse({ error: 'Failed to fetch group info' }, { status: 500 });
        }

        // Only owner can view other members' dashboards
        if (groupInfo.owner_id !== userId) {
          return jsonResponse({ error: 'Members can only view their own dashboard' }, { status: 403 });
        }

        // Owner can view specific member's subscriptions and details
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', memberId);

        const { data: userSub } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', memberId)
          .single();

        return jsonResponse({
          member,
          subscriptions: subscriptions || [],
          userSubscription: userSub || null,
        });
      } catch (error) {
        console.error('Error in GET /family-groups/:id/members/:memberId/dashboard:', error);
        return jsonResponse({ error: 'Failed to fetch member dashboard data' }, { status: 500 });
      }
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/members\/[^/]+$/) && req.method === "DELETE") {
      const match = pathname.match(/^\/family-groups\/([^/]+)\/members\/([^/]+)$/);
      const groupId = match?.[1];
      const memberId = match?.[2];
      if (!groupId || !memberId) {
        return jsonResponse({ error: 'Invalid request' }, { status: 400 });
      }

      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
      }

      try {
        const { data: groupRow, error: groupRowError } = await supabase
          .from('family_groups')
          .select('owner_id')
          .eq('id', groupId)
          .single();

        if (groupRowError || !groupRow) {
          return jsonResponse({ error: 'Family group not found' }, { status: 404 });
        }

        if (groupRow.owner_id !== userId) {
          return jsonResponse({ error: 'Only group owner can remove members' }, { status: 403 });
        }

        const { error: deleteError } = await supabase
          .from('family_group_members')
          .delete()
          .eq('id', memberId)
          .eq('family_group_id', groupId);

        if (deleteError) {
          console.error('Error deleting family member:', deleteError);
          return jsonResponse({ error: 'Failed to remove family member' }, { status: 500 });
        }

        return jsonResponse({ success: true });
      } catch (error) {
        console.error('Error in DELETE /family-groups/:id/members/:memberId:', error);
        return jsonResponse({ error: 'Failed to remove family member' }, { status: 500 });
      }
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/shared-subscriptions$/) && req.method === "GET") {
      const match = pathname.match(/^\/family-groups\/([^/]+)\/shared-subscriptions$/);
      const groupId = match?.[1];
      if (!groupId) {
        return jsonResponse({ error: "Invalid group ID" }, { status: 400 });
      }

      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      const { data: groupRow, error: groupRowError } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupRowError || !groupRow) {
        return jsonResponse({ error: 'Family group not found' }, { status: 404 });
      }

      if (groupRow.owner_id !== userId) {
        const { data: membership, error: membershipError } = await supabase
          .from('family_group_members')
          .select('id')
          .eq('family_group_id', groupId)
          .eq('user_id', userId)
          .single();

        if (membershipError || !membership) {
          return jsonResponse({ error: 'Not authorized to view shared subscriptions' }, { status: 403 });
        }
      }

      const { data: sharedSubs, error: sharedError } = await supabase
        .from('shared_subscriptions')
        .select('id,family_group_id,subscription_id,shared_by_user_id,shared_with_user_id,shared_at')
        .eq('family_group_id', groupId);

      if (sharedError) {
        console.error('Error fetching shared subscriptions:', sharedError);
        return jsonResponse({ error: 'Failed to fetch shared subscriptions' }, { status: 500 });
      }

      // Filter results based on user permissions
      let filteredSharedSubs = sharedSubs || [];
      if (groupRow.owner_id !== userId) {
        // Members only see subscriptions shared with them
        filteredSharedSubs = filteredSharedSubs.filter(sub => sub.shared_with_user_id === userId);
      }
      // Owners see all shared subscriptions in their group

      return jsonResponse(filteredSharedSubs);
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/share-subscription$/) && req.method === "POST") {
      const match = pathname.match(/^\/family-groups\/([^/]+)\/share-subscription$/);
      const groupId = match?.[1];
      if (!groupId) {
        return jsonResponse({ error: 'Invalid group ID' }, { status: 400 });
      }

      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
      }

      let body: any;
      try {
        body = await req.json();
      } catch (error) {
        return jsonResponse({ error: 'Invalid request body' }, { status: 400 });
      }

      const subscriptionId = body.subscriptionId;
      const memberIds = body.memberIds;
      if (!subscriptionId) {
        return jsonResponse({ error: 'Missing subscriptionId' }, { status: 400 });
      }
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return jsonResponse({ error: 'Missing or invalid memberIds' }, { status: 400 });
      }

      const { data: groupRow, error: groupRowError } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupRowError || !groupRow) {
        return jsonResponse({ error: 'Family group not found' }, { status: 404 });
      }

      if (groupRow.owner_id !== userId) {
        return jsonResponse({ error: 'Only the group owner can share subscriptions' }, { status: 403 });
      }

      // Verify all specified members are part of the family group
      for (const memberId of memberIds) {
        const { data: membership, error: membershipError } = await supabase
          .from('family_group_members')
          .select('id')
          .eq('family_group_id', groupId)
          .eq('user_id', memberId)
          .single();

        if (membershipError || !membership) {
          return jsonResponse({ error: `Member ${memberId} is not part of this family group` }, { status: 403 });
        }
      }

      if (memberIds.includes(groupRow.owner_id)) {
        return jsonResponse({ error: 'Cannot share subscriptions to the family group owner' }, { status: 400 });
      }

      const { data: subRow, error: subError } = await supabase
        .from('subscriptions')
        .select('user_id')
        .eq('id', subscriptionId)
        .single();

      if (subError || !subRow) {
        return jsonResponse({ error: 'Subscription not found' }, { status: 404 });
      }

      // Check that none of the selected members own the subscription
      if (memberIds.includes(subRow.user_id)) {
        return jsonResponse({ error: 'Cannot share subscription with its owner' }, { status: 400 });
      }

      // Create shared subscription records for each selected member
      const sharedRecords = [];
      for (const memberId of memberIds) {
        const { data: newShare, error: insertError } = await supabase
          .from('shared_subscriptions')
          .insert({
            family_group_id: groupId,
            subscription_id: subscriptionId,
            shared_by_user_id: subRow.user_id, // The member who owns the subscription
            shared_with_user_id: memberId, // The member it's being shared with
            shared_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error sharing subscription:', insertError);
          return jsonResponse({ error: `Failed to share subscription with member ${memberId}` }, { status: 500 });
        }

        sharedRecords.push(newShare);
      }

      return jsonResponse(sharedRecords, { status: 201 });
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/shared-subscriptions\/[^/]+$/) && req.method === "DELETE") {
      const match = pathname.match(/^\/family-groups\/([^/]+)\/shared-subscriptions\/([^/]+)$/);
      const groupId = match?.[1];
      const sharedId = match?.[2];
      if (!groupId || !sharedId) {
        return jsonResponse({ error: 'Invalid request' }, { status: 400 });
      }

      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
      }

      const { data: groupRow, error: groupRowError } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupRowError || !groupRow) {
        return jsonResponse({ error: 'Family group not found' }, { status: 404 });
      }

      // Check if user is owner or the member the subscription was shared with
      let canUnshare = groupRow.owner_id === userId;
      if (!canUnshare) {
        // Check if this shared subscription was shared with the current user
        const { data: sharedRecord, error: sharedCheckError } = await supabase
          .from('shared_subscriptions')
          .select('shared_with_user_id')
          .eq('id', sharedId)
          .eq('family_group_id', groupId)
          .single();

        if (!sharedCheckError && sharedRecord && sharedRecord.shared_with_user_id === userId) {
          canUnshare = true;
        }
      }

      if (!canUnshare) {
        return jsonResponse({ error: 'Not authorized to unshare this subscription' }, { status: 403 });
      }

      const { error: deleteError } = await supabase
        .from('shared_subscriptions')
        .delete()
        .eq('id', sharedId)
        .eq('family_group_id', groupId);

      if (deleteError) {
        console.error('Error unsharing subscription:', deleteError);
        return jsonResponse({ error: 'Failed to unshare subscription' }, { status: 500 });
      }

      return jsonResponse({ success: true });
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/shared-subscriptions\/[^/]+\/cost-splits$/) && req.method === "POST") {
      return jsonResponse({ success: true });
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/settings$/) && req.method === "PUT") {
      const match = pathname.match(/^\/family-groups\/([^/]+)\/settings$/);
      const groupId = match?.[1];

      if (!groupId) {
        return jsonResponse({ error: "Invalid group ID" }, { status: 400 });
      }

      try {
        const userId = extractUserId(req);
        if (!userId) {
          return jsonResponse({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user is owner of the group
        const { data: groupRow, error: groupError } = await supabase
          .from("family_groups")
          .select("owner_id")
          .eq("id", groupId)
          .single();

        if (groupError || !groupRow) {
          return jsonResponse({ error: "Family group not found" }, { status: 404 });
        }

        if (groupRow.owner_id !== userId) {
          return jsonResponse({ error: "Only group owner can update settings" }, { status: 403 });
        }

        // Get the request body
        const body = await req.json();
        const showFamilyData = !!body.show_family_data;

        // Upsert the settings
        const { data: settings, error: settingsError } = await supabase
          .from("family_group_settings")
          .upsert({
            family_group_id: groupId,
            owner_id: userId,
            show_family_data: showFamilyData,
          }, {
            onConflict: "family_group_id"
          })
          .select()
          .single();

        if (settingsError) {
          console.error("Failed to update family group settings:", settingsError);
          return jsonResponse({ error: "Failed to update settings" }, { status: 500 });
        }

        return jsonResponse(settings);
      } catch (error) {
        console.error("Error updating family group settings:", error);
        return jsonResponse({ error: "Failed to update settings" }, { status: 500 });
      }
    }

    if (pathname === "/notifications/vapid-public-key" && req.method === "GET") {
      return jsonResponse({ publicKey: Deno?.env?.get("VAPID_PUBLIC_KEY") || "" });
    }

    if (pathname === "/notifications/subscribe" && req.method === "POST") {
      return jsonResponse({ success: true });
    }

    if (pathname === "/notifications/unsubscribe" && req.method === "POST") {
      return jsonResponse({ success: true });
    }

    if (pathname === "/stripe/config" && req.method === "GET") {
      const premiumPriceId = Deno?.env?.get("STRIPE_PREMIUM_PRICE_ID")
        || Deno?.env?.get("VITE_STRIPE_PREMIUM_PRICE_ID")
        || "";
      const familyPriceId = Deno?.env?.get("STRIPE_FAMILY_PRICE_ID")
        || Deno?.env?.get("VITE_STRIPE_FAMILY_PRICE_ID")
        || "";

      if (!premiumPriceId || !familyPriceId) {
        console.error("Stripe price IDs are not configured in runtime environment.");
        return jsonResponse({ error: "Stripe price IDs are not configured." }, { status: 500 });
      }

      return jsonResponse({ priceIds: { premium: premiumPriceId, family: familyPriceId } });
    }

    if (pathname === "/stripe/create-checkout-session" && req.method === "POST") {
      const userId = extractUserId(req);
      console.log("[Stripe] Create checkout session for user:", userId);
      
      if (!userId) {
        return jsonResponse({ error: "Unauthorized" }, { status: 401 });
      }

      try {
        const body = await req.json();
        const priceId = body.priceId;
        console.log("[Stripe] priceId:", priceId);
        
        if (!priceId) {
          return jsonResponse({ error: "Missing priceId" }, { status: 400 });
        }

        const stripeSecretKey = Deno?.env?.get("STRIPE_SECRET_KEY") ?? "";
        const keyMasked = stripeSecretKey ? `${stripeSecretKey.substring(0, 20)}...${stripeSecretKey.substring(stripeSecretKey.length - 10)}` : "NOT_SET";
        console.log("[Stripe] Secret key configured:", !!stripeSecretKey, "key:", keyMasked);
        if (!stripeSecretKey) {
          console.error("STRIPE_SECRET_KEY not configured");
          return jsonResponse({ error: "Stripe not configured" }, { status: 500 });
        }

        // Get user's Stripe customer ID from user_subscriptions table
        const { data: subData, error: subError } = await supabase
          .from("user_subscriptions")
          .select("stripe_customer_id")
          .eq("user_id", userId)
          .single();

        console.log("[Stripe] Sub query result:", { subError, customerId: subData?.stripe_customer_id });

        let customerId = subData?.stripe_customer_id;

        // If no customer exist, get email and create one
        if (!customerId) {
          console.log("[Stripe] No customer ID, fetching user email...");
          const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);
          
          if (authError || !user?.email) {
            console.error("[Stripe] Auth error or no email:", { authError, email: user?.email });
            return jsonResponse({ error: "Could not retrieve user email" }, { status: 400 });
          }

          console.log("[Stripe] Creating Stripe customer for:", user.email);
          // Create Stripe customer
          const auth = btoa(stripeSecretKey + ':');
          const customerRes = await fetch("https://api.stripe.com/v1/customers", {
            method: "POST",
            headers: {
              "Authorization": `Basic ${auth}`,
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              email: user.email,
            }),
          });

          if (!customerRes.ok) {
            const customerError = await customerRes.text();
            console.error("Failed to create Stripe customer:", customerRes.status, customerError);
            return jsonResponse({ error: `Failed to create Stripe customer: ${customerError}` }, { status: 500 });
          }

          const customerData = await customerRes.json();
          customerId = customerData.id;
          console.log("[Stripe] Created customer:", customerId);

          // Store customer ID in database
          const { error: upsertError } = await supabase
            .from("user_subscriptions")
            .upsert({
              user_id: userId,
              stripe_customer_id: customerId,
            }, { onConflict: "user_id" });
          
          console.log("[Stripe] Upsert customer ID result:", { upsertError });
        }

        console.log("[Stripe] Using customer ID:", customerId);
        // Create checkout session
        const successUrl = Deno?.env?.get("STRIPE_CHECKOUT_SUCCESS_URL") || "https://localhost:5000/pricing?checkout=success";
        const cancelUrl = Deno?.env?.get("STRIPE_CHECKOUT_CANCEL_URL") || "https://localhost:5000/pricing?checkout=cancel";

        console.log("[Stripe] Creating checkout session with:", { customerId, priceId, successUrl, cancelUrl });

        const auth = btoa(stripeSecretKey + ':');
        const checkoutRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            customer: customerId,
            "line_items[0][price]": priceId,
            "line_items[0][quantity]": "1",
            mode: "subscription",
            success_url: successUrl,
            cancel_url: cancelUrl,
          }),
        });

        console.log("[Stripe] Checkout response status:", checkoutRes.status);
        
        if (!checkoutRes.ok) {
          const checkoutError = await checkoutRes.text();
          console.error("Failed to create checkout session:", checkoutRes.status, checkoutError);
          
          // Parse Stripe error response
          let stripleErrorMsg = checkoutError;
          try {
            const errorJson = JSON.parse(checkoutError);
            stripleErrorMsg = errorJson.error?.message || checkoutError;
          } catch {/* ignore */}
          
          return jsonResponse({ error: `Stripe error: ${stripleErrorMsg}` }, { status: 500 });
        }

        const checkoutData = await checkoutRes.json();
        console.log("[Stripe] Session created:", checkoutData.id);
        
        return jsonResponse({
          url: checkoutData.url,
          sessionId: checkoutData.id,
        });
      } catch (err) {
        console.error("Exception creating checkout session:", err);
        return jsonResponse({ error: `Internal error: ${err}` }, { status: 500 });
      }
    }

    if (pathname === "/stripe/subscription-status" && req.method === "GET") {
      return jsonResponse({ status: "free", tier: "free" });
    }

    if (pathname === "/stripe/cancel-subscription" && req.method === "POST") {
      return jsonResponse({ success: true, status: "canceled" });
    }

    if (pathname === "/stripe/reactivate-subscription" && req.method === "POST") {
      return jsonResponse({ success: true, status: "active" });
    }

    if (pathname === "/healthz" && req.method === "GET") {
      return jsonResponse({ status: "ok" });
    }

    if (pathname === "/spending/monthly" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        console.warn("[spending/monthly] No userId found");
        return jsonResponse([]);
      }

      console.log('[spending/monthly] Request URL:', req.url);
      console.log('[spending/monthly] URL object:', url.href);
      console.log('[spending/monthly] Search params:', Array.from(url.searchParams.entries()));

      try {
        // Get all subscriptions
        const { data: subscriptions, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId);

        if (error || !subscriptions) {
          console.error("Error fetching subscriptions for spending monthly:", error);
          return jsonResponse([]);
        }

        console.log(`[spending/monthly] Found ${subscriptions.length} subscriptions for user`);

        // Generate monthly spending for LAST 6 COMPLETE MONTHS + CURRENT MONTH
        const monthlyData = [];
        const offsetMinutes = getRequestOffsetMinutes(url);
        const now = getRequestLocalNow(url);
        const currentDayOfMonth = now.getUTCDate();
        
        console.log(`[spending/monthly] Current date: ${now.toISOString()} (offsetMinutes=${offsetMinutes})`);
        
        // Start from 6 months ago to get 6 complete months + current month (7 total data points)
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        for (let i = 6; i >= 0; i--) {
          const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
          const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 0, 23, 59, 59));
          const monthStr = `${monthNames[monthStart.getUTCMonth()]} ${monthStart.getUTCFullYear()}`;
          const isCurrentMonth = i === 0;
          
          // Calculate spending for this month based on subscriptions that RENEW in that month
          let monthlyAmount = 0;
          let currentMonthIncluded = 0;
          
          for (const sub of subscriptions) {
            if (isSubscriptionDeleted(sub)) {
              if (isCurrentMonth) console.log(`[spending/monthly] Skip ${sub.name}: deleted subscription`);
              continue;
            }
            const normalizedStatus = normalizeSubscriptionStatus(sub.status);
            if (normalizedStatus !== 'active' && normalizedStatus !== 'unused' && normalizedStatus !== 'to-cancel') {
              if (isCurrentMonth) console.log(`[spending/monthly] Skip ${sub.name}: invalid status ${sub.status}`);
              continue;
            }
            
            // Get the renewal date for this subscription
            const renewalDateStr = normalizeSubscriptionDate(sub);
            if (!renewalDateStr) {
              if (isCurrentMonth) console.log(`[spending/monthly] Skip ${sub.name}: no renewal date found`);
              continue;
            }
            
            const renewalDate = toLocalDateTimeInOffset(renewalDateStr, offsetMinutes);
            if (!renewalDate) {
              if (isCurrentMonth) console.log(`[spending/monthly] Skip ${sub.name}: failed to parse renewal date ${renewalDateStr}`);
              continue;
            }
            
            let includeInMonthlySpend = false;
            if (isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, isCurrentMonth, renewalDate)) {
              includeInMonthlySpend = true;
              if (isCurrentMonth) {
                console.log(`[spending/monthly] Include ${sub.name} (${renewalDateStr}): renews today or earlier in current month or already billed month`);
              }
            } else if (isCurrentMonth) {
              console.log(`[spending/monthly] Skip ${sub.name} (${renewalDateStr}): renewal date in future`);
            }
            
            if (includeInMonthlySpend) {
              // Calculate monthly cost
              const frequency = (sub.frequency || 'monthly').toLowerCase();
              const amount = Number(sub.amount) || 0;
              const cost = frequency === 'yearly' ? amount / 12 :
                          frequency === 'quarterly' ? amount / 3 :
                          frequency === 'weekly' ? amount * 4 : amount;
              
              const convertedCost = convertToUSD(cost, sub.currency);
              monthlyAmount += convertedCost;
              if (isCurrentMonth) {
                console.log(`[spending/monthly] ${sub.name}: ${amount} ${sub.currency} (${frequency}) = $${convertedCost.toFixed(2)}`);
                currentMonthIncluded++;
              }
            }
          }
          
          if (isCurrentMonth) {
            console.log(`[spending/monthly] Current month: ${currentMonthIncluded} subscriptions included, total = $${monthlyAmount.toFixed(2)}`);
          }
          
          monthlyData.push({
            month: monthStr,
            amount: Math.round(monthlyAmount * 100) / 100,
            isCurrentMonth: isCurrentMonth
          });
        }

        console.log(`[spending/monthly] Returning ${monthlyData.length} months of data`);
        return jsonResponse(monthlyData);
      } catch (err) {
        console.error("Exception generating spending monthly data:", err);
        return jsonResponse([]);

      }
    }

    if (pathname === "/insights/behavioral" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse([]);
      }

      const query = new URL(req.url).searchParams;
      const wantFamily = String(query.get("family")).toLowerCase() === "true";

      try {
        let subscriptions: any[] = [];

        if (wantFamily) {
          const { data: ownerGroups, error: ownerGroupsError } = await supabase
            .from("family_groups")
            .select("id")
            .eq("owner_id", userId);
          if (ownerGroupsError) {
            throw ownerGroupsError;
          }

          const { data: memberGroups, error: memberGroupsError } = await supabase
            .from("family_group_members")
            .select("family_group_id")
            .eq("user_id", userId);
          if (memberGroupsError) {
            throw memberGroupsError;
          }

          const groupIds = Array.from(
            new Set([
              ...(ownerGroups || []).map((g: any) => g.id),
              ...(memberGroups || []).map((m: any) => m.family_group_id),
            ])
          ).filter(Boolean);

          if (groupIds.length > 0) {
            const { data: groupMembers, error: groupMembersError } = await supabase
              .from("family_group_members")
              .select("family_group_id,user_id")
              .in("family_group_id", groupIds);
            if (groupMembersError) {
              throw groupMembersError;
            }

            const allMemberIds = Array.from(new Set([
              userId,
              ...(groupMembers || []).map((m: any) => m.user_id),
            ]));

            const { data: allSubscriptions, error: allSubscriptionsError } = await supabase
              .from("subscriptions")
              .select("*")
              .in("user_id", allMemberIds);
            if (allSubscriptionsError) {
              throw allSubscriptionsError;
            }

            const { data: sharedRecords, error: sharedRecordsError } = await supabase
              .from("shared_subscriptions")
              .select("family_group_id,subscription_id,shared_with_user_id")
              .in("family_group_id", groupIds);
            if (sharedRecordsError) {
              throw sharedRecordsError;
            }

            const ownedGroupIdSet = new Set<string>((ownerGroups || []).map((g: any) => g.id));
            const groupMemberIdsByGroup: Record<string, Set<string>> = {};
            for (const member of (groupMembers || [])) {
              if (!member.family_group_id || !member.user_id) continue;
              groupMemberIdsByGroup[member.family_group_id] ??= new Set();
              groupMemberIdsByGroup[member.family_group_id].add(member.user_id);
            }
            for (const ownerGroup of (ownerGroups || [])) {
              if (!ownerGroup?.id) continue;
              groupMemberIdsByGroup[ownerGroup.id] ??= new Set();
              groupMemberIdsByGroup[ownerGroup.id].add(userId);
            }

            const visibleSubscriptionIds = new Set<string>();
            for (const subscription of (allSubscriptions || [])) {
              if (subscription.user_id === userId) {
                visibleSubscriptionIds.add(subscription.id);
              }
            }

            for (const sharedRecord of (sharedRecords || [])) {
              if (!sharedRecord?.subscription_id) continue;
              if (sharedRecord.shared_with_user_id === null || sharedRecord.shared_with_user_id === userId) {
                visibleSubscriptionIds.add(sharedRecord.subscription_id);
              }
            }

            if (ownedGroupIdSet.size > 0) {
              for (const ownedGroupId of Array.from(ownedGroupIdSet)) {
                const memberIdsForGroup = groupMemberIdsByGroup[ownedGroupId as string];
                if (!memberIdsForGroup) continue;
                for (const subscription of (allSubscriptions || [])) {
                  if (memberIdsForGroup.has(subscription.user_id)) {
                    visibleSubscriptionIds.add(subscription.id);
                  }
                }
              }
            }

            subscriptions = (allSubscriptions || []).filter((sub: any) => visibleSubscriptionIds.has(sub.id));
          }
        }

        if (!wantFamily || subscriptions.length === 0) {
          const { data: personalSubscriptions, error: personalSubscriptionsError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", userId);
          if (personalSubscriptionsError) {
            throw personalSubscriptionsError;
          }
          subscriptions = personalSubscriptions || [];
        }

        const behavioralInsights = (subscriptions || [])
          .filter((sub: any) => sub.status === 'unused' || sub.status === 'to-cancel')
          .map((sub: any) => {
            const monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : 
                                sub.frequency === 'quarterly' ? sub.amount / 3 : 
                                sub.frequency === 'weekly' ? sub.amount * 4 : sub.amount;

            // Calculate opportunity costs
            const currency = (sub.currency || 'USD').toUpperCase();
            const exchangeRates: Record<string, number> = {
              USD: 1,
              EUR: 0.92,
              GBP: 0.79,
              CAD: 1.35,
              AUD: 1.52,
              JPY: 152.0,
              CHF: 0.88,
              SEK: 10.85,
              NOK: 10.75,
              DKK: 6.95,
              PLN: 4.05,
              CZK: 23.5,
              HUF: 365.0,
              BRL: 5.25,
              MXN: 18.5,
              ARS: 950.0,
              TRY: 34.0,
              ZAR: 18.5,
              INR: 84.0,
              CNY: 7.25,
              KRW: 1350.0,
              SGD: 1.35,
              HKD: 7.8,
              NZD: 1.65,
            };
            const rate = exchangeRates[currency] ?? 1;
            const baseItems = [
              { item: "coffee drinks", unitCostUsd: 4.5, icon: "coffee" },
              { item: "breakfast sandwiches", unitCostUsd: 6.5, icon: "shopping" },
              { item: "lunch meals", unitCostUsd: 13, icon: "utensils" },
              { item: "movie tickets", unitCostUsd: 14.5, icon: "film" },
              { item: "Spotify months", unitCostUsd: 10.99, icon: "music" },
              { item: "Netflix months", unitCostUsd: 15.49, icon: "tv" },
              { item: "gym day passes", unitCostUsd: 20, icon: "dumbbell" },
              { item: "gas tank fills", unitCostUsd: 55, icon: "fuel" },
              { item: "meal kit deliveries", unitCostUsd: 60, icon: "shopping" },
              { item: "one-way flights", unitCostUsd: 150, icon: "plane" },
            ];
            const equivalents = baseItems
              .map(({ item, unitCostUsd, icon }) => ({
                item,
                count: Math.floor(monthlyAmount / (unitCostUsd * rate)),
                icon,
              }))
              .filter(eq => eq.count > 0)
              .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item))
              .slice(0, 3);

            return {
              subscriptionId: sub.id,
              subscriptionName: sub.name || 'Unknown Subscription',
              userId: sub.user_id,
              monthlyAmount,
              equivalents,
              subStatus: sub.status,
              status: sub.status,
              currency: sub.currency || 'USD'
            };
          });

        return jsonResponse(behavioralInsights);
      } catch (err) {
        console.error("Exception generating behavioral insights:", err);
        return jsonResponse([]);
      }
    }

    if (pathname === "/analysis/cost-per-use" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse([]);
      }

      const query = new URL(req.url).searchParams;
      const familyGroupId = query.get("familyGroupId");
      
      let subscriptions: any[] = [];
      
      if (familyGroupId) {
        // Family mode: get family data
        const { data: groupRow, error: groupError } = await supabase
          .from("family_groups")
          .select("owner_id")
          .eq("id", familyGroupId)
          .single();

        if (groupError || !groupRow) {
          return jsonResponse({ error: "Family group not found" }, { status: 404 });
        }

        // Check if user is owner or member
        const isOwner = groupRow.owner_id === userId;
        let isMember = false;
        if (!isOwner) {
          const { data: membership, error: membershipError } = await supabase
            .from("family_group_members")
            .select("id")
            .eq("family_group_id", familyGroupId)
            .eq("user_id", userId)
            .single();
          if (membershipError && membershipError.code !== 'PGRST116') {
            console.error("Error checking membership:", membershipError);
            return jsonResponse({ error: "Failed to verify membership" }, { status: 500 });
          }
          isMember = !!membership;
        }

        if (!isOwner && !isMember) {
          return jsonResponse({ error: "Not authorized to view family cost analysis" }, { status: 403 });
        }

        const { data: settingsData, error: settingsError } = await supabase
          .from("family_group_settings")
          .select("show_family_data")
          .eq("family_group_id", familyGroupId)
          .single();

        if (settingsError && settingsError.code !== 'PGRST116') {
          console.error("Error fetching family group settings:", settingsError);
          return jsonResponse({ error: "Failed to load family settings" }, { status: 500 });
        }

        const showFamilyData = settingsData?.show_family_data !== undefined ? settingsData.show_family_data : true;
        if (!showFamilyData) {
          return jsonResponse({ error: 'Family sharing not enabled for this group' }, { status: 403 });
        }

        if (isOwner) {
          const { data: members, error: membersError } = await supabase
            .from("family_group_members")
            .select("user_id")
            .eq("family_group_id", familyGroupId);

          if (membersError) {
            console.error("Error fetching family members:", membersError);
            return jsonResponse({ error: "Failed to verify family members" }, { status: 500 });
          }

          const memberIds = Array.from(new Set([groupRow.owner_id, ...(members || []).map((m: any) => m.user_id)]));
          const { data: familySubs, error: subsError } = await supabase
            .from("subscriptions")
            .select("*")
            .in("user_id", memberIds)
            .neq("status", "deleted");

          if (subsError) {
            console.error("Error fetching family subscriptions:", subsError);
            return jsonResponse([]);
          }

          subscriptions = familySubs || [];
        } else {
          const { data: personalSubs, error: personalError } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", userId)
            .neq("status", "deleted");

          if (personalError) {
            console.error("Error fetching personal subscriptions:", personalError);
            return jsonResponse([]);
          }

          const { data: sharedRecords, error: sharedError } = await supabase
            .from("shared_subscriptions")
            .select("subscription_id")
            .eq("family_group_id", familyGroupId)
            .eq("shared_with_user_id", userId);

          if (sharedError) {
            console.error("Error fetching shared subscriptions:", sharedError);
            return jsonResponse([]);
          }

          const sharedSubscriptionIds = (sharedRecords || []).map((record: any) => record.subscription_id).filter(Boolean);
          let sharedSubscriptions: any[] = [];
          if (sharedSubscriptionIds.length > 0) {
            const { data: sharedSubs, error: sharedSubsError } = await supabase
              .from("subscriptions")
              .select("*")
              .in("id", sharedSubscriptionIds)
              .neq("status", "deleted");
            if (sharedSubsError) {
              console.error("Error fetching shared subscription details:", sharedSubsError);
              return jsonResponse([]);
            }
            sharedSubscriptions = sharedSubs || [];
          }

          const combined = new Map<string, any>();
          (personalSubs || []).forEach((sub: any) => combined.set(sub.id, sub));
          sharedSubscriptions.forEach((sub: any) => combined.set(sub.id, sub));
          subscriptions = Array.from(combined.values());
        }
      } else {
        // Personal mode: get user's subscriptions
        const { subscriptions: userSubs } = await loadSubscriptions(userId);
        subscriptions = userSubs;
      }

      const analysis = buildCostPerUseAnalysis(subscriptions)
        .sort((a, b) => (b.costPerUse || 0) - (a.costPerUse || 0))
        .slice(0, 12);

      return jsonResponse(analysis);
    }

    // Monthly savings from deleted subscriptions
    if (pathname === "/analytics/monthly-savings" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({
          monthlySavings: 0,
        });
      }

      const query = new URL(req.url).searchParams;
      const familyMode = query.get("family") === "true";

      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

      const normalizeStatus = (status: any) => String(status || '').trim().toLowerCase();
      const isInCurrentMonth = (timestamp: string | undefined | null) => {
        if (!timestamp) return false;
        const parsed = new Date(timestamp);
        if (Number.isNaN(parsed.getTime())) return false;
        return parsed >= monthStart && parsed < monthEnd;
      };

      let subscriptions: any[] = [];
      if (familyMode) {
        const { data: ownedGroups, error: ownedGroupsError } = await supabase
          .from("family_groups")
          .select("id")
          .eq("owner_id", userId);

        const { data: memberGroups, error: memberGroupsError } = await supabase
          .from("family_group_members")
          .select("family_group_id")
          .eq("user_id", userId);

        if (ownedGroupsError || memberGroupsError) {
          console.error("Error fetching family groups for monthly savings:", ownedGroupsError || memberGroupsError);
          return jsonResponse({ monthlySavings: 0 });
        }

        const groupIds = Array.from(new Set([
          ...(ownedGroups || []).map((g: any) => g.id),
          ...(memberGroups || []).map((m: any) => m.family_group_id),
        ])).filter(Boolean);

        if (groupIds.length > 0) {
          const { data: members, error: membersError } = await supabase
            .from("family_group_members")
            .select("user_id")
            .in("family_group_id", groupIds);

          const { data: groupsWithOwners, error: groupsWithOwnersError } = await supabase
            .from("family_groups")
            .select("owner_id")
            .in("id", groupIds);

          if (membersError || groupsWithOwnersError) {
            console.error("Error fetching family members for monthly savings:", membersError || groupsWithOwnersError);
            return jsonResponse({ monthlySavings: 0 });
          }

          const memberIds = Array.from(new Set([
            userId,
            ...(members || []).map((m: any) => m.user_id),
            ...(groupsWithOwners || []).map((g: any) => g.owner_id),
          ])).filter(Boolean);

          const { data: subs, error } = await supabase
            .from("subscriptions")
            .select("amount, currency, frequency, deleted_at, updated_at, status, user_id")
            .in("user_id", memberIds);

          if (error) {
            console.error("Error fetching family monthly savings subscriptions:", error);
            return jsonResponse({ monthlySavings: 0 });
          }

          subscriptions = subs || [];
        } else {
          const { data: subs, error } = await supabase
            .from("subscriptions")
            .select("amount, currency, frequency, deleted_at, updated_at, status, user_id")
            .eq("user_id", userId);

          if (error) {
            console.error("Error fetching monthly savings subscriptions:", error);
            return jsonResponse({ monthlySavings: 0 });
          }

          subscriptions = subs || [];
        }
      } else {
        const { data: subs, error } = await supabase
          .from("subscriptions")
          .select("amount, currency, frequency, deleted_at, updated_at, status, user_id")
          .eq("user_id", userId);

        if (error) {
          console.error("Error fetching monthly savings subscriptions:", error);
          return jsonResponse({ monthlySavings: 0 });
        }

        subscriptions = subs || [];
      }

      const savingsByUser: Record<string, number> = {};
      let totalMonthlySavings = 0;

      for (const sub of subscriptions) {
        if (normalizeStatus(sub.status) !== "deleted") continue;
        if (!isInCurrentMonth(sub.deleted_at || sub.updated_at)) continue;

        const monthlyAmount = convertToUSD(
          calculateMonthlyCost(Number(sub.amount) || 0, sub.frequency),
          sub.currency,
        );
        const subUserId = sub.user_id || userId;
        savingsByUser[subUserId] = (savingsByUser[subUserId] || 0) + monthlyAmount;
        totalMonthlySavings += monthlyAmount;
      }

      const ownerMonthlySavings = Math.round((savingsByUser[userId] || 0) * 100) / 100;
      const memberMonthlySavings = Math.round((totalMonthlySavings - (savingsByUser[userId] || 0)) * 100) / 100;
      const monthlySavings = Math.round(totalMonthlySavings * 100) / 100;

      return jsonResponse({
        monthlySavings,
        ownerMonthlySavings,
        memberMonthlySavings,
      });
    }

    if (pathname === "/calendar-events" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse([]);
      }

      const { subscriptions } = await loadSubscriptions(userId);
      return jsonResponse(buildCalendarEvents(subscriptions));
    }

    if (pathname === "/health-score" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse(buildHealthScore([]));
      }

      const { subscriptions } = await loadSubscriptions(userId);
      return jsonResponse(buildHealthScore(subscriptions));
    }

    if (pathname === "/user/currency" && req.method === "GET") {
      return jsonResponse({ currency: "USD", symbol: "$" });
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/family-data$/) && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse({ error: "Login required" }, { status: 401 });
      }

      const groupId = pathname.split('/')[2];
      if (!groupId) {
        return jsonResponse({ error: "Invalid group ID" }, { status: 400 });
      }

      const { data: groupRow, error: groupRowError } = await supabase
        .from("family_groups")
        .select("id, name, owner_id")
        .eq("id", groupId)
        .single();

      if (groupRowError || !groupRow) {
        return jsonResponse({ error: "Family group not found" }, { status: 404 });
      }

      const { data: membership, error: membershipError } = await supabase
        .from("family_group_members")
        .select("user_id, role, joined_at, email")
        .eq("family_group_id", groupId)
        .eq("user_id", userId)
        .single();

      if (membershipError && membershipError.code !== 'PGRST116') {
        console.error("Error checking membership:", membershipError);
        return jsonResponse({ error: "Failed to verify membership" }, { status: 500 });
      }

      const isOwner = groupRow.owner_id === userId;
      if (!isOwner && !membership) {
        return jsonResponse({ error: "Not authorized to view family data" }, { status: 403 });
      }

      const { data: members, error: membersError } = await supabase
        .from("family_group_members")
        .select("user_id, role, joined_at, email")
        .eq("family_group_id", groupId);

      if (membersError) {
        console.error("Error fetching family members:", membersError);
        return jsonResponse({ error: "Failed to load family data" }, { status: 500 });
      }

      const { data: settingsData, error: settingsError } = await supabase
        .from("family_group_settings")
        .select("show_family_data")
        .eq("family_group_id", groupId)
        .single();

      if (settingsError && settingsError.code !== 'PGRST116') {
        console.error("Error fetching family group settings:", settingsError);
        return jsonResponse({ error: "Failed to load family settings" }, { status: 500 });
      }

      const showFamilyData = settingsData?.show_family_data !== undefined ? settingsData.show_family_data : true;
      const isMember = !!membership;

      const ownerId = String(groupRow.owner_id);
      const memberIds = Array.from(new Set([ownerId, ...(members || []).map((m: any) => String(m.user_id))]));

      if (!showFamilyData) {
        const { data: personalSubscriptions, error: personalSubsError } = await supabase
          .from("subscriptions")
          .select("id, user_id, name, category, amount, currency, frequency, next_billing_at, status, usage_count, last_used_at, logo_url, description, is_detected, scheduled_cancellation_date, cancellation_url, deleted_at")
          .eq("user_id", userId);

        if (personalSubsError) {
          console.error("Error fetching personal subscriptions:", personalSubsError);
          return jsonResponse({ error: "Failed to load personal subscriptions" }, { status: 500 });
        }

        const allSubs = personalSubscriptions || [];
        const deletedSubscriptions = allSubs.filter((sub: any) => isSubscriptionDeleted(sub));
        const visibleSubscriptions = allSubs.filter((sub: any) => !isSubscriptionDeleted(sub));

        const recommendations: any[] = [];
        const unusedSubs = visibleSubscriptions.filter((sub: any) => sub.status === 'unused');
        for (const sub of unusedSubs) {
          recommendations.push({
            id: `rec-${sub.id}-unused`,
            type: 'cancel',
            title: `Cancel ${sub.name}`,
            description: `You've barely used ${sub.name} this month. Consider cancelling to save money.`,
            currentCost: sub.amount || 0,
            suggestedCost: 0,
            savings: sub.amount || 0,
            subscriptionId: sub.id,
            confidence: 0.92,
            currency: sub.currency || 'USD',
          });
        }

        const toCancelSubs = visibleSubscriptions.filter((sub: any) => sub.status === 'to-cancel');
        for (const sub of toCancelSubs) {
          recommendations.push({
            id: `rec-${sub.id}-tocancel`,
            type: 'cancel',
            title: `Complete cancellation of ${sub.name}`,
            description: `${sub.name} is marked for cancellation. Finalize the cancellation to stop future charges.`,
            currentCost: sub.amount || 0,
            suggestedCost: 0,
            savings: sub.amount || 0,
            subscriptionId: sub.id,
            confidence: 0.95,
            currency: sub.currency || 'USD',
          });
        }

        const today = new Date();
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const thisMonthSavings = deletedSubscriptions
          .filter((s: any) => s.deleted_at && new Date(s.deleted_at) >= monthStart && new Date(s.deleted_at) <= today)
          .reduce((sum: number, s: any) => {
            const monthlyAmount = calculateMonthlyCost(Number(s.amount) || 0, s.frequency);
            return sum + convertToUSD(monthlyAmount, s.currency);
          }, 0);

        const now = getRequestLocalNow(url);
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const spending = [];

        for (let i = 6; i >= 0; i--) {
          const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
          const monthStr = `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`;
          const isCurrentMonth = i === 0;

          let monthlyAmount = 0;
          for (const sub of visibleSubscriptions) {
            const status = normalizeSubscriptionStatus(sub.status);
            if (status !== 'active' && status !== 'unused' && status !== 'to-cancel') continue;
            if (isSubscriptionDeleted(sub)) continue;

            const renewalDateStr = normalizeSubscriptionDate(sub);
            if (!renewalDateStr) continue;

            const renewalDate = toDateOnlyLocal(renewalDateStr);
            if (!renewalDate) continue;

            if (isCurrentMonth) {
              if (!isSubscriptionBilledInCurrentMonth(sub, now, renewalDate)) continue;
            } else if (!isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, isCurrentMonth, renewalDate)) {
              continue;
            }

            const monthlyAmountCost = calculateMonthlyCost(Number(sub.amount) || 0, sub.frequency);
            monthlyAmount += convertToUSD(monthlyAmountCost, sub.currency);
          }

          spending.push({
            month: monthStr,
            amount: Math.round(monthlyAmount * 100) / 100,
            isCurrentMonth,
          });
        }

        const categoryMap = new Map<string, { amount: number; count: number }>();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

        for (const sub of visibleSubscriptions) {
          const normalizedStatus = normalizeSubscriptionStatus(sub.status);
          if (normalizedStatus !== 'active' && normalizedStatus !== 'unused' && normalizedStatus !== 'to-cancel') continue;
          if (isSubscriptionDeleted(sub)) continue;

          const renewalDateStr = normalizeSubscriptionDate(sub);
          if (!renewalDateStr) continue;

          const renewalDate = toDateOnlyLocal(renewalDateStr);
          if (!renewalDate) continue;

          if (!isSubscriptionBilledInCurrentMonth(sub, now, renewalDate)) continue;

          const monthlyAmount = calculateMonthlyCost(Number(sub.amount) || 0, sub.frequency);
          const amountUsd = convertToUSD(monthlyAmount, sub.currency);
          const existing = categoryMap.get(sub.category) || { amount: 0, count: 0 };
          categoryMap.set(sub.category, {
            amount: existing.amount + amountUsd,
            count: existing.count + 1,
          });
        }

        const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          amount: Math.round(data.amount * 100) / 100,
          percentage: 0,
          count: data.count,
        }));

        const currentMonthSpending = spending.find((entry) => entry.isCurrentMonth)?.amount || 0;
        const totalMonthlySpending = Math.round(currentMonthSpending * 100) / 100;

        const totalAmount = byCategory.reduce((sum, entry) => sum + entry.amount, 0);
        const byCategoryWithPercentages = byCategory.map((entry) => ({
          ...entry,
          percentage: totalAmount > 0 ? Math.round((entry.amount / totalAmount) * 100) : 0,
        }));

        return jsonResponse({
          subscriptions: visibleSubscriptions,
          sharedSubscriptions: [],
          members: members || [],
          isOwner,
          isMember,
          groupOwnerId: groupRow.owner_id,
          recommendations,
          behavioralInsights: [],
          metrics: {
            totalSubscriptions: visibleSubscriptions.length,
            activeSubscriptions: visibleSubscriptions.filter((sub: any) => sub.status === 'active').length,
            totalMonthlySpending: totalMonthlySpending,
            memberCount: memberIds.length,
            thisMonthSavings: thisMonthSavings,
          },
          spending,
          byCategory: byCategoryWithPercentages,
          familyDataSharingEnabled: false,
        });
      }

      const { data: allSubscriptions, error: subsError } = await supabase
        .from("subscriptions")
        .select("id, user_id, name, category, amount, currency, frequency, next_billing_at, status, usage_count, last_used_at, logo_url, description, is_detected, scheduled_cancellation_date, cancellation_url, deleted_at")
        .in("user_id", memberIds);

      if (subsError) {
        console.error("Error fetching family subscriptions:", subsError);
        return jsonResponse({ error: "Failed to load family subscriptions" }, { status: 500 });
      }

      const { data: sharedRecords, error: sharedError } = await supabase
        .from('shared_subscriptions')
        .select('id,family_group_id,subscription_id,shared_by_user_id,shared_with_user_id,shared_at')
        .eq('family_group_id', groupId);

      if (sharedError) {
        console.error('Error fetching shared subscription records:', sharedError);
        return jsonResponse({ error: 'Failed to load shared subscriptions' }, { status: 500 });
      }

      // Filter shared records based on user permissions
      let filteredSharedRecords = sharedRecords || [];
      if (!isOwner) {
        // Members only see subscriptions explicitly shared with them.
        filteredSharedRecords = filteredSharedRecords.filter(record => record.shared_with_user_id === userId);
      }
      // Owners see all shared subscriptions in their group

      const allSubs = allSubscriptions || [];
      const sharedSubscriptionIds = filteredSharedRecords
        .map((shared: any) => shared.subscription_id)
        .filter((id: any) => id !== null && id !== undefined)
        .map((id: any) => String(id));

      const deletedSubscriptions = allSubs.filter((sub: any) => isSubscriptionDeleted(sub));
      const visibleSubscriptions = allSubs.filter((sub: any) => {
        if (isSubscriptionDeleted(sub)) return false;
        if (isOwner) return true;
        const subOwnerId = String(sub.user_id);
        const subId = String(sub.id);
        return subOwnerId === String(userId) || sharedSubscriptionIds.includes(subId);
      });

      const recommendations: any[] = [];
      const unusedSubs = visibleSubscriptions.filter((sub: any) => sub.status === 'unused');
      for (const sub of unusedSubs) {
        recommendations.push({
          id: `rec-${sub.id}-unused`,
          type: 'cancel',
          title: `Cancel ${sub.name}`,
          description: `You've barely used ${sub.name} this month. Consider cancelling to save money.`,
          currentCost: sub.amount || 0,
          suggestedCost: 0,
          savings: sub.amount || 0,
          subscriptionId: sub.id,
          confidence: 0.92,
          currency: sub.currency || 'USD',
        });
      }

      const toCancelSubs = visibleSubscriptions.filter((sub: any) => sub.status === 'to-cancel');
      for (const sub of toCancelSubs) {
        recommendations.push({
          id: `rec-${sub.id}-tocancel`,
          type: 'cancel',
          title: `Complete cancellation of ${sub.name}`,
          description: `${sub.name} is marked for cancellation. Finalize the cancellation to stop future charges.`,
          currentCost: sub.amount || 0,
          suggestedCost: 0,
          savings: sub.amount || 0,
          subscriptionId: sub.id,
          confidence: 0.95,
          currency: sub.currency || 'USD',
        });
      }

      const today = new Date();
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const thisMonthSavings = deletedSubscriptions
        .filter((s: any) => s.deleted_at && new Date(s.deleted_at) >= monthStart && new Date(s.deleted_at) <= today)
        .reduce((sum: number, s: any) => {
          const monthlyAmount = calculateMonthlyCost(Number(s.amount) || 0, s.frequency);
          return sum + convertToUSD(monthlyAmount, s.currency);
        }, 0);

      const now = getRequestLocalNow(url);
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const spending = [];

      for (let i = 6; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);
        const monthStr = `${monthNames[monthStart.getMonth()]} ${monthStart.getFullYear()}`;
        const isCurrentMonth = i === 0;

        let monthlyAmount = 0;
        for (const sub of visibleSubscriptions) {
          const status = normalizeSubscriptionStatus(sub.status);
          if (status !== 'active' && status !== 'unused' && status !== 'to-cancel') continue;
          if (isSubscriptionDeleted(sub)) continue;

          const renewalDateStr = normalizeSubscriptionDate(sub);
          if (!renewalDateStr) continue;

          const renewalDate = toDateOnlyLocal(renewalDateStr);
          if (!renewalDate) continue;

          if (isCurrentMonth) {
            if (!isSubscriptionBilledInCurrentMonth(sub, now, renewalDate)) continue;
          } else if (!isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, isCurrentMonth, renewalDate)) {
            continue;
          }

          const monthlyAmountCost = calculateMonthlyCost(Number(sub.amount) || 0, sub.frequency);
          monthlyAmount += convertToUSD(monthlyAmountCost, sub.currency);
        }

        spending.push({
          month: monthStr,
          amount: Math.round(monthlyAmount * 100) / 100,
          isCurrentMonth,
        });
      }

      const categoryMap = new Map<string, { amount: number; count: number }>();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      for (const sub of visibleSubscriptions) {
        const normalizedStatus = normalizeSubscriptionStatus(sub.status);
        if (normalizedStatus !== 'active' && normalizedStatus !== 'unused' && normalizedStatus !== 'to-cancel') continue;
        if (isSubscriptionDeleted(sub)) continue;

        const renewalDateStr = normalizeSubscriptionDate(sub);
        if (!renewalDateStr) continue;

        const renewalDate = toDateOnlyLocal(renewalDateStr);
        if (!renewalDate) continue;

        if (!isSubscriptionBilledInCurrentMonth(sub, now, renewalDate)) continue;

        const monthlyAmount = calculateMonthlyCost(Number(sub.amount) || 0, sub.frequency);
        const amountUsd = convertToUSD(monthlyAmount, sub.currency);
        const existing = categoryMap.get(sub.category) || { amount: 0, count: 0 };
        categoryMap.set(sub.category, {
          amount: existing.amount + amountUsd,
          count: existing.count + 1,
        });
      }

      const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: Math.round(data.amount * 100) / 100,
        percentage: 0,
        count: data.count,
      }));

      const currentMonthSpending = spending.find((entry) => entry.isCurrentMonth)?.amount || 0;
      const totalMonthlySpending = Math.round(currentMonthSpending * 100) / 100;

      const totalAmount = byCategory.reduce((sum, entry) => sum + entry.amount, 0);
      const byCategoryWithPercentages = byCategory.map((entry) => ({
        ...entry,
        percentage: totalAmount > 0 ? Math.round((entry.amount / totalAmount) * 100) : 0,
      }));

      return jsonResponse({
        subscriptions: visibleSubscriptions,
        sharedSubscriptions: filteredSharedRecords,
        members: members || [],
        isOwner,
        isMember: true,
        groupOwnerId: groupRow.owner_id,
        recommendations,
        behavioralInsights: [],
        metrics: {
          totalSubscriptions: visibleSubscriptions.length,
          activeSubscriptions: visibleSubscriptions.filter((sub: any) => sub.status === 'active').length,
          totalMonthlySpending: totalMonthlySpending,
          memberCount: memberIds.length,
          thisMonthSavings: thisMonthSavings,
        },
        spending,
        byCategory: byCategoryWithPercentages,
      });
    }

    if (pathname.match(/^\/family-groups\/[^/]+\/settings$/) && req.method === "GET") {
      const match = pathname.match(/^\/family-groups\/([^/]+)\/settings$/);
      const groupId = match?.[1];

      if (!groupId) {
        return jsonResponse({ error: "Invalid group ID" }, { status: 400 });
      }

      try {
        const userId = extractUserId(req);
        if (!userId) {
          return jsonResponse({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify user is owner or member of the group
        const { data: groupRow, error: groupError } = await supabase
          .from("family_groups")
          .select("owner_id")
          .eq("id", groupId)
          .single();

        if (groupError || !groupRow) {
          return jsonResponse({ error: "Family group not found" }, { status: 404 });
        }

        if (groupRow.owner_id !== userId) {
          const { data: membership, error: memberError } = await supabase
            .from("family_group_members")
            .select("id")
            .eq("family_group_id", groupId)
            .eq("user_id", userId)
            .single();

          if (memberError || !membership) {
            return jsonResponse({ error: "Not authorized to view family group settings" }, { status: 403 });
          }
        }

        // Fetch the settings
        const { data: settings, error: settingsError } = await supabase
          .from("family_group_settings")
          .select("*")
          .eq("family_group_id", groupId)
          .single();

        if (settingsError) {
          console.warn("Failed to fetch family group settings:", settingsError);
          // Return default if settings don't exist
          return jsonResponse({ show_family_data: false, family_group_id: groupId });
        }

        return jsonResponse(settings);
      } catch (error) {
        console.error("Error fetching family group settings:", error);
        return jsonResponse({ error: "Failed to fetch settings" }, { status: 500 });
      }
    }

    if (pathname === "/family-groups" && req.method === "GET") {
      return jsonResponse([]);
    }

    if (pathname === "/spending/category" && req.method === "GET") {
      const userId = extractUserId(req);
      if (!userId) {
        return jsonResponse([]);
      }

      try {
        // Get all subscriptions so we can filter deleted/canceled rows consistently
        const { data: subscriptions, error } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", userId);

        if (error || !subscriptions) {
          console.error("Error fetching subscriptions for spending category:", error);
          return jsonResponse([]);
        }

        // Get current month boundaries using the user's local offset
        const offsetMinutes = getRequestOffsetMinutes(url);
        const now = getRequestLocalNow(url);
        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
        const currentDayOfMonth = now.getUTCDate();

        // Group by category and calculate totals, only for subscriptions in current month
        const categoryMap = new Map();
        
        (subscriptions || []).forEach((sub: any) => {
          if (isSubscriptionDeleted(sub)) return;
          const normalizedStatus = normalizeSubscriptionStatus(sub.status);
          if (normalizedStatus !== 'active' && normalizedStatus !== 'unused' && normalizedStatus !== 'to-cancel') return;

          // Only include subscriptions that renew today or earlier in the current month
          let includeInSpending = false;
          const renewalDateStr = normalizeSubscriptionDate(sub);
          if (renewalDateStr) {
            const renewalDate = toLocalDateTimeInOffset(renewalDateStr, offsetMinutes);
            if (renewalDate && isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true, renewalDate)) {
              includeInSpending = true;
            }
          }
          
          if (includeInSpending) {
            const frequency = (sub.frequency || 'monthly').toLowerCase();
            const amount = Number(sub.amount) || 0;
            const usdAmount = convertToUSD(amount, sub.currency);
            const monthlyAmount = frequency === 'yearly' ? usdAmount / 12 :
                                frequency === 'quarterly' ? usdAmount / 3 :
                                frequency === 'weekly' ? usdAmount * 4 : usdAmount;
            
            const existing = categoryMap.get(sub.category) || { amount: 0, count: 0 };
            categoryMap.set(sub.category, {
              amount: existing.amount + monthlyAmount,
              count: existing.count + 1
            });
          }
        });

        const total = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);
        const categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
          category,
          amount: Math.round(data.amount * 100) / 100,
          percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
          count: data.count
        }));

        return jsonResponse(categories);
      } catch (err) {
        console.error("Exception generating spending category data:", err);
        return jsonResponse([]);
      }
    }

    if (pathname === "/family-groups/me/membership" && req.method === "GET") {
      return jsonResponse(null);
    }

    // Contact form endpoint
    if (pathname === "/contact" && req.method === "POST") {
      try {
        const body = await req.json();
        const { name, email, subject, message } = body;

        // Basic validation
        if (!name || !email || !message) {
          return jsonResponse(
            {
              error: "Missing required fields",
              message: "Name, email, and message are required."
            },
            { status: 400 }
          );
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return jsonResponse(
            {
              error: "Invalid email",
              message: "Please provide a valid email address."
            },
            { status: 400 }
          );
        }

        // Log the contact request
        console.log("[Contact] New contact form submission:", {
          name,
          email,
          subject: subject || "No subject",
          message,
          timestamp: new Date().toISOString(),
        });

        const RESEND_API_KEY = Deno?.env?.get("RESEND_API_KEY")?.trim();
        const SENDGRID_API_KEY = Deno?.env?.get("SENDGRID_API_KEY")?.trim();
        let emailSent = false;
        let emailErrorMessage: string | null = null;

        const emailPayload = {
          subject: `Support Request from ${name}: ${subject || "General Inquiry"}`,
          html: `
            <h2>New Support Request</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject || "No subject"}</p>
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, "<br>")}</p>
          `,
        };

        if (RESEND_API_KEY) {
          try {
            const emailResponse = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${RESEND_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: "noreply@subveris.com",
                to: "help.subveris@gmail.com",
                ...emailPayload,
              }),
            });

            if (emailResponse.ok) {
              emailSent = true;
              console.log("[Contact] Email sent successfully via Resend");
            } else {
              emailErrorMessage = await emailResponse.text();
              console.error("[Contact] Failed to send email via Resend:", emailErrorMessage);
            }
          } catch (emailError) {
            emailErrorMessage = emailError instanceof Error ? emailError.message : String(emailError);
            console.error("[Contact] Error sending email via Resend:", emailError);
          }
        } else {
          console.log("[Contact] RESEND_API_KEY not configured, trying SendGrid if available");
        }

        if (!emailSent && SENDGRID_API_KEY) {
          try {
            const emailResponse = await fetch("https://api.sendgrid.com/v3/mail/send", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${SENDGRID_API_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                personalizations: [{
                  to: [{ email: "help.subveris@gmail.com" }],
                  subject: emailPayload.subject,
                }],
                from: { email: "noreply@subveris.com" },
                content: [{ type: "text/html", value: emailPayload.html }],
              }),
            });

            if (emailResponse.ok) {
              emailSent = true;
              console.log("[Contact] Email sent successfully via SendGrid");
            } else {
              emailErrorMessage = await emailResponse.text();
              console.error("[Contact] Failed to send email via SendGrid:", emailErrorMessage);
            }
          } catch (emailError) {
            emailErrorMessage = emailError instanceof Error ? emailError.message : String(emailError);
            console.error("[Contact] Error sending email via SendGrid:", emailError);
          }
        }

        if (!emailSent) {
          const providerInfo = {
            resendConfigured: Boolean(RESEND_API_KEY),
            sendgridConfigured: Boolean(SENDGRID_API_KEY),
            lastError: emailErrorMessage,
          };
          console.error("[Contact] Contact form failed to send email", providerInfo);
          return jsonResponse(
            {
              error: "Failed to send contact message",
              message: "Unable to deliver your message right now. Please try again later.",
            },
            { status: 500 }
          );
        }

        return jsonResponse({
          message: "Thank you for your message! We'll get back to you soon.",
          success: true,
        });
      } catch (err) {
        console.error("[Contact] Error processing contact form:", err);
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        return jsonResponse(
          {
            error: "Failed to process contact form",
            message: errorMessage
          },
          { status: 500 }
        );
      }
    }

    // Return 404 for unknown routes
    return jsonResponse({ error: "Not found" }, { status: 404 });
  } catch (err) {
    console.error("API error:", err);
    return jsonResponse(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
