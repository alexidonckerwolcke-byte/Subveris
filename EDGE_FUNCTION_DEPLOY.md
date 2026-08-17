# Quick Deploy Guide - Supabase Edge Functions

## 🚀 How to Redeploy the API Edge Function

### Via Supabase Dashboard (Easiest)

1. **Open Supabase Dashboard**
   - Go to: https://app.supabase.com
   - Select your Subveris project

2. **Navigate to Functions**
   - Left sidebar → Functions
   - Click on "api" function

3. **Redeploy**
   - Click "Deploy" button (top right)
   - Wait for deployment to complete (~30 seconds)
   - Should see: "Function deployed successfully"

4. **Verify**
   - Check "Logs" tab to see if function is running
   - Look for any error messages starting with "[Gmail]"

---

## ✅ What This Does

After redeploying with the new environment variables, the API function will:
- ✅ Pick up GOOGLE_CLIENT_ID from environment
- ✅ Pick up GOOGLE_CLIENT_SECRET from environment
- ✅ Pick up GOOGLE_REDIRECT_URI from environment
- ✅ Be ready to generate Gmail OAuth URLs
- ✅ Be ready to exchange authorization codes for tokens

---

## 🔍 How to Verify It Worked

1. **Check Function Logs**
   - Supabase Dashboard → Functions → api → Logs
   - Should show: "Function deployed" messages
   - No error messages

2. **Test the Endpoint**
   ```bash
   curl https://your-project.supabase.co/functions/v1/api/auth/gmail-oauth-url \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
   - Should return a Gmail OAuth URL
   - If it returns an error, check the logs

---

## ⏱️ Time Required
- **Via Dashboard:** ~2 minutes

---

**Status:** Ready to deploy  
**Next Step:** Go to Supabase Dashboard and click "Deploy" button
