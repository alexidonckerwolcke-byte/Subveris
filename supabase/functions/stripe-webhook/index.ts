// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

// Debug: log environment at initialization
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET") ?? "";
const STRIPE_API_VERSION = "2026-03-25.dahlia";

console.log(`[INIT] SUPABASE_URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'MISSING'}`);
console.log(`[INIT] SUPABASE_KEY: ${supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`[INIT] STRIPE_KEY: ${stripeKey ? stripeKey.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`[INIT] WEBHOOK_SECRET: ${endpointSecret ? endpointSecret.substring(0, 10) + '...' : 'MISSING'}`);
console.log(`[INIT] STRIPE_API_VERSION: ${STRIPE_API_VERSION}`);

const supabase = createClient(supabaseUrl, supabaseKey);

const stripe = new Stripe(stripeKey, {
  apiVersion: STRIPE_API_VERSION,
});

const PRICE_ID_TO_PLAN_TYPE: Record<string, 'free' | 'premium' | 'family'> = {
  [Deno.env.get('VITE_STRIPE_PREMIUM_PRICE_ID') || 'price_1T3jhIJpTYwzr88x8pGboTSU']: 'premium',
  [Deno.env.get('VITE_STRIPE_FAMILY_PRICE_ID') || 'price_1T3jikJpTYwzr88xIxkKHkKu']: 'family',
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

      try {
        // Test mode: allow skipping signature verification when ALLOW_INSECURE_WEBHOOK=1
        const allowInsecure = Deno.env.get("ALLOW_INSECURE_WEBHOOK") === "1";
        if (allowInsecure) {
          // Parse raw body as event in test mode
          event = JSON.parse(body) as Stripe.Event;
        } else {
          event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
        }
      } catch (err) {
        console.error("Webhook signature verification failed.", err);
        return new Response("Webhook signature verification failed", { status: 400 });
      }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "invoice.payment_succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
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
      .single();

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