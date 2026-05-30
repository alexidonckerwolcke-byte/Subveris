-- Add missing foreign key constraints between tables
-- This ensures data integrity

-- Add FK from transactions to subscriptions
ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_subscriptions
FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Add FK from insights to subscriptions  
ALTER TABLE insights
ADD CONSTRAINT fk_insights_subscriptions
FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;

-- Enable RLS on family-related tables
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_calendar_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for family_groups
CREATE POLICY "Users can view their own family groups" ON family_groups
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own family groups" ON family_groups
  FOR UPDATE USING (auth.uid() = owner_id);

-- RLS policies for family_group_members
CREATE POLICY "Users can view family group members" ON family_group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_groups 
      WHERE family_groups.id = family_group_members.family_group_id
      AND family_groups.owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- RLS policies for shared_subscriptions
CREATE POLICY "Users can view shared subscriptions in their groups" ON shared_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM family_group_members
      WHERE family_group_members.family_group_id = shared_subscriptions.family_group_id
      AND family_group_members.user_id = auth.uid()
    )
  );

-- RLS policies for cost_splits
CREATE POLICY "Users can view cost splits for their subscriptions" ON cost_splits
  FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM cost_splits cs
      WHERE cs.user_id = auth.uid()
      AND cs.shared_subscription_id = cost_splits.shared_subscription_id
    )
  );

-- RLS policies for subscription_calendar_events
CREATE POLICY "Users can view their subscription calendar events" ON subscription_calendar_events
  FOR SELECT USING (auth.uid() = user_id);
