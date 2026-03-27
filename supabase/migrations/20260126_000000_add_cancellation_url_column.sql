-- Add cancellation_url column to subscriptions table for storing cancellation links
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS cancellation_url TEXT;

COMMENT ON COLUMN public.subscriptions.cancellation_url IS 'URL to cancel the subscription with the service provider';
