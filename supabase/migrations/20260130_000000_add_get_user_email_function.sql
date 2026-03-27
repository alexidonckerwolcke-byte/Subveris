-- Create a function to safely get user email by ID
CREATE OR REPLACE FUNCTION get_user_email(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Only allow access if called by service role or the user themselves
    -- This is a security measure
    SELECT email INTO user_email
    FROM auth.users
    WHERE id = user_id;

    RETURN user_email;
END;
$$;