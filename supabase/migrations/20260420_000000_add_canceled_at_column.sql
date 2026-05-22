-- Add canceled_at column to subscriptions table for tracking cancellation dates
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS canceled_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.subscriptions.canceled_at IS 'Timestamp when the subscription was canceled';