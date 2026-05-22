-- Fix the unique constraint to exclude deleted subscriptions
-- This allows users to re-add subscriptions they previously deleted

BEGIN;

-- Drop the existing index that doesn't account for deleted status
DROP INDEX IF EXISTS subscriptions_unique_user_name_amount_nextbilling_idx CASCADE;

-- Recreate the index with a WHERE clause to exclude deleted subscriptions
CREATE UNIQUE INDEX subscriptions_unique_user_name_amount_nextbilling_idx
ON subscriptions (user_id, lower(name), amount, next_billing_at)
WHERE status != 'deleted';

COMMIT;
