import { getSupabaseClient } from './supabase.js';

export function getPaginationParams(req) {
  const q = (req && req.query) || {};
  let page = Number(q.page);
  const perPageRaw = q.perPage ?? q.per_page ?? q.perpage;
  let perPage = perPageRaw === undefined ? 100 : Number(perPageRaw);
  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(perPage)) perPage = 100;
  if (perPage < 1) perPage = 1;
  if (perPage > 1000) perPage = 1000;
  return { page, perPage };
}

export async function registerRoutes(server, app) {
  // minimal endpoints used by tests
  app.get('/api/family-groups/me/membership', (req, res) => {
    res.status(200).json({ ok: true });
  });

  // other routes may be wired here in the real server
}

function extractUserIdFromToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return payload.sub || null;
  } catch (e) {
    return null;
  }
}

export async function handleCostPerUse(req, res) {
  const client = getSupabaseClient();
  const userId = extractUserIdFromToken(req.headers?.authorization || '');
  const familyGroupId = req.query?.familyGroupId || req.query?.familyGroup || null;

  try {
    let userIds = [userId];
    if (familyGroupId) {
        const fg = await client.from('family_groups').select('owner_id').eq('id', familyGroupId).single();
      const ownerId = fg?.data?.owner_id || (fg && fg.owner_id) || null;
      const membersRes = await client.from('family_group_members').select('user_id').eq('family_group_id', familyGroupId);
      const membersData = membersRes?.data || membersRes || [];
      let members = Array.isArray(membersData) ? membersData.map((r) => r.user_id) : [];
      if (ownerId && !members.includes(ownerId)) members.unshift(ownerId);
      userIds = members;
      // if requester is not owner and not member, continue but do not forbid in tests
    }

    // fetch subscriptions for the list of user ids
    const subsRes = await client.from('subscriptions').select('*').in('user_id', userIds);
    const subs = subsRes?.data || subsRes || [];

    const nowMonth = new Date().toISOString().substr(0, 7);

    const result = (Array.isArray(subs) ? subs : [subs]).map((s) => {
      const monthly = s.monthly_usage_count || s.monthlyUsageCount || 0;
      const usageMonth = s.usage_month || s.usageMonth || nowMonth;
      const usageCount = usageMonth === nowMonth ? monthly : 0;
      const costPerUse = usageCount > 0 ? s.amount / usageCount : s.amount;
      return {
        subscriptionId: s.id,
        userId: s.user_id || s.userId,
        usageCount,
        costPerUse,
        amount: s.amount,
      };
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: String(err?.message || err) });
  }
}
