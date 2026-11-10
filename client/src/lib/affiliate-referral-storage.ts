export const AFFILIATE_VISITOR_TOKEN_KEY = "subveris.affiliate.visitor";
export const AFFILIATE_VISITOR_EXPIRY_KEY = "subveris.affiliate.expiresAt";
export const AFFILIATE_TRACKING_DISABLED_KEY = "subveris.affiliate.trackingDisabled";
export const AFFILIATE_TRACKING_DISABLED_EVENT = "subveris:affiliate-tracking-disabled";

export function isAffiliateTrackingEnabled() {
  return window.localStorage.getItem(AFFILIATE_TRACKING_DISABLED_KEY) !== "true";
}

export function clearAffiliateVisitorToken() {
  window.localStorage.removeItem(AFFILIATE_VISITOR_TOKEN_KEY);
  window.localStorage.removeItem(AFFILIATE_VISITOR_EXPIRY_KEY);
}
