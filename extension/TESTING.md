# Browser Extension Testing Guide

## Setup Steps

### 1. Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right corner)
3. Click **"Load unpacked"** button
4. Select the `/extension` folder from this project
5. You should see "Subveris Usage Tracker" in your extensions list

### 2. Start the Development Server

Make sure the Subveris app is running on `http://localhost:5000`:

```bash
npm run dev
```

### 3. Log into Subveris

1. Open `http://localhost:5000` in your browser
2. Sign up or log in with your account
3. The extension will automatically capture your auth token when you log in

## Testing the Extension

### Check Connection Status

1. Click the Subveris Tracker extension icon in Chrome toolbar
2. The popup should show **"✅ Connected to Subveris"** if you're logged in
3. It displays your current domain and tracking status

### Test Usage Tracking

1. Visit a subscription website (Netflix, Disney+, Hulu, etc.)
2. Add it as a subscription in Subveris (important: use the correct domain)
3. Spend at least 10 seconds on that website
4. The extension tracks time when the page:
   - Loses focus
   - Is closed
   - You navigate away

### View Console Logs

For debugging, check the extension's console:

1. Go to `chrome://extensions/`
2. Find "Subveris Usage Tracker"
3. Click **"Details"** → **"Inspect views: background page"**
4. Open **Developer Tools** (F12)
5. Check the **Console** tab for logs like:
   - `[Inject] Found auth token, sending to extension`
   - `[Extension] ✅ Auth token loaded on page load`
   - `[Extension] 📊 Tracking usage for domain...`
   - `[Extension] ✅ Usage tracked`

### Common Issues

**Extension shows "❌ Not connected"**
- Make sure you've logged into Subveris first
- Refresh the page after logging in
- Check the browser console for errors

**Usage not being tracked**
- Verify you added the subscription with the correct domain in Subveris
- Check that you spent more than 10 seconds on the page
- Look at console logs in the extension

**No auth token found**
- Log out and log back into Subveris
- Clear browser cache
- Reload the extension (go to chrome://extensions and click reload)

## Troubleshooting

### Check Extension Storage

Open the extension background console and run:
```javascript
chrome.storage.local.get(null, (items) => {
  console.log('Extension storage:', items);
});
```

### Clear Extension Storage

If the extension gets stuck with an old token:
```javascript
chrome.storage.local.clear(() => {
  console.log('Extension storage cleared');
  location.reload();
});
```

### View All Console Messages

The extension logs with prefixes:
- `[Inject]` - Page context logs
- `[Extension]` - Content script logs
- `[Background]` - Background service worker logs

Check all three locations for complete debugging info.
