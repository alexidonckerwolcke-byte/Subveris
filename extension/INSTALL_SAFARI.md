# Installing Subveris Tracker on Safari (macOS)

Subveris Tracker now works on Safari 15+ thanks to cross-browser support via the WebExtensions standard.

## Requirements

- **macOS 11+** (Big Sur or later)
- **Safari 15+** (Released September 2021)
- **Xcode or Xcode Command Line Tools** (for building the extension)
- Apple Developer Account (optional, required only for App Store distribution)

## Installation Method 1: Developer Mode (Recommended for Testing)

### Step 1: Prepare the Extension

```bash
# Navigate to the Subveris project directory
cd /path/to/Subveris

# The extension folder is already compatible
# No changes needed - Safari uses the same browser.* API namespace
```

### Step 2: Create a Safari Web Extension

Safari requires wrapping the extension in a native macOS app bundle. Use Xcode:

```bash
# Install Xcode (if not already installed)
xcode-select --install

# Or download from App Store
# Then run: sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

### Step 3: Build for Safari

```bash
# Copy extension to a Safari extension project
mkdir -p ~/SafariExtensionProject
cp -r extension ~/SafariExtensionProject/Subveris

# Create the Xcode project structure
cd ~/SafariExtensionProject
xcrun safari-web-extension-converter Subveris
```

This creates an Xcode project in `SubverisExtension.xcodeproj`.

### Step 4: Open in Xcode and Build

```bash
open SubverisExtension.xcodeproj
```

In Xcode:
1. Select the project "SubverisExtension" in the left sidebar
2. Select target "Subveris Web Extension"
3. Build with **Product → Build** (or Cmd+B)

### Step 5: Run in Safari

1. Go to **Safari → Preferences → Extensions** (or Safari → Settings → Extensions on newer macOS)
2. Find "Subveris" in the left sidebar
3. Check the box next to "Subveris Tracker"
4. Verify it appears in your Safari toolbar

## Installation Method 2: Building from Command Line

```bash
# Create minimal Safari extension wrapper
cd /path/to/Subveris

# Use web-ext tool (Firefox's build tool, also works for Safari)
npm install -g web-ext

# Build for Safari
web-ext build --source-dir=extension --filename=subveris-safari.zip
```

## Installation Method 3: Direct Load (macOS Ventura+)

For macOS 13 (Ventura) and later:

1. **Enable Developer Mode in Safari**:
   - Open Safari
   - Go to **Safari → Preferences → Advanced**
   - Check "Show Develop menu in menu bar"

2. **Load the Extension**:
   - Click **Develop → Allow Unsigned Extensions**
   - Go to **Safari → Preferences → Extensions**
   - Click the **+** button and select the `extension` folder
   - Grant permissions when prompted

## First Time Setup

### Configure in the App

1. Open your Subveris app in Safari
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

### Extension not appearing in Safari

**Problem**: Extension doesn't show in toolbar
**Solution**: 
- Go to Safari Preferences → Extensions
- Find "Subveris Tracker"
- Check it's enabled
- If missing entirely, rebuild in Xcode or use web-ext

### Gmail authentication fails

**Problem**: Can't connect Gmail account
**Solution**:
- Ensure you're logged into Google in Safari
- Check Safari allows pop-ups from Subveris app
- Try clearing Safari cache: Preferences → Privacy → Manage Website Data

### Extension not detecting subscriptions

**Problem**: Website visits aren't being tracked
**Solution**:
- Verify extension is enabled in Safari Preferences → Extensions
- Check "Allow on all websites" is enabled for Subveris
- Try reloading the subscription website

### Build errors in Xcode

**Problem**: Xcode reports build failures
**Solution**:
```bash
# Clean build
xcodebuild clean
xcodebuild build

# Or reset Xcode
sudo xcode-select --reset
```

## Platform-Specific Notes

### Privacy & Security

Safari's security model is stricter than Chrome:
- ✅ Gmail access requires OAuth consent (as designed)
- ✅ Download detection works normally
- ⚠️ Website tracking is limited to sites you've allowed
- ⚠️ Requires re-granting permissions after Safari updates

### Permissions

Safari will ask for:
- **Read websites**: Allows tracking on subscription sites
- **Read Gmail**: OAuth only - direct Gmail API access with your consent
- **Access downloads**: Detects CSV files in Downloads folder

Grant all permissions for full functionality.

### Sandbox Restrictions

Safari runs extensions in a sandbox. This means:
- ✅ All subscription data is encrypted
- ✅ No access to system files
- ⚠️ Background sync works every 5 minutes (browser limitation)

## Distribution: Publishing to App Store

If you want to submit to Apple App Store:

1. **Enroll in Apple Developer Program**: $99/year
2. **Set up signing certificate** in Xcode
3. **Update app version and metadata** in Xcode
4. **Archive the app**: Product → Archive
5. **Upload to App Store Connect**: Organizer → Upload

Full guide: https://developer.apple.com/documentation/safari-web-extensions

## Development Tips

### Testing Different Safari Versions

```bash
# Check Safari version
system_profiler SPSoftwareDataType | grep Safari

# Test on multiple Safari versions using VirtualBox or Parallels
```

### Debugging the Extension

In Safari:
1. Go to **Develop → Web Inspector → [Website]**
2. Check Console for errors
3. Check Network tab for API calls to Subveris backend

### Hot Reload During Development

Unlike Chrome, Safari requires rebuilding and reloading after each change:

```bash
# After modifying extension code:
cd ~/SafariExtensionProject
xcodebuild build
# Then manually reload in Safari Preferences → Extensions
```

## FAQ

**Q: Why does Subveris need a native app wrapper on Safari?**  
A: Safari requires extensions to be signed and bundled with a native macOS app for security. This is a Safari requirement, not a Subveris limitation.

**Q: Can I install on iOS/iPadOS?**  
A: Not yet. Safari on iOS/iPadOS has limited extension support. Contact us if this is important for your workflow.

**Q: Does cross-browser sync work?**  
A: Yes! All browsers (Chrome, Safari, Firefox, Edge) send data to the same Subveris backend. Your subscriptions appear on the dashboard regardless of browser.

**Q: Is the extension safe to use on Safari?**  
A: Absolutely. Subveris meets Apple's privacy standards:
- No tracking without permission
- Gmail access is read-only and OAuth-protected
- Download detection only scans your Downloads folder
- All data encrypted in transit and at rest

## Support

If you encounter issues:

1. Check this guide's Troubleshooting section
2. Review error messages in Safari console (Develop menu)
3. Contact support: help@subveris.io
4. Open an issue on GitHub: https://github.com/subveris/extension

## Next Steps

- ✅ Extension is installed and enabled
- ✅ Gmail is connected in Settings
- 📊 Visit your Dashboard to see detected subscriptions
- 💰 Get recommendations for savings in the Insights page
