export const DEFAULT_AFFILIATE_COMMISSION_RATE_BPS = 2_000;
export const DEFAULT_AFFILIATE_ATTRIBUTION_WINDOW_DAYS = 30;

export function normalizeAffiliateCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const code = value.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{2,39}$/.test(code) ? code : null;
}

export function isAffiliateClickWithinWindow(
  clickedAt: string | number | Date,
  expiresAt: string | number | Date,
  now: string | number | Date = Date.now(),
): boolean {
  const clicked = new Date(clickedAt).getTime();
  const expires = new Date(expiresAt).getTime();
  const current = new Date(now).getTime();
  return Number.isFinite(clicked) && Number.isFinite(expires) && Number.isFinite(current)
    && clicked <= current
    && expires > current;
}

export function isEligibleAffiliateReferral(input: {
  affiliateUserId: string;
  referredUserId: string;
  affiliateStatus: string;
  clickedAt: string | number | Date;
  expiresAt: string | number | Date;
  now?: string | number | Date;
  hadPriorPaidSubscription: boolean;
}): boolean {
  return input.affiliateUserId !== input.referredUserId
    && input.affiliateStatus === "approved"
    && !input.hadPriorPaidSubscription
    && isAffiliateClickWithinWindow(input.clickedAt, input.expiresAt, input.now);
}

export type AffiliateClickCandidate = {
  affiliateUserId: string;
  affiliateStatus: string;
  clickedAt: string | number | Date;
  expiresAt: string | number | Date;
};

export function selectLatestEligibleAffiliateClick<T extends AffiliateClickCandidate>(
  clicks: T[],
  referredUserId: string,
  now: string | number | Date = Date.now(),
): T | null {
  return clicks
    .filter((click) => isEligibleAffiliateReferral({
      affiliateUserId: click.affiliateUserId,
      referredUserId,
      affiliateStatus: click.affiliateStatus,
      clickedAt: click.clickedAt,
      expiresAt: click.expiresAt,
      now,
      hadPriorPaidSubscription: false,
    }))
    .sort((left, right) => new Date(right.clickedAt).getTime() - new Date(left.clickedAt).getTime())[0] ?? null;
}

export function calculateAffiliateCommissionCents(amountPaidCents: number, rateBps: number): number {
  if (!Number.isSafeInteger(amountPaidCents) || amountPaidCents < 0) {
    throw new RangeError("Paid amount must be a non-negative safe integer.");
  }
  if (!Number.isSafeInteger(rateBps) || rateBps < 0 || rateBps > 10_000) {
    throw new RangeError("Commission rate must be between 0 and 10,000 basis points.");
  }

  const amount = BigInt(amountPaidCents);
  const rate = BigInt(rateBps);
  return Number((amount * rate + 5_000n) / 10_000n);
}

export function isCommissionablePlan(planType: string): boolean {
  return planType === "premium";
}

export function isCommissionablePayment(input: {
  invoiceStatus: string;
  amountPaidMinor: number;
  planType: string;
}): boolean {
  return input.invoiceStatus === "paid"
    && Number.isSafeInteger(input.amountPaidMinor)
    && input.amountPaidMinor > 0
    && isCommissionablePlan(input.planType);
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf", "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
]);

const THREE_DECIMAL_CURRENCIES = new Set(["bhd", "jod", "kwd", "omr", "tnd"]);

export function getCurrencyExponent(currency: string): 0 | 2 | 3 {
  const normalized = currency.toLowerCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) return 0;
  if (THREE_DECIMAL_CURRENCIES.has(normalized)) return 3;
  return 2;
}