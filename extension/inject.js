// inject.js - Injected into page to capture auth token from localStorage
// This runs in the page context so it can access page localStorage

function sendAuthToken() {
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
    console.log('[Inject] ✅ Found auth token + userId, sending to extension');
    window.postMessage({
      type: 'SUBVERIS_AUTH_TOKEN',
      token: token,
      userId: userId
    }, '*');
  } else {
    console.log('[Inject] ⚠️ Missing auth data. Token:', !!token, 'UserID:', !!userId);
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
  if (key === 'supabase.auth.token' || key === 'supabase_auth_token') {
    console.log('[Inject] Auth token updated, resending');
    sendAuthToken();
  }
};
