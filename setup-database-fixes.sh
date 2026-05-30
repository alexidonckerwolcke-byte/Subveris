#!/bin/bash

# Database Fixes Setup Script
# This script helps you apply the missing database constraints to your Supabase project

echo "=========================================="
echo "Subveris Database Fixes Setup"
echo "=========================================="
echo ""
echo "The following fixes need to be applied to your Supabase database:"
echo ""
echo "1. Add missing foreign key constraints"
echo "   - transactions.subscription_id → subscriptions.id"
echo "   - insights.subscription_id → subscriptions.id"
echo ""
echo "2. Enable RLS on family tables"
echo "   - family_groups"
echo "   - family_group_members"
echo "   - shared_subscriptions"
echo "   - cost_splits"
echo "   - subscription_calendar_events"
echo ""
echo "=========================================="
echo ""
echo "To apply these fixes:"
echo ""
echo "1. Open Supabase SQL Editor:"
echo "   https://app.supabase.com/project/xuilgccacufwinvkocfl/sql/new"
echo ""
echo "2. Copy and paste this SQL:"
echo ""
cat << 'ENDSQL'
-- Add missing foreign key constraints
ALTER TABLE public.transactions
ADD CONSTRAINT fk_transactions_subscriptions
FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;

ALTER TABLE public.insights
ADD CONSTRAINT fk_insights_subscriptions
FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;

-- Enable RLS on family tables
ALTER TABLE public.family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shared_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_calendar_events ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for family_groups
DROP POLICY IF EXISTS "Users can view their own family groups" ON public.family_groups;
CREATE POLICY "Users can view their own family groups" ON public.family_groups
  FOR SELECT USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can update their own family groups" ON public.family_groups;
CREATE POLICY "Users can update their own family groups" ON public.family_groups
  FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Users can insert their own family groups" ON public.family_groups;
CREATE POLICY "Users can insert their own family groups" ON public.family_groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Create RLS policies for family_group_members
DROP POLICY IF EXISTS "Users can view family group members" ON public.family_group_members;
CREATE POLICY "Users can view family group members" ON public.family_group_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_groups 
      WHERE public.family_groups.id = public.family_group_members.family_group_id
      AND public.family_groups.owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can insert family group members" ON public.family_group_members;
CREATE POLICY "Users can insert family group members" ON public.family_group_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.family_groups 
      WHERE public.family_groups.id = public.family_group_members.family_group_id
      AND public.family_groups.owner_id = auth.uid()
    )
  );

-- Create RLS policies for shared_subscriptions
DROP POLICY IF EXISTS "Users can view shared subscriptions" ON public.shared_subscriptions;
CREATE POLICY "Users can view shared subscriptions" ON public.shared_subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.family_group_members
      WHERE public.family_group_members.family_group_id = public.shared_subscriptions.family_group_id
      AND public.family_group_members.user_id = auth.uid()
    )
  );

-- Create RLS policies for cost_splits
DROP POLICY IF EXISTS "Users can view cost splits" ON public.cost_splits;
CREATE POLICY "Users can view cost splits" ON public.cost_splits
  FOR SELECT USING (user_id = auth.uid());

-- Create RLS policies for subscription_calendar_events
DROP POLICY IF EXISTS "Users can view calendar events" ON public.subscription_calendar_events;
CREATE POLICY "Users can view calendar events" ON public.subscription_calendar_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create calendar events" ON public.subscription_calendar_events;
CREATE POLICY "Users can create calendar events" ON public.subscription_calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
ENDSQL

echo ""
echo ""
echo "3. Click 'Run' in Supabase to execute the SQL"
echo ""
echo "4. Check that all statements executed successfully"
echo ""
echo "=========================================="
echo "✅ Setup complete!"
echo "=========================================="
