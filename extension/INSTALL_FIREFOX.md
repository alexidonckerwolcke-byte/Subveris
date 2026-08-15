# Installing Subveris Tracker on Firefox

Subveris Tracker works on **Firefox 48+** thanks to full WebExtensions standard support. Firefox is actually the most straightforward browser to install on!

## Requirements

- **Firefox 48 or later** (Released August 2016)
- **5 MB of free disk space**

## Installation Method 1: Temporary Load (Development/Testing)

Best for testing the extension locally.

### Step 1: Open Firefox and Navigate to Add-ons

```
1. Open Firefox
2. Type about:debugging in the address bar
3. Press Enter
```

Or use the menu:
```
Firefox Menu (☰) → More tools → Web Developer Tools → Debugger → about:debugging
```

### Step 2: Load the Extension

On the about:debugging page:

1. Click **"This Firefox"** in the left sidebar
2. Click **"Load Temporary Add-on"**
3. Navigate to your Subveris project folder
4. Select **`extension/manifest.json`**
5. Click **"Open"**

The extension will now appear in your Firefox toolbar.

### Limitations of Temporary Load

- Extension will be **removed when Firefox closes**
- Use this method for development/testing
- For permanent installation, see Method 2

## Installation Method 2: Install via XPI File (Recommended for Regular Use)

### Step 1: Build the Extension

```bash
# Navigate to Subveris project
cd /path/to/Subveris

# Install web-ext build tool (one-time setup)
npm install -g web-ext

# Build the extension
web-ext build --source-dir=extension --filename=subveris.xpi
```

This creates `subveris.xpi` in the `extension/web-ext-artifacts/` folder.

### Step 2: Install in Firefox

**Option A: Drag and Drop**
1. In Firefox, click the address bar and type `about:addons`
2. Find the built `subveris.xpi` file on your computer
3. Drag and drop it into the Firefox tab
4. Click **"Add"** when prompted

**Option B: Manual Installation**
1. Open `about:addons` (Firefox Menu → Add-ons & Extensions)
2. Click the ⚙️ settings icon
3. Select **"Install Add-on From File"**
4. Navigate to `subveris.xpi`
5. Click **"Open"**

### Step 3: Grant Permissions

Firefox will ask for permissions:
- ✅ Access your data for all websites
- ✅ Read Gmail (OAuth only)
- ✅ Detect downloads

Click **"Add"** to grant all permissions.

## Installation Method 3: Automatic Installation (Future)

Once Subveris is submitted to Mozilla Add-ons Store:

1. Go to Firefox Add-ons: https://addons.mozilla.org
2. Search for "Subveris Tracker"
3. Click **"Add to Firefox"**
4. Grant permissions

This is the easiest method but requires Mozilla approval (1-2 weeks).

## First Time Setup

### Configure in the App

1. Open your Subveris app in Firefox
2. Go to **Settings → Connected Services**
3. Click **"Connect Gmail Account"**
4. Grant the extension permission to read your Gmail receipts
5. The extension will start scanning automatically

### Verify It's Working

Check the extension is tracking by:

1. **Visit a subscription service** (Netflix, Spotify, etc.)
2. **Open the Subveris extension** (toolbar icon)
3. **Look for "Auto Discovery" status**
4. Check your **Subveris Dashboard** for newly detected subscriptions

## Troubleshooting

### Extension not appearing in toolbar

**Problem**: Subveris icon doesn't show
**Solution**:
- Open Firefox Menu → Add-ons & Extensions
- Search for "Subveris"
- If found, click the ⋯ menu and ensure it's enabled
- Restart Firefox if needed

### "Add-on is not properly signed" error

**Problem**: Firefox rejects the extension
**Solution**: This is normal for development. Either:
- Use Firefox Developer Edition (allows unsigned extensions)
- Or submit to Mozilla Add-ons for signing (recommended for production)

To use Firefox Developer Edition:

```bash
# Install Firefox Developer Edition
# macOS
brew install firefox@developer-edition

# Linux
sudo apt install firefox-developer-tools

# Then load the extension via about:debugging
```

### Gmail connection fails

**Problem**: Can't authenticate with Gmail
**Solution**:
- Ensure you're logged into your Google account in Firefox
- Check Firefox allows pop-ups: Settings → Privacy & Security → Permissions → Pop-ups
- Add `https://subveris.app` to the pop-up allowlist
- Clear cookies: Settings → Privacy & Security → Clear Data

### Website tracking not working

**Problem**: Visits to Netflix/Spotify aren't detected
**Solution**:
- Verify extension is enabled in about:addons
- Check permission is granted for the website:
  1. Visit the subscription site
  2. Click 🔒 lock icon in address bar
  3. Ensure Subveris shows in permissions
- Try reloading the page

### CSV detection not working

**Problem**: Downloaded CSV files aren't detected
**Solution**:
- Save the CSV to your Downloads folder (default location)
- Check filename contains keywords like "subscription", "invoice", or "bill"
- Wait 30-60 seconds for detection
- Check Browser Console for errors: Ctrl+Shift+K

## Platform-Specific Features

### Firefox Privacy Features

Firefox has built-in privacy advantages:
- **Enhanced Tracking Protection**: Enabled by default, allows Subveris
- **Fingerprinting Protection**: Doesn't interfere with extension
- **Total Cookie Protection**: Scanned on initial load (by design)

### Permissions Model

Firefox requires explicit permission for:
- Website access (you can restrict to specific sites)
- Gmail access (OAuth only, shown in Settings)
- Download folder access (limited to reading filenames)

### Performance

Firefox extensions are highly optimized:
- Minimal memory footprint
- 5-minute sync interval (efficient scheduling)
- Supports background scripts unlike some other browsers

## Development & Debugging

### View Console Logs

```
1. Press Ctrl+Shift+K (or Cmd+Shift+K on Mac)
2. Look for [Extension] messages
3. Check for API errors
```

### Debug Extension Code

```
1. Open about:debugging
2. Find "Subveris Tracker" and click "Inspect"
3. View console, network, storage
```

### Monitor Network Requests

```
1. Open Developer Tools (F12)
2. Go to Network tab
3. Filter for API calls to subveris.app
4. Verify requests succeed
```

### Modify Extension Code & Reload

```bash
# After editing any file in extension/:
# 1. Save the file
# 2. Go to about:debugging
# 3. Find Subveris → Click ⟳ Reload
# Changes take effect immediately
```

## Submitting to Mozilla Add-ons Store

To make installation easier for users, submit to addons.mozilla.org:

### Step 1: Create Mozilla Account

Visit: https://accounts.firefox.com/signup

### Step 2: Create Developer Account

1. Go to https://addons.mozilla.org
2. Click your account icon
3. Select "Developer Hub"
4. Accept terms

### Step 3: Upload Extension

1. Click "Submit a New Add-on"
2. Choose "Upload"
3. Select your `subveris.xpi` file
4. Fill in metadata (name, description, icons, screenshots)

### Step 4: Review & Approval

- Mozilla reviews for security (typically 1-2 weeks)
- Minor issues reviewed in 2-3 days
- Once approved, appears on Firefox Add-ons store

### Step 5: Future Updates

To update:
```bash
# Increment version in manifest.json
# "version": "1.2.0" → "1.3.0"

web-ext build --source-dir=extension
# Upload new XPI to addons.mozilla.org
```

## Cross-Browser Sync

All browsers (Chrome, Safari, Firefox, Edge) share the same backend:

- ✅ Detected subscriptions appear on dashboard in all browsers
- ✅ Gmail connection syncs across browsers
- ✅ Settings changes instantly propagate
- ✅ Usage data combines across browser usage

## FAQ

**Q: Why is Firefox different from Chrome?**  
A: Firefox fully supports WebExtensions standard from the start. Chrome also supports it, but we maintained backwards compatibility with older Chrome-specific APIs. Firefox requires no compatibility shim.

**Q: Can I use both Chrome and Firefox simultaneously?**  
A: Yes! Both will sync to the same account. Subscriptions detected in either browser appear everywhere.

**Q: Is Firefox slower than Chrome for the extension?**  
A: No. Firefox's extension engine is as fast as Chrome's. Both sync every 5 minutes.

**Q: Do I need to configure anything differently?**  
A: No. Gmail connection, CSV detection, website tracking all work identically to Chrome.

**Q: What if Firefox updates?**  
A: The extension will continue working. Mozilla maintains backward compatibility for WebExtensions.

**Q: Can I install on Firefox Mobile?**  
A: Firefox Mobile has limited extension support. Only a few categories are allowed. Subveris may not be compatible depending on Mozilla's policies. Check addons.mozilla.org/firefox/android/.

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review error messages in Browser Console (Ctrl+Shift+K)
3. Check Firefox version: Firefox Menu → About Firefox
4. Contact support: help@subveris.io
5. Open an issue on GitHub: https://github.com/subveris/extension

## Next Steps

- ✅ Extension is installed and enabled
- ✅ Gmail is connected in Settings
- 📊 Visit your Dashboard to see detected subscriptions
- 💰 Get recommendations for savings in the Insights page
