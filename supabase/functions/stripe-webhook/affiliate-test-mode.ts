export type AffiliateTestWebhookAction = "paid-invoice" | "payment-risk" | null;

export type StripeTestWebhookRoute = "primary" | "affiliate-only" | "ignore";

export function getStripeTestWebhookRoute(
  mode: "live" | "test",
  eventType: string,
): StripeTestWebhookRoute {
  if (mode === "test") return "primary";
  return getAffiliateTestWebhookAction(eventType) ? "affiliate-only" : "ignore";
}

export function getAffiliateTestWebhookAction(eventType: string): AffiliateTestWebhookAction {
  if (eventType === "invoice.payment_succeeded") return "paid-invoice";
  if (["charge.refunded", "charge.dispute.created", "charge.dispute.closed"].includes(eventType)) {
    return "payment-risk";
  }
  return null;
}
