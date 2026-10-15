-- Index foreign-key columns that are not already covered by an index.
CREATE INDEX IF NOT EXISTS idx_transactions_user_id
  ON public.transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_subscription_id
  ON public.transactions (subscription_id);
CREATE INDEX IF NOT EXISTS idx_insights_user_id
  ON public.insights (user_id);
CREATE INDEX IF NOT EXISTS idx_insights_subscription_id
  ON public.insights (subscription_id);
CREATE INDEX IF NOT EXISTS idx_bank_connections_user_id
  ON public.bank_connections (user_id);
CREATE INDEX IF NOT EXISTS idx_shared_subscriptions_shared_by_user_id
  ON public.shared_subscriptions (shared_by_user_id);
CREATE INDEX IF NOT EXISTS idx_family_group_invitations_inviter_user_id
  ON public.family_group_invitations (inviter_user_id);

-- Email columns have been added through different setup paths, so index them
-- only when each table and column exists in the target database.
DO $$
DECLARE
  email_column RECORD;
BEGIN
  FOR email_column IN
    SELECT * FROM (VALUES
      ('users', 'email', 'idx_users_email'),
      ('profiles', 'email', 'idx_profiles_email'),
      ('family_group_members', 'email', 'idx_family_group_members_email'),
      ('family_group_invitations', 'invitee_email', 'idx_family_group_invitations_invitee_email')
    ) AS email_indexes(table_name, column_name, index_name)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = email_column.table_name
        AND column_name = email_column.column_name
    ) THEN
      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I (%I)',
        email_column.index_name,
        email_column.table_name,
        email_column.column_name
      );
    END IF;
  END LOOP;
END;
$$;
