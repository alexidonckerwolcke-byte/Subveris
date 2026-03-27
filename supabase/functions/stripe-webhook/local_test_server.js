import http from 'http';

function log(msg, ...args) {
  console.log(new Date().toISOString(), msg, ...args);
}

async function handleCheckoutCompleted(session) {
  const userId = session.metadata?.user_id;
  if (!userId) return log('[handler] no user_id in session metadata');
  // Simulate retrieved subscription if session.subscription provided
  const subscription = session.subscription
    ? {
        id: session.subscription,
        items: { data: [{ price: { id: session.price_id ?? 'price_test' } }] },
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        cancel_at_period_end: false,
      }
    : null;

  if (!subscription) {
    log('[dry-run] upsert user_subscriptions (missing subscription)', { user_id: userId, stripe_customer_id: session.customer });
    return;
  }

  const payload = {
    user_id: userId,
    stripe_customer_id: session.customer,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0].price.id,
    status: subscription.status,
    current_period_start: new Date(subscription.current_period_start * 1000),
    current_period_end: new Date(subscription.current_period_end * 1000),
    cancel_at_period_end: !!subscription.cancel_at_period_end,
    updated_at: new Date().toISOString(),
  };
  log('[dry-run] upsert user_subscriptions:', payload);
}

async function handlePaymentSucceeded(invoice) {
  log('[handler] payment_succeeded for subscription', invoice.subscription || '(none)');
}

async function handlePaymentFailed(invoice) {
  log('[handler] payment_failed for subscription', invoice.subscription || '(none)');
}

async function handleSubscriptionUpdated(subscription) {
  log('[handler] subscription.updated', subscription.id, 'status:', subscription.status);
}

async function handleSubscriptionDeleted(subscription) {
  log('[handler] subscription.deleted', subscription.id);
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    res.end('Method not allowed');
    return;
  }
  let body = '';
  for await (const chunk of req) body += chunk;
  try {
    const event = JSON.parse(body);
    log('[server] received event', event.type);
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      default:
        log('[server] unhandled event type', event.type);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ received: true }));
  } catch (err) {
    console.error('[server] error parsing body', err);
    res.writeHead(400);
    res.end('invalid');
  }
});

const PORT = process.env.PORT || 54323;
server.listen(PORT, () => log(`local_test_server listening on http://localhost:${PORT}`));

export default server;
