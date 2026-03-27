-- Family group plan backups: stores original plan for each member before joining a family group
CREATE TABLE IF NOT EXISTS family_group_plan_backups (
  id VARCHAR(36) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  family_group_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  original_plan_type TEXT NOT NULL, -- e.g. 'free', 'premium', etc.
  original_status TEXT NOT NULL,    -- e.g. 'active', 'inactive', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_family_group_plan_backups_user_id ON family_group_plan_backups(user_id);
CREATE INDEX IF NOT EXISTS idx_family_group_plan_backups_group_id ON family_group_plan_backups(family_group_id);
