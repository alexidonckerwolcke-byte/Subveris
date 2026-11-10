import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import {
  AFFILIATE_TRACKING_DISABLED_EVENT,
  AFFILIATE_TRACKING_DISABLED_KEY,
  AFFILIATE_VISITOR_EXPIRY_KEY,
  AFFILIATE_VISITOR_TOKEN_KEY,
  clearAffiliateVisitorToken,
  isAffiliateTrackingEnabled,
} from "@/lib/affiliate-referral-storage";

const VISITOR_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function removeReferralQuery() {
  const current = new URL(window.location.href);
  current.searchParams.delete("ref");
  const next = `${current.pathname}${current.search}${current.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

function getOrCreateVisitorToken(): string {
  const current = window.localStorage.getItem(AFFILIATE_VISITOR_TOKEN_KEY);
  if (current && VISITOR_TOKEN_PATTERN.test(current)) return current;
  const token = window.crypto.randomUUID();
  window.localStorage.setItem(AFFILIATE_VISITOR_TOKEN_KEY, token);
  return token;
}

export function AffiliateReferralCapture() {
  const [location] = useLocation();
  const { user } = useAuth();
  const busyRef = useRef(false);
  const { toast } = useToast();

  const claimStoredReferral = async (visitorToken: string) => {
    if (!user?.id) return;
    const expiry = Number(window.localStorage.getItem(AFFILIATE_VISITOR_EXPIRY_KEY) || 0);
    if (expiry && expiry <= Date.now()) {
      clearAffiliateVisitorToken();
      return;
    }
    try {
      const response = await apiRequest("POST", "/api/affiliate/attribute", { visitorToken });
      const result = await response.json();
      if (result.attributed || result.locked || result.reason) clearAffiliateVisitorToken();
    } catch (error) {
      const status = (error as Error & { status?: number })?.status;
      if (status === 400 || status === 403 || status === 409) clearAffiliateVisitorToken();
      console.warn("[Affiliate] Referral attribution could not be completed.");
    }
  };

  const recordClick = async (code: string) => {
    if (busyRef.current || !isAffiliateTrackingEnabled()) return;
    busyRef.current = true;
    try {
      const visitorToken = getOrCreateVisitorToken();
      const response = await apiRequest("POST", "/api/affiliate/click", { code, visitorToken });
      const result = await response.json();
      if (!result.recorded || !result.expiresAt) throw new Error("Referral link is inactive.");
      window.localStorage.setItem(AFFILIATE_VISITOR_EXPIRY_KEY, String(new Date(result.expiresAt).getTime()));
      removeReferralQuery();
      if (user?.id) await claimStoredReferral(visitorToken);
    } catch (error) {
      toast({
        title: "Referral tracking could not be saved",
        description: error instanceof Error ? error.message : "Try opening the referral link again.",
        variant: "destructive",
      });
    } finally {
      busyRef.current = false;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref")?.trim();
    if (!code) return;
    if (!isAffiliateTrackingEnabled()) {
      removeReferralQuery();
      return;
    }
    void recordClick(code);
  }, [location]);

  useEffect(() => {
    if (!user?.id || !isAffiliateTrackingEnabled()) return;
    const visitorToken = window.localStorage.getItem(AFFILIATE_VISITOR_TOKEN_KEY);
    if (visitorToken && VISITOR_TOKEN_PATTERN.test(visitorToken)) {
      void claimStoredReferral(visitorToken);
    }
  }, [user?.id]);

  useEffect(() => {
    const disableTracking = () => {
      clearAffiliateVisitorToken();
      removeReferralQuery();
    };
    window.addEventListener(AFFILIATE_TRACKING_DISABLED_EVENT, disableTracking);
    return () => window.removeEventListener(AFFILIATE_TRACKING_DISABLED_EVENT, disableTracking);
  }, []);

  return null;
}