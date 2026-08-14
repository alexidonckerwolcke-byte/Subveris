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
    chrome.storage.local.get(['supabaseUserUUID', 'authToken', 'subscription_status', 'trackingPaused', 'upgradePrompt', 'detectedSubscriptions'], (result) => {
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
        
        const detectedSubs = result.detectedSubscriptions || {};
        const subEntries = Object.values(detectedSubs);
        const knownFromAccount = subEntries.filter(sub => sub.source === 'api-subscriptions');
        const newlyDetected = subEntries.filter(sub => !sub.source || sub.source !== 'api-subscriptions');

        const knownList = knownFromAccount.map(sub => sub.serviceName).join(', ') || 'None';
        const detectedList = newlyDetected.map(sub => sub.serviceName).join(', ') || 'None';
        const totalCount = subEntries.length;
        
        if (debugInfo) {
          const accountNames = knownFromAccount.length
            ? knownFromAccount.map(sub => sub.serviceName).join(', ')
            : 'None';

          const browserNames = newlyDetected.length
            ? newlyDetected.map(sub => sub.serviceName).join(', ')
            : 'None';

          let subsHTML = `
            <strong>Subscription summary</strong><br>
            <span style="color: #10b981;">Known from account: ${knownFromAccount.length}</span><br>
            ${accountNames}<br><br>
            <span style="color: #f59e0b;">Detected in browser: ${newlyDetected.length}</span><br>
            ${browserNames}<br><br>
            <small>Current site: ${domain}</small>`;

          debugInfo.innerHTML = subsHTML;
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
  
  // Show discovery section for connected users
  const discoverySection = document.getElementById('discovery-section');
  const authorizeGmailBtn = document.getElementById('authorize-gmail');
  const openDownloadsBtn = document.getElementById('open-downloads');
  const gmailStatus = document.getElementById('gmail-status');
  
  chrome.storage.local.get(['supabaseUserUUID', 'gmailAuthToken'], (result) => {
    if (result.supabaseUserUUID && discoverySection) {
      discoverySection.style.display = 'block';
      
      if (result.gmailAuthToken) {
        gmailStatus.textContent = '✅ Gmail authorized';
        gmailStatus.style.color = '#28a745';
      } else {
        gmailStatus.textContent = '⏳ Click to authorize';
        gmailStatus.style.color = '#ff9800';
      }
    }
  });
  
  // Gmail authorization
  if (authorizeGmailBtn) {
    authorizeGmailBtn.addEventListener('click', async () => {
      authorizeGmailBtn.disabled = true;
      authorizeGmailBtn.textContent = '🔄 Authorizing...';
      
      try {
        // Send message to background to initiate Gmail auth
        chrome.runtime.sendMessage({
          type: 'authorizeGmail'
        }, (response) => {
          if (response?.success) {
            gmailStatus.textContent = '✅ Gmail authorized!';
            gmailStatus.style.color = '#28a745';
          } else {
            gmailStatus.textContent = '❌ Authorization failed';
            gmailStatus.style.color = '#dc3545';
          }
          authorizeGmailBtn.disabled = false;
          authorizeGmailBtn.textContent = '📧 Authorize Gmail';
        });
      } catch (error) {
        console.error('[Popup] Gmail auth error:', error);
        gmailStatus.textContent = '❌ Authorization error';
        gmailStatus.style.color = '#dc3545';
        authorizeGmailBtn.disabled = false;
        authorizeGmailBtn.textContent = '📧 Authorize Gmail';
      }
    });
  }
  
  // Open downloads folder
  if (openDownloadsBtn) {
    openDownloadsBtn.addEventListener('click', () => {
      chrome.downloads.showDefaultFolder();
    });
  }
  
  // Open settings button if exists
  const settingsBtn = document.getElementById('open-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
});