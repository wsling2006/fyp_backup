# Audit Log Delete Functionality

**Date:** December 22, 2025  
**Feature:** Delete individual audit logs and clear all logs with OTP verification

## Overview

Added comprehensive audit log management capabilities for super admins:

1. **Delete Individual Logs** - Remove specific audit log entries
2. **Clear All Logs** - Permanently delete all audit logs with password + OTP verification

## Security Features

### Individual Log Deletion
- ✅ Only SUPER_ADMIN can delete
- ✅ Requires confirmation (click twice)
- ✅ Logs the deletion action itself
- ✅ Cannot be undone

### Clear All Logs (Extra Security)
- ✅ Only SUPER_ADMIN can access
- ✅ Requires password verification
- ✅ Requires OTP sent to email
- ✅ OTP expires in 10 minutes
- ✅ Multiple warning messages
- ✅ "Cannot be undone" acknowledgment
- ✅ Logs the clear action (as first entry after clearing)

## Implementation

### Backend Changes

#### 1. Audit Controller (`audit.controller.ts`)

**New Endpoints:**

```typescript
// Delete individual log
DELETE /audit/:id
@Roles(Role.SUPER_ADMIN)

// Request OTP to clear all
POST /audit/clear-all/request-otp
Body: { password: string }
@Roles(Role.SUPER_ADMIN)

// Clear all logs with OTP
POST /audit/clear-all/verify
Body: { otp: string }
@Roles(Role.SUPER_ADMIN)
```

**Features:**
- Validates role permissions
- Logs all delete actions
- Returns appropriate error messages

#### 2. Audit Service (`audit.service.ts`)

**New Methods:**

```typescript
// Delete a specific audit log
async deleteLog(id: string): Promise<void>

// Request OTP to clear all logs
async requestClearAllOtp(userId: string, password: string): Promise<{ message: string }>

// Clear all logs after OTP verification
async clearAllLogs(userId: string, otp: string): Promise<{ message: string; deletedCount: number }>

// Generate 6-digit OTP
private generateOtp(): string

// Send OTP email with warnings
private async sendClearAllOtpEmail(email: string, otp: string): Promise<void>
```

**OTP Management:**
- OTPs stored in-memory (Map<userId, {otp, expiresAt}>)
- 10-minute expiry
- Auto-deleted after use or expiry

**Password Verification:**
- Uses argon2 to verify superadmin password
- Prevents unauthorized clear operations

#### 3. Audit Module (`audit.module.ts`)

**Updated:**
```typescript
imports: [
  TypeOrmModule.forFeature([AuditLog]),
  UsersModule, // For password verification
],
```

### Frontend Changes

#### Audit Dashboard (`app/audit/superadmin/page.tsx`)

**New UI Elements:**

1. **"Clear All Logs" Button** (Top right, red button)
2. **Delete Button Per Row** (Last column)
3. **Clear All Modal** (Full-screen overlay with warnings)

**Delete Individual Log Flow:**

```
1. User clicks "Delete" button
2. Button changes to "Confirm" and "Cancel"
3. User clicks "Confirm"
4. API call: DELETE /audit/:id
5. Log is deleted
6. Table refreshes
7. Success message shown
```

**Clear All Logs Flow:**

```
1. User clicks "Clear All Logs" button (top right)
2. Warning modal opens with:
   - Red header: "CRITICAL ACTION"
   - Warning: "THIS ACTION CANNOT BE UNDONE!"
   - Checklist of requirements
3. User enters password
4. User clicks "Send OTP to My Email"
5. API call: POST /audit/clear-all/request-otp
6. OTP sent to superadmin's email
7. User enters 6-digit OTP
8. User clicks "CLEAR ALL LOGS"
9. API call: POST /audit/clear-all/verify
10. All logs deleted
11. Success message shown
12. Table refreshes (shows empty)
```

**Modal Features:**
- ✅ Password input with validation
- ✅ OTP input (6 digits, formatted)
- ✅ Multiple warning banners
- ✅ Loading states
- ✅ Resend OTP option
- ✅ Cancel button (always visible)
- ✅ Disabled during operations

## OTP Email Template

**Subject:** ⚠️ CRITICAL: Clear All Audit Logs - OTP Verification

**Content:**
- Red header with warning icon
- Large OTP code (32px, bold, centered)
- Warning: "This action cannot be undone"
- Checklist before proceeding:
  - Export/backup logs
  - Proper authorization
  - Irreversible action warning
- 10-minute validity notice

**Example:**
```
⚠️ CRITICAL ACTION
Clear All Audit Logs

⚠️ WARNING: This action cannot be undone!
All audit logs will be permanently deleted.

Your OTP:
┌─────────┐
│ 123456  │
└─────────┘

Valid for 10 minutes

Before proceeding, ensure:
✓ Exported/backed up necessary logs
✓ Proper authorization
✓ Understand irreversible nature
```

## API Documentation

### Delete Individual Log

**Endpoint:** `DELETE /audit/:id`

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "message": "Audit log deleted successfully",
  "id": "uuid"
}
```

**Errors:**
- 401: Unauthorized
- 403: Forbidden (not super admin)
- 404: Log not found

### Request Clear All OTP

**Endpoint:** `POST /audit/clear-all/request-otp`

**Body:**
```json
{
  "password": "superadmin_password"
}
```

**Response:**
```json
{
  "message": "OTP sent to your email. Valid for 10 minutes."
}
```

**Errors:**
- 400: Password required
- 401: Invalid password
- 403: Not super admin

### Clear All Logs

**Endpoint:** `POST /audit/clear-all/verify`

**Body:**
```json
{
  "otp": "123456"
}
```

**Response:**
```json
{
  "message": "All audit logs cleared successfully. 150 logs were deleted.",
  "deletedCount": 150
}
```

**Errors:**
- 400: Invalid or expired OTP
- 401: Unauthorized
- 403: Not super admin

## Security Considerations

### Individual Delete
1. **Role Check:** Only SUPER_ADMIN
2. **Audit Trail:** Deletion logged as DELETE_AUDIT_LOG
3. **Metadata:** Stores deleted log ID
4. **IP & User Agent:** Captured for accountability

### Clear All
1. **Role Check:** Only SUPER_ADMIN
2. **Password:** Must match superadmin's password
3. **OTP:** 6-digit code sent to email
4. **Time Limit:** OTP expires in 10 minutes
5. **Single Use:** OTP deleted after verification
6. **Audit Trail:** Clearing logged as CLEAR_ALL_AUDIT_LOGS
7. **Metadata:** Stores count of deleted logs
8. **Warning System:** Multiple UI warnings

## Best Practices

### When to Delete Individual Logs
- ✅ Duplicate entries
- ✅ Test data from development
- ✅ False positives
- ❌ Hiding malicious activity (this is logged!)

### When to Clear All Logs
- ✅ Database migration
- ✅ Starting fresh after system restructure
- ✅ Compliance-required purge (with approval)
- ❌ Regular maintenance
- ❌ Hiding activity

### Recommendations
1. **Export before clearing** - Download logs as CSV/JSON
2. **Document the reason** - Keep external record
3. **Notify stakeholders** - Inform relevant parties
4. **Review permissions** - Ensure only trusted admins
5. **Monitor deletions** - Track DELETE_AUDIT_LOG actions

## Testing

### Test Individual Delete

```bash
# Login as superadmin
# Navigate to Audit Logs
# Click "Delete" on any log
# Click "Confirm"
# Should see success message
# Log should disappear
# Check audit logs → Should see DELETE_AUDIT_LOG entry
```

### Test Clear All

```bash
# Login as superadmin
# Navigate to Audit Logs
# Click "Clear All Logs" (top right)

# Step 1: Password
# Enter incorrect password → Should show error
# Enter correct password → Should send OTP

# Step 2: OTP
# Check email → Should receive OTP email
# Enter incorrect OTP → Should show error
# Enter correct OTP → Should clear all logs

# Verify
# Table should be empty
# New audit log entry: CLEAR_ALL_AUDIT_LOGS
```

### Test Security

```bash
# As ACCOUNTANT (not superadmin)
curl -X DELETE https://your-api/audit/some-id \
  -H "Authorization: Bearer accountant_token"
# Should return 403 Forbidden

# Invalid OTP
curl -X POST https://your-api/audit/clear-all/verify \
  -H "Authorization: Bearer superadmin_token" \
  -d '{"otp": "wrong"}'
# Should return 400 Bad Request

# Expired OTP (after 10 minutes)
# Should return 400 "OTP has expired"
```

## UI Screenshots Description

### 1. Audit Log Table with Delete Buttons
- Each row has "Delete" button (last column)
- Clicking shows "Confirm" + "Cancel" buttons
- Red color scheme for danger

### 2. Clear All Modal (Step 1 - Password)
- Full-screen overlay (dark background)
- Red header: "⚠️ CRITICAL ACTION"
- Warning box: "THIS ACTION CANNOT BE UNDONE!"
- Checklist of requirements
- Password input field
- "Send OTP to My Email" button

### 3. Clear All Modal (Step 2 - OTP)
- Blue info box: "OTP sent to email"
- Large OTP input (centered, bold)
- "Resend OTP" button
- "🗑️ CLEAR ALL LOGS" button (red, bold)
- "Valid for 10 minutes" notice

## Files Modified

**Backend:**
1. `backend/src/audit/audit.controller.ts` - Add delete endpoints
2. `backend/src/audit/audit.service.ts` - Add delete methods & OTP logic
3. `backend/src/audit/audit.module.ts` - Import UsersModule

**Frontend:**
4. `frontend/app/audit/superadmin/page.tsx` - Add delete UI & modal

## Database Impact

### Individual Delete
```sql
-- Removes one row
DELETE FROM audit_logs WHERE id = 'uuid';

-- Adds one row (deletion log)
INSERT INTO audit_logs (user_id, action, resource, resource_id, ...)
VALUES ('admin_id', 'DELETE_AUDIT_LOG', 'audit', 'deleted_uuid', ...);
```

### Clear All
```sql
-- Removes all rows
TRUNCATE TABLE audit_logs;

-- Adds one row (clear log)
INSERT INTO audit_logs (user_id, action, resource, metadata, ...)
VALUES ('admin_id', 'CLEAR_ALL_AUDIT_LOGS', 'audit', 
        '{"logs_deleted": 150, "warning": "..."}', ...);
```

## Deployment

```bash
# 1. Commit changes
git add backend/src/audit/* frontend/app/audit/superadmin/page.tsx
git commit -m "feat: add audit log delete functionality with OTP verification"
git push

# 2. Deploy to EC2
ssh ubuntu@your-ec2-ip
cd ~/fyp_system
git pull
cd backend && npm run build
cd ../frontend && npm run build
pm2 restart all

# 3. Test
# Login as superadmin
# Try deleting a log
# Try clearing all logs
```

## Future Enhancements

### Batch Delete
- Select multiple logs with checkboxes
- Delete selected (with confirmation)

### Export Before Clear
- "Export & Clear" button
- Downloads CSV then clears

### Scheduled Auto-Clear
- Automatic purge after X days
- Configurable retention policy

### Audit Log Backup
- Automatic backup before clear
- S3/cloud storage integration

### Granular Permissions
- Different roles for view/delete
- Audit log admin role

## Summary

**Problem:** No way to manage audit logs - they grow indefinitely  
**Solution:** Add delete individual & clear all with OTP verification  
**Security:** Password + OTP + warnings + audit trail  
**UX:** Clear warnings, confirmation steps, visual feedback  
**Result:** Complete audit log management system ✅  

**Superadmins can now maintain audit logs while keeping accountability!** 🔒🗑️
