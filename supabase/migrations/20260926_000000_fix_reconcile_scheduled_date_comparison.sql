CREATE OR REPLACE FUNCTION public.reconcile_subscription_statuses()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.subscriptions
  SET status = 'deleted'
  WHERE scheduled_cancellation_date IS NOT NULL
    AND scheduled_cancellation_date::DATE <= CURRENT_DATE
    AND status != 'deleted';
END;
$$;

GRANT EXECUTE ON FUNCTION public.reconcile_subscription_statuses() TO authenticated, service_role;