-- Create notification_preferences table to store user notification settings
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id VARCHAR(36) PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  push_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  weekly_digest BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for notification preferences
CREATE POLICY "Users can view own notification preferences" ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notification preferences" ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger to automatically create notification preferences for new users
CREATE OR REPLACE FUNCTION public.create_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.notification_preferences (id, user_id, email_notifications, push_notifications, weekly_digest)
  VALUES (
    gen_random_uuid()::text,
    NEW.id,
    TRUE,
    TRUE,
    TRUE
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.create_notification_preferences();

COMMENT ON TABLE public.notification_preferences IS 'User notification settings and preferences';
COMMENT ON COLUMN public.notification_preferences.email_notifications IS 'Whether to send email notifications';
COMMENT ON COLUMN public.notification_preferences.push_notifications IS 'Whether to send push notifications';
COMMENT ON COLUMN public.notification_preferences.weekly_digest IS 'Whether to send weekly digest email';
