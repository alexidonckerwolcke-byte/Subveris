-- Checkout completion upserts one plan row per user.
CREATE UNIQUE INDEX IF NOT EXISTS user_subscriptions_user_id_idx
ON public.user_subscriptions (user_id);