chrome.runtime.onInstalled.addListener(() => {
    console.log('Subveris Usage Tracker Extension Installed');
});

function sendUsageTracking(domain, timeSpent) {
  chrome.storage.local.get(['authToken', 'subverisApiUrl'], (result) => {
    const token = result.authToken;
    const apiUrl = result.subverisApiUrl || 'http://localhost:5000';

    if (!token) {
      console.error('[Background] ❌ No auth token found for TRACK_USAGE');
      return;
    }

    const payload = JSON.stringify({ domain, timeSpent });
    const url = `${apiUrl}/api/track-usage-by-domain`;

    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: payload,
      keepalive: true
    }).then(response => {
      console.log('[Background] TRACK_USAGE response status:', response.status);
      if (!response.ok) {
        console.error('[Background] TRACK_USAGE request failed:', response.status, response.statusText);
      } else {
        console.log('[Background] ✅ TRACK_USAGE successful for:', domain);
      }
    }).catch(error => {
      console.error('[Background] Failed TRACK_USAGE fetch:', error);
    });
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
    return true; // Keep channel open for async response
  }

  // Store token forwarded from content script (from injected page)
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
        sendResponse({ success: true, stored: true });
      }
    });
    return true; // Keep channel open for async response
  }

  if (request.type === 'TRACK_USAGE') {
    console.log('[Background] TRACK_USAGE request for domain:', request.domain, 'timeSpent:', request.timeSpent);
    sendUsageTracking(request.domain, request.timeSpent);
    sendResponse({ success: true, queued: true });
    return true;
  }

  console.log('[Background] Unknown message type:', request.type);
});

// Note: injected page messages are forwarded to background by the content script.
