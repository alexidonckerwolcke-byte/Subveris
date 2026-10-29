import { apiFetch } from "./api";

export interface StripePriceIds {
  premium: string;
  family: string;
}

const MAX_CONFIG_ATTEMPTS = 3;
const MAX_RETRY_DELAY_MS = 10_000;

let stripePriceIdsRequest: Promise<StripePriceIds> | null = null;

export function getStripeConfigRetryDelay(
  retryAfterHeader: string | null,
  errorMessage: string,
  attempt: number,
  now = Date.now(),
): number {
  const retryAfterMessage = errorMessage.match(/re-?try the request in (\d+(?:\.\d+)?) seconds?/i);
  const retryAfterValue = retryAfterHeader?.trim() || retryAfterMessage?.[1];
  if (retryAfterValue) {
    const seconds = Number(retryAfterValue);
    if (Number.isFinite(seconds)) {
      return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, Math.ceil(seconds * 1000)));
    }

    const retryAt = Date.parse(retryAfterValue);
    if (Number.isFinite(retryAt)) {
      return Math.min(MAX_RETRY_DELAY_MS, Math.max(0, retryAt - now));
    }
  }

  return Math.min(MAX_RETRY_DELAY_MS, 1000 * 2 ** attempt);
}

async function requestStripePriceIds(): Promise<StripePriceIds> {
  for (let attempt = 0; attempt < MAX_CONFIG_ATTEMPTS; attempt += 1) {
    const response = await apiFetch("/api/stripe/config");
    let data: { priceIds?: Partial<StripePriceIds>; error?: string } = {};
    try {
      data = await response.json();
    } catch {
      if (response.ok) {
        throw new Error("The pricing service returned an invalid response.");
      }
    }

    if (response.status === 429 || response.status >= 500) {
      if (attempt < MAX_CONFIG_ATTEMPTS - 1) {
        const delay = getStripeConfigRetryDelay(
          response.headers.get("Retry-After"),
          data.error ?? "",
          attempt,
        );
        await new Promise((resolve) => window.setTimeout(resolve, delay));
        continue;
      }
      throw new Error("Pricing is temporarily unavailable. Please try again shortly.");
    }

    if (!response.ok) {
      throw new Error(data.error || "Failed to load subscription pricing.");
    }

    if (!data.priceIds?.premium || !data.priceIds.family) {
      throw new Error("Subscription pricing is not configured.");
    }

    return {
      premium: data.priceIds.premium,
      family: data.priceIds.family,
    };
  }

  throw new Error("Pricing is temporarily unavailable. Please try again shortly.");
}

export function getStripePriceIds(): Promise<StripePriceIds> {
  if (!stripePriceIdsRequest) {
    stripePriceIdsRequest = requestStripePriceIds().catch((error: unknown) => {
      stripePriceIdsRequest = null;
      throw error;
    });
  }
  return stripePriceIdsRequest;
}
