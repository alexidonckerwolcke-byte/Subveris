# Subveris Tracker Extension

A cross-browser extension that automatically tracks subscription services, scans emails for receipts, and detects payments to help you manage and optimize your subscriptions.

**Now available on:** Chrome • Edge • Firefox • Safari (15+)

## Installation

Choose your browser for detailed setup instructions:

### 🌐 Chrome (Easiest)
1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension` folder from this repository

### 🦊 Firefox
See full guide: [INSTALL_FIREFOX.md](INSTALL_FIREFOX.md)
- Simplest installation process
- Recommended for new users
- Full WebExtensions support

### 🧭 Safari (macOS)
See full guide: [INSTALL_SAFARI.md](INSTALL_SAFARI.md)
- Requires macOS 11+ and Safari 15+
- Uses native Xcode project
- Full App Store integration ready

### 🔷 Edge
- Same as Chrome (Edge uses Chromium)
- Go to `edge://extensions`
- Load unpacked from the `extension` folder

## Setup

Before using the extension, you need to:

1. Log into your SubSave SaaS application
2. The app will automatically store your user ID in localStorage

## How it works

- The extension injects content scripts on Netflix, Disney+, and Hulu
- It tracks time spent on these sites using the Page Visibility API
- When you leave a tab or close it, usage data is sent to Supabase
- Data includes: site name, time spent (seconds), date, and user ID

## Files

- `manifest.json`: Extension configuration
- `background.js`: Service worker that handles data sending
- `content.js`: Content script for tracking time
- `popup.html` & `popup.js`: Extension popup to check connection status

## Configuration

Update `background.js` with your Supabase URL and anon key:

```javascript
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_ANON_KEY = 'your-supabase-anon-key';
```