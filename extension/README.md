# Subveris Tracker Extension

A cross-browser extension that automatically discovers and tracks your subscriptions through multiple methods:

✅ **Website visit tracking** - Detects when you visit subscription services  
✅ **Gmail receipt scanning** - Finds subscription confirmations in your email  
✅ **CSV import detection** - Auto-detects subscription lists you download  
✅ **Auth cookie scanning** - Identifies subscriptions from login cookies  

**Now available on:** Chrome • Edge • Firefox

## Quick Installation

### 🌐 Chrome & Edge (Easiest)
1. Go to your Subveris dashboard: **Files → Download Extension**
2. Extract the ZIP file
3. Open `chrome://extensions` (Chrome) or `edge://extensions` (Edge)
4. Enable "Developer mode" (top right)
5. Click "Load unpacked" and select the extracted folder
✅ Done!

### 🦊 Firefox (1 minute)
1. Open Firefox
2. Go to: https://addons.mozilla.org/firefox/addon/subveris-tracker/
3. Click "Add to Firefox"
✅ Done!

### Safari
Safari support is coming soon. The extension is currently available for Chrome, Edge, and Firefox.

For detailed guides, see: [INSTALL_FIREFOX.md](INSTALL_FIREFOX.md)

## First Time Setup

After installation:

1. **Open your Subveris app** (subveris.app)
2. **Log in** with your account
3. **Go to Settings → Connected Services**
4. **Connect Gmail** (optional but recommended - scans receipts every 5 minutes)
5. **Visit any subscription site** to test tracking

## How It Works

### 📧 Gmail Receipt Scanning
- Scans your Gmail inbox for subscription receipts and confirmations
- Requires one-time OAuth login (read-only access)
- Runs automatically every 5 minutes
- Extracts service name, amount, and frequency from emails

### 🌐 Website Visit Tracking
- Detects when you visit Netflix, Spotify, Disney+, and 20+ other services
- Logs time spent and usage patterns
- Uses Page Visibility API for accurate measurements

### 📁 CSV Auto-Detection
- Automatically finds subscription CSV files in your Downloads folder
- Parses files with flexible column detection
- Supports: subscriptions, invoices, billing reports

### 🍪 Auth Cookie Scanning  
- Scans your browser cookies once at login
- Identifies subscriptions from authentication tokens
- One-time operation, runs automatically

## Architecture

- **Background Service Worker** (`background.js`): Orchestrates all detection methods, syncs to backend every 5 minutes
- **Content Script** (`content.js`): Injects on web pages, tracks visits and usage time
- **Extension Popup** (`popup.html`/`popup.js`): Shows connection status and provides Gmail authorization UI
- **Backend Sync** (`/api/extension/detected-subscriptions`): Sends detected subscriptions to Subveris backend

## Data Privacy

- ✅ All data encrypted in transit (HTTPS)
- ✅ Gmail access is OAuth read-only
- ✅ No cookies or passwords stored
- ✅ No tracking of your browsing behavior outside subscriptions
- ✅ All data tied to your account, never shared

## File Structure

```
extension/
├── manifest.json              # Extension configuration (Manifest V3)
├── background.js              # Service worker (all detection logic)
├── content.js                 # Content script (website visit tracking)
├── popup.html & popup.js      # Popup UI
├── inject.js                  # Helper for parsing email content
└── price-discovery-utils.cjs  # Utility functions
```

## Browser Compatibility

| Feature | Chrome | Edge | Firefox |
|---------|--------|------|---------|
| Website tracking | ✅ | ✅ | ✅ |
| Gmail scanning | ✅ | ✅ | ✅ |
| CSV detection | ✅ | ✅ | ✅ |
| Cookie scanning | ✅ | ✅ | ✅ |

## Troubleshooting

**Extension not appearing in toolbar?**
- Go to your browser's extension settings
- Find "Subveris Tracker" and enable it
- Restart the browser

**Gmail connection failing?**
- Make sure you're logged into Google
- Check that your browser allows pop-ups
- Try clearing cookies and reconnecting

**Subscriptions not detected?**
- Verify the extension is enabled
- Visit the subscription site and reload
- Wait 5+ minutes for Gmail scan to complete

## Support

- 📖 Full docs: https://subveris.app/docs
- 💬 Contact: help@subveris.io
- 🐛 Report issues: https://github.com/subveris/extension/issues

## Next Steps

After installing:
1. 📊 Check your Dashboard to see detected subscriptions
2. 💰 Visit Insights for savings recommendations
3. ⚙️ Adjust settings in Connected Services

---

Made with ❤️ by Subveris  
Last updated: 2026