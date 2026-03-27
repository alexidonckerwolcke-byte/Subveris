let startTime = Date.now();

function getRootDomain(hostname) {
  const parts = hostname.split(".");
  if (parts.length <= 2) return hostname;
  return parts.slice(-2).join(".");
}

// Inject script to capture auth token from page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('inject.js');
script.onload = function() {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// Listen for messages from the injected script (page context) and forward/store token
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!event.data || event.data.type !== 'SUBVERIS_AUTH_TOKEN') return;

  const token = event.data.token || null;
  const userId = event.data.userId || null;
  console.log('[Extension] Received SUBVERIS_AUTH_TOKEN from page. Forwarding to background and storing locally.');

  // Store locally so content script can read it later
  try {
    chrome.storage.local.set({ authToken: token, supabaseUserUUID: userId }, () => {
      console.log('[Extension] chrome.storage set authToken result');
    });
  } catch (e) {
    console.warn('[Extension] Failed to set chrome.storage directly:', e);
  }

  // Also forward to background for any global handling
  try {
    chrome.runtime.sendMessage({ type: 'SUBVERIS_AUTH_TOKEN', token, userId });
  } catch (e) {
    console.warn('[Extension] Failed to send message to background:', e);
  }
});

// Get auth token from chrome storage (set by inject script via background)
function getAuthToken() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['authToken'], (result) => {
      console.log('[Extension] Auth token check:', result.authToken ? 'FOUND' : 'NOT FOUND');
      resolve(result.authToken);
    });
  });
}

// Log when script starts
console.log('[Extension] Content script loaded on:', window.location.hostname);

// Initialize auth token immediately
getAuthToken().then(token => {
  if (token) {
    console.log('[Extension] ✅ Auth token loaded on page load');
  } else {
    console.log('[Extension] ⚠️ No auth token available yet - will check at unload');
  }
});

window.addEventListener("beforeunload", async () => {
  const endTime = Date.now();
  const timeSpent = Math.round((endTime - startTime) / 1000);

  console.log(`[Extension] Page unload detected. Time spent: ${timeSpent}s on ${window.location.hostname}`);

  // Only track if more than 10 seconds spent
  if (timeSpent < 10) {
    console.log(`[Extension] ⏭️  Skipping - less than 10 seconds`);
    return;
  }

  // Get token from chrome storage (set during login)
  const token = await getAuthToken();
  if (!token) {
    console.log('[Extension] ❌ No auth token - skipping usage tracking');
    return;
  }

  const domain = getRootDomain(window.location.hostname);
  const apiUrl = localStorage.getItem('subverisApiUrl') || 'http://localhost:5000';

  console.log(`[Extension] 📊 Tracking usage for domain: ${domain} at ${apiUrl}`);

  // Send usage tracking request
  try {
    const response = await fetch(`${apiUrl}/api/track-usage-by-domain`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        domain: domain,
        timeSpent: timeSpent,
      }),
      credentials: "include"
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`[Extension] ✅ Usage tracked: ${data.message}`);
      console.log(`[Extension]     usageCount=${data.usageCount} monthlyUsageCount=${data.monthlyUsageCount} costPerUse=${data.costPerUse?.toFixed?.(2) ?? data.costPerUse}`);
      if (data.subscription) {
        console.log(`[Extension]     subscription=${data.subscription.name} (${data.subscription.websiteDomain || 'unknown domain'})`);
      }
    } else if (response.status === 404) {
      const data = await response.json().catch(() => null);
      console.log(`[Extension] ⚠️  No subscription found for ${domain}. Make sure you added it with the correct website domain in Subveris.`, data?.message || '');
    } else {
      const text = await response.text();
      console.error(`[Extension] ❌ Error: ${response.status} ${response.statusText}: ${text}`);
    }
  } catch (error) {
    console.error('[Extension] Failed to track usage:', error);
  }
});
