// Cross-browser compatibility shim
// Safari 15+, Firefox, and Edge use 'browser' global
// Chrome uses 'chrome' global, so provide it as 'browser' for compatibility
const browser = globalThis.browser || globalThis.chrome || {
  runtime: { onInstalled: { addListener() {} }, onStartup: { addListener() {} }, lastError: undefined },
  alarms: { create() {}, onAlarm: { addListener() {} } },
  tabs: { query() {}, onActivated: { addListener() {} }, onUpdated: { addListener() {} }, sendMessage() {} },
  cookies: { getAll() { return []; } },
  downloads: { onChanged: { addListener() {} }, search() { return []; } },
  storage: {
    local: {
      get(_keys, callback) { if (callback) callback({}); },
      set(_obj, callback) { if (callback) callback(); },
      remove(_keys, callback) { if (callback) callback(); },
    },
  },
  identity: { launchWebAuthFlow() {} },
};
globalThis.browser = browser;
globalThis.chrome = browser;
const DEFAULT_API_URL = 'https://xuilgccacufwinvkocfl.supabase.co/functions/v1';

function rehydrateAuthFromSubverisTabs() {
  if (!browser.tabs || typeof browser.tabs.query !== 'function') {
    return;
  }

  browser.tabs.query({
    url: ['https://subveris.com/*', 'https://*.subveris.com/*']
  }, (tabs) => {
    if (!tabs || !tabs.length) {
      return;
    }

    tabs.forEach((tab) => {
      if (!tab || typeof tab.id !== 'number') {
        return;
      }

      browser.tabs.sendMessage(tab.id, { type: 'GET_AUTH_TOKEN' }, (response) => {
        if (browser.runtime.lastError) {
          return;
        }

        const token = response?.token;
        const userId = response?.userId;
        const apiUrl = response?.apiUrl || null;

        if (!token || !userId) {
          return;
        }

        const hasExistingUser = Boolean(browser.storage.local.get && false);
        if (hasExistingUser) {
          return;
        }

        browser.storage.local.get(['supabaseUserUUID'], (stored) => {
          const currentUserId = stored.supabaseUserUUID;
          if (currentUserId && currentUserId !== userId) {
            return;
          }

          const exchangeUrl = `${normalizeApiUrl(apiUrl || DEFAULT_API_URL)}/api/security/extension-session`;
          fetch(exchangeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ userId }),
            keepalive: true,
          }).then(async (response) => {
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(data.error || 'Failed to rehydrate extension session');
            }

            browser.storage.local.set({
              authToken: data.sessionToken || null,
              supabaseAuthToken: token,
              supabaseUserUUID: userId,
              subverisApiUrl: normalizeApiUrl(apiUrl || DEFAULT_API_URL),
              extensionSessionExpiresAt: data.expiresAt || null,
            }, () => {
              if (!browser.runtime.lastError) {
                refreshSubscriptionStatus(() => {});
              }
            });
          }).catch(() => {});
        });
      });
    });
  });
}

browser.runtime.onInstalled.addListener(() => {
  console.log('Subveris Subscription Insights Extension Installed');
  browser.alarms?.create('refresh-subscription-activity', { periodInMinutes: 60 });
  loadKnownSubscriptions();
  rehydrateAuthFromSubverisTabs();
});

browser.runtime.onStartup.addListener(() => {
  console.log('Subveris Subscription Insights Extension started');
  browser.alarms?.create('refresh-subscription-activity', { periodInMinutes: 60 });
  loadKnownSubscriptions();
  rehydrateAuthFromSubverisTabs();
});

browser.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refresh-subscription-activity') {
    loadKnownSubscriptions();
    rehydrateAuthFromSubverisTabs();
  }
});

browser.tabs?.onActivated?.addListener(() => {
  rehydrateAuthFromSubverisTabs();
});

browser.tabs?.onUpdated?.addListener((tabId, changeInfo, tab) => {
  if (tab && typeof tab.url === 'string' && /https:\/\/(?:www\.)?subveris\.com\//.test(tab.url) && changeInfo.status === 'complete') {
    rehydrateAuthFromSubverisTabs();
  }
});

const ZERO_USAGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Subscription domain mapping
const SUBSCRIPTION_MAPPING = {
  'netflix.com': 'Netflix',
  'spotify.com': 'Spotify Premium',
  'amazon.com': 'Amazon Prime',
  'disneyplus.com': 'Disney Plus',
  'youtube.com': 'YouTube Premium',
  'hbomax.com': 'HBO Max',
  'tinder.com': 'Tinder Gold',
  'linkedin.com': 'LinkedIn Premium',
  'hellofresh.com': 'HelloFresh',
  'icloud.com': 'iCloud',
  'canva.com': 'Canva Pro',
  'microsoft.com': 'Microsoft 365',
  'nordvpn.com': 'NordVPN',
  'playstation.com': 'PlayStation Plus',
  'xbox.com': 'Xbox Game Pass',
  'audible.com': 'Audible',
  'readly.com': 'Readly',
  'duolingo.com': 'Duolingo Plus',
  'viaplay.com': 'Viaplay',
  'adobe.com': 'Adobe'
};

const MONTHLY_PRICES = {
  'Spotify Premium': 12.99,
  'Netflix': 15.99,
  'YouTube Premium': 11.99,
  'Adobe': 54.99,
  'Audible': 9.95,
  'Disney Plus': 10.99,
  'HBO Max': 15.99,
  'Canva Pro': 14.99,
  'Microsoft 365': 9.99,
  'NordVPN': 12.99
};

const CANCELLATION_GUIDES = {
  'Netflix': 'cancel-netflix',
  'Spotify Premium': 'cancel-spotify',
  'Amazon Prime': 'cancel-amazon-prime',
  'Disney Plus': 'cancel-disney-plus',
  'YouTube Premium': 'cancel-youtube-premium',
  'HBO Max': 'cancel-hbo-max',
  'Tinder Gold': 'cancel-tinder-gold',
  'LinkedIn Premium': 'cancel-linkedin-premium',
  'HelloFresh': 'cancel-hellofresh',
  'iCloud': 'cancel-icloud',
  'Canva Pro': 'cancel-canva-pro',
  'Microsoft 365': 'cancel-microsoft-365',
  'NordVPN': 'cancel-nordvpn',
  'PlayStation Plus': 'cancel-playstation-plus',
  'Xbox Game Pass': 'cancel-xbox-game-pass',
  'Audible': 'cancel-audible',
  'Readly': 'cancel-readly',
  'Duolingo Plus': 'cancel-duolingo',
  'Viaplay': 'cancel-viaplay',
  'Adobe': 'cancel-adobe'
};

function getServiceNameFromDomain(domain) {
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  for (const [domainKey, serviceName] of Object.entries(SUBSCRIPTION_MAPPING)) {
    if (normalized.includes(domainKey.replace(/^www\./, ''))) {
      return serviceName;
    }
  }
  return null;
}

function normalizeApiUrl(apiUrl) {
  if (!apiUrl) {
    return DEFAULT_API_URL;
  }

  const normalizedUrl = apiUrl.replace(/\/$/, '').replace(/\/api$/, '');
  try {
    const parsed = new URL(normalizedUrl);
    const hostname = parsed.hostname.replace(/^www\./i, '').toLowerCase();
    if (hostname === 'subveris.com' && !normalizedUrl.includes('/functions/v1')) {
      return DEFAULT_API_URL;
    }
  } catch (error) {
    // Ignore invalid URLs; fall through to legacy behavior.
  }

  if (/^https?:\/\/(localhost|127\.0\.0\.1):5173$/i.test(normalizedUrl)) {
    return 'http://localhost:5000';
  }
  return normalizedUrl;
}

const GMAIL_AUTH_KEYS = ['gmailAuthToken', 'gmailTokenExpiry', 'gmailTokenExpiresAt', 'gmailUserUUID'];

const ACCOUNT_STATE_KEYS = [
  'authToken',
  'supabaseAuthToken',
  'authSessionId',
  'authCsrfToken',
  'supabaseUserUUID',
  'extensionSessionExpiresAt',
  'subscription_status',
  'detectedSubscriptions',
  'gmailReauthorizationRequired',
  'detectedSubscription',
  'lastDetectedSubscriptionAt',
  'trackingPaused',
  'upgradePrompt',
  'cookieScanCompleted',
];

function clearStoredAccountState(callback) {
  browser.storage.local.remove(ACCOUNT_STATE_KEYS, () => {
    if (browser.runtime.lastError) {
      console.warn('[Background] Failed to clear previous account state:', browser.runtime.lastError);
    }
    if (callback) callback();
  });
}

function clearGmailAuthorization(callback) {
  browser.storage.local.remove(GMAIL_AUTH_KEYS, () => {
    const error = browser.runtime.lastError;
    if (error) {
      console.warn('[Background] Failed to clear Gmail authorization:', error);
    }
    if (callback) callback(!error);
  });
}

function clearStateForAccountSwitch(userId, callback) {
  browser.storage.local.get(['supabaseUserUUID', 'gmailUserUUID', 'gmailAuthToken'], (result) => {
    const clearSessionIfNeeded = () => {
      if (result.supabaseUserUUID && result.supabaseUserUUID !== userId) {
        console.log('[Background] Account changed; clearing cached state for:', result.supabaseUserUUID);
        clearStoredAccountState(callback);
        return;
      }
      callback();
    };

    if ((result.gmailAuthToken || result.gmailUserUUID) && result.gmailUserUUID !== userId) {
      console.log('[Background] Gmail authorization belongs to another account; clearing it.');
      clearGmailAuthorization(clearSessionIfNeeded);
      return;
    }
    clearSessionIfNeeded();
  });
}

function refreshOpaqueSessionFromStoredRawToken(callback = () => {}) {
  browser.storage.local.get(['supabaseAuthToken', 'supabaseUserUUID', 'subverisApiUrl'], (result) => {
    const rawToken = result.supabaseAuthToken;
    const userId = result.supabaseUserUUID;
    const apiUrl = normalizeApiUrl(result.subverisApiUrl || DEFAULT_API_URL);

    if (!rawToken || !userId) {
      callback(false);
      return;
    }

    fetch(`${apiUrl}/api/security/extension-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rawToken}`,
      },
      body: JSON.stringify({ userId }),
      keepalive: true,
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh extension session');
      }

      browser.storage.local.set({
        authToken: data.sessionToken || null,
        extensionSessionExpiresAt: data.expiresAt || null,
        subverisApiUrl: apiUrl,
      }, () => {
        if (browser.runtime.lastError) {
          console.warn('[Background] Failed to persist refreshed extension session:', browser.runtime.lastError);
          callback(false);
          return;
        }
        console.log('[Background] ✅ Refreshed stale extension session without logging the user out.');
        refreshSubscriptionStatus(() => {});
        callback(true);
      });
    }).catch((error) => {
      console.warn('[Background] Could not refresh stale extension session:', error);
      callback(false);
    });
  });
}

function loadKnownSubscriptions() {
  refreshSubscriptionStatus();
  browser.storage.local.get(['authToken', 'supabaseAuthToken', 'subverisApiUrl', 'detectedSubscriptions'], (result) => {
    const token = result.supabaseAuthToken || result.authToken;
    const apiUrl = normalizeApiUrl(result.subverisApiUrl);
    const existingSubs = result.detectedSubscriptions || {};

    if (!token) {
      console.log('[Background] No auth token available yet; skipping background subscription hydration.');
      return;
    }

    fetch(`${apiUrl}/api/subscriptions`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      keepalive: true
    }).then(async (response) => {
      if (!response.ok) {
        console.warn('[Background] Failed to fetch known subscriptions:', response.status, response.statusText);
        return;
      }

      const subscriptions = await response.json();
      if (!Array.isArray(subscriptions)) {
        console.warn('[Background] Known subscriptions response was not an array:', subscriptions);
        return;
      }

      const merged = {};

      subscriptions.forEach((sub) => {
        const isStripeBillingSubscription =
          sub?.name?.toLowerCase?.().includes('(stripe)') ||
          sub?.description?.toLowerCase?.().includes('stripe');
        if (isStripeBillingSubscription) {
          return;
        }

        const serviceName = sub.name || sub.service_name || sub.provider || sub.title;
        if (!serviceName) {
          return;
        }

        const domain = (sub.website_domain || sub.website || sub.domain || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').toLowerCase();
        const key = serviceName;

        merged[key] = {
          ...existingSubs[key],
          serviceName: key,
          subscriptionId: sub.id || existingSubs[key]?.subscriptionId || null,
          domain: domain || existingSubs[key]?.domain || null,
          detectedAt: existingSubs[key]?.detectedAt || Date.now(),
          lastSeen: existingSubs[key]?.lastSeen || Date.now(),
          source: 'api-subscriptions',
          requiresReview: false,
          approvedForSync: false,
          isDetectedCandidate: false,
        };
      });

      retainPendingGmailReviewCandidates(existingSubs, merged);

      browser.storage.local.set({ detectedSubscriptions: merged }, () => {
        if (browser.runtime.lastError) {
          console.error('[Background] Failed to store hydrated subscriptions:', browser.runtime.lastError);
          return;
        }
        console.log('[Background] ✅ Hydrated known subscriptions from backend:', Object.keys(merged).length);
      });
    }).catch((error) => {
      console.error('[Background] Error hydrating known subscriptions from backend:', error);
    });
  });
}

function retainPendingGmailReviewCandidates(existingSubscriptions, refreshedSubscriptions) {
  Object.entries(existingSubscriptions || {}).forEach(([serviceName, item]) => {
    const isPendingGmailCandidate = item?.requiresReview === true && (
      item.source === 'gmail-metadata-candidate' || item.source === 'gmail-inferred-review-candidate'
    );
    if (isPendingGmailCandidate && !refreshedSubscriptions[serviceName]) {
      refreshedSubscriptions[serviceName] = item;
    }
  });
  return refreshedSubscriptions;
}

function mergePendingGmailCandidate(existing, candidate) {
  return {
    ...existing,
    ...candidate,
    serviceName: existing?.serviceName || candidate.serviceName,
    domain: candidate.domain || existing?.domain || null,
    amount: candidate.amount ?? existing?.amount ?? 0,
    currency: candidate.amount !== null ? candidate.currency : (existing?.currency || candidate.currency),
    frequency: candidate.frequency || existing?.frequency || 'monthly',
    detectedRenewalDate: candidate.detectedRenewalDate || existing?.detectedRenewalDate || null,
    planName: candidate.planName || existing?.planName || null,
    detectedAt: existing?.detectedAt || candidate.detectedAt,
    lastSeen: Date.now(),
    requiresReview: true,
    approvedForSync: false,
    isDetectedCandidate: true,
  };
}

globalThis.mergePendingGmailCandidate = mergePendingGmailCandidate;

function addDetectedSubscription(serviceName, domain) {
  if (!serviceName) return;

  console.log('[Background] Skipping unauthorised subscription candidate; usage requires an existing Subveris subscription:', serviceName);
}

function approveReviewedSubscription(serviceName, callback = () => {}) {
  if (!serviceName) {
    callback({ success: false, error: 'Missing service name' });
    return;
  }

  browser.storage.local.get(['detectedSubscriptions'], (result) => {
    const subs = result.detectedSubscriptions || {};
    const item = subs[serviceName];

    if (!item) {
      callback({ success: false, error: 'Review item not found' });
      return;
    }

    subs[serviceName] = {
      ...item,
      requiresReview: false,
      approvedForSync: true,
      isDetectedCandidate: false,
      source: item.source === 'gmail-metadata-candidate' ? 'gmail-metadata-approved' : (item.source || 'manual-review'),
      lastSeen: Date.now(),
      detectedAt: item.detectedAt || Date.now(),
      lastVisit: item.lastVisit || Date.now(),
    };

    browser.storage.local.set({ detectedSubscriptions: subs }, () => {
      if (browser.runtime.lastError) {
        callback({ success: false, error: browser.runtime.lastError.message });
        return;
      }
      console.log('[Background] ✅ Approved Gmail review item:', serviceName);
      syncDetectedSubscriptions(subs);
      callback({ success: true });
    });
  });
}

const DETECTED_DISMISS_GRACE_MS = 24 * 60 * 60 * 1000;

function pruneExpiredDismissedSubscriptions(subscriptions) {
  const now = Date.now();
  const cleaned = {};

  Object.entries(subscriptions || {}).forEach(([key, item]) => {
    if (!item) return;
    if (item.dismissedAt && now - item.dismissedAt >= DETECTED_DISMISS_GRACE_MS) {
      return;
    }
    cleaned[key] = item;
  });

  return cleaned;
}

function dismissReviewedSubscription(serviceName, callback = () => {}) {
  if (!serviceName) {
    callback({ success: false, error: 'Missing service name' });
    return;
  }

  browser.storage.local.get(['detectedSubscriptions'], (result) => {
    const subs = pruneExpiredDismissedSubscriptions(result.detectedSubscriptions || {});
    const item = subs[serviceName] || (result.detectedSubscriptions || {})[serviceName];

    if (!item) {
      callback({ success: false, error: 'Review item not found' });
      return;
    }

    subs[serviceName] = {
      ...item,
      requiresReview: false,
      approvedForSync: false,
      isDetectedCandidate: false,
      dismissedAt: Date.now(),
      dismissedUntil: Date.now() + DETECTED_DISMISS_GRACE_MS,
      source: item.source || 'manual-review',
      lastSeen: Date.now(),
      lastVisit: item.lastVisit || Date.now(),
    };

    browser.storage.local.set({ detectedSubscriptions: subs }, () => {
      if (browser.runtime.lastError) {
        callback({ success: false, error: browser.runtime.lastError.message });
        return;
      }
      console.log('[Background] Dismissed review item for grace period:', serviceName);
      callback({ success: true });
    });
  });
}

function syncDetectedSubscriptions(subscriptions, onComplete = () => {}) {
  let completed = false;
  const finish = (result) => {
    if (completed) return;
    completed = true;
    onComplete(result);
  };
  const timeoutId = setTimeout(() => {
    finish({ success: false, reason: 'sync_timeout' });
    publishGmailScanEvent('review_queue_sync_failed', { reason: 'timeout' });
  }, 15000);

  browser.storage.local.get(['authToken', 'supabaseAuthToken', 'subverisApiUrl'], (result) => {
    // Use the persisted Supabase JWT for this stateless Edge Function route.
    // The opaque extension session is held in process memory and may not survive
    // routing to another Edge Function instance.
    const token = result.supabaseAuthToken || result.authToken;
    const apiUrl = normalizeApiUrl(result.subverisApiUrl || DEFAULT_API_URL);

    if (!token) {
      console.warn('[Background] No auth token available to sync detected subscriptions');
      clearTimeout(timeoutId);
      finish({ success: false, reason: 'missing_auth_token' });
      return;
    }

    const syncableSubscriptions = Object.values(subscriptions || {}).filter((item) => {
      if (!item || !item.serviceName) return false;
      if (item.markedCancelled) return false;
      return item.approvedForSync === true || item.requiresReview === true || item.source === 'gmail-metadata-approved';
    });

    if (!syncableSubscriptions.length) {
      console.log('[Background] No detected subscriptions to sync.');
      clearTimeout(timeoutId);
      finish({ success: false, reason: 'no_syncable_subscriptions' });
      return;
    }

    const payload = JSON.stringify({
      subscriptions: syncableSubscriptions,
      syncedAt: Date.now()
    });
    console.info('[Background] Gmail review sync endpoint:', `${apiUrl}/api/extension/detected-subscriptions`);
    publishGmailScanEvent('review_queue_sync_started', { count: syncableSubscriptions.length });

    const sendSyncRequest = (activeToken, retried = false) => fetch(`${apiUrl}/api/extension/detected-subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeToken}`
      },
      body: payload,
      keepalive: true
    }).then(async (response) => {
      if (!response.ok) {
        if (response.status === 401) {
          if (retried) {
            console.warn('[Background] Detected-subscription sync remained unauthorized after session refresh.');
            publishGmailScanEvent('review_queue_sync_failed', { reason: 'unauthorized_after_refresh', status: response.status });
            clearTimeout(timeoutId);
            finish({ success: false, reason: 'unauthorized_after_refresh', status: response.status });
            return;
          }
          console.warn('[Background] Refreshing the opaque extension session before retrying detected-subscription sync.');
          refreshOpaqueSessionFromStoredRawToken((refreshed) => {
            if (!refreshed) {
              publishGmailScanEvent('review_queue_sync_failed', { reason: 'session_refresh_failed', status: response.status });
              clearTimeout(timeoutId);
              finish({ success: false, reason: 'session_refresh_failed', status: response.status });
              return;
            }
            browser.storage.local.get(['authToken'], (current) => sendSyncRequest(current.authToken, true));
          });
          return;
        }
        const errorBody = await response.json().catch(() => ({}));
        console.warn('[Background] Failed to sync subscriptions:', response.status, errorBody);
        publishGmailScanEvent('review_queue_sync_failed', {
          status: response.status,
          error: errorBody.error || 'sync_failed',
          details: errorBody.errors,
        });
        clearTimeout(timeoutId);
        finish({ success: false, reason: 'http_error', status: response.status });
        return;
      }
      response.json().catch(() => ({})).then((body) => {
        console.log('[Background] ✅ Subscriptions synced successfully:', body);
        publishGmailScanEvent('review_queue_sync_succeeded', {
          received: body.received,
          persisted: body.persisted,
        });
        clearTimeout(timeoutId);
        finish({ success: true, received: body.received, persisted: body.persisted });
      });
    }).catch((error) => {
      console.error('[Background] Failed to sync subscriptions:', error);
      publishGmailScanEvent('review_queue_sync_failed', { reason: 'network_error' });
      clearTimeout(timeoutId);
      finish({ success: false, reason: 'network_error' });
    });
    sendSyncRequest(token);
  });
}

function requestGuidedCancellation(subscription) {
  return new Promise((resolve) => {
    const guideSlug = CANCELLATION_GUIDES[subscription?.serviceName];
    resolve({
      success: Boolean(guideSlug),
      guideUrl: guideSlug ? `https://subveris.com/${guideSlug}` : null,
      error: guideSlug ? null : 'No cancellation guide is available for this service yet.'
    });
  });
}

function markSubscriptionCancelled(subscriptionId, callback) {
  browser.storage.local.get(['detectedSubscriptions'], (result) => {
    const subscriptions = result.detectedSubscriptions || {};
    const subscription = Object.values(subscriptions).find((item) =>
      item.serviceName === subscriptionId || item.subscriptionId === subscriptionId
    );

    if (!subscription) {
      callback({ success: false, error: 'Subscription not found.' });
      return;
    }

    const key = subscription.serviceName;
    subscriptions[key] = {
      ...subscriptions[key],
      markedCancelled: true,
      markedCancelledAt: Date.now()
    };

    browser.storage.local.set({ detectedSubscriptions: subscriptions }, () => {
      callback(browser.runtime.lastError
        ? { success: false, error: browser.runtime.lastError.message }
        : { success: true, markedCancelledAt: subscriptions[key].markedCancelledAt });
    });
  });
}

function getSubscriptionStatus(callback) {
  browser.storage.local.get(['subscription_status'], (result) => {
    const status = (result.subscription_status || 'free').toLowerCase();
    callback(status);
  });
}

function isTierAllowed(status) {
  return status === 'premium' || status === 'family';
}

function refreshSubscriptionStatus(callback = () => {}) {
  browser.storage.local.get(['authToken', 'supabaseAuthToken', 'subverisApiUrl', 'subscription_status'], (result) => {
    const token = result.authToken;
    const planToken = result.supabaseAuthToken || token;
    const cachedStatus = String(result.subscription_status || 'free').toLowerCase();
    const configuredApiUrl = normalizeApiUrl(result.subverisApiUrl);
    const apiUrls = configuredApiUrl === DEFAULT_API_URL
      ? [DEFAULT_API_URL]
      : [configuredApiUrl, DEFAULT_API_URL];
    if (!token) {
      if (isTierAllowed(cachedStatus)) {
        console.info('[Background] Offline/no session token; preserving cached paid plan:', cachedStatus);
        callback(cachedStatus);
      } else {
        browser.storage.local.set({ subscription_status: 'free', trackingPaused: true }, () => callback('free'));
      }
      return;
    }

    const tryUrl = (index) => {
      fetch(`${apiUrls[index]}/api/user/premium-status`, {
        headers: { Authorization: `Bearer ${planToken}` },
        cache: 'no-store',
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Failed to check subscription plan');
        const planType = String(data.planType || data.plan_type || 'free').toLowerCase();
        const status = String(data.status || 'free').toLowerCase();
        const allowed = (planType === 'premium' || planType === 'family') &&
          (status === 'active' || status === 'trialing');
        const storedStatus = allowed ? planType : 'free';
        browser.storage.local.set({ subscription_status: storedStatus, subverisApiUrl: apiUrls[index] }, () => {
          updateUpgradePrompt(storedStatus);
          callback(storedStatus);
        });
      }).catch((error) => {
        if (index + 1 < apiUrls.length) {
          tryUrl(index + 1);
          return;
        }
        console.warn('[Background] Failed to refresh subscription status:', error);
        if (isTierAllowed(cachedStatus)) {
          console.info('[Background] Offline plan check; preserving cached paid plan:', cachedStatus);
          callback(cachedStatus, error);
        } else {
          callback(null, error);
        }
      });
    };

    tryUrl(0);
  });
}

function updateUpgradePrompt(status) {
  const isFreeTier = !status || status === 'free';
  browser.storage.local.set({
    trackingPaused: isFreeTier,
    upgradePrompt: isFreeTier
      ? 'Upgrade to Premium or Family to unlock browser extension tracking and private-page scanning.'
      : 'Browser extension tracking enabled.'
  }, () => {
    if (browser.runtime.lastError) {
      console.error('[Background] Failed to update upgrade prompt state:', browser.runtime.lastError);
    }
  });
}

function ensureTierAccess(callback) {
  refreshSubscriptionStatus((status) => {
    const allowed = isTierAllowed(status);
    updateUpgradePrompt(status);

    if (!allowed) {
      console.log('[Background] Tracking gated for tier:', status);
      callback(false, status);
      return;
    }

    callback(true, status);
  });
}

function updateZeroUsageSignal(domain, timeSpent, callback) {
  browser.storage.local.get(['usageSignalHistory'], (result) => {
    const history = result.usageSignalHistory || {};
    const domainHistory = Array.isArray(history[domain]) ? history[domain] : [];
    const now = Date.now();
    const cutoff = now - ZERO_USAGE_WINDOW_MS;
    const nextEntry = { timestamp: now, timeSpent };
    const recentEntries = [...domainHistory, nextEntry].filter((entry) => entry.timestamp >= cutoff);
    const hasPositiveUsage = recentEntries.some((entry) => entry.timeSpent > 0);
    const isZeroUsage = timeSpent === 0 && !hasPositiveUsage;

    history[domain] = recentEntries;
    browser.storage.local.set({ usageSignalHistory: history }, () => {
      if (browser.runtime.lastError) {
        console.error('[Background] Failed to persist zero-usage signal history:', browser.runtime.lastError);
      }
      callback(Boolean(isZeroUsage));
    });
  });
}

function runCookieSessionScan() {
  browser.storage.local.get(['authToken', 'subverisApiUrl', 'subscription_status', 'cookieScanCompleted'], (result) => {
    const status = (result.subscription_status || 'free').toLowerCase();

    if (!isTierAllowed(status)) {
      console.log('[Background] Cookie scan skipped for tier:', status);
      return;
    }

    if (result.cookieScanCompleted) {
      console.log('[Background] Cookie scan already completed for this user.');
      return;
    }

    browser.cookies.getAll({}, (cookies) => {
      const domains = [];
      const seenDomains = new Set();
      const keywordPattern = /(sess|auth|uid)/i;

      cookies.forEach((cookie) => {
        const name = cookie.name || '';
        const value = cookie.value || '';
        const hasSessionKeyword = keywordPattern.test(name) || keywordPattern.test(value);

        if (!hasSessionKeyword) {
          return;
        }

        const domain = (cookie.domain || '').replace(/^\./, '').toLowerCase();
        if (domain && !seenDomains.has(domain)) {
          seenDomains.add(domain);
          domains.push(domain);
        }
      });

      browser.storage.local.set({
        cookieScanCompleted: true,
        lastCookieScanAt: Date.now()
      }, () => {
        if (browser.runtime.lastError) {
          console.error('[Background] Failed to persist cookie scan state:', browser.runtime.lastError);
          return;
        }

        if (!domains.length) {
          console.log('[Background] No login-like cookies found for onboarding scan.');
          return;
        }

        const token = result.authToken;
        const apiUrl = result.subverisApiUrl || DEFAULT_API_URL;
        if (!token) {
          console.warn('[Background] No auth token available to sync cookie scan domains.');
          return;
        }

        const payload = JSON.stringify({
          domains,
          source: 'cookie-session-scan',
          scannedAt: Date.now()
        });

        fetch(`${apiUrl}/api/extension/session-scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: payload,
          keepalive: true
        }).then((response) => {
          if (!response.ok) {
            console.warn('[Background] Cookie scan sync returned', response.status, response.statusText);
            return;
          }
          console.log('[Background] ✅ Cookie session scan synced for domains:', domains);
        }).catch((error) => {
          console.error('[Background] Cookie session scan sync failed:', error);
        });
      });
    });
  });
}

function sendUsageTracking(domain, timeSpent, serviceName, serviceUrl, callback = () => {}) {
  ensureTierAccess((allowed) => {
    if (!allowed) {
      console.log('[Background] Usage tracking skipped because the extension is not included in the current plan.');
      callback({ success: false, error: 'An active Premium or Family plan is required.' });
      return;
    }

    updateZeroUsageSignal(domain, timeSpent, (isZeroUsage) => {
      browser.storage.local.get(['authToken', 'supabaseAuthToken', 'subverisApiUrl'], (result) => {
        const token = result.supabaseAuthToken || result.authToken;
        const apiUrl = result.subverisApiUrl || DEFAULT_API_URL;

        if (!token) {
          console.error('[Background] ❌ No auth token found for TRACK_USAGE');
          callback({ success: false, error: 'No authenticated session token found.' });
          return;
        }

        const payload = JSON.stringify({
          domain,
          serviceUrl,
          serviceName,
          timeSpent,
          isZeroUsage,
          rollingWindowDays: 30
        });

        const usageTrackingEndpoints = [
          { key: 'EXTENSION_USAGE_SYNC', url: `${apiUrl}/api/extension/usage-sync` },
          { key: 'LEGACY_TRACK_USAGE', url: `${apiUrl}/api/track-usage-for-all-members` },
          { key: 'TRACK_USAGE_FALLBACK', url: `${apiUrl}/api/track-usage-by-domain` }
        ];

        const tryUsageTrackingEndpoint = (index) => {
          const endpoint = usageTrackingEndpoints[index];
          if (!endpoint) {
            console.warn('[Background] All usage tracking endpoints returned a failure. Skipping tracking silently.');
            callback({ success: false, error: 'Usage tracking unavailable on all configured endpoints.' });
            return;
          }

          fetch(endpoint.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: payload,
            keepalive: true
          }).then((response) => {
            console.log(`[Background] ${endpoint.key} response status:`, response.status);
            if (!response.ok) {
              const isExpectedMissingRoute = response.status === 404;
              const hasMoreEndpoints = index < usageTrackingEndpoints.length - 1;

              if (isExpectedMissingRoute && hasMoreEndpoints) {
                console.warn(`[Background] ${endpoint.key} returned 404; trying the next usage tracking endpoint.`);
                return tryUsageTrackingEndpoint(index + 1);
              }

              if (isExpectedMissingRoute) {
                console.info('[Background] No matching subscription for usage tracking domain; tracking skipped until it is added.');
                callback({ success: true, skipped: true, reason: 'subscription_not_found' });
                return;
              }

              console.warn(`[Background] ${endpoint.key} request failed:`, response.status, response.statusText);
              if (hasMoreEndpoints) {
                return tryUsageTrackingEndpoint(index + 1);
              }
              return callback({ success: false, error: `HTTP ${response.status}` });
            }

            console.log(`[Background] ✅ ${endpoint.key} successful for:`, domain);
            return response.json().then((body) => callback({ success: true, body })).catch(() => callback({ success: true }));
          }).catch((error) => {
            console.warn(`[Background] ${endpoint.key} fetch failed:`, error?.message || error);
            const hasMoreEndpoints = index < usageTrackingEndpoints.length - 1;
            if (hasMoreEndpoints) {
              return tryUsageTrackingEndpoint(index + 1);
            }
            console.error('[Background] Failed all usage tracking fetch attempts:', error);
            callback({ success: false, error: error?.message || 'Usage tracking request failed.' });
          });
        };

        tryUsageTrackingEndpoint(0);
      });
    });
  });
}

function sendUsageTrackingFallback(domain, timeSpent, token, apiUrl, serviceName, serviceUrl, callback = () => {}) {
  const payload = JSON.stringify({
    domain,
    serviceUrl,
    serviceName,
    timeSpent,
    isZeroUsage: false,
    rollingWindowDays: 30
  });
  const url = `${apiUrl}/api/track-usage-by-domain`;

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: payload,
    keepalive: true
  }).then((response) => {
    console.log('[Background] TRACK_USAGE fallback response status:', response.status);
    if (!response.ok) {
      console.error('[Background] TRACK_USAGE fallback request failed:', response.status, response.statusText);
      response.text().then((error) => callback({ success: false, error: error || `HTTP ${response.status}` }));
    } else {
      console.log('[Background] ✅ TRACK_USAGE fallback successful for:', domain);
      response.json().then((body) => callback({ success: true, body })).catch(() => callback({ success: true }));
    }
  }).catch((error) => {
    console.error('[Background] Failed TRACK_USAGE fallback fetch:', error);
    callback({ success: false, error: error.message || 'Usage tracking request failed.' });
  });
}

// Listen for messages from content script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request.type, 'from:', sender.url);

  if (request.type === 'GET_GMAIL_STATUS') {
    browser.storage.local.get(['gmailAuthToken', 'gmailUserUUID', 'supabaseUserUUID'], (result) => {
      const authorized = Boolean(result.gmailAuthToken && result.gmailUserUUID && result.gmailUserUUID === result.supabaseUserUUID);
      sendResponse({ authorized });
    });
    return true;
  }

  if (request.type === 'DISCONNECT_GMAIL') {
    clearGmailAuthorization((success) => {
      sendResponse({ success });
    });
    return true;
  }

  if (request.type === 'GET_AUTH_TOKEN') {
    browser.storage.local.get(['authToken'], (result) => {
      console.log('[Background] Sending auth token:', result.authToken ? 'FOUND' : 'NOT FOUND');
      sendResponse({ token: result.authToken || null });
    });
    return true;
  }

  if (request.type === 'SUBVERIS_AUTH_LOGOUT') {
    browser.storage.local.get(['supabaseUserUUID'], (result) => {
      const currentUserId = result.supabaseUserUUID || null;
      const logoutUserId = request.userId || null;

      if (currentUserId && logoutUserId && currentUserId !== logoutUserId) {
        console.log('[Background] Ignoring stale logout event for different user:', logoutUserId, 'current:', currentUserId);
        sendResponse({ success: true, cleared: false, reason: 'stale-user-logout' });
        return;
      }

      clearStoredAccountState(() => sendResponse({ success: true, cleared: true }));
    });
    return true;
  }

  if (request.type === 'SUBVERIS_AUTH_TOKEN') {
    console.log('[Background] Exchanging raw extension auth token for an opaque session for user:', request.userId);
    const apiUrl = normalizeApiUrl(request.apiUrl);
    const rawToken = request.token;

    if (!rawToken || !request.userId) {
      sendResponse({ success: false, error: 'Missing auth token or user ID' });
      return false;
    }

    const exchangeUrl = `${apiUrl}/api/security/extension-session`;
    clearStateForAccountSwitch(request.userId, () => fetch(exchangeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rawToken}`,
      },
      body: JSON.stringify({ userId: request.userId }),
      keepalive: true,
    }).then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to exchange extension session');
      }

      const sessionId = crypto.randomUUID();
      const csrfToken = crypto.randomUUID();
      const opaqueToken = data.sessionToken || null;

      browser.storage.local.set({
        authToken: opaqueToken,
        supabaseAuthToken: rawToken,
        authSessionId: sessionId,
        authCsrfToken: csrfToken,
        supabaseUserUUID: request.userId,
        subverisApiUrl: apiUrl,
        extensionSessionExpiresAt: data.expiresAt || null,
      }, () => {
        if (browser.runtime.lastError) {
          console.error('[Background] Storage error:', browser.runtime.lastError);
          sendResponse({ success: false, error: browser.runtime.lastError });
        } else {
          console.log('[Background] ✅ Stored opaque extension session token and API URL: User ID =', request.userId, 'apiUrl =', apiUrl);
          refreshSubscriptionStatus((status, statusError) => {
            if (statusError) {
              sendResponse({ success: false, error: 'Could not verify your Subveris plan.' });
              return;
            }
            if (!isTierAllowed(status)) {
              sendResponse({ success: false, error: 'An active Premium or Family plan is required.' });
              return;
            }
            runCookieSessionScan();
            loadKnownSubscriptions();
            // Start Gmail evaluation immediately after the extension session is ready.
            // The scan will report a skipped event when Gmail has not been authorized in the extension.
            scanGmailForSubscriptions(true);
            sendResponse({ success: true, stored: true, sessionId, csrfToken, sessionToken: opaqueToken, status });
          });
        }
      });
    }).catch((error) => {
      console.error('[Background] Failed to exchange raw token for opaque session:', error);
      sendResponse({ success: false, error: error.message || 'Failed to exchange session' });
    }));
    return true;
  }

  if (request.type === 'TRACK_USAGE') {
    console.log('[Background] TRACK_USAGE request for domain:', request.domain, 'timeSpent:', request.timeSpent);
    sendUsageTracking(request.domain, request.timeSpent, request.serviceName, request.serviceUrl, sendResponse);
    return true;
  }

  if (request.type === 'CHECK_SERVICE_SESSION') {
    const domain = String(request.domain || '').replace(/^www\./i, '').toLowerCase();
    if (!domain) {
      sendResponse({ authenticated: false });
      return false;
    }
    browser.cookies.getAll({ domain }, (cookies) => {
      const sessionCookiePattern = /(sess|session|auth|token|login|user|account|sid)/i;
      const authenticated = (cookies || []).some((cookie) => sessionCookiePattern.test(cookie.name || ''));
      sendResponse({ authenticated });
    });
    return true;
  }

  if (request.type === 'DETECT_SUBSCRIPTION') {
    const { serviceName, domain, detectedAt } = request;
    console.log('[Background] Ignoring authenticated-session detection without an existing Subveris subscription:', serviceName);
    ensureTierAccess((allowed, status) => {
      if (!allowed) {
        sendResponse({ success: false, error: `Extension requires an active Premium or Family plan (current: ${status || 'unknown'}).` });
        return;
      }
      sendResponse({ success: false, skipped: true, error: 'An authenticated website session is not proof of a subscription.' });
    });
    return true;
  }

  if (request.type === 'REQUEST_GUIDED_CANCELLATION') {
    requestGuidedCancellation(request.subscription).then(sendResponse);
    return true;
  }

  if (request.type === 'APPROVE_REVIEWED_SUBSCRIPTION') {
    approveReviewedSubscription(request.serviceName, sendResponse);
    return true;
  }

  if (request.type === 'DISMISS_REVIEWED_SUBSCRIPTION') {
    dismissReviewedSubscription(request.serviceName, sendResponse);
    return true;
  }

  if (request.type === 'MARK_SUBSCRIPTION_CANCELLED') {
    markSubscriptionCancelled(request.subscriptionId, sendResponse);
    return true;
  }

  if (request.type === 'PRICE_DISCOVERY') {
    const payload = request.payload || {};

    browser.storage.local.get(['authToken', 'subverisApiUrl', 'supabaseUserUUID'], (result) => {
      const token = result.authToken;
      const apiUrl = result.subverisApiUrl || DEFAULT_API_URL;

      browser.storage.local.set({
        detectedSubscription: payload,
        lastDetectedSubscriptionAt: Date.now()
      }, () => {
        if (browser.runtime.lastError) {
          console.error('[Background] Failed to store detected subscription:', browser.runtime.lastError);
          sendResponse({ success: false, error: browser.runtime.lastError });
          return;
        }

        if (!token) {
          console.warn('[Background] Skipped syncing detected subscription because no auth token was available.');
          sendResponse({ success: true, stored: true, synced: false });
          return;
        }

        const syncPayload = {
          ...payload,
          authToken: token,
          userId: result.supabaseUserUUID || null,
          rollingWindowDays: 30,
        };

        fetch(`${apiUrl}/api/extension/usage-sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(syncPayload),
          keepalive: true
        }).then((response) => {
          console.log('[Background] Discovery sync response status:', response.status);
          if (!response.ok) {
            console.warn('[Background] Discovery sync failed:', response.status, response.statusText);
            sendResponse({ success: true, stored: true, synced: false, status: response.status });
            return;
          }

          response.json().catch(() => ({})).then((body) => {
            console.log('[Background] Discovery sync success:', body);
            sendResponse({ success: true, stored: true, synced: true, body });
          });
        }).catch((error) => {
          console.error('[Background] Discovery sync request failed:', error);
          sendResponse({ success: true, stored: true, synced: false, error: String(error) });
        });
      });
    });
    return true;
  }

  if (request.type === 'authorizeGmail') {
    // Attempt Gmail authorization via backend OAuth endpoint
      browser.storage.local.get(['authToken', 'supabaseAuthToken', 'subverisApiUrl', 'supabaseUserUUID'], (result) => {
        const token = result.supabaseAuthToken || result.authToken;
      const apiUrl = result.subverisApiUrl || DEFAULT_API_URL;

      if (!token || !result.supabaseUserUUID) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      // Request OAuth URL from backend
      const redirectUri = typeof browser.identity?.getRedirectURL === 'function'
        ? browser.identity.getRedirectURL()
        : null;
      if (!redirectUri) {
        sendResponse({ success: false, error: 'This extension did not provide an OAuth redirect URI. Reload the installed extension and try again.' });
        return;
      }

      const oauthUrlRequest = `${apiUrl}/api/auth/gmail-oauth-url?redirect_uri=${encodeURIComponent(redirectUri)}`;
      console.info('[Background] Requesting Gmail OAuth consent flow', { redirectUri });
      fetch(oauthUrlRequest, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }).then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.error || `Gmail OAuth URL request failed (HTTP ${response.status})`);
        }
        if (!data.oauthUrl) {
          throw new Error('No OAuth URL from backend');
        }
        const authorizationUrl = new URL(data.oauthUrl);
        const oauthClientId = authorizationUrl.searchParams.get('client_id');
        const oauthRedirectUri = authorizationUrl.searchParams.get('redirect_uri');
        if (authorizationUrl.origin !== 'https://accounts.google.com' || !oauthClientId || !oauthRedirectUri) {
          throw new Error('The backend returned an invalid Google OAuth URL. Check the deployed Google OAuth client configuration.');
        }
        if (oauthRedirectUri !== redirectUri) {
          throw new Error(`OAuth callback mismatch: extension requested ${redirectUri}, but backend returned ${oauthRedirectUri}.`);
        }
        console.info('[Background] Launching Google OAuth', { clientId: oauthClientId, redirectUri: oauthRedirectUri });

        // Open OAuth URL in a new window
        browser.identity.launchWebAuthFlow({
          url: data.oauthUrl,
          interactive: true
        }, (redirectUrl) => {
          const launchError = browser.runtime.lastError;
          if (!redirectUrl) {
            const runtimeMessage = launchError?.message || 'OAuth flow ended without a callback';
            const errorMessage = /authorization page could not be loaded/i.test(runtimeMessage)
              ? `Google could not load OAuth client ${oauthClientId} with callback ${oauthRedirectUri}. Confirm this exact callback is authorized on that client and that the OAuth client is enabled.`
              : runtimeMessage;
            const userDidNotApprove = /did not approve|access was denied|cancelled|canceled|aborted/i.test(errorMessage);
            if (userDidNotApprove) {
              console.info('[Background] Gmail OAuth was not completed because access was not approved.');
              sendResponse({
                success: false,
                cancelled: true,
                error: 'Gmail access was not approved. Select Allow on the Google consent screen to connect Gmail.'
              });
            } else {
              console.error('[Background] Gmail OAuth did not return a callback:', errorMessage);
              sendResponse({ success: false, error: errorMessage });
            }
            return;
          }

          // Extract authorization code from redirect URL
          try {
            const url = new URL(redirectUrl);
            const oauthError = url.searchParams.get('error');
            if (oauthError) {
              const errorDescription = url.searchParams.get('error_description') || oauthError;
              console.error('[Background] Gmail OAuth provider error:', errorDescription);
              sendResponse({ success: false, error: errorDescription });
              return;
            }
            const code = url.searchParams.get('code');
            
            if (!code) {
              sendResponse({ success: false, error: 'No auth code received' });
              return;
            }

            // Exchange code for token via backend
            fetch(`${apiUrl}/api/auth/gmail-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ code, redirect_uri: redirectUri })
            }).then(r => r.json()).then(tokenData => {
              if (!tokenData.access_token) {
                throw new Error('No access token received');
              }

              // Store Gmail token
              browser.storage.local.set({
                gmailAuthToken: tokenData.access_token,
                gmailTokenExpiry: Date.now() + (tokenData.expires_in * 1000),
                gmailUserUUID: result.supabaseUserUUID,
                gmailReauthorizationRequired: false,
              }, () => {
                console.log('[Background] ✅ Gmail authorized successfully');
                scanGmailForSubscriptions(true);
                sendResponse({ success: true });
              });
            }).catch(err => {
              console.error('[Background] Token exchange failed:', err);
              sendResponse({ success: false, error: err.message });
            });
          } catch (err) {
            console.error('[Background] OAuth flow error:', err);
            sendResponse({ success: false, error: err.message });
          }
        });
      }).catch(err => {
        console.error('[Background] OAuth URL request failed:', err);
        sendResponse({ success: false, error: err.message });
      });
    });
    return true;
  }

  console.log('[Background] Unknown message type:', request.type);
});

// Email scanning: detect subscription receipts from Gmail
function getGmailMessageAgeDays(msgData) {
  const rawInternalDate = msgData?.internalDate;
  const headerDate = msgData?.payload?.headers?.find((header) => header.name?.toLowerCase() === 'date')?.value;
  const rawDate = rawInternalDate || headerDate;

  if (!rawDate) {
    return null;
  }

  const ms = Number(rawDate);
  const timestamp = Number.isFinite(ms) ? ms : Date.parse(rawDate);

  if (!Number.isFinite(timestamp)) {
    return null;
  }

  return Math.floor((Date.now() - timestamp) / 86400000);
}

function extractGmailAmount(text) {
  if (!text) {
    return null;
  }

  const numberPattern = String.raw`((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?)`;
  const leadingCurrencyMatch = text.match(/(?:[$€£¥]\s*|\b(?:USD|EUR|GBP|CAD|AUD|NZD|JPY|CHF)\s*)((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?)/i);
  const trailingCurrencyMatch = text.match(/((?:\d{1,3}(?:[.,]\d{3})+|\d+)(?:[.,]\d{1,2})?)\s*(?:[$€£¥]|\b(?:USD|EUR|GBP|CAD|AUD|NZD|JPY|CHF)\b)/i);
  const labeledMatch = text.match(new RegExp(`(?:amount(?:\\s+(?:due|paid|charged))?|total(?:\\s+(?:due|paid))?|subtotal|price|cost|fee|charged|charge|paid|payment(?:\\s+(?:of|for))?)[^\\d]{0,12}${numberPattern}`, 'i'));
  const rawValue = leadingCurrencyMatch?.[1] || trailingCurrencyMatch?.[1] || labeledMatch?.[1];
  if (!rawValue) return null;

  let normalized = rawValue;
  if (normalized.includes(',') && normalized.includes('.')) {
    const decimalSeparator = normalized.lastIndexOf(',') > normalized.lastIndexOf('.') ? ',' : '.';
    const thousandsSeparator = decimalSeparator === ',' ? '.' : ',';
    normalized = normalized.replaceAll(thousandsSeparator, '').replace(decimalSeparator, '.');
  } else if (normalized.includes(',')) {
    const decimalDigits = normalized.length - normalized.lastIndexOf(',') - 1;
    normalized = decimalDigits > 0 && decimalDigits <= 2
      ? normalized.replace(',', '.')
      : normalized.replace(/,/g, '');
  } else if (normalized.includes('.')) {
    const decimalDigits = normalized.length - normalized.lastIndexOf('.') - 1;
    if (decimalDigits > 2) normalized = normalized.replace(/\./g, '');
  } else {
  }
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : null;
}

function extractGmailRenewalDate(text) {
  if (!text) {
    return null;
  }

  const datePatterns = [
    /(\d{1,2}[-/\s]\d{1,2}[-/\s]\d{2,4})/g,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})/g,
    /(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/gi,
    /(renew(?:al|s)?|billing|next charge|expires?)[^\d]{0,20}(\d{1,2}[-/\s]\d{1,2}[-/\s]\d{2,4})/gi,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (!match || !match[0]) continue;

    const candidateText = match[0];
    const namedMonthMatch = candidateText.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(\d{4})/i);
    if (namedMonthMatch) {
      const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
      const month = String(months.indexOf(namedMonthMatch[1].toLowerCase()) + 1).padStart(2, '0');
      const day = namedMonthMatch[2].padStart(2, '0');
      return `${namedMonthMatch[3]}-${month}-${day}`;
    }
    const parsed = new Date(candidateText.replace(/\s+/g, ' '));
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }
  }

  return null;
}

function decodeGmailBody(data) {
  if (!data) return '';
  try {
    const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch (error) {
    console.warn('[Background] Could not decode Gmail body part:', error);
    return '';
  }
}

function extractGmailBody(payload) {
  if (!payload || payload.filename) return '';
  const parts = Array.isArray(payload.parts) ? payload.parts : [];
  const mimeType = String(payload.mimeType || '').toLowerCase();
  const decodedBody = mimeType.startsWith('text/') && payload.body?.data
    ? decodeGmailBody(payload.body.data)
    : '';
  const ownBody = mimeType === 'text/html'
    ? decodedBody
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>|<\/(?:p|div|tr|li)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
    : decodedBody;
  const childBodies = parts.map((part) => extractGmailBody(part)).filter(Boolean).join('\n');
  return [ownBody, childBodies].filter(Boolean).join('\n');
}
globalThis.extractGmailBody = extractGmailBody;

function inferGmailServiceName(subject, from, messageText = '') {
  const genericSenderNames = /^(?:a|an|account|accounts|billing|customer service|example|help|info|mail|mailer|membership|member services|no[ -]?reply|notification|notifications|noreply|our|payment|payments|receipt|receipts|service|services|support|team|test|test account|test user|the|update|updates|your)$/i;
  const cleanName = (value) => {
    const cleaned = String(value || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/["'<>]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\s+(?:billing|customer service|notifications?|no[ -]?reply|payments?|receipts?|services?|support|team|updates?)\s*$/i, '')
      .replace(/^[\s:,-]+|[\s:,-]+$/g, '')
      .trim();
    const genericProviderPhrase = /^(?:example|subscription|membership|plan|monthly|annual|yearly|billing|payment|receipt|invoice|renewal|renewed|test)\b/i;
    return cleaned && !genericSenderNames.test(cleaned) && !genericProviderPhrase.test(cleaned) ? cleaned : null;
  };

  const displayNameMatch = String(from || '').match(/^\s*(?:"([^"]+)"|([^<]+))\s*</);
  const displayName = cleanName(displayNameMatch?.[1] || displayNameMatch?.[2]);
  if (displayName) return displayName;

  const emailMatch = String(from || '').match(/<[^@>]+@([^>]+)>|\b[^\s@]+@([^\s>]+)\b/);
  const senderDomain = (emailMatch?.[1] || emailMatch?.[2] || '').toLowerCase();
  const senderAddress = String(from || '').match(/<([^@>]+)@[^>]+>|\b([^\s@<>]+)@[^\s@<>]+/);
  const senderLocalPart = (senderAddress?.[1] || senderAddress?.[2] || '').toLowerCase();
  const personalEmailDomains = new Set(['gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'yahoo.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com']);
  if (senderLocalPart && !personalEmailDomains.has(senderDomain)) {
    const ignoredLocalTokens = new Set([
      'account', 'accounts', 'alert', 'alerts', 'auto', 'billing', 'bot', 'contact', 'customer', 'donotreply',
      'email', 'help', 'info', 'invoice', 'mail', 'mailer', 'marketing', 'member', 'membership', 'message', 'news', 'newsletter', 'no', 'noreply',
      'notification', 'notifications', 'notify', 'order', 'payment', 'payments', 'receipt', 'receipts', 'renewal',
      'service', 'services', 'support', 'team', 'update', 'updates', 'verify',
    ]);
    const localName = senderLocalPart
      .replace(/\d+/g, '')
      .split(/[._+-]+/)
      .filter((token) => token && !ignoredLocalTokens.has(token))
      .join(' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    const cleanedLocalName = cleanName(localName);
    if (cleanedLocalName) return cleanedLocalName;
  }

  const ignoredDomainLabels = new Set([
    'account', 'accounts', 'alert', 'alerts', 'app', 'apps', 'billing', 'email', 'info', 'mail', 'mailer', 'marketing',
    'member', 'members', 'membership', 'message', 'messages', 'noreply', 'notify', 'notification', 'notifications',
    'news', 'newsletter', 'newsletters', 'payments', 'receipt', 'receipts', 'service', 'services', 'support', 'team', 'update', 'updates', 'www',
    'com', 'net', 'org', 'edu', 'gov', 'co', 'uk', 'us', 'ca', 'au', 'de', 'fr', 'nl', 'io', 'app', 'cloud',
    'gmail', 'google', 'outlook', 'hotmail', 'yahoo', 'example', 'test',
  ]);
  const domainLabel = senderDomain.split('.').reverse().find((label) => !ignoredDomainLabels.has(label));
  if (domainLabel) {
    const domainName = domainLabel.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
    const cleanedDomainName = cleanName(domainName);
    if (cleanedDomainName) return cleanedDomainName;
  }

  const normalizedSubject = String(subject || '').replace(/^\s*[#*]+\s*/, '').trim();
  const subjectProviderMatch = normalizedSubject.match(/^([A-Z][A-Za-z0-9&.'’ -]{1,40}?)\s+(?:renewal|subscription|membership|plan)\b/i);
  const subjectProvider = cleanName(subjectProviderMatch?.[1]);
  if (subjectProvider && !/^(?:your|the|a|an|test|example)\b/i.test(subjectProvider)) return subjectProvider;

  const text = `${subject || ''}\n${messageText || ''}`;
  const providerPatterns = [
    /\b(?:service|merchant|vendor|provider|brand|product|subscription|membership|plan)(?:\s+name)?\s*[:#=-]\s*([^\n,;]{2,60})/i,
    /\b(?:you(?:'re| are) subscribed to|subscribed to|thanks for subscribing to|subscription for|membership with|service from|payment to)\s+([A-Z][A-Za-z0-9&.'’ -]{1,40}?)(?=\s+(?:has|is|was|will|renews?|renewed|renewal|charged|billed|payment|for|on)\b|[.,;:!?]|$)/i,
    /\b(?:your|the)\s+(?!subscription\b|membership\b|plan\b)([A-Z][A-Za-z0-9&.'’ -]{1,40}?)\s+(?:subscription|membership|plan)\b/i,
    /(?:^|[\n#*])\s*([A-Z][A-Za-z0-9&.'’ -]{1,40}?)\s+(?:renewal|subscription|membership|plan)\b/i,
    /\b(?:subscription|membership|plan)\s+(?:from|for|with|at)\s+([A-Z][A-Za-z0-9&.'’ -]{1,40}?)(?=\s+(?:is|was|has|will|renews?|renewed|renewing|expires?|charged|billed|payment|for|on)\b|[.,;:!?]|$)/i,
    /\b(?:welcome to|thanks for choosing|thank you for choosing|receipt from|payment to)\s+([A-Z][A-Za-z0-9&.'’ -]{1,40}?)(?=[.,;:!?]|\s+(?:account|subscription|membership|plan)\b|$)/i,
    /\b(?:from|at|with)\s+([A-Z][A-Za-z0-9&.'’ -]{2,40}?)(?=\s+(?:subscription|membership|plan|receipt|invoice|payment|renewal)\b|[.,;:!?]|$)/i,
  ];
  for (const pattern of providerPatterns) {
    const match = text.match(pattern);
    const inferredName = cleanName(match?.[1]);
    if (inferredName) return inferredName;
  }

  return 'Unrecognized subscription';
}

function getGmailSenderDomain(from) {
  const emailMatch = String(from || '').match(/<[^@>]+@([^>]+)>|\b[^\s@]+@([^\s>]+)\b/);
  return (emailMatch?.[1] || emailMatch?.[2] || '').toLowerCase();
}

function buildGmailMessageFullUrl(messageId) {
  const url = new URL(`https://www.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}`);
  url.searchParams.set('format', 'full');
  return url.toString();
}

globalThis.buildGmailMessageFullUrl = buildGmailMessageFullUrl;
function isGmailReadOnlyScopeError(status, reason, message) {
  return Number(status) === 403 && /scope|insufficient\s+(?:authentication|permissions?)/i.test(`${reason || ''} ${message || ''}`);
}

globalThis.isGmailReadOnlyScopeError = isGmailReadOnlyScopeError;

function buildGmailSubscriptionCandidate(subject, from, snippet, msgData, onRejected = () => {}) {
  const reject = (reason) => {
    onRejected(reason);
    return null;
  };
  const fullText = `${subject || ''} ${from || ''} ${snippet || ''}`.trim();
  if (!fullText) {
    return reject('empty_metadata');
  }

  const senderDomain = getGmailSenderDomain(from);
  const lowerSubject = String(subject || '').toLowerCase();
  const lowerSnippet = String(snippet || '').toLowerCase();
  if (senderDomain === 'subveris.com') {
    return reject('internal_sender');
  }

  const servicePatterns = {
    Netflix: ['netflix', 'netflix subscription charge'],
    'Spotify Premium': ['spotify', 'spotify premium membership'],
    'Amazon Prime': ['amazon prime', 'prime membership'],
    'Disney Plus': ['disney', 'disneyplus', 'disney+'],
    'YouTube Premium': ['youtube premium'],
    'HBO Max': ['hbo', 'hbomax'],
    Hulu: ['hulu'],
    'Apple Music': ['apple music', 'itunes'],
    'Microsoft 365': ['microsoft 365', 'office 365'],
    Adobe: ['adobe', 'creative cloud'],
    Dropbox: ['dropbox'],
    OneDrive: ['onedrive'],
    iCloud: ['icloud'],
    'LinkedIn Premium': ['linkedin premium', 'linkedin plus'],
    'Tinder Gold': ['tinder gold', 'tinder'],
    Uber: ['uber', 'pass'],
    DoorDash: ['doordash'],
    Audible: ['audible', 'audiobook'],
    Coursera: ['coursera', 'plus'],
    MasterClass: ['masterclass'],
    'Duolingo Plus': ['duolingo'],
    'HelloFresh': ['hellofresh', 'meal plan'],
    NordVPN: ['nordvpn'],
    ExpressVPN: ['expressvpn'],
    Grammarly: ['grammarly'],
    Slack: ['slack'],
    Zoom: ['zoom'],
    Asana: ['asana'],
    Notion: ['notion'],
    'Canva Pro': ['canva pro', 'canva'],
    Figma: ['figma'],
    Discord: ['discord', 'nitro'],
    'Twitch Prime': ['twitch prime', 'twitch'],
    'PlayStation Plus': ['playstation plus', 'playstation'],
    'Xbox Game Pass': ['xbox game pass', 'xbox live', 'xbox'],
    'Nintendo Switch Online': ['nintendo switch online'],
    Calm: ['calm'],
    Headspace: ['headspace'],
    Peloton: ['peloton'],
    Fitbit: ['fitbit'],
    ClassPass: ['classpass'],
    Scribd: ['scribd'],
    'Kindle Unlimited': ['kindle unlimited'],
  };

  let serviceName = null;
  let isKnownServiceName = false;
  let matchedPatterns = [];
  let snippetServiceName = null;
  let snippetMatchedPatterns = [];
  for (const [name, patterns] of Object.entries(servicePatterns)) {
    const strongMatches = patterns.filter((pattern) => {
      const normalizedPattern = pattern.toLowerCase();
      return lowerSubject.includes(normalizedPattern)
        || senderDomain.includes(normalizedPattern.replace(/\s+/g, ''));
    });
    if (strongMatches.length) {
      serviceName = name;
      isKnownServiceName = true;
      matchedPatterns = strongMatches;
      break;
    }

    const snippetMatches = patterns.filter((pattern) => lowerSnippet.includes(pattern.toLowerCase()));
    if (!snippetServiceName && snippetMatches.length) {
      snippetServiceName = name;
      snippetMatchedPatterns = snippetMatches;
    }
  }
  let explicitlyInferredServiceName = false;
  if (!serviceName) {
    const inferredServiceName = inferGmailServiceName(subject, from, fullText);
    if (inferredServiceName !== 'Unrecognized subscription') {
      serviceName = inferredServiceName;
      explicitlyInferredServiceName = true;
    } else if (snippetServiceName) {
      serviceName = snippetServiceName;
      isKnownServiceName = true;
      matchedPatterns = snippetMatchedPatterns;
    }
  }

  const amount = extractGmailAmount(fullText);
  const renewalDate = extractGmailRenewalDate(fullText);
  const hasSubscriptionLifecycleSignal = /\b(?:subscription|membership|plan)\b.{0,50}\b(?:renew(?:ed|ing|s)?|payment|charge|invoice|receipt|billing|billed|active|expires?|continues|monthly|annual|yearly|trial ends?)\b|\b(?:recurring payment|next billing|renewal (?:notice|confirmation|payment|invoice|completed|complete))\b/i.test(fullText);
  const hasBillingSignal = /receipt|invoice|renewal|billing|charge|subscription|membership|payment/i.test(fullText)
    || hasSubscriptionLifecycleSignal;
  const senderMatchesService = Boolean(serviceName && matchedPatterns.some((pattern) => senderDomain.includes(pattern.toLowerCase().replace(/\s+/g, ''))));
  const subjectMatchesService = Boolean(serviceName && matchedPatterns.some((pattern) => lowerSubject.includes(pattern.toLowerCase())));
  const hasFinancialEvidence = amount !== null || renewalDate !== null;
  const hasStrongContext = senderMatchesService || subjectMatchesService;
  const snippetMatchesService = Boolean(serviceName && matchedPatterns.some((pattern) => lowerSnippet.includes(pattern.toLowerCase())));
  const hasExplicitProviderName = explicitlyInferredServiceName;
  if (!serviceName && (!hasBillingSignal || (amount === null && renewalDate === null && !hasSubscriptionLifecycleSignal))) {
    return reject(!hasBillingSignal ? 'unrecognized_service_without_billing_signal' : 'unrecognized_service_without_billing_or_lifecycle_evidence');
  }
  const hasInsufficientProviderEvidence = hasExplicitProviderName
    ? !hasFinancialEvidence && !hasSubscriptionLifecycleSignal
    : !hasStrongContext && (!snippetMatchesService || !hasFinancialEvidence);
  if (serviceName && (!hasBillingSignal || hasInsufficientProviderEvidence)) {
    return reject(!hasBillingSignal ? 'service_match_without_billing_signal' : 'insufficient_service_evidence');
  }

  const detectedServiceName = serviceName || inferGmailServiceName(subject, from, fullText);

  return {
    serviceName: detectedServiceName,
    domain: null,
    amount,
    currency: 'USD',
    frequency: 'monthly',
    status: 'active',
    detectedRenewalDate: renewalDate,
    requiresReview: true,
    isDetectedCandidate: true,
    source: isKnownServiceName ? 'gmail-metadata-candidate' : 'gmail-inferred-review-candidate',
    detectedAt: Date.now(),
    lastSeen: Date.now(),
    messageAgeDays: getGmailMessageAgeDays(msgData),
  };
}

globalThis.buildGmailSubscriptionCandidate = buildGmailSubscriptionCandidate;
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildGmailSubscriptionCandidate };
}

function publishGmailScanEvent(event, details = {}) {
  if (!browser.tabs?.query || !browser.tabs?.sendMessage) {
    return;
  }

  browser.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      if (!tab.id) return;
      browser.tabs.sendMessage(tab.id, {
        type: 'GMAIL_SCAN_EVENT',
        event,
        details,
      }, () => {
        // Tabs without the content script are expected to reject this message.
        if (browser.runtime.lastError) return;
      });
    });
  });
}

function refreshGmailTokenForAccount(userId, callback) {
  browser.storage.local.get(['authToken', 'supabaseAuthToken', 'supabaseUserUUID', 'subverisApiUrl'], (state) => {
    const authToken = state.supabaseAuthToken || state.authToken;
    if (!userId || state.supabaseUserUUID !== userId || !authToken) {
      callback(null);
      return;
    }

    const apiUrl = normalizeApiUrl(state.subverisApiUrl || DEFAULT_API_URL);
    fetch(`${apiUrl}/api/auth/gmail-refresh`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${authToken}` },
    }).then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.access_token) {
        throw new Error(body.error || 'Gmail reauthorization required');
      }
      return body;
    }).then((body) => {
      browser.storage.local.set({
        gmailAuthToken: body.access_token,
        gmailTokenExpiry: Date.now() + Number(body.expires_in || 3600) * 1000,
        gmailUserUUID: userId,
      }, () => {
        if (browser.runtime.lastError) {
          callback(null);
          return;
        }
        publishGmailScanEvent('authorization_restored');
        callback(body.access_token);
      });
    }).catch((error) => {
      console.info('[Background] Gmail authorization could not be restored automatically:', error.message);
      clearGmailAuthorization(() => {
        publishGmailScanEvent('reauthorization_required', { reason: 'token_refresh_failed' });
        callback(null);
      });
    });
  });
}

function scanGmailForSubscriptions(force = false) {
  browser.storage.local.get(['gmailAuthToken', 'gmailUserUUID', 'supabaseUserUUID', 'lastGmailScan', 'subscription_status', 'detectedSubscriptions', 'gmailReauthorizationRequired'], (result) => {
    publishGmailScanEvent('started', { forced: force });
    if (result.gmailReauthorizationRequired) {
      publishGmailScanEvent('reauthorization_required', { reason: 'gmail_readonly_scope_required' });
      return;
    }
    if (!isTierAllowed(String(result.subscription_status || 'free').toLowerCase())) {
      console.log('[Background] Gmail scanning requires Premium or Family plan');
      publishGmailScanEvent('skipped', { reason: 'plan_required' });
      return;
    }
    const token = result.gmailAuthToken;
    if (!token) {
      refreshGmailTokenForAccount(result.supabaseUserUUID, (restoredToken) => {
        if (restoredToken) {
          scanGmailForSubscriptions(force);
        } else {
          console.log('[Background] Gmail not authorized, skipping email scan');
          publishGmailScanEvent('skipped', { reason: 'gmail_not_authorized' });
        }
      });
      return;
    }
    if (!result.gmailUserUUID || result.gmailUserUUID !== result.supabaseUserUUID) {
      console.warn('[Background] Gmail authorization does not match the signed-in account; skipping email scan.');
      publishGmailScanEvent('skipped', { reason: 'gmail_account_mismatch' });
      return;
    }

    const lastScan = result.lastGmailScan || 0;
    if (!force && Date.now() - lastScan < 60 * 60 * 1000) {
      console.log('[Background] Gmail scan skipped because it was run within the last hour');
      publishGmailScanEvent('skipped', { reason: 'recent_scan' });
      return;
    }

    // Read the newest message IDs, then filter message content locally.
    const scanWithToken = (activeToken, refreshAttempted = false) => fetch('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=10', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${activeToken}`,
        'Accept': 'application/json'
      }
    }).then(async (response) => {
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}));
          const error = new Error(errorBody.error?.message || `Gmail API returned ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return response.json();
      })
      .then(data => {
        publishGmailScanEvent('messages_found', { count: data.messages?.length || 0 });
        if (!data.messages || data.messages.length === 0) {
          console.log('[Background] No new emails matching subscription patterns');
          publishGmailScanEvent('completed', { processed: 0, candidates: 0 });
          return;
        }

        const detectedSubs = {};
        let processedCount = 0;
        let candidateCount = 0;
        let noServiceMatchCount = 0;
        let rejectedMessageCount = 0;
        const candidateRejections = {};
        let staleOrDuplicateCount = 0;
        let failedMessageCount = 0;
        const messageFailuresByStatus = {};
        let requiresGmailReauthorization = false;
        const seenCandidateServices = new Set();
        let scanFinalized = false;

        const finalizeGmailScan = () => {
          if (scanFinalized || processedCount + failedMessageCount < data.messages.length) return;
          scanFinalized = true;
          try {
            browser.storage.local.get(['detectedSubscriptions'], (existing = {}) => {
              try {
                const existingSubscriptions = existing.detectedSubscriptions || {};
                const retained = Object.fromEntries(Object.entries(existingSubscriptions).filter(([serviceName, item]) => {
                  const isGmailReviewItem = item?.source === 'gmail-metadata-candidate' || item?.source === 'gmail-inferred-review-candidate';
                    // Keep pending items when this scan sees the same candidate again.
                    // Deduplication must not remove the item before it is synced to the web queue.
                    return !isGmailReviewItem || Boolean(detectedSubs[serviceName]) || item?.requiresReview === true;
                }));
                const merged = { ...retained, ...detectedSubs };
                browser.storage.local.set({ detectedSubscriptions: merged, lastGmailScan: Date.now() }, () => {
                  if (browser.runtime.lastError) {
                    publishGmailScanEvent('failed', { reason: 'review_queue_persist_failed' });
                    return;
                  }
                  syncDetectedSubscriptions(merged, (syncResult) => {
                    if (syncResult.success) {
                      publishGmailScanEvent('review_queue_synced', {
                        pending: candidateCount,
                        received: syncResult.received,
                        persisted: syncResult.persisted,
                      });
                    }
                    publishGmailScanEvent('completed', {
                      processed: processedCount,
                      failedMessages: failedMessageCount,
                      candidates: candidateCount,
                      noServiceMatch: noServiceMatchCount,
                      rejectedMessages: rejectedMessageCount,
                      candidateRejections,
                      staleOrDuplicate: staleOrDuplicateCount,
                      messageFailuresByStatus,
                      pendingApproval: true,
                      sync: syncResult,
                    });
                  });
                });
              } catch (error) {
                console.error('[Background] Failed to finalize Gmail scan:', error);
                publishGmailScanEvent('failed', { reason: 'scan_finalize_failed' });
              }
            });
          } catch (error) {
            console.error('[Background] Failed to access extension storage while finalizing Gmail scan:', error);
            publishGmailScanEvent('failed', { reason: 'scan_finalize_failed' });
          }
        };

        const messageQueue = [...(data.messages || [])];
        let messageIndex = 0;

        const processNextMessage = () => {
          if (requiresGmailReauthorization) {
            const remainingMessages = messageQueue.length - messageIndex;
            failedMessageCount += remainingMessages;
            if (remainingMessages > 0) {
              messageFailuresByStatus['403'] = (messageFailuresByStatus['403'] || 0) + remainingMessages;
            }
            finalizeGmailScan();
            return;
          }
          if (messageIndex >= messageQueue.length) {
            finalizeGmailScan();
            return;
          }

          const msg = messageQueue[messageIndex++];

          fetch(buildGmailMessageFullUrl(msg.id), {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${activeToken}`,
              'Accept': 'application/json'
            }
          }).then(async (response) => {
            if (!response.ok) {
              const errorBody = await response.json().catch(() => ({}));
              const statusError = new Error(errorBody.error?.message || `Gmail message API returned ${response.status}`);
              statusError.status = response.status;
              statusError.reason = errorBody.error?.errors?.[0]?.reason || null;
              throw statusError;
            }
            return response.json();
          })
            .then(msgData => {
              processedCount++;
              const subject = msgData.payload?.headers?.find(h => h.name?.toLowerCase() === 'subject')?.value || '';
              const from = msgData.payload?.headers?.find(h => h.name?.toLowerCase() === 'from')?.value || '';
              const messageContent = `${subject} ${from} ${msgData.snippet || ''} ${extractGmailBody(msgData.payload)}`;

              let rejectionReason = null;
              const candidate = buildGmailSubscriptionCandidate(subject, from, messageContent, msgData, (reason) => {
                rejectionReason = reason;
              });
              if (candidate) {
                const duplicateInScan = seenCandidateServices.has(candidate.serviceName.toLowerCase());
                if (!duplicateInScan) {
                  seenCandidateServices.add(candidate.serviceName.toLowerCase());
                  const ageInDays = candidate.messageAgeDays;
                  const existingSubs = result.detectedSubscriptions || {};
                  const duplicate = Object.values(existingSubs).find((sub) =>
                    sub && sub.serviceName && String(sub.serviceName).toLowerCase() === candidate.serviceName.toLowerCase() &&
                    !sub.markedCancelled
                  );

                  if (ageInDays === null || ageInDays > 90) {
                    staleOrDuplicateCount++;
                    console.log('[Background] Gmail candidate skipped as stale or duplicate:', candidate.serviceName, {
                      ageInDays,
                      duplicate: false,
                    });
                    publishGmailScanEvent('candidate_skipped', { reason: 'stale_or_missing_date', serviceName: candidate.serviceName });
                  } else if (duplicate && duplicate.requiresReview === true) {
                    candidateCount++;
                    detectedSubs[duplicate.serviceName] = mergePendingGmailCandidate(duplicate, candidate);
                    publishGmailScanEvent('candidate_updated', {
                      serviceName: candidate.serviceName,
                      amount: detectedSubs[duplicate.serviceName].amount,
                      detectedRenewalDate: detectedSubs[duplicate.serviceName].detectedRenewalDate,
                      requiresReview: true,
                    });
                  } else if (duplicate) {
                    staleOrDuplicateCount++;
                    publishGmailScanEvent('candidate_skipped', { reason: 'duplicate', serviceName: candidate.serviceName });
                  } else {
                    candidateCount++;
                    detectedSubs[candidate.serviceName] = {
                      ...candidate,
                      serviceName: candidate.serviceName,
                      domain: candidate.domain || null,
                      requiresReview: true,
                      approvedForSync: false,
                      isDetectedCandidate: true,
                    };
                    console.log('[Background] ✅ Suggested Gmail candidate pending approval:', candidate.serviceName, {
                      ageInDays,
                      amount: candidate.amount,
                      detectedRenewalDate: candidate.detectedRenewalDate,
                      requiresReview: true,
                    });
                    publishGmailScanEvent('candidate_found', {
                      serviceName: candidate.serviceName,
                      amount: candidate.amount,
                      currency: candidate.currency,
                      detectedRenewalDate: candidate.detectedRenewalDate,
                      requiresReview: true,
                    });
                  }
                }
              } else {
                rejectedMessageCount++;
                const reason = rejectionReason || 'unknown_rejection';
                candidateRejections[reason] = (candidateRejections[reason] || 0) + 1;
                if (reason.startsWith('unrecognized_service')) noServiceMatchCount++;
                publishGmailScanEvent('candidate_rejected', { reason });
              }

              setTimeout(processNextMessage, 150);
            }).catch(err => {
              failedMessageCount++;
              const status = Number(err?.status || 0);
              const statusKey = status ? String(status) : 'unknown';
              messageFailuresByStatus[statusKey] = (messageFailuresByStatus[statusKey] || 0) + 1;
              const errorMessage = String(err?.message || err || '');
              const scopeDenied = isGmailReadOnlyScopeError(status, err?.reason, errorMessage);
              const failureReason = scopeDenied ? 'gmail_readonly_scope_required' : status === 403 ? 'gmail_message_forbidden' : status === 401 ? 'gmail_authorization_expired' : 'gmail_message_unavailable';
              publishGmailScanEvent('message_fetch_failed', {
                status: status || null,
                reason: failureReason,
                requiresReauthorization: scopeDenied,
              });
              if (scopeDenied) {
                requiresGmailReauthorization = true;
                browser.storage.local.set({ gmailReauthorizationRequired: true }, () => {
                  clearGmailAuthorization(() => {
                    publishGmailScanEvent('reauthorization_required', { reason: 'gmail_readonly_scope_required' });
                  });
                });
              }
              const isRecoverableMessageIssue = status === 401 || status === 403 || status === 404 || status === 429 || /deleted|not found|forbidden|unauthorized|rate limit|too many requests/i.test(String(err?.message || err || ''));

              if (isRecoverableMessageIssue) {
                console.warn('[Background] Gmail message unavailable for this scan; skipping it.', {
                  status,
                  message: err?.message || String(err),
                  messageId: msg?.id || null,
                });
              } else {
                console.error('[Background] Error fetching Gmail message:', err?.message || String(err));
              }

              setTimeout(processNextMessage, 150);
            });
        };

        if (messageQueue.length > 0) {
          processNextMessage();
        } else {
          finalizeGmailScan();
        }
      }).catch(async (err) => {
        if (err.status === 401) {
          if (refreshAttempted) {
            console.warn('[Background] Gmail rejected the refreshed access token; clearing it and requiring user authorization.');
            clearGmailAuthorization(() => {
              publishGmailScanEvent('reauthorization_required', { reason: 'refreshed_token_rejected' });
              publishGmailScanEvent('skipped', { reason: 'gmail_reauthorization_required' });
            });
            return;
          }

          console.info('[Background] Gmail access token expired; requesting refresh.');
          refreshGmailTokenForAccount(result.supabaseUserUUID, (refreshedToken) => {
            if (refreshedToken) {
              scanWithToken(refreshedToken, true);
              return;
            }
            publishGmailScanEvent('skipped', { reason: 'gmail_reauthorization_required' });
          });
          return;
        }
        console.log('[Background] Gmail API error:', err.message);
        publishGmailScanEvent('failed', { reason: 'gmail_api_error', status: err.status });
      });

    scanWithToken(token);
  });
}

// Monitor downloads folder for CSV files with subscriptions
function monitorDownloadsForCSV() {
  browser.downloads.onChanged.addListener((delta) => {
    if (delta.state?.current !== 'complete') {
      return;
    }

    browser.downloads.search({ id: delta.id }, (downloads) => {
      if (!downloads.length) return;

      const download = downloads[0];
      const filename = download.filename || '';

      // Check if it's a CSV file
      if (!filename.endsWith('.csv')) {
        return;
      }

      // Check if filename suggests it's a subscriptions list
      if (!/(subscription|sub|service|bill|payment|recurring)/i.test(filename)) {
        return;
      }

      console.log('[Background] Detected subscription CSV:', filename);

      // Read the file and parse it
      const reader = new FileReader();
      fetch(download.filename.startsWith('file://') ? download.filename : 'file://' + download.filename)
        .then(response => response.text())
        .then(csvText => {
          const lines = csvText.trim().split('\n').filter(l => l.trim());
          if (lines.length < 2) return;

          const detectedSubs = {};
          let headerMap = {};
          let isHeader = true;

          lines.forEach((line, idx) => {
            const cells = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));

            if (isHeader) {
              // Try to auto-detect columns
              cells.forEach((cell, i) => {
                const lower = cell.toLowerCase();
                if (/(name|service|subscription)/.test(lower)) headerMap.name = i;
                if (/(amount|price|cost|fee)/.test(lower)) headerMap.amount = i;
                if (/(frequency|period|billing)/.test(lower)) headerMap.frequency = i;
              });
              isHeader = false;
              return;
            }

            const name = cells[headerMap.name || 0]?.trim();
            const amount = parseFloat(cells[headerMap.amount || 1]);
            const frequency = cells[headerMap.frequency || 2];

            if (name) {
              detectedSubs[name] = {
                serviceName: name,
                domain: null,
                detectedAt: Date.now(),
                lastSeen: Date.now(),
                source: 'csv-import',
                amount: !isNaN(amount) ? amount : null,
                frequency: frequency || 'monthly',
                requiresReview: true,
                approvedForSync: false,
                isDetectedCandidate: true,
              };
              console.log('[Background] ✅ Parsed from CSV:', name, amount ? `($${amount})` : '');
            }
          });

          if (Object.keys(detectedSubs).length > 0) {
            browser.storage.local.get(['detectedSubscriptions'], (existing) => {
              const merged = { ...existing.detectedSubscriptions || {}, ...detectedSubs };
              browser.storage.local.set({ detectedSubscriptions: merged }, () => {
                // pending approvals are not synced until the user explicitly approves them
              });
            });
          }
        }).catch(err => console.error('[Background] Error reading CSV:', err));
    });
  });
}

// Periodic sync: reload known subscriptions and sync detected ones every 5 minutes
setInterval(() => {
  console.log('[Background] Running periodic sync...');
  loadKnownSubscriptions();
  scanGmailForSubscriptions();
  
  browser.storage.local.get(['detectedSubscriptions'], (result) => {
    const subs = result.detectedSubscriptions || {};
    if (Object.keys(subs).length > 0) {
      syncDetectedSubscriptions(subs);
    }
  });
}, 5 * 60 * 1000); // 5 minutes

// Initialize CSV monitoring on install
browser.runtime.onInstalled.addListener(() => {
  monitorDownloadsForCSV();
});
