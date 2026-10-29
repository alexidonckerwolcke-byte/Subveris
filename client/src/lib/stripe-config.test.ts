import { beforeEach, describe, expect, it, vi } from "vitest";
import { getStripeConfigRetryDelay } from "./stripe-config";

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock("./api", () => ({
  apiFetch: apiFetchMock,
}));

beforeEach(() => {
  vi.resetModules();
  apiFetchMock.mockReset();
});

describe("Stripe config retry delay", () => {
  it("uses the Retry-After header when supplied as seconds", () => {
    expect(getStripeConfigRetryDelay("1", "", 0)).toBe(1000);
  });

  it("reads a retry delay from the rate-limit error message", () => {
    expect(getStripeConfigRetryDelay(null, "Too many requests. Re-try the request in 1 seconds.", 0)).toBe(1000);
  });

  it("uses an exponential delay when the server does not provide one", () => {
    expect(getStripeConfigRetryDelay(null, "", 1)).toBe(2000);
  });

  it("caps excessive server retry delays", () => {
    expect(getStripeConfigRetryDelay("60", "", 0)).toBe(10_000);
  });
});

describe("Stripe price config loading", () => {
  it("retries a rate-limited config request and returns the prices", async () => {
    apiFetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({
        error: "Too many requests. Re-try the request in 0 seconds.",
      }), { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        priceIds: { premium: "price_premium", family: "price_family" },
      }), { status: 200 }));

    const { getStripePriceIds } = await import("./stripe-config");
    await expect(getStripePriceIds()).resolves.toEqual({
      premium: "price_premium",
      family: "price_family",
    });
    expect(apiFetchMock).toHaveBeenCalledTimes(2);
  });

  it("shares one in-flight request between concurrent callers", async () => {
    let resolveResponse!: (response: Response) => void;
    apiFetchMock.mockReturnValue(new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    }));

    const { getStripePriceIds } = await import("./stripe-config");
    const firstRequest = getStripePriceIds();
    const secondRequest = getStripePriceIds();
    expect(firstRequest).toBe(secondRequest);
    expect(apiFetchMock).toHaveBeenCalledTimes(1);

    resolveResponse(new Response(JSON.stringify({
      priceIds: { premium: "price_premium", family: "price_family" },
    }), { status: 200 }));
    await expect(firstRequest).resolves.toEqual({
      premium: "price_premium",
      family: "price_family",
    });
  });
});
