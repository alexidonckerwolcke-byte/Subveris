import {
  calculateAffiliateCommissionCents,
  isAffiliateClickWithinWindow,
  isCommissionablePayment,
  isCommissionablePlan,
  isEligibleAffiliateReferral,
  getCurrencyExponent,
  normalizeAffiliateCode,
  selectLatestEligibleAffiliateClick,
} from "../shared/affiliate-policy";

describe("affiliate policy", () => {
  it("normalizes valid codes and rejects malformed codes", () => {
    expect(normalizeAffiliateCode("  Creator_123 ")).toBe("creator_123");
    expect(normalizeAffiliateCode("ab")).toBeNull();
    expect(normalizeAffiliateCode("../other")).toBeNull();
  });

  it("keeps attribution valid until, but not including, its expiry", () => {
    const clickedAt = "2026-10-01T12:00:00.000Z";
    const expiresAt = "2026-10-31T12:00:00.000Z";
    expect(isAffiliateClickWithinWindow(clickedAt, expiresAt, "2026-10-31T11:59:59.000Z")).toBe(true);
    expect(isAffiliateClickWithinWindow(clickedAt, expiresAt, expiresAt)).toBe(false);
    expect(isAffiliateClickWithinWindow("invalid", expiresAt, "2026-10-20T12:00:00.000Z")).toBe(false);
  });

  it("rejects inactive, self, and previously paying referrals", () => {
    const base = {
      affiliateUserId: "affiliate-1",
      referredUserId: "customer-1",
      affiliateStatus: "approved",
      clickedAt: "2026-10-01T12:00:00.000Z",
      expiresAt: "2026-10-31T12:00:00.000Z",
      now: "2026-10-10T12:00:00.000Z",
      hadPriorPaidSubscription: false,
    };
    expect(isEligibleAffiliateReferral(base)).toBe(true);
    expect(isEligibleAffiliateReferral({ ...base, affiliateStatus: "suspended" })).toBe(false);
    expect(isEligibleAffiliateReferral({ ...base, referredUserId: "affiliate-1" })).toBe(false);
    expect(isEligibleAffiliateReferral({ ...base, hadPriorPaidSubscription: true })).toBe(false);
    expect(isEligibleAffiliateReferral({ ...base, now: "2026-11-01T12:00:00.000Z" })).toBe(false);
  });

  it("only treats Premium as commissionable", () => {
    expect(isCommissionablePlan("premium")).toBe(true);
    expect(isCommissionablePlan("family")).toBe(false);
    expect(isCommissionablePlan("free")).toBe(false);
  });

  it("selects the latest eligible click and ignores expired, inactive, and self clicks", () => {
    const now = "2026-10-20T12:00:00.000Z";
    const clicks = [
      { id: "old", affiliateUserId: "affiliate-1", affiliateStatus: "approved", clickedAt: "2026-10-01T12:00:00.000Z", expiresAt: "2026-10-31T12:00:00.000Z" },
      { id: "latest", affiliateUserId: "affiliate-2", affiliateStatus: "approved", clickedAt: "2026-10-10T12:00:00.000Z", expiresAt: "2026-11-09T12:00:00.000Z" },
      { id: "self", affiliateUserId: "customer-1", affiliateStatus: "approved", clickedAt: "2026-10-15T12:00:00.000Z", expiresAt: "2026-11-14T12:00:00.000Z" },
      { id: "inactive", affiliateUserId: "affiliate-3", affiliateStatus: "suspended", clickedAt: "2026-10-18T12:00:00.000Z", expiresAt: "2026-11-17T12:00:00.000Z" },
      { id: "expired", affiliateUserId: "affiliate-4", affiliateStatus: "approved", clickedAt: "2026-09-01T12:00:00.000Z", expiresAt: "2026-10-01T12:00:00.000Z" },
    ];
    expect(selectLatestEligibleAffiliateClick(clicks, "customer-1", now)?.id).toBe("latest");
  });

  it("requires a successful, non-zero Premium invoice for commission", () => {
    const successful = { invoiceStatus: "paid", amountPaidMinor: 999, planType: "premium" };
    expect(isCommissionablePayment(successful)).toBe(true);
    expect(isCommissionablePayment({ ...successful, invoiceStatus: "open" })).toBe(false);
    expect(isCommissionablePayment({ ...successful, amountPaidMinor: 0 })).toBe(false);
    expect(isCommissionablePayment({ ...successful, planType: "family" })).toBe(false);
    expect(isCommissionablePayment({ ...successful, planType: "free" })).toBe(false);
  });

  it("calculates commissions in integer minor units with half-up rounding", () => {
    expect(calculateAffiliateCommissionCents(999, 2_000)).toBe(200);
    expect(calculateAffiliateCommissionCents(1_000, 2_000)).toBe(200);
    expect(calculateAffiliateCommissionCents(1, 5_000)).toBe(1);
    expect(calculateAffiliateCommissionCents(0, 2_000)).toBe(0);
  });

  it("formats Stripe smallest units using the currency exponent", () => {
    expect(getCurrencyExponent("JPY")).toBe(0);
    expect(getCurrencyExponent("BHD")).toBe(3);
    expect(getCurrencyExponent("EUR")).toBe(2);
  });

  it("rejects invalid financial inputs", () => {
    expect(() => calculateAffiliateCommissionCents(-1, 2_000)).toThrow(RangeError);
    expect(() => calculateAffiliateCommissionCents(1.5, 2_000)).toThrow(RangeError);
    expect(() => calculateAffiliateCommissionCents(1_000, 10_001)).toThrow(RangeError);
  });
});