export interface StripePlanPriceIds {
  premium: string;
  family: string;
}

export function getStripePlanPriceIds(getEnv: (name: string) => string | undefined): StripePlanPriceIds {
  return {
    premium: getEnv("STRIPE_PREMIUM_PRICE_ID") || getEnv("VITE_STRIPE_PREMIUM_PRICE_ID") || "",
    family: getEnv("STRIPE_FAMILY_PRICE_ID") || getEnv("VITE_STRIPE_FAMILY_PRICE_ID") || "",
  };
}

export type StripeCheckoutPriceResolution =
  | { priceId: string }
  | { error: string; status: 400 | 500 };

export function resolveStripeCheckoutPrice(
  body: unknown,
  configuredPriceIds: StripePlanPriceIds,
): StripeCheckoutPriceResolution {
  const request = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const requestedPlan = request.plan ?? request.tier;

  if (requestedPlan !== undefined) {
    if (requestedPlan !== "premium" && requestedPlan !== "family") {
      return { error: "Invalid subscription plan.", status: 400 };
    }

    const priceId = configuredPriceIds[requestedPlan];
    if (!priceId) {
      return { error: `Stripe price ID for the ${requestedPlan} plan is not configured.`, status: 500 };
    }
    return { priceId };
  }

  const requestedPriceId = typeof request.priceId === "string" ? request.priceId.trim() : "";
  if (!requestedPriceId) {
    return { error: "Missing subscription plan.", status: 400 };
  }

  const knownPriceIds = Object.values(configuredPriceIds).filter(Boolean);
  if (knownPriceIds.length === 0) {
    return { error: "Stripe plan prices are not configured.", status: 500 };
  }
  if (!knownPriceIds.includes(requestedPriceId)) {
    return { error: "Invalid Stripe plan price configured. Refresh the page and try again.", status: 400 };
  }

  return { priceId: requestedPriceId };
}
