let startTime = Date.now();
let cachedAuthToken = null;
let pricingScanTimer = null;
let pricingObserver = null;

function getRootDomain(hostname) {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join('.');
}

function getSubscriptionStatus(callback) {
  if (!window.chrome || !chrome.storage || !chrome.storage.local) {
    callback('free');
    return;
  }

  chrome.storage.local.get(['subscription_status'], (result) => {
    const status = (result.subscription_status || 'free').toLowerCase();
    callback(status);
  });
}

function isTierAllowed(status) {
  return status === 'premium' || status === 'family';
}

// Inject script to capture auth token from page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

function sendMessageToBackground(message, callback) {
  if (!window.chrome || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
    console.warn('[Extension] chrome.runtime.sendMessage unavailable in this context:', {
      chrome: typeof window.chrome,
      chromeRuntime: typeof chrome?.runtime,
      sendMessage: typeof chrome?.runtime?.sendMessage,
    });
    if (callback) callback(null);
    return false;
  }

  try {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Extension] Background message error:', chrome.runtime.lastError);
        if (callback) callback(null, chrome.runtime.lastError);
        return;
      }
      if (callback) callback(response);
    });
    return true;
  } catch (e) {
    console.warn('[Extension] Failed to send message to background:', e);
    if (callback) callback(null, e);
    return false;
  }
}

// Listen for messages from the injected script (page context) and forward/store token
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== 'SUBVERIS_AUTH_TOKEN') return;

  const token = event.data.token || null;
  const userId = event.data.userId || null;
  console.log('[Extension] Received SUBVERIS_AUTH_TOKEN from page. Forwarding to background and storing locally.');

  if (token) {
    cachedAuthToken = token;
  }

  const apiUrl = localStorage.getItem('subverisApiUrl') || null;

  setTimeout(() => {
    const success = sendMessageToBackground({ type: 'SUBVERIS_AUTH_TOKEN', token, userId, apiUrl }, (response, err) => {
      if (err) {
        console.error('[Extension] ❌ SUBVERIS_AUTH_TOKEN message failed:', err.message);
        console.log('[Extension] 💡 Reload the page after reloading the extension.');
      } else {
        console.log('[Extension] Background script storage response:', response);
      }
    });

    if (!success) {
      console.error('[Extension] ❌ SUBVERIS_AUTH_TOKEN message could not be sent. Reload the page after reloading the extension.');
    }
  }, 100);
});

// Get auth token from chrome storage (set by inject script via background)
function getAuthToken() {
  return new Promise((resolve) => {
    if (!window.chrome || !chrome.storage || !chrome.storage.local) {
      console.warn('[Extension] chrome.storage.local unavailable in this context');
      return resolve(null);
    }

    chrome.storage.local.get(['authToken'], (result) => {
      console.log('[Extension] Auth token check:', result.authToken ? 'FOUND' : 'NOT FOUND');
      if (result.authToken) cachedAuthToken = result.authToken;
      resolve(result.authToken);
    });
  });
}

function sendUsageTracking(domain, timeSpent) {
  const success = sendMessageToBackground({ type: 'TRACK_USAGE', domain, timeSpent }, (response, err) => {
    if (err) {
      console.error('[Extension] ❌ TRACK_USAGE message failed:', err.message);
      console.log('[Extension] 💡 If this error persists, reload the page after reloading the extension.');
      return;
    }
    if (!response || !response.success) {
      console.warn('[Extension] ⚠️ TRACK_USAGE response was not successful:', response);
    } else {
      console.log('[Extension] ✅ Usage tracking successful for:', domain);
    }
  });

  if (!success) {
    console.error('[Extension] ❌ TRACK_USAGE message could not be sent to background.');
    console.log('[Extension] 💡 Reload the page after reloading the extension in chrome://extensions/');
  }
}

// Subscription service mapping
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

function detectAndTrackSubscription() {
  getSubscriptionStatus((status) => {
    if (!isTierAllowed(status)) {
      return;
    }

    const domain = window.location.hostname.replace(/^www\./i, '').toLowerCase();
    const serviceName = getServiceNameFromDomain(domain);

    if (serviceName) {
      console.log('[Extension] Detected subscription service:', serviceName);
      sendMessageToBackground({
        type: 'DETECT_SUBSCRIPTION',
        serviceName,
        domain,
        detectedAt: Date.now()
      }, (response) => {
        if (response) {
          console.log('[Extension] ✅ Subscription detection sent:', serviceName);
        }
      });
    }
  });
}

function saveDiscoveredPrice(priceData) {
  if (!priceData) {
    return;
  }

  const domain = window.location.hostname.replace(/^www\./i, '').toLowerCase();
  const payload = {
    domain,
    discoveredDomains: [domain],
    detectedPrice: typeof priceData.price === 'number' ? priceData.price : null,
    detectedPlanName: priceData.planLabel || null,
    detectedBillingCycle: priceData.detectedBillingCycle || null,
    detectedRenewalDate: priceData.detectedRenewalDate || null,
    currency: priceData.currency || null,
    frequency: priceData.frequency || null,
    source: priceData.source || 'content-dom-scan',
    hostname: window.location.hostname,
    activeTimeSeconds: Math.max(0, Math.round((Date.now() - startTime) / 1000)),
    isZeroUsage: false,
  };

  chrome.storage.local.set({
    detectedSubscription: payload,
    lastDetectedSubscriptionAt: Date.now()
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('[Extension] Failed to store detected subscription:', chrome.runtime.lastError);
      return;
    }
    console.log('[Extension] Saved detected subscription payload:', payload);
  });

  sendMessageToBackground({ type: 'PRICE_DISCOVERY', payload }, () => {});
}

function normalizeDetectedDate(rawDate) {
  const trimmed = String(rawDate || '').trim();
  if (!trimmed) {
    return null;
  }

  const cleaned = trimmed
    .replace(/^(?:on|at|the)\s+/i, '')
    .replace(/[.,]$/, '')
    .trim();

  if (!cleaned) {
    return null;
  }

  const slashMatch = cleaned.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/);
  if (slashMatch) {
    const [, dayRaw, monthRaw, yearRaw] = slashMatch;
    let year = Number(yearRaw);
    if (year < 100) {
      year += year < 70 ? 2000 : 1900;
    }
    const month = Number(monthRaw) - 1;
    const day = Number(dayRaw);
    const parsed = new Date(year, month, day);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }
  }

  const parsed = new Date(cleaned);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return cleaned;
}

function detectBillingCycle(text) {
  const normalizedText = String(text || '').toLowerCase();
  if (!normalizedText) {
    return 'monthly';
  }

  if (/\b(per year|per annum|annually|annual|yearly|\/yr|\/year)\b/.test(normalizedText)) {
    return 'yearly';
  }

  if (/\b(per month|monthly|\/mo|\/month|\/months)\b/.test(normalizedText)) {
    return 'monthly';
  }

  return 'monthly';
}

function detectRenewalDate(text) {
  const normalizedText = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalizedText) {
    return null;
  }

  const patterns = [
    /\b(?:next billing date|billing date|renews on|renews|next invoice|subscription ends|subscription renews|expires on|next renewal)\b[\s:.-]*(?:on\s+)?([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    /\b(?:next billing date|billing date|renews on|renews|next invoice|subscription ends|subscription renews|expires on|next renewal)\b[\s:.-]*(?:on\s+)?([A-Za-z]{3,9}\s+\d{1,2}(?:,\s*\d{4})?|\d{4}-\d{2}-\d{2}|\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i
  ];

  for (const pattern of patterns) {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      return normalizeDetectedDate(match[1]);
    }
  }

  return null;
}

function extractSubscriptionPriceData() {
  const bodyText = document.body?.innerText || document.body?.textContent || '';
  const normalizedText = bodyText.replace(/\s+/g, ' ').trim();

  if (!normalizedText) {
    return null;
  }

  const currencyRegex = /(€|£|\$)\s*([0-9]+(?:[.,][0-9]{1,2})?)/g;
  const frequencyRegex = /(\/\s*(mo|maand|month|months|m|year|jaar|yr|annually|annual|y))/i;
  const planRegex = /(premium plan|pro tier|active subscription|subscription plan|billing plan|plan)/i;
  const matches = [...normalizedText.matchAll(currencyRegex)];

  if (!matches.length) {
    return null;
  }

  const [priceMatch] = matches;
  const currency = priceMatch[1];
  const price = priceMatch[2];
  const parsedPrice = parseFloat(price.replace(',', '.'));
  const frequencyMatch = normalizedText.match(frequencyRegex);
  const planMatch = normalizedText.match(planRegex);
  const detectedBillingCycle = detectBillingCycle(normalizedText);
  const detectedRenewalDate = detectRenewalDate(normalizedText);

  if (!Number.isFinite(parsedPrice)) {
    return null;
  }

  if (!frequencyMatch && !planMatch) {
    return null;
  }

  return {
    domain: window.location.hostname.replace(/^www\./i, ''),
    price: parsedPrice,
    currency,
    frequency: frequencyMatch ? frequencyMatch[1] : 'unknown',
    detectedBillingCycle,
    detectedRenewalDate,
    planLabel: planMatch ? planMatch[1] : 'Subscription Plan',
    detectedAt: Date.now(),
    source: 'content-dom-scan'
  };
}

function scanForSubscriptionPricing() {
  getSubscriptionStatus((status) => {
    if (!isTierAllowed(status)) {
      return;
    }

    const priceData = extractSubscriptionPriceData();
    if (!priceData) {
      return;
    }

    console.log('[Extension] Detected pricing signal:', priceData);
    saveDiscoveredPrice(priceData);
  });
}

function observePricingChanges() {
  if (!document.body || pricingObserver) {
    return;
  }

  pricingObserver = new MutationObserver(() => {
    if (pricingScanTimer) {
      clearTimeout(pricingScanTimer);
    }

    pricingScanTimer = window.setTimeout(() => {
      scanForSubscriptionPricing();
    }, 1200);
  });

  pricingObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

// Log when script starts
console.log('[Extension] Content script loaded on:', window.location.hostname);

// Initialize auth token immediately
getAuthToken().then((token) => {
  if (token) {
    console.log('[Extension] ✅ Auth token loaded on page load');
  } else {
    console.log('[Extension] ⚠️ No auth token available yet - will check at unload');
  }
});

function trackUsageIfNeeded() {
  const endTime = Date.now();
  const timeSpent = Math.round((endTime - startTime) / 1000);

  console.log(`[Extension] Page unload detected. Time spent: ${timeSpent}s on ${window.location.hostname}`);

  if (timeSpent < 10) {
    console.log('[Extension] ⏭️  Skipping - less than 10 seconds');
    return;
  }

  getSubscriptionStatus((status) => {
    if (!isTierAllowed(status)) {
      console.log('[Extension] Tracking paused because the tier is not premium or family.');
      return;
    }

    const domain = getRootDomain(window.location.hostname);
    console.log(`[Extension] 📊 Tracking usage for domain: ${domain}`);
    sendUsageTracking(domain, timeSpent);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    detectAndTrackSubscription();
    scanForSubscriptionPricing();
    observePricingChanges();
  });
} else {
  detectAndTrackSubscription();
  scanForSubscriptionPricing();
  observePricingChanges();
}

window.addEventListener('pagehide', trackUsageIfNeeded);
window.addEventListener('beforeunload', trackUsageIfNeeded);
