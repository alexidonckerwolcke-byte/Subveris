// popup.js
document.addEventListener('DOMContentLoaded', () => {
  const statusDiv = document.getElementById('status');
  const trackingStatus = document.getElementById('tracking-status');
  const debugInfo = document.getElementById('debug-info');
  
  console.log('[Popup] Opening popup...');
  
  // Check both chrome.storage and localStorage from tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0] || {};
    const currentUrl = currentTab.url || '';
    
    // Get stored user data
    chrome.storage.local.get(['supabaseUserUUID', 'authToken', 'subscription_status', 'trackingPaused', 'upgradePrompt'], (result) => {
      console.log('[Popup] Storage check:', result);
      const subscriptionStatus = (result.subscription_status || 'free').toLowerCase();
      const isFreeTier = subscriptionStatus === 'free';
      
      if (result.supabaseUserUUID && result.authToken) {
        statusDiv.textContent = '✅ Connected to Subveris';
        statusDiv.className = 'status connected';
        
        let domain = 'current site';
        if (currentUrl) {
          try {
            const url = new URL(currentUrl);
            domain = url.hostname.replace('www.', '');
          } catch (error) {
            console.warn('[Popup] Could not parse current tab URL:', error);
          }
        }

        if (isFreeTier || result.trackingPaused) {
          if (trackingStatus) {
            trackingStatus.textContent = `⚠️ Upgrade required for ${domain}: ${result.upgradePrompt || 'Unlock full tracking and discovery features.'}`;
            trackingStatus.className = 'status disconnected';
          }
          
          if (debugInfo) {
            debugInfo.innerHTML = `
              <strong>Upgrade Required:</strong><br>
              Your current plan is ${subscriptionStatus}.<br>
              Premium or Family unlocks full usage tracking, onboarding discovery, and zero-usage alerts.<br>
              <small style="color: #999;">Tracking is currently paused for this extension.</small>
            `;
          }
          return;
        }
        
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