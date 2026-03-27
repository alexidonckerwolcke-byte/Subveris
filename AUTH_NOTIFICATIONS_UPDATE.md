# Authentication Notifications Update

## Summary
Updated password change and 2FA flows to use Supabase's native authentication system. This ensures that password change and 2FA setup notifications are properly triggered through Supabase's built-in notification system.

## Changes Made

### 1. Password Change (Already Correct)
✅ **File**: `server/routes.ts`  
**Endpoint**: `PATCH /api/account/password`

- Already using `supabase.auth.admin.updateUserById(userId, { password: newPassword })`
- This correctly triggers Supabase's password change notifications
- Users will receive email notifications when their password is changed

### 2. Two-Factor Authentication (2FA) - Updated ✨

#### Backend Changes (`server/routes.ts`)

**`GET /api/account/2fa/init`**:
- Replaced custom in-memory TOTP secret generation
- Now uses `userSupabase.auth.mfa.enroll({ factorType: 'totp' })`
- Supabase handles secret generation and QR code creation
- Returns `id` (factorId), `secret`, and `otpauthUrl`
- **Triggers**: Supabase sends 2FA setup notifications

**`POST /api/account/2fa`**:
- Replaced custom TOTP verification logic
- Now uses `userSupabase.auth.mfa.verify({ factorId, code })`
- Proper TOTP code verification through Supabase
- **Triggers**: Supabase sends 2FA enabled notifications

**Removed**:
- In-memory `twoFASecrets` Map (was storing secrets temporarily)
- Custom TOTP generation and verification logic
- Manual session expiry management

#### Frontend Changes (`client/src/components/account-settings-modals.tsx`)

**Added State**:
- `twoFAFactorId`: Stores the factor ID from init response

**Updated `handleInit2FA()`**:
- Stores the `factorId` from response for use in verification
- Handles both data URL QR codes and otpauth URLs

**Updated `handleEnable2FA()`**:
- Passes `factorId` (instead of `secret`) to verification endpoint
- Validates factorId exists before attempting verification
- Clears factorId after successful 2FA setup

## Notifications Flow

### Password Change
```
User changes password
→ POST /api/account/password
→ supabase.auth.admin.updateUserById()
→ Supabase sends password change email
→ 2FA notification (if enabled)
```

### 2FA Setup
```
User initiates 2FA setup
→ GET /api/account/2fa/init
→ supabase.auth.mfa.enroll()
→ User scans QR code and enters code
→ POST /api/account/2fa
→ supabase.auth.mfa.verify()
→ Supabase sends 2FA enabled email
```

## Testing Checklist

- [ ] User can change password and receives email notification
- [ ] User can set up 2FA and receives notification email
- [ ] 2FA code verification fails with invalid codes
- [ ] 2FA sessions expire properly
- [ ] Multiple users can have 2FA enabled independently

## Benefits

1. **Native Supabase MFA**: Uses Supabase's built-in MFA system
2. **Proper Notifications**: All password/2FA changes trigger Supabase's notification system
3. **Security**: Supabase handles TOTP verification, not custom code
4. **Session Management**: No in-memory storage of secrets
5. **Scalability**: Works across multiple server instances
