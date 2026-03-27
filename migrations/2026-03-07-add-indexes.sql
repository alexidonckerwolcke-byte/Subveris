-- migration: add indexes for performance

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_billing_at ON subscriptions(next_billing_at);
CREATE INDEX IF NOT EXISTS idx_family_group_members_user_id ON family_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_family_group_members_group_id ON family_group_members(family_group_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_site ON usage_logs(site);
