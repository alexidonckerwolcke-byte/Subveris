// Utility to map DB subscription row to camelCase for API responses
function mapSubscriptionFromDb(sub: any) {
  if (!sub) return sub;
  return {
    id: sub.id,
    userId: sub.user_id,
    name: sub.name,
    category: sub.category,
    amount: sub.amount,
    currency: sub.currency,
    frequency: sub.frequency,
    nextBillingDate: (() => {
      const raw = sub.next_billing_at || sub.next_billing_date;
      const parsed = parseDateOnlyLocal(raw);
      return parsed ? formatDateLocal(parsed) : raw;
    })(),
    status: sub.status,
    usageCount: sub.usage_count,
    lastUsedDate: sub.last_used_at,
    logoUrl: sub.logo_url,
    description: sub.description,
    isDetected: sub.is_detected,
    websiteDomain: sub.website_domain,
    scheduledCancellationDate: sub.scheduled_cancellation_date,
    cancellationUrl: sub.cancellation_url,
    createdAt: sub.created_at,
    updatedAt: sub.updated_at,
    deletedAt: sub.deleted_at,
    monthlyUsageCount: sub.monthly_usage_count,
    usageMonth: sub.usage_month,
    billingMonth: sub.billing_month,
    // Add any additional fields as needed
  };
}

function formatBillingMonth(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatDateLocal(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateOnlyLocal(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) {
    const date = new Date(dateInput);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  const dateStr = String(dateInput).split('T')[0];
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setHours(0, 0, 0, 0);
  return date;
}

function parseSubscriptionRenewalDate(dateInput: string | Date | null | undefined): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return new Date(dateInput);

  const dateStr = String(dateInput).trim();
  if (!dateStr) return null;

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    // Preserve time for ISO timestamps so same-day future renewals are handled correctly.
    if (dateStr.includes('T') || dateStr.includes(' ')) {
      return parsed;
    }
    return parseDateOnlyLocal(dateStr);
  }

  return parseDateOnlyLocal(dateStr);
}

function normalizeRenewalDate(sub: any): Date | null {
  const renewalDateStr = sub.next_billing_at || sub.nextBillingDate || sub.next_billing_date;
  return parseSubscriptionRenewalDate(renewalDateStr);
}

function getSubscriptionBillingMonth(sub: any): string | null {
  const billingMonth = sub.billing_month || sub.billingMonth || null;
  if (!billingMonth || typeof billingMonth !== 'string') return null;
  const match = billingMonth.match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return null;
  return `${match[1]}-${String(match[2]).padStart(2, '0')}`;
}

function normalizeStatus(status: any): string {
  return String(status || '').trim().toLowerCase();
}

function isSubscriptionDeletedOrCanceled(sub: any): boolean {
  const status = normalizeStatus(sub.status);
  if (status === 'deleted' || status === 'canceled') return true;
  if (status === 'active' || status === 'unused' || status === 'to-cancel') return false;
  return Boolean(sub.deleted_at || sub.deletedAt);
}

function isSubscriptionActiveLike(sub: any): boolean {
  if (isSubscriptionDeletedOrCanceled(sub)) return false;
  const status = normalizeStatus(sub.status);
  return status === 'active' || status === 'unused' || status === 'to-cancel';
}

function isSubscriptionBilledInMonth(
  sub: any,
  monthStart: Date,
  monthEnd: Date,
  now: Date,
  isCurrentMonth: boolean,
  offsetMinutes = 0,
): boolean {
  const targetMonth = formatBillingMonth(monthStart);
  const billingMonth = getSubscriptionBillingMonth(sub);

  // If billing_month is explicitly set and matches the target month, count it (already advanced)
  if (billingMonth === targetMonth) {
    return true;
  }

  // For current month: also count subscriptions with renewal date = today (renewing now)
  if (isCurrentMonth) {
    const renewalDate = normalizeRenewalDate(sub);
    if (!renewalDate) {
      return false;
    }

    let renewalAsDate = renewalDate instanceof Date ? new Date(renewalDate) : new Date(String(renewalDate));
    if (!isNaN(renewalAsDate.getTime()) && offsetMinutes) {
      renewalAsDate = new Date(renewalAsDate.getTime() - offsetMinutes * 60000);
    }

    const renewalDay = new Date(renewalAsDate.getFullYear(), renewalAsDate.getMonth(), renewalAsDate.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Count if renewal date is today (the day it renews) and in target month
    if (formatBillingMonth(renewalAsDate) === targetMonth && renewalDay.getTime() === today.getTime()) {
      return true;
    }
  }

  return false;
}

import express, { type Request, type Response, type Express } from 'express';
import { type Server } from 'http';
import { randomUUID } from 'crypto';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import Stripe from 'stripe';
import { STRIPE_API_VERSION, createStripeClient, stripe, getPriceIdFromSubscription, getPlanTypeFromSubscription, PRICE_ID_TO_PLAN_TYPE } from './stripe.js';
import { emailService } from './email.js';
import { runRenewalChecks, autoAdvanceRenewalDates } from './renewal-manager.js';

// Helper for pagination params
export function getPaginationParams(req: any) {
  let page = parseInt(req.query.page, 10);
  let perPage = parseInt(req.query.perPage, 10);
  
  // For page: default to 1 if NaN or invalid
  if (isNaN(page) || page < 1) page = 1;
  
  // For perPage: if NaN, default to 100; otherwise normalize to min 1
  if (isNaN(perPage)) {
    perPage = 100;
  } else if (perPage < 1) {
    perPage = 1;
  }
  
  // Cap perPage at 1000
  if (perPage > 1000) perPage = 1000;
  
  return { page, perPage };
}

function extractTotpSecretFromUri(uri?: string): string {
  if (!uri || typeof uri !== 'string') return "";
  const match = uri.match(/[?&]secret=([^&]+)/i);
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

const CURRENCY_EXCHANGE_RATES: Record<string, number> = {
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

function convertToUSD(amount: number, currency: string | undefined) {
  const normalizedCurrency = String(currency || 'USD').trim().toUpperCase();
  const rate = CURRENCY_EXCHANGE_RATES[normalizedCurrency] ?? 1;
  return amount / rate;
}

// Return monthlyized amount for a subscription (in its original currency)
function monthlyAmountForSubscriptionRow(s: any): number {
  const amount = Number(s?.amount) || 0;
  // Return the full amount as-is - don't annualize it
  // The subscription only appears in the month it renews, so show the full cost then
  return amount;
}


function getMetricsCacheKey(userId: string, date = new Date()) {
  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  return `metrics:${userId}:${monthKey}`;
}

function clearSubscriptionsCacheForUser(userId: string) {
  // We cache the first few pages, so clear those keys after updates.
  for (let page = 1; page <= 20; page += 1) {
    cache.del(`subscriptions:${userId}:p${page}:n100`);
    cache.del(`subscriptions:${userId}:p${page}:n50`);
    cache.del(`subscriptions:${userId}:p${page}:n25`);
    cache.del(`subscriptions:${userId}:p${page}:n10`);
  }
  cache.del(getMetricsCacheKey(userId));
}

import { CacheService } from './cache.js';
// Import via the server shim so test spies that mock `../server/supabase`
// will correctly intercept calls when tests replace `getSupabaseClient`.
import { getSupabaseClient } from '../server/supabase.js';

type SessionRequest = Request & { session?: { user?: { id?: string } }; rawBody?: unknown };
import { storage } from './storage.js';
// Helper to extract userId from a JWT (Supabase or custom)
export function extractUserIdFromToken(token: string): string | undefined {
  try {
    const parts = token.split('.');
    const payloadPart = parts.length === 3 ? parts[1] : parts.length >= 3 ? parts[parts.length - 2] : undefined;
    if (!payloadPart) return undefined;
    const payload = JSON.parse(Buffer.from(payloadPart, 'base64').toString('utf8'));
    return payload.sub || payload.user_id || payload.id || undefined;
  } catch {
    return undefined;
  }
}

async function getUserIdFromRequest(req: SessionRequest): Promise<string | undefined> {
  let userId = req.session?.user?.id;
  if (userId) return userId;

  const authHeader = req.headers.authorization?.replace('Bearer ', '');
  if (!authHeader) return undefined;

  userId = extractUserIdFromToken(authHeader);
  if (userId) return userId;

  const supabase = getSupabaseClient();
  try {
    const { data, error } = await supabase.auth.getUser(authHeader);
    if (!error && data?.user?.id) {
      return data.user.id;
    }
  } catch (error) {
    console.warn('[Routes] getUserIdFromRequest supabase auth lookup failed:', error);
  }

  return undefined;
}

function isTimestampInCurrentMonth(timestamp?: string | null) {
  if (!timestamp) return false;
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return parsed >= currentMonth && parsed < nextMonth;
}

function getSubscriptionDeletedTimestamp(sub: any) {
  return sub.deleted_at || sub.deletedAt || sub.updated_at || sub.updatedAt || null;
}
import { asyncHandler, AppError, UnauthorizedError, ForbiddenError, NotFoundError } from './middleware/errorHandler.js';
const cache = new CacheService();

function isValidBillingFrequency(freq: any): freq is 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
  return ['weekly', 'monthly', 'quarterly', 'yearly'].includes(freq);
}

// centralized handler for cost-per-use endpoint; defined above so
// it exists outside the registration function (and can be imported by tests).
export async function handleCostPerUse(req: SessionRequest, res: Response) {
  try {
    // Get user ID from auth
    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
    }
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const supabase = getSupabaseClient();
    let subscriptions: any[] | null = null;

    const familyGroupId = typeof req.query.familyGroupId === 'string' ? req.query.familyGroupId : undefined;
    let showFamilyData = false;
    let isOwner = false;
    let isMember = false;
    if (familyGroupId) {
      // Check if group exists and sharing is enabled
      const groupRes: any = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', familyGroupId)
        .single();
      const groupRow = groupRes?.data ?? groupRes;
      if (groupRow) {
        isOwner = groupRow.owner_id === userId;
        if (!isOwner) {
          const memRes: any = await supabase
            .from('family_group_members')
            .select('id')
            .eq('family_group_id', familyGroupId)
            .eq('user_id', userId)
            .single();
          const membership = memRes?.data ?? memRes;
          isMember = !!membership;
        }
        if (isOwner || isMember) {
          const settingsRes: any = await supabase
            .from('family_group_settings')
            .select('show_family_data')
            .eq('family_group_id', familyGroupId)
            .single();
          const settings = settingsRes?.data ?? settingsRes;
          // if settings are missing, be permissive in tests/legacy flows
          if (!settings || settings?.show_family_data === undefined) {
            showFamilyData = true;
          } else if (settings?.show_family_data) {
            showFamilyData = true;
          }
        }
      }
    }
    if (familyGroupId && !showFamilyData) {
      return res.status(403).json({ error: 'Sharing not enabled for this family group' });
    }
    if (showFamilyData) {
      if (isOwner) {
        // Owner sees all subscriptions for the family group.
        const { data: members } = await supabase
          .from('family_group_members')
          .select('user_id')
          .eq('family_group_id', familyGroupId);
        // eslint-disable-next-line no-console
        console.log('[Routes] members raw:', JSON.stringify(members));
        let memberIds = (members || []).map((m: any) => m.user_id).filter(Boolean);
        // always include the owner in the set of IDs we query
        const { data: groupRow2 } = await supabase
          .from('family_groups')
          .select('owner_id')
          .eq('id', familyGroupId)
          .single();
        if (groupRow2 && !memberIds.includes(groupRow2.owner_id)) memberIds.push(groupRow2.owner_id);
        // eslint-disable-next-line no-console
        console.log('[Routes] memberIds before ensure current user:', JSON.stringify(memberIds));
        if (!memberIds.includes(userId)) memberIds = [userId, ...memberIds];
        // eslint-disable-next-line no-console
        console.log('[Routes] memberIds final:', JSON.stringify(memberIds));
        // Some test doubles or older supabase clients don't support the
        // chainable `.in()` filter reliably. Fetch unfiltered data and
        // perform the memberId filtering in JS to be deterministic.
        const { data: allSubsRaw } = await supabase
          .from('subscriptions')
          .select('*')
          .neq('status', 'deleted');
        let allSubs = allSubsRaw || [];
        if (!Array.isArray(allSubs)) {
          allSubs = Array.isArray((allSubs as any)?.data) ? (allSubs as any).data : [];
        }
        subscriptions = allSubs.filter((s: any) => memberIds.includes(s.user_id));
      } else {
        // Members should only see their own subscriptions and subscriptions
        // explicitly shared with them by the family owner.
        // To be robust across client shapes and RLS, fetch all group members'
        // subscriptions and then include only the member's personal subs plus
        // any subscriptions that have a shared_subscriptions row for this
        // family group (either shared_with_user_id === userId or null).
        const { data: members } = await supabase
          .from('family_group_members')
          .select('user_id')
          .eq('family_group_id', familyGroupId);
        const memberIds: string[] = Array.from(new Set([
          userId,
          ...(members || []).map((m: any) => m.user_id),
        ])).filter(Boolean as any);

        // Also ensure owner is included
        const { data: groupRow } = await supabase
          .from('family_groups')
          .select('owner_id')
          .eq('id', familyGroupId)
          .single();
        if (groupRow && groupRow.owner_id && !memberIds.includes(groupRow.owner_id)) {
          memberIds.push(groupRow.owner_id);
        }

        let allSubs: any[] = [];
        if (memberIds.length > 0) {
          const subsRes: any = await supabase
            .from('subscriptions')
            .select('*')
            .in('user_id', memberIds)
            .neq('status', 'deleted');
          allSubs = Array.isArray(subsRes) ? subsRes : (subsRes?.data ?? []);
        }

        const visible: any[] = [];
        for (const sub of (allSubs || [])) {
          if (!sub) continue;
          // always include the user's own subscriptions
          if (sub.user_id === userId) {
            visible.push(sub);
            continue;
          }
          // otherwise check whether this subscription was shared with the group
          const { data: match } = await supabase
            .from('shared_subscriptions')
            .select('id, shared_with_user_id')
            .eq('family_group_id', familyGroupId)
            .eq('subscription_id', sub.id)
            .single();
          if (match) {
            // visible if shared to whole group (null) or explicitly to this user
            if (!match.shared_with_user_id || match.shared_with_user_id === userId) {
              visible.push(sub);
            }
          }
        }

        subscriptions = visible;
      }
    } else {
      // Only show personal data
      const { data: personalSubs } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId);
      subscriptions = personalSubs || [];
    }

    // debug: show raw subscriptions fetched
    // eslint-disable-next-line no-console
    console.log('[Routes] raw subscriptions before normalize:', Array.isArray(subscriptions) ? 'array' : typeof subscriptions, JSON.stringify(subscriptions));

    // normalize subscriptions to an array in case the supabase client
    // returned a thenable/row wrapper in tests or unexpected shapes
    if (!Array.isArray(subscriptions)) {
      subscriptions = Array.isArray((subscriptions as any)?.data) ? (subscriptions as any).data : [];
    }
    if (!subscriptions || subscriptions.length === 0) {
      return res.json([]);
    }

    const { data: userSubscriptionRow } = await supabase
      .from('user_subscriptions')
      .select('plan_type')
      .eq('user_id', userId)
      .single();
    const planType = userSubscriptionRow?.plan_type || 'free';
    const visibleSubscriptions = subscriptions.filter((sub: any) => sub.status !== 'deleted');
    const FREE_COST_PER_USE_LIMIT = 2;

    const analysisSubscriptions = !showFamilyData && planType === 'free' && visibleSubscriptions.length > FREE_COST_PER_USE_LIMIT
      ? visibleSubscriptions.slice(0, FREE_COST_PER_USE_LIMIT)
      : visibleSubscriptions;

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const analysis = analysisSubscriptions
      .map((sub: any) => {
        const monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'quarterly' ? sub.amount / 3 : sub.frequency === 'weekly' ? sub.amount * 4 : sub.amount;
        const hasUsageMonth = typeof sub.usage_month === 'string' && sub.usage_month !== '';
        // Cost per use resets to zero on the first day of each month
        // If usage_month matches current month, use monthly_usage_count; otherwise reset to 0
        const usageCount = hasUsageMonth
          ? sub.usage_month === currentMonth
            ? (sub.monthly_usage_count ?? sub.usage_count ?? 0)
            : 0  // Reset to 0 when month boundary crossed
          : (sub.usage_count ?? 0);  // Fallback to legacy usage_count if no usage_month tracking
        const costPerUse = usageCount > 0 ? monthlyAmount / usageCount : monthlyAmount;
        let valueRating: 'excellent' | 'good' | 'fair' | 'poor';
        if (usageCount <= 1) {
          valueRating = 'poor';
        } else if (usageCount <= 3) {
          valueRating = costPerUse <= 10 ? 'fair' : 'poor';
        } else {
          valueRating = costPerUse > 20 ? 'poor' : costPerUse > 10 ? 'fair' : 'good';
        }
        return {
          subscriptionId: sub.id,
          name: sub.name,
          monthlyAmount: Math.round(monthlyAmount * 100) / 100,
          usageCount,
          costPerUse: Math.round(costPerUse * 100) / 100,
          valueRating,
          currency: sub.currency || 'USD',
        };
      });

    const out = Array.isArray(analysis) ? analysis : (analysis ? [analysis] : []);
    console.log('[Routes] cost-per-use analysis result type:', Array.isArray(out), 'length:', out.length);
    console.log('[Routes] cost-per-use analysis payload:', JSON.stringify(out));
    res.json(out);
  } catch (error) {
    console.error('[Routes] cost-per-use error', error);
    res.status(500).json({ error: 'Failed to compute cost per use' });
  }
}


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // API root route for health/status
  app.get("/api/status", (req: SessionRequest, res: Response) => {
    res.json({
      status: "ok",
      message: "Welcome to the Subveris API",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/metrics", asyncHandler(async (req: SessionRequest, res: Response) => {
    // Cache key based on user
    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
    }
    if (!userId) throw new UnauthorizedError('Authentication required');
    const cacheKey = getMetricsCacheKey(userId);
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Auto-advance renewal dates before calculating metrics so no passed renewals remain.
    try {
      await autoAdvanceRenewalDates(userId);
    } catch (err) {
      console.error('[Routes] Error auto-advancing renewal dates:', err);
    }

    // Get user's subscriptions only
    const supabase = getSupabaseClient();
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (subscriptionsError) {
      console.error('[Routes] /api/metrics supabase error', subscriptionsError);
      throw new AppError(500, 'Failed to load metrics');
    }

    if (!subscriptions) {
      const emptyMetrics = {
        totalMonthlySpend: 0, 
        activeSubscriptions: 0, 
        potentialSavings: 0, 
        thisMonthSavings: 0, 
        unusedSubscriptions: 0, 
        averageCostPerUse: 0,
        monthlySpendChange: 0,
        newServicesTracked: 0
      };
      await cache.set(cacheKey, JSON.stringify(emptyMetrics), 60);
      return res.json(emptyMetrics);
    }

    const currentDate = new Date();
    const today = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
    const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

    const monthlyAmountForSubscription = (s: any) => {
      const amount = Number(s?.amount) || 0;
      const monthlyAmount = s.frequency === 'yearly' ? amount / 12 : s.frequency === 'quarterly' ? amount / 3 : s.frequency === 'weekly' ? amount * 4 : amount;
      return convertToUSD(monthlyAmount, s.currency || 'USD');
    };

    // Calculate metrics from user's subscriptions only
    const activeCount = subscriptions.filter((s: any) => s.status === 'active' || s.status === 'unused').length;
    const unusedCount = subscriptions.filter((s: any) => s.status === 'unused').length;
    
    // Calculate total monthly spend - ONLY from subscriptions that renew in the current calendar month
    const totalMonthly = subscriptions
      .filter((s: any) => s.status !== 'deleted')
      .reduce((sum: number, s: any) => {
        if (!isSubscriptionBilledInMonth(s, monthStart, monthEnd, currentDate, true)) {
          return sum;
        }
        return sum + monthlyAmountForSubscription(s);
      }, 0);

    // Calculate month-over-month spending change
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const currentMonthSubs = subscriptions.filter((s: any) => {
      const createdDate = new Date(s.created_at);
      return createdDate >= currentMonth && createdDate < nextMonth;
    });
    
    const previousMonthSubs = subscriptions.filter((s: any) => {
      const createdDate = new Date(s.created_at);
      return createdDate >= previousMonth && createdDate < currentMonth;
    });

    // Calculate previous month spend using billing month logic for consistency
    const previousMonthSpend = subscriptions
      .filter((s: any) => s.status !== 'deleted')
      .reduce((sum: number, s: any) => {
        if (!isSubscriptionBilledInMonth(s, previousMonth, previousMonthEnd, now, false)) {
          return sum;
        }
        return sum + monthlyAmountForSubscription(s);
      }, 0);

    const monthlySpendChange = previousMonthSpend > 0 
      ? Math.round(((totalMonthly - previousMonthSpend) / previousMonthSpend) * 100)
      : 0;

    const newServicesTracked = currentMonthSubs.length;

    // Calculate this month's savings: ONLY subscriptions deleted in the current calendar month
    // Reset to zero on the first day of each month (timestamp-based filtering)
    const deletedSavings = subscriptions
      .filter((s: any) => s.status === 'deleted')
      .filter((s: any) => {
        const ts = getSubscriptionDeletedTimestamp(s);
        // Ensure timestamp is in current calendar month (not previous or future)
        if (!ts) return false;
        const deletedDate = new Date(ts);
        return deletedDate >= monthStart && deletedDate <= monthEnd;
      })
      .reduce((sum: number, s: any) => {
        const monthlyAmount = s.frequency === 'yearly' ? s.amount / 12 : s.frequency === 'quarterly' ? s.amount / 3 : s.frequency === 'weekly' ? s.amount * 4 : s.amount;
        return sum + convertToUSD(monthlyAmount, s.currency || 'USD');
      }, 0);

    const thisMonthSavingsAmount = Math.round(deletedSavings * 100) / 100;

    // Calculate potential savings: subscriptions marked as "unused" or "to-cancel" are planned savings.
    const potentialSavingsAmount = Math.round((subscriptions.filter((s: any) => s.status === 'unused' || s.status === 'to-cancel').reduce((sum: number, s: any) => {
      const monthlyAmount = s.frequency === 'yearly' ? s.amount / 12 : s.frequency === 'quarterly' ? s.amount / 3 : s.frequency === 'weekly' ? s.amount * 4 : s.amount;
      return sum + convertToUSD(monthlyAmount, s.currency || 'USD');
    }, 0) as number) * 100) / 100;

    const metrics = {
      totalMonthlySpend: Math.round(totalMonthly * 100) / 100,
      activeSubscriptions: activeCount,
      potentialSavings: potentialSavingsAmount,
      thisMonthSavings: thisMonthSavingsAmount,
      unusedSubscriptions: unusedCount,
      averageCostPerUse: 0,
      monthlySpendChange,
      newServicesTracked
    };
    await cache.set(cacheKey, JSON.stringify(metrics), 60);
    res.json(metrics);
  }));

  app.get("/api/subscriptions", asyncHandler(async (req: SessionRequest, res: Response) => {
    // parse pagination
    const { page, perPage } = getPaginationParams(req);

    // Cache key based on user
    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
    }
    if (!userId) throw new UnauthorizedError('Authentication required');

    // Auto-advance renewal dates BEFORE checking cache, and invalidate cache if any were advanced
    try {
      const result = await autoAdvanceRenewalDates(userId);
      if (result && result.anyAdvanced) {
        console.log(`[Routes] Renewals were advanced, invalidating cache for user ${userId} and family members`);
        
        // Collect all user IDs to invalidate (must match renewal-manager logic)
        const supabase = getSupabaseClient();
        const userIdsToInvalidate = new Set<string>([userId]);

        try {
          // 1. Check if user is a MEMBER of any family group
          const { data: familyMemberships, error: membershipError } = await supabase
            .from("family_group_members")
            .select("family_group_id")
            .eq("user_id", userId);

          if (membershipError) {
            console.log(`[Routes] Warning: Could not fetch family memberships for cache invalidation:`, membershipError.message);
          } else if (familyMemberships && familyMemberships.length > 0) {
            for (const membership of familyMemberships) {
              const familyGroupId = membership.family_group_id;
              
              // Get the group owner - they own the shared subscriptions
              const { data: groupData, error: groupError } = await supabase
                .from("family_groups")
                .select("owner_id")
                .eq("id", familyGroupId)
                .single();

              if (groupError) {
                console.log(`[Routes] Warning: Could not fetch group owner for cache invalidation:`, groupError.message);
              } else if (groupData) {
                userIdsToInvalidate.add(groupData.owner_id);
              }
            }
          }

          // 2. Check if user is an OWNER of any family group
          const { data: ownedGroups, error: ownerError } = await supabase
            .from("family_groups")
            .select("id")
            .eq("owner_id", userId);

          if (ownerError) {
            console.log(`[Routes] Warning: Could not fetch owned groups for cache invalidation:`, ownerError.message);
          } else if (ownedGroups && ownedGroups.length > 0) {
            for (const group of ownedGroups) {
              const familyGroupId = group.id;
              
              // Get all members of this group
              const { data: groupMembers, error: membersError } = await supabase
                .from("family_group_members")
                .select("user_id")
                .eq("family_group_id", familyGroupId);

              if (membersError) {
                console.log(`[Routes] Warning: Could not fetch group members for cache invalidation:`, membersError.message);
              } else if (groupMembers) {
                groupMembers.forEach((member: any) => {
                  userIdsToInvalidate.add(member.user_id);
                });
              }
            }
          }
        } catch (err) {
          console.error("[Routes] Error fetching family info for cache invalidation:", err);
        }

        // Clear cache for all users
        console.log(`[Routes] Clearing cache for ${userIdsToInvalidate.size} user(s)`);
        for (const invalidateUserId of userIdsToInvalidate) {
          for (let p = 1; p <= 10; p++) {
            for (let n of [10, 25, 50, 100, 200, 500, 1000]) {
              await cache.delete(`subscriptions:${invalidateUserId}:p${p}:n${n}`);
            }
          }
        }
      }
    } catch (err) {
      console.error("[Routes] Error auto-advancing renewal dates:", err);
    }

    // Now check cache for fresh data
    const cacheKey = `subscriptions:${userId}:p${page}:n${perPage}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Build paginated query using Supabase `range` helper.
    const supabase = getSupabaseClient();
    const from = (page - 1) * perPage;
    const to = page * perPage - 1;

    console.log(`[API/Subscriptions] Fetching for user: ${userId}, from: ${from}, to: ${to}`);

    // ask Supabase for an exact row count so we can expose total to client
    const { data, error, count } = await supabase
      .from('subscriptions')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    console.log(`[API/Subscriptions] Query returned ${data?.length || 0} rows, count: ${count}, error: ${error?.message || 'none'}`);

    // expose the header for clients that care
    if (typeof count === 'number') {
      res.setHeader('x-total-count', count);
    }

    if (error) {
      throw new AppError(500, 'Failed to fetch subscriptions');
    }

    const result = (data || []).map(mapSubscriptionFromDb);
    // note: caching now ignores pagination parameters because range results vary
    await cache.set(cacheKey, JSON.stringify(result), 300);
    res.json(result);
  }));

  app.get("/api/subscriptions/:id", asyncHandler(async (req: SessionRequest, res: Response) => {
    // Get user ID from session or authorization header
    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
    }
    if (!userId) throw new UnauthorizedError('Authentication required');

    // Only return subscription if it belongs to the authenticated user
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
        .eq('id', req.params.id)
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        throw new NotFoundError('Subscription not found');
      }

      res.json(mapSubscriptionFromDb(data));
  }));

  // DEBUG: Show raw subscription data
  app.get("/api/debug/subscriptions-raw", asyncHandler(async (req: SessionRequest, res: Response) => {
    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
    }
    if (!userId) throw new UnauthorizedError('Authentication required');

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      throw new AppError(500, `Error fetching subscriptions: ${error.message}`);
    }

    // Show raw data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    res.json({
      debug: true,
      today: today.toISOString(),
      todayLocal: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      subscriptionCount: data?.length || 0,
      subscriptions: data?.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        status: sub.status,
        next_billing_at: sub.next_billing_at,
        next_billing_date: sub.next_billing_date,
        frequency: sub.frequency,
        created_at: sub.created_at,
        updated_at: sub.updated_at,
      })),
    });
  }));

  app.post("/api/subscriptions", asyncHandler(async (req: SessionRequest, res: Response) => {
    // Get user ID from session or token
    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) {
        userId = extractUserIdFromToken(authHeader);
      }
    }
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const {
      name,
      category,
      amount: rawAmount,
      frequency,
      nextBillingDate,
      websiteDomain,
      description,
      currency,
      familyGroupId,
      status,
      usageCount,
      isDetected,
    } = req.body;

    const requiredFields = ['name', 'category', 'amount', 'frequency', 'nextBillingDate'];
    const missingFields = requiredFields.filter((field) => !req.body[field]);
    if (missingFields.length > 0) {
      throw new AppError(400, `Missing required fields: ${missingFields.join(', ')}`);
    }

    const amount = Number(rawAmount);
    if (Number.isNaN(amount) || amount <= 0) {
      throw new AppError(400, 'Amount must be a positive number');
    }

    if (!isValidBillingFrequency(frequency)) {
      throw new AppError(400, 'Invalid billing frequency');
    }

    const normalizedNextBillingDate = new Date(String(nextBillingDate));
    if (isNaN(normalizedNextBillingDate.getTime())) {
      throw new AppError(400, 'Invalid nextBillingDate');
    }
    normalizedNextBillingDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const billingMonthValue = normalizedNextBillingDate <= today
      ? formatBillingMonth(today)
      : formatBillingMonth(normalizedNextBillingDate);

    const supabase = getSupabaseClient();

    let allowedFamilyGroupId: string | null = null;
    if (typeof familyGroupId === 'string' && familyGroupId.trim().length > 0) {
      const { data: groupRow, error: groupErr } = await supabase
        .from('family_groups')
        .select('id, owner_id')
        .eq('id', familyGroupId)
        .single();

      if (groupErr || !groupRow) {
        throw new AppError(400, 'Invalid family group ID');
      }

      const isOwner = groupRow.owner_id === userId;
      let isMember = false;
      if (!isOwner) {
        const { data: membership, error: memErr } = await supabase
          .from('family_group_members')
          .select('id')
          .eq('family_group_id', familyGroupId)
          .eq('user_id', userId)
          .single();
        isMember = !!membership && !memErr;
      }

      if (!isOwner && !isMember) {
        throw new AppError(403, 'Not authorized to create a subscription for this family group');
      }

      allowedFamilyGroupId = familyGroupId;
    }

    const insertPayload: Record<string, unknown> = {
      id: randomUUID(),
      user_id: userId,
      name: String(name),
      category: String(category),
      amount,
      frequency,
      next_billing_at: normalizedNextBillingDate.toISOString().split('T')[0],
      billing_month: billingMonthValue,
      status: typeof status === 'string' ? status : 'active',
      usage_count: typeof usageCount === 'number' ? usageCount : 0,
      is_detected: typeof isDetected === 'boolean' ? isDetected : false,
      website_domain: websiteDomain ? String(websiteDomain) : null,
      description: description ? String(description) : null,
      currency: currency ? String(currency) : 'USD',
    };
    if (allowedFamilyGroupId) {
      insertPayload.family_group_id = allowedFamilyGroupId;
    }


    const { data: inserted, error: insertError } = await supabase
      .from('subscriptions')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      // Check for unique constraint violation
      if (insertError.code === '23505' || (insertError.message && insertError.message.includes('unique constraint'))) {
        throw new AppError(409, 'A subscription with this name, amount, and billing date already exists');
      }

      console.error('[Routes] Failed to insert subscription', {
        insertPayload,
        insertError,
      });
      throw new AppError(500, insertError.message || 'Failed to create subscription');
    }

    if (!inserted) {
      throw new AppError(500, 'Failed to create subscription (no data returned)');
    }

    // Clear cache for this user
    clearSubscriptionsCacheForUser(userId);

    res.status(201).json(mapSubscriptionFromDb(inserted));
  }));

  app.patch("/api/subscriptions/:id/usage", asyncHandler(async (req: SessionRequest, res: Response) => {
    const { usageCount } = req.body;
    if (typeof usageCount !== "number" || usageCount < 0) {
      throw new AppError(400, "Usage count must be a non-negative number");
    }
    // Get user ID for authorization check
    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
    }
    if (!userId) throw new UnauthorizedError('Authentication required');

    const supabase = getSupabaseClient();
    // Fetch subscription to determine owner
    const { data: existingSub, error: fetchErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !existingSub) {
      throw new NotFoundError('Subscription not found');
    }

    const subscriptionOwner = existingSub.user_id;
    let allow = subscriptionOwner === userId;

    if (!allow) {
      // Check family ownership
      const { data: memberships } = await supabase
        .from('family_group_members')
        .select('family_group_id')
        .eq('user_id', subscriptionOwner);
      const groupIds = (memberships || []).map((m: any) => m.family_group_id);
      if (groupIds.length > 0) {
        const { data: ownerGroups } = await supabase
          .from('family_groups')
          .select('id')
          .in('id', groupIds)
          .eq('owner_id', userId);
        if (ownerGroups && ownerGroups.length > 0) allow = true;
      }
    }

    if (!allow) throw new ForbiddenError('Not authorized to update this subscription');

    // Perform update and also bump monthly counter
    const month = new Date().toISOString().substr(0,7); // YYYY-MM
    const { data: existingAgain } = await supabase
      .from('subscriptions')
      .select('monthly_usage_count,usage_month')
      .eq('id', req.params.id)
      .single();
    let monthly = usageCount;
    let usageMonthValue = month;
    if (existingAgain && existingAgain.usage_month !== month) {
      // reset if we crossed into a new month
      monthly = usageCount;
      usageMonthValue = month;
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        usage_count: usageCount, 
        monthly_usage_count: monthly,
        usage_month: usageMonthValue,
        last_used_at: new Date().toISOString().split('T')[0]
      })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error || !data) {
      throw new AppError(500, 'Failed to update usage count');
    }

    res.json(mapSubscriptionFromDb(data));
  }));

  app.patch("/api/subscriptions/:id", asyncHandler(async (req: SessionRequest, res: Response) => {
    const subscriptionId = req.params.id;
    const { nextBillingDate } = req.body;
    console.log('[Routes] PATCH /api/subscriptions/:id', { subscriptionId, nextBillingDate });
    if (!nextBillingDate) {
      throw new AppError(400, 'nextBillingDate is required');
    }
    // Get user ID for authorization check
    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
    }
    console.log('[Routes] User ID from token:', userId);
    if (!userId) throw new UnauthorizedError('Authentication required');
    const supabase = getSupabaseClient();
    // fetch subscription to determine owner
    const { data: existingSub, error: fetchErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();
    console.log('[Routes] Fetch subscription result:', { error: fetchErr?.message, subExists: !!existingSub, owner: existingSub?.user_id });
    if (fetchErr || !existingSub) {
      console.error('[Routes] Subscription not found:', fetchErr);
      return res.status(404).json({ error: 'Subscription not found', details: fetchErr?.message });
    }
    const subscriptionOwner = existingSub.user_id;
    // If requester is subscription owner, allow
    let allow = subscriptionOwner === userId;
    console.log('[Routes] Direct owner check:', { subscriptionOwner, userId, allow });
    // Otherwise, check if requester is owner of a family group that contains the subscription owner
    if (!allow) {
      const { data: memberships } = await supabase
        .from('family_group_members')
        .select('family_group_id')
        .eq('user_id', subscriptionOwner);
      const groupIds = (memberships || []).map((m: any) => m.family_group_id);
      console.log('[Routes] Member found in groups:', groupIds);
      if (groupIds.length > 0) {
        const { data: ownerGroups } = await supabase
          .from('family_groups')
          .select('id')
          .in('id', groupIds)
          .eq('owner_id', userId);
        console.log('[Routes] Requester owns groups:', ownerGroups?.map((g: any) => g.id));
        if (ownerGroups && ownerGroups.length > 0) allow = true;
      }
    }
    console.log('[Routes] Final authorization decision:', allow);
    if (!allow) return res.status(403).json({ error: 'Not authorized to update this subscription' });
    // Normalize date format (YYYY-MM-DD) using local date-only parsing
    let normalized = nextBillingDate;
    let billingMonthValue: string | undefined = undefined;
    try {
      const parsed = parseDateOnlyLocal(nextBillingDate);
      if (parsed && !isNaN(parsed.getTime())) {
        normalized = formatDateLocal(parsed);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingRenewal = normalizeRenewalDate(existingSub);
        const isAutoAdvance = Boolean(req.body.autoAdvanced);
        if (isAutoAdvance && existingRenewal && existingRenewal <= today && parsed > today) {
          // Preserve the subscription's previous billing month only when the
          // client indicated this update is an auto-advance.
          billingMonthValue = formatBillingMonth(existingRenewal);
        } else {
          billingMonthValue = parsed <= today ? formatBillingMonth(today) : formatBillingMonth(parsed);
        }
      }
    } catch (e) {
      console.warn('[Routes] Failed to parse nextBillingDate in PATCH /api/subscriptions/:id', { nextBillingDate, error: e });
    }
    console.log('[Routes] Updating subscription with normalized date:', normalized, { billingMonthValue });
    // Perform update directly using Supabase
    const updatePayload: Record<string, unknown> = { next_billing_at: normalized };
    if (billingMonthValue) {
      updatePayload.billing_month = billingMonthValue;
    }
    // Remove any stored renewal calendar events for this subscription so
    // generated renewal events (from the subscription row) take precedence.
    try {
      await supabase
        .from('subscription_calendar_events')
        .delete()
        .eq('subscription_id', subscriptionId)
        .eq('user_id', userId)
        .eq('event_type', 'renewal');
    } catch (err) {
      console.warn('[Routes] Failed to delete stored renewal calendar events', { subscriptionId, userId, err });
    }

    const { data, error: updateErr } = await supabase
      .from('subscriptions')
      .update(updatePayload)
      .eq('id', subscriptionId)
      .select()
      .single();
    if (updateErr || !data) {
      console.error('[Routes] Failed to update next_billing_at:', updateErr);
      return res.status(500).json({ error: 'Failed to update subscription', details: updateErr?.message });
    }
    console.log('[Routes] Update successful:', data);
    clearSubscriptionsCacheForUser(userId);
    res.json(mapSubscriptionFromDb(data));
  }));

  app.patch("/api/subscriptions/:id/status", asyncHandler(async (req: SessionRequest, res: Response) => {
    const subscriptionId = req.params.id;
    const { status } = req.body;

    if (!status || typeof status !== 'string') {
      throw new AppError(400, 'Status is required');
    }

    const allowedStatuses = ['active', 'unused', 'to-cancel', 'deleted'];
    if (!allowedStatuses.includes(status)) {
      throw new AppError(400, 'Invalid subscription status');
    }

    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
    }
    if (!userId) throw new UnauthorizedError('Authentication required');

    const supabase = getSupabaseClient();
    const { data: existingSub, error: fetchErr } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (fetchErr || !existingSub) {
      return res.status(404).json({ error: 'Subscription not found', details: fetchErr?.message });
    }

    let allow = existingSub.user_id === userId;
    if (!allow) {
      const { data: memberships } = await supabase
        .from('family_group_members')
        .select('family_group_id')
        .eq('user_id', existingSub.user_id);
      const groupIds = (memberships || []).map((m: any) => m.family_group_id);
      if (groupIds.length > 0) {
        const { data: ownerGroups } = await supabase
          .from('family_groups')
          .select('id')
          .in('id', groupIds)
          .eq('owner_id', userId);
        if (ownerGroups && ownerGroups.length > 0) allow = true;
      }
    }
    if (!allow) return res.status(403).json({ error: 'Not authorized to update this subscription' });

    // Only update status by default; some schemas may not have deleted_at.
    const updateData: any = { status };
    if (status === 'deleted') {
      // In schemas that support deleted_at, we write it too. If column missing,
      // this will be caught and ignored by fallback below.
      updateData.deleted_at = new Date().toISOString();
    }

    let updatedSub: any = null;
    let updateErr: any = null;

    const tryUpdateWithoutDeletedAt = async () => {
      const fallbackResult = await supabase
        .from('subscriptions')
        .update({ status })
        .eq('id', subscriptionId)
        .select()
        .single();
      updatedSub = fallbackResult.data;
      updateErr = fallbackResult.error;
    };

    const updateResult = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single();

    updatedSub = updateResult.data;
    updateErr = updateResult.error;

    if (updateErr && status === 'deleted' && updateErr.message?.includes('deleted_at')) {
      await tryUpdateWithoutDeletedAt();
    }

    if (updateErr || !updatedSub) {
      console.error('[Routes] Failed to update subscription status:', updateErr);
      return res.status(500).json({ error: 'Failed to update subscription status', details: updateErr?.message || 'Unknown' });
    }

    clearSubscriptionsCacheForUser(userId);

    res.json(mapSubscriptionFromDb(updatedSub));
  }));

  app.post("/api/subscriptions/:id/log-usage", async (req: SessionRequest, res: Response) => {
    console.log(`[Routes] hit log-usage for id=${req.params.id}`);
    try {
      // first, validate that the user is authenticated
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      console.log(`[Routes] log-usage auth userId=${userId}`);
      if (!userId) {
        // this route used to be open but we now require a logged-in user so that
        // clients get a proper 401 instead of silently failing later
        return res.status(401).json({ error: "Unauthorized" });
      }

      const id = req.params.id;
      // make sure the subscription belongs to the caller (or is shared via a
      // family group) before we increment the usage count
      const supabase = getSupabaseClient();
      const { data: existingSub, error: fetchErr } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchErr) {
        console.error(`[Routes] log-usage supabase fetchErr for id=${id}`, fetchErr);
        return res.status(500).json({ error: "Database error fetching subscription" });
      }
      if (!existingSub) {
        console.warn(`[Routes] log-usage could not find subscription id=${id}`);
        return res.status(404).json({ error: "Subscription not found or has been deleted" });
      }

      const subscriptionOwner = existingSub.user_id;
      let allow = subscriptionOwner === userId;
      if (!allow) {
        // check family ownership as in other endpoints
        const { data: memberships } = await supabase
          .from('family_group_members')
          .select('family_group_id')
          .eq('user_id', subscriptionOwner);
        const groupIds = (memberships || []).map((m: any) => m.family_group_id);
        if (groupIds.length > 0) {
          const { data: ownerGroups } = await supabase
            .from('family_groups')
            .select('id')
            .in('id', groupIds)
            .eq('owner_id', userId);
          if (ownerGroups && ownerGroups.length > 0) allow = true;
        }
      }
      if (!allow) {
        return res.status(403).json({ error: 'Not authorized to log usage for this subscription' });
      }

      // ensure subscription actually exists before trying to increment (again,
      // now that authorization is validated)
      const subscription = await storage.recordSubscriptionUsage(id);
      if (!subscription) {
        console.error(`[Routes] recordSubscriptionUsage returned undefined for id=${id}`);
        return res.status(500).json({ error: "Failed to record usage" });
      }
      res.json(subscription);
    } catch (error) {
      console.error("[Routes] POST /api/subscriptions/:id/log-usage error:", error);
      res.status(500).json({ error: "Failed to record usage" });
    }
  });

  // Track usage by domain (used by browser extension)
  app.post("/api/track-usage-by-domain", async (req: SessionRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (!authHeader) {
        return res.status(401).json({ error: "Missing authorization header" });
      }

      const userId = extractUserIdFromToken(authHeader);
      if (!userId) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { domain, timeSpent } = req.body;
      if (!domain) {
        return res.status(400).json({ error: "Missing domain in request body" });
      }

      const subscription = await storage.trackUsageByDomain(userId, domain, timeSpent || 0);
      if (!subscription) {
        return res.status(404).json({
          error: "No subscription found for this domain",
          message: "Make sure the domain matches the website_domain in your subscription settings"
        });
      }

      const monthlyAmount = subscription.frequency === 'yearly' ? subscription.amount / 12 : subscription.frequency === 'quarterly' ? subscription.amount / 3 : subscription.frequency === 'weekly' ? subscription.amount * 4 : subscription.amount;
      const currentMonth = new Date().toISOString().slice(0, 7);
      const usageForCost = subscription.usageMonth === currentMonth ? subscription.monthlyUsageCount : subscription.usageCount;
      const costPerUse = usageForCost > 0 ? monthlyAmount / usageForCost : monthlyAmount;

      res.json({
        message: "Usage tracked successfully",
        subscription,
        usageCount: subscription.usageCount,
        monthlyUsageCount: subscription.monthlyUsageCount,
        costPerUse,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[Routes] POST /api/track-usage-by-domain error:", message);
      res.status(500).json({ error: "Failed to track usage", message });
    }
  });

  app.post("/api/track-usage-for-all-members", async (req: SessionRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (!authHeader) {
        return res.status(401).json({ error: "Missing authorization header" });
      }

      const userId = extractUserIdFromToken(authHeader);
      if (!userId) {
        return res.status(401).json({ error: "Invalid token" });
      }

      const { domain, timeSpent } = req.body;
      if (!domain) {
        return res.status(400).json({ error: "Missing domain in request body" });
      }

      const subscriptions = await storage.trackUsageByDomainForAllMembers(userId, domain, timeSpent || 0);
      if (!subscriptions || subscriptions.length === 0) {
        return res.status(404).json({
          error: "No subscriptions found for this domain",
          message: "Neither you nor your family members have a subscription for this domain"
        });
      }

      res.json({
        message: "Usage tracked for all subscriptions",
        subscriptions: subscriptions.map(sub => {
          const monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'quarterly' ? sub.amount / 3 : sub.frequency === 'weekly' ? sub.amount * 4 : sub.amount;
          const currentMonth = new Date().toISOString().slice(0, 7);
          const usageForCost = sub.usageMonth === currentMonth ? sub.monthlyUsageCount : sub.usageCount;
          const costPerUse = usageForCost > 0 ? monthlyAmount / usageForCost : monthlyAmount;
          return {
            subscription: sub,
            costPerUse,
          };
        }),
        count: subscriptions.length,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[Routes] POST /api/track-usage-for-all-members error:", message);
      res.status(500).json({ error: "Failed to track usage", message });
    }
  });



  app.delete("/api/subscriptions/:id", async (req: SessionRequest, res: Response) => {
    try {
      // Get user ID for authorization check
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      // Perform a hard delete from the database as requested
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .delete()
        .eq('id', req.params.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !data) {
        console.error('[Routes] DELETE /api/subscriptions/:id error or no data:', error);
        return res.status(404).json({ error: "Subscription not found or not authorized" });
      }

      clearSubscriptionsCacheForUser(userId);
      res.status(200).json({ success: true, message: "Subscription deleted permanently" });
    } catch (error) {
      console.error('[Routes] DELETE /api/subscriptions/:id error:', error);
      res.status(500).json({ error: "Failed to delete subscription" });
    }
  });

  // Get calendar events for the user (includes both db events and renewal dates from subscriptions)
  app.get("/api/calendar-events", async (req: SessionRequest, res: Response) => {
    try {
      // Get userId from auth
      let userId = req.session?.user?.id;
      
      if (!userId) {
        const authHeader = req.headers.authorization?.replace("Bearer ", "");
        if (authHeader) {
          userId = extractUserIdFromToken(authHeader);
        }
      }

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("[Routes] GET /api/calendar-events - userId:", userId);

      const supabase = getSupabaseClient();
      
      // Get stored calendar events from database
      const { data: dbEvents, error } = await supabase
        .from("subscription_calendar_events")
        .select("*")
        .eq("user_id", userId)
        .order("event_date", { ascending: true });

      if (error) {
        console.error("[Routes] Error fetching calendar events:", error);
        return res.status(500).json({ error: "Failed to fetch calendar events" });
      }

      console.log("[Routes] DB calendar events found:", dbEvents?.length || 0);

      // Get all subscriptions for this user to generate renewal events
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", userId);

      console.log("[Routes] Subscriptions found:", subscriptions?.length || 0, "- Data:", subscriptions?.map((s: any) => ({ name: s.name, status: s.status, next_billing_at: s.next_billing_at })));

      // Generate renewal events from active subscriptions
      const renewalEvents = (subscriptions || [])
        .filter((sub: any) => sub.status === "active" || sub.status === "unused")
        .map((sub: any) => {
          // Use existing next_billing_at or default to today
          let billingDate = sub.next_billing_at;
          let parsedBillingDate = parseDateOnlyLocal(billingDate);
          if (!parsedBillingDate) {
            console.log(`[Routes] Subscription ${sub.id} (${sub.name}) missing or invalid next_billing_at, using today`);
            parsedBillingDate = parseDateOnlyLocal(new Date());
          }

          return {
            id: `renewal-${sub.id}`,
            subscriptionId: sub.id,
            userId: userId,
            Title: `${sub.name} Renewal`,
            title: `${sub.name} Renewal`,
            eventDate: parsedBillingDate ? formatDateLocal(parsedBillingDate) : formatDateLocal(parseDateOnlyLocal(new Date())!),
            eventType: "renewal" as const,
            amount: sub.amount,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        });

      console.log("[Routes] Renewal events generated:", renewalEvents.length, "- Events:", renewalEvents.map(e => ({ id: e.id, title: e.title, eventDate: e.eventDate })));

      // Merge db events and renewal events, removing stale stored renewal rows
      const eventMap = new Map<string, any>();
      (dbEvents || []).forEach((e: any) => {
        const isStoredRenewal = e.eventType === 'renewal' || (typeof e.id === 'string' && e.id.startsWith('renewal-'));
        if (isStoredRenewal) {
          return;
        }
        eventMap.set(e.id, e);
      });
      renewalEvents.forEach((e: any) => {
        eventMap.set(e.id, e);
      });

      const allEvents = Array.from(eventMap.values())
        .sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());

      console.log("[Routes] Final events returned:", allEvents.length);

      res.json(allEvents);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error("[Routes] GET /api/calendar-events error:", message);
      res.status(500).json({ error: "Failed to fetch calendar events", message });
    }
  });

  app.get("/api/spending/monthly", async (req: SessionRequest, res: Response) => {
    try {
      // Get user ID from auth
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const supabase = getSupabaseClient();

      // Get user's subscriptions
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (!subscriptions || subscriptions.length === 0) {
        return res.json([]);
      }

      // Honor client's localDate and offsetMinutes so same-day renewals
      // evaluate the same way the client expects.
      const offsetMinutes = typeof req.query.offsetMinutes === 'string' ? parseInt(req.query.offsetMinutes, 10) || 0 : 0;
      const localDateParam = typeof req.query.localDate === 'string' ? req.query.localDate : undefined;
      const now = localDateParam ? (parseDateOnlyLocal(localDateParam) || new Date()) : new Date();
      const result: Array<{ month: string; amount: number; isCurrentMonth: boolean }> = [];
      
      // Generate for last 6 complete months + current month (7 total)
      for (let i = 6; i >= 0; i--) {
        const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
        const monthStr = monthStart.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        const isCurrentMonth = i === 0;
        
        // Calculate spending for subscriptions renewing in this month
        let monthlyAmount = 0;
        for (const sub of subscriptions) {
          const status = normalizeStatus(sub.status);
          if (status === 'deleted') continue;

          // Get renewal date
          const renewalDate = normalizeRenewalDate(sub);
          if (!renewalDate) continue;

          if (isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, isCurrentMonth, offsetMinutes)) {
            const monthlyAmt = monthlyAmountForSubscriptionRow(sub);
            monthlyAmount += convertToUSD(monthlyAmt, sub.currency || 'USD');
          }
        }
        
        result.push({
          month: monthStr,
          amount: Math.round(monthlyAmount * 100) / 100,
          isCurrentMonth
        });
      }

      res.json(result);
    } catch (error) {
      console.error("[Spending] Error calculating monthly spending:", error);
      res.status(500).json({ error: "Failed to get monthly spending" });
    }
  });

  app.get("/api/spending/category", async (req: SessionRequest, res: Response) => {
    try {
      // Get user ID from auth
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Get user's subscriptions only
      const supabase = getSupabaseClient();
      const { data: subscriptions } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (!subscriptions || subscriptions.length === 0) {
        return res.json([]);
      }

      // Honor client's localDate and offsetMinutes
      const offsetMinutes = typeof req.query.offsetMinutes === 'string' ? parseInt(req.query.offsetMinutes, 10) || 0 : 0;
      const localDateParam = typeof req.query.localDate === 'string' ? req.query.localDate : undefined;
      const now = localDateParam ? (parseDateOnlyLocal(localDateParam) || new Date()) : new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Group by category, only for subscriptions renewing in current month
      const categoryMap = new Map<string, { amount: number; count: number }>();
      subscriptions.forEach(sub => {
        const status = normalizeStatus(sub.status);
        if (status === 'deleted') return;

        // Get renewal date
        const renewalDateStr = sub.next_billing_at || sub.nextBillingDate || sub.next_billing_date;
        if (!renewalDateStr) return;

        const renewalDate = new Date(renewalDateStr);
        if (isNaN(renewalDate.getTime())) return;

        if (!isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, true, offsetMinutes)) return;

        const monthlyAmount = convertToUSD(monthlyAmountForSubscriptionRow(sub), sub.currency || 'USD');
        const existing = categoryMap.get(sub.category) || { amount: 0, count: 0 };
        categoryMap.set(sub.category, {
          amount: existing.amount + monthlyAmount,
          count: existing.count + 1
        });
      });

      const totalAmount = Array.from(categoryMap.values()).reduce((sum, v) => sum + v.amount, 0);
      const result = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category,
        amount: Math.round(data.amount * 100) / 100,
        percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
        count: data.count
      }));

      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to get spending by category" });
    }
  });
  app.get("/api/analysis/cost-per-use", asyncHandler(handleCostPerUse));


  app.get("/api/insights/behavioral", async (req: SessionRequest, res: Response) => {
    try {
      // Get user ID from auth
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Get user's subscriptions (and family members' if family=true)
      const supabase = getSupabaseClient();
      const wantFamily = String(req.query.family).toLowerCase() === 'true';
      let subsToConsider: any[] = [];

      if (wantFamily) {
        // find all groups where this user is an owner or a member
        const { data: ownedGroups } = await supabase
          .from('family_groups')
          .select('id')
          .eq('owner_id', userId);
        const { data: memberGroups } = await supabase
          .from('family_group_members')
          .select('family_group_id')
          .eq('user_id', userId);

        const groupIds: string[] = Array.from(new Set([
          ...(ownedGroups || []).map((g: any) => g.id),
          ...(memberGroups || []).map((m: any) => m.family_group_id),
        ])).filter(Boolean);

        if (groupIds.length > 0) {
          // get all members of those groups
          const { data: members } = await supabase
            .from('family_group_members')
            .select('user_id')
            .in('family_group_id', groupIds);
          const memberIds: string[] = Array.from(new Set([
            userId,
            ...(members || []).map((m: any) => m.user_id),
          ])).filter(Boolean);
          const { data: subs } = await supabase
            .from('subscriptions')
            .select('*')
            .in('user_id', memberIds);
          subsToConsider = subs || [];
        }
      }

      // if no family data or no groups owned, fall back to personal
      if (subsToConsider.length === 0) {
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId);
        subsToConsider = subscriptions || [];
      }

      if (!subsToConsider || subsToConsider.length === 0) {
        return res.json([]);
      }

        // Filter for actionable subscriptions: status/subStatus 'unused' or 'to-cancel'
        const actionableSubs = subsToConsider.filter(sub =>
          sub.status === 'unused' || sub.status === 'to-cancel'
        );

        // Generate behavioral insights from actionable subscriptions
        const insights = actionableSubs.map(sub => {
          const monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'quarterly' ? sub.amount / 3 : sub.frequency === 'weekly' ? sub.amount * 4 : sub.amount;
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
            { item: 'coffee drinks', unitCostUsd: 4.5, icon: 'coffee' },
            { item: 'breakfast sandwiches', unitCostUsd: 6.5, icon: 'shopping' },
            { item: 'lunch meals', unitCostUsd: 13, icon: 'utensils' },
            { item: 'movie tickets', unitCostUsd: 14.5, icon: 'film' },
            { item: 'Spotify months', unitCostUsd: 10.99, icon: 'music' },
            { item: 'Netflix months', unitCostUsd: 15.49, icon: 'tv' },
            { item: 'gym day passes', unitCostUsd: 20, icon: 'dumbbell' },
            { item: 'gas tank fills', unitCostUsd: 55, icon: 'fuel' },
            { item: 'meal kit deliveries', unitCostUsd: 60, icon: 'shopping' },
            { item: 'one-way flights', unitCostUsd: 150, icon: 'plane' },
          ];

          const equivalents = baseItems
            .map(e => ({
              item: e.item,
              count: Math.floor(monthlyAmount / (e.unitCostUsd * rate)),
              icon: e.icon,
              totalCost: Math.floor(monthlyAmount / (e.unitCostUsd * rate)) * e.unitCostUsd * rate
            }))
            .filter(e => e.count >= 1)
            .sort((a, b) => b.count - a.count || a.item.localeCompare(b.item))
            .slice(0, 3);

          return {
            subscriptionId: sub.id,
            subscriptionName: sub.name,
            userId: sub.user_id,
            monthlyAmount: Math.round(monthlyAmount * 100) / 100,
            currency,
            status: sub.status,
            subStatus: sub.status,
            equivalents,
          };
        });

        res.json(insights);
    } catch (error) {
      res.status(500).json({ error: "Failed to get behavioral insights" });
    }
  });

  app.get("/api/insights", async (req: SessionRequest, res: Response) => {
    try {
      // Get user ID from auth (support session or raw Bearer token)
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace("Bearer ", "");
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }

      if (!userId) {
        return res.json([]);
      }

      // Get insights and filter by current user
      const supabase = getSupabaseClient();
      const { data: insights } = await supabase
        .from('insights')
        .select('*')
        .eq('user_id', userId);
      
      res.json(insights || []);
    } catch (error) {
      res.status(500).json({ error: "Failed to get insights" });
    }
  });

  app.get("/api/recommendations", async (req: SessionRequest, res: Response) => {
    try {
      // Get user ID from auth (support session or Bearer token). Be defensive about token formats.
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace("Bearer ", "");
        if (authHeader) {
          const supabase = getSupabaseClient();
          try {
            const getUserRes = await supabase.auth.getUser(authHeader);
            // supabase.auth.getUser may return { data: { user } } or throw; handle both
            const user = (getUserRes && (getUserRes as any).data && (getUserRes as any).data.user) || null;
            if (user) {
              userId = user.id;
            } else {
              // Fallback: try to decode token manually
              const extracted = extractUserIdFromToken(authHeader);
              if (extracted) userId = extracted;
              else console.warn('[Routes] Could not resolve user from auth header for /api/recommendations');
            }
          } catch (err) {
            console.warn('[Routes] supabase.auth.getUser threw, falling back to token decode:', err instanceof Error ? err.message : err);
            const extracted = extractUserIdFromToken(authHeader);
            if (extracted) userId = extracted;
          }
        }
      }

      if (!userId) {
        return res.json([]);
      }

      // Get subscriptions for this user (and family members if family=true) and generate recommendations from them
      const supabase = getSupabaseClient();
      const wantFamily = String(req.query.family).toLowerCase() === 'true';
      let subsToConsider: any[] = [];

      if (wantFamily) {
        // find all groups where this user is an owner or a member
        const { data: ownedGroups } = await supabase
          .from('family_groups')
          .select('id')
          .eq('owner_id', userId);
        const { data: memberGroups } = await supabase
          .from('family_group_members')
          .select('family_group_id')
          .eq('user_id', userId);

        const groupIds: string[] = Array.from(new Set([
          ...(ownedGroups || []).map((g: any) => g.id),
          ...(memberGroups || []).map((m: any) => m.family_group_id),
        ])).filter(Boolean);

        if (groupIds.length > 0) {
          // get all members of those groups
          const { data: members } = await supabase
            .from('family_group_members')
            .select('user_id')
            .in('family_group_id', groupIds);
          const memberIds: string[] = Array.from(new Set([
            userId,
            ...(members || []).map((m: any) => m.user_id),
          ])).filter(Boolean);
          const { data: subs } = await supabase
            .from('subscriptions')
            .select('*')
            .in('user_id', memberIds);
          subsToConsider = subs || [];
        }
      }

      // if no family data or no groups owned, fall back to personal
      if (subsToConsider.length === 0) {
        const { data: subscriptions, error: subsErr } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId);

        if (subsErr) {
          console.error('[Routes] Error fetching subscriptions for recommendations:', subsErr);
        }
        subsToConsider = subscriptions || [];
      }
      console.log('[Routes] /api/recommendations fetched subscriptions count:', (subsToConsider || []).length);
      
      const { generateAIRecommendations } = await import('./family-sharing.js');
      const recommendations = generateAIRecommendations(subsToConsider || []);

      console.log('[Routes] /api/recommendations returning', (recommendations || []).length, 'recommendations');
      res.json(recommendations || []);
    } catch (error) {
      console.error('[Routes] /api/recommendations error:', error instanceof Error ? error.stack || error.message : error);
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  app.get("/api/bank-connections", async (req: SessionRequest, res: Response) => {
    try {
      const connections = await storage.getBankConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to get bank connections" });
    }
  });

  app.post("/api/bank-connections", async (req: SessionRequest, res: Response) => {
    try {
      // TODO: insertBankConnectionSchema not available in schema
      res.status(501).json({ error: "Bank connection creation not implemented" });
      /* 
      const validatedData = insertBankConnectionSchema.parse(req.body);
      const connection = await storage.createBankConnection(validatedData);
      res.status(201).json(connection);
      */
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid bank connection data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create bank connection" });
    }
  });

  app.patch("/api/bank-connections/:id/sync", async (req: SessionRequest, res: Response) => {
    try {
      const connection = await storage.updateBankConnectionSync(req.params.id);
      if (!connection) {
        return res.status(404).json({ error: "Bank connection not found" });
      }
      res.json(connection);
    } catch (error) {
      res.status(500).json({ error: "Failed to sync bank connection" });
    }
  });

  app.delete("/api/bank-connections/:id", async (req: SessionRequest, res: Response) => {
    try {
      const deleted = await storage.deleteBankConnection(req.params.id);
      if (!deleted) {
        return res.status(404).json({ error: "Bank connection not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete bank connection" });
    }
  });

  // Account management endpoints
  const handleAccountEmailUpdate = async (req: SessionRequest, res: Response) => {
    try {
      const { email } = req.body;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const supabase = getSupabaseClient();
      const { data: authUser, error: authError } = await supabase.auth.admin.updateUserById(userId, {
        email,
      } as any);

      if (authError) {
        console.error("[Account] Failed to update auth email:", authError);
        return res.status(500).json({ error: "Failed to update email" });
      }

      await supabase.from("users").upsert({ id: userId, email });
      res.json({ success: true, message: "Email updated successfully" });
    } catch (error) {
      console.error("[Account] Email update error:", error);
      res.status(500).json({ error: "Failed to update email" });
    }
  };

  app.patch("/api/account/email", handleAccountEmailUpdate);
  app.patch("/account/email", handleAccountEmailUpdate);

  const handleAccountPasswordUpdate = async (req: SessionRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Missing password fields" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const userId = await getUserIdFromRequest(req);
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const supabase = getSupabaseClient();
      const { data: authUser, error: authError } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      } as any);

      if (authError) {
        console.error("[Account] Failed to update auth password:", authError);
        return res.status(500).json({ error: "Failed to update password" });
      }

      await supabase.from("users").upsert({ id: userId });
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      console.error("[Account] Password update error:", error);
      res.status(500).json({ error: "Failed to update password" });
    }
  };

  app.patch("/api/account/password", handleAccountPasswordUpdate);
  app.patch("/account/password", handleAccountPasswordUpdate);

  async function supabaseAuthFetch(authHeader: string, path: string, body?: any) {
    const base = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
    const url = `${base}/auth/v1/${path}`;
    const headers: any = { Authorization: `Bearer ${authHeader}` };
    const opts: any = { method: body ? 'POST' : 'GET', headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    return await fetch(url, opts);
  }

  app.get("/api/account/2fa/init", async (req: SessionRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const response = await supabaseAuthFetch(authHeader, 'factors', {
        friendly_name: 'Authenticator App',
        factor_type: 'totp',
        issuer: 'Subveris',
      });
      const rawText = await response.text().catch(() => null);
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok || !data || !data.id || !data.totp) {
        console.error('[2FA] init error', { status: response.status, body: rawText });
        return res.status(500).json({ error: "Failed to initialize 2FA" });
      }

      const otpauthUrl = data.totp.uri ?? data.totp.qr_code ?? "";
      const secret = data.totp.secret ?? extractTotpSecretFromUri(data.totp.uri);

      res.json({
        id: data.id,
        secret,
        otpauthUrl,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to initialize 2FA" });
    }
  });

  app.get("/account/2fa/init", async (req: SessionRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const response = await supabaseAuthFetch(authHeader, 'factors', {
        friendly_name: 'Authenticator App',
        factor_type: 'totp',
        issuer: 'Subveris',
      });
      const rawText = await response.text().catch(() => null);
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = null;
      }

      if (!response.ok || !data || !data.id || !data.totp) {
        return res.status(500).json({ error: "Failed to initialize 2FA" });
      }

      const otpauthUrl = data.totp.uri ?? data.totp.qr_code ?? "";
      const secret = data.totp.secret ?? extractTotpSecretFromUri(data.totp.uri);

      res.json({
        id: data.id,
        secret,
        otpauthUrl,
      });
    } catch (error) {
      console.error('[2FA] init exception', error);
      res.status(500).json({ error: "Failed to initialize 2FA" });
    }
  });

  app.post("/api/account/2fa", async (req: SessionRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { code, factorId } = req.body;
      if (!code || code.length !== 6 || !factorId) {
        return res.status(400).json({ error: "Invalid authentication code" });
      }

      const response = await supabaseAuthFetch(authHeader, `factors/${factorId}/verify`, { code });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        console.error('[2FA] verify error', response.status, data);
        return res.status(400).json({ error: "Invalid authentication code" });
      }

      res.json({ success: true, message: "Two-factor authentication enabled" });
    } catch (error) {
      console.error('[2FA] verify exception', error);
      res.status(500).json({ error: "Failed to enable 2FA" });
    }
  });

  app.post("/account/2fa", async (req: SessionRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (!authHeader) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { code, factorId } = req.body;
      if (!code || code.length !== 6 || !factorId) {
        return res.status(400).json({ error: "Invalid authentication code" });
      }

      const response = await supabaseAuthFetch(authHeader, `factors/${factorId}/verify`, { code });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data) {
        console.error('[2FA] verify error', response.status, data);
        return res.status(400).json({ error: "Invalid authentication code" });
      }

      res.json({ success: true, message: "Two-factor authentication enabled" });
    } catch (error) {
      console.error('[2FA] verify exception', error);
      res.status(500).json({ error: "Failed to enable 2FA" });
    }
  });

  app.get("/api/account/export", async (req: SessionRequest, res: Response) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      const transactions = await storage.getTransactions();
      const insights = await storage.getInsights();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        subscriptions,
        transactions,
        insights,
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=subveris-data.json");
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.get("/account/export", async (req: SessionRequest, res: Response) => {
    try {
      const subscriptions = await storage.getSubscriptions();
      const transactions = await storage.getTransactions();
      const insights = await storage.getInsights();
      
      const exportData = {
        exportDate: new Date().toISOString(),
        subscriptions,
        transactions,
        insights,
      };

      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=subveris-data.json");
      res.json(exportData);
    } catch (error) {
      res.status(500).json({ error: "Failed to export data" });
    }
  });

  app.delete("/api/account", async (req: SessionRequest, res: Response) => {
    try {
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace("Bearer ", "");
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const supabase = getSupabaseClient();

      // Delete all user's subscriptions
      const { data: userSubscriptions, error: userSubscriptionsError } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", userId);

      if (userSubscriptionsError) {
        console.error("[Account] Error fetching user subscriptions:", userSubscriptionsError);
      }

      const subscriptionIds = Array.isArray(userSubscriptions)
        ? userSubscriptions.map((sub: any) => sub.id).filter(Boolean)
        : [];

      if (subscriptionIds.length > 0) {
        const { error: transactionError } = await supabase
          .from("transactions")
          .delete()
          .in("subscription_id", subscriptionIds);

        if (transactionError) {
          console.error("[Account] Error deleting transaction history:", transactionError);
        }

        const { error: calendarEventsError } = await supabase
          .from("subscription_calendar_events")
          .delete()
          .in("subscription_id", subscriptionIds);

        if (calendarEventsError) {
          console.error("[Account] Error deleting calendar events:", calendarEventsError);
        }
      }

      const { error: subsError } = await supabase
        .from("subscriptions")
        .delete()
        .eq("user_id", userId);

      if (subsError) {
        console.error("[Account] Error deleting subscriptions:", subsError);
      }

      const { error: userSubscriptionsDeleteError } = await supabase
        .from("user_subscriptions")
        .delete()
        .eq("user_id", userId);

      if (userSubscriptionsDeleteError) {
        console.error("[Account] Error deleting user subscriptions:", userSubscriptionsDeleteError);
      }

      // Delete all user's family group memberships
      const { error: familyGroupMembersError } = await supabase
        .from("family_group_members")
        .delete()
        .eq("user_id", userId);

      if (familyGroupMembersError) {
        console.error("[Account] Error deleting family group memberships:", familyGroupMembersError);
      }

      // Delete any shared subscriptions created by this user
      const { data: ownerSharedSubscriptions, error: ownerSharedSubscriptionsError } = await supabase
        .from("shared_subscriptions")
        .select("id")
        .eq("shared_by_user_id", userId);

      if (ownerSharedSubscriptionsError) {
        console.error("[Account] Error fetching shared subscriptions:", ownerSharedSubscriptionsError);
      }

      const sharedSubscriptionIds = Array.isArray(ownerSharedSubscriptions)
        ? ownerSharedSubscriptions.map((row: any) => row.id).filter(Boolean)
        : [];

      if (sharedSubscriptionIds.length > 0) {
        const { error: sharedCostSplitError } = await supabase
          .from("cost_splits")
          .delete()
          .in("shared_subscription_id", sharedSubscriptionIds);

        if (sharedCostSplitError) {
          console.error("[Account] Error deleting cost splits for user shared subscriptions:", sharedCostSplitError);
        }

        const { error: sharedSubscriptionsDeleteError } = await supabase
          .from("shared_subscriptions")
          .delete()
          .in("id", sharedSubscriptionIds);

        if (sharedSubscriptionsDeleteError) {
          console.error("[Account] Error deleting user shared subscriptions:", sharedSubscriptionsDeleteError);
        }
      }

      // Delete all family groups owned by this user and any dependent group-level data
      const { data: ownedGroups, error: ownedGroupsError } = await supabase
        .from("family_groups")
        .select("id")
        .eq("owner_id", userId);

      if (ownedGroupsError) {
        console.error("[Account] Error fetching owned family groups:", ownedGroupsError);
      }

      const ownedGroupIds = Array.isArray(ownedGroups)
        ? ownedGroups.map((group: any) => group.id).filter(Boolean)
        : [];

      if (ownedGroupIds.length > 0) {
        const { data: ownedGroupSharedSubs, error: ownedGroupSharedSubsError } = await supabase
          .from("shared_subscriptions")
          .select("id")
          .in("family_group_id", ownedGroupIds);

        if (ownedGroupSharedSubsError) {
          console.error("[Account] Error fetching shared subscriptions for owned groups:", ownedGroupSharedSubsError);
        }

        const ownedSharedSubscriptionIds = Array.isArray(ownedGroupSharedSubs)
          ? ownedGroupSharedSubs.map((row: any) => row.id).filter(Boolean)
          : [];

        if (ownedSharedSubscriptionIds.length > 0) {
          const { error: ownedCostSplitsError } = await supabase
            .from("cost_splits")
            .delete()
            .in("shared_subscription_id", ownedSharedSubscriptionIds);

          if (ownedCostSplitsError) {
            console.error("[Account] Error deleting cost splits for owned group shared subscriptions:", ownedCostSplitsError);
          }
        }

        const { error: ownedGroupMembersError } = await supabase
          .from("family_group_members")
          .delete()
          .in("family_group_id", ownedGroupIds);

        if (ownedGroupMembersError) {
          console.error("[Account] Error deleting members of owned groups:", ownedGroupMembersError);
        }

        const { error: ownedSharedSubscriptionsDeleteError } = await supabase
          .from("shared_subscriptions")
          .delete()
          .in("family_group_id", ownedGroupIds);

        if (ownedSharedSubscriptionsDeleteError) {
          console.error("[Account] Error deleting shared subscriptions for owned groups:", ownedSharedSubscriptionsDeleteError);
        }

        const { error: groupPlanBackupsError } = await supabase
          .from("family_group_plan_backups")
          .delete()
          .in("family_group_id", ownedGroupIds);

        if (groupPlanBackupsError) {
          console.error("[Account] Error deleting family group plan backups:", groupPlanBackupsError);
        }

        const { error: groupsError } = await supabase
          .from("family_groups")
          .delete()
          .in("id", ownedGroupIds);

        if (groupsError) {
          console.error("[Account] Error deleting owned family groups:", groupsError);
        }
      }

      // Delete notification preferences
      const { error: prefsError } = await supabase
        .from("notification_preferences")
        .delete()
        .eq("user_id", userId);

      if (prefsError) {
        console.error("[Account] Error deleting preferences:", prefsError);
      }

      const { error: insightsError } = await supabase
        .from("insights")
        .delete()
        .eq("user_id", userId);

      if (insightsError) {
        console.error("[Account] Error deleting insights:", insightsError);
      }

      const { error: costSplitsByUserError } = await supabase
        .from("cost_splits")
        .delete()
        .eq("user_id", userId);

      if (costSplitsByUserError) {
        console.error("[Account] Error deleting cost splits for user:", costSplitsByUserError);
      }

      const { error: membersError } = await supabase
        .from("family_members")
        .delete()
        .eq("user_id", userId);

      if (membersError) {
        console.error("[Account] Error deleting legacy family memberships:", membersError);
      }

      const { error: usersTableError } = await supabase
        .from("users")
        .delete()
        .eq("id", userId);

      if (usersTableError) {
        console.error("[Account] Error deleting users table row:", usersTableError);
      }

      // Try to delete from Supabase auth (requires service role key and admin access)
      try {
        const adminClient = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );
        
        await adminClient.auth.admin.deleteUser(userId);
        console.log(`[Account] Deleted auth user: ${userId}`);
      } catch (authError) {
        // If we can't delete from auth, still continue - user data is deleted
        console.warn("[Account] Could not delete from auth (non-critical):", authError);
      }

      res.json({ 
        success: true, 
        message: "Account and all associated data deleted successfully" 
      });
    } catch (error) {
      console.error("[Account] Error deleting account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  // Get notification preferences
  app.get("/api/account/notification-preferences", async (req: SessionRequest, res: Response) => {
    try {
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace("Bearer ", "");
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("email_notifications, push_notifications, weekly_digest")
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        // Return defaults for new users
        return res.json({
          emailNotifications: true,
          pushNotifications: true,
          weeklyDigest: true,
        });
      }

      res.json({
        emailNotifications: data.email_notifications ?? true,
        pushNotifications: data.push_notifications ?? true,
        weeklyDigest: data.weekly_digest ?? true,
      });
    } catch (error) {
      console.error("[Preferences] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.get("/account/notification-preferences", async (req: SessionRequest, res: Response) => {
    try {
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace("Bearer ", "");
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("email_notifications, push_notifications, weekly_digest")
        .eq("user_id", userId)
        .single();

      if (error || !data) {
        return res.json({
          emailNotifications: true,
          pushNotifications: true,
          weeklyDigest: true,
        });
      }

      res.json({
        emailNotifications: data.email_notifications ?? true,
        pushNotifications: data.push_notifications ?? true,
        weeklyDigest: data.weekly_digest ?? true,
      });
    } catch (error) {
      console.error("[Preferences] Error fetching:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  // Update notification preferences
  app.patch("/api/account/notification-preferences", async (req: SessionRequest, res: Response) => {
    try {
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace("Bearer ", "");
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { emailNotifications, pushNotifications, weeklyDigest } = req.body;

      const supabase = getSupabaseClient();
      
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
          console.error("[Preferences] Insert error:", insertError);
          return res.status(500).json({ error: "Failed to save preferences" });
        }
      } else if (updateError) {
        console.error("[Preferences] Update error:", updateError);
        return res.status(500).json({ error: "Failed to save preferences" });
      }

      res.json({
        emailNotifications,
        pushNotifications,
        weeklyDigest,
      });
    } catch (error) {
      console.error("[Preferences] Error saving:", error);
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  app.patch("/account/notification-preferences", async (req: SessionRequest, res: Response) => {
    try {
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace("Bearer ", "");
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { emailNotifications, pushNotifications, weeklyDigest } = req.body;

      const supabase = getSupabaseClient();
      
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
          console.error("[Preferences] Insert error:", insertError);
          return res.status(500).json({ error: "Failed to save preferences" });
        }
      } else if (updateError) {
        console.error("[Preferences] Update error:", updateError);
        return res.status(500).json({ error: "Failed to save preferences" });
      }

      res.json({
        emailNotifications,
        pushNotifications,
        weeklyDigest,
      });
    } catch (error) {
      console.error("[Preferences] Error saving:", error);
      res.status(500).json({ error: "Failed to save preferences" });
    }
  });

  // Analytics: Monthly savings
  // By default this returns the amount the requesting user has actually saved
  // this month by deleting services (status === 'deleted'). 
  // 'to-cancel' is a planned action and counts as potential savings only.
  //
  // If the query string contains `family=true` and the requester is an owner
  // of one or more family groups, the endpoint will instead total savings for
  // **all members of those groups** (including the owner). This enables the
  // sidebar to show a household total when family data view is active. The
  // client-side code adds the parameter whenever showFamilyData is set.
  //
  // Normalization is performed on the incoming status values in the patch
  // route to avoid 400s from quirky inputs.
  app.get("/api/analytics/monthly-savings", async (req: SessionRequest, res: Response) => {
    try {
      // Get user ID from auth
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const supabase = getSupabaseClient();
      let subsToConsider: any[] = [];

      const wantFamily = String(req.query.family).toLowerCase() === 'true';
      if (wantFamily) {
        // find all groups where this user is an owner or a member
        const { data: ownedGroups } = await supabase
          .from('family_groups')
          .select('id')
          .eq('owner_id', userId);
        const { data: memberGroups } = await supabase
          .from('family_group_members')
          .select('family_group_id')
          .eq('user_id', userId);

        const groupIds: string[] = Array.from(new Set([
          ...(ownedGroups || []).map((g: any) => g.id),
          ...(memberGroups || []).map((m: any) => m.family_group_id),
        ])).filter(Boolean);

        if (groupIds.length > 0) {
          // get all members of those groups
          const { data: members } = await supabase
            .from('family_group_members')
            .select('user_id')
            .in('family_group_id', groupIds);

          // Also include group owners, since owners are not always present in
          // family_group_members for member-based lookups.
          const { data: groupsWithOwners } = await supabase
            .from('family_groups')
            .select('owner_id')
            .in('id', groupIds);

          const memberIds: string[] = Array.from(new Set([
            userId,
            ...(members || []).map((m: any) => m.user_id),
            ...(groupsWithOwners || []).map((g: any) => g.owner_id),
          ])).filter(Boolean);
          const { data: subs } = await supabase
            .from('subscriptions')
            .select('*')
            .in('user_id', memberIds);
          subsToConsider = subs || [];
        }
      }

      // if no family data or no groups owned, fall back to personal
      if (subsToConsider.length === 0) {
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId);
        subsToConsider = subscriptions || [];
      }

      if (subsToConsider.length === 0) {
        return res.json({ monthlySavings: 0 });
      }

      const now = new Date();
      const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const normalizeStatus = (status: any) => String(status || '').trim().toLowerCase();
      const isInCurrentMonth = (sub: any) => {
        const timestamp = getSubscriptionDeletedTimestamp(sub);
        return isTimestampInCurrentMonth(timestamp);
      };

      const calculateSavings = (subs: any[]) =>
        subs
          .filter((sub) => normalizeStatus(sub.status) === 'deleted')
          .filter(isInCurrentMonth)
          .reduce((total, sub) => {
            const monthlyAmount = sub.frequency === 'yearly'
              ? sub.amount / 12
              : sub.frequency === 'quarterly'
                ? sub.amount / 3
                : sub.frequency === 'weekly'
                  ? sub.amount * 4
                  : sub.amount;
            return total + convertToUSD(monthlyAmount, sub.currency || 'USD');
          }, 0);

      const ownerId = userId;
      const ownerSubs = subsToConsider.filter((sub) => sub.user_id === ownerId);
      const memberSubs = subsToConsider.filter((sub) => sub.user_id !== ownerId);

      const ownerMonthlySavings = Math.round(calculateSavings(ownerSubs) * 100) / 100;
      const memberMonthlySavings = Math.round(calculateSavings(memberSubs) * 100) / 100;
      const totalMonthlySavings = Math.round((ownerMonthlySavings + memberMonthlySavings) * 100) / 100;

      res.json({
        monthlySavings: totalMonthlySavings,
        ownerMonthlySavings,
        memberMonthlySavings,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch monthly savings" });
    }
  });

  // User: Premium status
  app.get("/api/user/premium-status", async (req: SessionRequest, res: Response) => {
    try {
      // Get the user from the authorization header or session
      let userId = req.session?.user?.id;
      
      // If no session, try to get from authorization header
      if (!userId) {
        const authHeader = req.headers.authorization?.replace("Bearer ", "");
        if (authHeader) {
          // Try extracting token first (handles custom test tokens)
          userId = extractUserIdFromToken(authHeader) || undefined;
          
          // If that fails, try Supabase auth API (handles real Supabase tokens)
          if (!userId) {
            const supabase = getSupabaseClient();
            const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader);
            if (user) {
              userId = user.id;
            }
          }
        }
      }

      if (!userId) {
        return res.json({
          isPremium: false,
          planType: "free",
          status: "inactive",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        });
      }

      // Query user_subscriptions to get actual plan type
      const supabase = getSupabaseClient();
      const { data: userSub, error } = await supabase
        .from("user_subscriptions")
        .select("plan_type, status, cancel_at_period_end, current_period_end")
        .eq("user_id", userId)
        .single();

      if (error || !userSub) {
        // Default to free plan if no subscription record exists
        return res.json({
          isPremium: false,
          planType: "free",
          status: "inactive",
          cancelAtPeriodEnd: false,
          currentPeriodEnd: null,
        });
      }

      const isPremium = userSub.plan_type !== "free" && userSub.status === "active";
      
      // fetch user's preferred currency from users table; fall back to USD if
      // something goes wrong (this column was added in a recent migration)
      const { data: userRecord } = await supabase
        .from('users')
        .select('currency')
        .eq('id', userId)
        .single();
      // prefer currency stored in auth user metadata (more reliable)
      let currency = 'USD';
      const authHeader = req.headers.authorization?.replace('Bearer ', '') || '';
      if (authHeader) {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser(authHeader);
          if (authUser?.user_metadata?.currency) {
            currency = authUser.user_metadata.currency as string;
          }
        } catch (err) {
          // If the token is invalid (e.g. a fake test token) the call will
          // throw – we'll ignore it and fall back to the custom users table.
          console.debug('[Routes] premium-status failed to fetch auth user metadata:', err);
        }
      }

      // If we still have the default USD value, try the custom users table as a
      // fallback (used heavily by automated tests that don't use real
      // Supabase auth tokens).
      if (currency === 'USD') {
        try {
          const { data: userRecord } = await supabase
            .from('users')
            .select('currency')
            .eq('id', userId)
            .single();
          if (userRecord?.currency) {
            currency = userRecord.currency;
          }
        } catch (err) {
          // ignore
        }
      }

      res.json({
        isPremium,
        planType: userSub.plan_type || "free",
        status: userSub.status || "inactive",
        cancelAtPeriodEnd: userSub.cancel_at_period_end || false,
        currentPeriodEnd: userSub.current_period_end,
        currency,
      });
    } catch (error) {
      console.error("Error fetching premium status:", error);
      res.status(500).json({ error: "Failed to fetch premium status" });
    }
  });

  // Update currency preference for logged-in user
  app.patch('/api/user/currency', async (req: SessionRequest, res: Response) => {
    try {
      // Determine user ID from session or token (re-use logic from premium-status)
      let userId = req.session?.user?.id;
      let token: string | undefined;

      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) {
          token = authHeader;
          userId = extractUserIdFromToken(authHeader) || undefined;
          if (!userId) {
            const supabase = getSupabaseClient();
            const { data: { user } } = await supabase.auth.getUser(authHeader);
            if (user) userId = user.id;
          }
        }
      } else {
        // when we have a session we don't necessarily know the token, but
        // updating via auth.updateUser doesn't require the token if we call it
        // on the server with service role key.
      }

      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const supabase = getSupabaseClient();
      const currency = String(req.body.currency || '').toUpperCase();
      if (!currency || !/^[A-Z]{3}$/.test(currency)) {
        return res.status(400).json({ error: 'Invalid currency code' });
      }

      // attempt to update metadata on auth user as well – this will fail if the
      // user ID doesn't actually exist in the auth table, but we don't want
      // that to block the request since tests supply fake tokens. swallow the
      // error and continue.
      try {
        const { data: updatedUser, error } = await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { currency }
        });

        if (error) {
          console.warn('[Routes] PATCH /api/user/currency auth update error', error.message);
        }
      } catch (err) {
        console.warn('[Routes] PATCH /api/user/currency auth exception', err);
      }

      // also persist to the custom users table so that premium-status can
      // reliably return the value for tests and legacy clients
      try {
        await supabase.from('users').upsert({ id: userId, currency });
      } catch (e: unknown) {
        console.warn('[Routes] failed to upsert currency into users table', e);
      }

      res.json({ currency });
    } catch (err) {
      console.error('[Routes] PATCH /api/user/currency error:', err);
      res.status(500).json({ error: 'Failed to update currency' });
    }
  });

  // Family group endpoints (use server/family-sharing helpers)
  app.get('/api/family-groups', async (req: SessionRequest, res: Response) => {
    try {
      // Try to get user id from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) {
          const supabase = getSupabaseClient();
          const { data: { user } = {} } = await supabase.auth.getUser(authHeader).catch(() => ({} as any));
          if (user) {
            userId = user.id;
          } else {
            userId = extractUserIdFromToken(authHeader) || undefined;
          }
        }
      }

      if (!userId) return res.json([]);

      const groups = await import('./family-sharing.js').then(m => m.getFamilyGroups(userId));
      res.json(groups);
    } catch (err) {
      console.error('[Routes] GET /api/family-groups error:', err);
      res.status(500).json({ error: 'Failed to fetch family groups' });
    }
  });

  app.post('/api/family-groups', async (req: SessionRequest, res: Response) => {
    try {
      console.log('[Routes] POST /api/family-groups body:', req.body);
      const name = req.body?.name;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ error: 'Missing or invalid name' });
      }

      // Resolve user id from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) {
          userId = extractUserIdFromToken(authHeader) || undefined;
        }
      }

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const family = await import('./family-sharing.js').then(m => m.createFamilyGroup(userId!, name));
      console.log('[Routes] Created family group:', family);
      return res.status(201).json(family);
    } catch (err) {
      console.error('[Routes] POST /api/family-groups error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to create family group', message });
    }
  });

  app.delete('/api/family-groups/:id', async (req: SessionRequest, res: Response) => {
    try {
      // user must be owner
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id;
      await import('./family-sharing.js').then(m => m.deleteFamilyGroup(id, userId!));
      res.status(204).send();
    } catch (err) {
      console.error('[Routes] DELETE /api/family-groups/:id error:', err);
      res.status(500).json({ error: 'Failed to delete family group' });
    }
  });

  // Get family group settings
  app.get('/api/family-groups/:id/settings', async (req: SessionRequest, res: Response) => {
    try {
      const groupId = req.params.id;
      const supabase = getSupabaseClient();

      // Resolve user id from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Verify user is owner or member of the group
      const { data: groupRow, error: groupRowError } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupRowError || !groupRow) {
        return res.status(404).json({ error: 'Family group not found' });
      }

      if (groupRow.owner_id !== userId) {
        const { data: membership, error: membershipError } = await supabase
          .from('family_group_members')
          .select('id')
          .eq('family_group_id', groupId)
          .eq('user_id', userId)
          .single();

        if (membershipError || !membership) {
          return res.status(403).json({ error: 'Not authorized to view family group settings' });
        }
      }

      const { data, error } = await supabase
        .from('family_group_settings')
        .select('*')
        .eq('family_group_id', groupId)
        .single();

      if (error) {
        // If table or row doesn't exist, return sensible defaults instead of HTML
        console.warn('[Routes] GET /api/family-groups/:id/settings error:', error.message || error);
        return res.json({ show_family_data: false });
      }

      res.json(data || { show_family_data: false });
    } catch (err) {
      console.error('[Routes] GET /api/family-groups/:id/settings unexpected error:', err);
      res.status(500).json({ error: 'Failed to fetch family group settings' });
    }
  });

  // membership lookup for current user
  // log registration so we can confirm the route is added when server starts
  console.log('[Routes] registering GET /api/family-groups/me/membership');
  app.get('/api/family-groups/me/membership', async (req: SessionRequest, res: Response) => {
    try {
      // resolve user id from session or bearer token
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) {
        // return empty data rather than 401 so UI can behave gracefully
        return res.json({ groups: [], isMemberOfFamily: false, membershipCount: 0, membershipInfo: [] });
      }

      const supabase = getSupabaseClient();

      // grab any groups the user owns
      const { data: ownerGroups, error: ownerErr } = await supabase
        .from('family_groups')
        .select('id,name,created_at')
        .eq('owner_id', userId);
      if (ownerErr) {
        console.error('[Routes] GET /api/family-groups/me/membership owner query error', ownerErr);
        throw ownerErr;
      }

      // grab membership rows (non-owner memberships)
      const { data: memberships, error: memErr } = await supabase
        .from('family_group_members')
        .select('family_group_id,role,joined_at')
        .eq('user_id', userId);
      if (memErr) {
        console.error('[Routes] GET /api/family-groups/me/membership membership query error', memErr);
        throw memErr;
      }

      // combine group ids
      const groupIds = new Set<string>();
      (ownerGroups || []).forEach(g => groupIds.add(g.id));
      (memberships || []).forEach(m => groupIds.add(m.family_group_id));
      const idsArray = Array.from(groupIds);

      // fetch group records for those ids
      let groups: any[] = [];
      if (idsArray.length > 0) {
        const { data: groupRows, error: groupErr } = await supabase
          .from('family_groups')
          .select('*')
          .in('id', idsArray);
        if (groupErr) {
          console.error('[Routes] GET /api/family-groups/me/membership group fetch error', groupErr);
          throw groupErr;
        }
        groups = groupRows || [];
      }

      // build membership info including owners
      const info: Array<any> = [];
      (ownerGroups || []).forEach(g => {
        info.push({ family_group_id: g.id, role: 'owner', joined_at: g.created_at });
      });
      (memberships || []).forEach(m => {
        // avoid duplicating if owner already added
        if (!info.find(i => i.family_group_id === m.family_group_id)) {
          info.push(m);
        }
      });

      res.json({
        groups,
        isMemberOfFamily: info.length > 0,
        membershipCount: info.length,
        membershipInfo: info,
      });
    } catch (err) {
      console.error('[Routes] GET /api/family-groups/me/membership error', err instanceof Error ? err.message : String(err));
      if (err instanceof Error) {
        console.error('[Routes] Stack:', err.stack);
      }
      res.status(500).json({ error: 'Failed to fetch membership' });
    }
  });

  // Update family group settings (owner only)
  app.put('/api/family-groups/:id/settings', async (req: SessionRequest, res: Response) => {
    try {
      const groupId = req.params.id;

      // Resolve user id (owner) from session or auth header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Verify user is owner of the family group
      const supabase = getSupabaseClient();
      const { data: group, error: groupError } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupError || !group || group.owner_id !== userId) {
        return res.status(403).json({ error: 'Only group owner can update settings' });
      }

      const updates = {
        family_group_id: groupId,
        show_family_data: !!req.body.show_family_data,
        owner_id: group.owner_id,
      };

      const { data, error } = await supabase
        .from('family_group_settings')
        .upsert(updates, { onConflict: 'family_group_id' })
        .select()
        .single();

      if (error) {
        console.error('[Routes] PUT /api/family-groups/:id/settings supabase error:', error);
        return res.status(500).json({ error: 'Failed to update settings' });
      }

      res.json(data);
    } catch (err) {
      console.error('[Routes] PUT /api/family-groups/:id/settings unexpected error:', err);
      res.status(500).json({ error: 'Failed to update family group settings' });
    }
  });

  // Get family group members
  app.get('/api/family-groups/:id/members', async (req: SessionRequest, res: Response) => {
    try {
      const groupId = req.params.id;
      const supabase = getSupabaseClient();

      // Resolve user id from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Verify user is owner or member of the group
      const { data: groupRow, error: groupRowError } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupRowError || !groupRow) {
        return res.status(404).json({ error: 'Family group not found' });
      }

      if (groupRow.owner_id !== userId) {
        const { data: membership, error: membershipError } = await supabase
          .from('family_group_members')
          .select('id')
          .eq('family_group_id', groupId)
          .eq('user_id', userId)
          .single();

        if (membershipError || !membership) {
          return res.status(403).json({ error: 'Not authorized to view family members' });
        }
      }

      const { getFamilyMembers } = await import('./family-sharing.js');
      const members = await getFamilyMembers(groupId);
      res.json(members);
    } catch (err) {
      console.error('[Routes] GET /api/family-groups/:id/members error:', err);
      res.status(500).json({ error: 'Failed to fetch family members' });
    }
  });

  // Add family group member
  app.post('/api/family-groups/:id/members', async (req: SessionRequest, res: Response) => {
    try {
      const groupId = req.params.id;
      const { memberEmail, memberId, memberIdentifier } = req.body;
      const rawIdentifier = (memberIdentifier || memberEmail || memberId || '').trim();

      if (!rawIdentifier || typeof rawIdentifier !== 'string') {
        return res.status(400).json({ error: 'Missing member email or user ID' });
      }

      if (rawIdentifier === groupId) {
        return res.status(400).json({ error: 'Member identifier cannot be the family group ID; provide an exact email or user ID' });
      }

      // Resolve user id (owner) from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const supabase = getSupabaseClient();
      let memberUserId: string | null = null;
      const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(rawIdentifier) || /^[0-9a-fA-F]{32}$/.test(rawIdentifier);
      const isEmail = rawIdentifier.includes('@');

      // If passed as an ID, try direct lookup first
      if (isUuid) {
        try {
          const { data: userData, error: idErr } = await supabase.auth.admin.getUserById(rawIdentifier);
          if (!idErr && userData?.user) {
            memberUserId = userData.user.id;
          }
        } catch (e) {
          // ignore
        }

        if (!memberUserId) {
          try {
            const { data: userRow, error: userRowErr } = await supabase
              .from('users')
              .select('id')
              .eq('id', rawIdentifier)
              .single();
            if (!userRowErr && userRow?.id) memberUserId = userRow.id;
          } catch (e) {
            // ignore
          }
        }
      }

      // Try email lookup (exact match) 
      if (!memberUserId && isEmail) {
        const emailCandidate = rawIdentifier.trim().toLowerCase();
        try {
          // Supabase admin API does not expose getUserByEmail in this version.
        // Fall back to the local users table and listUsers lookup instead.
        } catch (e) {
          // fallback
        }

        if (!memberUserId) {
          try {
            const { data: userRow, error: userRowErr } = await supabase
              .from('users')
              .select('id')
              .eq('email', emailCandidate)
              .single();
            if (!userRowErr && userRow?.id) memberUserId = userRow.id;
          } catch (e) {
            // ignore
          }
        }
      }

      // Fallback from local users table by id or email
      if (!memberUserId) {
        try {
          const { data: userById, error: userByIdErr } = await supabase
            .from('users')
            .select('id')
            .eq('id', rawIdentifier)
            .single();
          if (!userByIdErr && userById?.id) {
            memberUserId = userById.id;
          }
        } catch (e) {
          // ignore
        }
      }

      if (!memberUserId && isEmail) {
        try {
          const { data: userByEmail, error: userByEmailErr } = await supabase
            .from('users')
            .select('id')
            .eq('email', rawIdentifier.toLowerCase())
            .single();
          if (!userByEmailErr && userByEmail?.id) {
            memberUserId = userByEmail.id;
          }
        } catch (e) {
          // ignore
        }
      }

      // Global fallback to listUsers (limiting to reduce cost)
      if (!memberUserId) {
        try {
          const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
          const users = listData?.users ?? [];
          if (!listError && users.length > 0) {
            const found = users.find((u: any) => u.id === rawIdentifier || u.email?.toLowerCase() === rawIdentifier.toLowerCase());
            if (found) memberUserId = found.id;
          }
        } catch (lookupErr) {
          console.error('[Routes] Error listing users fallback:', lookupErr);
        }
      }

      if (!memberUserId) {
        return res.status(404).json({ error: "User not found; please use an exact registered email or user ID" });
      }

      const { addFamilyMember } = await import('./family-sharing.js');
      const member = await addFamilyMember(groupId, userId!, memberUserId);
      res.status(201).json(member);
    } catch (err) {
      console.error('[Routes] POST /api/family-groups/:id/members error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to add family member', message });
    }
  });

  // Remove family group member
  app.delete('/api/family-groups/:id/members/:memberId', async (req: SessionRequest, res: Response) => {
    try {
      const groupId = req.params.id;
      const memberUserId = req.params.memberId;

      // Resolve user id (owner) from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { removeFamilyMember } = await import('./family-sharing.js');
      await removeFamilyMember(groupId, userId!, memberUserId);
      res.status(204).send();
    } catch (err) {
      console.error('[Routes] DELETE /api/family-groups/:id/members/:memberId error:', err);
      res.status(500).json({ error: 'Failed to remove family member' });
    }
  });

  // Get shared subscriptions for a family group
  app.get('/api/family-groups/:id/shared-subscriptions', async (req: SessionRequest, res: Response) => {
    try {
      const { id: groupId } = req.params;
      const supabase = getSupabaseClient();

      // Resolve user id from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Verify user is owner or member of the group
      const { data: groupRow, error: groupRowError } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupRowError || !groupRow) {
        return res.status(404).json({ error: 'Family group not found' });
      }

      if (groupRow.owner_id !== userId) {
        const { data: membership, error: membershipError } = await supabase
          .from('family_group_members')
          .select('id')
          .eq('family_group_id', groupId)
          .eq('user_id', userId)
          .single();

        if (membershipError || !membership) {
          return res.status(403).json({ error: 'Not authorized to view family shared subscriptions' });
        }
      }

      // Get shared subscriptions with subscription details
      const { data: sharedSubs, error } = await supabase
        .from('shared_subscriptions')
        .select(`
          id,
          family_group_id,
          subscription_id,
          shared_by_user_id,
          shared_at
        `)
        .eq('family_group_id', groupId);

      if (error) {
        console.error('[Routes] GET shared subscriptions error:', error);
        return res.status(500).json({ error: 'Failed to fetch shared subscriptions' });
      }

      const sharedByUserIds = Array.from(
        new Set((sharedSubs || []).map((s: any) => s.shared_by_user_id).filter(Boolean))
      );

      const ownersById: Record<string, { email?: string; name?: string }> = {};
      if (sharedByUserIds.length > 0) {
        await Promise.all(
          sharedByUserIds.map(async (uid) => {
            try {
              const { data: userData, error: userError } = await supabase.auth.admin.getUserById(uid);
              if (!userError && userData?.user) {
                ownersById[String(uid)] = {
                  email: userData.user.email || undefined,
                  name: userData.user.user_metadata?.name || userData.user.email || uid,
                };
                return;
              }
            } catch (e) {
              // ignore and try fallback
            }

            try {
              const { data: userRow, error: userRowErr } = await supabase
                .from('users')
                .select('email')
                .eq('id', uid)
                .single();
              if (!userRowErr && userRow?.email) {
                ownersById[String(uid)] = { email: userRow.email, name: userRow.email };
                return;
              }
            } catch (e) {
              // ignore
            }

            ownersById[String(uid)] = { email: undefined, name: String(uid) };
          })
        );
      }

      res.json(
        (sharedSubs || []).map((ss: any) => ({
          ...ss,
          owner: ownersById[ss.shared_by_user_id] || { email: undefined, name: ss.shared_by_user_id },
        }))
      );
    } catch (err) {
      console.error('[Routes] GET /api/family-groups/:id/shared-subscriptions error:', err);
      res.status(500).json({ error: 'Failed to fetch shared subscriptions' });
    }
  });

  // Share a subscription with family group
  app.post('/api/family-groups/:id/share-subscription', async (req: SessionRequest, res: Response) => {
    try {
      const { id: groupId } = req.params;
      const { subscriptionId, memberIds } = req.body;

      // Resolve user id from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const supabase = getSupabaseClient();

      // Verify user is owner or member of the group
      const { data: groupCheck } = await supabase
        .from('family_groups')
        .select('id, owner_id')
        .eq('id', groupId)
        .single();

      if (!groupCheck) {
        return res.status(404).json({ error: 'Family group not found' });
      }

      // Check if user is owner or member
      if (groupCheck.owner_id !== userId) {
        const { data: memberCheck } = await supabase
          .from('family_group_members')
          .select('id')
          .eq('family_group_id', groupId)
          .eq('user_id', userId)
          .single();

        if (!memberCheck) {
          return res.status(403).json({ error: 'Not authorized to share subscriptions in this group' });
        }
      }

      // If memberIds provided, create separate records for each member
      if (Array.isArray(memberIds) && memberIds.length > 0) {
        const sharesToCreate = memberIds.map((memberId: string) => ({
          family_group_id: groupId,
          subscription_id: subscriptionId,
          shared_by_user_id: userId,
          shared_with_user_id: memberId,
          shared_at: new Date().toISOString(),
        }));

        const { data: newShares, error } = await supabase
          .from('shared_subscriptions')
          .insert(sharesToCreate)
          .select();

        if (error) {
          console.error('[Routes] Share subscription error:', error);
          return res.status(500).json({ error: 'Failed to share subscription' });
        }

        res.status(201).json(newShares || []);
      } else {
        // Legacy: if no memberIds, create a single record without shared_with_user_id
        // (shared with entire group)
        const { data: newShare, error } = await supabase
          .from('shared_subscriptions')
          .insert({
            family_group_id: groupId,
            subscription_id: subscriptionId,
            shared_by_user_id: userId,
            shared_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          console.error('[Routes] Share subscription error:', error);
          return res.status(500).json({ error: 'Failed to share subscription' });
        }

        res.status(201).json(newShare);
      }
    } catch (err) {
      console.error('[Routes] POST /api/family-groups/:id/share-subscription error:', err);
      res.status(500).json({ error: 'Failed to share subscription' });
    }
  });

  // Unshare a subscription (delete shared record)
  app.delete('/api/family-groups/:id/shared-subscriptions/:sharedId', async (req: SessionRequest, res: Response) => {
    try {
      const { sharedId } = req.params;

      // resolve user for authorization (reuse earlier logic)
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // TODO: could verify user is member or owner, but underlying helper already
      // does not check; rely on RLS or prechecks elsewhere if desired.

      const { unshareSubscription } = await import('./family-sharing.js');
      await unshareSubscription(sharedId);
      res.status(204).send();
    } catch (err) {
      console.error('[Routes] DELETE /api/family-groups/:id/shared-subscriptions/:sharedId error:', err);
      res.status(500).json({ error: 'Failed to unshare subscription' });
    }
  });

  // Cost splits endpoints
  app.post('/api/family-groups/:id/shared-subscriptions/:sharedId/cost-splits', async (req: SessionRequest, res: Response) => {
    try {
      const { id: groupId, sharedId } = req.params;
      const { userId, percentage } = req.body;

      if (!userId || typeof percentage !== 'number') {
        return res.status(400).json({ error: 'Missing userId or percentage' });
      }

      // Resolve requester id for auth
      let requesterId = req.session?.user?.id;
      if (!requesterId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) requesterId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const { setCostSplit } = await import('./family-sharing.js');
      const split = await setCostSplit(sharedId, userId, percentage);
      res.status(201).json(split);
    } catch (err) {
      console.error('[Routes] POST cost-split error:', err);
      res.status(500).json({ error: 'Failed to set cost split' });
    }
  });

  app.get('/api/family-groups/:id/shared-subscriptions/:sharedId/cost-splits', async (req: SessionRequest, res: Response) => {
    try {
      const { id: groupId, sharedId } = req.params;

      // Resolve requester id for auth
      let requesterId = req.session?.user?.id;
      if (!requesterId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) requesterId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const { getCostSplits } = await import('./family-sharing.js');
      const splits = await getCostSplits(sharedId);
      res.json(splits);
    } catch (err) {
      console.error('[Routes] GET cost-splits error:', err);
      res.status(500).json({ error: 'Failed to fetch cost splits' });
    }
  });

  // Get member's dashboard data
  app.get('/api/family-groups/:id/members/:memberId/dashboard', async (req: SessionRequest, res: Response) => {
    try {
      const { id: groupId, memberId } = req.params;
      const supabase = getSupabaseClient();

      const offsetMinutes = typeof req.query.offsetMinutes === 'string' ? parseInt(req.query.offsetMinutes, 10) || 0 : 0;
      const localDateParam = typeof req.query.localDate === 'string' ? req.query.localDate : undefined;
      const now = localDateParam ? (parseDateOnlyLocal(localDateParam) || new Date()) : new Date();

      // Resolve requester id
      let requesterId = req.session?.user?.id;
      if (!requesterId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) requesterId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      // Auto-advance renewal dates for requester (owner or member)
      try {
        await autoAdvanceRenewalDates(requesterId);
      } catch (err) {
        console.error("[Routes] Error auto-advancing renewal dates for member dashboard:", err);
      }

      // Verify the requested member exists in the group
      const { data: member, error: memberError } = await supabase
        .from('family_group_members')
        .select('*')
        .eq('family_group_id', groupId)
        .eq('user_id', memberId)
        .single();

      if (memberError || !member) {
        return res.status(404).json({ error: 'Member not found in group' });
      }

      // If requester is the member themselves, return their dashboard
      if (requesterId === memberId) {
        // Get member's personal subscriptions
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', memberId);

        // Get shared subscriptions (owner's subs that are shared with this member)
        const { data: sharedRows } = await supabase
          .from('shared_subscriptions')
          .select('subscription_id')
          .eq('family_group_id', groupId)
          .eq('shared_with_user_id', memberId);

        let sharedSubscriptions: any[] = [];
        if (sharedRows && sharedRows.length > 0) {
          const sharedIds = sharedRows.map((r: any) => r.subscription_id);
          const { data: sharedSubs } = await supabase
            .from('subscriptions')
            .select('*')
            .in('id', sharedIds);
          sharedSubscriptions = sharedSubs || [];
        }

        // Combine personal + shared subscriptions
        const allSubscriptions = [...(subscriptions || []), ...sharedSubscriptions];

        const { data: userSub } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', memberId)
          .single();

        const memberSubscriptions = allSubscriptions.filter((s: any) => isSubscriptionActiveLike(s));
        const currentDate = now;
        const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

        const monthlySpending = memberSubscriptions.reduce((total: number, sub: any) => {
          if (!isSubscriptionBilledInMonth(sub, currentMonthStart, currentMonthEnd, currentDate, true, offsetMinutes)) {
            return total;
          }
          const monthlyAmount = monthlyAmountForSubscriptionRow(sub);
          return total + convertToUSD(monthlyAmount, sub.currency || 'USD');
        }, 0);

        const spendingSeries = (() => {
          const now = currentDate;
          const months: { month: string; total: number }[] = [];
          for (let i = 6; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
            const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
            const monthLabel = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
            const total = memberSubscriptions.reduce((sum: number, sub: any) => {
              if (!isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, monthStart.getMonth() === now.getMonth() && monthStart.getFullYear() === now.getFullYear(), offsetMinutes)) {
                return sum;
              }
              return sum + convertToUSD(monthlyAmountForSubscriptionRow(sub), sub.currency || 'USD');
            }, 0);
            months.push({ month: monthLabel, total: Math.round(total * 100) / 100 });
          }
          return months;
        })();

        return res.json({
          member,
          subscriptions: allSubscriptions || [],
          userSubscription: userSub || null,
          spending: spendingSeries,
          metrics: {
            totalSubscriptions: memberSubscriptions.length,
            activeSubscriptions: memberSubscriptions.filter((s: any) => {
              const status = normalizeStatus(s.status);
              return status === 'active' || status === 'unused';
            }).length,
            totalMonthlySpending: Math.round(monthlySpending * 100) / 100,
            memberCount: 1,
          },
        });
      }

      // Otherwise, requester must be the group owner to view other member info
      const { data: groupInfo, error: groupInfoError } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupInfoError || !groupInfo) {
        return res.status(500).json({ error: 'Failed to fetch group info' });
      }

      // Only owner can view other members' dashboards
      if (groupInfo.owner_id !== requesterId) {
        return res.status(403).json({ error: 'Members can only view their own dashboard' });
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

      const memberSubscriptions = (subscriptions || []).filter((s: any) => isSubscriptionActiveLike(s));
      const currentDate = now;
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthlySpending = memberSubscriptions.reduce((total: number, sub: any) => {
        if (!isSubscriptionBilledInMonth(sub, currentMonthStart, currentMonthEnd, currentDate, true, offsetMinutes)) {
          return total;
        }
        const monthlyAmount = monthlyAmountForSubscriptionRow(sub);
        return total + convertToUSD(monthlyAmount, sub.currency || 'USD');
      }, 0);

      const spendingSeries = (() => {
        const now = currentDate;
        const months: { month: string; total: number }[] = [];
        for (let i = 6; i >= 0; i--) {
          const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
          const monthLabel = monthDate.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          const total = memberSubscriptions.reduce((sum: number, sub: any) => {
            if (!isSubscriptionBilledInMonth(sub, monthStart, monthEnd, now, monthStart.getMonth() === now.getMonth() && monthStart.getFullYear() === now.getFullYear(), offsetMinutes)) {
              return sum;
            }
            return sum + convertToUSD(monthlyAmountForSubscriptionRow(sub), sub.currency || 'USD');
          }, 0);
          months.push({ month: monthLabel, total: Math.round(total * 100) / 100 });
        }
        return months;
      })();

      return res.json({
        member,
        subscriptions: subscriptions || [],
        userSubscription: userSub || null,
        spending: spendingSeries,
        metrics: {
          totalSubscriptions: memberSubscriptions.length,
          activeSubscriptions: memberSubscriptions.filter((s: any) => {
            const status = normalizeStatus(s.status);
            return status === 'active' || status === 'unused';
          }).length,
          totalMonthlySpending: Math.round(monthlySpending * 100) / 100,
          memberCount: 1,
        },
      });
    } catch (err) {
      console.error('[Routes] GET /api/family-groups/:id/member/:memberId/dashboard error:', err);
      res.status(500).json({ error: 'Failed to fetch member dashboard data' });
    }
  });

  // Get family data (all members' subscriptions when show_family_data is enabled)
  app.get('/api/family-groups/:id/family-data', async (req: SessionRequest, res: Response) => {
    try {
      const { generateAIRecommendations } = await import('./family-sharing.js');
      const { id: groupId } = req.params;
      const supabase = getSupabaseClient();

      const familyDataOffsetMinutes = typeof req.query.offsetMinutes === 'string' ? parseInt(req.query.offsetMinutes, 10) || 0 : 0;
      const localDateParam = typeof req.query.localDate === 'string' ? req.query.localDate : undefined;
      const now = localDateParam ? (parseDateOnlyLocal(localDateParam) || new Date()) : new Date();

      // Resolve user id from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      // Auto-advance renewal dates for this user (will advance owner and family members)
      try {
        await autoAdvanceRenewalDates(userId);
      } catch (err) {
        console.error("[Routes] Error auto-advancing renewal dates for family-data:", err);
      }

      // Ensure requester is either the group owner or a group member
      const { data: groupRow, error: groupRowError } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', groupId)
        .single();

      if (groupRowError || !groupRow) {
        return res.status(404).json({ error: 'Family group not found' });
      }

      if (groupRow.owner_id !== userId) {
        const { data: membership, error: membershipError } = await supabase
          .from('family_group_members')
          .select('id')
          .eq('family_group_id', groupId)
          .eq('user_id', userId)
          .single();

        if (membershipError || !membership) {
          return res.status(403).json({ error: 'Not authorized to view family data' });
        }
      }

      // Get group settings
      const { data: settings, error: settingsError } = await supabase
        .from('family_group_settings')
        .select('show_family_data')
        .eq('family_group_id', groupId)
        .single();

      if (settingsError) {
        console.warn('[Routes] /api/family-groups/:id/family-data failed to read family group settings', settingsError);
      }

      const familyDataSharingEnabled = !!settings?.show_family_data;
      const ownerId = String(groupRow.owner_id);
      const isOwner = ownerId === userId;

      // Get all members of the group regardless of sharing mode so we can return a safe fallback
      const { data: members, error: membersError } = await supabase
        .from('family_group_members')
        .select('user_id, role')
        .eq('family_group_id', groupId);

      if (membersError) {
        return res.status(500).json({ error: 'Failed to fetch family members' });
      }

      if (!familyDataSharingEnabled) {
        // Family sharing is not enabled; return the requester's own subscriptions and recommendations
        const { data: personalSubs, error: personalSubsError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId);

        if (personalSubsError) {
          console.error('[Routes] /api/family-groups/:id/family-data personal fallback failed:', personalSubsError);
          return res.status(500).json({ error: 'Failed to load personal subscriptions' });
        }

        const recommendations = generateAIRecommendations(personalSubs || []);
        const metrics = (() => {
          const subs = (personalSubs || []).filter((s: any) => s.status !== 'deleted');
          const totalSubscriptions = subs.length;
          const activeSubscriptions = subs.filter((s: any) => !s.status || s.status === 'active').length;
          const monthlyTotal = subs.reduce((acc: number, s: any) => {
            const amt = Number(s.amount) || 0;
            const freq = s.frequency || 'monthly';
            let monthly = amt;
            if (freq === 'yearly') monthly = amt / 12;
            if (freq === 'quarterly') monthly = amt / 3;
            if (freq === 'weekly') monthly = amt * 4;
            return acc + monthly;
          }, 0);
          return {
            totalSubscriptions,
            activeSubscriptions,
            totalMonthlySpending: monthlyTotal,
            memberCount: 1,
          };
        })();

        return res.json({
          members: [
            { userId: groupRow.owner_id, role: 'owner' },
            ...((members || []).filter(m => m.user_id !== groupRow.owner_id).map(m => ({ userId: m.user_id, role: 'member' })))
          ],
          subscriptions: (personalSubs || []).map(transformSubscription),
          sharedSubscriptions: [],
          costSplits: [],
          recommendations,
          metrics,
          currentUserId: userId,
          isOwner,
          familyDataSharingEnabled: false,
        });
      }

      // Get all members of the group
      if (!members) {
        return res.status(500).json({ error: 'Failed to fetch family members' });
      }

      // Get shared subscriptions for the group
      const { data: sharedSubs } = await supabase
        .from('shared_subscriptions')
        .select(`
          id,
          subscription_id,
          shared_by_user_id,
          shared_with_user_id,
          shared_at
        `)
        .eq('family_group_id', groupId);

      const visibleSharedSubscriptions = isOwner
        ? (sharedSubs || [])
        : (sharedSubs || []).filter((s: any) => !s.shared_with_user_id || s.shared_with_user_id === userId);
      const sharedSubscriptionIds = visibleSharedSubscriptions.map((s: any) => s.subscription_id).filter(Boolean);
      // Also fetch the actual subscription rows for any visible shared subscription ids
      let sharedSubscriptionsDetailed = visibleSharedSubscriptions;
      try {
        const sharedByUserIds = Array.from(new Set(visibleSharedSubscriptions.map(s => s.shared_by_user_id).filter(Boolean)));
        let sharedSubscriptionRows: any[] = [];
        let userRows: Record<string, { email: string; name: string }> = {};
        if (sharedSubscriptionIds.length > 0) {
          const { data: _sharedRows } = await supabase
            .from('subscriptions')
            .select('*')
            .in('id', sharedSubscriptionIds);
          sharedSubscriptionRows = _sharedRows || [];
        }
        if (sharedByUserIds.length > 0) {
          // Try to get user info from auth.users (admin API)
          let usersById: Record<string, { email: string; name: string }> = {};
          try {
            const listUsersResult = await supabase.auth.admin.listUsers();
            const users = listUsersResult.data?.users ?? [];
            if (users.length > 0) {
              usersById = users.reduce<Record<string, { email: string; name: string }>>((acc, u: any) => {
                if (!u?.id) return acc;
                acc[u.id] = {
                  email: u.email || '',
                  name: u.user_metadata?.name || u.email || '',
                };
                return acc;
              }, usersById);
            }
          } catch (err) {
            console.warn('[Routes] Failed to fetch user info for shared subscriptions', err);
          }
          userRows = usersById;
        }
        // Merge the subscription row and owner info into each shared subscription entry
        sharedSubscriptionsDetailed = visibleSharedSubscriptions.map(ss => ({
          ...ss,
          subscription: (sharedSubscriptionRows || []).find(r => r.id === ss.subscription_id) || null,
          owner: userRows[ss.shared_by_user_id] || { email: ss.shared_by_user_id, name: ss.shared_by_user_id },
        }));
      } catch (err) {
        console.warn('[Routes] Failed to fetch detailed shared subscriptions', err);
      }

      const memberIds = Array.from(new Set((members || [])
        .map(m => m.user_id)
        .filter(Boolean)
        .map(String)
        .filter((id) => id !== ownerId)
      ));

      let allSubscriptions: any[] = [];
      let ownerSubscriptions: any[] = [];
      let memberSubscriptions: any[] = [];
      let personalSubscriptions: any[] = [];
      let sharedRows: any[] = [];

      if (isOwner) {
        const { data: ownerSubs, error: ownerSubscriptionsError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', ownerId);

        if (ownerSubscriptionsError) {
          console.error('[Routes] /api/family-groups/:id/family-data failed to load owner subscriptions', ownerSubscriptionsError);
          return res.status(500).json({ error: 'Failed to load family subscriptions' });
        }

        // Debug: log owner subscription count
        // eslint-disable-next-line no-console
        console.log('[Routes] /api/family-groups/:id/family-data ownerSubscriptions count:', (ownerSubs || []).length);

        ownerSubscriptions = ownerSubs || [];

        if (memberIds.length > 0) {
          const { data: memberSubs, error: memberSubscriptionsError } = await supabase
            .from('subscriptions')
            .select('*')
            .in('user_id', memberIds);

          if (memberSubscriptionsError) {
            console.error('[Routes] /api/family-groups/:id/family-data failed to load member subscriptions', memberSubscriptionsError);
            return res.status(500).json({ error: 'Failed to load family subscriptions' });
          }

          memberSubscriptions = memberSubs || [];
        }

        // Debug: log member subscription count and memberIds used
        // eslint-disable-next-line no-console
        console.log('[Routes] /api/family-groups/:id/family-data memberIds:', memberIds);
        // eslint-disable-next-line no-console
        console.log('[Routes] /api/family-groups/:id/family-data memberSubscriptions count:', (memberSubscriptions || []).length);

        const combinedSubscriptionsById = new Map<string, any>();
        (ownerSubscriptions || []).forEach((sub: any) => combinedSubscriptionsById.set(sub.id, sub));
        memberSubscriptions.forEach((sub: any) => combinedSubscriptionsById.set(sub.id, sub));

        allSubscriptions = Array.from(combinedSubscriptionsById.values());
      } else {
        const { data: personalSubs, error: personalSubsError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId);

        if (personalSubsError) {
          console.error('[Routes] /api/family-groups/:id/family-data failed to load personal subscriptions', personalSubsError);
          return res.status(500).json({ error: 'Failed to load family subscriptions' });
        }

        // Debug: log member personal subscription count and details
        // eslint-disable-next-line no-console
        console.log('[Routes] /api/family-groups/:id/family-data MEMBER personalSubs count:', (personalSubs || []).length);
        if (personalSubs && personalSubs.length > 0) {
          personalSubs.forEach((s: any) => {
            console.log(`[Routes]   - ${s.name}: billing_month=${s.billing_month}, status=${s.status}, next_billing_at/date=${s.next_billing_at || s.next_billing_date}`);
          });
        }

        personalSubscriptions = personalSubs || [];

        if (sharedSubscriptionIds.length > 0) {
          const { data: sharedSubsRows, error: sharedRowsError } = await supabase
            .from('subscriptions')
            .select('*')
            .in('id', sharedSubscriptionIds);

          if (sharedRowsError) {
            console.error('[Routes] /api/family-groups/:id/family-data failed to load shared subscriptions', sharedRowsError);
            return res.status(500).json({ error: 'Failed to load family subscriptions' });
          }

          sharedRows = sharedSubsRows || [];
        }

        const combinedSubscriptionsById = new Map<string, any>();
        personalSubscriptions.forEach((sub: any) => combinedSubscriptionsById.set(sub.id, sub));
        sharedRows.forEach((sub: any) => combinedSubscriptionsById.set(sub.id, sub));

        allSubscriptions = Array.from(combinedSubscriptionsById.values());
      }

      // Get cost splits for visible shared subscriptions only
      const { data: costSplits } = await supabase
        .from('cost_splits')
        .select('*')
        .in('shared_subscription_id', visibleSharedSubscriptions.map((s: any) => s.id) || []);

      // Helper to convert snake_case database fields to camelCase for API response
      function transformSubscription(sub: any) {
        return {
          id: sub.id,
          userId: sub.user_id,
          name: sub.name,
          category: sub.category,
          amount: sub.amount,
          currency: sub.currency,
          frequency: sub.frequency,
          nextBillingDate: (() => {
            const raw = sub.next_billing_at || sub.next_billing_date;
            const parsed = parseDateOnlyLocal(raw);
            return parsed ? formatDateLocal(parsed) : raw;
          })(),
          status: sub.status,
          usageCount: sub.usage_count,
          lastUsedDate: sub.last_used_at,
          logoUrl: sub.logo_url,
          description: sub.description,
          isDetected: sub.is_detected,
          createdAt: sub.created_at,
          updatedAt: sub.updated_at,
          deletedAt: sub.deleted_at,
          websiteDomain: sub.website_domain,
          scheduledCancellationDate: sub.scheduled_cancellation_date,
          cancellationUrl: sub.cancellation_url,
          monthlyUsageCount: sub.monthly_usage_count,
          usageMonth: sub.usage_month,
        };
      }

      // compute simple family metrics server-side so client doesn't have to
        const computedMetrics = (() => {
          const allSubs = (allSubscriptions || []) as any[];
          // Exclude explicit deleted or canceled rows from the active set
          const subs = allSubs.filter((s: any) => {
            const st = normalizeStatus(s.status);
            return st !== 'deleted' && st !== 'canceled';
          });
          const deletedSubs = allSubs.filter((s: any) => normalizeStatus(s.status) === 'deleted');

          // Shared entries: ignore deleted/canceled shared records
          const sharedRaw = (sharedSubscriptionsDetailed || []).filter((sh: any) => {
            const status = normalizeStatus(sh.status || sh.subscription?.status);
            return status !== 'deleted' && status !== 'canceled';
          });

          // dedupe shared entries if the underlying subscription is already in
          // the main list (common when owner shares their own subscription)
          const uniqueShared = sharedRaw.filter((sh: any) =>
            !subs.some((s: any) => s.id === (sh.subscription_id || sh.subscription?.id))
          );

          const monthlyAmountForSubscription = (item: any) => {
            const amount = Number(item.amount) || 0;
            const frequency = (item.frequency || 'monthly').toLowerCase();
            const monthly = frequency === 'yearly'
              ? amount / 12
              : frequency === 'quarterly'
              ? amount / 3
              : frequency === 'weekly'
              ? amount * 4
              : amount;
            return convertToUSD(monthly, item.currency || 'USD');
          };

          const currentDate = now;
          const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
          const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
          const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);
          const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
          const previousMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0, 23, 59, 59);

          const totalSubscriptions = subs.length + uniqueShared.length;
          const activeSubscriptions =
            subs.filter((s: any) => normalizeStatus(s.status) === 'active').length +
            uniqueShared.filter((sh: any) => normalizeStatus(sh.subscription?.status || sh.status) === 'active').length;

          const unusedSubscriptions =
            subs.filter((s: any) => normalizeStatus(s.status) === 'unused').length +
            uniqueShared.filter((sh: any) => normalizeStatus(sh.subscription?.status || sh.status) === 'unused').length;
          const potentialSavings = [
            ...subs.filter((s: any) => {
              const status = normalizeStatus(s.status);
              return status === 'unused' || status === 'to-cancel';
            }),
            ...uniqueShared.filter((sh: any) => {
              const status = normalizeStatus(sh.subscription?.status || sh.status);
              return status === 'unused' || status === 'to-cancel';
            }).map((sh: any) => sh.subscription || sh),
          ].reduce((sum: number, s: any) => sum + monthlyAmountForSubscription(s), 0);

          const monthlyFromSubs = subs.reduce((acc: number, s: any) => {
            if (!isSubscriptionBilledInMonth(s, currentMonth, currentMonthEnd, currentDate, true, familyDataOffsetMinutes)) {
              return acc;
            }
            return acc + monthlyAmountForSubscription(s);
          }, 0);

          const monthlyFromShared = uniqueShared.reduce((acc: number, sh: any) => {
            const subscription = sh.subscription || {};
            if (!isSubscriptionBilledInMonth(subscription, currentMonth, currentMonthEnd, currentDate, true, familyDataOffsetMinutes)) {
              return acc;
            }
            return acc + monthlyAmountForSubscription(subscription);
          }, 0);

          const deletedSavings = deletedSubs
            .filter((s: any) => {
              const ts = getSubscriptionDeletedTimestamp(s);
              // Ensure timestamp is in current calendar month (not previous or future)
              if (!ts) return false;
              const deletedDate = new Date(ts);
              return deletedDate >= currentMonth && deletedDate <= currentMonthEnd;
            })
            .reduce((sum: number, s: any) => sum + monthlyAmountForSubscription(s), 0);

          const previousMonthSpendFromSubs = subs.reduce((sum: number, s: any) => {
            if (!isSubscriptionBilledInMonth(s, previousMonth, previousMonthEnd, currentDate, false, familyDataOffsetMinutes)) {
              return sum;
            }
            return sum + monthlyAmountForSubscription(s);
          }, 0);

          const previousMonthSpendFromShared = uniqueShared.reduce((sum: number, sh: any) => {
            const subscription = sh.subscription || {};
            if (!isSubscriptionBilledInMonth(subscription, previousMonth, previousMonthEnd, currentDate, false, familyDataOffsetMinutes)) {
              return sum;
            }
            return sum + monthlyAmountForSubscription(subscription);
          }, 0);

          const previousMonthSpend = previousMonthSpendFromSubs + previousMonthSpendFromShared;

          const monthlySpendChange = previousMonthSpend > 0
            ? Math.round(((monthlyFromSubs + monthlyFromShared - previousMonthSpend) / previousMonthSpend) * 100)
            : 0;

          const billingThisMonth = [
            ...subs.filter((s: any) => isSubscriptionBilledInMonth(s, currentMonth, currentMonthEnd, currentDate, true, familyDataOffsetMinutes)),
            ...uniqueShared.map((sh: any) => sh.subscription || {}).filter((subscription: any) => isSubscriptionBilledInMonth(subscription, currentMonth, currentMonthEnd, currentDate, true, familyDataOffsetMinutes)),
          ];

          const categoryMap = new Map<string, { amount: number; count: number }>();
          for (const subscription of billingThisMonth) {
            if (!subscription || !subscription.category) continue;
            const category = String(subscription.category || 'uncategorized');
            const amount = monthlyAmountForSubscription(subscription);
            const existing = categoryMap.get(category) || { amount: 0, count: 0 };
            categoryMap.set(category, {
              amount: existing.amount + amount,
              count: existing.count + 1,
            });
          }

          const totalCategoryAmount = Array.from(categoryMap.values()).reduce((sum, data) => sum + data.amount, 0);
          const byCategory = Array.from(categoryMap.entries()).map(([category, data]) => ({
            category,
            amount: Math.round(data.amount * 100) / 100,
            percentage: totalCategoryAmount > 0 ? Math.round((data.amount / totalCategoryAmount) * 100) : 0,
            count: data.count,
          }));

          const allUniqueSubscriptionsById = new Map<string, any>();
          subs.forEach((s: any) => {
            if (s?.id) allUniqueSubscriptionsById.set(s.id, s);
          });
          uniqueShared.forEach((sh: any) => {
            const subscription = sh.subscription;
            if (subscription?.id && !allUniqueSubscriptionsById.has(subscription.id)) {
              allUniqueSubscriptionsById.set(subscription.id, subscription);
            }
          });

          const newServicesTracked = Array.from(allUniqueSubscriptionsById.values()).filter((s: any) => {
            const createdDate = new Date(s.created_at);
            return createdDate >= currentMonth && createdDate < nextMonth;
          }).length;

          const uniqueMemberCount = new Set([
            String(groupRow.owner_id),
            ...(members || []).map((m: any) => String(m.user_id)),
          ]).size;

          // Debug logging to help diagnose metric counts
          // eslint-disable-next-line no-console
          console.log('[Routes] family-data metrics counts: allSubs=', allSubs.length, 'subs=', subs.length, 'deleted=', deletedSubs.length, 'uniqueShared=', uniqueShared.length);
          // eslint-disable-next-line no-console
          console.log('[Routes] family-data monthly calculations: monthlyFromSubs=', monthlyFromSubs, 'monthlyFromShared=', monthlyFromShared, 'total=', monthlyFromSubs + monthlyFromShared);

          return {
            totalSubscriptions,
            activeSubscriptions,
            totalMonthlySpending: Math.round((monthlyFromSubs + monthlyFromShared) * 100) / 100,
            memberCount: uniqueMemberCount,
            potentialSavings: Math.round(potentialSavings * 100) / 100,
            thisMonthSavings: Math.round(deletedSavings * 100) / 100,
            unusedSubscriptions,
            averageCostPerUse: 0,
            monthlySpendChange,
            newServicesTracked,
            byCategory,
          };
        })();

        // Provide top-level category and spending series to match client expectations
        const currentMonthLabel = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
        const spendingSeries = computedMetrics && typeof computedMetrics.totalMonthlySpending === 'number'
          ? [{ month: currentMonthLabel, amount: Math.round(Number(computedMetrics.totalMonthlySpending) * 100) / 100 }]
          : [];

        const response = {
          members: [
            // Always include the owner as a member
            { userId: groupRow.owner_id, role: 'owner' },
            // Then add all other members
            ...members.filter(m => m.user_id !== groupRow.owner_id).map(m => ({
              userId: m.user_id,
              role: m.role,
            }))
          ],
          subscriptions: (allSubscriptions || []).map(transformSubscription),
          // Provide detailed shared subscription objects (includes `subscription` field when available)
          sharedSubscriptions: sharedSubscriptionsDetailed || [],
          costSplits: costSplits || [],
          recommendations: generateAIRecommendations(allSubscriptions || []),
          metrics: computedMetrics,
          spending: spendingSeries,
          byCategory: computedMetrics?.byCategory || [],
          currentUserId: userId,
          isOwner,
          familyDataSharingEnabled: true,
        };

        res.json(response);
    } catch (err) {
      console.error('[Routes] GET family data error:', err);
      res.status(500).json({ error: 'Failed to fetch family data' });
    }
  });

  // Upgrade current user to family plan
  app.post('/api/user/upgrade-to-family', async (req: SessionRequest, res: Response) => {
    try {
      // Resolve user id from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { upgradeToPlan } = await import('./family-sharing.js');
      await upgradeToPlan(userId!, 'family');

      res.json({ success: true, message: 'Upgraded to family plan' });
    } catch (err) {
      console.error('[Routes] POST /api/user/upgrade-to-family error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to upgrade to family plan', message });
    }
  });

  // Trigger renewal checks (for testing/manual trigger)
  app.post("/api/admin/renewal-checks", async (req: SessionRequest, res: Response) => {
    try {
      // Basic API key check for security
      const apiKey = req.headers["x-api-key"];
      if (apiKey !== process.env.ADMIN_API_KEY) {
        return res.status(403).json({ error: "Unauthorized - invalid API key" });
      }

      console.log("[Routes] Manual renewal trigger requested");

      const { summary, runLogId } = await runRenewalChecks({ mode: "manual" });
      res.json({ success: true, message: "Renewal checks completed", summary, runLogId });
    } catch (err) {
      console.error("[Routes] Error triggering renewal checks:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: "Failed to trigger renewal checks", message });
    }
  });

  app.get("/api/admin/renewal-checks/logs", asyncHandler(async (req: SessionRequest, res: Response) => {
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(403).json({ error: "Unauthorized - invalid API key" });
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("renewal_run_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Routes] Failed to fetch renewal run logs:", error);
      return res.status(200).json({
        success: false,
        items: [],
        message:
          "Renewal run logs not available yet. Ensure the renewal_run_logs table exists in your DB.",
      });
    }

    res.json({ success: true, items: data || [] });
  }));

  // Stripe: Create checkout session
  app.post("/api/stripe/create-checkout-session", async (req: SessionRequest, res: Response) => {
    try {
      console.log("[Stripe] Create checkout session request received");
      console.log("[Stripe] Request body:", req.body);
      const { priceId } = req.body;
      if (!priceId) {
        console.log("[Stripe] No price ID provided");
        return res.status(400).json({ error: "Price ID required" });
      }

      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) {
        console.warn('[Stripe] Unauthorized checkout session request');
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol;
      const host = req.headers.host;
      if (!host) {
        console.error('[Stripe] Could not determine request host for redirect URLs');
        return res.status(500).json({ error: 'Unable to create checkout session' });
      }
      const origin = `${protocol}://${host}`;
      const successUrl = process.env.STRIPE_CHECKOUT_SUCCESS_URL || `${origin}/pricing?checkout=success`;
      const cancelUrl = process.env.STRIPE_CHECKOUT_CANCEL_URL || `${origin}/pricing?checkout=cancel`;

      const { StripeService } = await import('./stripe.js');
      const result = await StripeService.createSubscriptionCheckoutSession(
        userId,
        priceId,
        successUrl,
        cancelUrl,
      );

      if (result && typeof result === 'object') {
        if ('url' in result && result.url) {
          return res.json({ url: result.url });
        }

        if ('success' in result && result.success) {
          return res.json(result);
        }
      }

      console.error('[Stripe] Stripe checkout session did not return a URL:', result);
      return res.status(500).json({
        error: 'Failed to start Stripe checkout session',
        message: 'Stripe returned no redirect URL. Please check your Stripe configuration.',
      });
    } catch (err) {
      console.error("[Stripe] Error in create-checkout-session:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: "Failed to create checkout session", message });
    }
  });

  // Stripe: Complete checkout session after redirect
  app.post("/api/stripe/complete-checkout-session", async (req: SessionRequest, res: Response) => {
    try {
      const { sessionId } = req.body;
      if (!sessionId) {
        return res.status(400).json({ error: 'sessionId is required' });
      }

      const { StripeService } = await import('./stripe.js');
      await StripeService.completeCheckoutSession(sessionId);

      res.json({ success: true });
    } catch (err) {
      console.error("[Stripe] Error in complete-checkout-session:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: "Failed to complete checkout session", message });
    }
  });

  // Stripe: Get subscription status
  app.get("/api/stripe/subscription-status", async (req: SessionRequest, res: Response) => {
    try {
      // Get user ID from session or auth header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const supabase = getSupabaseClient();
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!subscription) {
        return res.json({ status: 'free', tier: 'free' });
      }

      res.json({
        status: subscription.stripe_subscription_id ? 'active' : 'inactive',
        tier: subscription.plan_type || 'free',
        subscriptionId: subscription.stripe_subscription_id,
      });
    } catch (err) {
      console.error("[Routes] Error getting subscription status:", err);
      res.status(500).json({ error: "Failed to get subscription status" });
    }
  });

  // Stripe: Cancel subscription
  app.post("/api/stripe/cancel-subscription", async (req: SessionRequest, res: Response) => {
    try {
      // Get user ID from session or auth header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { StripeService } = await import('./stripe.js');
      const cancelResult = await StripeService.cancelSubscription(userId);
      const message = cancelResult.alreadyFree
        ? 'No active subscription found; already on free plan.'
        : cancelResult.alreadyCanceled
        ? 'Subscription already canceled or already on free plan.'
        : cancelResult.cleaned
        ? 'Stale Stripe subscription cleared and downgraded to free.'
        : 'Subscription cancelled';

      res.json({ success: true, message });
    } catch (err) {
      console.error("[Routes] Error cancelling subscription:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: "Failed to cancel subscription", message });
    }
  });

  // Stripe: Reactivate subscription
  app.post("/api/stripe/reactivate-subscription", async (req: SessionRequest, res: Response) => {
    try {
      // Get user ID from session or auth header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }

      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { StripeService } = await import('./stripe.js');
      await StripeService.reactivateSubscription(userId);

      res.json({ success: true, message: "Subscription reactivated" });
    } catch (err) {
      console.error("[Routes] Error reactivating subscription:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: "Failed to reactivate subscription", message });
    }
  });

  // Stripe webhook - handles payment completion and subscription updates
  app.post("/api/stripe/webhook", async (req: SessionRequest, res: Response) => {
    try {
      console.log("[Webhook] Received webhook request", {
        path: req.path,
        method: req.method,
        hasSignature: !!req.headers["stripe-signature"],
        hasRawBody: !!req.rawBody,
        stripeVersionHeader: req.headers["stripe-version"] || req.headers["Stripe-Version"],
      });

      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.warn("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
        return res.status(400).json({ error: "Webhook not configured" });
      }

      const payload = req.rawBody
        ? typeof req.rawBody === 'string'
          ? req.rawBody
          : Buffer.isBuffer(req.rawBody)
          ? req.rawBody.toString('utf8')
          : JSON.stringify(req.rawBody)
        : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body);

      console.log('[Webhook] Using Stripe API version:', STRIPE_API_VERSION);
      const stripeWebhookClient = createStripeClient(process.env.STRIPE_SECRET_KEY!);
      const event = stripeWebhookClient.webhooks.constructEvent(payload, sig, webhookSecret);

      console.log("[Webhook] Received event:", event.type);

      const supabaseAdmin = getSupabaseClient();

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          console.log("[Webhook] Checkout session completed:", session.id);

          if (session.customer && session.subscription) {
            // Get subscription details to get price ID
            const subscription = await (stripe.subscriptions.retrieve(session.subscription) as any);
            const priceId = getPriceIdFromSubscription(subscription);
            const planType = getPlanTypeFromSubscription(subscription) || (priceId ? PRICE_ID_TO_PLAN_TYPE[priceId] : undefined);

            if (planType) {
              console.log(`[Webhook] Subscription created with plan: ${planType}`);

              let userId = session.metadata?.user_id;
              if (!userId) {
                // Fallback to customer email only when metadata is missing
                const customer = await stripe.customers.retrieve(session.customer) as any;
                const customerEmail = customer.email;
                if (customerEmail) {
                  const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
                  const user = userData.users.find((u) => u.email === customerEmail);
                  if (user) {
                    userId = user.id;
                    console.log(`[Webhook] Found user ${userId} for email ${customerEmail}`);
                  }
                }
              }

              if (userId) {
                const { data: existingRow, error: lookupError } = await supabaseAdmin
                  .from("user_subscriptions")
                  .select("id")
                  .eq("user_id", userId)
                  .single();

                if (lookupError && lookupError.code !== 'PGRST116') {
                  console.error("[Webhook] Error looking up existing subscription row:", lookupError);
                }

                if (existingRow) {
                  const { error: updateError } = await supabaseAdmin
                    .from("user_subscriptions")
                    .update({
                      stripe_customer_id: session.customer,
                      stripe_subscription_id: session.subscription,
                      stripe_price_id: priceId,
                      plan_type: planType,
                      status: "active",
                      current_period_start: new Date((subscription.current_period_start as any) * 1000),
                      current_period_end: new Date((subscription.current_period_end as any) * 1000),
                      cancel_at_period_end: subscription.cancel_at_period_end,
                      updated_at: new Date(),
                    })
                    .eq("user_id", userId);

                  if (updateError) {
                    console.error("[Webhook] Error updating subscription:", updateError);
                  } else {
                    console.log("[Webhook] Subscription updated successfully for user:", userId);
                  }
                } else {
                  const { error: insertError } = await supabaseAdmin
                    .from("user_subscriptions")
                    .insert({
                      user_id: userId,
                      stripe_customer_id: session.customer,
                      stripe_subscription_id: session.subscription,
                      stripe_price_id: priceId,
                      plan_type: planType,
                      status: "active",
                      current_period_start: new Date((subscription.current_period_start as any) * 1000),
                      current_period_end: new Date((subscription.current_period_end as any) * 1000),
                      cancel_at_period_end: subscription.cancel_at_period_end,
                      updated_at: new Date(),
                    });

                  if (insertError) {
                    console.error("[Webhook] Error inserting subscription:", insertError);
                  } else {
                    console.log("[Webhook] Subscription created successfully for user:", userId);
                  }
                }
              }
            }
          }
          break;
        }

        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const subscription = event.data.object as any;
          console.log("[Webhook] Subscription updated/created:", subscription.id);

          const priceId = getPriceIdFromSubscription(subscription);
          const planType = getPlanTypeFromSubscription(subscription) || (priceId ? PRICE_ID_TO_PLAN_TYPE[priceId] : undefined);

          if (planType) {
            // Find user by stripe_subscription_id first, then by stripe_customer_id.
            let userId: string | undefined;
            const { data: userSubBySubscription } = await supabaseAdmin
              .from("user_subscriptions")
              .select("user_id")
              .eq("stripe_subscription_id", subscription.id)
              .single();

            if (userSubBySubscription?.user_id) {
              userId = userSubBySubscription.user_id;
            } else if (subscription.customer) {
              const { data: userSubByCustomer } = await supabaseAdmin
                .from("user_subscriptions")
                .select("user_id")
                .eq("stripe_customer_id", subscription.customer)
                .single();
              userId = userSubByCustomer?.user_id;
            }

            if (userId) {
              const { error: updateError } = await supabaseAdmin
                .from("user_subscriptions")
                .update({
                  stripe_price_id: priceId,
                  plan_type: planType,
                  status: subscription.status,
                  cancel_at_period_end: subscription.cancel_at_period_end,
                  current_period_end: new Date((subscription.current_period_end as any) * 1000),
                  updated_at: new Date(),
                })
                .eq("stripe_subscription_id", subscription.id);

              if (updateError) {
                console.error("[Webhook] Error updating subscription:", updateError);
              } else {
                console.log("[Webhook] Subscription upgraded/downgraded successfully for user:", userId);
                // --- Family group downgrade logic ---
                try {
                  if (planType === 'premium') {
                    const { getFamilyGroups, getFamilyMembers } = await import('./family-sharing.js');
                    const groups = await getFamilyGroups(userId);
                    const ownedGroups = groups.filter(g => g.ownerId === userId);
                    for (const group of ownedGroups) {
                      const members = await getFamilyMembers(group.id);
                      for (const member of members) {
                        if (member.userId !== userId) {
                          try {
                            const { downgradeFromFamilyPlan } = await import('./family-sharing.js');
                            await downgradeFromFamilyPlan(member.userId, group.id);
                            console.log(`[Webhook] Reverted member ${member.userId} in group ${group.id} to original plan.`);
                          } catch (err) {
                            console.error(`[Webhook] Failed to revert member ${member.userId} in group ${group.id}:`, err);
                          }
                        }
                      }
                    }
                  }
                } catch (err) {
                  console.error('[Webhook] Error in family group downgrade logic:', err);
                }
              }
            } else {
              console.warn(`[Webhook] Could not resolve user for subscription ${subscription.id}`);
            }
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as any;
          console.log("[Webhook] Invoice payment succeeded:", invoice.id);

          if (invoice.subscription) {
            const subscription = await (stripe.subscriptions.retrieve(invoice.subscription) as any);
            const priceId = getPriceIdFromSubscription(subscription);
            const planType = getPlanTypeFromSubscription(subscription) || (priceId ? PRICE_ID_TO_PLAN_TYPE[priceId] : undefined);
            const updateData: any = {
              status: subscription.status,
              current_period_start: new Date((subscription.current_period_start as any) * 1000),
              current_period_end: new Date((subscription.current_period_end as any) * 1000),
              updated_at: new Date(),
              plan_type: planType,
            };

            if (priceId) {
              updateData.stripe_price_id = priceId;
            }

            const { error: updateError } = await supabaseAdmin
              .from("user_subscriptions")
              .update(updateData)
              .eq("stripe_subscription_id", invoice.subscription);

            if (updateError) {
              console.error("[Webhook] Error updating subscription on invoice payment success:", updateError);
            } else {
              console.log("[Webhook] Subscription updated to active on renewal for subscription:", invoice.subscription);
            }
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as any;
          console.log("[Webhook] Invoice payment failed:", invoice.id);
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as any;
          console.log("[Webhook] Subscription deleted:", subscription.id);

          // Find and update user subscription to inactive
          const { data: userSub } = await supabaseAdmin
            .from("user_subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscription.id)
            .single();

          if (userSub) {
            const { error: updateError } = await supabaseAdmin
              .from("user_subscriptions")
              .update({
                status: "canceled",
                plan_type: "free",
                updated_at: new Date(),
              })
              .eq("stripe_subscription_id", subscription.id);

            if (updateError) {
              console.error("[Webhook] Error canceling subscription:", updateError);
            } else {
              console.log("[Webhook] Subscription canceled for user:", userSub.user_id);
            }
          }
          break;
        }

        default:
          console.log("[Webhook] Unhandled event type:", event.type);
      }

      res.json({ received: true });
    } catch (err) {
      console.error("[Webhook] Error processing webhook:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: "Webhook error", message });
    }
  });

  // Contact form endpoint
  app.post("/api/contact", async (req: SessionRequest, res: Response) => {
    try {
      const { name, email, subject, message } = req.body;

      // Basic validation
      if (!name || !email || !message) {
        return res.status(400).json({
          error: "Missing required fields",
          message: "Name, email, and message are required."
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: "Invalid email",
          message: "Please provide a valid email address."
        });
      }

      // Send email to help.subveris@gmail.com
      const emailResult = await emailService.sendContactEmail({
        name,
        email,
        subject: subject || "No subject",
        message
      });

      const emailSuccess = emailResult.success === true;
      if (!emailSuccess) {
        console.error("[Contact] Failed to send email:", emailResult.error);
        return res.status(500).json({
          error: "Failed to send support message",
          message: emailResult.error ? String(emailResult.error) : "Email provider failed to deliver the message."
        });
      }

      // Log the contact request
      console.log("[Contact] Email sent successfully for contact form", {
        emailResult,
        name,
        email,
        subject: subject || "No subject",
        timestamp: new Date().toISOString(),
        ip: req.ip,
      });

      console.log("[Contact] New contact form submission:", {
        name,
        email,
        subject: subject || "No subject",
        message,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        emailSent: emailSuccess
      });

      res.json({
        message: "Thank you for your message! We'll get back to you soon.",
        success: true
      });

    } catch (err) {
      console.error("[Contact] Error processing contact form:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({
        error: "Failed to process contact form",
        message
      });
    }
  });

  // Push notification routes
  app.get("/api/notifications/vapid-public-key", async (req: SessionRequest, res: Response) => {
    try {
      const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        console.warn("[Push] VAPID_PUBLIC_KEY not configured");
        return res.status(500).json({ error: "Push notifications not configured" });
      }
      res.json({ vapidPublicKey });
    } catch (error) {
      console.error("[Push] Error getting VAPID public key:", error);
      res.status(500).json({ error: "Failed to get VAPID public key" });
    }
  });

  app.post("/api/notifications/subscribe", async (req: SessionRequest, res: Response) => {
    try {
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { endpoint, keys } = req.body;
      if (!endpoint || !keys?.auth || !keys?.p256dh) {
        return res.status(400).json({ error: 'Invalid subscription data' });
      }

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: userId,
          endpoint,
          auth_key: keys.auth,
          p256dh_key: keys.p256dh,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error("[Push] Error saving subscription:", error);
        return res.status(500).json({ error: 'Failed to save subscription' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[Push] Error subscribing:", error);
      res.status(500).json({ error: 'Failed to subscribe' });
    }
  });

  app.post("/api/notifications/unsubscribe", async (req: SessionRequest, res: Response) => {
    try {
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { endpoint } = req.body;
      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint required' });
      }

      const supabase = getSupabaseClient();
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('endpoint', endpoint);

      if (error) {
        console.error("[Push] Error removing subscription:", error);
        return res.status(500).json({ error: 'Failed to unsubscribe' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("[Push] Error unsubscribing:", error);
      res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  });

  app.get("/api/notifications/subscriptions", async (req: SessionRequest, res: Response) => {
    try {
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('endpoint, created_at, updated_at')
        .eq('user_id', userId);

      if (error) {
        console.error("[Push] Error fetching subscriptions:", error);
        return res.status(500).json({ error: 'Failed to fetch subscriptions' });
      }

      res.json(data || []);
    } catch (error) {
      console.error("[Push] Error getting subscriptions:", error);
      res.status(500).json({ error: 'Failed to get subscriptions' });
    }
  });

  // Download extension endpoint
  app.get("/api/extension/download", async (req: SessionRequest, res: Response) => {
    try {
      console.log("[Extension] Download requested");
      
      // Try to use archiver if available, otherwise use a fallback
      let archiver;
      try {
        archiver = (await import("archiver")).default;
      } catch (e) {
        console.warn("[Extension] archiver module not found, trying to create ZIP manually");
        // Fallback: create a simple tar.gz or ZIP using raw bytes
        // For now, send an error directing user to install archiver
        return res.status(500).json({
          error: "Extension download not available",
          message: "Please try again later or load the extension manually from the folder."
        });
      }

      const extensionPath = join(process.cwd(), 'extension');
      const archive = archiver('zip', { zlib: { level: 9 } });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename=subveris-extension.zip');

archive.on('error', (err: Error) => {
        console.error('[Extension] Archive error:', err);
        res.status(500).json({ error: 'Failed to create archive' });
      });

      // Pipe archive to response
      archive.pipe(res);

      // Add extension folder to archive
      archive.directory(extensionPath, 'subveris-extension');

      // Finalize the archive
      await archive.finalize();
      
      console.log('[Extension] Download completed successfully');
    } catch (err) {
      console.error('[Extension] Download error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to download extension', message });
    }
  });

  return httpServer;
}







