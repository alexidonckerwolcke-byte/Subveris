export interface ExistingStripeSubscription {
  id: string;
  customer: string | null;
  currency: string | null;
  status: string;
}

export type StripeCustomerCurrencyTransition =
  | { useExistingCustomer: true }
  | { useExistingCustomer: false; replacesSubscriptionId: string }
  | { error: string; status: 409 };

export function resolveStripeCustomerCurrencyTransition(
  customerId: string | null | undefined,
  subscription: ExistingStripeSubscription | null | undefined,
  targetCurrency: string,
): StripeCustomerCurrencyTransition {
  if (!customerId || !subscription || !subscription.currency || subscription.currency === targetCurrency) {
    return { useExistingCustomer: true };
  }

  if (!subscription.customer || subscription.customer !== customerId) {
    return {
      error: "Could not safely verify the existing subscription for a currency change. Contact support.",
      status: 409,
    };
  }

  if (subscription.status !== "active" && subscription.status !== "trialing") {
    return {
      error: "Your existing subscription uses another currency and cannot be safely replaced in its current state. Contact support.",
      status: 409,
    };
  }

  return {
    useExistingCustomer: false,
    replacesSubscriptionId: subscription.id,
  };
}

export function isStripeCustomerCurrencyConflict(message: string): boolean {
  return /cannot combine currencies on a single customer/i.test(message);
}
