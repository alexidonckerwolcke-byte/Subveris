-- Store total seconds observed by the browser extension for each subscription
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS total_active_seconds INTEGER NOT NULL DEFAULT 0;
