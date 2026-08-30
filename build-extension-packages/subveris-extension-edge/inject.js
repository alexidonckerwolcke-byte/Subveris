// inject.js - Injected into page to capture auth token from localStorage
// This runs in the page context so it can access page localStorage

let lastSentToken = null;
let lastSentUserId = null;

function isSubverisPage() {
  const hostname = window.location.hostname.replace(/^www\./i, '').toLowerCase();
  return hostname === 'subveris.com' || hostname.endsWith('.subveris.com');
}

function sendAuthToken(force = false) {
  if (!isSubverisPage()) {
    return;
  }

  let token = null;
  let userId = null;
  
  // Always try to get userId first (stored separately)
  userId = localStorage.getItem('supabaseUserUUID');
  
  // Try new supabase format first
  let tokenData = localStorage.getItem('supabase.auth.token');
  if (tokenData) {
    try {
      const parsed = JSON.parse(tokenData);
      token = parsed.session?.access_token || parsed.access_token;
      // Also try to extract userId from token if not found separately
      if (!userId) {
        userId = parsed.session?.user?.id || parsed.user?.id;
      }
    } catch (e) {
      console.log('[Inject] Failed to parse supabase.auth.token');
    }
  }
  
  // Fallback to old format
  if (!token) {
    token = localStorage.getItem('supabase_auth_token');
  }
  
  if (token && userId) {
    if (!force && token === lastSentToken && userId === lastSentUserId) {
      return;
    }
    lastSentToken = token;
    lastSentUserId = userId;
    console.log('[Inject] Found authenticated session, sending limited session data to extension');
    window.postMessage({
      type: 'SUBVERIS_AUTH_TOKEN',
      token: token,
      userId: userId
    }, '*');
  } else {
    if (lastSentToken || lastSentUserId) {
      lastSentToken = null;
      lastSentUserId = null;
      window.postMessage({
        type: 'SUBVERIS_AUTH_LOGOUT',
        userId: userId || null
      }, '*');
    }
    console.log('[Inject] No authenticated session found on Subveris');
  }
}

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data.type === 'GET_AUTH_TOKEN') {
    sendAuthToken();
  }
});

// Send token on script load
sendAuthToken();

// Also send token whenever it changes
const originalSetItem = Storage.prototype.setItem;
Storage.prototype.setItem = function(key, value) {
  originalSetItem.call(this, key, value);
  if (!isSubverisPage()) return;
  if (key === 'supabase.auth.token' || key === 'supabase_auth_token' || key === 'supabaseUserUUID') {
    console.log('[Inject] Auth state updated, resending');
    sendAuthToken();
  }
};

const originalRemoveItem = Storage.prototype.removeItem;
Storage.prototype.removeItem = function(key) {
  originalRemoveItem.call(this, key);
  if (!isSubverisPage()) return;
  if (key === 'supabase.auth.token' || key === 'supabase_auth_token' || key === 'supabaseUserUUID') {
    console.log('[Inject] Auth state removed, clearing extension account');
    sendAuthToken(true);
  }
};
