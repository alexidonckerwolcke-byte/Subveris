-- Add billing_month column to track which calendar month subscription is billed for
-- This column persists until the end of the month and only resets on the first day of a new month
-- Format: YYYY-MM (e.g., "2026-05")

ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS billing_month TEXT;

-- Backfill existing subscriptions with billing month based on their renewal dates
-- For subscriptions renewing in the current month or earlier, set to current month
-- For subscriptions renewing in future months, set to their renewal month
UPDATE subscriptions
SET billing_month = CASE
  WHEN next_billing_at IS NULL THEN TO_CHAR(NOW(), 'YYYY-MM')
  WHEN next_billing_at <= NOW() THEN TO_CHAR(NOW(), 'YYYY-MM')
  ELSE TO_CHAR(next_billing_at, 'YYYY-MM')
END
WHERE billing_month IS NULL;

-- Create index on billing_month for faster spending queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_billing_month ON subscriptions(user_id, billing_month);
