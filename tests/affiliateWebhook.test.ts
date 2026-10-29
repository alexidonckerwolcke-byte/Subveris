import {
  getAffiliateTestWebhookAction,
  getStripeTestWebhookRoute,
} from "../supabase/functions/stripe-webhook/affiliate-test-mode";
import { getInvoicePaymentReferences } from "../supabase/functions/stripe-webhook/invoice-payment-references";
import { getStripeWebhookMode } from "../supabase/functions/stripe-webhook/stripe-mode";

describe("Stripe affiliate test-mode webhook routing", () => {
  it("processes only paid invoices, refunds, and dispute lifecycle events", () => {
    expect(getAffiliateTestWebhookAction("invoice.payment_succeeded")).toBe("paid-invoice");
    expect(getAffiliateTestWebhookAction("charge.refunded")).toBe("payment-risk");
    expect(getAffiliateTestWebhookAction("charge.dispute.created")).toBe("payment-risk");
    expect(getAffiliateTestWebhookAction("charge.dispute.closed")).toBe("payment-risk");
  });

  it("ignores test events that could change live subscription entitlements", () => {
    expect(getAffiliateTestWebhookAction("checkout.session.completed")).toBeNull();
    expect(getAffiliateTestWebhookAction("customer.subscription.updated")).toBeNull();
    expect(getAffiliateTestWebhookAction("invoice.payment_failed")).toBeNull();
  });

  it("processes primary subscription events when Stripe itself is configured in test mode", () => {
    expect(getStripeTestWebhookRoute("test", "checkout.session.completed")).toBe("primary");
    expect(getStripeTestWebhookRoute("test", "customer.subscription.updated")).toBe("primary");
  });

  it("keeps test subscription events isolated when the primary Stripe mode is live", () => {
    expect(getStripeTestWebhookRoute("live", "checkout.session.completed")).toBe("ignore");
    expect(getStripeTestWebhookRoute("live", "invoice.payment_succeeded")).toBe("affiliate-only");
  });
});

describe("Stripe invoice payment reference extraction", () => {
  it("reads charge and payment intent from the current invoice payments shape", () => {
    expect(getInvoicePaymentReferences({
      payments: {
        data: [{
          status: "paid",
          payment: {
            payment_intent: {
              id: "pi_test",
              latest_charge: "ch_test",
            },
          },
        }],
      },
    })).toEqual({ chargeId: "ch_test", paymentIntentId: "pi_test" });
  });

  it("prefers legacy invoice references when present", () => {
    expect(getInvoicePaymentReferences({
      charge: { id: "ch_legacy" },
      payment_intent: { id: "pi_legacy" },
      payments: {
        data: [{
          status: "paid",
          payment: { payment_intent: { id: "pi_current", latest_charge: "ch_current" } },
        }],
      },
    })).toEqual({ chargeId: "ch_legacy", paymentIntentId: "pi_legacy" });
  });

  it("does not use unpaid invoice payment references", () => {
    expect(getInvoicePaymentReferences({
      payments: {
        data: [{
          status: "open",
          payment: { payment_intent: { id: "pi_unpaid", latest_charge: "ch_unpaid" } },
        }],
      },
    })).toEqual({ chargeId: null, paymentIntentId: null });
  });

  it("reads PaymentIntent references from the Invoice Payments API response", () => {
    expect(getInvoicePaymentReferences({}, [{
      status: "paid",
      payment: {
        payment_intent: {
          id: "pi_invoice_payment",
          latest_charge: { id: "ch_invoice_payment" },
        },
      },
    }])).toEqual({
      chargeId: "ch_invoice_payment",
      paymentIntentId: "pi_invoice_payment",
    });
  });

  it("reads charge-only references from the Invoice Payments API response", () => {
    expect(getInvoicePaymentReferences({}, [{
      status: "paid",
      payment: { charge: "ch_legacy_invoice_payment" },
    }])).toEqual({
      chargeId: "ch_legacy_invoice_payment",
      paymentIntentId: null,
    });
  });
});

describe("Stripe webhook credential mode", () => {
  it("defaults to Live mode and accepts an explicit Test mode", () => {
    expect(getStripeWebhookMode(undefined)).toBe("live");
    expect(getStripeWebhookMode("live")).toBe("live");
    expect(getStripeWebhookMode("test")).toBe("test");
  });

  it("rejects unknown modes instead of silently choosing credentials", () => {
    expect(() => getStripeWebhookMode("testing")).toThrow('Unsupported STRIPE_MODE "testing"');
  });
});
