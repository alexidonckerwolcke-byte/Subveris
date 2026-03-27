# SubSave Usage Tracker Extension

This Chrome extension tracks time spent on subscription websites (Netflix, Disney+, Hulu) and sends usage data to Supabase.

## Installation

1. Open Chrome and go to `chrome://extensions`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `extension` folder from this repository

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