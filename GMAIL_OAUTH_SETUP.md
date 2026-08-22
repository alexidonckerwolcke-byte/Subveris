# Gmail OAuth - Supabase Environment Variables Setup

## 🎯 Goal
Configure Supabase with Google OAuth credentials so the backend can generate OAuth URLs and exchange authorization codes for access tokens.

## 📋 What You Need

Three environment secrets:
1. **GOOGLE_CLIENT_ID** - From Google Cloud Console
2. **GOOGLE_CLIENT_SECRET** - From Google Cloud Console
3. **GOOGLE_REDIRECT_URI** - Your callback URL

---

## 🔑 Step 1: Get Google OAuth Credentials

### 1a. Open Google Cloud Console
- Go to: https://console.cloud.google.com
- Select your project (or create one)

### 1b. Enable Gmail API
1. Top search bar → Search "Gmail API"
2. Click "Gmail API" from results
3. Click "Enable" button
4. Wait for it to enable (~30 seconds)

### 1c. Create OAuth 2.0 Credentials
1. Left sidebar → "Credentials"
2. Click "+ Create Credentials"
3. Select "OAuth 2.0 Client IDs"
4. Choose application type: **Web application**
5. Set Authorized redirect URIs:
   ```
   https://subveris.com/auth/callback
   ```
   (Or use localhost:5000/auth/callback for local testing)

6. Click "Create"
7. **Important:** Click "Copy" to copy credentials or download JSON

### 1d. Note Your Credentials
You'll see:
- **Client ID** (long string like: 123456.apps.googleusercontent.com)
- **Client Secret** (long string)

---

## 🔐 Step 2: Add to Supabase Environment Variables

### 2a. Go to Supabase Dashboard
- Navigate to: https://app.supabase.com
- Select your Subveris project

### 2b. Open Project Settings
1. Bottom left → "Settings" (gear icon)
2. Left sidebar → "Environment"

### 2c. Add Environment Variables
Click "New variable" for each:

1. **Add GOOGLE_CLIENT_ID**
   - Name: `GOOGLE_CLIENT_ID`
   - Value: `[paste from Google Cloud]`
   - Click "Add"

2. **Add GOOGLE_CLIENT_SECRET**
   - Name: `GOOGLE_CLIENT_SECRET`
   - Value: `[paste from Google Cloud]`
   - Click "Add"

3. **Add GOOGLE_REDIRECT_URI**
   - Name: `GOOGLE_REDIRECT_URI`
   - Value: `https://subveris.com/auth/callback`
   - Click "Add"

### 2d. Redeploy Edge Functions
After adding variables:
1. Left sidebar → "Functions"
2. Click on "api" function
3. Click "Deploy" button (redeploy to pick up new env vars)
4. Wait for deployment to complete

---

## ✅ Verification

### Test that credentials work:
1. Install the extension in Chrome
2. Click "Connect Gmail" button
3. Should be redirected to Google login
4. After authentication, should return to extension with success message

### Check logs (if auth fails):
1. Supabase Dashboard → Functions
2. Click "api" function → Logs
3. Look for errors starting with "[Gmail]"

---

## 🔒 Security Notes

- ✅ Client Secret is stored securely in Supabase
- ✅ Never commit Client Secret to GitHub
- ✅ Gmail scope is read-only (can't delete emails)
- ✅ Access tokens stored per-user in database
- ✅ Tokens expire and refresh automatically

---

## 📝 Common Issues

### Issue: "Invalid Client ID"
- ✓ Copy-paste error from Google Console
- ✓ Check for extra spaces before/after
- ✓ Verify in Google Console it matches

### Issue: "Redirect URI mismatch"
- ✓ Must exactly match in both Google Console AND Supabase
- ✓ For production: `https://subveris.com/auth/callback`
- ✓ For local testing: `http://localhost:5000/auth/callback`

### Issue: "Refresh token missing"
- This is OK! Gmail API returns refresh tokens only on first auth
- Subsequent logins use existing refresh token

### Issue: Gmail scanning not working
- Check function logs (Supabase Dashboard → Functions → Logs)
- Verify access token hasn't expired
- Try re-authorizing Gmail

---

## 🎯 After Setup

Once environment variables are set and Edge Functions redeployed:

1. ✅ Gmail OAuth URL generation works
2. ✅ Token exchange works
3. ✅ Gmail scanning can begin
4. ✅ User can authorize Gmail from extension popup

### Next Steps:
1. Test extension Gmail connection
2. Verify email scanning finds subscriptions
3. Check database for stored access tokens
4. Monitor Supabase logs for errors

---

## 📊 What Happens Behind the Scenes

When user clicks "Connect Gmail":

```
1. Extension → Backend: GET /api/auth/gmail-oauth-url
2. Backend returns Google OAuth URL (uses GOOGLE_CLIENT_ID)
3. Extension opens OAuth URL
4. User authenticates with Google
5. Google redirects to callback with authorization code
6. Extension extracts code from redirect
7. Extension → Backend: POST /api/auth/gmail-token (with code)
8. Backend exchanges code for access token (uses GOOGLE_CLIENT_SECRET)
9. Backend stores token in users table
10. Email scanning begins with stored token
```

---

**Last Updated:** August 17, 2026  
**Status:** Ready to configure
