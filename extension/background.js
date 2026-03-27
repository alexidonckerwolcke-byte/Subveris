chrome.runtime.onInstalled.addListener(() => {
    console.log('Subveris Usage Tracker Extension Installed');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_AUTH_TOKEN') {
    chrome.storage.local.get(['authToken'], (result) => {
      console.log('[Background] Sending auth token:', result.authToken ? 'FOUND' : 'NOT FOUND');
      sendResponse({ token: result.authToken || null });
    });
    return true; // Keep channel open for async response
  }

  // Store token forwarded from content script (from injected page)
  if (request.type === 'SUBVERIS_AUTH_TOKEN') {
    chrome.storage.local.set({
      authToken: request.token,
      supabaseUserUUID: request.userId,
    }, () => {
      console.log('[Background] ✅ Stored auth token: User ID =', request.userId);
    });
    return true;
  }
});

// Note: injected page messages are forwarded to background by the content script.
