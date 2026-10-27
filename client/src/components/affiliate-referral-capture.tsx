import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth-context";

const VISITOR_TOKEN_KEY = "subveris.affiliate.visitor";
const VISITOR_EXPIRY_KEY = "subveris.affiliate.expiresAt";
const CONSENT_KEY = "subveris.affiliate.referralConsent";
const VISITOR_TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function removeReferralQuery() {
  const current = new URL(window.location.href);
  current.searchParams.delete("ref");
  const next = `${current.pathname}${current.search}${current.hash}`;
  window.history.replaceState(window.history.state, "", next);
}

function getOrCreateVisitorToken(): string {
  const current = window.localStorage.getItem(VISITOR_TOKEN_KEY);
  if (current && VISITOR_TOKEN_PATTERN.test(current)) return current;
  const token = window.crypto.randomUUID();
  window.localStorage.setItem(VISITOR_TOKEN_KEY, token);
  return token;
}

function clearVisitorToken() {
  window.localStorage.removeItem(VISITOR_TOKEN_KEY);
  window.localStorage.removeItem(VISITOR_EXPIRY_KEY);
}

export function AffiliateReferralCapture() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [pendingCode, setPendingCode] = useState<string | null>(null);
  const [consentError, setConsentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const busyRef = useRef(false);

  const claimStoredReferral = async (visitorToken: string) => {
    if (!user?.id) return;
    const expiry = Number(window.localStorage.getItem(VISITOR_EXPIRY_KEY) || 0);
    if (expiry && expiry <= Date.now()) {
      clearVisitorToken();
      return;
    }
    try {
      const response = await apiRequest("POST", "/api/affiliate/attribute", { visitorToken });
      const result = await response.json();
      if (result.attributed || result.locked || result.reason) clearVisitorToken();
    } catch (error) {
      const status = (error as Error & { status?: number })?.status;
      if (status === 400 || status === 403 || status === 409) clearVisitorToken();
      console.warn("[Affiliate] Referral attribution could not be completed.");
    }
  };

  const recordClick = async (code: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setIsSubmitting(true);
    setConsentError("");
    try {
      const visitorToken = getOrCreateVisitorToken();
      const response = await apiRequest("POST", "/api/affiliate/click", { code, visitorToken });
      const result = await response.json();
      if (!result.recorded || !result.expiresAt) throw new Error("Referral link is inactive.");
      window.localStorage.setItem(VISITOR_EXPIRY_KEY, String(new Date(result.expiresAt).getTime()));
      removeReferralQuery();
      setPendingCode(null);
      if (user?.id) await claimStoredReferral(visitorToken);
    } catch {
      setConsentError("Referral tracking could not be saved. You can retry while this link is open.");
    } finally {
      setIsSubmitting(false);
      busyRef.current = false;
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("ref")?.trim();
    if (!code) return;
    if (window.localStorage.getItem(CONSENT_KEY) === "accepted") {
      void recordClick(code);
    } else {
      setPendingCode(code);
    }
  }, [location]);

  useEffect(() => {
    if (!user?.id) return;
    const visitorToken = window.localStorage.getItem(VISITOR_TOKEN_KEY);
    if (visitorToken && VISITOR_TOKEN_PATTERN.test(visitorToken)) {
      void claimStoredReferral(visitorToken);
    }
  }, [user?.id]);

  useEffect(() => {
    const revokeConsent = () => {
      clearVisitorToken();
      window.localStorage.removeItem(CONSENT_KEY);
      setPendingCode(null);
      removeReferralQuery();
    };
    window.addEventListener("subveris:affiliate-consent-revoked", revokeConsent);
    return () => window.removeEventListener("subveris:affiliate-consent-revoked", revokeConsent);
  }, []);

  const accept = () => {
    window.localStorage.setItem(CONSENT_KEY, "accepted");
    if (pendingCode) void recordClick(pendingCode);
  };

  const decline = () => {
    removeReferralQuery();
    setPendingCode(null);
    setConsentError("");
  };

  return (
    <Dialog open={Boolean(pendingCode)} onOpenChange={(open) => { if (!open && !isSubmitting) decline(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Referral attribution</DialogTitle>
          <DialogDescription>
            This creator link can be credited if you register and make an eligible Premium payment within 30 days. With your permission, Subveris will save an opaque first-party referral identifier for up to 30 days. The creator does not receive your account or payment details.
          </DialogDescription>
        </DialogHeader>
        {consentError ? <p role="alert" className="text-sm text-destructive">{consentError}</p> : null}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={decline} disabled={isSubmitting}>Not now</Button>
          <Button type="button" onClick={accept} disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Allow referral tracking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}