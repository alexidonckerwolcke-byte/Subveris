export type AffiliateTestWebhookAction = "paid-invoice" | "payment-risk" | null;

export function getAffiliateTestWebhookAction(eventType: string): AffiliateTestWebhookAction {
  if (eventType === "invoice.payment_succeeded") return "paid-invoice";
  if (["charge.refunded", "charge.dispute.created", "charge.dispute.closed"].includes(eventType)) {
    return "payment-risk";
  }
  return null;
}
