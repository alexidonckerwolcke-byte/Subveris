-- Add Gmail OAuth fields to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMP WITH TIME ZONE;

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_users_gmail_access_token ON public.users(id) WHERE gmail_access_token IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.gmail_access_token IS 'Google OAuth access token for Gmail API access (read-only)';
COMMENT ON COLUMN public.users.gmail_refresh_token IS 'Google OAuth refresh token for Gmail API (optional)';
COMMENT ON COLUMN public.users.gmail_token_expiry IS 'Expiration timestamp for Gmail access token';
