ALTER TABLE public.affiliates
  ADD COLUMN commission_rate_bps_override INTEGER
    CHECK (commission_rate_bps_override IS NULL OR commission_rate_bps_override BETWEEN 1 AND 10000),
  ADD COLUMN attribution_window_days_override INTEGER
    CHECK (attribution_window_days_override IS NULL OR attribution_window_days_override BETWEEN 1 AND 365),
  ADD COLUMN minimum_payout_cents_override BIGINT
    CHECK (minimum_payout_cents_override IS NULL OR minimum_payout_cents_override >= 0);

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

  SELECT COALESCE(a.commission_rate_bps_override, s.commission_rate_bps)
  INTO v_rate_bps
  FROM public.affiliates a
  CROSS JOIN public.affiliate_program_settings s
  WHERE a.id = v_attribution.affiliate_id AND s.id = TRUE;
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

  SELECT COALESCE(a.minimum_payout_cents_override, s.minimum_payout_cents)
  INTO v_minimum
  FROM public.affiliates a
  CROSS JOIN public.affiliate_program_settings s
  WHERE a.id = p_affiliate_id AND s.id = TRUE;
  IF v_minimum IS NULL THEN
    RAISE EXCEPTION 'Affiliate not found';
  END IF;
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

CREATE OR REPLACE FUNCTION public.affiliate_admin_update_creator_settings(
  p_affiliate_id UUID,
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
  v_before public.affiliates%ROWTYPE;
BEGIN
  IF (p_rate_bps IS NOT NULL AND p_rate_bps NOT BETWEEN 1 AND 10000)
    OR (p_window_days IS NOT NULL AND p_window_days NOT BETWEEN 1 AND 365)
    OR (p_minimum_payout_cents IS NOT NULL AND p_minimum_payout_cents < 0)
    OR length(trim(coalesce(p_reason, ''))) = 0 THEN
    RAISE EXCEPTION 'Invalid creator settings';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.affiliates WHERE user_id = p_admin_user_id
  ) THEN
    RAISE EXCEPTION 'Affiliates cannot administer creator settings';
  END IF;

  SELECT * INTO v_before FROM public.affiliates WHERE id = p_affiliate_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Affiliate not found';
  END IF;

  UPDATE public.affiliates
  SET commission_rate_bps_override = p_rate_bps,
      attribution_window_days_override = p_window_days,
      minimum_payout_cents_override = p_minimum_payout_cents,
      updated_at = NOW()
  WHERE id = p_affiliate_id;

  INSERT INTO public.affiliate_admin_audit_logs (
    admin_user_id, action, entity_type, entity_id, reason, before_data, after_data
  ) VALUES (
    p_admin_user_id, 'creator_settings_updated', 'affiliate', p_affiliate_id, trim(p_reason),
    jsonb_build_object(
      'commission_rate_bps_override', v_before.commission_rate_bps_override,
      'attribution_window_days_override', v_before.attribution_window_days_override,
      'minimum_payout_cents_override', v_before.minimum_payout_cents_override
    ),
    jsonb_build_object(
      'commission_rate_bps_override', p_rate_bps,
      'attribution_window_days_override', p_window_days,
      'minimum_payout_cents_override', p_minimum_payout_cents
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.affiliate_admin_update_creator_settings(UUID, INTEGER, INTEGER, BIGINT, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.affiliate_admin_update_creator_settings(UUID, INTEGER, INTEGER, BIGINT, UUID, TEXT) TO service_role;
