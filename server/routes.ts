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
    nextBillingDate: sub.next_billing_at,
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
    // Add any additional fields as needed
  };
}


import express from 'express';
import { randomUUID } from 'crypto';
import { emailService } from './email.js';

// Helper for pagination params
function getPaginationParams(req: any) {
  let page = parseInt(req.query.page, 10);
  let perPage = parseInt(req.query.perPage, 10);
  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(perPage) || perPage < 1) perPage = 100;
  if (perPage > 1000) perPage = 1000;
  return { page, perPage };
}

function clearSubscriptionsCacheForUser(userId: string) {
  // We cache the first few pages, so clear those keys after updates.
  for (let page = 1; page <= 20; page += 1) {
    cache.del(`subscriptions:${userId}:p${page}:n100`);
    cache.del(`subscriptions:${userId}:p${page}:n50`);
    cache.del(`subscriptions:${userId}:p${page}:n25`);
    cache.del(`subscriptions:${userId}:p${page}:n10`);
  }
  cache.del(`metrics:${userId}`);
}

import { CacheService } from './cache';
import { getSupabaseClient } from './supabase';
// Helper to extract userId from a JWT (Supabase or custom)
function extractUserIdFromToken(token: string): string | undefined {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    return payload.sub || payload.user_id || payload.id || undefined;
  } catch {
    return undefined;
  }
}
import { asyncHandler, notFoundHandler, errorHandler, AppError, UnauthorizedError, NotFoundError } from './middleware/errorHandler';
const cache = new CacheService();

function isValidBillingFrequency(freq: any): freq is 'weekly' | 'monthly' | 'quarterly' | 'yearly' {
  return ['weekly', 'monthly', 'quarterly', 'yearly'].includes(freq);
}

// centralized handler for cost-per-use endpoint; defined above so
// it exists outside the registration function (and can be imported by tests).
export async function handleCostPerUse(req: express.Request, res: express.Response) {
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
    if (familyGroupId) {
      // Check if group exists and sharing is enabled
      const { data: groupRow, error: groupErr } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', familyGroupId)
        .single();
      if (!groupErr && groupRow) {
        let isOwner = groupRow.owner_id === userId;
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
        if (isOwner || isMember) {
          const { data: settings } = await supabase
            .from('family_group_settings')
            .select('show_family_data')
            .eq('family_group_id', familyGroupId)
            .single();
          if (settings?.show_family_data) {
            showFamilyData = true;
          }
        }
      }
    }
    if (showFamilyData) {
      // Show all family data
      const { data: members } = await supabase
        .from('family_group_members')
        .select('user_id')
        .eq('family_group_id', familyGroupId);
      let memberIds = (members || []).map(m => m.user_id);
      // always include the owner in the set of IDs we query
      const { data: groupRow } = await supabase
        .from('family_groups')
        .select('owner_id')
        .eq('id', familyGroupId)
        .single();
      if (groupRow && !memberIds.includes(groupRow.owner_id)) memberIds.push(groupRow.owner_id);
      if (!memberIds.includes(userId)) memberIds = [userId, ...memberIds];
      const { data: subs } = await supabase
        .from('subscriptions')
        .select('*')
        .in('user_id', memberIds)
        .neq('status', 'deleted');
      subscriptions = subs || [];
    } else {
      // Only show personal data
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId);
      subscriptions = data || [];
    }

    if (!subscriptions || subscriptions.length === 0) {
      return res.json([]);
    }

    const analysis = subscriptions
      .filter(sub => sub.status !== 'deleted')
      .map(sub => {
        const monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'quarterly' ? sub.amount / 3 : sub.frequency === 'weekly' ? sub.amount * 4 : sub.amount;
        const usageCount = sub.usage_count || 0;
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

    res.json(analysis);
  } catch (error) {
    console.error('[Routes] cost-per-use error', error);
    res.status(500).json({ error: 'Failed to compute cost per use' });
  }
}


export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Root route for health/status
  app.get("/", (req, res) => {
    res.json({
      status: "ok",
      message: "Welcome to the Subveris API",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/metrics", asyncHandler(async (req, res) => {
    // Cache key based on user
    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
    }
    if (!userId) throw new UnauthorizedError('Authentication required');
    const cacheKey = `metrics:${userId}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Get user's subscriptions only
    const supabase = getSupabaseClient();
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId);

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
      await cache.set(cacheKey, JSON.stringify(emptyMetrics), 300);
      return res.json(emptyMetrics);
    }

    // Calculate metrics from user's subscriptions only
    const activeCount = subscriptions.filter(s => s.status === 'active' || s.status === 'unused').length;
    const unusedCount = subscriptions.filter(s => s.status === 'unused').length;
    const totalMonthly = subscriptions
      .filter(s => s.status !== 'deleted')
      .reduce((sum, s) => {
        const monthlyAmount = s.frequency === 'yearly' ? s.amount / 12 : s.frequency === 'quarterly' ? s.amount / 3 : s.frequency === 'weekly' ? s.amount * 4 : s.amount;
        return sum + monthlyAmount;
      }, 0);

    // Calculate month-over-month spending change
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const currentMonthSubs = subscriptions.filter(s => {
      const createdDate = new Date(s.created_at);
      return createdDate >= currentMonth && createdDate < nextMonth;
    });
    
    const previousMonthSubs = subscriptions.filter(s => {
      const createdDate = new Date(s.created_at);
      return createdDate >= previousMonth && createdDate < currentMonth;
    });

    const previousMonthSpend = previousMonthSubs.reduce((sum, s) => {
      const monthlyAmount = s.frequency === 'yearly' ? s.amount / 12 : s.frequency === 'quarterly' ? s.amount / 3 : s.frequency === 'weekly' ? s.amount * 4 : s.amount;
      return sum + monthlyAmount;
    }, 0);

    const monthlySpendChange = previousMonthSpend > 0 
      ? Math.round(((totalMonthly - previousMonthSpend) / previousMonthSpend) * 100)
      : 0;

    const newServicesTracked = currentMonthSubs.length;

    // Calculate this month's savings: only subscriptions actually deleted during
    // the current calendar month qualify as real savings. "to-cancel" is just
    // potential and should not be included here.
    const deletedSavings = subscriptions
      .filter(s => s.status === 'deleted')
      .filter(s => {
        if (s.updated_at) {
          const d = new Date(s.updated_at);
          return d >= currentMonth && d < nextMonth;
        }
        // If updated_at is unavailable, include all deleted subscriptions as an approximate fallback
        return true;
      })
      .reduce((sum, s) => {
        const monthlyAmount = s.frequency === 'yearly' ? s.amount / 12 : s.frequency === 'quarterly' ? s.amount / 3 : s.frequency === 'weekly' ? s.amount * 4 : s.amount;
        return sum + monthlyAmount;
      }, 0);

    const thisMonthSavingsAmount = Math.round(deletedSavings * 100) / 100;

    // Calculate potential savings: subscriptions marked as "unused" or "to-cancel" are planned savings.
    const potentialSavingsAmount = Math.round(subscriptions.filter(s => s.status === 'unused' || s.status === 'to-cancel').reduce((sum, s) => sum + (s.frequency === 'yearly' ? s.amount / 12 : s.frequency === 'quarterly' ? s.amount / 3 : s.frequency === 'weekly' ? s.amount * 4 : s.amount), 0) * 100) / 100;

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
    await cache.set(cacheKey, JSON.stringify(metrics), 300);
    res.json(metrics);
  }));

  app.get("/api/subscriptions", asyncHandler(async (req, res) => {
    // parse pagination
    const { page, perPage } = getPaginationParams(req);

    // Cache key based on user
    let userId = req.session?.user?.id;
    if (!userId) {
      const authHeader = req.headers.authorization?.replace('Bearer ', '');
      if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
    }
    if (!userId) throw new UnauthorizedError('Authentication required');
    const cacheKey = `subscriptions:${userId}:p${page}:n${perPage}`;
    const cached = await cache.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    // Auto-advance renewal dates for expired subscriptions (if supported by renewal manager)
    try {
      await runRenewalChecks(userId);
    } catch (err) {
      console.error("[Routes] Error auto-advancing renewal dates:", err);
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

  app.get("/api/subscriptions/:id", asyncHandler(async (req, res) => {
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

  app.post("/api/subscriptions", asyncHandler(async (req, res) => {
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
      next_billing_at: String(nextBillingDate),
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

    if (insertError || !inserted) {
      console.error('[Routes] Failed to insert subscription', {
        insertPayload,
        insertError,
      });
      throw new AppError(500, insertError?.message || 'Failed to create subscription');
    }

    res.status(201).json(mapSubscriptionFromDb(inserted));
  }));

  app.patch("/api/subscriptions/:id/usage", asyncHandler(async (req, res) => {
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

  app.patch("/api/subscriptions/:id", asyncHandler(async (req, res) => {
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
    // Normalize date format (YYYY-MM-DD)
    let normalized = nextBillingDate;
    try {
      const d = new Date(nextBillingDate);
      if (!isNaN(d.getTime())) {
        normalized = d.toISOString().split('T')[0];
      }
    } catch (e) {}
    console.log('[Routes] Updating subscription with normalized date:', normalized);
    // Perform update directly using Supabase
    const { data, error: updateErr } = await supabase
      .from('subscriptions')
      .update({ next_billing_at: normalized })
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

  app.patch("/api/subscriptions/:id/status", asyncHandler(async (req, res) => {
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

  app.post("/api/subscriptions/:id/log-usage", async (req, res) => {
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
  app.post("/api/track-usage-by-domain", async (req, res) => {
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
      const costPerUse = subscription.usageCount > 0 ? monthlyAmount / subscription.usageCount : monthlyAmount;

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



  app.delete("/api/subscriptions/:id", async (req, res) => {
    try {
      // Get user ID for authorization check
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      // Instead of hard-deleting the row, mark it as deleted so we can
      // correctly attribute monthly savings to the month the deletion
      // occurred. This prevents saved amounts from disappearing when
      // rows are purged or when metrics are recalculated.
      const supabase = getSupabaseClient();
      const { data, error } = await supabase
        .from('subscriptions')
        .update({ status: 'deleted', deleted_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (error || !data) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      res.status(200).json(mapSubscriptionFromDb(data));
    } catch (error) {
      res.status(500).json({ error: "Failed to delete subscription" });
    }
  });

  // Get calendar events for the user (includes both db events and renewal dates from subscriptions)
  app.get("/api/calendar-events", async (req, res) => {
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

      console.log("[Routes] Subscriptions found:", subscriptions?.length || 0, "- Data:", subscriptions?.map(s => ({ name: s.name, status: s.status, next_billing_at: s.next_billing_at })));

      // Generate renewal events from active subscriptions
      const renewalEvents = (subscriptions || [])
        .filter(sub => sub.status === "active" || sub.status === "unused")
        .map(sub => {
          // Use existing next_billing_at or default to today
          let billingDate = sub.next_billing_at;
          if (!billingDate) {
            console.log(`[Routes] Subscription ${sub.id} (${sub.name}) missing next_billing_at, using today`);
            billingDate = new Date().toISOString().split("T")[0];
          }

          return {
            id: `renewal-${sub.id}`,
            subscriptionId: sub.id,
            userId: userId,
            Title: `${sub.name} Renewal`,
            title: `${sub.name} Renewal`,
            eventDate: typeof billingDate === "string" 
              ? billingDate.split("T")[0] 
              : new Date(billingDate).toISOString().split("T")[0],
            eventType: "renewal" as const,
            amount: sub.amount,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
        });

      console.log("[Routes] Renewal events generated:", renewalEvents.length, "- Events:", renewalEvents.map(e => ({ id: e.id, title: e.title, eventDate: e.eventDate })));

      // Merge db events and renewal events, removing duplicates
      const eventMap = new Map<string, any>();
      (dbEvents || []).forEach(e => {
        eventMap.set(e.id, e);
      });
      renewalEvents.forEach(e => {
        if (!eventMap.has(e.id)) {
          eventMap.set(e.id, e);
        }
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

  app.get("/api/spending/monthly", async (req, res) => {
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

      // Get current date
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Create array of last 12 months
      const months: Array<{ year: number; month: number; yearMonth: string; startDate: Date; endDate: Date }> = [];
      for (let i = 11; i >= 0; i--) {
        let date = new Date(currentYear, currentMonth - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        const yearMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 1, 0);
        months.push({ year, month, yearMonth, startDate, endDate });
      }

      // Calculate spending for each month based on renewal dates
      const monthlyData = new Map<string, number>();
      months.forEach(({ yearMonth }) => {
        monthlyData.set(yearMonth, 0);
      });

      // For each subscription, calculate renewal dates and add spending
      subscriptions.forEach(sub => {
        if (sub.status === 'deleted' || sub.status === 'to-cancel') return;

        const createdDate = new Date(sub.created_at || new Date());
        
        // Calculate renewal dates based on frequency
        let renewalDate = new Date(createdDate);

        // Add spending for each month based on renewal cycle
        for (let i = 0; i < 24; i++) { // Look ahead 24 months to be safe
          // Check if this renewal date falls within any of our 12 months
          months.forEach(({ yearMonth, startDate, endDate }) => {
            if (renewalDate >= startDate && renewalDate <= endDate) {
              const existing = monthlyData.get(yearMonth) || 0;
              monthlyData.set(yearMonth, existing + sub.amount);
            }
          });

          // Calculate next renewal date based on frequency
          const nextRenewalDate = new Date(renewalDate);
          if (sub.frequency === 'yearly') {
            nextRenewalDate.setFullYear(nextRenewalDate.getFullYear() + 1);
          } else if (sub.frequency === 'quarterly') {
            nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 3);
          } else if (sub.frequency === 'weekly') {
            nextRenewalDate.setDate(nextRenewalDate.getDate() + 7);
          } else {
            // Default to monthly
            nextRenewalDate.setMonth(nextRenewalDate.getMonth() + 1);
          }
          
          renewalDate = nextRenewalDate;

          // Stop if we've gone too far in the future
          if (renewalDate > new Date(currentYear + 2, currentMonth, 1)) {
            break;
          }
        }
      });

      // Convert to array with formatted month names
      const result = months.map(({ yearMonth, year, month }) => {
        const monthDate = new Date(year, month);
        const monthName = monthDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        return {
          month: monthName,
          amount: Math.round((monthlyData.get(yearMonth) || 0) * 100) / 100
        };
      });

      res.json(result);
    } catch (error) {
      console.error("[Spending] Error calculating monthly spending:", error);
      res.status(500).json({ error: "Failed to get monthly spending" });
    }
  });

  app.get("/api/spending/category", async (req, res) => {
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

      // Group by category
      const categoryMap = new Map<string, { amount: number; count: number }>();
      subscriptions.forEach(sub => {
        if (sub.status !== 'deleted') {
          const monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'quarterly' ? sub.amount / 3 : sub.frequency === 'weekly' ? sub.amount * 4 : sub.amount;
          const existing = categoryMap.get(sub.category) || { amount: 0, count: 0 };
          categoryMap.set(sub.category, {
            amount: existing.amount + monthlyAmount,
            count: existing.count + 1
          });
        }
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


  app.get("/api/insights/behavioral", async (req, res) => {
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
        // find all groups this user owns
        const { data: groups } = await supabase
          .from('family_groups')
          .select('id')
          .eq('owner_id', userId);
        const groupIds: string[] = (groups || []).map((g: any) => g.id);
        if (groupIds.length > 0) {
          // get all members of those groups
          const { data: members } = await supabase
            .from('family_group_members')
            .select('user_id')
            .in('family_group_id', groupIds);
          const memberIds: string[] = (members || []).map((m: any) => m.user_id);
          if (!memberIds.includes(userId)) memberIds.push(userId);
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
          (sub.status === 'unused' || sub.status === 'to-cancel') ||
          (sub.subStatus === 'unused' || sub.subStatus === 'to-cancel')
        );

        // Generate behavioral insights from actionable subscriptions
        const insights = actionableSubs.map(sub => {
          const monthlyAmount = sub.frequency === 'yearly' ? sub.amount / 12 : sub.frequency === 'quarterly' ? sub.amount / 3 : sub.frequency === 'weekly' ? sub.amount * 4 : sub.amount;
          const items = [
            { item: 'coffee drinks', unitCost: 5, icon: 'coffee' },
            { item: 'movie tickets', unitCost: 15, icon: 'film' },
            { item: 'lunch meals', unitCost: 12, icon: 'utensils' }
          ];

          const equivalents = items
            .map(e => ({
              item: e.item,
              count: Math.floor(monthlyAmount / e.unitCost),
              icon: e.icon,
              totalCost: Math.floor(monthlyAmount / e.unitCost) * e.unitCost
            }))
            .filter(e => e.count >= 1)
            .sort((a, b) => b.count - a.count)
            .slice(0, 1);

          return {
            subscriptionId: sub.id,
            subscriptionName: sub.name,
            monthlyAmount: Math.round(monthlyAmount * 100) / 100,
            equivalents
          };
        });

        res.json(insights);
    } catch (error) {
      res.status(500).json({ error: "Failed to get behavioral insights" });
    }
  });

  app.get("/api/insights", async (req, res) => {
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

  app.get("/api/recommendations", async (req, res) => {
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
        // find all groups this user owns
        const { data: groups } = await supabase
          .from('family_groups')
          .select('id')
          .eq('owner_id', userId);
        const groupIds: string[] = (groups || []).map((g: any) => g.id);
        if (groupIds.length > 0) {
          // get all members of those groups
          const { data: members } = await supabase
            .from('family_group_members')
            .select('user_id')
            .in('family_group_id', groupIds);
          const memberIds: string[] = (members || []).map((m: any) => m.user_id);
          if (!memberIds.includes(userId)) memberIds.push(userId);
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
      
      const { generateAIRecommendations } = await import('./family-sharing');
      const recommendations = generateAIRecommendations(subsToConsider || []);

      console.log('[Routes] /api/recommendations returning', (recommendations || []).length, 'recommendations');
      res.json(recommendations || []);
    } catch (error) {
      console.error('[Routes] /api/recommendations error:', error instanceof Error ? error.stack || error.message : error);
      res.status(500).json({ error: "Failed to get recommendations" });
    }
  });

  app.get("/api/bank-connections", async (req, res) => {
    try {
      const connections = await storage.getBankConnections();
      res.json(connections);
    } catch (error) {
      res.status(500).json({ error: "Failed to get bank connections" });
    }
  });

  app.post("/api/bank-connections", async (req, res) => {
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

  app.patch("/api/bank-connections/:id/sync", async (req, res) => {
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

  app.delete("/api/bank-connections/:id", async (req, res) => {
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
  app.patch("/api/account/email", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email || !email.includes("@")) {
        return res.status(400).json({ error: "Invalid email address" });
      }
      // In a real app, this would verify the user is authenticated
      // For now, we'll use a mock user ID
      const mockUserId = "default-user-id";
      const updatedUser = await storage.updateUserEmail(mockUserId, email);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, message: "Email updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update email" });
    }
  });

  app.patch("/api/account/password", async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: "Missing password fields" });
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      // In a real app, this would verify the current password
      const mockUserId = "default-user-id";
      const updatedUser = await storage.updateUserPassword(mockUserId, newPassword);
      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true, message: "Password updated successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update password" });
    }
  });

  app.post("/api/account/2fa", async (req, res) => {
    try {
      const { code } = req.body;
      if (!code || code.length !== 6) {
        return res.status(400).json({ error: "Invalid authentication code" });
      }
      // In a real app, this would verify the 2FA code against a time-based OTP
      res.json({ success: true, message: "Two-factor authentication enabled" });
    } catch (error) {
      res.status(500).json({ error: "Failed to enable 2FA" });
    }
  });

  app.get("/api/account/export", async (req, res) => {
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

  app.delete("/api/account", async (req, res) => {
    try {
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace("Bearer ", "");
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const supabase = getSupabaseClient();

      // Delete all user's subscriptions
      const { error: subsError } = await supabase
        .from("subscriptions")
        .delete()
        .eq("user_id", userId);

      if (subsError) {
        console.error("[Account] Error deleting subscriptions:", subsError);
      }

      // Delete all user's family group memberships
      const { error: membersError } = await supabase
        .from("family_members")
        .delete()
        .eq("user_id", userId);

      if (membersError) {
        console.error("[Account] Error deleting family memberships:", membersError);
      }

      // Delete all family groups owned by this user
      const { error: groupsError } = await supabase
        .from("family_groups")
        .delete()
        .eq("owner_id", userId);

      if (groupsError) {
        console.error("[Account] Error deleting owned family groups:", groupsError);
      }

      // Delete notification preferences
      const { error: prefsError } = await supabase
        .from("notification_preferences")
        .delete()
        .eq("user_id", userId);

      if (prefsError) {
        console.error("[Account] Error deleting preferences:", prefsError);
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
  app.get("/api/account/notification-preferences", async (req, res) => {
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

  // Update notification preferences
  app.patch("/api/account/notification-preferences", async (req, res) => {
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
  app.get("/api/analytics/monthly-savings", async (req, res) => {
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
        // find all groups this user owns
        const { data: groups } = await supabase
          .from('family_groups')
          .select('id')
          .eq('owner_id', userId);
        const groupIds: string[] = (groups || []).map((g: any) => g.id);
        if (groupIds.length > 0) {
          // get all members of those groups
          const { data: members } = await supabase
            .from('family_group_members')
            .select('user_id')
            .in('family_group_id', groupIds);
          const memberIds: string[] = (members || []).map((m: any) => m.user_id);
          if (!memberIds.includes(userId)) memberIds.push(userId);
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

      const isInCurrentMonth = (sub: any) => {
        const timestamp = sub.deleted_at || sub.deletedAt || sub.updated_at || sub.updatedAt;
        if (timestamp) {
          const deletedDate = new Date(timestamp);
          return deletedDate >= currentMonth && deletedDate < nextMonth;
        }
        // If no timestamp is available, treat as a fallback deletion that counts.
        return true;
      };

      const calculateSavings = (subs: any[]) =>
        subs
          .filter((sub) => sub.status === 'deleted')
          .filter(isInCurrentMonth)
          .reduce((total, sub) => {
            const monthlyAmount = sub.frequency === 'yearly'
              ? sub.amount / 12
              : sub.frequency === 'quarterly'
                ? sub.amount / 3
                : sub.frequency === 'weekly'
                  ? sub.amount * 4
                  : sub.amount;
            return total + monthlyAmount;
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
  app.get("/api/user/premium-status", async (req, res) => {
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
  app.patch('/api/user/currency', async (req, res) => {
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
      await supabase.from('users').upsert({ id: userId, currency }).catch((e) => {
        console.warn('[Routes] failed to upsert currency into users table', e);
      });

      res.json({ currency });
    } catch (err) {
      console.error('[Routes] PATCH /api/user/currency error:', err);
      res.status(500).json({ error: 'Failed to update currency' });
    }
  });

  // Family group endpoints (use server/family-sharing helpers)
  app.get('/api/family-groups', async (req, res) => {
    try {
      // Try to get user id from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) {
          const supabase = getSupabaseClient();
          const { data: { user } = {} } = await supabase.auth.getUser(authHeader).catch(() => ({} as any));
          if (user) userId = user.id;
        }
      }

      if (!userId) return res.json([]);

      const groups = await import('./family-sharing').then(m => m.getFamilyGroups(userId));
      res.json(groups);
    } catch (err) {
      console.error('[Routes] GET /api/family-groups error:', err);
      res.status(500).json({ error: 'Failed to fetch family groups' });
    }
  });

  app.post('/api/family-groups', async (req, res) => {
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

      const family = await import('./family-sharing').then(m => m.createFamilyGroup(userId!, name));
      console.log('[Routes] Created family group:', family);
      return res.status(201).json(family);
    } catch (err) {
      console.error('[Routes] POST /api/family-groups error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to create family group', message });
    }
  });

  app.delete('/api/family-groups/:id', async (req, res) => {
    try {
      // user must be owner
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const id = req.params.id;
      await import('./family-sharing').then(m => m.deleteFamilyGroup(id, userId!));
      res.status(204).send();
    } catch (err) {
      console.error('[Routes] DELETE /api/family-groups/:id error:', err);
      res.status(500).json({ error: 'Failed to delete family group' });
    }
  });

  // Get family group settings
  app.get('/api/family-groups/:id/settings', async (req, res) => {
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
  app.get('/api/family-groups/me/membership', async (req, res) => {
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
      console.error('[Routes] GET /api/family-groups/me/membership error', err);
      res.status(500).json({ error: 'Failed to fetch membership' });
    }
  });

  // Update family group settings (owner only)
  app.put('/api/family-groups/:id/settings', async (req, res) => {
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
  app.get('/api/family-groups/:id/members', async (req, res) => {
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

      const { getFamilyMembers } = await import('./family-sharing');
      const members = await getFamilyMembers(groupId);
      res.json(members);
    } catch (err) {
      console.error('[Routes] GET /api/family-groups/:id/members error:', err);
      res.status(500).json({ error: 'Failed to fetch family members' });
    }
  });

  // Add family group member
  app.post('/api/family-groups/:id/members', async (req, res) => {
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
          if (supabase.auth.admin.getUserByEmail) {
            const { data: userDataByEmail, error: emailErr } = await supabase.auth.admin.getUserByEmail(emailCandidate);
            if (!emailErr && userDataByEmail?.user) {
              memberUserId = userDataByEmail.user.id;
            }
          }
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
          if (!listError && listData?.users) {
            const found = listData.users.find(u => u.id === rawIdentifier || u.email?.toLowerCase() === rawIdentifier.toLowerCase());
            if (found) memberUserId = found.id;
          }
        } catch (lookupErr) {
          console.error('[Routes] Error listing users fallback:', lookupErr);
        }
      }

      if (!memberUserId) {
        return res.status(404).json({ error: "User not found; please use an exact registered email or user ID" });
      }

      const { addFamilyMember } = await import('./family-sharing');
      const member = await addFamilyMember(groupId, userId!, memberUserId);
      res.status(201).json(member);
    } catch (err) {
      console.error('[Routes] POST /api/family-groups/:id/members error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to add family member', message });
    }
  });

  // Remove family group member
  app.delete('/api/family-groups/:id/members/:memberId', async (req, res) => {
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

      const { removeFamilyMember } = await import('./family-sharing');
      await removeFamilyMember(groupId, userId!, memberUserId);
      res.status(204).send();
    } catch (err) {
      console.error('[Routes] DELETE /api/family-groups/:id/members/:memberId error:', err);
      res.status(500).json({ error: 'Failed to remove family member' });
    }
  });

  // Get shared subscriptions for a family group
  app.get('/api/family-groups/:id/shared-subscriptions', async (req, res) => {
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

      res.json(sharedSubs || []);
    } catch (err) {
      console.error('[Routes] GET /api/family-groups/:id/shared-subscriptions error:', err);
      res.status(500).json({ error: 'Failed to fetch shared subscriptions' });
    }
  });

  // Share a subscription with family group
  app.post('/api/family-groups/:id/share-subscription', async (req, res) => {
    try {
      const { id: groupId } = req.params;
      const { subscriptionId } = req.body;

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

      // Create shared subscription record
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
    } catch (err) {
      console.error('[Routes] POST /api/family-groups/:id/share-subscription error:', err);
      res.status(500).json({ error: 'Failed to share subscription' });
    }
  });

  // Unshare a subscription (delete shared record)
  app.delete('/api/family-groups/:id/shared-subscriptions/:sharedId', async (req, res) => {
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

      const { unshareSubscription } = await import('./family-sharing');
      await unshareSubscription(sharedId);
      res.status(204).send();
    } catch (err) {
      console.error('[Routes] DELETE /api/family-groups/:id/shared-subscriptions/:sharedId error:', err);
      res.status(500).json({ error: 'Failed to unshare subscription' });
    }
  });

  // Cost splits endpoints
  app.post('/api/family-groups/:id/shared-subscriptions/:sharedId/cost-splits', async (req, res) => {
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

      const { setCostSplit } = await import('./family-sharing');
      const split = await setCostSplit(sharedId, userId, percentage);
      res.status(201).json(split);
    } catch (err) {
      console.error('[Routes] POST cost-split error:', err);
      res.status(500).json({ error: 'Failed to set cost split' });
    }
  });

  app.get('/api/family-groups/:id/shared-subscriptions/:sharedId/cost-splits', async (req, res) => {
    try {
      const { id: groupId, sharedId } = req.params;

      // Resolve requester id for auth
      let requesterId = req.session?.user?.id;
      if (!requesterId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) requesterId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

      const { getCostSplits } = await import('./family-sharing');
      const splits = await getCostSplits(sharedId);
      res.json(splits);
    } catch (err) {
      console.error('[Routes] GET cost-splits error:', err);
      res.status(500).json({ error: 'Failed to fetch cost splits' });
    }
  });

  // Get member's dashboard data
  app.get('/api/family-groups/:id/members/:memberId/dashboard', async (req, res) => {
    try {
      const { id: groupId, memberId } = req.params;
      const supabase = getSupabaseClient();

      // Resolve requester id
      let requesterId = req.session?.user?.id;
      if (!requesterId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) requesterId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!requesterId) return res.status(401).json({ error: 'Unauthorized' });

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
        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', memberId);

        const { data: userSub } = await supabase
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', memberId)
          .single();

        return res.json({
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

      return res.json({
        member,
        subscriptions: subscriptions || [],
        userSubscription: userSub || null,
      });
    } catch (err) {
      console.error('[Routes] GET /api/family-groups/:id/member/:memberId/dashboard error:', err);
      res.status(500).json({ error: 'Failed to fetch member dashboard data' });
    }
  });

  // Get family data (all members' subscriptions when show_family_data is enabled)
  app.get('/api/family-groups/:id/family-data', async (req, res) => {
    try {
      const { generateAIRecommendations } = await import('./family-sharing');
      const { id: groupId } = req.params;
      const supabase = getSupabaseClient();

      // Resolve user id from session or authorization header
      let userId = req.session?.user?.id;
      if (!userId) {
        const authHeader = req.headers.authorization?.replace('Bearer ', '');
        if (authHeader) userId = extractUserIdFromToken(authHeader) || undefined;
      }
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

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

      if (settingsError || !settings?.show_family_data) {
        return res.status(403).json({ error: 'Family data sharing not enabled' });
      }

      // Get all members of the group
      const { data: members, error: membersError } = await supabase
        .from('family_group_members')
        .select('user_id, role')
        .eq('family_group_id', groupId);

      if (membersError || !members) {
        return res.status(500).json({ error: 'Failed to fetch family members' });
      }

      // Determine if requester is the owner
      const isOwner = groupRow.owner_id === userId;
      
      // Get shared subscriptions for the group
      const { data: sharedSubs } = await supabase
        .from('shared_subscriptions')
        .select(`
          id,
          subscription_id,
          shared_by_user_id,
          shared_at
        `)
        .eq('family_group_id', groupId);

      // Also fetch the actual subscription rows for any shared subscription ids
      let sharedSubscriptionsDetailed = sharedSubs || [];
      try {
        const sharedSubscriptionIds = (sharedSubs || []).map(s => s.subscription_id).filter(Boolean);
        const sharedByUserIds = Array.from(new Set((sharedSubs || []).map(s => s.shared_by_user_id).filter(Boolean)));
        let sharedRows = [];
        let userRows = [];
        if (sharedSubscriptionIds.length > 0) {
          const { data: _sharedRows } = await supabase
            .from('subscriptions')
            .select('*')
            .in('id', sharedSubscriptionIds);
          sharedRows = _sharedRows || [];
        }
        if (sharedByUserIds.length > 0) {
          // Try to get user info from auth.users (admin API)
          let usersById = {};
          try {
            const { data: { users } = {} } = await supabase.auth.admin.listUsers();
            if (users) {
              usersById = users.reduce((acc, u) => {
                acc[u.id] = { email: u.email, name: u.user_metadata?.name || u.email };
                return acc;
              }, {});
            }
          } catch (err) {
            console.warn('[Routes] Failed to fetch user info for shared subscriptions', err);
          }
          userRows = usersById;
        }
        // Merge the subscription row and owner info into each shared subscription entry
        sharedSubscriptionsDetailed = (sharedSubs || []).map(ss => ({
          ...ss,
          subscription: (sharedRows || []).find(r => r.id === ss.subscription_id) || null,
          owner: userRows[ss.shared_by_user_id] || { email: ss.shared_by_user_id, name: ss.shared_by_user_id },
        }));
      } catch (err) {
        console.warn('[Routes] Failed to fetch detailed shared subscriptions', err);
      }

      // Get subscriptions based on requester's role
      let allSubscriptions;
      if (isOwner) {
        // Owner can see all members' subscriptions + their own
        // First, get all members' subscriptions
        let memberIds = members.map(m => m.user_id);
        const { data: memberSubs } = await supabase
          .from('subscriptions')
          .select('*')
          .in('user_id', memberIds);
        
        // Then, explicitly get owner's subscriptions too (in case owner is not in members list)
        const { data: ownerSubs } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId);
        
        // Combine them, deduplicating by ID
        const combined = new Map<string, any>();
        (memberSubs || []).forEach(s => combined.set(s.id, s));
        (ownerSubs || []).forEach(s => combined.set(s.id, s));
        allSubscriptions = Array.from(combined.values());
      } else {
        // Members should see their own subscriptions _plus_ anything shared
        // with the group. Previously we only returned the personal list which
        // meant sharing was invisible to non-owner members.
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', userId);
        let memberSubs: any[] = subs || [];

        if (sharedSubs && sharedSubs.length > 0) {
          // fetch the actual subscription rows for any shared ids and append
          const sharedIds = sharedSubs.map((s: any) => s.subscription_id).filter(Boolean);
          if (sharedIds.length > 0) {
            const { data: sharedRows } = await supabase
              .from('subscriptions')
              .select('*')
              .in('id', sharedIds);
            if (sharedRows && sharedRows.length > 0) {
              // avoid duplicate if the member already owns the subscription
              const existingIds = new Set(memberSubs.map((s: any) => s.id));
              sharedRows.forEach((row: any) => {
                if (!existingIds.has(row.id)) {
                  memberSubs.push(row);
                }
              });
            }
          }
        }

        allSubscriptions = memberSubs;
      }

      // Get cost splits for shared subscriptions
      const { data: costSplits } = await supabase
        .from('cost_splits')
        .select('*')
        .in('shared_subscription_id', sharedSubs?.map(s => s.id) || []);

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
          nextBillingDate: sub.next_billing_at,
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

      res.json({
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
        // compute simple family metrics server-side so client doesn't have to
        metrics: (() => {
          const subs = (allSubscriptions || []).filter((s: any) => s.status !== 'deleted');
          const sharedRaw = (sharedSubscriptionsDetailed || []).filter((sh: any) => {
            const status = sh.status || sh.subscription?.status;
            return status !== 'deleted';
          });

          // dedupe shared entries if the underlying subscription is already in
          // the main list (common when owner shares their own subscription)
          const sharedIds = new Set(
            sharedRaw.map((sh: any) => sh.subscription_id || sh.subscription?.id)
          );
          const uniqueShared = sharedRaw.filter(
            (sh: any) =>
              !subs.some(
                (s: any) => s.id === (sh.subscription_id || sh.subscription?.id)
              )
          );

          function toMonthly(item: any) {
            const amt = Number(item.amount) || 0;
            const freq = item.frequency || 'monthly';
            let monthly = amt;
            if (freq === 'yearly') monthly = amt / 12;
            if (freq === 'quarterly') monthly = amt / 3;
            if (freq === 'weekly') monthly = (amt * 52) / 12;
            return monthly;
          }

          const totalSubscriptions = subs.length + uniqueShared.length;
          const activeSubscriptions =
            subs.filter((s: any) => !s.status || s.status === 'active').length +
            uniqueShared.length;
          const monthlyFromSubs = subs.reduce(
            (acc: number, s: any) => acc + toMonthly(s),
            0
          );
          const monthlyFromShared = uniqueShared.reduce(
            (acc: number, sh: any) => acc + toMonthly(sh),
            0
          );

          return {
            totalSubscriptions,
            activeSubscriptions,
            totalMonthlySpending: monthlyFromSubs + monthlyFromShared,
            memberCount: members.length,
          };
        })(),
      });
    } catch (err) {
      console.error('[Routes] GET family data error:', err);
      res.status(500).json({ error: 'Failed to fetch family data' });
    }
  });

  // Upgrade current user to family plan
  app.post('/api/user/upgrade-to-family', async (req, res) => {
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

      const { upgradeToPlan } = await import('./family-sharing');
      await upgradeToPlan(userId!, 'family');

      res.json({ success: true, message: 'Upgraded to family plan' });
    } catch (err) {
      console.error('[Routes] POST /api/user/upgrade-to-family error:', err);
      const message = err instanceof Error ? err.message : 'Unknown error';
      res.status(500).json({ error: 'Failed to upgrade to family plan', message });
    }
  });

  // Trigger renewal checks (for testing/manual trigger)
  app.post("/api/admin/renewal-checks", async (req, res) => {
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

  app.get("/api/admin/renewal-checks/logs", asyncHandler(async (req, res) => {
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
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    try {
      console.log("[Stripe] Create checkout session request received");
      console.log("[Stripe] Request body:", req.body);
      const { priceId } = req.body;
      if (!priceId) {
        console.log("[Stripe] No price ID provided");
        return res.status(400).json({ error: "Price ID required" });
      }

      console.log(`[Stripe] Looking up payment link for price: ${priceId}`);

      // Map price IDs directly to payment links
      const priceIdToPaymentLink: Record<string, string> = {
        'price_1T3jhIJpTYwzr88x8pGboTSU': 'https://buy.stripe.com/aFa5kE8Ip1sJf8gbll0Ba02', // Premium
        'price_1T3jikJpTYwzr88xIxkKHkKu': 'https://buy.stripe.com/5kQdRa5wd3ARd084WX0Ba03', // Family
      };

      const paymentUrl = priceIdToPaymentLink[priceId];
      if (!paymentUrl) {
        console.error(`[Stripe] Unknown price ID: ${priceId}`);
        return res.status(400).json({ 
          error: "Invalid price ID",
          message: `Price ID ${priceId} not found in payment link mapping`
        });
      }

      console.log(`[Stripe] Found payment link: ${paymentUrl}`);
      res.json({ url: paymentUrl });
    } catch (err) {
      console.error("[Stripe] Error in create-checkout-session:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ 
        error: "Failed to get payment link",
        message
      });
    }
  });

  // Stripe: Get subscription status
  app.get("/api/stripe/subscription-status", async (req, res) => {
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
  app.post("/api/stripe/cancel-subscription", async (req, res) => {
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

      const { StripeService } = await import('./stripe');
      await StripeService.cancelSubscription(userId);

      res.json({ success: true, message: "Subscription cancelled" });
    } catch (err) {
      console.error("[Routes] Error cancelling subscription:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: "Failed to cancel subscription", message });
    }
  });

  // Stripe: Reactivate subscription
  app.post("/api/stripe/reactivate-subscription", async (req, res) => {
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
      const { StripeService } = await import('./stripe');
      await StripeService.reactivateSubscription(userId);

      res.json({ success: true, message: "Subscription reactivated" });
    } catch (err) {
      console.error("[Routes] Error reactivating subscription:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: "Failed to reactivate subscription", message });
    }
  });

  // Stripe webhook - handles payment completion and subscription updates
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

      if (!webhookSecret) {
        console.warn("[Webhook] STRIPE_WEBHOOK_SECRET not configured");
        return res.status(400).json({ error: "Webhook not configured" });
      }

      const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
      const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

      console.log("[Webhook] Received event:", event.type);

      // Map price IDs to plan types
      const priceIdToPlanType: Record<string, "premium" | "family"> = {
        "price_1T3jhIJpTYwzr88x8pGboTSU": "premium",
        "price_1T3jikJpTYwzr88xIxkKHkKu": "family",
      };

      const { supabase } = await import("./db");
      const supabaseAdmin = supabase();

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as any;
          console.log("[Webhook] Checkout session completed:", session.id);

          if (session.customer && session.subscription) {
            // Get subscription details to get price ID
            const subscription = await stripe.subscriptions.retrieve(session.subscription);
            const priceId = subscription.items.data[0]?.price.id;
            const planType = priceIdToPlanType[priceId];

            if (planType) {
              console.log(`[Webhook] Subscription created with plan: ${planType}`);

              // Get customer to find user by email
              const customer = await stripe.customers.retrieve(session.customer);
              const customerEmail = customer.email;

              if (customerEmail) {
                // Look up user by email in Supabase auth
                const { data: userData } = await supabaseAdmin.auth.admin.listUsers();
                const user = userData.users.find((u) => u.email === customerEmail);

                if (user) {
                  const userId = user.id;
                  console.log(`[Webhook] Found user ${userId} for email ${customerEmail}`);

                  // Update or create user subscription
                  const { error: updateError } = await supabaseAdmin
                    .from("user_subscriptions")
                    .upsert(
                      {
                        user_id: userId,
                        stripe_customer_id: session.customer,
                        stripe_subscription_id: session.subscription,
                        stripe_price_id: priceId,
                        plan_type: planType,
                        status: "active",
                        current_period_start: new Date(subscription.current_period_start * 1000),
                        current_period_end: new Date(subscription.current_period_end * 1000),
                        cancel_at_period_end: subscription.cancel_at_period_end,
                        updated_at: new Date(),
                      },
                      { onConflict: "user_id" }
                    );

                  if (updateError) {
                    console.error("[Webhook] Error updating subscription:", updateError);
                  } else {
                    console.log("[Webhook] Subscription updated successfully for user:", userId);
                  }
                } else {
                  console.warn(`[Webhook] No user found for email ${customerEmail}`);
                }
              }
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as any;
          console.log("[Webhook] Subscription updated:", subscription.id);

          const priceId = subscription.items.data[0]?.price.id;
          const planType = priceIdToPlanType[priceId];

          if (planType) {
            // Find user by stripe_subscription_id and update their plan
            const { data: userSub } = await supabaseAdmin
              .from("user_subscriptions")
              .select("user_id")
              .eq("stripe_subscription_id", subscription.id)
              .single();

            if (userSub) {
              const { error: updateError } = await supabaseAdmin
                .from("user_subscriptions")
                .update({
                  stripe_price_id: priceId,
                  plan_type: planType,
                  status: subscription.status,
                  cancel_at_period_end: subscription.cancel_at_period_end,
                  current_period_end: new Date(subscription.current_period_end * 1000),
                  updated_at: new Date(),
                })
                .eq("stripe_subscription_id", subscription.id);

              if (updateError) {
                console.error("[Webhook] Error updating subscription:", updateError);
              } else {
                console.log("[Webhook] Subscription upgraded/downgraded successfully for user:", userSub.user_id);
                // --- Family group downgrade logic ---
                try {
                  // Only trigger if new plan is 'premium' or 'free'
                  if (planType === 'premium' || planType === 'free') {
                    // Dynamically import family-sharing helpers
                    const { getFamilyGroups, getFamilyMembers } = await import('./family-sharing');
                    // Find all groups where this user is the owner
                    const groups = await getFamilyGroups(userSub.user_id);
                    const ownedGroups = groups.filter(g => g.ownerId === userSub.user_id);
                    for (const group of ownedGroups) {
                      // Get all members except the owner
                      const members = await getFamilyMembers(group.id);
                      for (const member of members) {
                        if (member.userId !== userSub.user_id) {
                          // Revert member to original plan
                          try {
                            const { downgradeFromFamilyPlan } = await import('./family-sharing');
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
            }
          }
          break;
        }

        case "invoice.payment_succeeded": {
          const invoice = event.data.object as any;
          console.log("[Webhook] Invoice payment succeeded:", invoice.id);
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
  app.post("/api/contact", async (req, res) => {
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

      if (!emailResult.success) {
        console.error("[Contact] Failed to send email:", emailResult.error);
        // Still return success to user since the form submission was valid
        // The email failure is logged but doesn't break the user experience
      }

      // Log the contact request
      console.log("[Contact] New contact form submission:", {
        name,
        email,
        subject: subject || "No subject",
        message,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        emailSent: emailResult.success
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

  // Download extension endpoint
  app.get("/api/extension/download", async (req, res) => {
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

      archive.on('error', (err) => {
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

  // Global 404 handler for undefined routes
  app.use(notFoundHandler);

  // Global error handler (must be last)
  app.use(errorHandler);

  return httpServer;
}






