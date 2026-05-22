-- Fix the unique constraint to exclude deleted subscriptions
-- This allows re-adding subscriptions that were deleted

-- First, check current constraint
-- SELECT * FROM pg_indexes WHERE indexname = 'subscriptions_unique_user_name_amount_nextbilling_idx';

-- Drop the existing index
DROP INDEX IF EXISTS subscriptions_unique_user_name_amount_nextbilling_idx;

-- Recreate it with a WHERE clause to exclude deleted subscriptions
CREATE UNIQUE INDEX subscriptions_unique_user_name_amount_nextbilling_idx
ON subscriptions (user_id, lower(name), amount, next_billing_at)
WHERE status != 'deleted';

-- This allows users to:
-- 1. Delete a subscription (sets status = 'deleted')
-- 2. Re-add the same subscription without hitting the unique constraint
