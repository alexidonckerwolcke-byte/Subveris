-- Cancellation assistance is included in the optimizer plans and is not billed separately.
DROP TABLE IF EXISTS public.savings_payments;

ALTER TABLE public.user_subscriptions
  DROP COLUMN IF EXISTS savings_payment_method_id,
  DROP COLUMN IF EXISTS savings_payment_method_last4;
