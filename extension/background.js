// Cross-browser compatibility shim
// Safari 15+, Firefox, and Edge use 'browser' global
// Chrome uses 'chrome' global, so provide it as 'browser' for compatibility
const browser = globalThis.browser || globalThis.chrome;

browser.runtime.onInstalled.addListener(() => {
  console.log('Subveris Usage Tracker Extension Installed');
  loadKnownSubscriptions();
});

browser.runtime.onStartup.addListener(() => {
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

function loadKnownSubscriptions() {
  browser.storage.local.get(['authToken', 'subverisApiUrl', 'detectedSubscriptions'], (result) => {
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
          subscriptionId: sub.id || existingSubs[key]?.subscriptionId || null,
          domain: domain || existingSubs[key]?.domain || null,
          detectedAt: existingSubs[key]?.detectedAt || Date.now(),
          lastSeen: Date.now(),
          source: 'api-subscriptions'
        };
      });

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

function addDetectedSubscription(serviceName, domain) {
  if (!serviceName) return;

  browser.storage.local.get(['detectedSubscriptions'], (result) => {
    const subs = result.detectedSubscriptions || {};
    const now = Date.now();
    const existing = subs[serviceName];
    if (!subs[serviceName]) {
      subs[serviceName] = {
        serviceName,
        domain,
        detectedAt: now,
        lastSeen: now,
        lastVisit: now,
        visitCount: 1,
        monthlyPrice: MONTHLY_PRICES[serviceName] || null
      };
    } else {
      subs[serviceName].lastSeen = now;
      subs[serviceName].lastVisit = now;
      subs[serviceName].visitCount = (existing.visitCount || 0) + 1;
      if (!subs[serviceName].monthlyPrice && MONTHLY_PRICES[serviceName]) {
        subs[serviceName].monthlyPrice = MONTHLY_PRICES[serviceName];
      }
    }

    browser.storage.local.set({ detectedSubscriptions: subs }, () => {
      if (browser.runtime.lastError) {
        console.error('[Background] Failed to store detected subscription:', browser.runtime.lastError);
        return;
      }
      console.log('[Background] ✅ Added detected subscription:', serviceName);
      syncDetectedSubscriptions(subs);
    });
  });
}

function syncDetectedSubscriptions(subscriptions) {
  browser.storage.local.get(['authToken', 'subverisApiUrl'], (result) => {
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

      browser.storage.local.set({
        cookieScanCompleted: true,
        lastCookieScanAt: Date.now(),
        detectedSubscriptions: detectedServices
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
      console.log('[Background] Usage tracking skipped because the extension is not included in the current plan.');
      return;
    }

    updateZeroUsageSignal(domain, timeSpent, (isZeroUsage) => {
      browser.storage.local.get(['authToken', 'subverisApiUrl'], (result) => {
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
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Background] Received message:', request.type, 'from:', sender.url);

  if (request.type === 'GET_AUTH_TOKEN') {
    browser.storage.local.get(['authToken'], (result) => {
      console.log('[Background] Sending auth token:', result.authToken ? 'FOUND' : 'NOT FOUND');
      sendResponse({ token: result.authToken || null });
    });
    return true;
  }

  if (request.type === 'SUBVERIS_AUTH_TOKEN') {
    console.log('[Background] Exchanging raw extension auth token for an opaque session for user:', request.userId);
    const apiUrl = request.apiUrl || 'http://localhost:5000';
    const rawToken = request.token;

    if (!rawToken || !request.userId) {
      sendResponse({ success: false, error: 'Missing auth token or user ID' });
      return false;
    }

    const exchangeUrl = `${apiUrl}/api/security/extension-session`;
    fetch(exchangeUrl, {
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
        authSessionId: sessionId,
        authCsrfToken: csrfToken,
        supabaseUserUUID: request.userId,
        subverisApiUrl: request.apiUrl || null,
        extensionSessionExpiresAt: data.expiresAt || null,
      }, () => {
        if (browser.runtime.lastError) {
          console.error('[Background] Storage error:', browser.runtime.lastError);
          sendResponse({ success: false, error: browser.runtime.lastError });
        } else {
          console.log('[Background] ✅ Stored opaque extension session token and API URL: User ID =', request.userId, 'apiUrl =', request.apiUrl);
          runCookieSessionScan();
          loadKnownSubscriptions();
          sendResponse({ success: true, stored: true, sessionId, csrfToken, sessionToken: opaqueToken });
        }
      });
    }).catch((error) => {
      console.error('[Background] Failed to exchange raw token for opaque session:', error);
      sendResponse({ success: false, error: error.message || 'Failed to exchange session' });
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

  if (request.type === 'REQUEST_GUIDED_CANCELLATION') {
    requestGuidedCancellation(request.subscription).then(sendResponse);
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
      const apiUrl = result.subverisApiUrl || 'http://localhost:5000';

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
    browser.storage.local.get(['authToken', 'subverisApiUrl'], (result) => {
      const token = result.authToken;
      const apiUrl = result.subverisApiUrl || 'http://localhost:5000';

      if (!token) {
        sendResponse({ success: false, error: 'Not authenticated' });
        return;
      }

      // Request OAuth URL from backend
      fetch(`${apiUrl}/api/auth/gmail-oauth-url`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }).then(r => r.json()).then(data => {
        if (!data.oauthUrl) {
          throw new Error('No OAuth URL from backend');
        }

        // Open OAuth URL in a new window
        browser.identity.launchWebAuthFlow({
          url: data.oauthUrl,
          interactive: true
        }, (redirectUrl) => {
          if (!redirectUrl) {
            sendResponse({ success: false, error: 'User cancelled' });
            return;
          }

          // Extract authorization code from redirect URL
          try {
            const url = new URL(redirectUrl);
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
              body: JSON.stringify({ code })
            }).then(r => r.json()).then(tokenData => {
              if (!tokenData.access_token) {
                throw new Error('No access token received');
              }

              // Store Gmail token
              browser.storage.local.set({
                gmailAuthToken: tokenData.access_token,
                gmailTokenExpiry: Date.now() + (tokenData.expires_in * 1000)
              }, () => {
                console.log('[Background] ✅ Gmail authorized successfully');
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
function scanGmailForSubscriptions() {
  browser.storage.local.get(['gmailAuthToken', 'lastGmailScan'], (result) => {
    const token = result.gmailAuthToken;
    if (!token) {
      console.log('[Background] Gmail not authorized, skipping email scan');
      return;
    }

    // Only scan every 1 hour to avoid rate limits
    const lastScan = result.lastGmailScan || 0;
    if (Date.now() - lastScan < 60 * 60 * 1000) {
      return;
    }

    const subscriptionPatterns = [
      /(?:order|receipt|invoice|confirmation|renewal|billing|charge)/i,
      /(netflix|spotify|adobe|microsoft|amazon|disney|hbo|youtube|hulu|canva|duolingo)/i
    ];

    fetch('https://www.googleapis.com/gmail/v1/users/me/messages?q=subject:(receipt OR invoice OR renewal OR confirmation) is:unread', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    }).then(response => response.json())
      .then(data => {
        if (!data.messages || data.messages.length === 0) {
          console.log('[Background] No new emails matching subscription patterns');
          return;
        }

        const detectedSubs = {};
        let processedCount = 0;

        data.messages.forEach(msg => {
          fetch(`https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          }).then(r => r.json())
            .then(msgData => {
              processedCount++;
              const subject = msgData.payload?.headers?.find(h => h.name === 'Subject')?.value || '';
              const body = msgData.payload?.parts?.find(p => p.mimeType === 'text/plain')?.body?.data || '';
              
              let decodedBody = '';
              try {
                decodedBody = atob(body);
              } catch (e) {
                decodedBody = body;
              }

              const fullText = (subject + ' ' + decodedBody).toLowerCase();

              // Extract service name
              const serviceMatch = fullText.match(/(netflix|spotify|adobe|microsoft|apple|amazon|disney|hbo|youtube|hulu|canva|duolingo|audible|xbox|playstation|nordvpn|linkedin)/i);
              if (serviceMatch) {
                const serviceName = serviceMatch[0].charAt(0).toUpperCase() + serviceMatch[0].slice(1);
                const amountMatch = fullText.match(/(\$|€|£)?\s*(\d+\.?\d*)/);
                const amount = amountMatch ? parseFloat(amountMatch[2]) : null;

                detectedSubs[serviceName] = {
                  serviceName,
                  domain: null,
                  detectedAt: Date.now(),
                  lastSeen: Date.now(),
                  source: 'gmail-receipt',
                  amount
                };
                console.log('[Background] ✅ Detected from Gmail:', serviceName, amount ? `($${amount})` : '');
              }

              // If processed all messages, save and sync
              if (processedCount === data.messages.length) {
                browser.storage.local.get(['detectedSubscriptions'], (existing) => {
                  const merged = { ...existing.detectedSubscriptions || {}, ...detectedSubs };
                  browser.storage.local.set({
                    detectedSubscriptions: merged,
                    lastGmailScan: Date.now()
                  }, () => {
                    if (Object.keys(detectedSubs).length > 0) {
                      syncDetectedSubscriptions(merged);
                    }
                  });
                });
              }
            }).catch(err => console.error('[Background] Error fetching email:', err));
        });
      }).catch(err => console.log('[Background] Gmail API error (likely auth needed):', err.message));
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
                frequency: frequency || 'monthly'
              };
              console.log('[Background] ✅ Parsed from CSV:', name, amount ? `($${amount})` : '');
            }
          });

          if (Object.keys(detectedSubs).length > 0) {
            browser.storage.local.get(['detectedSubscriptions'], (existing) => {
              const merged = { ...existing.detectedSubscriptions || {}, ...detectedSubs };
              browser.storage.local.set({ detectedSubscriptions: merged }, () => {
                syncDetectedSubscriptions(merged);
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
