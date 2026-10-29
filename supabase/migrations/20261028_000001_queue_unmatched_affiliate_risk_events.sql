CREATE INDEX affiliate_webhook_events_pending_invoice_idx
  ON public.affiliate_webhook_events ((details ->> 'invoice_id'))
  WHERE commission_id IS NULL;

CREATE INDEX affiliate_webhook_events_pending_charge_idx
  ON public.affiliate_webhook_events ((details ->> 'charge_id'))
  WHERE commission_id IS NULL;

CREATE INDEX affiliate_webhook_events_pending_payment_intent_idx
  ON public.affiliate_webhook_events ((details ->> 'payment_intent_id'))
  WHERE commission_id IS NULL;

CREATE OR REPLACE FUNCTION public.affiliate_apply_pending_payment_risk_events(
  p_commission_id UUID
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_commission public.affiliate_commissions%ROWTYPE;
  v_event public.affiliate_webhook_events%ROWTYPE;
  v_reference TEXT;
  v_processed INTEGER := 0;
BEGIN
  SELECT * INTO v_commission
  FROM public.affiliate_commissions
  WHERE id = p_commission_id;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  FOR v_reference IN
    SELECT DISTINCT reference
    FROM unnest(ARRAY[
      v_commission.stripe_payment_intent_id,
      v_commission.stripe_charge_id,
      v_commission.stripe_invoice_id
    ]) AS reference
    WHERE reference IS NOT NULL
    ORDER BY reference
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('affiliate-payment:' || v_reference, 0));
  END LOOP;

  SELECT * INTO v_commission
  FROM public.affiliate_commissions
  WHERE id = p_commission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 0;
  END IF;

  FOR v_event IN
    SELECT *
    FROM public.affiliate_webhook_events
    WHERE commission_id IS NULL
      AND (
        details ->> 'invoice_id' = v_commission.stripe_invoice_id
        OR details ->> 'charge_id' = v_commission.stripe_charge_id
        OR details ->> 'payment_intent_id' = v_commission.stripe_payment_intent_id
      )
    ORDER BY COALESCE((details ->> 'stripe_created_at')::TIMESTAMPTZ, created_at),
      created_at,
      stripe_event_id
    FOR UPDATE
  LOOP
    UPDATE public.affiliate_webhook_events
    SET commission_id = v_commission.id
    WHERE stripe_event_id = v_event.stripe_event_id
      AND commission_id IS NULL;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    IF v_event.event_type = 'charge.refunded' THEN
      UPDATE public.affiliate_commissions
      SET status = CASE WHEN status = 'reversed' THEN status ELSE 'reversed' END,
          status_before_hold = NULL,
          hold_reason = NULL,
          reversal_reason = trim(coalesce(v_event.details ->> 'reason', 'Stripe payment refunded')),
          updated_at = NOW()
      WHERE id = v_commission.id;
    ELSIF v_event.event_type = 'charge.dispute.created' THEN
      UPDATE public.affiliate_commissions
      SET status_before_hold = status,
          status = 'held',
          hold_reason = trim(coalesce(v_event.details ->> 'reason', 'Stripe dispute opened')),
          updated_at = NOW()
      WHERE id = v_commission.id
        AND status IN ('pending_review', 'approved', 'paid');
    ELSIF v_event.event_type = 'charge.dispute.closed'
      AND v_event.details ->> 'dispute_outcome' = 'won' THEN
      UPDATE public.affiliate_commissions
      SET status = coalesce(status_before_hold, 'pending_review'),
          status_before_hold = NULL,
          hold_reason = NULL,
          updated_at = NOW()
      WHERE id = v_commission.id
        AND status = 'held';
    ELSIF v_event.event_type = 'charge.dispute.closed'
      AND v_event.details ->> 'dispute_outcome' = 'lost' THEN
      UPDATE public.affiliate_commissions
      SET status = CASE WHEN status = 'reversed' THEN status ELSE 'reversed' END,
          status_before_hold = NULL,
          hold_reason = NULL,
          reversal_reason = trim(coalesce(v_event.details ->> 'reason', 'Stripe dispute lost')),
          updated_at = NOW()
      WHERE id = v_commission.id;
    END IF;

    SELECT * INTO v_commission
    FROM public.affiliate_commissions
    WHERE id = p_commission_id;

    v_processed := v_processed + 1;
  END LOOP;

  RETURN v_processed;
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_apply_pending_payment_risk_events_on_commission_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.affiliate_apply_pending_payment_risk_events(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER affiliate_commission_apply_pending_risk_events
AFTER INSERT ON public.affiliate_commissions
FOR EACH ROW
EXECUTE FUNCTION public.affiliate_apply_pending_payment_risk_events_on_commission_insert();

CREATE OR REPLACE FUNCTION public.affiliate_handle_payment_risk_event(
  p_stripe_event_id TEXT,
  p_event_type TEXT,
  p_invoice_id TEXT,
  p_charge_id TEXT,
  p_payment_intent_id TEXT,
  p_dispute_outcome TEXT,
  p_reason TEXT,
  p_stripe_created_at TIMESTAMPTZ
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_commission public.affiliate_commissions%ROWTYPE;
  v_reference TEXT;
BEGIN
  IF p_event_type NOT IN ('charge.refunded', 'charge.dispute.created', 'charge.dispute.closed')
    OR p_stripe_event_id IS NULL
    OR coalesce(p_invoice_id, p_charge_id, p_payment_intent_id) IS NULL THEN
    RETURN FALSE;
  END IF;

  FOR v_reference IN
    SELECT DISTINCT reference
    FROM unnest(ARRAY[p_payment_intent_id, p_charge_id, p_invoice_id]) AS reference
    WHERE reference IS NOT NULL
    ORDER BY reference
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended('affiliate-payment:' || v_reference, 0));
  END LOOP;

  INSERT INTO public.affiliate_webhook_events (stripe_event_id, event_type, commission_id, details)
  VALUES (
    p_stripe_event_id,
    p_event_type,
    NULL,
    jsonb_build_object(
      'invoice_id', p_invoice_id,
      'charge_id', p_charge_id,
      'payment_intent_id', p_payment_intent_id,
      'stripe_created_at', coalesce(p_stripe_created_at, NOW()),
      'reason', p_reason,
      'dispute_outcome', p_dispute_outcome
    )
  )
  ON CONFLICT (stripe_event_id) DO NOTHING;

  SELECT * INTO v_commission
  FROM public.affiliate_commissions
  WHERE (p_invoice_id IS NOT NULL AND stripe_invoice_id = p_invoice_id)
     OR (p_charge_id IS NOT NULL AND stripe_charge_id = p_charge_id)
     OR (p_payment_intent_id IS NOT NULL AND stripe_payment_intent_id = p_payment_intent_id)
  ORDER BY created_at
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN TRUE;
  END IF;

  SELECT * INTO v_commission
  FROM public.affiliate_commissions
  WHERE id = v_commission.id
  FOR UPDATE;

  PERFORM public.affiliate_apply_pending_payment_risk_events(v_commission.id);
  RETURN TRUE;
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
BEGIN
  RETURN public.affiliate_handle_payment_risk_event(
    p_stripe_event_id,
    p_event_type,
    p_invoice_id,
    p_charge_id,
    p_payment_intent_id,
    p_dispute_outcome,
    p_reason,
    NOW()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.affiliate_apply_pending_payment_risk_events(UUID)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_apply_pending_payment_risk_events_on_commission_insert()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_handle_payment_risk_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.affiliate_handle_payment_risk_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.affiliate_apply_pending_payment_risk_events(UUID)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_handle_payment_risk_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.affiliate_handle_payment_risk_event(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT)
  TO service_role;
