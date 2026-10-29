import { describe, expect, it } from "vitest";
import {
  isStripeCustomerCurrencyConflict,
  resolveStripeCustomerCurrencyTransition,
} from "../supabase/functions/api/stripe-currency-transition";

describe("Stripe customer currency transition", () => {
  it("keeps the existing customer when currencies match", () => {
    expect(
      resolveStripeCustomerCurrencyTransition(
        "cus_existing",
        {
          id: "sub_existing",
          customer: "cus_existing",
          currency: "eur",
          status: "active",
        },
        "eur",
      ),
    ).toEqual({ useExistingCustomer: true });
  });

  it("uses a separate customer and marks an active mismatched subscription for replacement", () => {
    expect(
      resolveStripeCustomerCurrencyTransition(
        "cus_usd",
        {
          id: "sub_usd",
          customer: "cus_usd",
          currency: "usd",
          status: "active",
        },
        "eur",
      ),
    ).toEqual({
      useExistingCustomer: false,
      replacesSubscriptionId: "sub_usd",
    });
  });

  it("does not replace a subscription that is not active or trialing", () => {
    expect(
      resolveStripeCustomerCurrencyTransition(
        "cus_usd",
        {
          id: "sub_canceled",
          customer: "cus_usd",
          currency: "usd",
          status: "canceled",
        },
        "eur",
      ),
    ).toEqual({
      error: "Your existing subscription uses another currency and cannot be safely replaced in its current state. Contact support.",
      status: 409,
    });
  });

  it("does not replace a subscription that belongs to a different customer", () => {
    expect(
      resolveStripeCustomerCurrencyTransition(
        "cus_saved",
        {
          id: "sub_other",
          customer: "cus_other",
          currency: "usd",
          status: "active",
        },
        "eur",
      ),
    ).toEqual({
      error: "Could not safely verify the existing subscription for a currency change. Contact support.",
      status: 409,
    });
  });

  it("recognizes Stripe's customer currency conflict", () => {
    expect(isStripeCustomerCurrencyConflict(
      "You cannot combine currencies on a single customer.",
    )).toBe(true);
    expect(isStripeCustomerCurrencyConflict("Invalid price ID.")).toBe(false);
  });
});
