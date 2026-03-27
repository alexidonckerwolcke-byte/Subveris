-- Add family group settings table for displaying aggregated family data
CREATE TABLE IF NOT EXISTS family_group_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_group_id UUID NOT NULL REFERENCES family_groups(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  show_family_data BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(family_group_id)
);

-- Enable RLS
ALTER TABLE family_group_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Only owner can view settings
CREATE POLICY "Users can view their own family group settings" ON family_group_settings
  FOR SELECT USING (owner_id = auth.uid());

-- Policy: Only owner can update settings
CREATE POLICY "Owners can update their family group settings" ON family_group_settings
  FOR UPDATE USING (owner_id = auth.uid());

-- Policy: Owners can insert their own settings
CREATE POLICY "Owners can create family group settings" ON family_group_settings
  FOR INSERT WITH CHECK (owner_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX idx_family_group_settings_family_group_id ON family_group_settings(family_group_id);
CREATE INDEX idx_family_group_settings_owner_id ON family_group_settings(owner_id);
