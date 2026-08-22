ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS website_url TEXT;

COMMENT ON COLUMN public.subscriptions.website_url IS 'Public provider website URL used to discover cancellation guidance';
