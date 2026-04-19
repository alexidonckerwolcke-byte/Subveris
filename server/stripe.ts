import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const DEFAULT_STRIPE_API_VERSION = '2026-03-25.dahlia';
const configuredStripeApiVersion = process.env.STRIPE_API_VERSION?.trim();
export const STRIPE_API_VERSION = configuredStripeApiVersion || DEFAULT_STRIPE_API_VERSION;

export function createStripeClient(apiKey: string) {
  try {
    return new Stripe(apiKey, {
      apiVersion: STRIPE_API_VERSION as any,
    });
  } catch (error) {
    console.warn(
      `[Stripe] Failed to initialize Stripe with apiVersion=${STRIPE_API_VERSION}. Falling back to ${DEFAULT_STRIPE_API_VERSION}`,
      error
    );

    if (STRIPE_API_VERSION !== DEFAULT_STRIPE_API_VERSION) {
      return new Stripe(apiKey, {
        apiVersion: DEFAULT_STRIPE_API_VERSION as any,
      });
    }

    throw error;
  }
}

export const stripe = createStripeClient(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
// Map Stripe price IDs to plan types
// These should match your actual Stripe price IDs from your dashboard
const premiumPriceId = process.env.STRIPE_PREMIUM_PRICE_ID || process.env.VITE_STRIPE_PREMIUM_PRICE_ID || 'price_1T3jhIJpTYwzr88x8pGboTSU';
const familyPriceId = process.env.STRIPE_FAMILY_PRICE_ID || process.env.VITE_STRIPE_FAMILY_PRICE_ID || 'price_1T3jikJpTYwzr88xIxkKHkKu';

export const PRICE_ID_TO_PLAN_TYPE: Record<string, 'free' | 'premium' | 'family'> = {
  [premiumPriceId]: 'premium',
  [familyPriceId]: 'family',
};

// Helper to determine plan type from price or subscription
export function getPriceIdFromSubscription(subscription: any): string | undefined {
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

export function getPlanTypeFromSubscription(subscription: any): 'free' | 'premium' | 'family' {
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
  } catch (e) {
    console.error('[Stripe] Error inferring plan type from subscription:', e);
  }

  return 'premium';
}

export function doesSubscriptionIncludePriceId(subscription: any, priceId: string): boolean {
  if (!subscription?.items?.data?.length) {
    return false;
  }

  return subscription.items.data.some(
    (item: any) =>
      item?.price?.id === priceId &&
      item?.price?.type === 'recurring' &&
      item?.quantity > 0 &&
      item?.deleted !== true
  );
}

export class StripeService {
  static async createCustomer(userId: string, email: string, name?: string) {
    try {
      // Check if customer already exists in our database
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      let customerId = existingSub?.stripe_customer_id;
      if (customerId) {
        try {
          // Verify the stored Stripe customer still exists
          await stripe.customers.retrieve(customerId);
          return customerId;
        } catch (err: any) {
          const msg = err?.message || String(err);
          const isMissing = msg.includes('No such customer') || err?.statusCode === 404;
          if (!isMissing) {
            console.error('[StripeService] Error verifying existing customer:', err);
            throw err;
          }

          console.warn('[StripeService] Stored Stripe customer not found, creating a new one:', customerId);
          customerId = undefined;
        }
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          user_id: userId,
        },
      });

      // Get existing subscription row by user_id to preserve plan_type
      const { data: existingRows } = await supabase
        .from('user_subscriptions')
        .select('id, plan_type')
        .eq('user_id', userId);

      const planType = existingRows?.[0]?.plan_type || 'free';
      if (existingRows?.length) {
        await supabase
          .from('user_subscriptions')
          .update({
            stripe_customer_id: customer.id,
            status: 'inactive',
            plan_type: planType,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      } else {
        await supabase.from('user_subscriptions').insert({
          user_id: userId,
          stripe_customer_id: customer.id,
          status: 'inactive',
          plan_type: planType,
          updated_at: new Date().toISOString(),
        });
      }

      return customer.id;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  static async createSubscriptionCheckoutSession(
    userId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string
  ) {
    try {
      console.log('[StripeService] Creating checkout session...');
      console.log('[StripeService] User ID:', userId);
      console.log('[StripeService] Price ID:', priceId);
      
      // Check if Stripe is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        throw new Error('STRIPE_SECRET_KEY is not configured');
      }
      console.log('[StripeService] Stripe API configured: ✓');

      // Get or create customer
      console.log('[StripeService] Fetching user from Supabase...');
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      if (!userData.user) {
        throw new Error('User not found in Supabase');
      }
      console.log('[StripeService] User found:', userData.user.email);

      console.log('[StripeService] Creating/Finding Stripe customer...');
      const customerId = await this.createCustomer(
        userId,
        userData.user.email!,
        userData.user.user_metadata?.name
      );
      console.log('[StripeService] Customer ID:', customerId);

      console.log('[StripeService] Looking for existing Stripe subscription for user...');
      const { data: existingSubscriptionRow } = await supabase
        .from('user_subscriptions')
        .select('stripe_subscription_id, stripe_price_id, status, cancel_at_period_end')
        .eq('user_id', userId)
        .single();

      const existingStripeSubscriptionId = existingSubscriptionRow?.stripe_subscription_id;
      if (existingStripeSubscriptionId) {
        try {
          const currentSubscription = await stripe.subscriptions.retrieve(existingStripeSubscriptionId, {
            expand: ['items.data.price'],
          }) as any;

          const recurringPriceIds = currentSubscription.items?.data
            ?.filter(
              (item: any) =>
                item?.price?.type === 'recurring' &&
                item?.quantity > 0 &&
                item?.deleted !== true
            )
            .map((item: any) => item.price.id) ?? [];
          const hasRequestedPrice = recurringPriceIds.includes(priceId);
          const isOnlyRequestedPrice = hasRequestedPrice && new Set(recurringPriceIds).size === 1;
          const currentPriceId = getPriceIdFromSubscription(currentSubscription);
          const isActive = ['active', 'trialing'].includes(currentSubscription.status);

          if (isActive && isOnlyRequestedPrice) {
            console.log('[StripeService] User already on requested plan. No checkout needed.');
            return { success: true, message: 'Already on requested plan' };
          }

          if (isActive && hasRequestedPrice && recurringPriceIds.length > 1) {
            console.log('[StripeService] Subscription contains requested price plus other active recurring prices. Redirecting to checkout to preserve standard upgrade flow.', recurringPriceIds);
          } else if (isActive && currentPriceId && currentPriceId !== priceId) {
            console.log('[StripeService] Active Stripe subscription found with a different price. Redirecting to checkout to preserve standard upgrade flow.');
          }
        } catch (updateErr) {
          console.error('[StripeService] Failed to inspect existing subscription, falling back to checkout:', updateErr);
        }
      }

      // Create checkout session
      console.log('[StripeService] Creating Stripe checkout session...');
      const successUrlWithCheckout = successUrl.includes('checkout=success')
        ? successUrl
        : `${successUrl}${successUrl.includes('?') ? '&' : '?'}checkout=success`;
      const cancelUrlWithCheckout = cancelUrl.includes('checkout=cancel')
        ? cancelUrl
        : `${cancelUrl}${cancelUrl.includes('?') ? '&' : '?'}checkout=cancel`;
      const successUrlWithSessionId = `${successUrlWithCheckout}${successUrlWithCheckout.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrlWithSessionId,
        cancel_url: cancelUrlWithCheckout,
        metadata: {
          user_id: userId,
        },
        subscription_data: {
          metadata: {
            user_id: userId,
          },
        },
      });

      console.log('[StripeService] Checkout session created successfully:', session.id);
      console.log('[StripeService] Session URL:', session.url);
      if (!session.url) {
        console.error('[StripeService] Stripe checkout session created without a redirect URL:', session);
        throw new Error('Stripe checkout session could not be created. No redirect URL was returned.');
      }
      return session;
    } catch (error) {
      console.error('[StripeService] Error creating checkout session:', error);
      if (error instanceof Error) {
        console.error('[StripeService] Error message:', error.message);
        console.error('[StripeService] Error stack:', error.stack);
      }
      throw error;
    }
  }

  static async cancelSubscription(userId: string) {
    try {
      const { data: subscription, error: queryError } = await supabase
        .from('user_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .single();

      // If no subscription row exists, treat as already free
      if (queryError && queryError.code === 'PGRST116') {
        console.log('[Stripe] No subscription row found for user; already free');
        return { success: true, alreadyFree: true };
      }

      if (!subscription?.stripe_subscription_id) {
        console.log('[Stripe] User has no Stripe subscription_id; already free or already canceled');
        return { success: true, alreadyCanceled: true };
      }

      // Cancel at period end in Stripe. If Stripe says the subscription
      // doesn't exist (e.g. stale local record), clean up the local DB
      // instead of bubbling a 500 to the client.
      try {
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true,
        });

        // Update database
        await supabase
          .from('user_subscriptions')
          .update({
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);

        console.log('[Stripe] Subscription marked cancel_at_period_end for user:', userId);
        return { success: true };
      } catch (stripeErr: any) {
        console.error('Error canceling subscription:', stripeErr);

        const missing =
          stripeErr?.code === 'resource_missing' || stripeErr?.raw?.code === 'resource_missing';

        if (missing) {
          console.warn('[Stripe] Subscription not found in Stripe; cleaning local record for user:', userId);
          await supabase
            .from('user_subscriptions')
            .update({
              status: 'canceled',
              plan_type: 'free',
              stripe_subscription_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);

          return { success: true, cleaned: true };
        }

        throw stripeErr;
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  }

  static async reactivateSubscription(userId: string) {
    try {
      const { data: subscription, error: queryError } = await supabase
        .from('user_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .single();

      if (queryError && queryError.code === 'PGRST116') {
        throw new Error('No subscription to reactivate');
      }

      if (!subscription?.stripe_subscription_id) {
        throw new Error('No subscription to reactivate');
      }

      // Remove cancellation
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      // Update database
      await supabase
        .from('user_subscriptions')
        .update({
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      return { success: true };
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  static async getSubscriptionStatus(userId: string) {
    try {
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!subscription) {
        return { status: 'inactive', tier: 'free' };
      }

      const isActive = subscription.status === 'active' && !subscription.cancel_at_period_end;
      return {
        status: subscription.status,
        tier: isActive ? 'premium' : 'free',
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      };
    } catch (error) {
      console.error('Error getting subscription status:', error);
      return { status: 'inactive', tier: 'free' };
    }
  }

  static async completeCheckoutSession(sessionId: string) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (!session || !session.subscription) {
        throw new Error('Checkout session did not complete a subscription');
      }

      await this.handleCheckoutCompleted(session as any);
      return { success: true };
    } catch (error) {
      console.error('[StripeService] Error completing checkout session:', error);
      throw error;
    }
  }

  static async handleWebhook(rawBody: string | Buffer, signature: string) {
    try {
      // Ensure rawBody is a string for constructEvent
      const bodyString = typeof rawBody === 'string' ? rawBody : rawBody.toString();
      
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
      }

      const event = stripe.webhooks.constructEvent(
        bodyString,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      console.log(`[Stripe] Processing webhook event: ${event.type}`);

      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutCompleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          await this.handlePaymentSucceeded(event.data.object);
          break;
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object);
          break;
        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object);
          break;
        default:
          console.log(`[Stripe] Unhandled event type: ${event.type}`);
      }

      console.log(`[Stripe] Webhook processed successfully: ${event.id}`);
      return { received: true };
    } catch (error) {
      console.error('[Stripe] Webhook error:', error);
      throw error;
    }
  }

  private static async handleCheckoutCompleted(session: any) {
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    let userId = session.metadata?.user_id as string | undefined;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;

    console.log(`[Stripe] Checkout completed - User: ${userId}, Customer: ${customerId}, Subscription: ${subscriptionId}`);

    if (!subscriptionId) {
      console.warn(`[Stripe] Checkout session completed without subscription id: ${session.id}`);
      return;
    }

    if (!userId && customerId) {
      const { data: existingCustomer } = await supabase
        .from('user_subscriptions')
        .select('user_id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (existingCustomer?.user_id) {
        userId = existingCustomer.user_id;
        console.log(`[Stripe] Resolved user_id from existing subscription row: ${userId}`);
      }
    }

    if (!userId && customerId) {
      try {
        const customer = await stripe.customers.retrieve(customerId) as any;
        if (customer?.metadata?.user_id) {
          userId = customer.metadata.user_id;
          console.log(`[Stripe] Resolved user_id from Stripe customer metadata: ${userId}`);
        }
      } catch (err) {
        console.warn('[Stripe] Failed to resolve Stripe customer for checkout completion:', err);
      }
    }

    if (!userId) {
      console.warn(`[Stripe] Unable to resolve user_id for checkout session ${session.id}. Skipping DB update.`);
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;
    const priceId = getPriceIdFromSubscription(subscription);
    const planType = (priceId && PRICE_ID_TO_PLAN_TYPE[priceId]) || getPlanTypeFromSubscription(subscription);

    const upsertPayload: any = {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId ?? null,
      status: subscription.status,
      plan_type: planType,
      current_period_start: subscription.current_period_start ? new Date(subscription.current_period_start * 1000) : null,
      current_period_end: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null,
      cancel_at_period_end: !!subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    };

    const { data: existingRows, error: lookupError } = await supabase
      .from('user_subscriptions')
      .select('id')
      .eq('user_id', userId);

    if (lookupError) {
      console.error('[Stripe] Error querying existing subscription rows:', lookupError);
    }

    if (existingRows?.length) {
      const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update(upsertPayload)
        .eq('user_id', userId);

      if (updateError) {
        console.error('[Stripe] Error updating subscription on checkout completed:', updateError);
      } else {
        console.log(`[Stripe] Subscription updated in DB for user ${userId}`);
      }
    } else {
      const { error: insertError } = await supabase
        .from('user_subscriptions')
        .insert(upsertPayload);

      if (insertError) {
        console.error('[Stripe] Error inserting subscription on checkout completed:', insertError);
      } else {
        console.log(`[Stripe] Subscription created in DB for user ${userId}`);
      }
    }
  }

  private static async handlePaymentSucceeded(invoice: any) {
    // Update subscription status if needed
    if (invoice.subscription) {
      console.log(`[Stripe] Payment succeeded - Subscription: ${invoice.subscription}`);
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription) as any;
      
      // Get existing subscription info
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('plan_type, stripe_price_id')
        .eq('stripe_subscription_id', invoice.subscription)
        .single();
      
      // Determine plan type from the subscription (may have changed)
      const newPlanType = getPlanTypeFromSubscription(subscription);
      const oldPlanType = existing?.plan_type || 'premium';
      
      if (newPlanType !== oldPlanType) {
        console.log(`[Stripe] Plan change detected in payment: ${oldPlanType} → ${newPlanType}`);
      }
      
      await supabase
        .from('user_subscriptions')
        .update({
          status: subscription.status,
          plan_type: newPlanType,
          stripe_price_id: getPriceIdFromSubscription(subscription) ?? null,
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', invoice.subscription);
      console.log(`[Stripe] Updated subscription status to ${subscription.status} with plan_type: ${newPlanType}`);
    }
  }

  private static async handlePaymentFailed(invoice: any) {
    // Mark subscription as past due
    if (invoice.subscription) {
      console.log(`[Stripe] Payment failed - Subscription: ${invoice.subscription}`);
      
      // Get existing subscription to preserve plan_type
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('plan_type')
        .eq('stripe_subscription_id', invoice.subscription)
        .single();
      
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'past_due',
          plan_type: existing?.plan_type || 'premium', // Preserve existing plan_type
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', invoice.subscription);
      console.log(`[Stripe] Updated subscription to past_due`);
    }
  }

  private static async handleSubscriptionUpdated(subscription: any) {
    console.log(`[Stripe] Subscription updated - ID: ${subscription.id}, Status: ${subscription.status}`);
    
    // Get existing subscription info
    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('plan_type, stripe_price_id')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    // Determine the new plan type from the subscription
    const newPlanType = getPlanTypeFromSubscription(subscription);
    const oldPlanType = existing?.plan_type || 'premium';
    
    // Log if plan type is changing (downgrade/upgrade)
    if (newPlanType !== oldPlanType) {
      console.log(`[Stripe] Plan change detected for subscription ${subscription.id}: ${oldPlanType} → ${newPlanType}`);
    }
    
    // Update subscription with new plan type if it changed
    await supabase
      .from('user_subscriptions')
      .update({
        status: subscription.status,
        plan_type: newPlanType,
        stripe_price_id: getPriceIdFromSubscription(subscription) ?? null,
        current_period_start: new Date(subscription.current_period_start * 1000),
        current_period_end: new Date(subscription.current_period_end * 1000),
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
    console.log(`[Stripe] Subscription updated in DB with plan_type: ${newPlanType}`);
  }

  private static async handleSubscriptionDeleted(subscription: any) {
    console.log(`[Stripe] Subscription deleted - ID: ${subscription.id}`);
    
    // Get existing subscription to preserve plan_type
    const { data: existing } = await supabase
      .from('user_subscriptions')
      .select('plan_type')
      .eq('stripe_subscription_id', subscription.id)
      .single();
    
    await supabase
      .from('user_subscriptions')
      .update({
        status: 'canceled',
        plan_type: existing?.plan_type || 'premium', // Preserve existing plan_type
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id);
    console.log(`[Stripe] Subscription marked as canceled`);
  }
}