CREATE TABLE public.affiliate_program_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  commission_rate_bps INTEGER NOT NULL DEFAULT 2000 CHECK (commission_rate_bps BETWEEN 1 AND 10000),
  attribution_window_days INTEGER NOT NULL DEFAULT 30 CHECK (attribution_window_days BETWEEN 1 AND 365),
  minimum_payout_cents BIGINT NOT NULL DEFAULT 0 CHECK (minimum_payout_cents >= 0),
  commission_basis TEXT NOT NULL DEFAULT 'amount_paid_after_discounts_including_tax'
    CHECK (commission_basis = 'amount_paid_after_discounts_including_tax'),
  retention_cleaned_at TIMESTAMPTZ,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.affiliate_program_settings (id) VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  creator_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  audience_size INTEGER CHECK (audience_size IS NULL OR audience_size >= 0),
  promotion_plan TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'suspended', 'inactive')),
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.affiliate_referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[a-z0-9][a-z0-9_-]{2,39}$'),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  CHECK ((is_active AND revoked_at IS NULL) OR NOT is_active)
);

CREATE UNIQUE INDEX affiliate_referral_codes_one_active_per_affiliate
  ON public.affiliate_referral_codes (affiliate_id) WHERE is_active;

CREATE TABLE public.affiliate_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
  referral_code_id UUID NOT NULL REFERENCES public.affiliate_referral_codes(id) ON DELETE RESTRICT,
  visitor_hash TEXT CHECK (visitor_hash IS NULL OR length(visitor_hash) = 64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  CHECK (expires_at > created_at)
);

CREATE INDEX affiliate_clicks_attribution_lookup_idx
  ON public.affiliate_clicks (visitor_hash, created_at DESC, expires_at);
CREATE INDEX affiliate_clicks_affiliate_created_idx
  ON public.affiliate_clicks (affiliate_id, created_at DESC);
CREATE INDEX affiliate_clicks_created_idx ON public.affiliate_clicks (created_at);
CREATE INDEX affiliate_clicks_expires_idx ON public.affiliate_clicks (expires_at) WHERE visitor_hash IS NOT NULL;

CREATE TABLE public.affiliate_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
  click_id UUID UNIQUE REFERENCES public.affiliate_clicks(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_paid_at TIMESTAMPTZ,
  first_paid_invoice_id TEXT UNIQUE,
  first_paid_plan_type TEXT CHECK (first_paid_plan_type IS NULL OR first_paid_plan_type IN ('premium', 'family')),
  first_paid_amount_minor BIGINT CHECK (first_paid_amount_minor IS NULL OR first_paid_amount_minor >= 0),
  first_paid_currency TEXT CHECK (first_paid_currency IS NULL OR first_paid_currency ~ '^[a-z]{3}$'),
  first_paid_eligibility_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (expires_at > clicked_at)
);

CREATE INDEX affiliate_attributions_affiliate_idx
  ON public.affiliate_attributions (affiliate_id, created_at DESC);

CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
  attribution_id UUID NOT NULL REFERENCES public.affiliate_attributions(id) ON DELETE RESTRICT,
  referred_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  stripe_payment_intent_id TEXT,
  amount_paid_cents BIGINT NOT NULL CHECK (amount_paid_cents > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  commission_rate_bps INTEGER NOT NULL CHECK (commission_rate_bps BETWEEN 1 AND 10000),
  commission_amount_cents BIGINT NOT NULL CHECK (commission_amount_cents > 0),
  eligibility_reason TEXT NOT NULL DEFAULT 'first_paid_premium_within_attribution_window',
  commission_basis TEXT NOT NULL DEFAULT 'amount_paid_after_discounts_including_tax'
    CHECK (commission_basis = 'amount_paid_after_discounts_including_tax'),
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'held', 'paid', 'reversed')),
  status_before_hold TEXT CHECK (status_before_hold IS NULL OR status_before_hold IN ('pending_review', 'approved', 'paid')),
  hold_reason TEXT,
  reversal_reason TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX affiliate_commissions_affiliate_status_idx
  ON public.affiliate_commissions (affiliate_id, status, created_at DESC);
CREATE INDEX affiliate_commissions_customer_idx
  ON public.affiliate_commissions (referred_user_id, created_at DESC);
CREATE INDEX affiliate_commissions_payment_refs_idx
  ON public.affiliate_commissions (stripe_charge_id, stripe_payment_intent_id);

CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  currency TEXT NOT NULL CHECK (currency ~ '^[a-z]{3}$'),
  paid_at TIMESTAMPTZ NOT NULL,
  transaction_reference TEXT NOT NULL CHECK (length(trim(transaction_reference)) BETWEEN 1 AND 200),
  notes TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX affiliate_payouts_affiliate_paid_idx
  ON public.affiliate_payouts (affiliate_id, paid_at DESC);

CREATE TABLE public.affiliate_payout_items (
  payout_id UUID NOT NULL REFERENCES public.affiliate_payouts(id) ON DELETE RESTRICT,
  commission_id UUID NOT NULL UNIQUE REFERENCES public.affiliate_commissions(id) ON DELETE RESTRICT,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  PRIMARY KEY (payout_id, commission_id)
);

CREATE TABLE public.affiliate_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 1000),
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX affiliate_admin_audit_entity_idx
  ON public.affiliate_admin_audit_logs (entity_type, entity_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.affiliate_handle_account_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affiliate_id UUID;
BEGIN
  SELECT id INTO v_affiliate_id FROM public.affiliates WHERE user_id = OLD.id;
  IF v_affiliate_id IS NOT NULL THEN
    UPDATE public.affiliate_referral_codes
    SET is_active = FALSE, revoked_at = COALESCE(revoked_at, NOW())
    WHERE affiliate_id = v_affiliate_id AND is_active;

    UPDATE public.affiliates
    SET user_id = NULL,
        creator_name = 'Deleted creator',
        platform = 'deleted',
        audience_size = NULL,
        promotion_plan = 'Application details removed after account deletion',
        status = 'inactive',
        updated_at = NOW()
    WHERE id = v_affiliate_id;

    INSERT INTO public.affiliate_admin_audit_logs (
      action, entity_type, entity_id, reason, after_data
    ) VALUES (
      'affiliate_account_deleted', 'affiliate', v_affiliate_id,
      'The affiliate account was deleted; identifying application details were redacted.',
      jsonb_build_object('status', 'inactive', 'personal_application_details', 'redacted')
    );
  END IF;

  UPDATE public.affiliate_attributions SET user_id = NULL WHERE user_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER affiliate_auth_user_delete_cleanup
  BEFORE DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.affiliate_handle_account_delete();

CREATE OR REPLACE FUNCTION public.affiliate_cleanup_retention()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_last_cleanup TIMESTAMPTZ;
BEGIN
  SELECT retention_cleaned_at INTO v_last_cleanup
  FROM public.affiliate_program_settings
  WHERE id = TRUE
  FOR UPDATE;

  IF v_last_cleanup IS NOT NULL AND v_last_cleanup > NOW() - INTERVAL '24 hours' THEN
    RETURN;
  END IF;

  UPDATE public.affiliate_clicks
  SET visitor_hash = NULL
  WHERE visitor_hash IS NOT NULL AND expires_at <= NOW();

  DELETE FROM public.affiliate_clicks
  WHERE created_at < NOW() - INTERVAL '24 months';

  DELETE FROM public.affiliate_attributions AS attribution
  WHERE attribution.expires_at < NOW() - INTERVAL '24 months'
    AND NOT EXISTS (
      SELECT 1 FROM public.affiliate_commissions commission
      WHERE commission.attribution_id = attribution.id
    );

  UPDATE public.affiliates AS affiliate
  SET creator_name = 'Former applicant',
      platform = 'removed',
      audience_size = NULL,
      promotion_plan = 'Application details removed after retention period',
      updated_at = NOW()
  WHERE affiliate.status IN ('rejected', 'inactive')
    AND affiliate.updated_at < NOW() - INTERVAL '24 months'
    AND NOT EXISTS (
      SELECT 1 FROM public.affiliate_commissions commission
      WHERE commission.affiliate_id = affiliate.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.affiliate_payouts payout
      WHERE payout.affiliate_id = affiliate.id
    );

  UPDATE public.affiliate_program_settings
  SET retention_cleaned_at = NOW()
  WHERE id = TRUE;
END;
$$;

CREATE TABLE public.affiliate_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  commission_id UUID REFERENCES public.affiliate_commissions(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.affiliate_program_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_attributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_payout_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_webhook_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.affiliate_program_settings, public.affiliates, public.affiliate_referral_codes,
  public.affiliate_clicks, public.affiliate_attributions, public.affiliate_commissions,
  public.affiliate_payouts, public.affiliate_payout_items, public.affiliate_admin_audit_logs,
  public.affiliate_webhook_events FROM anon, authenticated;

GRANT SELECT ON public.affiliates, public.affiliate_referral_codes,
  public.affiliate_payouts, public.affiliate_payout_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliate_program_settings, public.affiliates,
  public.affiliate_referral_codes, public.affiliate_clicks, public.affiliate_attributions,
  public.affiliate_commissions, public.affiliate_payouts, public.affiliate_payout_items,
  public.affiliate_admin_audit_logs, public.affiliate_webhook_events TO service_role;

CREATE POLICY "Affiliates can read own profile" ON public.affiliates
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Affiliates can read own codes" ON public.affiliate_referral_codes
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Affiliates can read own payouts" ON public.affiliate_payouts
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.affiliates a WHERE a.id = affiliate_id AND a.user_id = auth.uid())
  );
CREATE POLICY "Affiliates can read own payout items" ON public.affiliate_payout_items
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.affiliate_payouts p
      JOIN public.affiliates a ON a.id = p.affiliate_id
      WHERE p.id = payout_id AND a.user_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.affiliate_record_successful_payment(
  p_user_id UUID,
  p_invoice_id TEXT,
  p_subscription_id TEXT,
  p_charge_id TEXT,
  p_payment_intent_id TEXT,
  p_plan_type TEXT,
  p_amount_paid_cents BIGINT,
  p_currency TEXT,
  p_paid_at TIMESTAMPTZ
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_attribution public.affiliate_attributions%ROWTYPE;
  v_rate_bps INTEGER;
  v_commission_cents BIGINT;
  v_commission_id UUID;
  v_eligibility_reason TEXT;
BEGIN
  IF p_user_id IS NULL OR p_invoice_id IS NULL OR p_amount_paid_cents IS NULL
    OR p_amount_paid_cents <= 0 OR p_plan_type IS NULL
    OR p_plan_type NOT IN ('premium', 'family') OR p_currency IS NULL
    OR p_currency !~ '^[a-z]{3}$' OR p_paid_at IS NULL THEN
    RETURN jsonb_build_object('created', FALSE, 'reason', 'ineligible_payment');
  END IF;

  SELECT * INTO v_attribution
  FROM public.affiliate_attributions
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('created', FALSE, 'reason', 'no_attribution');
  END IF;

  IF v_attribution.first_paid_invoice_id IS NOT NULL THEN
    RETURN jsonb_build_object('created', FALSE, 'reason', 'not_first_paid_invoice');
  END IF;

  v_eligibility_reason := CASE
    WHEN p_plan_type <> 'premium' THEN 'first_paid_plan_not_premium'
    WHEN p_paid_at < v_attribution.clicked_at THEN 'payment_predates_referral'
    WHEN p_paid_at > v_attribution.expires_at THEN 'attribution_window_expired'
    WHEN NOT EXISTS (
      SELECT 1 FROM public.affiliates
      WHERE id = v_attribution.affiliate_id AND status = 'approved'
    ) THEN 'affiliate_not_approved_at_payment'
    ELSE NULL
  END;

  UPDATE public.affiliate_attributions
  SET first_paid_at = p_paid_at,
      first_paid_invoice_id = p_invoice_id,
      first_paid_plan_type = p_plan_type,
      first_paid_amount_minor = p_amount_paid_cents,
      first_paid_currency = lower(p_currency),
      first_paid_eligibility_reason = v_eligibility_reason,
      updated_at = NOW()
  WHERE id = v_attribution.id;

  IF v_eligibility_reason IS NOT NULL THEN
    RETURN jsonb_build_object('created', FALSE, 'reason', v_eligibility_reason);
  END IF;

  SELECT commission_rate_bps INTO v_rate_bps
  FROM public.affiliate_program_settings WHERE id = TRUE;
  v_commission_cents := floor((p_amount_paid_cents::NUMERIC * v_rate_bps + 5000) / 10000)::BIGINT;

  IF v_commission_cents <= 0 THEN
    UPDATE public.affiliate_attributions
    SET first_paid_eligibility_reason = 'commission_rounds_to_zero', updated_at = NOW()
    WHERE id = v_attribution.id;
    RETURN jsonb_build_object('created', FALSE, 'reason', 'commission_rounds_to_zero');
  END IF;

  INSERT INTO public.affiliate_commissions (
    affiliate_id, attribution_id, referred_user_id, stripe_invoice_id,
    stripe_subscription_id, stripe_charge_id, stripe_payment_intent_id,
    amount_paid_cents, currency, commission_rate_bps, commission_amount_cents, commission_basis, eligibility_reason
  ) VALUES (
    v_attribution.affiliate_id, v_attribution.id, p_user_id, p_invoice_id,
    p_subscription_id, p_charge_id, p_payment_intent_id,
    p_amount_paid_cents, lower(p_currency), v_rate_bps, v_commission_cents,
    'amount_paid_after_discounts_including_tax', 'first_paid_premium_within_attribution_window'
  )
  ON CONFLICT (stripe_invoice_id) DO NOTHING
  RETURNING id INTO v_commission_id;

  IF v_commission_id IS NULL THEN
    UPDATE public.affiliate_attributions
    SET first_paid_eligibility_reason = 'invoice_already_commissioned', updated_at = NOW()
    WHERE id = v_attribution.id;
  ELSE
    UPDATE public.affiliate_attributions
    SET first_paid_eligibility_reason = 'eligible_premium_payment', updated_at = NOW()
    WHERE id = v_attribution.id;
  END IF;

  RETURN jsonb_build_object('created', v_commission_id IS NOT NULL, 'commission_id', v_commission_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_admin_transition_commission(
  p_commission_id UUID,
  p_new_status TEXT,
  p_admin_user_id UUID,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_commission public.affiliate_commissions%ROWTYPE;
BEGIN
  IF p_new_status NOT IN ('approved', 'reversed') OR length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'Invalid commission transition';
  END IF;

  SELECT * INTO v_commission FROM public.affiliate_commissions
  WHERE id = p_commission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Commission not found'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE id = v_commission.affiliate_id AND user_id = p_admin_user_id
  ) THEN
    RAISE EXCEPTION 'An affiliate cannot administer their own commission';
  END IF;
  IF v_commission.status NOT IN ('pending_review', 'approved', 'held') THEN
    RAISE EXCEPTION 'Commission cannot transition from %', v_commission.status;
  END IF;
  IF v_commission.status = 'held' AND p_new_status = 'approved' THEN
    RAISE EXCEPTION 'A disputed commission cannot be approved before Stripe resolves it';
  END IF;
  IF p_new_status = 'approved' AND v_commission.status = 'approved' THEN
    RAISE EXCEPTION 'Commission is already approved';
  END IF;

  UPDATE public.affiliate_commissions
  SET status = p_new_status,
      status_before_hold = NULL,
      reversal_reason = CASE WHEN p_new_status = 'reversed' THEN trim(p_reason) ELSE reversal_reason END,
      updated_at = NOW()
  WHERE id = p_commission_id;

  INSERT INTO public.affiliate_admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, reason, before_data, after_data
  ) VALUES (
    p_admin_user_id, 'commission_' || p_new_status, 'commission', p_commission_id, trim(p_reason),
    jsonb_build_object('status', v_commission.status), jsonb_build_object('status', p_new_status)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_admin_record_payout(
  p_affiliate_id UUID,
  p_commission_ids UUID[],
  p_paid_at TIMESTAMPTZ,
  p_transaction_reference TEXT,
  p_notes TEXT,
  p_admin_user_id UUID,
  p_reason TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count INTEGER;
  v_expected_count INTEGER;
  v_amount BIGINT;
  v_currency TEXT;
  v_currency_max TEXT;
  v_minimum BIGINT;
  v_payout_id UUID;
BEGIN
  IF p_commission_ids IS NULL OR cardinality(p_commission_ids) = 0
    OR p_paid_at IS NULL OR length(trim(coalesce(p_transaction_reference, ''))) = 0
    OR p_paid_at > NOW() OR length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'Payout details are incomplete';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.affiliates
    WHERE id = p_affiliate_id AND user_id = p_admin_user_id
  ) THEN
    RAISE EXCEPTION 'An affiliate cannot administer their own payout';
  END IF;

  PERFORM 1 FROM public.affiliate_commissions
  WHERE id = ANY(p_commission_ids) AND affiliate_id = p_affiliate_id
  ORDER BY id FOR UPDATE;

  SELECT count(*), sum(commission_amount_cents), min(currency), max(currency)
  INTO v_count, v_amount, v_currency, v_currency_max
  FROM public.affiliate_commissions
  WHERE id = ANY(p_commission_ids) AND affiliate_id = p_affiliate_id AND status = 'approved';

  SELECT count(DISTINCT id) INTO v_expected_count FROM unnest(p_commission_ids) AS id;
  IF v_count <> v_expected_count OR v_expected_count <> cardinality(p_commission_ids) THEN
    RAISE EXCEPTION 'Every payout commission must be approved, unpaid, and unique';
  END IF;

  IF v_currency <> v_currency_max THEN
    RAISE EXCEPTION 'A payout can include commissions in only one currency';
  END IF;

  SELECT minimum_payout_cents INTO v_minimum
  FROM public.affiliate_program_settings WHERE id = TRUE;
  IF v_amount < v_minimum THEN
    RAISE EXCEPTION 'Payout is below the configured minimum';
  END IF;

  INSERT INTO public.affiliate_payouts (
    affiliate_id, amount_cents, currency, paid_at, transaction_reference, notes, recorded_by
  ) VALUES (
    p_affiliate_id, v_amount, v_currency, p_paid_at, trim(p_transaction_reference), p_notes, p_admin_user_id
  ) RETURNING id INTO v_payout_id;

  INSERT INTO public.affiliate_payout_items (payout_id, commission_id, amount_cents)
  SELECT v_payout_id, id, commission_amount_cents
  FROM public.affiliate_commissions WHERE id = ANY(p_commission_ids);

  UPDATE public.affiliate_commissions
  SET status = 'paid', paid_at = p_paid_at, updated_at = NOW()
  WHERE id = ANY(p_commission_ids) AND affiliate_id = p_affiliate_id;

  INSERT INTO public.affiliate_admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, reason, after_data
  ) VALUES (
    p_admin_user_id, 'payout_recorded', 'payout', v_payout_id, trim(p_reason),
    jsonb_build_object('amount_cents', v_amount, 'currency', v_currency, 'commission_ids', p_commission_ids)
  );

  RETURN v_payout_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_handle_payment_risk_event(
  p_stripe_event_id TEXT,
  p_event_type TEXT,
  p_invoice_id TEXT,
  p_charge_id TEXT,
  p_payment_intent_id TEXT,
  p_dispute_outcome TEXT,
  p_reason TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_commission public.affiliate_commissions%ROWTYPE;
  v_new_status TEXT;
BEGIN
  SELECT * INTO v_commission
  FROM public.affiliate_commissions
  WHERE (p_invoice_id IS NOT NULL AND stripe_invoice_id = p_invoice_id)
     OR (p_charge_id IS NOT NULL AND stripe_charge_id = p_charge_id)
     OR (p_payment_intent_id IS NOT NULL AND stripe_payment_intent_id = p_payment_intent_id)
  ORDER BY created_at
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN RETURN FALSE; END IF;

  INSERT INTO public.affiliate_webhook_events (stripe_event_id, event_type, commission_id, details)
  VALUES (
    p_stripe_event_id,
    p_event_type,
    v_commission.id,
    jsonb_build_object('invoice_id', p_invoice_id, 'charge_id', p_charge_id, 'reason', p_reason, 'dispute_outcome', p_dispute_outcome)
  )
  ON CONFLICT (stripe_event_id) DO NOTHING;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  IF p_event_type = 'charge.refunded' THEN
    v_new_status := 'reversed';
  ELSIF p_event_type = 'charge.dispute.created' THEN
    IF v_commission.status IN ('pending_review', 'approved', 'paid') THEN
      UPDATE public.affiliate_commissions
      SET status_before_hold = status, status = 'held', hold_reason = trim(coalesce(p_reason, 'Stripe dispute opened')), updated_at = NOW()
      WHERE id = v_commission.id;
    END IF;
    RETURN TRUE;
  ELSIF p_event_type = 'charge.dispute.closed' AND p_dispute_outcome = 'won' THEN
    IF v_commission.status = 'held' THEN
      UPDATE public.affiliate_commissions
      SET status = COALESCE(status_before_hold, 'pending_review'), status_before_hold = NULL, updated_at = NOW()
      WHERE id = v_commission.id;
    END IF;
    RETURN TRUE;
  ELSIF p_event_type = 'charge.dispute.closed' AND p_dispute_outcome = 'lost' THEN
    v_new_status := 'reversed';
  ELSE
    RETURN FALSE;
  END IF;

  UPDATE public.affiliate_commissions
  SET status = v_new_status,
      status_before_hold = NULL,
      hold_reason = NULL,
      reversal_reason = trim(coalesce(p_reason, 'Stripe payment refunded or disputed')),
      updated_at = NOW()
  WHERE id = v_commission.id AND status <> 'reversed';

  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_admin_review_application(
  p_affiliate_id UUID,
  p_new_status TEXT,
  p_code TEXT,
  p_admin_user_id UUID,
  p_reason TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_affiliate public.affiliates%ROWTYPE;
  v_code_id UUID;
BEGIN
  IF p_new_status NOT IN ('approved', 'rejected', 'suspended', 'inactive')
    OR length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'Invalid affiliate review';
  END IF;
  IF p_new_status = 'approved' AND (p_code IS NULL OR p_code !~ '^[a-z0-9][a-z0-9_-]{2,39}$') THEN
    RAISE EXCEPTION 'Approval requires a valid referral code';
  END IF;

  SELECT * INTO v_affiliate FROM public.affiliates
  WHERE id = p_affiliate_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Affiliate application not found'; END IF;
  IF v_affiliate.user_id = p_admin_user_id THEN
    RAISE EXCEPTION 'An affiliate cannot review their own application';
  END IF;

  UPDATE public.affiliates
  SET status = p_new_status, reviewed_at = NOW(), reviewed_by = p_admin_user_id, updated_at = NOW()
  WHERE id = p_affiliate_id;

  IF p_new_status = 'approved' THEN
    UPDATE public.affiliate_referral_codes
    SET is_active = FALSE, revoked_at = NOW()
    WHERE affiliate_id = p_affiliate_id AND is_active;

    INSERT INTO public.affiliate_referral_codes (affiliate_id, code)
    VALUES (p_affiliate_id, p_code)
    RETURNING id INTO v_code_id;
  ELSE
    UPDATE public.affiliate_referral_codes
    SET is_active = FALSE, revoked_at = NOW()
    WHERE affiliate_id = p_affiliate_id AND is_active;
  END IF;

  INSERT INTO public.affiliate_admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, reason, before_data, after_data
  ) VALUES (
    p_admin_user_id, 'affiliate_' || p_new_status, 'affiliate', p_affiliate_id, trim(p_reason),
    jsonb_build_object('status', v_affiliate.status),
    jsonb_build_object('status', p_new_status, 'code_id', v_code_id)
  );

  RETURN jsonb_build_object('affiliate_id', p_affiliate_id, 'status', p_new_status, 'code_id', v_code_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_admin_rotate_code(
  p_affiliate_id UUID,
  p_code TEXT,
  p_admin_user_id UUID,
  p_reason TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code_id UUID;
BEGIN
  IF p_code IS NULL OR p_code !~ '^[a-z0-9][a-z0-9_-]{2,39}$'
    OR length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'Valid referral code and reason are required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.affiliates WHERE id = p_affiliate_id AND user_id = p_admin_user_id
  ) THEN
    RAISE EXCEPTION 'An affiliate cannot administer their own referral code';
  END IF;
  PERFORM 1 FROM public.affiliates
  WHERE id = p_affiliate_id AND status = 'approved'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Only approved affiliates can have active codes';
  END IF;

  UPDATE public.affiliate_referral_codes
  SET is_active = FALSE, revoked_at = NOW()
  WHERE affiliate_id = p_affiliate_id AND is_active;

  INSERT INTO public.affiliate_referral_codes (affiliate_id, code)
  VALUES (p_affiliate_id, p_code)
  RETURNING id INTO v_code_id;

  INSERT INTO public.affiliate_admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, reason, after_data
  ) VALUES (
    p_admin_user_id, 'referral_code_rotated', 'affiliate', p_affiliate_id, trim(p_reason),
    jsonb_build_object('code_id', v_code_id)
  );
  RETURN v_code_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_admin_revoke_code(
  p_code_id UUID,
  p_admin_user_id UUID,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code public.affiliate_referral_codes%ROWTYPE;
BEGIN
  IF length(trim(coalesce(p_reason, ''))) = 0 THEN RAISE EXCEPTION 'A reason is required'; END IF;
  SELECT * INTO v_code FROM public.affiliate_referral_codes WHERE id = p_code_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Referral code not found'; END IF;
  IF v_code.is_active THEN
    UPDATE public.affiliate_referral_codes
    SET is_active = FALSE, revoked_at = NOW()
    WHERE id = p_code_id;
  END IF;
  INSERT INTO public.affiliate_admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, reason, before_data, after_data
  ) VALUES (
    p_admin_user_id, 'referral_code_revoked', 'referral_code', p_code_id, trim(p_reason),
    jsonb_build_object('is_active', v_code.is_active), jsonb_build_object('is_active', FALSE)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_admin_update_settings(
  p_rate_bps INTEGER,
  p_window_days INTEGER,
  p_minimum_payout_cents BIGINT,
  p_admin_user_id UUID,
  p_reason TEXT
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_before public.affiliate_program_settings%ROWTYPE;
BEGIN
  IF p_rate_bps NOT BETWEEN 1 AND 10000 OR p_window_days NOT BETWEEN 1 AND 365
    OR p_minimum_payout_cents < 0 OR length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'Invalid affiliate program settings';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.affiliates WHERE user_id = p_admin_user_id
  ) THEN
    RAISE EXCEPTION 'Affiliates cannot administer commission settings';
  END IF;

  SELECT * INTO v_before FROM public.affiliate_program_settings WHERE id = TRUE FOR UPDATE;
  UPDATE public.affiliate_program_settings
  SET commission_rate_bps = p_rate_bps,
      attribution_window_days = p_window_days,
      minimum_payout_cents = p_minimum_payout_cents,
      updated_by = p_admin_user_id,
      updated_at = NOW()
  WHERE id = TRUE;

  INSERT INTO public.affiliate_admin_audit_logs (
    admin_user_id, action, entity_type, reason, before_data, after_data
  ) VALUES (
    p_admin_user_id, 'program_settings_updated', 'program_settings', trim(p_reason),
    jsonb_build_object(
      'commission_rate_bps', v_before.commission_rate_bps,
      'attribution_window_days', v_before.attribution_window_days,
      'minimum_payout_cents', v_before.minimum_payout_cents
    ),
    jsonb_build_object(
      'commission_rate_bps', p_rate_bps,
      'attribution_window_days', p_window_days,
      'minimum_payout_cents', p_minimum_payout_cents
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_dashboard_stats(p_affiliate_id UUID)
RETURNS JSONB
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'total_clicks', (SELECT count(*) FROM public.affiliate_clicks WHERE affiliate_id = p_affiliate_id),
    'registrations', (SELECT count(*) FROM public.affiliate_attributions WHERE affiliate_id = p_affiliate_id AND user_id IS NOT NULL AND clicked_at >= NOW() - INTERVAL '24 months'),
    'paying_customers', (SELECT count(*) FROM public.affiliate_attributions WHERE affiliate_id = p_affiliate_id AND first_paid_at IS NOT NULL AND clicked_at >= NOW() - INTERVAL '24 months'),
    'eligible_payments', (SELECT count(*) FROM public.affiliate_commissions WHERE affiliate_id = p_affiliate_id),
    'commissions_earned_by_currency', (
      SELECT coalesce(jsonb_object_agg(currency, total_cents), '{}'::JSONB)
      FROM (
        SELECT currency, sum(commission_amount_cents) AS total_cents
        FROM public.affiliate_commissions
        WHERE affiliate_id = p_affiliate_id AND status <> 'reversed'
        GROUP BY currency
      ) AS totals
    ),
    'commissions_pending_by_currency', (
      SELECT coalesce(jsonb_object_agg(currency, total_cents), '{}'::JSONB)
      FROM (
        SELECT currency, sum(commission_amount_cents) AS total_cents
        FROM public.affiliate_commissions
        WHERE affiliate_id = p_affiliate_id AND status IN ('pending_review', 'held')
        GROUP BY currency
      ) AS totals
    ),
    'commissions_approved_by_currency', (
      SELECT coalesce(jsonb_object_agg(currency, total_cents), '{}'::JSONB)
      FROM (
        SELECT currency, sum(commission_amount_cents) AS total_cents
        FROM public.affiliate_commissions
        WHERE affiliate_id = p_affiliate_id AND status = 'approved'
        GROUP BY currency
      ) AS totals
    ),
    'commissions_paid_by_currency', (
      SELECT coalesce(jsonb_object_agg(currency, total_cents), '{}'::JSONB)
      FROM (
        SELECT currency, sum(amount_cents) AS total_cents
        FROM public.affiliate_payouts
        WHERE affiliate_id = p_affiliate_id
        GROUP BY currency
      ) AS totals
    )
  );
$$;

REVOKE ALL ON FUNCTION public.affiliate_record_successful_payment(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TIMESTAMPTZ) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_admin_transition_commission(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_admin_record_payout(UUID, UUID[], TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_handle_payment_risk_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_admin_review_application(UUID, TEXT, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_admin_rotate_code(UUID, TEXT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_admin_revoke_code(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_admin_update_settings(INTEGER, INTEGER, BIGINT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_dashboard_stats(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_cleanup_retention() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_handle_account_delete() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.affiliate_record_successful_payment(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, TEXT, TIMESTAMPTZ) TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_admin_transition_commission(UUID, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_admin_record_payout(UUID, UUID[], TIMESTAMPTZ, TEXT, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_handle_payment_risk_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_admin_review_application(UUID, TEXT, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_admin_rotate_code(UUID, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_admin_revoke_code(UUID, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_admin_update_settings(INTEGER, INTEGER, BIGINT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_dashboard_stats(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_cleanup_retention() TO service_role;