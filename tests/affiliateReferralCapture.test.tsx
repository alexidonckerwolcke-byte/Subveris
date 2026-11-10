/**
 * @vitest-environment jsdom
 */

import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => [`${window.location.pathname}${window.location.search}`],
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: mocks.apiRequest,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

import { AffiliateReferralCapture } from "../client/src/components/affiliate-referral-capture";
import {
  AFFILIATE_TRACKING_DISABLED_EVENT,
  AFFILIATE_TRACKING_DISABLED_KEY,
  AFFILIATE_VISITOR_EXPIRY_KEY,
  AFFILIATE_VISITOR_TOKEN_KEY,
} from "../client/src/lib/affiliate-referral-storage";
import Cookies from "../client/src/pages/cookies";

describe("AffiliateReferralCapture", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.history.replaceState({}, "", "/?ref=creator-code");
    mocks.apiRequest.mockReset();
    mocks.toast.mockReset();
  });

  it("records a referral automatically without showing a consent dialog", async () => {
    mocks.apiRequest.mockResolvedValue({
      json: async () => ({
        recorded: true,
        expiresAt: "2026-12-10T00:00:00.000Z",
      }),
    });

    render(<AffiliateReferralCapture />);

    await waitFor(() => {
      expect(mocks.apiRequest).toHaveBeenCalledWith("POST", "/api/affiliate/click", {
        code: "creator-code",
        visitorToken: expect.any(String),
      });
    });
    expect(await screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(window.location.search).toBe("");
    expect(window.localStorage.getItem(AFFILIATE_VISITOR_TOKEN_KEY)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(window.localStorage.getItem(AFFILIATE_VISITOR_EXPIRY_KEY)).toBe(
      String(new Date("2026-12-10T00:00:00.000Z").getTime()),
    );
  });

  it("does not record referrals when tracking has been turned off", async () => {
    window.localStorage.setItem(AFFILIATE_TRACKING_DISABLED_KEY, "true");

    render(<AffiliateReferralCapture />);

    await waitFor(() => expect(window.location.search).toBe(""));
    expect(mocks.apiRequest).not.toHaveBeenCalled();
    expect(window.localStorage.getItem(AFFILIATE_VISITOR_TOKEN_KEY)).toBeNull();
  });

  it("lets visitors turn referral tracking off and back on from Cookie Policy", async () => {
    window.localStorage.setItem(AFFILIATE_VISITOR_TOKEN_KEY, "visitor-token");
    window.localStorage.setItem(AFFILIATE_VISITOR_EXPIRY_KEY, "123");
    const dispatchSpy = vi.spyOn(window, "dispatchEvent");

    render(<Cookies />);

    await screen.findByText("Referral tracking is on for this browser.");
    fireEvent.click(screen.getByRole("button", { name: "Turn off referral tracking" }));
    expect(window.localStorage.getItem(AFFILIATE_TRACKING_DISABLED_KEY)).toBe("true");
    expect(window.localStorage.getItem(AFFILIATE_VISITOR_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(AFFILIATE_VISITOR_EXPIRY_KEY)).toBeNull();
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: AFFILIATE_TRACKING_DISABLED_EVENT,
    }));

    fireEvent.click(await screen.findByRole("button", { name: "Turn on referral tracking" }));
    expect(window.localStorage.getItem(AFFILIATE_TRACKING_DISABLED_KEY)).toBeNull();
    dispatchSpy.mockRestore();
  });

  it("notifies the visitor and leaves the referral URL available when recording fails", async () => {
    mocks.apiRequest.mockRejectedValue(new Error("Network unavailable"));

    render(<AffiliateReferralCapture />);

    await waitFor(() => {
      expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
        title: "Referral tracking could not be saved",
        description: "Network unavailable",
        variant: "destructive",
      }));
    });
    expect(window.location.search).toBe("?ref=creator-code");
  });
});
