-- Add monthly usage tracking columns to subscriptions table
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS monthly_usage_count INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS usage_month TEXT;
