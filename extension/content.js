let startTime = Date.now();
let cachedAuthToken = null;

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

  // Forward to background script for storage (content scripts can't reliably set chrome.storage)
  // Use a timeout to ensure background script is ready
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
  }, 100); // Small delay to ensure background is ready
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

function sendUsageTrackingToBackground(domain, timeSpent) {
  sendUsageTracking(domain, timeSpent);
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

function trackUsageIfNeeded() {
  const endTime = Date.now();
  const timeSpent = Math.round((endTime - startTime) / 1000);

  console.log(`[Extension] Page unload detected. Time spent: ${timeSpent}s on ${window.location.hostname}`);

  if (timeSpent < 10) {
    console.log(`[Extension] ⏭️  Skipping - less than 10 seconds`);
    return;
  }

  const domain = getRootDomain(window.location.hostname);
  console.log(`[Extension] 📊 Tracking usage for domain: ${domain}`);
  sendUsageTrackingToBackground(domain, timeSpent);
}

window.addEventListener('pagehide', trackUsageIfNeeded);
window.addEventListener('beforeunload', trackUsageIfNeeded);
