# Google OAuth Setup for Supabase

## Overview
Google authentication has been added to Subveris. Users can now sign in/sign up using their Google account in addition to email/password authentication.

## Setup Instructions

### Step 1: Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API:
   - Click "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. If prompted, configure the OAuth consent screen first:
   - Choose "External" user type
   - Fill in the required fields (app name, user support email, developer contact)
   - Add scopes: `email`, `profile`, `openid`
   - Add test users if needed
4. For the OAuth client ID:
   - Choose "Web application"
   - Add authorized redirect URIs:
     - `http://localhost:5173/auth/callback` (development)
     - `https://yourdomain.com/auth/callback` (production)
   - Copy the Client ID and Client Secret

### Step 3: Configure Supabase
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to "Authentication" → "Providers"
4. Find "Google" and enable it
5. Paste the Google Client ID and Client Secret
6. Save

### Step 4: Verify Environment Variables
Ensure your `.env.local` file has:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## How to Use

### For Users
1. Open the app
2. Click "Sign Up" or "Sign In" tab
3. Click "Google" button
4. Authenticate with your Google account
5. You'll be redirected back to the app

### Automatic Redirect
After successful Google authentication, users are automatically redirected to:
- `/auth/callback` - Handles the OAuth response
- Then to `/` (dashboard for authenticated users, home page for new users)

## Features
- ✅ Sign up with Google
- ✅ Sign in with Google
- ✅ Automatic account creation on first Google sign-in
- ✅ Integration with 2FA system (users can enable 2FA after Google signup)
- ✅ Post-signup flow (plan selection, 2FA setup)

## Troubleshooting

### OAuth redirect not working
- Ensure redirect URL is registered in Google Cloud Console
- Check that redirect URL matches exactly (including protocol and path)
- Clear browser cookies and cache

### "Invalid OAuth client" error
- Verify Client ID and Client Secret in Supabase
- Check that credentials are for "Web application" type
- Ensure Google+ API is enabled in Google Cloud

### Users not redirected after auth
- Check browser console for errors
- Verify `/auth/callback` route exists in app
- Check Supabase session is being established

## Security Notes
- Never commit Client Secret to version control
- Use environment variables for sensitive credentials
- Redirect URLs should use HTTPS in production
- Test thoroughly in development before production

## Files Modified
- `client/src/lib/auth-context.tsx` - Added `signInWithGoogle()` function
- `client/src/components/auth-modal.tsx` - Added Google button to sign in/up forms
- `client/src/pages/auth-callback.tsx` - Created new callback handler
- `client/src/App.tsx` - Added `/auth/callback` route
