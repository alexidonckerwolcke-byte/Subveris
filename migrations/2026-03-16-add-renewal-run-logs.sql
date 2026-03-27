-- migration: create renewal run logs table

CREATE TABLE IF NOT EXISTS renewal_run_logs (
  id VARCHAR(36) PRIMARY KEY,
  run_at TIMESTAMPTZ NOT NULL,
  mode TEXT NOT NULL,
  user_id UUID,
  subscription_rows INTEGER NOT NULL,
  user_groups INTEGER NOT NULL,
  email_attempted INTEGER NOT NULL,
  email_sent INTEGER NOT NULL,
  email_skipped_no_address INTEGER NOT NULL,
  email_send_errors INTEGER NOT NULL,
  notices TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP POLICY IF EXISTS "Service role can insert renewal run logs" ON renewal_run_logs;
CREATE POLICY "Service role can insert renewal run logs" ON renewal_run_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can select renewal run logs" ON renewal_run_logs;
CREATE POLICY "Service role can select renewal run logs" ON renewal_run_logs FOR SELECT USING (true);
