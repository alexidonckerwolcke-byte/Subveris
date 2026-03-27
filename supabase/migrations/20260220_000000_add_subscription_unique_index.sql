-- Prevent duplicate subscriptions per user
-- Uniqueness: user_id + lower(name) + amount + next_billing_at

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_unique_user_name_amount_nextbilling_idx
ON subscriptions (user_id, lower(name), amount, next_billing_at);
