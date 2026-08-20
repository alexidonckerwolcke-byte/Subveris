-- Support the optional percentage-of-savings cancellation fee.
-- Stripe payment method IDs are token references, never card numbers.
ALTER TABLE public.user_subscriptions
  ADD COLUMN IF NOT EXISTS savings_payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS savings_payment_method_last4 TEXT;

CREATE TABLE IF NOT EXISTS public.savings_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 15.00,
  stripe_payment_intent_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE public.savings_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own savings payments"
  ON public.savings_payments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own savings payments"
  ON public.savings_payments FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS savings_payments_user_id_idx
  ON public.savings_payments(user_id);
CREATE INDEX IF NOT EXISTS savings_payments_subscription_id_idx
  ON public.savings_payments(subscription_id);
