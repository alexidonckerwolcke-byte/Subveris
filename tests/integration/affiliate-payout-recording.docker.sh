#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
migration="$repo_root/supabase/migrations/20261023_000001_affiliate_creator_settings.sql"
container_name="affiliate-payout-test-$(uuidgen | tr '[:upper:]' '[:lower:]')"

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
CREATE TABLE public.affiliate_program_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  minimum_payout_cents BIGINT NOT NULL DEFAULT 0
);

CREATE TABLE public.affiliates (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  minimum_payout_cents_override BIGINT
);

CREATE TABLE public.affiliate_commissions (
  id UUID PRIMARY KEY,
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id),
  commission_amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL,
  paid_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.affiliate_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id UUID NOT NULL REFERENCES public.affiliates(id),
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  transaction_reference TEXT NOT NULL,
  notes TEXT,
  recorded_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.affiliate_payout_items (
  payout_id UUID NOT NULL REFERENCES public.affiliate_payouts(id),
  commission_id UUID NOT NULL UNIQUE REFERENCES public.affiliate_commissions(id),
  amount_cents BIGINT NOT NULL,
  PRIMARY KEY (payout_id, commission_id)
);

CREATE TABLE public.affiliate_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  reason TEXT NOT NULL,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.affiliate_program_settings (id, minimum_payout_cents)
VALUES (TRUE, 301);
INSERT INTO public.affiliates (id, user_id, minimum_payout_cents_override)
VALUES
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111', NULL),
  ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '22222222-2222-4222-8222-222222222222', NULL);
INSERT INTO public.affiliate_commissions (
  id, affiliate_id, commission_amount_cents, currency, status
) VALUES
  ('c0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 200, 'eur', 'approved'),
  ('c0000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 100, 'eur', 'approved'),
  ('c0000000-0000-4000-8000-000000000003', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 500, 'usd', 'approved'),
  ('c0000000-0000-4000-8000-000000000004', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 500, 'eur', 'pending_review'),
  ('c0000000-0000-4000-8000-000000000005', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 500, 'eur', 'approved');
SQL

awk '
  /CREATE OR REPLACE FUNCTION public\.affiliate_admin_record_payout\(/ { copying = 1 }
  copying { print }
  copying && /^\$\$;/ { exit }
' "$migration" | docker exec --interactive "$container_name" psql \
  --username postgres --dbname postgres --set ON_ERROR_STOP=1

docker exec --interactive "$container_name" psql \
  --username postgres --dbname postgres --set ON_ERROR_STOP=1 <<'SQL'
DO $$
DECLARE
  v_affiliate_id UUID := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  v_admin_id UUID := '33333333-3333-4333-8333-333333333333';
  v_paid_at TIMESTAMPTZ := NOW() - INTERVAL '1 minute';
  v_payout_id UUID;
  v_status TEXT;
  v_amount BIGINT;
  v_currency TEXT;
  v_count INTEGER;
BEGIN
  BEGIN
    PERFORM public.affiliate_admin_record_payout(
      v_affiliate_id, ARRAY['c0000000-0000-4000-8000-000000000004'::UUID],
      v_paid_at, 'test-pending', NULL, v_admin_id, 'Expected pending commission rejection'
    );
    RAISE EXCEPTION 'Pending commission payout unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Every payout commission must be approved%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.affiliate_admin_record_payout(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      ARRAY['c0000000-0000-4000-8000-000000000001'::UUID],
      v_paid_at, 'test-wrong-affiliate', NULL, v_admin_id, 'Expected affiliate mismatch rejection'
    );
    RAISE EXCEPTION 'Commission from another affiliate was included unexpectedly';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%Every payout commission must be approved%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.affiliate_admin_record_payout(
      v_affiliate_id,
      ARRAY[
        'c0000000-0000-4000-8000-000000000001'::UUID,
        'c0000000-0000-4000-8000-000000000003'::UUID
      ],
      v_paid_at, 'test-mixed-currency', NULL, v_admin_id, 'Expected mixed currency rejection'
    );
    RAISE EXCEPTION 'Mixed currency payout unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%only one currency%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.affiliate_admin_record_payout(
      v_affiliate_id,
      ARRAY[
        'c0000000-0000-4000-8000-000000000001'::UUID,
        'c0000000-0000-4000-8000-000000000001'::UUID
      ],
      v_paid_at, 'test-duplicate', NULL, v_admin_id, 'Expected duplicate commission rejection'
    );
    RAISE EXCEPTION 'Duplicate commission payout unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%approved, unpaid, and unique%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.affiliate_admin_record_payout(
      v_affiliate_id,
      ARRAY[
        'c0000000-0000-4000-8000-000000000001'::UUID,
        'c0000000-0000-4000-8000-000000000002'::UUID
      ],
      v_paid_at, 'test-below-minimum', NULL, v_admin_id, 'Expected minimum payout rejection'
    );
    RAISE EXCEPTION 'Below-minimum payout unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%below the configured minimum%' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.affiliate_admin_record_payout(
      v_affiliate_id, ARRAY['c0000000-0000-4000-8000-000000000001'::UUID],
      v_paid_at, 'test-self-payout', NULL,
      '11111111-1111-4111-8111-111111111111', 'Expected self-payout rejection'
    );
    RAISE EXCEPTION 'Self payout unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%cannot administer their own payout%' THEN RAISE; END IF;
  END;

  SELECT count(*) INTO v_count FROM public.affiliate_payouts;
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'Rejected payout attempts left payout rows behind: %', v_count;
  END IF;
  SELECT status INTO v_status FROM public.affiliate_commissions
  WHERE id = 'c0000000-0000-4000-8000-000000000001';
  IF v_status <> 'approved' THEN
    RAISE EXCEPTION 'Rejected payout attempts changed the approved commission: %', v_status;
  END IF;

  UPDATE public.affiliate_program_settings SET minimum_payout_cents = 0 WHERE id = TRUE;
  SELECT public.affiliate_admin_record_payout(
    v_affiliate_id,
    ARRAY['c0000000-0000-4000-8000-000000000001'::UUID],
    v_paid_at,
    'TEST-ONLY-NO-TRANSFER-affiliate-payout-integration',
    'Disposable local PostgreSQL integration test; no transfer occurred',
    v_admin_id,
    'TEST ONLY: validate payout ledger transaction locally; no funds transferred'
  ) INTO v_payout_id;

  SELECT status, paid_at INTO v_status, v_paid_at FROM public.affiliate_commissions
  WHERE id = 'c0000000-0000-4000-8000-000000000001';
  IF v_status <> 'paid' OR v_paid_at IS NULL THEN
    RAISE EXCEPTION 'Successful local payout did not mark the selected commission paid';
  END IF;

  SELECT amount_cents, currency INTO v_amount, v_currency
  FROM public.affiliate_payouts WHERE id = v_payout_id;
  IF v_amount <> 200 OR v_currency <> 'eur' THEN
    RAISE EXCEPTION 'Payout total/currency incorrect: %, %', v_amount, v_currency;
  END IF;

  SELECT count(*) INTO v_count FROM public.affiliate_payout_items
  WHERE payout_id = v_payout_id
    AND commission_id = 'c0000000-0000-4000-8000-000000000001'
    AND amount_cents = 200;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Payout item allocation was not persisted correctly';
  END IF;

  SELECT count(*) INTO v_count FROM public.affiliate_admin_audit_logs
  WHERE action = 'payout_recorded' AND entity_id = v_payout_id
    AND reason LIKE 'TEST ONLY:%';
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Payout audit entry was not persisted';
  END IF;

  BEGIN
    PERFORM public.affiliate_admin_record_payout(
      v_affiliate_id,
      ARRAY['c0000000-0000-4000-8000-000000000001'::UUID],
      NOW() - INTERVAL '1 minute',
      'TEST-ONLY-duplicate-replay',
      NULL,
      v_admin_id,
      'Expected duplicate payout prevention'
    );
    RAISE EXCEPTION 'Already paid commission was paid twice';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM NOT LIKE '%approved, unpaid, and unique%' THEN RAISE; END IF;
  END;

  SELECT count(*) INTO v_count FROM public.affiliate_payouts;
  IF v_count <> 1 THEN
    RAISE EXCEPTION 'Duplicate payout attempt changed payout count: %', v_count;
  END IF;
END;
$$;
SQL

printf 'PASS: actual payout SQL recorded a €2.00-equivalent local EUR ledger entry, updated commission and audit rows, and rejected invalid/duplicate payout attempts. No transfer occurred; the database was disposable.\n'
