-- Add deleted_at column to subscriptions table for tracking deletion dates
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN public.subscriptions.deleted_at IS 'Timestamp when the subscription was deleted';
