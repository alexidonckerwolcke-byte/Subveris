chrome.runtime.onInstalled.addListener(() => {
  console.log('Subveris Usage Tracker Extension Installed');
});

const ZERO_USAGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

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

      chrome.storage.local.set({
        cookieScanCompleted: true,
        lastCookieScanAt: Date.now()
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

  if (request.type === 'PRICE_DISCOVERY') {
    chrome.storage.local.set({
      detectedSubscription: request.payload,
      lastDetectedSubscriptionAt: Date.now()
    }, () => {
      if (chrome.runtime.lastError) {
        console.error('[Background] Failed to store detected subscription:', chrome.runtime.lastError);
        sendResponse({ success: false, error: chrome.runtime.lastError });
        return;
      }
      console.log('[Background] Saved detected subscription payload:', request.payload);
      sendResponse({ success: true, stored: true });
    });
    return true;
  }

  console.log('[Background] Unknown message type:', request.type);
});

// Note: injected page messages are forwarded to background by the content script.
