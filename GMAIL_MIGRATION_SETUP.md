# Gmail OAuth Database Migration - Setup Guide

## 🎯 Goal
Add Gmail OAuth token storage fields to the `users` table so the backend can store user Gmail access tokens.

## ✅ Migration Status
- Migration file: **CREATED** ✅ (`supabase/migrations/20260816_000000_add_gmail_oauth_fields.sql`)
- Database execution: **PENDING** ⏳

## 📋 What Gets Added
Three new columns to `public.users` table:
- `gmail_access_token` (TEXT) - Google OAuth access token for Gmail API
- `gmail_refresh_token` (TEXT) - Optional refresh token
- `gmail_token_expiry` (TIMESTAMP) - When the access token expires
- Index on gmail_access_token for fast lookups

## 🚀 How to Execute the Migration

### Option 1: Via Supabase Dashboard (Recommended - Easiest)

1. **Go to Supabase Dashboard**
   - Navigate to: https://app.supabase.com
   - Select your project (Subveris)

2. **Open SQL Editor**
   - Left sidebar → SQL Editor
   - Click "+ New Query"

3. **Copy & Paste Migration**
   - Copy the SQL below:
   ```sql
   -- Add Gmail OAuth fields to users table
   ALTER TABLE public.users
   ADD COLUMN IF NOT EXISTS gmail_access_token TEXT,
   ADD COLUMN IF NOT EXISTS gmail_refresh_token TEXT,
   ADD COLUMN IF NOT EXISTS gmail_token_expiry TIMESTAMP WITH TIME ZONE;
   
   -- Create index for efficient lookups
   CREATE INDEX IF NOT EXISTS idx_users_gmail_access_token ON public.users(id) WHERE gmail_access_token IS NOT NULL;
   
   -- Add comment for documentation
   COMMENT ON COLUMN public.users.gmail_access_token IS 'Google OAuth access token for Gmail API access (read-only)';
   COMMENT ON COLUMN public.users.gmail_refresh_token IS 'Google OAuth refresh token for Gmail API (optional)';
   COMMENT ON COLUMN public.users.gmail_token_expiry IS 'Expiration timestamp for Gmail access token';
   ```

4. **Execute**
   - Click "Run" button (or Cmd+Enter)
   - Wait for success message

5. **Verify Success**
   - Left sidebar → Table Editor
   - Select "users" table
   - Scroll right to verify new columns exist:
     - ✓ gmail_access_token
     - ✓ gmail_refresh_token
     - ✓ gmail_token_expiry

### Option 2: Via Supabase CLI (If Installed)

```bash
cd /Users/alexidonckerwolcke/Subveris

# Push pending migrations to production
supabase migration push

# Or specifically run this migration
supabase db push --file supabase/migrations/20260816_000000_add_gmail_oauth_fields.sql
```

### Option 3: Via Terminal with psql (Advanced)

If you have direct PostgreSQL access:

```bash
PGPASSWORD="your_password" psql -h db.xxxxx.supabase.co -U postgres -d postgres < supabase/migrations/20260816_000000_add_gmail_oauth_fields.sql
```

---

## ⏱️ After Migration

Once completed, the backend will be able to:
1. ✅ Store Gmail access tokens after OAuth authorization
2. ✅ Look up tokens when scanning Gmail for subscriptions
3. ✅ Check token expiry and refresh if needed
4. ✅ Invalidate tokens when user revokes permission

## 🔍 Verification Checklist

After running the migration, verify:

- [ ] Three new columns exist in `users` table
- [ ] Columns are nullable (users without Gmail auth won't have values)
- [ ] Index created successfully
- [ ] No errors in migration output
- [ ] Build still passes: `npm run build`

## 🛠️ Troubleshooting

### "Column already exists" Error
- This is fine! The migration uses `IF NOT EXISTS`
- It means the migration was already run
- You can safely run it multiple times

### "Permission denied" Error
- Ensure you're signed in to Supabase with correct project
- Check that user has sufficient permissions
- Try signing out and back in

### Can't see new columns in UI
- Refresh the browser page
- Clear browser cache
- Try different browser

---

## 📊 Next Steps After Migration

1. ✅ Run this database migration
2. ⏳ Set Supabase environment variables (GOOGLE_CLIENT_ID, etc.)
3. ⏳ Test Gmail OAuth flow end-to-end
4. ⏳ Launch extension to first users

---

## 📝 Related Files

- Migration: [supabase/migrations/20260816_000000_add_gmail_oauth_fields.sql](../supabase/migrations/20260816_000000_add_gmail_oauth_fields.sql)
- Backend Gmail OAuth: [supabase/functions/api/index.ts](../supabase/functions/api/index.ts) (lines ~1390-1440)
- Extension Gmail auth: [extension/background.js](../extension/background.js) (lines ~525-610)

---

**Last Updated:** August 17, 2026  
**Status:** Ready to execute ✅
