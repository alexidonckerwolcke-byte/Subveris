chrome.runtime.onInstalled.addListener(() => {
  console.log('Subveris Usage Tracker Extension Installed');
  loadKnownSubscriptions();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('Subveris Usage Tracker Extension started');
  loadKnownSubscriptions();
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

function getServiceNameFromDomain(domain) {
  const normalized = domain.replace(/^www\./, '').toLowerCase();
  for (const [domainKey, serviceName] of Object.entries(SUBSCRIPTION_MAPPING)) {
    if (normalized.includes(domainKey.replace(/^www\./, ''))) {
      return serviceName;
    }
  }
  return null;
}

function loadKnownSubscriptions() {
  chrome.storage.local.get(['authToken', 'subverisApiUrl', 'detectedSubscriptions'], (result) => {
    const token = result.authToken;
    const apiUrl = result.subverisApiUrl || 'http://localhost:5000';
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

      const merged = { ...existingSubs };

      subscriptions.forEach((sub) => {
        const serviceName = sub.name || sub.service_name || sub.provider || sub.title;
        if (!serviceName) {
          return;
        }

        const domain = (sub.website_domain || sub.website || sub.domain || '').replace(/^https?:\/\//i, '').replace(/^www\./i, '').toLowerCase();
        const key = serviceName;

        merged[key] = {
          serviceName: key,
          domain: domain || existingSubs[key]?.domain || null,
          detectedAt: existingSubs[key]?.detectedAt || Date.now(),
          lastSeen: Date.now(),
          source: 'api-subscriptions'
        };
      });

      chrome.storage.local.set({ detectedSubscriptions: merged }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Failed to store hydrated subscriptions:', chrome.runtime.lastError);
          return;
        }
        console.log('[Background] ✅ Hydrated known subscriptions from backend:', Object.keys(merged).length);
      });
    }).catch((error) => {
      console.error('[Background] Error hydrating known subscriptions from backend:', error);
    });
  });
}

function addDetectedSubscription(serviceName, domain) {
  if (!serviceName) return;

  chrome.storage.local.get(['detectedSubscriptions'], (result) => {
    const subs = result.detectedSubscriptions || {};
    if (!subs[serviceName]) {
      subs[serviceName] = {
        serviceName,
        domain,
        detectedAt: Date.now(),
        lastSeen: Date.now()
      };
    } else {
      subs[serviceName].lastSeen = Date.now();
    }

    chrome.storage.local.set({ detectedSubscriptions: subs }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Failed to store detected subscription:', chrome.runtime.lastError);
        return;
      }
      console.log('[Background] ✅ Added detected subscription:', serviceName);
      syncDetectedSubscriptions(subs);
    });
  });
}

function syncDetectedSubscriptions(subscriptions) {
  chrome.storage.local.get(['authToken', 'subverisApiUrl'], (result) => {
    const token = result.authToken;
    const apiUrl = result.subverisApiUrl || 'http://localhost:5000';

    if (!token) {
      console.warn('[Background] No auth token available to sync detected subscriptions');
      return;
    }

    const payload = JSON.stringify({
      subscriptions: Object.values(subscriptions),
      syncedAt: Date.now()
    });

    fetch(`${apiUrl}/api/extension/detected-subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: payload,
      keepalive: true
    }).then((response) => {
      if (!response.ok) {
        console.warn('[Background] Failed to sync subscriptions:', response.status);
        return;
      }
      console.log('[Background] ✅ Subscriptions synced successfully');
    }).catch((error) => {
      console.error('[Background] Failed to sync subscriptions:', error);
    });
  });
}

function getSubscriptionStatus(callback) {
  chrome.storage.local.get(['subscription_status'], (result) => {
    const status = (result.subscription_status || 'free').toLowerCase();
    callback(status);
  });
}

function isTierAllowed(status) {
  return status === 'premium' || status === 'family';
}

function updateUpgradePrompt(status) {
  const isFreeTier = !status || status === 'free';
  chrome.storage.local.set({
    trackingPaused: isFreeTier,
    upgradePrompt: isFreeTier
      ? 'Upgrade to Premium or Family to unlock full tracking, hidden subscription discovery, and zero-usage alerts.'
      : 'Full tracking enabled.'
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Background] Failed to update upgrade prompt state:', chrome.runtime.lastError);
    }
  });
}

function ensureTierAccess(callback) {
  getSubscriptionStatus((status) => {
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
  chrome.storage.local.get(['usageSignalHistory'], (result) => {
    const history = result.usageSignalHistory || {};
    const domainHistory = Array.isArray(history[domain]) ? history[domain] : [];
    const now = Date.now();
    const cutoff = now - ZERO_USAGE_WINDOW_MS;
    const nextEntry = { timestamp: now, timeSpent };
    const recentEntries = [...domainHistory, nextEntry].filter((entry) => entry.timestamp >= cutoff);
    const hasPositiveUsage = recentEntries.some((entry) => entry.timeSpent > 0);
    const isZeroUsage = timeSpent === 0 && !hasPositiveUsage;

    history[domain] = recentEntries;
    chrome.storage.local.set({ usageSignalHistory: history }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Failed to persist zero-usage signal history:', chrome.runtime.lastError);
      }
      callback(Boolean(isZeroUsage));
    });
  });
}

function runCookieSessionScan() {
  chrome.storage.local.get(['authToken', 'subverisApiUrl', 'subscription_status', 'cookieScanCompleted'], (result) => {
    const status = (result.subscription_status || 'free').toLowerCase();

    if (!isTierAllowed(status)) {
      console.log('[Background] Cookie scan skipped for tier:', status);
      return;
    }

    if (result.cookieScanCompleted) {
      console.log('[Background] Cookie scan already completed for this user.');
      return;
    }

    chrome.cookies.getAll({}, (cookies) => {
      const domains = [];
      const detectedServices = {};
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

          // Try to map this domain to a subscription service
          const serviceName = getServiceNameFromDomain(domain);
          if (serviceName) {
            detectedServices[serviceName] = {
              serviceName,
              domain,
              detectedAt: Date.now(),
              lastSeen: Date.now()
            };
            console.log('[Background] Detected subscription from cookie:', serviceName, 'on', domain);
          }
        }
      });

      chrome.storage.local.set({
        cookieScanCompleted: true,
        lastCookieScanAt: Date.now(),
        detectedSubscriptions: detectedServices
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Failed to persist cookie scan state:', chrome.runtime.lastError);
          return;
        }

        if (!domains.length) {
          console.log('[Background] No login-like cookies found for onboarding scan.');
          return;
        }

        const token = result.authToken;
        const apiUrl = result.subverisApiUrl || 'http://localhost:5000';
        if (!token) {
          console.warn('[Background] No auth token available to sync cookie scan domains.');
          return;
        }

        // Sync detected services instead of raw domains
        const payload = JSON.stringify({
          domains,
          detectedSubscriptions: Object.values(detectedServices),
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

function sendUsageTracking(domain, timeSpent) {
  ensureTierAccess((allowed) => {
    if (!allowed) {
      console.log('[Background] Usage tracking skipped because the tier is not premium or family.');
      return;
    }

    updateZeroUsageSignal(domain, timeSpent, (isZeroUsage) => {
      chrome.storage.local.get(['authToken', 'subverisApiUrl'], (result) => {
        const token = result.authToken;
        const apiUrl = result.subverisApiUrl || 'http://localhost:5000';

        if (!token) {
          console.error('[Background] ❌ No auth token found for TRACK_USAGE');
          return;
        }

        const payload = JSON.stringify({
          domain,
          timeSpent,
          isZeroUsage,
          rollingWindowDays: 30
        });

        const url = `${apiUrl}/api/track-usage-for-all-members`;

        fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: payload,
          keepalive: true
        }).then((response) => {
          console.log('[Background] TRACK_USAGE_FOR_ALL_MEMBERS response status:', response.status);
          if (!response.ok) {
            console.error('[Background] TRACK_USAGE_FOR_ALL_MEMBERS request failed:', response.status, response.statusText);
            return sendUsageTrackingFallback(domain, timeSpent, token, apiUrl);
          }

          console.log('[Background] ✅ TRACK_USAGE_FOR_ALL_MEMBERS successful for:', domain);
          return response.json();
        }).catch((error) => {
          console.error('[Background] Failed TRACK_USAGE_FOR_ALL_MEMBERS fetch:', error);
          return sendUsageTrackingFallback(domain, timeSpent, token, apiUrl);
        });
      });
    });
  });
}

function sendUsageTrackingFallback(domain, timeSpent, token, apiUrl) {
  const payload = JSON.stringify({
    domain,
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
    } else {
      console.log('[Background] ✅ TRACK_USAGE fallback successful for:', domain);
    }
  }).catch((error) => {
    console.error('[Background] Failed TRACK_USAGE fallback fetch:', error);
  });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request.type, 'from:', sender.url);

  if (request.type === 'GET_AUTH_TOKEN') {
    chrome.storage.local.get(['authToken'], (result) => {
      console.log('[Background] Sending auth token:', result.authToken ? 'FOUND' : 'NOT FOUND');
      sendResponse({ token: result.authToken || null });
    });
    return true;
  }

  if (request.type === 'SUBVERIS_AUTH_TOKEN') {
    console.log('[Background] Storing auth token for user:', request.userId);
    chrome.storage.local.set({
      authToken: request.token,
      supabaseUserUUID: request.userId,
      subverisApiUrl: request.apiUrl || null,
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Storage error:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
      } else {
        console.log('[Background] ✅ Stored auth token and API URL: User ID =', request.userId, 'apiUrl =', request.apiUrl);
        runCookieSessionScan();
        loadKnownSubscriptions();
        sendResponse({ success: true, stored: true });
      }
    });
    return true;
  }

  if (request.type === 'TRACK_USAGE') {
    console.log('[Background] TRACK_USAGE request for domain:', request.domain, 'timeSpent:', request.timeSpent);
    sendUsageTracking(request.domain, request.timeSpent);
    sendResponse({ success: true, queued: true });
    return true;
  }

  if (request.type === 'DETECT_SUBSCRIPTION') {
    const { serviceName, domain, detectedAt } = request;
    console.log('[Background] DETECT_SUBSCRIPTION request for:', serviceName);
    addDetectedSubscription(serviceName, domain);
    sendResponse({ success: true, detected: serviceName });
    return true;
  }

  if (request.type === 'PRICE_DISCOVERY') {
    const payload = request.payload || {};

    chrome.storage.local.get(['authToken', 'subverisApiUrl', 'supabaseUserUUID'], (result) => {
      const token = result.authToken;
      const apiUrl = result.subverisApiUrl || 'http://localhost:5000';

      chrome.storage.local.set({
        detectedSubscription: payload,
        lastDetectedSubscriptionAt: Date.now()
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Background] Failed to store detected subscription:', chrome.runtime.lastError);
          sendResponse({ success: false, error: chrome.runtime.lastError });
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

  console.log('[Background] Unknown message type:', request.type);
});

// Periodic sync: reload known subscriptions and sync detected ones every 5 minutes
setInterval(() => {
  console.log('[Background] Running periodic sync...');
  loadKnownSubscriptions();
  
  chrome.storage.local.get(['detectedSubscriptions'], (result) => {
    const subs = result.detectedSubscriptions || {};
    if (Object.keys(subs).length > 0) {
      syncDetectedSubscriptions(subs);
    }
  });
}, 5 * 60 * 1000); // 5 minutes

// Note: injected page messages are forwarded to background by the content script.
