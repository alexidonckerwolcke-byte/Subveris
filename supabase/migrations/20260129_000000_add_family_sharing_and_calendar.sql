-- Migration: Add Family Sharing and Calendar features
-- Date: 2026-01-26

-- Family Groups table
CREATE TABLE IF NOT EXISTS family_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Family group members (join table)
CREATE TABLE IF NOT EXISTS family_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- 'owner' or 'member'
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(family_group_id, user_id)
);

-- Shared subscriptions (which subscriptions are shared with family)
CREATE TABLE IF NOT EXISTS shared_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  shared_by_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(family_group_id, subscription_id)
);

-- Cost splits (who pays what for shared subscriptions)
CREATE TABLE IF NOT EXISTS cost_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_subscription_id UUID NOT NULL REFERENCES shared_subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  percentage DECIMAL(5,2) NOT NULL DEFAULT 50, -- e.g., 50.00 for 50%
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shared_subscription_id, user_id)
);

-- Calendar events (for subscription renewal tracking and visibility)
CREATE TABLE IF NOT EXISTS subscription_calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_date DATE NOT NULL,
  event_type TEXT NOT NULL, -- 'renewal', 'trial_end', 'custom'
  title TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Row-level security policies
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_calendar_events ENABLE ROW LEVEL SECURITY;

-- Policies for family_groups
CREATE POLICY "Users can view their own family groups" ON family_groups
  FOR SELECT USING (
    owner_id = auth.uid() OR
    id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create family groups" ON family_groups
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update their family groups" ON family_groups
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete their family groups" ON family_groups
  FOR DELETE USING (owner_id = auth.uid());

-- Policies for family_group_members
CREATE POLICY "Users can view family group members" ON family_group_members
  FOR SELECT USING (
    family_group_id IN (
      SELECT id FROM family_groups 
      WHERE owner_id = auth.uid() 
        OR id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Owners can add family members" ON family_group_members
  FOR INSERT WITH CHECK (
    family_group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
  );

CREATE POLICY "Members can leave group" ON family_group_members
  FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "Owners can remove members" ON family_group_members
  FOR DELETE USING (
    family_group_id IN (SELECT id FROM family_groups WHERE owner_id = auth.uid())
  );

-- Policies for shared_subscriptions
CREATE POLICY "Users can view shared subscriptions" ON shared_subscriptions
  FOR SELECT USING (
    family_group_id IN (
      SELECT id FROM family_groups 
      WHERE owner_id = auth.uid() 
        OR id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can share subscriptions with their groups" ON shared_subscriptions
  FOR INSERT WITH CHECK (
    shared_by_user_id = auth.uid() AND
    family_group_id IN (
      SELECT id FROM family_groups 
      WHERE owner_id = auth.uid() 
        OR id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
    )
  );

-- Policies for cost_splits
CREATE POLICY "Family members can view cost splits" ON cost_splits
  FOR SELECT USING (
    shared_subscription_id IN (
      SELECT id FROM shared_subscriptions 
      WHERE family_group_id IN (
        SELECT id FROM family_groups 
        WHERE owner_id = auth.uid() 
          OR id IN (SELECT family_group_id FROM family_group_members WHERE user_id = auth.uid())
      )
    )
  );

-- Policies for subscription_calendar_events
CREATE POLICY "Users can view their calendar events" ON subscription_calendar_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create calendar events" ON subscription_calendar_events
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their calendar events" ON subscription_calendar_events
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete their calendar events" ON subscription_calendar_events
  FOR DELETE USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_family_groups_owner_id ON family_groups(owner_id);
CREATE INDEX idx_family_group_members_group_id ON family_group_members(family_group_id);
CREATE INDEX idx_family_group_members_user_id ON family_group_members(user_id);
CREATE INDEX idx_shared_subscriptions_group_id ON shared_subscriptions(family_group_id);
CREATE INDEX idx_shared_subscriptions_subscription_id ON shared_subscriptions(subscription_id);
CREATE INDEX idx_cost_splits_shared_subscription_id ON cost_splits(shared_subscription_id);
CREATE INDEX idx_cost_splits_user_id ON cost_splits(user_id);
CREATE INDEX idx_calendar_events_user_id ON subscription_calendar_events(user_id);
CREATE INDEX idx_calendar_events_subscription_id ON subscription_calendar_events(subscription_id);
CREATE INDEX idx_calendar_events_date ON subscription_calendar_events(event_date);
