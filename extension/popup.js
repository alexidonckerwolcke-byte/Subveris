// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const trackingStatus = document.getElementById('tracking-status');
  const debugInfo = document.getElementById('debug-info');
  
  console.log('[Popup] Opening popup...');
  
  // Check both chrome.storage and localStorage from tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0];
    
    // Get stored user data
    chrome.storage.local.get(['supabaseUserUUID', 'authToken'], (result) => {
      console.log('[Popup] Storage check:', result);
      
      if (result.supabaseUserUUID && result.authToken) {
        statusDiv.textContent = '✅ Connected to Subveris';
        statusDiv.className = 'status connected';
        
        // Try to get current domain
        const url = new URL(currentTab.url);
        const domain = url.hostname.replace('www.', '');
        
        if (trackingStatus) {
          trackingStatus.textContent = `📊 Tracking enabled for: ${domain}`;
          trackingStatus.className = 'status connected';
        }
        
        if (debugInfo) {
          debugInfo.innerHTML = `
            <strong>Debug Info:</strong><br>
            User ID: ${result.supabaseUserUUID.slice(0, 8)}...<br>
            Current Domain: ${domain}<br>
            <small>The extension will track time spent on this site.</small>
          `;
        }
      } else {
        statusDiv.textContent = '❌ Not connected';
        statusDiv.className = 'status disconnected';
        if (trackingStatus) {
          trackingStatus.textContent = '⚠️ Please log in to Subveris first';
          trackingStatus.className = 'status disconnected';
        }
        
        if (debugInfo) {
          debugInfo.innerHTML = `
            <strong>Setup Required:</strong><br>
            1. Open the Subveris app<br>
            2. Log in with your account<br>
            3. The extension will auto-connect<br>
            <small style="color: #999;">Waiting for authentication...</small>
          `;
        }
      }
    });
  });
  
  // Open settings button if exists
  const settingsBtn = document.getElementById('open-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
});