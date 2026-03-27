-- Fix: Function public.reconcile_subscription_statuses has a role mutable search_path
-- This migration sets the search_path parameter to secure the function

-- Add scheduled_cancellation_date column to subscriptions table if it doesn't exist
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS scheduled_cancellation_date TEXT;

COMMENT ON COLUMN public.subscriptions.scheduled_cancellation_date IS 'ISO 8601 date string for scheduled cancellation (premium feature)';

-- Drop the existing function if it exists
DROP FUNCTION IF EXISTS public.reconcile_subscription_statuses();

-- Recreate the function with proper search_path configuration
CREATE FUNCTION public.reconcile_subscription_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This function reconciles subscription statuses
  -- Update subscriptions that have a scheduled cancellation date that has passed
  UPDATE public.subscriptions
  SET status = 'deleted'
  WHERE scheduled_cancellation_date IS NOT NULL
    AND scheduled_cancellation_date <= NOW()
    AND status != 'deleted';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.reconcile_subscription_statuses() TO authenticated, service_role;
