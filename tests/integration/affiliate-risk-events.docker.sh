#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
migration="$repo_root/supabase/migrations/20261028_000001_queue_unmatched_affiliate_risk_events.sql"
container_name="affiliate-risk-test-$(uuidgen | tr '[:upper:]' '[:lower:]')"

cleanup() {
  docker rm --force "$container_name" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run --detach \
  --name "$container_name" \
  --env POSTGRES_PASSWORD=affiliate-test-only \
  postgres:17-alpine >/dev/null

ready=false
for _ in $(seq 1 60); do
  if docker exec "$container_name" pg_isready --username postgres --dbname postgres >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  docker logs "$container_name"
  printf 'PostgreSQL container did not become ready.\n' >&2
  exit 1
fi

docker exec --interactive "$container_name" psql \
  --username postgres --dbname postgres --set ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN;

CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_subscription_id TEXT NOT NULL,
  stripe_charge_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review'
    CHECK (status IN ('pending_review', 'approved', 'held', 'paid', 'reversed')),
  status_before_hold TEXT
    CHECK (status_before_hold IS NULL OR status_before_hold IN ('pending_review', 'approved', 'paid')),
  hold_reason TEXT,
  reversal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.affiliate_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  commission_id UUID REFERENCES public.affiliate_commissions(id) ON DELETE SET NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SQL

docker exec --interactive "$container_name" psql \
  --username postgres --dbname postgres --set ON_ERROR_STOP=1 < "$migration"

docker exec --interactive "$container_name" psql \
  --username postgres --dbname postgres --set ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  v_commission_id UUID;
  v_status TEXT;
  v_status_before_hold TEXT;
  v_hold_reason TEXT;
  v_reversal_reason TEXT;
  v_linked_commission_id UUID;
  v_result BOOLEAN;
  v_event_count INTEGER;
BEGIN
  SELECT public.affiliate_handle_payment_risk_event(
    'evt_dispute_before_commission',
    'charge.dispute.created',
    NULL,
    'ch_dispute_before_commission',
    'pi_dispute_before_commission',
    NULL,
    'Stripe reported a dispute.',
    '2026-10-28T10:00:00Z'::TIMESTAMPTZ
  ) INTO v_result;
  IF NOT v_result THEN
    RAISE EXCEPTION 'Unmatched dispute event was not accepted for reconciliation';
  END IF;

  INSERT INTO public.affiliate_commissions (
    stripe_invoice_id,
    stripe_subscription_id,
    stripe_charge_id,
    stripe_payment_intent_id
  ) VALUES (
    'in_dispute_before_commission',
    'sub_dispute_before_commission',
    'ch_dispute_before_commission',
    'pi_dispute_before_commission'
  ) RETURNING id INTO v_commission_id;

  SELECT status, status_before_hold, hold_reason
  INTO v_status, v_status_before_hold, v_hold_reason
  FROM public.affiliate_commissions
  WHERE id = v_commission_id;
  IF v_status <> 'held'
    OR v_status_before_hold <> 'pending_review'
    OR v_hold_reason <> 'Stripe reported a dispute.' THEN
    RAISE EXCEPTION 'Commission insert did not apply the queued dispute: %, %, %',
      v_status, v_status_before_hold, v_hold_reason;
  END IF;

  SELECT commission_id INTO v_linked_commission_id
  FROM public.affiliate_webhook_events
  WHERE stripe_event_id = 'evt_dispute_before_commission';
  IF v_linked_commission_id IS DISTINCT FROM v_commission_id THEN
    RAISE EXCEPTION 'Queued dispute was not linked to the new commission';
  END IF;

  SELECT public.affiliate_handle_payment_risk_event(
    'evt_dispute_won',
    'charge.dispute.closed',
    NULL,
    'ch_dispute_before_commission',
    'pi_dispute_before_commission',
    'won',
    'Stripe reported a dispute (won).',
    '2026-10-28T10:05:00Z'::TIMESTAMPTZ
  ) INTO v_result;
  IF NOT v_result THEN
    RAISE EXCEPTION 'Won dispute event was not accepted';
  END IF;

  SELECT status, status_before_hold
  INTO v_status, v_status_before_hold
  FROM public.affiliate_commissions
  WHERE id = v_commission_id;
  IF v_status <> 'pending_review' OR v_status_before_hold IS NOT NULL THEN
    RAISE EXCEPTION 'Won dispute did not restore the prior commission status: %, %',
      v_status, v_status_before_hold;
  END IF;

  SELECT public.affiliate_handle_payment_risk_event(
    'evt_dispute_won',
    'charge.dispute.closed',
    NULL,
    'ch_dispute_before_commission',
    'pi_dispute_before_commission',
    'won',
    'Stripe reported a dispute (won).',
    '2026-10-28T10:05:00Z'::TIMESTAMPTZ
  ) INTO v_result;
  SELECT count(*) INTO v_event_count
  FROM public.affiliate_webhook_events
  WHERE stripe_event_id = 'evt_dispute_won';
  IF NOT v_result OR v_event_count <> 1 THEN
    RAISE EXCEPTION 'Duplicate Stripe event was not idempotent';
  END IF;

  PERFORM public.affiliate_handle_payment_risk_event(
    'evt_refund_after_dispute',
    'charge.refunded',
    NULL,
    'ch_dispute_before_commission',
    'pi_dispute_before_commission',
    NULL,
    'Stripe reported a refund.',
    '2026-10-28T10:10:00Z'::TIMESTAMPTZ
  );
  SELECT status, reversal_reason
  INTO v_status, v_reversal_reason
  FROM public.affiliate_commissions
  WHERE id = v_commission_id;
  IF v_status <> 'reversed' OR v_reversal_reason <> 'Stripe reported a refund.' THEN
    RAISE EXCEPTION 'Refund event did not reverse the commission: %, %',
      v_status, v_reversal_reason;
  END IF;
END;
$$;
SQL

printf 'PASS: unmatched dispute was reconciled on commission insert; won, duplicate, and refund events behaved correctly.\n'

docker exec --interactive "$container_name" psql \
  --username postgres --dbname postgres --set ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  v_commission_id UUID;
  v_status TEXT;
  v_status_before_hold TEXT;
  v_linked_event_count INTEGER;
BEGIN
  PERFORM public.affiliate_handle_payment_risk_event(
    'evt_closed_arrived_first',
    'charge.dispute.closed',
    NULL,
    'ch_out_of_order',
    'pi_out_of_order',
    'won',
    'Stripe reported a dispute (won).',
    '2026-10-28T11:02:00Z'::TIMESTAMPTZ
  );
  PERFORM public.affiliate_handle_payment_risk_event(
    'evt_created_arrived_second',
    'charge.dispute.created',
    NULL,
    'ch_out_of_order',
    'pi_out_of_order',
    NULL,
    'Stripe reported a dispute.',
    '2026-10-28T11:01:00Z'::TIMESTAMPTZ
  );

  INSERT INTO public.affiliate_commissions (
    stripe_invoice_id,
    stripe_subscription_id,
    stripe_charge_id,
    stripe_payment_intent_id
  ) VALUES (
    'in_out_of_order',
    'sub_out_of_order',
    'ch_out_of_order',
    'pi_out_of_order'
  ) RETURNING id INTO v_commission_id;

  SELECT status, status_before_hold
  INTO v_status, v_status_before_hold
  FROM public.affiliate_commissions
  WHERE id = v_commission_id;
  SELECT count(*) INTO v_linked_event_count
  FROM public.affiliate_webhook_events
  WHERE commission_id = v_commission_id;

  IF v_status <> 'pending_review'
    OR v_status_before_hold IS NOT NULL
    OR v_linked_event_count <> 2 THEN
    RAISE EXCEPTION 'Queued events were not applied in Stripe event-time order: %, %, linked %',
      v_status, v_status_before_hold, v_linked_event_count;
  END IF;
END;
$$;
SQL

printf 'PASS: queued dispute events were applied in Stripe event-time order.\n'
