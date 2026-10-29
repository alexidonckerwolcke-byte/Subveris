import { describe, expect, it } from "vitest";
import { getStripePlanPriceIds, resolveStripeCheckoutPrice } from "../supabase/functions/api/stripe-price";

describe("Stripe checkout price resolution", () => {
  const configuredPriceIds = {
    premium: "price_premium_current",
    family: "price_family_current",
  };

  it("uses the current server-configured price for the selected plan, not a stale client price", () => {
    expect(
      resolveStripeCheckoutPrice(
        { plan: "family", priceId: "price_family_stale" },
        configuredPriceIds,
      ),
    ).toEqual({ priceId: "price_family_current" });
  });

  it("resolves legacy price-id requests only when the id matches current configuration", () => {
    expect(
      resolveStripeCheckoutPrice({ priceId: "price_family_current" }, configuredPriceIds),
    ).toEqual({ priceId: "price_family_current" });
    expect(
      resolveStripeCheckoutPrice({ priceId: "price_family_stale" }, configuredPriceIds),
    ).toEqual({
      error: "Invalid Stripe plan price configured. Refresh the page and try again.",
      status: 400,
    });
  });

  it("reports invalid plans and missing configured prices explicitly", () => {
    expect(resolveStripeCheckoutPrice({ plan: "enterprise" }, configuredPriceIds)).toEqual({
      error: "Invalid subscription plan.",
      status: 400,
    });
    expect(resolveStripeCheckoutPrice({ plan: "family" }, { premium: "", family: "" })).toEqual({
      error: "Stripe price ID for the family plan is not configured.",
      status: 500,
    });
  });

  it("uses the same environment precedence for checkout and public price configuration", () => {
    const env: Record<string, string> = {
      STRIPE_PREMIUM_PRICE_ID: "price_premium_server",
      VITE_STRIPE_PREMIUM_PRICE_ID: "price_premium_client",
      VITE_STRIPE_FAMILY_PRICE_ID: "price_family_fallback",
    };

    expect(getStripePlanPriceIds((name) => env[name])).toEqual({
      premium: "price_premium_server",
      family: "price_family_fallback",
    });
  });
});
