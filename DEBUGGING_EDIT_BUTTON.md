# Debugging "Edit Request" Button Visibility Issue

## Problem
The "Edit Request" button was not showing for sales department users, even though:
- The user was the owner of the purchase request
- The request status was DRAFT or SUBMITTED
- The button logic appeared correct in the code

## Root Cause Analysis

### Issue 1: User ID Normalization
The backend and frontend were using different property names for the user ID:

**Backend:**
- JWT payload: `{ sub: user.id, email, role }`
- Login response: `{ user: { id, email, role } }`
- JWT strategy returns: `{ userId: user.id, username: user.email, role }`
- Database column: `created_by_user_id` (stores UUID)

**Frontend:**
- AuthContext expected: `{ userId, id, email, role }`
- Purchase request comparison: `request.created_by_user_id === user?.userId`

### Issue 2: LocalStorage State
Users who logged in before the normalization code was added had user objects in localStorage without the `userId` property, causing the ownership check to fail.

## Solution

### 1. Enhanced AuthContext Normalization
Updated `/Users/jw/fyp_system/frontend/context/AuthContext.tsx`:

```typescript
// Load token and user from localStorage on mount
useEffect(() => {
  const storedToken = localStorage.getItem("token");
  const storedUser = localStorage.getItem("user");
  if (storedToken) setToken(storedToken);
  if (storedUser) {
    const parsedUser = JSON.parse(storedUser);
    // Normalize user object: ensure userId exists
    if (parsedUser && !parsedUser.userId && parsedUser.id) {
      parsedUser.userId = parsedUser.id;
      // Update localStorage with normalized user
      console.log('[Auth] Normalizing user object on load, adding userId:', parsedUser.id);
      localStorage.setItem("user", JSON.stringify(parsedUser));
    }
    console.log('[Auth] Loaded user from localStorage:', parsedUser);
    setUser(parsedUser);
  }
  // Mark as initialized after attempting to load from localStorage
  setIsInitialized(true);
}, []);
```

### 2. Enhanced Debug Logging
Updated `/Users/jw/fyp_system/frontend/app/purchase-requests/page.tsx`:

```typescript
const canEditRequest = (request: PurchaseRequest) => {
  // Debug logging
  console.log('[canEditRequest] Checking:', {
    requestId: request.id,
    requestCreatedBy: request.created_by_user_id,
    requestCreatedByType: typeof request.created_by_user_id,
    userId: user?.userId,
    userIdType: typeof user?.userId,
    userIdFromUser: user?.id,
    userIdFromUserType: typeof user?.id,
    userRole: user?.role,
    requestStatus: request.status,
    fullUser: user,
  });
  
  // Only owner or super_admin can edit
  // Check both userId and id, and convert to string for comparison
  const requestCreatedBy = String(request.created_by_user_id);
  const currentUserId = String(user?.userId || user?.id || '');
  const isOwner = requestCreatedBy === currentUserId;
  console.log('[canEditRequest] Comparison:', {
    requestCreatedBy,
    currentUserId,
    isOwner,
  });
  
  if (!isOwner && user?.role !== 'super_admin') {
    console.log('[canEditRequest] Not owner and not super_admin, returning false');
    return false;
  }
  
  // Can only edit DRAFT or SUBMITTED status
  const canEdit = ['DRAFT', 'SUBMITTED'].includes(request.status);
  console.log('[canEditRequest] Final result:', canEdit);
  return canEdit;
};
```

### 3. Request Loading Debug
Added logging to the `loadRequests` function:

```typescript
const loadRequests = async () => {
  try {
    setLoading(true);
    setError(null);
    const response = await api.get('/purchase-requests');
    console.log('[loadRequests] Current user:', user);
    console.log('[loadRequests] Loaded requests:', response.data);
    setRequests(response.data);
  } catch (err: any) {
    console.error('Failed to load purchase requests:', err);
    setError(err.response?.data?.message || 'Failed to load purchase requests');
    if (err.response?.status === 401) {
      logout();
    }
  } finally {
    setLoading(false);
  }
};
```

## Testing Steps

1. **Clear browser localStorage and login fresh:**
   ```javascript
   // In browser console
   localStorage.clear();
   // Then login again
   ```

2. **Check console logs:**
   - Look for `[Auth] Loaded user from localStorage`
   - Look for `[loadRequests] Current user`
   - Look for `[canEditRequest] Checking` when requests are rendered

3. **Verify user object structure:**
   ```javascript
   // In browser console
   JSON.parse(localStorage.getItem('user'))
   // Should show: { id: "uuid", email: "...", role: "...", userId: "uuid" }
   ```

4. **Verify purchase request structure:**
   ```javascript
   // In browser console on purchase requests page
   console.log('Requests:', requests);
   // Each request should have created_by_user_id matching user.userId
   ```

## Expected Behavior

### For Sales Department User:
- Can see "Edit Request" button on their own DRAFT or SUBMITTED requests
- Cannot see button on requests from other users
- Cannot see button on APPROVED, REJECTED, or PAID requests

### For Super Admin:
- Can see "Edit Request" button on ALL DRAFT or SUBMITTED requests (any owner)
- Cannot see button on APPROVED, REJECTED, or PAID requests

### For Accountant:
- Cannot see "Edit Request" button (not allowed to edit)
- Can see "Review" button on SUBMITTED or UNDER_REVIEW requests

## Additional Notes

### Type Safety
The comparison now uses `String()` conversion to handle any potential type mismatches between the database UUID (string) and the user ID (could be string or accidentally a different type).

### Backward Compatibility
The code now checks both `user?.userId` and `user?.id` to handle cases where normalization might not have occurred yet:
```typescript
const currentUserId = String(user?.userId || user?.id || '');
```

### Database Schema
The `purchase_requests` table has:
- `created_by_user_id` (UUID, NOT NULL) - references `users.id`
- `reviewed_by_user_id` (UUID, NULLABLE) - references `users.id`

### JWT Payload
When a user authenticates, the JWT contains:
```typescript
{ sub: user.id, email: user.email, role: user.role }
```

The `sub` field is the user ID, which is then extracted by the JWT strategy and converted to `userId` for backend controllers.

## Deployment

After making these changes:

1. Build frontend:
   ```bash
   cd frontend && npm run build
   ```

2. Restart PM2 on EC2:
   ```bash
   pm2 restart frontend
   ```

3. Ask users to clear browser cache and login again to get the normalized user object.

## Future Improvements

1. **Remove Debug Logging:** Once the issue is confirmed fixed, remove console.log statements from production code.

2. **User Migration Script:** Create a script to update all existing localStorage user objects with the `userId` property (client-side).

3. **Type Definitions:** Update TypeScript interfaces to ensure consistency:
   ```typescript
   interface User {
     id: string;
     userId: string; // For backward compatibility
     email: string;
     role: string;
   }
   ```

4. **API Consistency:** Consider updating backend to always return `userId` in addition to `id` to avoid confusion.

## Related Files

- `/Users/jw/fyp_system/frontend/context/AuthContext.tsx` - User authentication and normalization
- `/Users/jw/fyp_system/frontend/app/purchase-requests/page.tsx` - Purchase requests page with edit button
- `/Users/jw/fyp_system/backend/src/auth/jwt.strategy.ts` - JWT validation and user object structure
- `/Users/jw/fyp_system/backend/src/auth/auth.service.ts` - Login and OTP verification
- `/Users/jw/fyp_system/backend/src/purchase-requests/purchase-request.entity.ts` - Database entity
