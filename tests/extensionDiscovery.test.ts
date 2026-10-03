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

  it('requests full Gmail messages to make their bodies available for local scanning', async () => {
    await import('../extension/background.js');
    const url = new URL((globalThis as any).buildGmailMessageFullUrl('message-id'));

    expect(url.searchParams.get('format')).toBe('full');
    expect(url.searchParams.has('metadataHeaders')).toBe(false);
  });

  it('recognizes a missing Gmail read-only scope from an insufficient-scope response', async () => {
    await import('../extension/background.js');

    expect((globalThis as any).isGmailReadOnlyScopeError(403, 'insufficientPermissions', 'Request had insufficient authentication scopes')).toBe(true);
    expect((globalThis as any).isGmailReadOnlyScopeError(403, 'forbidden', 'The Gmail API is disabled')).toBe(false);
    expect((globalThis as any).isGmailReadOnlyScopeError(401, 'unauthorized', 'Invalid credentials')).toBe(false);
  });

  it('extracts a subscription and price from a decoded Gmail text body', async () => {
    await import('../extension/background.js');
    const bodyData = btoa('Your Netflix subscription payment was $15.99.');
    const body = (globalThis as any).extractGmailBody({
      mimeType: 'text/plain',
      body: { data: bodyData },
    });
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your monthly payment receipt',
      'billing@notifications.example',
      body,
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({ serviceName: 'Netflix', amount: 15.99 });
  });

  it('prefers a currency amount over a date appearing earlier in the message', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Subscription renewal receipt',
      'billing@cloudserve.test',
      'Renewal date: September 30, 2026. Total charged: $1,299.99.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({ serviceName: 'Cloudserve', amount: 1299.99 });
  });

  it('parses decimal-comma currency amounts', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Monthly plan payment',
      'billing@cloudserve.test',
      'Amount due: EUR 9,99',
      { internalDate: Date.now().toString() }
    );

    expect(candidate?.amount).toBe(9.99);
  });

  it('parses currency codes following the amount', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your CloudServe plan renews monthly',
      'billing@cloudserve.test',
      '9.99 EUR',
      { internalDate: Date.now().toString() }
    );

    expect(candidate?.amount).toBe(9.99);
  });

  it('parses European thousands and decimal separators', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Subscription renewal receipt',
      'billing@cloudserve.test',
      'Renewal total: 1.299,99 EUR',
      { internalDate: Date.now().toString() }
    );

    expect(candidate?.amount).toBe(1299.99);
  });

  it('scans nested HTML text while ignoring attachment contents', async () => {
    await import('../extension/background.js');
    const body = (globalThis as any).extractGmailBody({
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'text/html',
          body: { data: btoa('<html><body>Netflix subscription payment: $15.99</body></html>') },
        },
        {
          mimeType: 'text/plain',
          filename: 'receipt.txt',
          body: { data: btoa('Spotify subscription payment: $9.99') },
        },
      ],
    });

    expect(body).toContain('Netflix subscription payment: $15.99');
    expect(body).not.toContain('Spotify');
  });

  it('retains pending Gmail candidates when known subscriptions refresh', async () => {
    await import('../extension/background.js');
    const pendingCandidate = {
      serviceName: 'Netflix',
      requiresReview: true,
      source: 'gmail-metadata-candidate',
    };
    const activeSubscription = {
      serviceName: 'Spotify',
      source: 'api-subscriptions',
      requiresReview: false,
    };
    const refreshed = (globalThis as any).retainPendingGmailReviewCandidates(
      { Netflix: pendingCandidate },
      { Spotify: activeSubscription }
    );

    expect(refreshed).toEqual({
      Netflix: pendingCandidate,
      Spotify: activeSubscription,
    });
  });

  it('merges newly scanned details into an existing pending Gmail candidate', async () => {
    await import('../extension/background.js');
    const merged = (globalThis as any).mergePendingGmailCandidate(
      {
        serviceName: 'Netflix',
        amount: 0,
        currency: 'USD',
        requiresReview: true,
        source: 'gmail-metadata-candidate',
      },
      {
        serviceName: 'Netflix',
        amount: 15.99,
        currency: 'USD',
        frequency: 'monthly',
        detectedRenewalDate: '2026-10-15',
        requiresReview: true,
        source: 'gmail-metadata-candidate',
      }
    );

    expect(merged).toMatchObject({
      serviceName: 'Netflix',
      amount: 15.99,
      frequency: 'monthly',
      detectedRenewalDate: '2026-10-15',
      requiresReview: true,
      approvedForSync: false,
      isDetectedCandidate: true,
    });
  });

  it('matches a self-sent receipt when the provider appears in the snippet', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your subscription has renewed',
      'Test User <testuser@gmail.com>',
      'Netflix charge $15.99 for monthly access',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
      serviceName: 'Netflix',
      amount: 15.99,
      requiresReview: true,
      source: 'gmail-metadata-candidate',
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

  it('detects an unknown provider from subscription lifecycle language without a price', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your plan renews monthly',
      'billing@cloudserve.test',
      'Your subscription renews monthly. Manage your plan in your account.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
      serviceName: 'Cloudserve',
      amount: null,
      requiresReview: true,
      source: 'gmail-inferred-review-candidate',
    });
  });

  it('uses the sender display name for an unknown provider', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your monthly subscription payment',
      'BrightStream Billing <billing@notifications.example>',
      'Your membership renewed: $12.00.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
      serviceName: 'BrightStream',
      amount: 12,
      source: 'gmail-inferred-review-candidate',
    });
  });

  it('infers an unknown provider named in the email body', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your subscription renews monthly',
      'notifications@notifications.example',
      'Your BrightStream subscription renews monthly. Total: 12.00 EUR.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
      serviceName: 'BrightStream',
      amount: 12,
      source: 'gmail-inferred-review-candidate',
    });
  });

  it('infers an unknown provider from a meaningful sender email local part', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your monthly plan renewed',
      'copilot-renewal@notifications.example',
      'Your plan renews monthly. Total charged: $19.99.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
      serviceName: 'Copilot',
      amount: 19.99,
      source: 'gmail-inferred-review-candidate',
    });
  });

  it('does not infer a provider name from a personal email local part', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your subscription payment',
      'jane.doe@gmail.com',
      'Your payment was $12.00 for your monthly subscription.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate?.serviceName).not.toBe('Jane Doe');
  });

  it('does not mistake test wording for the subscription provider', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Your test subscription renews monthly',
      'Test User <testuser@gmail.com>',
      'Your test subscription renews monthly. Total: $12.00.',
      { internalDate: Date.now().toString() }
    );

    expect(candidate?.serviceName).not.toBe('Test');
    expect(candidate?.serviceName).not.toBe('Test User');
  });

  it('infers a provider-first renewal heading such as Copilot renewal subscription', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      '## Copilot renewal subscription',
      'billing@notifications.example',
      'Total charged: $10.00',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
      serviceName: 'Copilot',
      amount: 10,
      source: 'gmail-inferred-review-candidate',
    });
  });

  it('infers unknown providers from labeled receipt fields and natural language', async () => {
    const labeledCandidate = globalThis.buildGmailSubscriptionCandidate(
      'Renewal notice',
      'notifications@notifications.example',
      'Merchant: BrightStream Plus\nAmount: $12.00',
      { internalDate: Date.now().toString() }
    );
    const phraseCandidate = globalThis.buildGmailSubscriptionCandidate(
      'Your monthly renewal',
      'notifications@notifications.example',
      'You are subscribed to Nimbus Pro. Your payment is $8.00.',
      { internalDate: Date.now().toString() }
    );

    expect(labeledCandidate).toMatchObject({ serviceName: 'BrightStream Plus', amount: 12 });
    expect(phraseCandidate).toMatchObject({ serviceName: 'Nimbus Pro', amount: 8 });
  });

  it('accepts a self-sent test receipt that mentions Subveris in the subject', async () => {
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Subveris test subscription receipt',
      'Test User <testuser@gmail.com>',
      'Your payment was $4.99',
      { internalDate: Date.now().toString() }
    );

    expect(candidate).toMatchObject({
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

  it('reports a privacy-safe reason when a message has no subscription evidence', async () => {
    await import('../extension/background.js');
    let rejectionReason: string | null = null;
    const candidate = globalThis.buildGmailSubscriptionCandidate(
      'Weekly newsletter',
      'newsletter@news.example',
      'Read our latest product update.',
      { internalDate: Date.now().toString() },
      (reason: string) => { rejectionReason = reason; }
    );

    expect(candidate).toBeNull();
    expect(rejectionReason).toBe('unrecognized_service_without_billing_signal');
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
