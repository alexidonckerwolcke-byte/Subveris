-- Add plan_type column to user_subscriptions table
ALTER TABLE user_subscriptions 
ADD COLUMN IF NOT EXISTS plan_type TEXT NOT NULL DEFAULT 'free';

-- Create family_group_plan_backups table to track original plans
CREATE TABLE IF NOT EXISTS family_group_plan_backups (
  id VARCHAR(36) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  family_group_id VARCHAR(36) NOT NULL,
  original_plan_type TEXT NOT NULL,
  original_status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policies for family_group_plan_backups
ALTER TABLE family_group_plan_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own plan backups" ON family_group_plan_backups 
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can modify plan backups" ON family_group_plan_backups
FOR ALL USING (auth.uid() = user_id);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_family_group_plan_backups_user_id_group_id 
ON family_group_plan_backups(user_id, family_group_id);
