import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildDiscoverySyncPayload } = require('../extension/price-discovery-utils.cjs');

describe('buildDiscoverySyncPayload', () => {
  it('maps detected pricing signals into the server payload shape', () => {
    const payload = buildDiscoverySyncPayload({
      domain: 'netflix.com',
      price: 15.99,
      currency: '$',
      planLabel: 'Premium Plan',
      detectedBillingCycle: 'yearly',
      detectedRenewalDate: '2026-09-01',
      source: 'content-dom-scan',
      activeTimeSeconds: 240,
      isZeroUsage: false,
    });

    expect(payload).toMatchObject({
      domain: 'netflix.com',
      discoveredDomains: ['netflix.com'],
      detectedPrice: 15.99,
      detectedPlanName: 'Premium Plan',
      detectedBillingCycle: 'yearly',
      detectedRenewalDate: '2026-09-01',
      source: 'content-dom-scan',
      activeTimeSeconds: 240,
      isZeroUsage: false,
      rollingWindowDays: 30,
    });
  });

  it('falls back to a normalized hostname and preserves null values', () => {
    const payload = buildDiscoverySyncPayload({
      hostname: 'www.spotify.com',
      price: 9.99,
      currency: '€',
      detectedBillingCycle: null,
      detectedRenewalDate: null,
      source: 'content-dom-scan',
    });

    expect(payload.domain).toBe('spotify.com');
    expect(payload.discoveredDomains).toEqual(['spotify.com']);
    expect(payload.detectedPrice).toBe(9.99);
    expect(payload.detectedPlanName).toBeNull();
    expect(payload.detectedBillingCycle).toBeNull();
    expect(payload.detectedRenewalDate).toBeNull();
  });
});
