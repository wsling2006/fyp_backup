# Fix: Delete Button Not Showing for Accountant User

## Problem Identified

The delete button was not showing for the accountant user because of a mismatch between:
- **Backend JWT payload**: Returns `userId` (from jwt.strategy.ts)
- **Frontend stored user**: Has `id` (from login response)

## Root Cause

In `/Users/jw/fyp_system/frontend/app/revenue/accountant/page.tsx`:

```typescript
const canEditDelete = (revenueId: string) => {
  const record = revenues.find((r) => r.id === revenueId);
  if (!record) return false;
  return (
    record.created_by_user_id === user?.userId ||  // ❌ user.userId doesn't exist!
    record.created_by?.id === user?.userId          // ❌ user.userId doesn't exist!
  );
};
```

The frontend was checking `user?.userId`, but the user object stored in localStorage only has `user.id`.

## The Fix

Changed the canEditDelete function to use `user?.id` instead:

```typescript
const canEditDelete = (revenueId: string) => {
  const record = revenues.find((r) => r.id === revenueId);
  if (!record) return false;
  return (
    record.created_by_user_id === user?.id ||  // ✅ Fixed!
    record.created_by?.id === user?.id          // ✅ Fixed!
  );
};
```

## How to Verify the Fix

### 1. Check User Object Structure

Open browser console on the login page and run:
```javascript
const user = JSON.parse(localStorage.getItem('user'));
console.log('User object:', user);
// Should show: { id: "uuid", email: "accountant@test.com", role: "accountant" }
```

### 2. Test Delete Button Visibility

1. **Login as accountant** (accountant@test.com)
2. **Navigate to Revenue Dashboard**: http://13.213.52.37:3000/revenue/accountant
3. **Create a new revenue record**
4. **Verify**: The Edit and Delete buttons should now appear for your record
5. **Verify**: Other users' records should show "No access"

### 3. Test Delete Functionality

1. Click the **Delete** button on your own record
2. Confirm deletion
3. Verify the record is removed from the list
4. Check backend logs to confirm DELETE request succeeded

### 4. Browser Console Debug

Open console and run:
```javascript
const user = JSON.parse(localStorage.getItem('user'));
const revenues = [...]; // Get from React DevTools
const record = revenues[0];

console.log('User ID:', user.id);
console.log('Record created_by_user_id:', record.created_by_user_id);
console.log('Match:', record.created_by_user_id === user.id);
```

## Testing Checklist

- [ ] Login as accountant user
- [ ] Navigate to revenue dashboard
- [ ] Create a new revenue record
- [ ] Verify Edit/Delete buttons appear on YOUR record
- [ ] Verify "No access" appears on OTHER users' records
- [ ] Click Delete button
- [ ] Confirm deletion works
- [ ] Record disappears from list
- [ ] Check browser console for no errors
- [ ] Check backend logs for successful DELETE request

## Backend vs Frontend User Object

### Backend (JWT Strategy)
```typescript
// backend/src/auth/jwt.strategy.ts
return { userId: user.id, username: user.email, role: user.role };
```
This is used for `req.user` in controllers.

### Frontend (Login Response)
```typescript
// backend/src/auth/auth.service.ts (login method)
user: { id: user.id, email: user.email, role: user.role }
```
This is what gets stored in localStorage.

**Key Point**: The frontend stores `id`, not `userId`!

## Files Changed

- ✅ `frontend/app/revenue/accountant/page.tsx` - Fixed canEditDelete to use `user?.id`

## No Backend Changes Needed

The backend is already correct:
- Revenue records have `created_by_user_id` field
- DELETE endpoint checks ownership correctly
- JWT strategy returns `userId` for controllers

The issue was purely on the frontend side where the permission check was looking for the wrong field name.

## Next Steps

1. **Rebuild frontend** (if not using hot reload):
   ```bash
   cd /Users/jw/fyp_system/frontend
   npm run build
   pm2 restart frontend
   ```

2. **Test with accountant user**

3. **Clear browser cache/storage if needed**:
   - Open DevTools
   - Application tab
   - Clear Storage
   - Login again

## Success Criteria

✅ Delete button visible for records created by logged-in user
✅ "No access" shown for records created by other users
✅ Delete functionality works end-to-end
✅ No console errors
✅ Backend logs show successful DELETE requests
