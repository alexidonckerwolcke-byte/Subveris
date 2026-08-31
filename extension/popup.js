// Cross-browser compatibility shim
// Firefox and Edge use 'browser' global
// Chrome uses 'chrome' global, so provide it as 'browser' for compatibility
const browser = globalThis.browser || globalThis.chrome;
const SUPABASE_URL = 'https://xuilgccacufwinvkocfl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1aWxnY2NhY3Vmd2ludmtvY2ZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5NzY4OTYsImV4cCI6MjA4MTU1Mjg5Nn0.f0xa0hY6VDht7Qeqfbc0UaKpZLzCB43CXwOlfxDJ93M';

// Detect which browser is running
function detectBrowser() {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserNotes = '';
  
  if (userAgent.includes('Firefox')) {
    browserName = 'Firefox 🦊';
    browserNotes = 'Firefox fully supports all features.';
  } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
    browserName = 'Safari 🧭';
    browserNotes = 'Safari support is coming soon. The extension is currently available for Chrome, Edge, and Firefox.';
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
    browserNotesEl.textContent = browserNotes;
  }
  
  const statusDiv = document.getElementById('status');
  const trackingStatus = document.getElementById('tracking-status');
  const debugInfo = document.getElementById('debug-info');
  const loginButton = document.getElementById('login-button');
  const loginForm = document.getElementById('login-form');
  const loginSubmit = document.getElementById('login-submit');
  const loginError = document.getElementById('login-error');

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

  function renderReviewQueue(detectedSubscriptions) {
    const reviewSection = document.getElementById('review-section');
    const reviewList = document.getElementById('review-list');
    if (!reviewSection || !reviewList) return;

    const items = Object.values(detectedSubscriptions || {})
      .filter((subscription) => subscription && subscription.serviceName && subscription.requiresReview)
      .sort((left, right) => (right.detectedAt || 0) - (left.detectedAt || 0));

    if (!items.length) {
      reviewSection.style.display = 'none';
      return;
    }

    reviewSection.style.display = 'block';
    reviewList.replaceChildren();

    items.forEach((subscription) => {
      const row = document.createElement('div');
      row.className = 'review-item';

      const name = document.createElement('div');
      name.className = 'subscription-name';
      name.textContent = subscription.serviceName;

      const meta = document.createElement('div');
      meta.className = 'subscription-meta';
      meta.textContent = subscription.amount ? `~€${Number(subscription.amount).toFixed(2)} · Gmail suggestion` : 'Gmail suggestion';

      const actions = document.createElement('div');
      actions.className = 'review-actions';

      const approveButton = document.createElement('button');
      approveButton.type = 'button';
      approveButton.className = 'approve';
      approveButton.textContent = 'Approve';
      approveButton.addEventListener('click', () => {
        browser.runtime.sendMessage({ type: 'APPROVE_REVIEWED_SUBSCRIPTION', serviceName: subscription.serviceName }, (response) => {
          if (response?.success) {
            window.location.reload();
          }
        });
      });

      const dismissButton = document.createElement('button');
      dismissButton.type = 'button';
      dismissButton.className = 'dismiss';
      dismissButton.textContent = 'Dismiss';
      dismissButton.addEventListener('click', () => {
        browser.runtime.sendMessage({ type: 'DISMISS_REVIEWED_SUBSCRIPTION', serviceName: subscription.serviceName }, (response) => {
          if (response?.success) {
            window.location.reload();
          }
        });
      });

      actions.append(approveButton, dismissButton);
      row.append(name, meta, actions);
      reviewList.appendChild(row);
    });
  }

  function renderDashboard(detectedSubscriptions) {
    const dashboard = document.getElementById('dashboard');
    const list = document.getElementById('subscription-list');
    if (!dashboard || !list) return;

    const subscriptions = Object.values(detectedSubscriptions || {})
      .filter((subscription) => subscription && subscription.serviceName && !subscription.requiresReview)
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
    list.replaceChildren();

    if (!withUsage.length) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'Visit a subscription service to start building your usage picture.';
      list.appendChild(empty);
    } else {
      withUsage.forEach((subscription) => {
        const days = subscription.daysUnused;
        const risk = days === null || days >= 60 ? 'high' : days >= 30 ? 'medium' : 'low';
        const activity = days === null || days >= 30 ? 'Inactive' : 'Active';
        const lastOpened = days === null ? 'No visit recorded' : days === 0 ? 'Opened today' : `Last opened ${days}d ago`;
        const price = subscription.monthlyPrice ? `€${subscription.monthlyPrice.toFixed(2)}/mo` : 'Price unknown';
        const guideSlug = cancellationGuides[subscription.serviceName];
        const article = document.createElement('article');
        article.className = 'subscription';
        const top = document.createElement('div');
        top.className = 'subscription-top';
        const details = document.createElement('div');
        const name = document.createElement('div');
        name.className = 'subscription-name';
        name.textContent = subscription.serviceName;
        const meta = document.createElement('div');
        meta.className = 'subscription-meta';
        meta.textContent = `${price} · ${activity} · ${lastOpened} · ${subscription.visitCount || 1} visit${(subscription.visitCount || 1) === 1 ? '' : 's'}`;
        details.append(name, meta);
        if (guideSlug) {
          const guideButton = document.createElement('button');
          guideButton.className = 'guide-button';
          guideButton.type = 'button';
          guideButton.dataset.guideSlug = guideSlug;
          guideButton.textContent = 'View guide in Subveris';
          details.appendChild(guideButton);
        }
        if (subscription.markedCancelled) {
          const cancelledLabel = document.createElement('span');
          cancelledLabel.className = 'muted';
          cancelledLabel.textContent = 'Marked cancelled by you';
          details.appendChild(cancelledLabel);
        } else {
          const markButton = document.createElement('button');
          markButton.className = 'guide-button mark-button';
          markButton.type = 'button';
          markButton.dataset.markCancelled = subscription.serviceName;
          markButton.textContent = 'Mark as cancelled';
          details.appendChild(markButton);
        }
        const riskLabel = document.createElement('span');
        riskLabel.className = `risk risk-${risk}`;
        riskLabel.textContent = risk === 'low' ? 'active' : risk === 'medium' ? 'review' : 'unused';
        top.append(details, riskLabel);
        article.appendChild(top);
        list.appendChild(article);
      });
    }
    list.querySelectorAll('[data-guide-slug]').forEach((button) => {
      button.addEventListener('click', () => {
        const slug = button.getAttribute('data-guide-slug');
        if (!slug) return;
        const serviceName = button.closest('.subscription')?.querySelector('.subscription-name')?.textContent || '';
        const subscription = subscriptions.find((item) => item.serviceName === serviceName);
        browser.runtime.sendMessage({ type: 'REQUEST_GUIDED_CANCELLATION', subscription }, (response) => {
          const guideUrl = response?.guideUrl || `https://subveris.com/${slug}`;
          browser.tabs.create({ url: guideUrl });
        });
      });
    });
    list.querySelectorAll('[data-mark-cancelled]').forEach((button) => {
      button.addEventListener('click', () => {
        const subscriptionId = button.getAttribute('data-mark-cancelled');
        browser.runtime.sendMessage({ type: 'MARK_SUBSCRIPTION_CANCELLED', subscriptionId }, (response) => {
          if (response?.success) {
            button.outerHTML = '<span class="muted">Marked cancelled by you</span>';
          }
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
      renderDashboard(result.detectedSubscriptions || {});
      renderReviewQueue(result.detectedSubscriptions || {});
      const isFreeTier = !['premium', 'family'].includes((result.subscription_status || 'free').toLowerCase());
      
      if (result.supabaseUserUUID && result.authToken) {
        if (loginButton) loginButton.style.display = 'none';
        if (loginForm) loginForm.style.display = 'none';
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
            trackingStatus.textContent = `⚠️ Browser extension tracking requires Premium or Family.`;
            trackingStatus.className = 'status disconnected';
          }
          if (debugInfo) {
            debugInfo.textContent = [
              'Browser extension not included:',
              'Upgrade to Premium or Family for browser usage tracking and private-page scanning.',
              'The Subveris web app and cancellation guides remain available without the extension.',
            ].join('\n');
          }
          if (loginButton) {
            loginButton.style.display = 'block';
            loginButton.textContent = 'Upgrade your Subveris plan';
            loginButton.onclick = () => browser.tabs.create({ url: 'https://subveris.com/pricing' });
          }
          if (loginForm) loginForm.style.display = 'none';
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

          debugInfo.textContent = [
            'Subscription summary',
            `Known from account: ${knownFromAccount.length}`,
            accountNames,
            '',
            `Detected in browser: ${newlyDetected.length}`,
            browserNames,
            '',
            `Current site: ${domain}`,
          ].join('\n');
        }
      } else {
        statusDiv.textContent = '❌ Not connected';
        statusDiv.className = 'status disconnected';
        if (trackingStatus) {
          trackingStatus.textContent = '⚠️ Please log in to Subveris first';
          trackingStatus.className = 'status disconnected';
        }
        
        if (debugInfo) {
          debugInfo.textContent = [
            'Setup Required:',
            '1. Open the Subveris app',
            '2. Log in with your account',
            '3. The extension will auto-connect',
            'Waiting for authentication...',
          ].join('\n');
        }
        if (loginButton) {
          loginButton.style.display = 'block';
          loginButton.textContent = 'Log in to Subveris';
          loginButton.onclick = () => browser.tabs.create({ url: 'https://subveris.com/login' });
        }
        if (loginForm) loginForm.style.display = 'block';
      }
    });
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;
    if (!email || !password) return;

    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Signing in...';
    loginError.textContent = '';
    try {
      const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.access_token || !data.user?.id) {
        const authError = data.error_code || data.error || '';
        if (authError === 'invalid_credentials' || response.status === 400) {
          throw new Error('Email/password login failed. If you normally use Google, set a password in Subveris first, then use that password here.');
        }
        throw new Error(data.error_description || data.msg || data.error || 'Login failed');
      }

      browser.runtime.sendMessage({
        type: 'SUBVERIS_AUTH_TOKEN',
        token: data.access_token,
        userId: data.user.id,
        apiUrl: 'https://xuilgccacufwinvkocfl.supabase.co/functions/v1',
      }, (result) => {
        if (browser.runtime.lastError || !result?.success) {
          loginError.textContent = browser.runtime.lastError?.message || result?.error || 'Your account needs an active Premium or Family plan.';
          loginSubmit.disabled = false;
          loginSubmit.textContent = 'Log in securely';
          return;
        }
        window.location.reload();
      });
    } catch (error) {
      loginError.textContent = error instanceof Error ? error.message : 'Login failed';
      loginSubmit.disabled = false;
      loginSubmit.textContent = 'Log in securely';
    }
  });
  
  // Show discovery section for connected users
  const discoverySection = document.getElementById('discovery-section');
  const authorizeGmailBtn = document.getElementById('authorize-gmail');
  const openDownloadsBtn = document.getElementById('open-downloads');
  const gmailStatus = document.getElementById('gmail-status');
  
  browser.storage.local.get(['supabaseUserUUID', 'gmailAuthToken'], (result) => {
    if (result.supabaseUserUUID && !['premium', 'family'].includes((result.subscription_status || 'free').toLowerCase()) && discoverySection) {
      discoverySection.style.display = 'none';
    } else if (result.supabaseUserUUID && discoverySection) {
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