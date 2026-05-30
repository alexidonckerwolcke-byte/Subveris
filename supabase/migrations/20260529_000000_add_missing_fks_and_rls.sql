-- Migration: Add missing foreign keys and RLS policies
-- Date: 2026-05-29

-- Add missing FK from transactions to subscriptions (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_transactions_subscriptions'
  ) THEN
    ALTER TABLE public.transactions
    ADD CONSTRAINT fk_transactions_subscriptions
    FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add missing FK from insights to subscriptions (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_insights_subscriptions'
  ) THEN
    ALTER TABLE public.insights
    ADD CONSTRAINT fk_insights_subscriptions
    FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Ensure RLS is enabled on family-related tables
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_calendar_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Users can update their own family groups" ON public.family_groups;
DROP POLICY IF EXISTS "Users can view family group members" ON public.family_group_members;
DROP POLICY IF EXISTS "Users can view shared subscriptions in their groups" ON public.shared_subscriptions;
DROP POLICY IF EXISTS "Users can view cost splits for their subscriptions" ON public.cost_splits;
DROP POLICY IF EXISTS "Users can view their subscription calendar events" ON public.subscription_calendar_events;

-- RLS policies for family_groups
CREATE POLICY "Users can view their own family groups" ON public.family_groups
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can update their own family groups" ON public.family_groups
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can insert their own family groups" ON public.family_groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- RLS policies for family_group_members
CREATE POLICY "Users can view family group members" ON public.family_group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_groups 
      WHERE public.family_groups.id = public.family_group_members.family_group_id
      AND public.family_groups.owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

CREATE POLICY "Users can insert family group members" ON public.family_group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_groups 
      WHERE public.family_groups.id = public.family_group_members.family_group_id
      AND public.family_groups.owner_id = auth.uid()
    )
  );

-- RLS policies for shared_subscriptions
CREATE POLICY "Users can view shared subscriptions in their groups" ON public.shared_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_group_members
      WHERE public.family_group_members.family_group_id = public.shared_subscriptions.family_group_id
      AND public.family_group_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert shared subscriptions in their groups" ON public.shared_subscriptions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_group_members
      WHERE public.family_group_members.family_group_id = public.shared_subscriptions.family_group_id
      AND public.family_group_members.user_id = auth.uid()
      AND (
        SELECT role FROM public.family_group_members 
        WHERE id = public.family_group_members.id
      ) = 'owner'
    )
  );

-- RLS policies for cost_splits
CREATE POLICY "Users can view cost splits for their subscriptions" ON public.cost_splits
  FOR SELECT USING (
    user_id = auth.uid()
  );

-- RLS policies for subscription_calendar_events
CREATE POLICY "Users can view their subscription calendar events" ON public.subscription_calendar_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription calendar events" ON public.subscription_calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
