-- Add shared_with_user_id to shared_subscriptions for selective member sharing
ALTER TABLE shared_subscriptions
ADD COLUMN shared_with_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Drop the old unique constraint
ALTER TABLE shared_subscriptions
DROP CONSTRAINT shared_subscriptions_family_group_id_subscription_id_key;

-- Add new unique constraint that includes shared_with_user_id
ALTER TABLE shared_subscriptions
ADD CONSTRAINT shared_subscriptions_unique_share
UNIQUE(family_group_id, subscription_id, shared_with_user_id);

-- Update existing records to be shared with all current family members
-- This is a complex migration that needs to be done carefully
-- For now, we'll leave existing records as-is and only use shared_with_user_id for new shares

-- Add index for the new field
CREATE INDEX idx_shared_subscriptions_shared_with_user_id ON shared_subscriptions(shared_with_user_id);