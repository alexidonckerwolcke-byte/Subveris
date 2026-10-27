export type StripeWebhookMode = "live" | "test";

export function getStripeWebhookMode(value: string | undefined): StripeWebhookMode {
  if (value === undefined || value === "live") return "live";
  if (value === "test") return "test";
  throw new Error(`Unsupported STRIPE_MODE "${value}". Use "live" or "test".`);
}
