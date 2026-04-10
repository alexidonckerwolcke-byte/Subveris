import { createClient } from '@supabase/supabase-js';
import type { FamilyGroup, FamilyGroupMember, FamilyGroupMemberWithSubscription, SharedSubscription, CostSplit, CalendarEvent } from '@shared/schema';
import { randomUUID } from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Create admin client for auth operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

  // Helper to calculate monthly cost
function monthlyAmountFor(sub: any) {
  if (!sub) return 0;
  const amt = sub.amount || 0;
  const freq = sub.frequency || 'monthly';
  if (freq === 'yearly') return Math.round((amt / 12) * 100) / 100;
  if (freq === 'quarterly') return Math.round((amt / 3) * 100) / 100;
  if (freq === 'weekly') return Math.round((amt * 52) / 12) * 100 / 100;
  return Math.round(amt * 100) / 100;
}

// Helper to generate AI recommendations from a list of subscriptions
export function generateAIRecommendations(subs: any[]): any[] {
  const recommendations: any[] = [];
  if (!subs || subs.length === 0) return recommendations;

  const actionableSubs = subs.filter((sub: any) => 
    sub.status === 'unused' || 
    sub.status === 'to-cancel' || 
    monthlyAmountFor(sub) >= 15
  );

  for (const sub of actionableSubs) {
    try {
      const monthly = monthlyAmountFor(sub);
      const id = randomUUID();

      // 1. If unused, suggest cancel
      if (sub.status === 'unused') {
        recommendations.push({
          id,
          type: 'cancel',
          title: `Cancel ${sub.name}`,
          description: `You've barely used ${sub.name}. Cancelling would save ${monthly} per month.`,
          currentCost: monthly,
          suggestedCost: 0,
          savings: monthly,
          subscriptionId: sub.id,
          confidence: 0.95,
          currency: sub.currency || 'USD',
        });
        continue;
      }

      // 2. If marked for cancellation, suggest completion
      if (sub.status === 'to-cancel') {
        recommendations.push({
          id,
          type: 'cancel',
          title: `Complete cancellation of ${sub.name}`,
          description: `${sub.name} is marked for cancellation. Finalize the cancellation to stop future charges.`,
          currentCost: monthly,
          suggestedCost: 0,
          savings: monthly,
          subscriptionId: sub.id,
          confidence: 0.98,
          currency: sub.currency || 'USD',
        });
        continue;
      }

      // 3. Software or productivity: suggest cheaper alternative or downgrade when expensive
      const nameLower = (sub.name || '').toLowerCase();
      if ((sub.category === 'software' || sub.category === 'productivity' || nameLower.includes('adobe') || nameLower.includes('office') || nameLower.includes('photoshop') || nameLower.includes('illustrator')) && monthly > 15) {
        recommendations.push({
          id,
          type: 'alternative',
          title: `Consider cheaper alternative for ${sub.name}`,
          description: `You could save by switching ${sub.name} to a lower-cost alternative or one-time purchase.`,
          currentCost: monthly,
          suggestedCost: Math.max(0, Math.round((monthly * 0.2) * 100) / 100),
          savings: Math.round((monthly - monthly * 0.2) * 100) / 100,
          subscriptionId: sub.id,
          confidence: 0.7,
          currency: sub.currency || 'USD',
        });
        continue;
      }

      // 4. High cost subscriptions: suggest negotiation or downgrade
      if (monthly >= 20) {
        recommendations.push({
          id,
          type: 'negotiate',
          title: `Negotiate or downgrade ${sub.name}`,
          description: `Contact support or switch to an annual/discounted plan for ${sub.name} to reduce costs.`,
          currentCost: monthly,
          suggestedCost: Math.round((monthly * 0.6) * 100) / 100,
          savings: Math.round((monthly * 0.4) * 100) / 100,
          subscriptionId: sub.id,
          confidence: 0.6,
          currency: sub.currency || 'USD',
        });
        continue;
      }

      // 5. Default low-confidence tip for other subscriptions
      if (monthly >= 10) {
        recommendations.push({
          id,
          type: 'downgrade',
          title: `Review ${sub.name}`,
          description: `Check if you're on the right plan for ${sub.name}. You might save a small amount by downgrading.`,
          currentCost: monthly,
          suggestedCost: Math.round((monthly * 0.9) * 100) / 100,
          savings: Math.round((monthly * 0.1) * 100) / 100,
          subscriptionId: sub.id,
          confidence: 0.35,
          currency: sub.currency || 'USD',
        });
      }
    } catch (e) {
      console.warn('[FamilySharing] Recommendation generation error for sub', sub?.id, e);
    }
  }
  return recommendations;
}

// Helper function to upgrade user to family plan
export async function upgradeToPlan(userId: string, planType: 'family'): Promise<void> {
  // First, back up the user's current plan if they're already in family group with a different plan
  const { data: existingBackups } = await supabase
    .from('family_group_plan_backups')
    .select('*')
    .eq('user_id', userId);

  // Only backup if this is the first time joining a family group
  if (!existingBackups || existingBackups.length === 0) {
    const { data: currentSub } = await supabase
      .from('user_subscriptions')
      .select('plan_type, status')
      .eq('user_id', userId)
      .single();

    if (currentSub && (currentSub.plan_type === 'free' || currentSub.plan_type === 'premium')) {
      // Store the original plan
      const backupId = randomUUID();
      await supabase
        .from('family_group_plan_backups')
        .insert({
          id: backupId,
          user_id: userId,
          family_group_id: '', // Placeholder, will be updated with actual group ID
          original_plan_type: currentSub.plan_type,
          original_status: currentSub.status,
        });
    }
  }

  // Upgrade the user to family plan
  console.log(`[upgradeToPlan] Upgrading user ${userId} to ${planType} plan`);
  
  // Try to find existing subscription
  const { data: existingSubs, error: selectError } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', userId);

  if (selectError && selectError.code !== 'PGRST116') {
    throw new Error(`Failed to check existing subscriptions: ${selectError.message}`);
  }

  if (existingSubs && existingSubs.length > 0) {
    // Update existing subscription
    console.log(`[upgradeToPlan] Updating existing subscription for user ${userId}`);
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        plan_type: planType,
        status: 'active',
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to upgrade user to ${planType} plan: ${updateError.message}`);
    }
    console.log(`[upgradeToPlan] Successfully updated user ${userId} to ${planType} plan`);
  } else {
    // Create new subscription if it doesn't exist
    console.log(`[upgradeToPlan] Creating new subscription for user ${userId}`);
    const subId = randomUUID();
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        id: subId,
        user_id: userId,
        plan_type: planType,
        status: 'active',
      });

    if (insertError) {
      throw new Error(`Failed to create ${planType} plan subscription: ${insertError.message}`);
    }
    console.log(`[upgradeToPlan] Successfully created new subscription for user ${userId}`);
  }
}

// Helper function to downgrade user from family plan to their original plan
async function downgradeFromFamilyPlan(userId: string, familyGroupId: string): Promise<void> {
  // Get the user's original plan from backup
  const { data: backup, error: backupError } = await supabase
    .from('family_group_plan_backups')
    .select('original_plan_type, original_status')
    .eq('user_id', userId)
    .eq('family_group_id', familyGroupId)
    .single();

  if (backupError && backupError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch plan backup: ${backupError.message}`);
  }

  // If backup found, restore the original plan
  if (backup) {
    // Check if user is the owner of the family group
    const { data: group, error: groupError } = await supabase
      .from('family_groups')
      .select('owner_id')
      .eq('id', familyGroupId)
      .single();

    if (groupError) {
      throw new Error(`Failed to fetch family group: ${groupError.message}`);
    }

    if (group.owner_id === userId) {
      // Delete all shared subscriptions for this group
      const { error: sharedError } = await supabase
        .from('shared_subscriptions')
        .delete()
        .eq('family_group_id', familyGroupId);
      if (sharedError) {
        console.error('Failed to delete shared_subscriptions on owner downgrade:', sharedError);
      }

      // Downgrade all members (except owner) to their original plans
      const { data: members, error: membersError } = await supabase
        .from('family_group_members')
        .select('user_id')
        .eq('family_group_id', familyGroupId);
      if (membersError) {
        console.error('Failed to fetch family group members for downgrade:', membersError);
      } else if (members && members.length > 0) {
        for (const member of members) {
          if (member.user_id !== userId) {
            try {
              await downgradeFromFamilyPlan(member.user_id, familyGroupId);
            } catch (err) {
              console.error(`Failed to downgrade member ${member.user_id}:`, err);
            }
          }
        }
      }
    }

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        plan_type: backup.original_plan_type,
        status: backup.original_status,
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Failed to restore original plan: ${updateError.message}`);
    }

    // Delete the backup entry
    await supabase
      .from('family_group_plan_backups')
      .delete()
      .eq('user_id', userId)
      .eq('family_group_id', familyGroupId);
  } else {
    // NOTE: DO NOT auto-downgrade to free plan. Keep the user on family plan.
    // This prevents accidental downgrade when leaving/deleting family groups.
    // Users must explicitly request a plan change.
    console.log(`[downgradeFromFamilyPlan] Skipping auto-downgrade for user ${userId} - keeping family plan active`);
    return;
  }
}

// Family Group Management
export async function createFamilyGroup(userId: string, name: string): Promise<FamilyGroup> {
  const { data, error } = await supabase
    .from('family_groups')
    .insert({
      name,
      owner_id: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create family group: ${error.message}`);

  // Add the owner as a member with role 'owner'
  let ownerEmail: string | null = null;
  try {
    // Try admin API first
    if (supabaseAdmin.auth && supabaseAdmin.auth.admin) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (!userError && userData.user) {
        ownerEmail = userData.user.email;
      }
    }

    // Fallback to HTTP API
    if (!ownerEmail) {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        ownerEmail = userData.email;
      }
    }
  } catch (err) {
    console.error('Error fetching email for group owner:', err);
  }

  // Add owner to members table
  const { error: memberError } = await supabase
    .from('family_group_members')
    .insert({
      family_group_id: data.id,
      user_id: userId,
      role: 'owner',
      email: ownerEmail,
    });

  if (memberError) {
    console.error('Error adding owner to members table:', memberError);
    // Don't throw here as the group was created successfully
  }

  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getFamilyGroups(userId: string): Promise<FamilyGroup[]> {
  // Get groups where user is owner
  const { data: ownerGroups, error: ownerError } = await supabase
    .from('family_groups')
    .select('*')
    .eq('owner_id', userId);

  if (ownerError) throw new Error(`Failed to fetch family groups: ${ownerError.message}`);

  // Get groups where user is a member
  const { data: memberGroups, error: memberError } = await supabase
    .from('family_group_members')
    .select('family_group_id, id')
    .eq('user_id', userId);

  if (memberError) throw new Error(`Failed to fetch family group memberships: ${memberError.message}`);

  const memberGroupIds = memberGroups?.map(m => m.family_group_id) || [];

  // Fetch groups where user is a member
  let memberGroupData: any[] = [];
  let validMemberGroupIds: string[] = [];
  if (memberGroupIds.length > 0) {
    const { data, error } = await supabase
      .from('family_groups')
      .select('*')
      .in('id', memberGroupIds);

    if (error) throw new Error(`Failed to fetch member groups: ${error.message}`);
    memberGroupData = data || [];
    validMemberGroupIds = memberGroupData.map(g => g.id);

    // Clean up orphaned memberships (where group no longer exists)
    const orphaned = memberGroups.filter(m => !validMemberGroupIds.includes(m.family_group_id));
    if (orphaned.length > 0) {
      const orphanedIds = orphaned.map(m => m.id);
      await supabase
        .from('family_group_members')
        .delete()
        .in('id', orphanedIds);
    }
  }

  // Combine and deduplicate
  const allGroups = [...(ownerGroups || []), ...memberGroupData];
  const uniqueGroups = Array.from(
    new Map(allGroups.map(g => [g.id, g])).values()
  );

  // Get member counts for each group
  const groupsWithCounts = await Promise.all(
    uniqueGroups.map(async (group) => {
      const { count, error: countError } = await supabase
        .from('family_group_members')
        .select('*', { count: 'exact', head: true })
        .eq('family_group_id', group.id);

      return {
        id: group.id,
        name: group.name,
        ownerId: group.owner_id,
        createdAt: group.created_at,
        updatedAt: group.updated_at,
        memberCount: countError ? 0 : (count || 0),
      };
    })
  );

  return groupsWithCounts;
}

export async function updateFamilyGroup(groupId: string, userId: string, name: string): Promise<FamilyGroup> {
  // Verify user is owner
  const { data: group, error: fetchError } = await supabase
    .from('family_groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (fetchError || group.owner_id !== userId) {
    throw new Error('Only group owner can update');
  }

  const { data, error } = await supabase
    .from('family_groups')
    .update({ name })
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update family group: ${error.message}`);
  return {
    id: data.id,
    name: data.name,
    ownerId: data.owner_id,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deleteFamilyGroup(groupId: string, userId: string): Promise<void> {
  // Verify user is owner
  const { data: group, error: fetchError } = await supabase
    .from('family_groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (fetchError) {
    console.error(`[deleteFamilyGroup] Error fetching group:`, fetchError);
    throw new Error(`[deleteFamilyGroup] Error fetching group: ${fetchError.message}`);
  }
  if (!group || group.owner_id !== userId) {
    console.error(`[deleteFamilyGroup] Only group owner can delete. group.owner_id: ${group?.owner_id}, userId: ${userId}`);
    throw new Error('[deleteFamilyGroup] Only group owner can delete');
  }

  // Get all members of this group to downgrade them and remove from group
  const { data: members, error: membersFetchError } = await supabase
    .from('family_group_members')
    .select('user_id')
    .eq('family_group_id', groupId);
  if (membersFetchError) {
    console.error(`[deleteFamilyGroup] Error fetching group members:`, membersFetchError);
    throw new Error(`[deleteFamilyGroup] Error fetching group members: ${membersFetchError.message}`);
  }

  // Downgrade all members from family plan and remove from group
  if (members && members.length > 0) {
    for (const member of members) {
      try {
        await downgradeFromFamilyPlan(member.user_id, groupId);
      } catch (err) {
        console.error(`[deleteFamilyGroup] Failed to downgrade member ${member.user_id}:`, err);
        throw new Error(`[deleteFamilyGroup] Failed to downgrade member ${member.user_id}: ${err instanceof Error ? err.message : err}`);
      }
      // Remove member from family_group_members
      try {
        await supabase
          .from('family_group_members')
          .delete()
          .eq('family_group_id', groupId)
          .eq('user_id', member.user_id);
      } catch (err) {
        console.error(`[deleteFamilyGroup] Failed to remove member ${member.user_id} from family_group_members:`, err);
        throw new Error(`[deleteFamilyGroup] Failed to remove member ${member.user_id} from family_group_members: ${err instanceof Error ? err.message : err}`);
      }
    }
  }

  // Delete all shared_subscriptions for this group
  try {
    await supabase
      .from('shared_subscriptions')
      .delete()
      .eq('family_group_id', groupId);
  } catch (err) {
    console.error(`[deleteFamilyGroup] Failed to delete shared_subscriptions for group ${groupId}:`, err);
    throw new Error(`[deleteFamilyGroup] Failed to delete shared_subscriptions for group ${groupId}: ${err instanceof Error ? err.message : err}`);
  }

  // Delete the family group itself
  const { error: deleteError } = await supabase
    .from('family_groups')
    .delete()
    .eq('id', groupId);

  if (deleteError) {
    console.error(`[deleteFamilyGroup] Failed to delete family group:`, deleteError);
    throw new Error(`[deleteFamilyGroup] Failed to delete family group: ${deleteError.message}`);
  }
}
// Family Group Members
export async function addFamilyMember(groupId: string, userId: string, memberUserId: string): Promise<FamilyGroupMember> {
  console.log('[addFamilyMember] START - groupId:', groupId, 'ownerId:', userId, 'memberUserId:', memberUserId);
  
  // Verify user is owner
  const { data: group, error: ownerError } = await supabase
    .from('family_groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (ownerError || group.owner_id !== userId) {
    throw new Error('Only group owner can add members');
  }

  console.log('[addFamilyMember] Owner verified');

  // Get the member's current subscription before upgrading
  const { data: currentSub, error: currentSubError } = await supabase
    .from('user_subscriptions')
    .select('plan_type, status')
    .eq('user_id', memberUserId);

  const originalPlanType = (currentSub && currentSub.length > 0) ? currentSub[0].plan_type : 'free';
  const originalStatus = (currentSub && currentSub.length > 0) ? currentSub[0].status : 'inactive';
  
  console.log('[addFamilyMember] Member current plan:', originalPlanType, 'status:', originalStatus);

  // Create a backup of their original plan before upgrading
  const backupId = randomUUID();
  console.log('[addFamilyMember] Creating backup with original plan:', originalPlanType);
  
  const { error: backupError } = await supabase
    .from('family_group_plan_backups')
    .insert({
      id: backupId,
      user_id: memberUserId,
      family_group_id: groupId,
      original_plan_type: originalPlanType,
      original_status: originalStatus,
    });

  console.log('[addFamilyMember] Backup creation error:', backupError);

  if (backupError) {
    console.error('Error creating plan backup:', backupError);
    // Don't fail completely if backup fails
  }

  // Upgrade the member to family plan
  // First try to update, if no record exists, insert a new one
  const { data: existingSubData, error: existingError } = await supabase
    .from('user_subscriptions')
    .select('id')
    .eq('user_id', memberUserId);

  if (existingSubData && existingSubData.length > 0) {
    // Update existing subscription
    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({
        plan_type: 'family',
        status: 'active',
      })
      .eq('id', existingSubData[0].id);

    if (updateError) {
      throw new Error(`Failed to upgrade member to family plan: ${updateError.message}`);
    }
  } else {
    // Create new subscription if it doesn't exist
    const subId = randomUUID();
    console.log('[addFamilyMember] Inserting new subscription for member:', memberUserId, 'with plan_type: family');
    
    const { data: insertData, error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        id: subId,
        user_id: memberUserId,
        plan_type: 'family',
        status: 'active',
      });

    console.log('[addFamilyMember] Insert response - error:', insertError, 'data:', insertData);

    if (insertError) {
      throw new Error(`Failed to create family plan subscription: ${insertError.message}`);
    }
  }

  // Get user email before inserting
  let memberEmail: string | null = null;
  try {
    // Try admin API first
    if (supabaseAdmin.auth && supabaseAdmin.auth.admin) {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(memberUserId);
      if (!userError && userData.user) {
        memberEmail = userData.user.email;
      }
    }
    
    // Fallback to HTTP API
    if (!memberEmail) {
      const supabaseUrl = process.env.SUPABASE_URL!;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      
      const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${memberUserId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        memberEmail = userData.email;
      }
    }
  } catch (err) {
    console.error('Error fetching email for new member:', err);
  }

  const { data, error } = await supabase
    .from('family_group_members')
    .insert({
      family_group_id: groupId,
      user_id: memberUserId,
      role: 'member',
      email: memberEmail,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to add family member: ${error.message}`);

  console.log('[addFamilyMember] SUCCESS - Member added, returning:', {
    id: data.id,
    userId: data.user_id,
    familyGroupId: data.family_group_id,
    role: data.role
  });

  return {
    id: data.id,
    familyGroupId: data.family_group_id,
    userId: data.user_id,
    role: data.role,
    joinedAt: data.joined_at,
    email: data.email,
  };
}

export async function getFamilyMembers(groupId: string): Promise<FamilyGroupMember[]> {
  const { data, error } = await supabase
    .from('family_group_members')
    .select('*')
    .eq('family_group_id', groupId);

  if (error) throw new Error(`Failed to fetch family members: ${error.message}`);
  return data.map(m => ({
    id: m.id,
    familyGroupId: m.family_group_id,
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    email: m.email,
  }));
}

export async function getFamilyMembersWithSubscriptions(groupId: string) {
  const { data: members, error: membersError } = await supabase
    .from('family_group_members')
    .select('*')
    .eq('family_group_id', groupId);

  if (membersError) throw new Error(`Failed to fetch family members: ${membersError.message}`);

  // Fetch subscription data for each member
  const { data: subscriptions, error: subsError } = await supabase
    .from('user_subscriptions')
    .select('id, user_id, plan_type, status')
    .in('user_id', members.map(m => m.user_id));

  if (subsError) throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);

  // Create a map of subscriptions by user_id for quick lookup
  const subsMap = new Map(subscriptions?.map(s => [s.user_id, s]) || []);

  // Combine members with their subscriptions
  return members.map(m => ({
    id: m.id,
    familyGroupId: m.family_group_id,
    userId: m.user_id,
    role: m.role,
    joinedAt: m.joined_at,
    email: m.email,
    subscription: subsMap.get(m.user_id) || null,
  }));
}

export async function removeFamilyMember(groupId: string, userId: string, memberUserId: string): Promise<void> {
  // Verify user is owner or removing themselves
  if (userId !== memberUserId) {
    const { data: group, error: ownerError } = await supabase
      .from('family_groups')
      .select('owner_id')
      .eq('id', groupId)
      .single();

    if (ownerError || group.owner_id !== userId) {
      throw new Error('Only group owner or the member themselves can remove');
    }
  }

  // Downgrade the member from family plan to their original plan
  await downgradeFromFamilyPlan(memberUserId, groupId);

  // Remove any shared subscriptions that this member created for the group
  try {
    const { data: shared, error: sharedError } = await supabase
      .from('shared_subscriptions')
      .select('id')
      .eq('family_group_id', groupId)
      .eq('shared_by_user_id', memberUserId);

    if (sharedError) {
      console.error('Failed to fetch shared subscriptions for removed member:', sharedError);
    } else if (shared && shared.length > 0) {
      const sharedIds = shared.map(s => s.id);

      // Delete related cost splits first
      const { error: csError } = await supabase
        .from('cost_splits')
        .delete()
        .in('shared_subscription_id', sharedIds);
      if (csError) console.error('Failed to delete cost_splits for removed member:', csError);

      // Delete shared_subscriptions entries
      const { error: delSharedError } = await supabase
        .from('shared_subscriptions')
        .delete()
        .in('id', sharedIds);
      if (delSharedError) console.error('Failed to delete shared_subscriptions for removed member:', delSharedError);
    }
  } catch (e) {
    console.error('Error while cleaning up shared subscriptions for removed member:', e);
  }

  const { error } = await supabase
    .from('family_group_members')
    .delete()
    .eq('family_group_id', groupId)
    .eq('user_id', memberUserId);

  if (error) throw new Error(`Failed to remove family member: ${error.message}`);
}

// Shared Subscriptions
export async function shareSubscription(groupId: string, subscriptionId: string, userId: string): Promise<SharedSubscription> {
  const { data, error } = await supabase
    .from('shared_subscriptions')
    .insert({
      family_group_id: groupId,
      subscription_id: subscriptionId,
      shared_by_user_id: userId,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to share subscription: ${error.message}`);
  return {
    id: data.id,
    familyGroupId: data.family_group_id,
    subscriptionId: data.subscription_id,
    sharedByUserId: data.shared_by_user_id,
    sharedAt: data.shared_at,
  };
}

export async function getSharedSubscriptions(groupId: string): Promise<SharedSubscription[]> {
  const { data, error } = await supabase
    .from('shared_subscriptions')
    .select('*')
    .eq('family_group_id', groupId);

  if (error) throw new Error(`Failed to fetch shared subscriptions: ${error.message}`);
  return data.map(s => ({
    id: s.id,
    familyGroupId: s.family_group_id,
    subscriptionId: s.subscription_id,
    sharedByUserId: s.shared_by_user_id,
    sharedAt: s.shared_at,
  }));
}

export async function unshareSubscription(sharedSubscriptionId: string): Promise<void> {
  const { error } = await supabase
    .from('shared_subscriptions')
    .delete()
    .eq('id', sharedSubscriptionId);

  if (error) throw new Error(`Failed to unshare subscription: ${error.message}`);
}

// Cost Splits
export async function setCostSplit(sharedSubscriptionId: string, userId: string, percentage: number): Promise<CostSplit> {
  const { data, error } = await supabase
    .from('cost_splits')
    .upsert({
      shared_subscription_id: sharedSubscriptionId,
      user_id: userId,
      percentage,
    }, {
      onConflict: 'shared_subscription_id,user_id'
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to set cost split: ${error.message}`);
  return {
    id: data.id,
    sharedSubscriptionId: data.shared_subscription_id,
    userId: data.user_id,
    percentage: data.percentage,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getCostSplits(sharedSubscriptionId: string): Promise<CostSplit[]> {
  const { data, error } = await supabase
    .from('cost_splits')
    .select('*')
    .eq('shared_subscription_id', sharedSubscriptionId);

  if (error) throw new Error(`Failed to fetch cost splits: ${error.message}`);
  return data.map(c => ({
    id: c.id,
    sharedSubscriptionId: c.shared_subscription_id,
    userId: c.user_id,
    percentage: c.percentage,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

// Calendar Events
export async function createCalendarEvent(
  userId: string,
  subscriptionId: string,
  eventDate: string,
  eventType: 'renewal' | 'trial_end' | 'custom',
  title: string,
  description?: string,
  amount?: number
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('subscription_calendar_events')
    .insert({
      user_id: userId,
      subscription_id: subscriptionId,
      event_date: eventDate,
      event_type: eventType,
      title,
      description,
      amount,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create calendar event: ${error.message}`);
  return {
    id: data.id,
    subscriptionId: data.subscription_id,
    userId: data.user_id,
    eventDate: data.event_date,
    eventType: data.event_type,
    title: data.title,
    description: data.description,
    amount: data.amount,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function getCalendarEvents(userId: string, startDate?: string, endDate?: string): Promise<CalendarEvent[]> {
  let query = supabase
    .from('subscription_calendar_events')
    .select('*')
    .eq('user_id', userId);

  if (startDate) {
    query = query.gte('event_date', startDate);
  }
  if (endDate) {
    query = query.lte('event_date', endDate);
  }

  const { data, error } = await query.order('event_date', { ascending: true });

  if (error) throw new Error(`Failed to fetch calendar events: ${error.message}`);
  return data.map(e => ({
    id: e.id,
    subscriptionId: e.subscription_id,
    userId: e.user_id,
    eventDate: e.event_date,
    eventType: e.event_type,
    title: e.title,
    description: e.description,
    amount: e.amount,
    createdAt: e.created_at,
    updatedAt: e.updated_at,
  }));
}

export async function updateCalendarEvent(
  eventId: string,
  userId: string,
  updates: Partial<{
    eventDate: string;
    title: string;
    description: string;
    amount: number;
  }>
): Promise<CalendarEvent> {
  const { data, error } = await supabase
    .from('subscription_calendar_events')
    .update(updates)
    .eq('id', eventId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update calendar event: ${error.message}`);
  return {
    id: data.id,
    subscriptionId: data.subscription_id,
    userId: data.user_id,
    eventDate: data.event_date,
    eventType: data.event_type,
    title: data.title,
    description: data.description,
    amount: data.amount,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

export async function deleteCalendarEvent(eventId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('subscription_calendar_events')
    .delete()
    .eq('id', eventId)
    .eq('user_id', userId);

  if (error) throw new Error(`Failed to delete calendar event: ${error.message}`);
}
