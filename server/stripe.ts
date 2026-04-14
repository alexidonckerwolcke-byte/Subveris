import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
// Map Stripe price IDs to plan types
// These should match your actual Stripe price IDs from your dashboard
const PRICE_ID_TO_PLAN_TYPE: Record<string, 'free' | 'premium' | 'family'> = {
  'price_1T3jhIJpTYwzr88x8pGboTSU': 'premium',
  'price_1T3jikJpTYwzr88xIxkKHkKu': 'family',
};

// Helper to determine plan type from price or subscription
function getPlanTypeFromSubscription(subscription: any): 'free' | 'premium' | 'family' {
  try {
    // Check if subscription has items with price data
    if (subscription.items?.data?.[0]?.price?.id) {
      const priceId = subscription.items.data[0].price.id;
      // Check if this price ID is mapped
      if (PRICE_ID_TO_PLAN_TYPE[priceId]) {
        return PRICE_ID_TO_PLAN_TYPE[priceId];
      }
      
      // Fallback: infer from price metadata or object if available
      const price = subscription.items.data[0].price;
      if (price.metadata?.plan_type) {
        return price.metadata.plan_type;
      }
    }
  } catch (e) {
    console.error('[Stripe] Error inferring plan type from subscription:', e);
  }
  
  // Default fallback
  return 'premium';
}
export class StripeService {
  static async createCustomer(userId: string, email: string, name?: string) {
    try {
      // Check if customer already exists
      const { data: existingSub } = await supabase
        .from('user_subscriptions')
        .select('stripe_customer_id')
        .eq('user_id', userId)
        .single();

      if (existingSub?.stripe_customer_id) {
        return existingSub.stripe_customer_id;
      }

      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          user_id: userId,
        },
      });

      // Get existing subscription to preserve plan_type
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('plan_type')
        .eq('user_id', userId)
        .single();

      // Store customer ID in database, preserving existing plan_type
      await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customer.id,
          status: 'inactive',
          plan_type: existing?.plan_type || 'free', // Preserve existing plan_type or default to free
        });

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

      // Create checkout session
      console.log('[StripeService] Creating Stripe checkout session...');
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
        success_url: successUrl,
        cancel_url: cancelUrl,
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
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .single();

      if (!subscription?.stripe_subscription_id) {
        throw new Error('No active subscription found');
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

        return { success: true };
      } catch (stripeErr: any) {
        console.error('Error canceling subscription:', stripeErr);

        // If Stripe reports the subscription is missing, mark the local
        // subscription as canceled/free so user can downgrade without a 500.
        const missing =
          stripeErr?.code === 'resource_missing' || stripeErr?.raw?.code === 'resource_missing';

        if (missing) {
          console.warn('[Stripe] Subscription not found in Stripe; cleaning local record');
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
      const { data: subscription } = await supabase
        .from('user_subscriptions')
        .select('stripe_subscription_id')
        .eq('user_id', userId)
        .single();

      if (!subscription?.stripe_subscription_id) {
        throw new Error('No subscription found');
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
    const userId = session.metadata?.user_id;
    const customerId = session.customer;
    const subscriptionId = session.subscription;

    console.log(`[Stripe] Checkout completed - User: ${userId}, Subscription: ${subscriptionId}`);

    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

      // Get existing subscription to preserve plan_type
      const { data: existing } = await supabase
        .from('user_subscriptions')
        .select('plan_type')
        .eq('user_id', userId)
        .single();

      const result = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          stripe_price_id: subscription.items.data[0].price.id,
          status: subscription.status,
          plan_type: existing?.plan_type || 'premium', // Preserve existing plan_type
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
        });

      console.log(`[Stripe] Subscription created in DB for user ${userId}`);
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
          stripe_price_id: subscription.items.data[0]?.price.id,
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
        stripe_price_id: subscription.items.data[0]?.price.id,
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