# SENIOR DEVELOPER DEBUG GUIDE - Edit Button Issue

## Problem Analysis

The user (sales department) cannot see the "Edit Request" button on their own purchase requests.

## Root Cause Hypothesis

Based on code review, the issue is likely one of these:

1. **User object mismatch**: The user object in localStorage doesn't have `userId` property
2. **Type mismatch**: UUID comparison between string and other type
3. **Request ownership**: The `created_by_user_id` doesn't match the current user's ID

## Debug Process

### Step 1: Use the Debug Tool

I've created a comprehensive debug HTML page that you can access at:

**URL:** `http://your-domain:3001/debug-edit-button.html`

Or locally: Open `frontend/public/debug-edit-button.html` in your browser after logging in.

This tool will:
- ✅ Show your current localStorage user object
- ✅ Fetch your purchase requests from the API
- ✅ Run the exact `canEditRequest` logic for each request
- ✅ Show WHY the button is/isn't appearing

### Step 2: Manual Console Debug

If you prefer, open the browser console (F12) on the Purchase Requests page and run:

```javascript
// Check your user object
console.log('User from localStorage:', JSON.parse(localStorage.getItem('user')));

// This should show:
// {
//   id: "some-uuid",
//   userId: "some-uuid",  // ← This must exist and match id
//   email: "user@example.com",
//   role: "sales_department"
// }
```

### Step 3: Check the Requests

Still in console:

```javascript
// Manually fetch and check requests
fetch('/api/purchase-requests', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
    'Content-Type': 'application/json'
  }
})
.then(r => r.json())
.then(requests => {
  const user = JSON.parse(localStorage.getItem('user'));
  console.log('Current user ID:', user.userId || user.id);
  
  requests.forEach(req => {
    console.log(`Request: ${req.title}`);
    console.log(`  Created by: ${req.created_by_user_id}`);
    console.log(`  Status: ${req.status}`);
    console.log(`  Match: ${req.created_by_user_id === (user.userId || user.id)}`);
  });
});
```

## Expected Behavior

### For Sales Department User

#### ✅ SHOULD SEE Edit Button When:
1. The request was created by them (`created_by_user_id` matches their user ID)
2. AND the request status is `DRAFT` or `SUBMITTED`

#### ❌ SHOULD NOT SEE Edit Button When:
1. The request was created by someone else
2. OR the request status is `APPROVED`, `REJECTED`, `UNDER_REVIEW`, or `PAID`

### For Super Admin

#### ✅ SHOULD SEE Edit Button When:
1. ANY request (regardless of creator)
2. AND the request status is `DRAFT` or `SUBMITTED`

## Common Issues and Fixes

### Issue 1: localStorage Missing `userId`

**Symptom:** User object looks like:
```json
{
  "id": "abc-123",
  "email": "user@example.com",
  "role": "sales_department"
}
```

**Fix:**
```javascript
// Clear localStorage
localStorage.clear();
// Then login again
```

### Issue 2: Wrong User ID Type

**Symptom:** Console shows:
```
requestCreatedBy: "abc-123" (string)
currentUserId: undefined
```

**Fix:** The code already handles this with:
```javascript
const currentUserId = String(user?.userId || user?.id || '');
```

But if it's still failing, clear localStorage and login again.

### Issue 3: No Requests Visible

**Symptom:** The page shows "No purchase requests found"

**Possible causes:**
1. The user hasn't created any requests yet
2. Backend filtering is too strict
3. Database doesn't have requests for this user

**Debug:**
```bash
# On EC2, check database
sudo -u postgres psql fyp_db -c "SELECT id, title, status, created_by_user_id FROM purchase_requests WHERE department = 'sales_department';"
```

## Code Review Findings

### Backend (`purchase-request.service.ts` line 269-283)

```typescript
async getAllPurchaseRequests(userId: string, userRole: string): Promise<PurchaseRequest[]> {
  let query = this.purchaseRequestRepo.createQueryBuilder('pr')
    .leftJoinAndSelect('pr.createdBy', 'creator')
    .leftJoinAndSelect('pr.reviewedBy', 'reviewer')
    .leftJoinAndSelect('pr.claims', 'claims')
    .orderBy('pr.created_at', 'DESC');

  // RBAC: Sales/Marketing see only their own
  if (userRole === Role.SALES || userRole === Role.MARKETING) {
    query = query.where('pr.created_by_user_id = :userId', { userId });
  }
  // Accountant and SuperAdmin see all (no additional filter)

  return query.getMany();
}
```

✅ **This is correct** - Returns full entity with `created_by_user_id`

### Frontend (`purchase-requests/page.tsx` line 126-154)

```typescript
const canEditRequest = (request: PurchaseRequest) => {
  // Debug logging (will show in console)
  console.log('[canEditRequest] Checking:', {
    requestId: request.id,
    requestCreatedBy: request.created_by_user_id,
    userId: user?.userId,
    userIdFromUser: user?.id,
    userRole: user?.role,
    requestStatus: request.status,
  });
  
  // Only owner or super_admin can edit
  const requestCreatedBy = String(request.created_by_user_id);
  const currentUserId = String(user?.userId || user?.id || '');
  const isOwner = requestCreatedBy === currentUserId;
  
  if (!isOwner && user?.role !== 'super_admin') return false;
  
  // Can only edit DRAFT or SUBMITTED status
  return ['DRAFT', 'SUBMITTED'].includes(request.status);
};
```

✅ **This is correct** - Handles both `userId` and `id` properties

### Auth Context (`context/AuthContext.tsx` line 47-65)

```typescript
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
      localStorage.setItem("user", JSON.stringify(parsedUser));
    }
    setUser(parsedUser);
  }
  setIsInitialized(true);
}, []);
```

✅ **This is correct** - Normalizes user on load

## The Real Problem

The code is correct! The issue is that **users who logged in BEFORE the normalization code was added** still have the old user object in localStorage.

## The Solution

### For End Users:
1. Clear localStorage
2. Login again

### For System Admin:
Deploy the latest code (which auto-normalizes), but still tell users to clear localStorage once.

## Deployment Commands (EC2)

```bash
cd ~/fyp_system
git pull origin main
cd frontend
npm run build
cd ..
pm2 restart frontend
```

Then tell ALL users to clear their browser localStorage and login again.

## Testing Checklist

- [ ] Sales department user can see Edit button on their own DRAFT requests
- [ ] Sales department user can see Edit button on their own SUBMITTED requests
- [ ] Sales department user CANNOT see Edit button on APPROVED requests
- [ ] Sales department user CANNOT see Edit button on other users' requests
- [ ] Super admin can see Edit button on ANY DRAFT/SUBMITTED request
- [ ] Accountant CANNOT see Edit button (they only see Review button)
- [ ] Edit button opens modal with OTP flow
- [ ] Successful edit is logged in audit trail

## Next Steps

1. Use the debug HTML tool first
2. Check the console output
3. Share the console logs with me if issue persists
4. We'll trace through the exact values being compared
