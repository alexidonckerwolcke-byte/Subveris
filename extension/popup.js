// Cross-browser compatibility shim
// Safari 15+, Firefox, and Edge use 'browser' global
// Chrome uses 'chrome' global, so provide it as 'browser' for compatibility
const browser = globalThis.browser || globalThis.chrome;

// Detect which browser is running
function detectBrowser() {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserNotes = '';
  
  if (userAgent.includes('Firefox')) {
    browserName = 'Firefox 🦊';
    browserNotes = 'Firefox fully supports all features. Visit <a href="https://addons.mozilla.org" target="_blank" style="color: #007bff; text-decoration: none;">Firefox Add-ons</a> to find the latest version.';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari 🧭';
    browserNotes = 'Safari requires a native app wrapper. See <a href="https://github.com/subveris/extension/blob/main/INSTALL_SAFARI.md" target="_blank" style="color: #007bff; text-decoration: none;">Safari installation guide</a> for setup.';
  } else if (userAgent.includes('Edg')) {
    browserName = 'Microsoft Edge 🔷';
    browserNotes = 'Edge uses Chromium engine - all Chrome features work identically.';
  } else if (userAgent.includes('Chrome')) {
    browserName = 'Chrome 🌐';
    browserNotes = 'Chrome has the widest compatibility. All features work perfectly.';
  }
  
  return { browserName, browserNotes };
}

// popup.js
document.addEventListener('DOMContentLoaded', () => {
  // Show browser info
  const { browserName, browserNotes } = detectBrowser();
  const browserNameEl = document.getElementById('browser-name');
  const browserNotesEl = document.getElementById('browser-notes');
  
  if (browserNameEl) {
    browserNameEl.textContent = browserName;
  }
  if (browserNotesEl) {
    browserNotesEl.innerHTML = browserNotes;
  }
  
  const statusDiv = document.getElementById('status');
  const trackingStatus = document.getElementById('tracking-status');
  const debugInfo = document.getElementById('debug-info');

  function escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  const cancellationGuides = {
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

  function renderDashboard(detectedSubscriptions) {
    const dashboard = document.getElementById('dashboard');
    const list = document.getElementById('subscription-list');
    if (!dashboard || !list) return;

    const subscriptions = Object.values(detectedSubscriptions || {})
      .filter((subscription) => subscription && subscription.serviceName)
      .sort((left, right) => (right.lastVisit || 0) - (left.lastVisit || 0));
    const now = Date.now();
    const withUsage = subscriptions.map((subscription) => ({
      ...subscription,
      daysUnused: subscription.lastVisit
        ? Math.max(0, Math.floor((now - subscription.lastVisit) / 86400000))
        : null
    }));
    const needsReview = withUsage.filter((subscription) => subscription.daysUnused === null || subscription.daysUnused >= 30);
    const annualCost = needsReview.reduce((total, subscription) => total + ((subscription.monthlyPrice || 0) * 12), 0);

    document.getElementById('total-subs').textContent = String(subscriptions.length);
    document.getElementById('unused-subs').textContent = String(needsReview.length);
    document.getElementById('annual-waste').textContent = `€${annualCost.toFixed(0)}`;
    list.innerHTML = '';

    if (!withUsage.length) {
      list.innerHTML = '<div class="empty">Visit a subscription service to start building your usage picture.</div>';
    } else {
      withUsage.forEach((subscription) => {
        const days = subscription.daysUnused;
        const risk = days === null || days >= 60 ? 'high' : days >= 30 ? 'medium' : 'low';
        const lastOpened = days === null ? 'No visit recorded' : days === 0 ? 'Opened today' : `Last opened ${days}d ago`;
        const price = subscription.monthlyPrice ? `€${subscription.monthlyPrice.toFixed(2)}/mo` : 'Price unknown';
        const guideSlug = cancellationGuides[subscription.serviceName];
        const guideButton = guideSlug
          ? `<button class="guide-button" type="button" data-guide-slug="${guideSlug}">Open cancellation guide</button>`
          : '';
        list.insertAdjacentHTML('beforeend', `<article class="subscription"><div class="subscription-top"><div><div class="subscription-name">${escapeHtml(subscription.serviceName)}</div><div class="subscription-meta">${escapeHtml(price)} · ${escapeHtml(lastOpened)} · ${subscription.visitCount || 1} visit${(subscription.visitCount || 1) === 1 ? '' : 's'}</div>${guideButton}</div><span class="risk risk-${risk}">${risk === 'low' ? 'active' : risk === 'medium' ? 'review' : 'unused'}</span></div></article>`);
      });
    }
    list.querySelectorAll('[data-guide-slug]').forEach((button) => {
      button.addEventListener('click', () => {
        const slug = button.getAttribute('data-guide-slug');
        if (!slug) return;
        const serviceName = button.closest('.subscription')?.querySelector('.subscription-name')?.textContent || '';
        const subscription = subscriptions.find((item) => item.serviceName === serviceName);
        browser.runtime.sendMessage({ type: 'REQUEST_GUIDED_CANCELLATION', subscription }, (response) => {
          const guideUrl = response?.guideUrl || `https://www.subveris.com/${slug}`;
          browser.tabs.create({ url: guideUrl });
        });
      });
    });
    dashboard.style.display = 'block';
  }
  
  console.log('[Popup] Opening popup...');
  
  // Check both browser.storage and localStorage from tab
  browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const currentTab = tabs[0] || {};
    const currentUrl = currentTab.url || '';
    
    // Get stored user data
    browser.storage.local.get(['supabaseUserUUID', 'authToken', 'subscription_status', 'trackingPaused', 'upgradePrompt', 'detectedSubscriptions'], (result) => {
      console.log('[Popup] Storage state:', {
        connected: Boolean(result.supabaseUserUUID && result.authToken),
        subscriptionStatus: result.subscription_status || 'free',
        detectedSubscriptionCount: Object.keys(result.detectedSubscriptions || {}).length,
      });
      const subscriptionStatus = (result.subscription_status || 'free').toLowerCase();
      const isFreeTier = subscriptionStatus === 'free';
      renderDashboard(result.detectedSubscriptions || {});
      
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
  
  browser.storage.local.get(['supabaseUserUUID', 'gmailAuthToken'], (result) => {
    if (result.supabaseUserUUID && discoverySection) {
      discoverySection.style.display = 'block';
      
      if (result.gmailAuthToken) {
        gmailStatus.textContent = '✅ Gmail authorized - Inbox scanned every 5 minutes';
        gmailStatus.style.color = '#28a745';
        authorizeGmailBtn.textContent = '✅ Gmail Connected';
        authorizeGmailBtn.disabled = true;
      } else {
        gmailStatus.textContent = '⏳ Not yet connected - Click button to authorize';
        gmailStatus.style.color = '#ff9800';
      }
    }
  });
  
  // Gmail authorization
  if (authorizeGmailBtn) {
    authorizeGmailBtn.addEventListener('click', async () => {
      authorizeGmailBtn.disabled = true;
      authorizeGmailBtn.textContent = '🔄 Opening Google login...';
      gmailStatus.textContent = '⏳ Waiting for your authorization...';
      gmailStatus.style.color = '#ff9800';
      
      try {
        // Send message to background to initiate Gmail auth
        browser.runtime.sendMessage({
          type: 'authorizeGmail'
        }, (response) => {
          if (response?.success) {
            gmailStatus.textContent = '✅ Gmail authorized! Scanning inbox starting in ~5 minutes';
            gmailStatus.style.color = '#28a745';
            authorizeGmailBtn.textContent = '✅ Gmail Connected';
            authorizeGmailBtn.disabled = true;
            setTimeout(() => {
              authorizeGmailBtn.disabled = false;
              authorizeGmailBtn.textContent = '📧 Reauthorize Gmail';
            }, 5000);
          } else {
            gmailStatus.textContent = '❌ Authorization failed. Try again?';
            gmailStatus.style.color = '#dc3545';
            authorizeGmailBtn.disabled = false;
            authorizeGmailBtn.textContent = '📧 Connect Gmail Account';
          }
        });
      } catch (error) {
        console.error('[Popup] Gmail auth error:', error);
        gmailStatus.textContent = '❌ Authorization error. Check your connection.';
        gmailStatus.style.color = '#dc3545';
        authorizeGmailBtn.disabled = false;
        authorizeGmailBtn.textContent = '📧 Connect Gmail Account';
      }
    });
  }
  
  // Open downloads folder
  if (openDownloadsBtn) {
    openDownloadsBtn.addEventListener('click', () => {
      browser.downloads.showDefaultFolder();
    });
  }
  
  // Open settings button if exists
  const settingsBtn = document.getElementById('open-settings');
  if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
      browser.runtime.openOptionsPage();
    });
  }
});