// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getAffiliateTestWebhookAction } from "./affiliate-test-mode.ts";
import { getInvoicePaymentReferences } from "./invoice-payment-references.ts";
import { getStripeWebhookMode } from "./stripe-mode.ts";

// Debug: log environment at initialization
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const stripeMode = getStripeWebhookMode(Deno.env.get("STRIPE_MODE"));
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const endpointSecret = (Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "").trim();
const testStripeKey = stripeMode === "test" ? stripeKey : Deno.env.get("STRIPE_TEST_SECRET_KEY") ?? "";
const testEndpointSecret = stripeMode === "test"
  ? endpointSecret
  : (Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET") ?? "").trim();
const STRIPE_API_VERSION = "2026-03-25.dahlia";

console.log(`[INIT] SUPABASE_URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'}`);
console.log(`[INIT] SUPABASE_KEY configured: ${Boolean(supabaseKey)}`);
console.log(`[INIT] STRIPE_KEY configured: ${Boolean(stripeKey)}`);
console.log(`[INIT] WEBHOOK_SECRET configured: ${Boolean(endpointSecret)}`);
console.log(`[INIT] STRIPE_MODE: ${stripeMode}`);
console.log(`[INIT] STRIPE_API_VERSION: ${STRIPE_API_VERSION}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const stripe = new Stripe(stripeKey, {
  apiVersion: STRIPE_API_VERSION,
});
const stripeCryptoProvider = Stripe.createSubtleCryptoProvider();
const testStripe = testStripeKey
  ? new Stripe(testStripeKey, { apiVersion: STRIPE_API_VERSION })
  : null;

const STRIPE_PREMIUM_PRICE_ID = stripeMode === "test"
  ? Deno.env.get("STRIPE_PREMIUM_PRICE_ID") ?? ""
  : Deno.env.get("STRIPE_PREMIUM_PRICE_ID")
    || Deno.env.get("VITE_STRIPE_PREMIUM_PRICE_ID")
    || "price_1TM9r1JSf7SJ8WWRiocez8wo";
const STRIPE_FAMILY_PRICE_ID = stripeMode === "test"
  ? Deno.env.get("STRIPE_FAMILY_PRICE_ID") ?? ""
  : Deno.env.get("STRIPE_FAMILY_PRICE_ID")
    || Deno.env.get("VITE_STRIPE_FAMILY_PRICE_ID")
    || "price_1TM9sSJSf7SJ8WWR4H26rSZ9";
const STRIPE_TEST_PREMIUM_PRICE_ID = Deno.env.get("STRIPE_TEST_PREMIUM_PRICE_ID") ?? "";
const STRIPE_TEST_FAMILY_PRICE_ID = Deno.env.get("STRIPE_TEST_FAMILY_PRICE_ID") ?? "";

console.log(`[INIT] STRIPE_PREMIUM_PRICE_ID: ${STRIPE_PREMIUM_PRICE_ID ? STRIPE_PREMIUM_PRICE_ID.substring(0, 12) + '...' : 'MISSING'}`);
console.log(`[INIT] STRIPE_FAMILY_PRICE_ID: ${STRIPE_FAMILY_PRICE_ID ? STRIPE_FAMILY_PRICE_ID.substring(0, 12) + '...' : 'MISSING'}`);

const PRICE_ID_TO_PLAN_TYPE: Record<string, 'free' | 'premium' | 'family'> = {
  [STRIPE_PREMIUM_PRICE_ID]: 'premium',
  [STRIPE_FAMILY_PRICE_ID]: 'family',
  ...(STRIPE_TEST_PREMIUM_PRICE_ID ? { [STRIPE_TEST_PREMIUM_PRICE_ID]: 'premium' as const } : {}),
  ...(STRIPE_TEST_FAMILY_PRICE_ID ? { [STRIPE_TEST_FAMILY_PRICE_ID]: 'family' as const } : {}),
};

function getPriceIdFromSubscription(subscription: Stripe.Subscription | any): string | undefined {
  if (!subscription?.items?.data?.length) {
    return undefined;
  }

  const items = subscription.items.data as any[];
  const recurringItems = items.filter(
    (item: any) =>
      item?.price?.type === 'recurring' &&
      item?.quantity > 0 &&
      item?.deleted !== true
  );

  const item =
    recurringItems[0] ||
    items.find((item: any) => item?.price?.type === 'recurring') ||
    items[0];

  return item?.price?.id;
}

function getPlanTypeFromSubscription(subscription: Stripe.Subscription | any): 'free' | 'premium' | 'family' {
  try {
    const priceId = getPriceIdFromSubscription(subscription);
    if (priceId && PRICE_ID_TO_PLAN_TYPE[priceId]) {
      return PRICE_ID_TO_PLAN_TYPE[priceId];
    }

    const item = subscription.items?.data?.[0];
    const price = item?.price;
    if (price?.metadata?.plan_type) {
      return price.metadata.plan_type as 'free' | 'premium' | 'family';
    }
  } catch (err) {
    console.error('[Webhook] Error inferring plan type from subscription:', err);
  }

  return 'premium';
}

// Small helper: try to retrieve Stripe subscription, return null when not found
async function retrieveSubscriptionSafe(id: string | null | undefined) {
  if (!id) return null;
  try {
    return await stripe.subscriptions.retrieve(id as string);
  } catch (err: any) {
    // Handle the common "No such subscription"/resource_missing case gracefully
    const msg = err?.message || err;
    if (msg && (msg.includes("No such subscription") || msg.includes("resource_missing") || err?.statusCode === 404)) {
      console.warn(`Stripe subscription not found: ${id}`);
      return null;
    }
    throw err;
  }
}

Deno.serve(async (req) => {
  // Webhooks don't require authentication; bypass Supabase auth checks
  // by returning early if this is a Stripe webhook
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const headers = req.headers;
  const stripeSignature = headers.get("stripe-signature");
  const stripeVersionHeader = headers.get("stripe-version") || headers.get("Stripe-Version") || "missing";
  console.log(`[Webhook] Stripe-Version header: ${stripeVersionHeader}`);
  console.log(`[Webhook] Using Stripe API version: ${STRIPE_API_VERSION}`);
  
  // If there's no Stripe signature, this isn't a webhook - might be auth issue
  if (!stripeSignature) {
    // For webhooks, we expect stripe-signature. If missing, return 401 for now
    // (Supabase auth middleware will handle actual auth_required for other endpoints)
    return new Response("No signature", { status: 400 });
  }

  // At this point it's a Stripe webhook - run webhooks logic
  try {
    const body = await req.text();
    const sig = stripeSignature;

    let event: Stripe.Event;
    let signatureVerified = false;
    let testModeEvent = false;

    try {
      const allowInsecure = Deno.env.get("ALLOW_INSECURE_WEBHOOK") === "1";
      if (stripeMode === "test") {
        event = await stripe.webhooks.constructEventAsync(
          body,
          sig,
          endpointSecret,
          undefined,
          stripeCryptoProvider,
        );
        if (event.livemode) throw new Error("Live events are disabled while STRIPE_MODE is set to test.");
        testModeEvent = true;
        signatureVerified = true;
      } else if (allowInsecure) {
        event = JSON.parse(body) as Stripe.Event;
        testModeEvent = event.livemode === false;
      } else {
        try {
          event = await stripe.webhooks.constructEventAsync(
            body,
            sig,
            endpointSecret,
            undefined,
            stripeCryptoProvider,
          );
          if (!event.livemode) throw new Error("Live signing secret cannot verify a test-mode event.");
        } catch (liveError) {
          if (!testEndpointSecret) throw liveError;
          event = await stripe.webhooks.constructEventAsync(
            body,
            sig,
            testEndpointSecret,
            undefined,
            stripeCryptoProvider,
          );
          if (event.livemode) throw new Error("Test signing secret cannot verify a live-mode event.");
          testModeEvent = true;
        }
        signatureVerified = true;
      }
    } catch (err) {
      console.error("Webhook signature verification failed.", err);
      const message = err instanceof Error ? err.message : "Unknown signature verification error";
      return new Response(
        stripeMode === "test"
          ? `Webhook signature verification failed: ${message}`
          : "Webhook signature verification failed",
        { status: 400 },
      );
    }

    if (testModeEvent) {
      if (!signatureVerified) {
        return new Response("Test webhooks require a verified Stripe signature", { status: 400 });
      }
      if (!testStripe) {
        return new Response("Stripe Test API key is not configured", { status: 500 });
      }
      switch (getAffiliateTestWebhookAction(event.type)) {
        case "paid-invoice":
          await handleAffiliatePaidInvoice(event.data.object as Stripe.Invoice, testStripe, testStripeKey);
          break;
        case "payment-risk":
          await handleAffiliatePaymentRiskEvent(event, event.type, testStripe);
          break;
        default:
          console.log(`Ignoring test-mode event ${event.type}; only affiliate events are processed.`);
      }
      return new Response(JSON.stringify({ received: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        if (signatureVerified) {
          await handleAffiliatePaidInvoice(event.data.object as Stripe.Invoice);
        }
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "invoice.finalized":
        await handleInvoiceFinalized(event.data.object as Stripe.Invoice);
        break;

      case "customer.subscription.updated":
      case "customer.subscription.created":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "customer.subscription.trial_will_end":
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      case "charge.refunded":
        if (signatureVerified) await handleAffiliatePaymentRiskEvent(event, "charge.refunded");
        break;

      case "charge.dispute.created":
      case "charge.dispute.closed":
        if (signatureVerified) await handleAffiliatePaymentRiskEvent(event, event.type);
        break;

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Webhook error:", errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  let userId = session.metadata?.user_id;
  const customerId = session.customer as string | undefined;

  if (!userId && customerId) {
    const { data: existing } = await supabase
      .from("user_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (existing?.user_id) {
      userId = existing.user_id;
      console.log(`[Webhook] Resolved user_id from existing subscription row: ${userId}`);
    }
  }

  if (!userId && customerId) {
    try {
      const customer = await stripe.customers.retrieve(customerId) as any;
      userId = customer?.metadata?.user_id;
      if (userId) {
        console.log(`[Webhook] Resolved user_id from Stripe customer metadata: ${userId}`);
      }
    } catch (err) {
      console.warn('[Webhook] Failed to resolve Stripe customer for checkout completion:', err);
    }
  }

  if (!userId) {
    console.error("No user_id in checkout session metadata and unable to resolve from customer");
    return;
  }

  try {
    const subscription = await retrieveSubscriptionSafe(session.subscription as string | undefined);

    // Support dry-run test mode: when DRY_RUN_WEBHOOK=1 we log intended DB actions instead of calling Supabase
    const dryRun = Deno.env.get("DRY_RUN_WEBHOOK") === "1";

    if (!subscription) {
      const payload = {
        user_id: userId,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription ?? null,
        status: "unknown",
        updated_at: new Date().toISOString(),
      };
      if (dryRun) {
        console.log("[dry-run] upsert user_subscriptions:", payload);
      } else {
        const { error } = await supabase.from("user_subscriptions").upsert(payload, { onConflict: "stripe_customer_id" });
        if (error) console.error("Error upserting user_subscriptions on checkout (missing subscription):", error);
      }
      console.log(`Checkout completed for user ${userId} but subscription not retrievable: ${session.subscription}`);
      return;
    }

    const planType = getPlanTypeFromSubscription(subscription);
    const upsertPayload = {
      user_id: userId,
      stripe_customer_id: session.customer,
      stripe_subscription_id: session.subscription,
      stripe_price_id: getPriceIdFromSubscription(subscription) ?? null,
      plan_type: planType,
      status: subscription.status,
      current_period_start: new Date((subscription.current_period_start as number) * 1000),
      current_period_end: new Date((subscription.current_period_end as number) * 1000),
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    };

    if (dryRun) {
      console.log("[dry-run] upsert user_subscriptions:", upsertPayload);
    } else {
      const { data: existingRows, error: lookupError } = await supabase
        .from('user_subscriptions')
        .select('id')
        .eq('user_id', userId);

      if (lookupError) {
        console.error("Error querying existing user_subscriptions rows:", JSON.stringify(lookupError));
      }

      if (existingRows?.length) {
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update(upsertPayload)
          .eq('user_id', userId);

        if (updateError) {
          console.error("Error updating user_subscriptions on checkout:", JSON.stringify(updateError));
          throw new Error(`Supabase update failed: ${updateError.message}`);
        } else {
          console.log(`Subscription updated for user ${userId}: ${subscription.id}`);
        }
      } else {
        const { error: insertError } = await supabase.from('user_subscriptions').insert(upsertPayload);
        if (insertError) {
          console.error("Error inserting user_subscriptions on checkout:", JSON.stringify(insertError));
          throw new Error(`Supabase insert failed: ${insertError.message}`);
        } else {
          console.log(`Subscription created for user ${userId}: ${subscription.id}`);
        }
      }
    }
  } catch (error) {
    console.error("Error in handleCheckoutCompleted:", error);
  }
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    try {
      const subscription = await retrieveSubscriptionSafe(invoice.subscription as string);
      if (!subscription) {
        console.warn(`Payment succeeded but subscription ${invoice.subscription} not retrievable`);
        return;
      }

      const planType = getPlanTypeFromSubscription(subscription);
      const priceId = getPriceIdFromSubscription(subscription) ?? null;
      const updatePayload: any = {
        status: subscription.status,
        plan_type: planType,
        current_period_start: new Date((subscription.current_period_start as number) * 1000),
        current_period_end: new Date((subscription.current_period_end as number) * 1000),
        updated_at: new Date().toISOString(),
      };
      if (priceId) {
        updatePayload.stripe_price_id = priceId;
      }
      const { error } = await supabase
        .from("user_subscriptions")
        .update(updatePayload)
        .eq("stripe_subscription_id", invoice.subscription);

      if (error) {
        console.error("Error updating subscription on payment success:", error);
      } else {
        console.log(`Payment succeeded for subscription: ${invoice.subscription}`);
      }
    } catch (error) {
      console.error("Error in handlePaymentSucceeded:", error);
    }
  }
}

async function handleAffiliatePaidInvoice(
  invoice: Stripe.Invoice,
  stripeClient: Stripe = stripe,
  stripeApiKey: string = stripeKey,
) {
  const invoiceData = invoice as any;
  const subscriptionReference = invoice.subscription || invoiceData.parent?.subscription_details?.subscription;
  const subscriptionId = typeof subscriptionReference === "string"
    ? subscriptionReference
    : subscriptionReference?.id;
  if (invoice.status !== "paid" || !subscriptionId || !Number.isSafeInteger(invoice.amount_paid) || invoice.amount_paid <= 0) {
    return;
  }

  const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
  const priceId = getPriceIdFromSubscription(subscription);
  const planType = priceId ? PRICE_ID_TO_PLAN_TYPE[priceId] : undefined;
  if (planType !== "premium" && planType !== "family") return;

  const customerId = typeof invoice.customer === "string"
    ? invoice.customer
    : (invoice.customer as any)?.id;
  let userId = subscription.metadata?.user_id || invoice.metadata?.user_id;
  if (!userId && customerId) {
    const { data, error } = await supabase.from("user_subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (error) throw new Error(`Could not resolve affiliate customer: ${error.message}`);
    userId = data?.user_id;
  }
  if (!userId) return;

  const attributionId = subscription.metadata?.affiliate_attribution_id;
  if (!attributionId) return;

  const { data: attribution, error: attributionError } = await supabase.from("affiliate_attributions")
    .select("id,affiliate_id")
    .eq("id", attributionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (attributionError) throw new Error(`Could not validate affiliate metadata: ${attributionError.message}`);
  if (!attribution || attribution.affiliate_id !== subscription.metadata?.affiliate_id) return;

  const invoiceReferences = getInvoicePaymentReferences(invoiceData);
  const { chargeId, paymentIntentId } = invoiceReferences.chargeId && invoiceReferences.paymentIntentId
    ? invoiceReferences
    : await getInvoicePaymentReferencesFromStripe(invoiceData, stripeApiKey);
  const paidAtSeconds = invoiceData.status_transitions?.paid_at || invoice.created;
  const { error } = await supabase.rpc("affiliate_record_successful_payment", {
    p_user_id: userId,
    p_invoice_id: invoice.id,
    p_subscription_id: subscriptionId,
    p_charge_id: chargeId,
    p_payment_intent_id: paymentIntentId,
    p_plan_type: planType,
    p_amount_paid_cents: invoice.amount_paid,
    p_currency: invoice.currency.toLowerCase(),
    p_paid_at: new Date(paidAtSeconds * 1000).toISOString(),
  });
  if (error) throw new Error(`Affiliate commission processing failed: ${error.message}`);
}

async function getInvoicePaymentReferencesFromStripe(
  invoice: Stripe.Invoice,
  stripeApiKey: string,
) {
  const url = new URL("https://api.stripe.com/v1/invoice_payments");
  url.searchParams.set("invoice", invoice.id);
  url.searchParams.set("status", "paid");
  url.searchParams.set("limit", "100");
  url.searchParams.append("expand[]", "data.payment.payment_intent.latest_charge");

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${stripeApiKey}` },
  });
  if (!response.ok) {
    throw new Error(`Could not retrieve Stripe invoice payments (HTTP ${response.status}).`);
  }

  const paymentList = await response.json();
  if (!Array.isArray(paymentList?.data)) {
    throw new Error("Stripe invoice payment response did not include a data array.");
  }

  return getInvoicePaymentReferences(invoice as any, paymentList.data);
}

async function handleAffiliatePaymentRiskEvent(
  event: Stripe.Event,
  eventType: string,
  stripeClient: Stripe = stripe,
) {
  const paymentEvent = event.data.object as any;
  const isDispute = eventType.startsWith("charge.dispute.");
  const chargeId = isDispute
    ? (typeof paymentEvent.charge === "string" ? paymentEvent.charge : paymentEvent.charge?.id)
    : paymentEvent.id;
  let charge: any = isDispute ? null : paymentEvent;
  if (isDispute && chargeId) {
    charge = await stripeClient.charges.retrieve(chargeId);
  }

  const rawInvoice = charge?.invoice;
  const rawPaymentIntent = charge?.payment_intent || paymentEvent?.payment_intent;
  const invoiceId = typeof rawInvoice === "string" ? rawInvoice : rawInvoice?.id ?? null;
  const paymentIntentId = typeof rawPaymentIntent === "string" ? rawPaymentIntent : rawPaymentIntent?.id ?? null;
  const outcome = eventType === "charge.dispute.closed" ? String(paymentEvent.status || "") : null;
  const reason = eventType === "charge.refunded"
    ? `Stripe reported a refund (${paymentEvent.amount_refunded ?? 0} of ${paymentEvent.amount ?? 0} ${paymentEvent.currency ?? ""}); the affiliate policy reverses the full commission on any refund.`
    : `Stripe reported a dispute${outcome ? ` (${outcome})` : ""}.`;

  const { error } = await supabase.rpc("affiliate_handle_payment_risk_event", {
    p_stripe_event_id: event.id,
    p_event_type: eventType,
    p_invoice_id: invoiceId,
    p_charge_id: chargeId ?? null,
    p_payment_intent_id: paymentIntentId,
    p_dispute_outcome: outcome,
    p_reason: reason,
    p_stripe_created_at: new Date(event.created * 1000).toISOString(),
  });
  if (error) throw new Error(`Affiliate payment risk processing failed: ${error.message}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (invoice.subscription) {
    try {
      const { error } = await supabase
        .from("user_subscriptions")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", invoice.subscription);

      if (error) {
        console.error("Error updating subscription on payment failure:", error);
      } else {
        console.log(`Payment failed for subscription: ${invoice.subscription}`);
      }
    } catch (error) {
      console.error("Error in handlePaymentFailed:", error);
    }
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const planType = getPlanTypeFromSubscription(subscription);
    const priceId = getPriceIdFromSubscription(subscription) ?? null;
    const updatePayload: any = {
      status: subscription.status,
      plan_type: planType,
      current_period_start: new Date((subscription.current_period_start as number) * 1000),
      current_period_end: new Date((subscription.current_period_end as number) * 1000),
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    };
    if (priceId) {
      updatePayload.stripe_price_id = priceId;
    }
    const { error } = await supabase
      .from("user_subscriptions")
      .update(updatePayload)
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Error updating subscription:", error);
    } else {
      console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}, cancel_at_period_end: ${subscription.cancel_at_period_end}`);
    }
  } catch (error) {
    console.error("Error in handleSubscriptionUpdated:", error);
  }
}

async function handleInvoiceFinalized(invoice: Stripe.Invoice) {
  // Invoice finalized - Stripe prepared charges
  console.log(`Invoice finalized: ${invoice.id}`);
}

async function handleTrialWillEnd(subscription: Stripe.Subscription) {
  // Trial will end soon - could send reminder email if needed
  console.log(`Trial ending soon for subscription: ${subscription.id}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const { error } = await supabase
      .from("user_subscriptions")
      .update({
        status: "canceled",
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", subscription.id);

    if (error) {
      console.error("Error deleting subscription:", error);
    } else {
      console.log(`Subscription deleted: ${subscription.id}`);
    }
  } catch (error) {
    console.error("Error in handleSubscriptionDeleted:", error);
  }
}