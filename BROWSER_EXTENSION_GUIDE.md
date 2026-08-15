# Browser Extension Installation Guide

Subveris Tracker is now available on all major browsers! Choose your platform below for setup instructions.

## Quick Start by Browser

| Browser | Status | Setup Time | Difficulty | Guide |
|---------|--------|-----------|------------|-------|
| **Chrome** | ✅ Best | 2 min | Easy | [Chrome Setup](#chrome--edge-setup) |
| **Edge** | ✅ Full | 2 min | Easy | [Chrome Setup](#chrome--edge-setup) |
| **Firefox** | ✅ Full | 3 min | Easy | [Firefox Setup](extension/INSTALL_FIREFOX.md) |
| **Safari** | ✅ Full | 15 min | Medium | [Safari Setup](extension/INSTALL_SAFARI.md) |

---

## Chrome & Edge Setup

### 1. Download the Extension

```bash
# Clone Subveris repository
git clone https://github.com/subveris/extension.git
cd extension
```

### 2. Open Extensions Page

**Chrome:**
- Open Chrome and type `chrome://extensions` in the address bar
- Or: Menu (⋯) → More tools → Extensions

**Edge:**
- Open Edge and type `edge://extensions` in the address bar
- Or: Menu (⋯) → Extensions → Manage Extensions

### 3. Enable Developer Mode

Look for the toggle in the **top right corner** and turn it on.

### 4. Load Unpacked Extension

1. Click **"Load unpacked"** button
2. Navigate to and select the `extension` folder
3. Click **"Open"**

The extension will appear in your toolbar with a 📦 icon.

### 5. First Time Setup

1. **Open the Subveris app** in the browser
2. **Log in** with your account
3. **Go to Settings → Connected Services**
4. **Click "Connect Gmail Account"**
5. **Grant permissions** when prompted

✅ Extension is now active!

---

## Firefox Setup

For full instructions with troubleshooting, see [INSTALL_FIREFOX.md](extension/INSTALL_FIREFOX.md)

### Quick Version

```bash
# Install web-ext build tool
npm install -g web-ext

# Navigate to extension
cd extension

# Build for Firefox
web-ext build --filename=subveris.xpi
```

Then:
1. Open Firefox
2. Go to `about:addons`
3. Click ⚙️ → "Install Add-on From File"
4. Select the built `subveris.xpi`
5. Click "Add"

---

## Safari Setup

For full instructions with Xcode integration, see [INSTALL_SAFARI.md](extension/INSTALL_SAFARI.md)

### Requirements

- **macOS 11+** (Big Sur or later)
- **Safari 15+**
- **Xcode** (free from App Store)

### Quick Version

```bash
# Install Xcode command line tools
xcode-select --install

# Convert to Safari extension
xcrun safari-web-extension-converter extension

# Open in Xcode
open SubverisExtension.xcodeproj
```

Then:
1. Click **Product → Build** in Xcode
2. Go to Safari Preferences → Extensions
3. Enable "Subveris Tracker"

---

## First Time Setup (All Browsers)

### Step 1: Open Subveris App

Navigate to your Subveris dashboard in the browser where you installed the extension.

### Step 2: Log In

Sign in with your account. The extension will automatically detect your login.

### Step 3: Connect Gmail (Optional but Recommended)

1. Go to **Settings → Connected Services**
2. Look for "Connected Services" card
3. Click **"Connect Gmail Account"**
4. You'll see a Google login popup
5. Grant permission to read your email
6. Extension will start scanning every 5 minutes

### Step 4: Verify It's Working

1. Visit any subscription site (Netflix, Spotify, Disney+, etc.)
2. Open the Subveris extension popup (toolbar icon)
3. Look for "🔍 Auto Discovery Methods"
4. You should see it's connected
5. Go back to dashboard - new subscriptions appear within 5 minutes

---

## Features Available on Each Browser

### Chrome & Edge
- ✅ Website visit tracking
- ✅ Gmail receipt scanning  
- ✅ CSV auto-detection
- ✅ Auth cookie scanning
- ✅ Usage time measurement
- ✅ Real-time sync

### Firefox  
- ✅ Website visit tracking
- ✅ Gmail receipt scanning
- ✅ CSV auto-detection
- ✅ Auth cookie scanning
- ✅ Usage time measurement
- ✅ Real-time sync
- ✅ Complete WebExtensions support

### Safari (15+)
- ✅ Website visit tracking
- ✅ Gmail receipt scanning
- ⚠️ CSV auto-detection (limited by sandbox)
- ✅ Auth cookie scanning
- ✅ Usage time measurement
- ✅ Real-time sync

### Note on Differences

All browsers share the same backend, so subscriptions detected in one appear everywhere. Minor API limitations on Safari are handled gracefully - all core features work.

---

## Troubleshooting

### Extension not visible in toolbar

**Chrome/Edge:**
- Go to Extensions page (chrome://extensions or edge://extensions)
- Find Subveris, click ⋮ menu
- Select "Show in toolbar"

**Firefox:**
- Go to about:addons
- Find Subveris, click ⋮ menu
- Select "Manage Extension" 
- Toggle on if disabled

**Safari:**
- Go to Safari Preferences → Extensions
- Find Subveris, ensure it's checked

### Gmail authorization fails

1. Clear browser cookies for `accounts.google.com`
2. Make sure you're logged into your Google account
3. Check browser pop-up settings allow subveris.app
4. Try again in an Incognito/Private window

### Subscriptions not detected

1. **Verify extension is enabled:**
   - Check extension list (see above for each browser)
   - Ensure toggle is ON

2. **Check permissions:**
   - Extension should have access to all websites
   - If prompted, grant all requested permissions

3. **Try visiting a subscription site:**
   - Go to Netflix, Spotify, or any paid service
   - Let the page fully load
   - Check extension popup for detection

4. **Check Gmail scanning:**
   - Ensure Gmail is connected (look for ✅ in popup)
   - Wait 5+ minutes for scan (throttled to save quota)

### Extension stopped working after browser update

This shouldn't happen, but if it does:

**Chrome/Edge:** Reload the extension
- Go to extensions page
- Find Subveris
- Click the reload icon (↻)

**Firefox:** Firefox extensions are auto-updated
- Just restart Firefox
- Or visit about:addons and check manually

**Safari:** Rebuild in Xcode and reload
- Open Xcode
- Click Product → Clean Build Folder
- Click Product → Build
- Reload in Safari Preferences

---

## Cross-Browser Sync

All browsers work with the same account:

```
Chrome                              Firefox                             Safari
  ↓                                   ↓                                  ↓
  └─────────────────────────────────────────────────────────────────────┘
                          Subveris Backend
                    
                   ← All subscriptions visible everywhere →
```

If you detect a subscription in Chrome, it shows up in Firefox, Safari, and on the web dashboard.

---

## Security & Privacy

### Data Handling

- ✅ All data sent via HTTPS (encrypted in transit)
- ✅ Stored securely in Supabase (encrypted at rest)
- ✅ Gmail access is read-only via OAuth
- ✅ No cookies or passwords are ever sent
- ✅ No telemetry or tracking of extension usage

### Permissions

Each browser may ask for:

| Permission | Why | Safe? |
|-----------|-----|-------|
| Access all websites | Track subscription visits | ✅ Only logs domain/time |
| Read Gmail | Scan for receipts | ✅ OAuth, read-only, user consent |
| Access downloads | Detect CSV files | ✅ Only reads filenames |
| Store data locally | Cache subscriptions | ✅ Local only, not shared |

### Revoke Access Anytime

**Gmail Access:**
- Go to Settings → Connected Services → Disconnect
- Or revoke at Google Account: https://myaccount.google.com/permissions

**Extension Access:**
- Go to browser extensions page
- Click remove or disable
- All data remains in your Subveris account

---

## Getting Help

### Check These First

1. **Read the browser-specific guide:**
   - Chrome/Edge: Above
   - Firefox: [INSTALL_FIREFOX.md](extension/INSTALL_FIREFOX.md)
   - Safari: [INSTALL_SAFARI.md](extension/INSTALL_SAFARI.md)

2. **Check browser console for errors:**
   - Chrome: F12 → Console tab
   - Firefox: Ctrl+Shift+K
   - Safari: Develop → Show Error Console
   - Look for [Extension] messages

3. **Try the extension in a new browser profile:**
   - Sometimes conflicts with other extensions
   - Create a new Chrome profile to test
   - Or use Incognito/Private window

### Contact Support

- Email: support@subveris.io
- GitHub Issues: https://github.com/subveris/extension/issues
- Live Chat: Available in Subveris app

Include when reporting issues:
- Which browser and version
- What you were trying to do
- What happened instead
- Any error messages from console

---

## Development & Contributing

### Contributing to Extension

We welcome contributions! To help improve Subveris:

1. Fork the repository
2. Make changes in the `extension/` folder
3. Test locally (see above for your browser)
4. Submit a pull request

### Building for Distribution

**Chrome Web Store:**
```bash
cd extension
web-ext build --source-dir=. --filename=subveris.zip
# Upload subveris.zip to Chrome Web Store
```

**Firefox Add-ons:**
```bash
cd extension
web-ext build --filename=subveris.xpi
# Submit subveris.xpi to Firefox Add-ons
```

**Safari App Store:**
```bash
# Open in Xcode and use Product → Archive
# Then upload via Xcode or App Store Connect
```

---

## FAQ

**Q: Do I need to install on every browser?**  
A: No, each browser gets its own copy. But they all sync to the same account, so you only need one.

**Q: Can I uninstall on one browser and reinstall?**  
A: Yes, just disable/remove the extension. Your subscription data is safe on the Subveris server.

**Q: Does the extension work offline?**  
A: Locally it works, but data won't sync. It needs internet to send discoveries to your dashboard.

**Q: Which browser should I choose?**  
A: Use whichever you prefer. Features are identical. Chrome and Firefox are easiest to install.

**Q: Is there a mobile app?**  
A: Not yet, but the web app (subveris.app) works great on mobile for viewing subscriptions.

**Q: Can I install on multiple computers?**  
A: Yes! Install the extension on any computer/browser. Everything syncs to your account.

---

## What's Next?

1. ✅ Extension installed and enabled
2. ✅ Gmail connected (if you want receipt scanning)
3. 📊 Visit your Dashboard to see detected subscriptions  
4. 💡 Check Insights for savings recommendations
5. ⚙️ Adjust privacy settings if needed

Enjoy tracking your subscriptions! 🎉
