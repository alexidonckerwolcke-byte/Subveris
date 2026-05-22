-- Fix billing_month values to be based on renewal dates
-- billing_month should be the month when the subscription is billed (month of next_billing_at)

UPDATE subscriptions
SET billing_month = CASE
  WHEN next_billing_at IS NULL THEN TO_CHAR(NOW(), 'YYYY-MM')
  ELSE TO_CHAR(next_billing_at, 'YYYY-MM')
END
WHERE billing_month IS NOT NULL;