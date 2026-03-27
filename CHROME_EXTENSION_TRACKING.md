# Chrome Extension - Automatic Usage Tracking

## ⚠️ IMPORTANT: System Requirements

### Browser Compatibility
- ✅ **Google Chrome** (Recommended)
- ✅ **Microsoft Edge**
- ❌ Safari - NOT supported
- ❌ Firefox - NOT supported
- ❌ Opera - NOT supported

### Account Requirement
- **MUST use the SAME email account** you signed up with on this website
- Extension only works on **one email per browser**
- Each browser/device needs separate login
- Cross-device tracking requires separate installation on each device

---

## How It Works

1. **Domain Tracking**: Extension detects the root domain of each website you visit
2. **Matching**: Finds subscriptions with matching `website_domain` field
3. **Auto-Increment**: Automatically increments `usageCount` when you spend >10 seconds on the site
4. **Cost-Per-Use Updates**: Cost-per-use analytics automatically recalculate

---

## Complete Setup Guide (Step-by-Step)

### Step 1: Prepare Your Account

1. **Write down your email** - You'll need to use this same email in the browser
2. **Open Chrome or Edge** - Extension only works on these browsers
3. **Log in to this website** at `http://localhost:5000` (or your domain)
   - Use the email you want to track subscriptions for
   - Keep this browser window open for now

### Step 2: Add Website Domains to Subscriptions

Before installing the extension, configure your subscriptions with website domains.

**On this website:**

1. Go to **Subscriptions** page
2. Create a new subscription OR edit an existing one
3. Fill in the **"Website Domain"** field

**Domain Examples:**
```
Netflix     → netflix.com
Spotify     → spotify.com
Dropbox     → dropbox.com
GitHub      → github.com
AWS         → aws.amazon.com
Slack       → slack.com
Notion      → notion.so
```

**Important:**
- Use lowercase letters
- No `www.` prefix (we match both)
- No `https://` or protocol
- Just the domain: `example.com`

### Step 3: Setup Supabase Column (ONE TIME ONLY)

The `website_domain` column must exist in Supabase before tracking works.

**You only need to do this ONCE per Supabase project:**

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **SQL Editor** (left sidebar)
4. Click **"New query"**
5. Copy and paste this SQL:

```sql
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS website_domain TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_website_domain ON subscriptions(user_id, website_domain);
```

6. Click the **"Run"** button (or Cmd+Enter)
7. You should see a success message
8. **Done!** This is a one-time setup

### Step 4: Install Extension in Chrome

**IF YOU USE GOOGLE CHROME:**

1. Open Chrome
2. Type in address bar: `chrome://extensions/`
3. Press Enter
4. **Toggle "Developer mode"** ON (top-right corner)
5. Click **"Load unpacked"** button
6. In the folder picker:
   - Navigate to your project folder
   - Select the **`/extension`** folder
   - Click "Select"
7. You should see the extension appear in your list
8. **Verify it's enabled** (blue toggle should be ON)

**IF YOU USE MICROSOFT EDGE:**

1. Open Edge
2. Type in address bar: `edge://extensions/`
3. Press Enter
4. **Toggle "Developer mode"** ON (left sidebar, bottom)
5. Click **"Load unpacked"** button
6. In the folder picker:
   - Navigate to your project folder
   - Select the **`/extension`** folder
   - Click "Select"
7. You should see the extension appear in your list
8. **Verify it's enabled** (toggle should be ON)

### Step 5: Verify You're Logged In

**THIS IS CRITICAL - Extension only works if you're logged in with the correct email:**

1. In the SAME browser where you installed the extension
2. Go to `http://localhost:5000` (or your domain)
3. **Make sure you're logged in** with the email you want to track
4. You should see the dashboard
5. If you're not logged in, click login and use your email

**Why this matters:**
- Extension reads your login token from the browser
- It only tracks subscriptions for the logged-in account
- Different email = no tracking
- Logged out = no tracking

### Step 6: Test It Works

1. **Keep the website logged in** in one tab
2. **Open a new tab** and go to a website you have a subscription for
   - Example: `netflix.com` (if you added netflix.com as domain)
3. **Stay on that website for at least 10 seconds**
4. Close the tab or navigate away
5. Go back to the **Subscriptions** page on this website
6. **Check the usage count** - it should have increased by 1 ✓

**If it didn't work, see Troubleshooting below**

---

## What You'll See

### When It Works ✅
- "Usage tracked for Netflix" message
- Subscription usage count increases by 1
- Cost-per-use automatically recalculates

### When Something's Wrong ❌
- "No subscription found for this domain"
- "Invalid or expired token"
- Usage doesn't change

---

## Troubleshooting Guide

### Issue: "No subscription found for this domain"

**What it means:** Extension found the domain but no subscription matches

**How to fix:**
1. Go to Subscriptions page on website
2. Find the subscription
3. Click Edit
4. Make sure **"Website Domain"** field has the domain (e.g., `netflix.com`)
5. Save
6. Try again

---

### Issue: "Invalid or expired token"

**What it means:** Not logged in or wrong email

**How to fix:**
1. Go to `http://localhost:5000` in the same browser
2. Check if you're logged in (you should see dashboard)
3. If NOT logged in → Click "Login" and sign in
4. If logged in with WRONG email → Sign out and sign in with correct email
5. Try again

---

### Issue: Usage count not increasing

**Check these in order:**

1. **Are you using Chrome or Edge?**
   - Safari/Firefox not supported
   - Switch to Chrome or Edge

2. **Is extension installed?**
   - Chrome: Go to `chrome://extensions/`
   - Edge: Go to `edge://extensions/`
   - Look for "SubscriptionSense" extension
   - Make sure toggle is BLUE (ON)

3. **Did you add website domain?**
   - Go to Subscriptions
   - Edit subscription
   - Check "Website Domain" field
   - Should be filled (e.g., `netflix.com`)

4. **Are you logged in with correct email?**
   - Go to `http://localhost:5000`
   - Check you're logged in
   - Using SAME email as subscription

5. **Did you stay on website long enough?**
   - Need to be on website for >10 seconds
   - Then close tab or navigate away
   - Extension sends data when page closes

6. **Did you run the SQL migration?**
   - Must run SQL in Supabase one time
   - Without this, website_domain column doesn't exist
   - See Step 3 above

---

### Issue: Extension doesn't show in extensions list

**What to do:**

1. Make sure you're in **Developer mode**
   - Chrome: `chrome://extensions/` → Top right toggle
   - Edge: `edge://extensions/` → Left sidebar toggle

2. Click "Load unpacked" again
3. Select the `/extension` folder
4. Make sure you selected the right folder:
   - Should be named `/extension`
   - Should contain: `manifest.json`, `content.js`, `popup.js`, etc.

---

### Issue: Extension installed but doesn't work in one browser

**Why:** Extension is per-browser

**Solution:**
- Install extension in each browser you want to use
- Each browser needs separate installation
- If you have Chrome on Mac AND PC:
  - Install in Chrome on Mac
  - Separately install in Chrome on PC
  - You need to log in on each one

---

### Issue: Works for one email but not another

**Why:** Extension tied to logged-in account

**Solution:**
1. Sign out completely
2. Sign in with the email you want to track
3. Try again
4. Or install extension for each user (separate browser profile)

---

## How Domain Matching Works

Extension looks at the website you visit and tries to find a matching subscription:

```
Your subscription domain: netflix.com

Website you visit:              Match?
✅ netflix.com                  YES
✅ www.netflix.com              YES
✅ www.mylist.netflix.com       YES
✅ tv.netflix.com               YES
❌ disneyplus.com               NO
❌ reddit.com                   NO
```

---

## Complete Example: Netflix

### Before Extension
- Netflix subscription created
- Website Domain: NOT SET
- Usage: 0
- Cost-per-use: Can't calculate

### Install & Setup
1. ✅ Logged in with `user@gmail.com`
2. ✅ Installed extension in Chrome
3. ✅ Added domain: `netflix.com` to Netflix subscription
4. ✅ Ran SQL migration

### After Using Extension
1. Visit `netflix.com` for 10+ seconds
2. Close tab or navigate away
3. Extension sends: `domain: "netflix.com"` + auth token
4. Server updates subscription:
   - Usage: 0 → 1
   - Cost-per-use: $15.99 / 1 use = $15.99/use

### Repeated Use
- Day 1: Visit Netflix → Usage: 1
- Day 3: Visit Netflix → Usage: 2
- Day 5: Visit Netflix → Usage: 3
- Cost-per-use: $15.99 / 3 uses = $5.33/use ✅

---

## Privacy & Security

✅ **Only tracks:**
- Website domain you visit
- Time of visit
- Subscription you're using

❌ **Does NOT track:**
- What you do on the website
- Personal information
- Passwords or logins
- Browsing history

🔒 **Security:**
- Auth token stored locally (browser only)
- Server validates every request
- Must be same email account
- Data stored in Supabase database

---

## Multiple Devices / Browsers

### Same Device, Same Email
```
Mac - Chrome (logged in) ✅ Works
Mac - Edge (logged in) ✅ Works
Mac - Safari ❌ Not supported
```

### Same Device, Different Emails
```
Chrome - Email A ✅ Tracks Email A subscriptions
Chrome - Email B ❌ Won't work (one email per browser)
```

### Different Devices
```
Mac - Chrome (Email A) ✅ Tracks on Mac
PC - Chrome (Email A) ✅ Tracks on PC (separate installation)
Mac - Chrome + PC - Chrome ✅ Both work but need separate setup
```

**To use on multiple devices:**
1. Install extension on each device
2. Log in with same email on each device
3. Add website domains to subscriptions once
4. Each device will track independently

---

## Endpoint Details

### POST /api/track-usage-by-domain

**Request:**
```json
{
  "domain": "netflix.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "subscription": {
    "id": "sub_123",
    "name": "Netflix",
    "usageCount": 15,
    "websiteDomain": "netflix.com"
  },
  "message": "Usage tracked for Netflix"
}
```

**Response (Not found):**
```json
{
  "error": "No subscription found for this domain"
}
```

**Response (Not authenticated):**
```json
{
  "error": "Invalid or expired token"
}
```

---

## Testing

### Test in Browser
1. Create subscription with domain
2. Visit that domain (>10 seconds)
3. Check subscription page
4. Usage should increase by 1

### Test with Command Line
```bash
curl -X POST http://localhost:5000/api/track-usage-by-domain \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"domain": "netflix.com"}'
```

---

## Real-World Examples

### Netflix
- Domain: `netflix.com`
- Tracks: Every visit
- Benefit: See how much you actually watch

### Spotify  
- Domain: `spotify.com`
- Tracks: Web player sessions
- Benefit: Know if web player worth the cost

### GitHub Pro
- Domain: `github.com`
- Tracks: Repository visits
- Benefit: Justify Pro subscription

### AWS
- Domain: `aws.amazon.com`
- Tracks: Console usage
- Benefit: Monitor active development

---

## Quick Reference

| Question | Answer |
|----------|--------|
| What browsers work? | Chrome and Edge only |
| What email must I use? | Same email you signed up with on website |
| Will it track on Safari? | No, Safari not supported |
| Can I use different emails? | No, one email per browser |
| Do I need to install twice? | Yes, once per browser/device |
| How long on website needed? | At least 10 seconds |
| Does it track page content? | No, only domain and time |
| Is my data safe? | Yes, only stored in your Supabase |

---

## Need More Help?

**Check:**
1. Are you using Chrome or Edge?
2. Is extension installed? (`chrome://extensions/`)
3. Are you logged in? (`http://localhost:5000`)
4. Did you add website domain? (Subscriptions page)
5. Did you run SQL migration? (Supabase SQL Editor)

**If still not working:**
- Check extension errors: `chrome://extensions/` → Click "Errors"
- Check browser console: F12 → Console tab
- Verify Supabase column exists: Supabase → Table Editor → subscriptions
