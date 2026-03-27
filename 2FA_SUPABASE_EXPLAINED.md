# How Supabase 2FA (Two-Factor Authentication) Works

## Overview

Supabase's 2FA system adds an extra layer of security by requiring users to verify their identity using two factors:
1. **Something they know**: Password
2. **Something they have**: TOTP code from an authenticator app (Google Authenticator, Authy, Microsoft Authenticator, etc.)

## The 2FA Flow in Your App

### Step 1: User Initiates 2FA Setup

```
User clicks "Enable 2FA" in settings
    ↓
Frontend: GET /api/account/2fa/init
    ↓
Backend receives request with user's auth token
```

### Step 2: Backend Generates TOTP Secret

```
Backend (server/routes.ts):
  - Creates user Supabase client with their token
  - Calls: supabase.auth.mfa.enroll({ factorType: 'totp' })
    
Supabase returns:
  - id (factorId): Unique identifier for this MFA factor
  - secret: The base32-encoded TOTP secret (stored in Supabase, not locally)
  - otpauthUrl: Data URL containing the QR code image
  
Backend sends this back to frontend
```

**Why Supabase stores the secret?** 
- The secret stays in Supabase's secure database
- Your app never stores TOTP secrets directly
- More secure than custom implementations

### Step 3: User Scans QR Code

```
Frontend receives QR code (otpauthUrl)
    ↓
User opens authenticator app (Google Authenticator, Authy, etc.)
    ↓
User scans the QR code
    ↓
Authenticator app now generates 6-digit codes every 30 seconds
    ↓
User sees code: 123456 (or similar)
```

**What's in the QR code?**
```
otpauth://totp/Subveris:user@email.com?secret=XXXXX&issuer=Subveris
```
- Tells authenticator app it's a TOTP code
- Linked to "Subveris" account for user@email.com
- Uses the secret to generate codes

### Step 4: User Verifies Code

```
User copies 6-digit code from authenticator app
    ↓
User pastes code into your app
    ↓
Frontend: POST /api/account/2fa
  Body: { code: "123456", factorId: "xxx-xxx-xxx" }
    ↓
Backend verifies:
  - Calls: supabase.auth.mfa.verify({ factorId, code })
    
Supabase checks:
  ✓ Takes the factorId
  ✓ Retrieves the stored TOTP secret
  ✓ Generates what the code SHOULD be for the current 30-second window
  ✓ Compares with code provided by user
  ✓ Also checks ±1 window for clock drift
```

### Step 5: 2FA Enabled

```
If code is valid:
  ✓ Supabase marks the factor as "verified"
  ✓ Updates user's JWT with `aal: "aal2"` claim (Authenticator Assurance Level 2)
  ✓ Sends "2FA Enabled" notification email
  ✓ Returns new session with aal2 level

If code is invalid:
  ✗ Rejects verification
  ✗ User can try again (up to rate limit)
```

## After 2FA is Enabled

### What Happens on Login?

```
User logs in with email + password
    ↓
Supabase checks: "Does this user have 2FA factors?"
    ↓
YES → Backend needs to implement challenge flow
  - Instead of full access, return partial JWT (aal1)
  - Frontend shows "Enter 2FA Code" screen
  - User enters code from authenticator
  - Verify the code
  - Supabase upgrades to aal2 JWT
  
NO → Standard login (aal1 JWT)
```

### JWT Claims Explained

Your JWT (access token) contains an `aal` (Authenticator Assurance Level) claim:

```json
{
  "aal": "aal1",  // Only password verified (no 2FA)
  "sub": "user-id-123",
  "email": "user@example.com",
  "exp": 1234567890
}
```

vs.

```json
{
  "aal": "aal2",  // Password + 2FA code verified
  "sub": "user-id-123", 
  "email": "user@example.com",
  "exp": 1234567890
}
```

## TOTP: Time-Based One-Time Password

The "30-second window" part is important:

```
Time: 12:30:00 → Code generated: 123456
Time: 12:30:15 → Same code: 123456 (still valid, same 30s window)
Time: 12:30:30 → Code changes: 654321 (new 30s window)
Time: 12:30:45 → Code changes: 789012 (new 30s window)
```

**Why 30 seconds?**
- Industry standard
- Gives user time to type/copy the code
- Supabase checks ±1 window (accepts codes from -30s to +60s) for clock drift

## Why This is More Secure

### Your Old Implementation (Custom)
```
❌ Stored TOTP secrets in memory (lost on restart)
❌ Manual TOTP verification (could have bugs)
❌ No integration with Supabase auth system
❌ Notifications not tied to auth system
```

### Supabase Implementation (Current)
```
✅ Secrets stored in Supabase secure database
✅ Proven TOTP algorithm (verified by security experts)
✅ Integrated with Supabase auth
✅ Automatic notification emails
✅ Assurance levels (aal1, aal2) for access control
✅ Can enforce 2FA at database level using RLS policies
✅ Session handling built-in
```

## Implementation in Your Code

### Backend Flow (server/routes.ts)

```typescript
// Step 1: Initialize 2FA
app.get("/api/account/2fa/init", authenticateUser, async (req, res) => {
  const userSupabase = createClient(..., { 
    global: { headers: { Authorization: `Bearer ${token}` } } 
  });
  
  const { data, error } = await userSupabase.auth.mfa.enroll({
    factorType: 'totp'
  });
  
  // Returns: { id, secret, otpauthUrl }
  res.json({ success: true, id: data.id, otpauthUrl: data.totp.qr_code });
});

// Step 2: Verify 2FA
app.post("/api/account/2fa", authenticateUser, async (req, res) => {
  const { code, factorId } = req.body;
  
  const { data, error } = await userSupabase.auth.mfa.verify({
    factorId: factorId,
    code: code
  });
  
  // If valid: returns { session } with aal2 JWT
  // If invalid: returns error
});
```

### Frontend Flow (account-settings-modals.tsx)

```typescript
// User clicks "Enable 2FA"
handleInit2FA() → GET /api/account/2fa/init
  ├─ Receives: { id, otpauthUrl }
  ├─ Stores: factorId in state
  └─ Shows: QR code to user

// User scans QR code and enters code
handleEnable2FA() → POST /api/account/2fa
  ├─ Sends: { code: "123456", factorId: "xxx" }
  ├─ Receives: { success, session }
  └─ Shows: "2FA enabled!" message
```

## Security Features

1. **Rate Limiting**: Supabase limits failed attempts (prevents brute force)
2. **Time-based**: Code changes every 30 seconds (prevents replay attacks)
3. **Backup Codes**: Users should be offered backup codes (not yet in your implementation)
4. **Session Management**: Separate session for unverified (aal1) vs verified (aal2) users
5. **Email Notifications**: Automatic notifications when 2FA is enabled/disabled

## Next Steps (Optional Enhancements)

You could add:

1. **Backup Codes**: Generate recovery codes in case user loses authenticator
   ```typescript
   // When creating backup codes
   const backupCodes = await supabase.auth.mfa.listFactors();
   ```

2. **List Enrolled Factors**: Let users see/remove 2FA
   ```typescript
   const { data } = await supabase.auth.mfa.listFactors();
   // Shows all totp and phone factors
   ```

3. **Unenroll 2FA**: Remove the factor
   ```typescript
   await supabase.auth.mfa.unenroll({ factorId });
   ```

4. **Login 2FA Challenge**: Prompt for 2FA after password verification
   ```typescript
   // On login response, check if user has mfa_required
   if (data.user?.factors?.length > 0) {
     // Show challenge screen
   }
   ```

## Key Difference: Your Code Now

When user changes password OR enables 2FA:
- ✅ Request goes through Supabase Auth API
- ✅ Supabase handles secrets securely
- ✅ Automatic email notifications sent
- ✅ Session/JWT properly updated
- ✅ Audit logs recorded in Supabase

This is much safer than storing TOTP secrets locally or in memory!
