import { describe, expect, it, vi, beforeAll } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { buildDiscoverySyncPayload } = require('../extension/price-discovery-utils.cjs');

beforeAll(() => {
  globalThis.setInterval = (() => 0) as any;
  globalThis.clearInterval = (() => undefined) as any;
  globalThis.browser = {
    runtime: {
      onInstalled: { addListener() {} },
      onStartup: { addListener() {} },
      onMessage: { addListener() {} },
      lastError: undefined,
    },
    alarms: {
      create() {},
      onAlarm: { addListener() {} },
    },
    tabs: {
      query() {},
      onActivated: { addListener() {} },
      onUpdated: { addListener() {} },
      sendMessage() {},
    },
    cookies: {
      getAll() {},
    },
    downloads: {
      onChanged: { addListener() {} },
      search() { return []; },
    },
    storage: {
      local: {
        get(_keys: any, callback: any) { callback({}); },
        set(_obj: any, callback: any) { if (callback) callback(); },
        remove(_keys: any, callback: any) { if (callback) callback(); },
      },
    },
  } as any;
  globalThis.chrome = globalThis.browser as any;
  vi.stubGlobal('browser', globalThis.browser);
  vi.stubGlobal('chrome', globalThis.browser);
});

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

  it('extracts a real Gmail subscription candidate from message text', async () => {
    await import('../extension/background.js');
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your Netflix subscription has been renewed',
      'billing@netflix.com',
      'Your charge was $15.99 on Sep 28, 2026',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
      serviceName: 'Netflix',
      amount: 15.99,
      frequency: 'monthly',
      requiresReview: true,
      isDetectedCandidate: true,
    });
  });

  it('keeps an unknown billing email in the manual review queue', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Test subscription receipt',
      'billing@acme.test',
      'Your payment was $4.99',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
      serviceName: 'Acme',
      amount: 4.99,
      requiresReview: true,
      source: 'gmail-inferred-review-candidate',
    });
  });

  it('extracts Adobe price and renewal date from a renewal email body', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your renewal is complete',
      'message@adobe.com',
      'Adobe Creative Cloud renewal. Amount charged: $59.99. Next renewal: September 30, 2026.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
      serviceName: 'Adobe',
      amount: 59.99,
      detectedRenewalDate: '2026-09-30',
      requiresReview: true,
    });
  });

  it('ignores a known service mentioned in unrelated email body text', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Weekly product news',
      'newsletter@news.example',
      'This article mentions Adobe, Canva, and Spotify. No payment or renewal details.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toBeNull();
  });

  it('does not classify Canva from unrelated Adobe email text', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Adobe renewal complete',
      'message@adobe.com',
      'Your Adobe renewal was processed. This email was created with Canva Pro templates. Amount charged: $16.00.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate?.serviceName).toBe('Adobe');
  });

  it('does not classify any known service from body-only mentions', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Adobe renewal complete',
      'message@adobe.com',
      'Your renewal was processed. This email mentions Netflix, Spotify, HBO, Uber, and Canva for comparison only. Amount charged: $16.00.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate?.serviceName).toBe('Adobe');
  });

  it('detects an Adobe renewal from the subject when body fields are unavailable', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Adobe renewal confirmation',
      'notifications@billing.example',
      'Your renewal details are available in your Adobe account.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
      serviceName: 'Adobe',
      requiresReview: true,
    });
  });
});
