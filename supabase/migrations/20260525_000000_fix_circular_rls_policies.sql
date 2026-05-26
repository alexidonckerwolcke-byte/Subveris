-- Fix circular RLS policy recursion on family_group_members
-- The original policy had: 
--   family_group_id IN (SELECT id FROM family_groups WHERE ... OR id IN (SELECT family_group_id FROM family_group_members ...))
-- This created infinite recursion

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view family group members" ON family_group_members;
DROP POLICY IF EXISTS "Users can view shared subscriptions" ON shared_subscriptions;
DROP POLICY IF EXISTS "Users can share subscriptions with their groups" ON shared_subscriptions;
DROP POLICY IF EXISTS "Family members can view cost splits" ON cost_splits;

-- Recreate family_group_members policy without circular reference
CREATE POLICY "Users can view family group members" ON family_group_members
  FOR SELECT USING (
    -- User is the owner of the group
    family_group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
    OR
    -- User is a member of the group
    user_id = auth.uid()
  );

-- Recreate shared_subscriptions policies without circular reference
CREATE POLICY "Users can view shared subscriptions" ON shared_subscriptions
  FOR SELECT USING (
    -- User is the owner of the group
    family_group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
    OR
    -- User is a member of the group
    family_group_id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can share subscriptions with their groups" ON shared_subscriptions
  FOR INSERT WITH CHECK (
    shared_by_user_id = auth.uid() AND
    (
      -- User is the owner of the group
      family_group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
      OR
      -- User is a member of the group
      family_group_id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
    )
  );

-- Recreate cost_splits policy without circular reference
CREATE POLICY "Family members can view cost splits" ON cost_splits
  FOR SELECT USING (
    shared_subscription_id IN (
      SELECT id FROM shared_subscriptions 
      WHERE 
        -- User is the owner of the group
        family_group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
        OR
        -- User is a member of the group
        family_group_id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
    )
  );
