-- Add email column to family_group_members table
ALTER TABLE family_group_members ADD COLUMN IF NOT EXISTS email TEXT;