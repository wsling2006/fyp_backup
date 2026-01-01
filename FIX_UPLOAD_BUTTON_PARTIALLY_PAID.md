# 🔧 Fix: Upload Claim Button Not Showing for PARTIALLY_PAID Requests

## Issue

Users with `sales_department` or `marketing` roles could not see the "Upload Claim" button for their own `PARTIALLY_PAID` requests, even though:
- ✅ The request status was `PARTIALLY_PAID`
- ✅ They were the owner of the request
- ✅ Backend allowed claim uploads for `PARTIALLY_PAID` status
- ❌ Frontend button was not appearing

## Root Cause

The `canUploadClaim` function was checking `user?.userId` for ownership comparison, but the user object might have the ID stored as `user?.id` instead, causing the ownership check to fail.

```typescript
// Before (bug):
const isOwner = request.created_by_user_id === user?.userId;
// If user.userId is undefined but user.id exists, isOwner would be false
```

## Solution

Updated the `canUploadClaim` function to:
1. Check both `user?.userId` and `user?.id` properties
2. Added detailed console logging for debugging
3. Made the logic more explicit and readable

```typescript
// After (fixed):
const currentUserId = user?.userId || user?.id;
const isOwner = request.created_by_user_id === currentUserId;
```

## Changes Made

**File**: `frontend/app/purchase-requests/page.tsx`

**Before**:
```typescript
const canUploadClaim = (request: PurchaseRequest) => {
  if (!['APPROVED', 'PARTIALLY_PAID'].includes(request.status)) return false;
  const isOwner = request.created_by_user_id === user?.userId;
  return (user?.role === 'sales_department' || user?.role === 'marketing' || user?.role === 'super_admin') && (isOwner || user?.role === 'super_admin');
};
```

**After**:
```typescript
const canUploadClaim = (request: PurchaseRequest) => {
  // Allow upload for APPROVED and PARTIALLY_PAID requests (user can add more claims)
  if (!['APPROVED', 'PARTIALLY_PAID'].includes(request.status)) {
    console.log('[canUploadClaim] Status check failed:', request.status);
    return false;
  }
  
  // Check ownership - handle both userId and id properties
  const currentUserId = user?.userId || user?.id;
  const isOwner = request.created_by_user_id === currentUserId;
  
  console.log('[canUploadClaim] Checking permissions:', {
    requestId: request.id.slice(0, 8),
    status: request.status,
    requestOwnerId: request.created_by_user_id,
    currentUserId: currentUserId,
    userRole: user?.role,
    isOwner,
  });
  
  // User must be in allowed roles AND (be owner OR be super_admin)
  const hasRole = user?.role === 'sales_department' || user?.role === 'marketing' || user?.role === 'super_admin';
  const canUpload = hasRole && (isOwner || user?.role === 'super_admin');
  
  console.log('[canUploadClaim] Result:', { hasRole, isOwner, canUpload });
  
  return canUpload;
};
```

## Benefits

1. **Robust ID Checking**: Handles both `userId` and `id` properties
2. **Better Debugging**: Console logs show exactly why button appears or not
3. **More Readable**: Explicit variable names and step-by-step logic
4. **Consistent**: Matches the pattern used in `canEditRequest` function (line 125)

## Testing

After this fix, users should see the "Upload Claim" button when:
- ✅ Request status is `APPROVED` or `PARTIALLY_PAID`
- ✅ User role is `sales_department`, `marketing`, or `super_admin`
- ✅ User is the owner of the request (or is super_admin)

Check browser console for debug logs to verify:
```
[canUploadClaim] Checking permissions: {
  requestId: "abc12345",
  status: "PARTIALLY_PAID",
  requestOwnerId: "user-uuid-123",
  currentUserId: "user-uuid-123",
  userRole: "sales_department",
  isOwner: true
}
[canUploadClaim] Result: {
  hasRole: true,
  isOwner: true,
  canUpload: true
}
```

## How to Deploy

### Local Testing
```bash
cd frontend
npm run build
npm start
```

### Production (EC2)
```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Navigate to project
cd ~/fyp_system

# Pull latest changes
git pull origin main

# Build frontend
cd frontend
npm run build

# Restart frontend service
pm2 restart frontend

# Check logs
pm2 logs frontend --lines 20
```

## Related Files

- `frontend/app/purchase-requests/page.tsx` - Main fix
- `frontend/context/AuthContext.tsx` - User object normalization (already handles userId/id)
- `CLAIM_UPLOAD_PARTIALLY_PAID_FIX.md` - Backend fix for claim upload
- `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Full feature overview

## Verification

Open browser console and look for these logs when viewing purchase requests:
```
[canUploadClaim] Checking permissions: { ... }
[canUploadClaim] Result: { hasRole: true, isOwner: true, canUpload: true }
```

If `canUpload: false`, the logs will show which check failed (status, role, or ownership).

## Notes

The same pattern was already being used in `canEditRequest` function:
```typescript
const isOwner = request.created_by_user_id === user?.userId || request.created_by_user_id === user?.id;
```

This fix makes `canUploadClaim` consistent with that approach.

---

**Status**: ✅ Fixed  
**Date**: January 1, 2026  
**Build**: ✅ Successful  
**Testing**: Ready for verification
