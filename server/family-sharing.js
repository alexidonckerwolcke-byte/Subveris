import { createClient } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase.js';

function client() {
  return getSupabaseClient();
}

export async function addFamilyMember(familyGroupId, actorUserId, userIdToAdd) {
  const c = client();
  const fg = await c.from('family_groups').select('owner_id').eq('id', familyGroupId).single();
  const ownerId = fg?.data?.owner_id || fg?.owner_id;
  if (ownerId !== actorUserId) throw new Error('Only group owner can add members');

  const insertRes = await c.from('family_group_members').insert({ family_group_id: familyGroupId, user_id: userIdToAdd, role: 'member' });
  const inserted = insertRes?.data || insertRes;

  // try to fetch user email from auth
  let email = null;
  try {
    const adminRes = c.auth?.admin?.getUserById ? await c.auth.admin.getUserById(userIdToAdd) : null;
    email = adminRes?.data?.user?.email || null;
  } catch (e) {}

  return { userId: userIdToAdd, email, role: inserted?.role || 'member', id: inserted?.id };
}

export async function getFamilyMembers(familyGroupId) {
  const c = client();
  const res = await c.from('family_group_members').select('*').eq('family_group_id', familyGroupId);
  const rows = res?.data || res || [];
  return (Array.isArray(rows) ? rows : [rows]).map((r) => ({ id: r.id, familyGroupId: r.family_group_id || r.familyGroupId || familyGroupId, userId: r.user_id || r.userId, role: r.role, joinedAt: r.joined_at || r.joinedAt, email: r.email }));
}

export async function getFamilyMembersWithSubscriptions(familyGroupId) {
  const members = await getFamilyMembers(familyGroupId);
  const ids = members.map((m) => m.userId);
  const c = client();
  const subsRes = await c.from('user_subscriptions').select('id, user_id, plan_type, status').in('user_id', ids);
  const subs = subsRes?.data || subsRes || [];
  const normalizedSubs = Array.isArray(subs) ? subs : [subs];
  return members.map((m) => ({
    ...m,
    subscription: normalizedSubs.find((s) => s.user_id === m.userId || s.userId === m.userId) || null,
  }));
}

export async function shareSubscription(familyGroupId, subscriptionId, byUserId) {
  const c = client();
  const res = await c.from('shared_subscriptions').insert({ family_group_id: familyGroupId, subscription_id: subscriptionId, shared_by_user_id: byUserId });
  const inserted = res?.data || res;
  // normalize fields for tests expecting subscriptionId and id
  return {
    ...inserted,
    subscriptionId: inserted?.subscription_id || inserted?.subscriptionId,
  };
}

export async function getSharedSubscriptions(familyGroupId) {
  const c = client();
  const res = await c.from('shared_subscriptions').select('*').eq('family_group_id', familyGroupId);
  return res?.data || res || [];
}

export async function setCostSplit(sharedSubscriptionId, userId, percentage) {
  const c = client();
  const res = await c.from('cost_splits').insert({ shared_subscription_id: sharedSubscriptionId, user_id: userId, percentage });
  return res?.data || res;
}

export async function getCostSplits(sharedSubscriptionId) {
  const c = client();
  const res = await c.from('cost_splits').select('*').eq('shared_subscription_id', sharedSubscriptionId);
  const rows = res?.data || res || [];
  return (Array.isArray(rows) ? rows : [rows]).map((r) => ({
    ...r,
    userId: r.user_id || r.userId,
  }));
}

export async function unshareSubscription(sharedId) {
  const c = client();
  await c.from('shared_subscriptions').delete().eq('id', sharedId);
}

export async function removeFamilyMember(familyGroupId, actorUserId, memberUserId) {
  const c = client();
  const fg = await c.from('family_groups').select('owner_id').eq('id', familyGroupId).single();
  const ownerId = fg?.data?.owner_id || fg?.owner_id;
  if (ownerId !== actorUserId && actorUserId !== memberUserId) {
    throw new Error('Only group owner or the member themselves can remove');
  }
  await c.from('family_group_members').delete().eq('family_group_id', familyGroupId).eq('user_id', memberUserId);
}

export async function deleteFamilyGroup(familyGroupId, actorUserId) {
  const c = client();
  const fg = await c.from('family_groups').select('owner_id').eq('id', familyGroupId).single();
  const ownerId = fg?.data?.owner_id || fg?.owner_id;
  if (ownerId !== actorUserId) throw new Error('Only group owner can delete');
  await c.from('family_groups').delete().eq('id', familyGroupId);
}
