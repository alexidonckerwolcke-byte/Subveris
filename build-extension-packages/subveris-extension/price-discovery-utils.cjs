const path = require('path');

function normalizeHostname(hostname) {
  if (typeof hostname !== 'string' || !hostname.trim()) {
    return null;
  }

  return hostname.trim().toLowerCase().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].replace(/:\d+$/, '');
}

function buildDiscoverySyncPayload(input = {}) {
  const domain = normalizeHostname(input.domain || input.hostname || null) || 'unknown';
  const detectedPrice = typeof input.price === 'number' ? input.price : null;
  const detectedPlanName = typeof input.planLabel === 'string' && input.planLabel.trim()
    ? input.planLabel.trim()
    : null;
  const detectedBillingCycle = input.detectedBillingCycle || null;
  const detectedRenewalDate = input.detectedRenewalDate || null;

  return {
    domain,
    discoveredDomains: [domain],
    detectedPrice,
    detectedPlanName,
    detectedBillingCycle,
    detectedRenewalDate,
    source: input.source || 'content-dom-scan',
    activeTimeSeconds: typeof input.activeTimeSeconds === 'number' ? input.activeTimeSeconds : null,
    isZeroUsage: Boolean(input.isZeroUsage),
    rollingWindowDays: 30,
  };
}

module.exports = {
  normalizeHostname,
  buildDiscoverySyncPayload,
};
