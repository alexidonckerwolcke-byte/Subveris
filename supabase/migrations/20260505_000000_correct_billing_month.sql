-- Correct billing_month values to be the month of next_billing_at
-- This fixes the previous migration that incorrectly set all past renewals to current month

UPDATE subscriptions
SET billing_month = CASE
  WHEN next_billing_at IS NULL THEN TO_CHAR(NOW(), 'YYYY-MM')
  ELSE TO_CHAR(next_billing_at, 'YYYY-MM')
END
WHERE billing_month IS NOT NULL;