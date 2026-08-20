-- Track user-confirmed cancellation outcomes separately from potential savings.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancellation_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_monthly_savings REAL,
  ADD COLUMN IF NOT EXISTS estimated_annual_savings REAL;

COMMENT ON COLUMN public.subscriptions.cancellation_confirmed_at IS 'Timestamp when the user confirmed cancellation with the provider';
COMMENT ON COLUMN public.subscriptions.estimated_monthly_savings IS 'Estimated recurring savings after user-confirmed cancellation';
COMMENT ON COLUMN public.subscriptions.estimated_annual_savings IS 'Estimated annual savings after user-confirmed cancellation';
