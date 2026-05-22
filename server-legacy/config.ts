export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim() ? value : undefined;
}

export function validateStripePriceId(envName: string, value: string): string {
  if (value.startsWith('prod_')) {
    console.warn(
      `[Stripe] ${envName} appears to be a Stripe product ID (starts with 'prod_'). ` +
      `Stripe checkout expects a price ID beginning with 'price_'.`
    );
  }

  if (value.startsWith('price_') || value.startsWith('prod_')) {
    return value;
  }

  const warningMessage =
    `[Stripe] ${envName} does not look like a standard Stripe price ID. ` +
    `Expected a value starting with 'price_', got '${value}'.`;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(warningMessage);
  }

  console.warn(warningMessage);
  return value;
}

export function getStripePriceId(envNames: string[], fallback: string, envName: string): string {
  for (const name of envNames) {
    const value = getOptionalEnv(name);
    if (value) {
      return validateStripePriceId(name, value);
    }
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `Missing required Stripe price ID environment variable: ${envNames.join(' or ')}. ` +
      `Set ${envNames.join(' or ')} to a Stripe price ID starting with 'price_'.`
    );
  }

  return validateStripePriceId(envName, fallback);
}

export function validateEnvironment(): void {
  getRequiredEnv('SUPABASE_URL');
  getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');
  getRequiredEnv('STRIPE_SECRET_KEY');

  if (process.env.NODE_ENV === 'production') {
    getRequiredEnv('STRIPE_WEBHOOK_SECRET');
  }

  getStripePriceId(['STRIPE_PREMIUM_PRICE_ID', 'VITE_STRIPE_PREMIUM_PRICE_ID'], 'price_1TM9r1JSf7SJ8WWRiocez8wo', 'STRIPE_PREMIUM_PRICE_ID');
  getStripePriceId(['STRIPE_FAMILY_PRICE_ID', 'VITE_STRIPE_FAMILY_PRICE_ID'], 'price_1TM9sSJSf7SJ8WWR4H26rSZ9', 'STRIPE_FAMILY_PRICE_ID');
}
