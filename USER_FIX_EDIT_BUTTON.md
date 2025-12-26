# Quick Fix for "Edit Request" Button Not Showing

## Problem
You're logged in as a sales department user but cannot see the "Edit Request" button on your own purchase requests.

## Immediate Solution

### Step 1: Clear Browser Data
The issue is caused by old user data in your browser. To fix it:

**Option A: Clear Just localStorage (Recommended)**
1. Open your browser's Developer Console:
   - Chrome/Edge: Press `F12` or `Ctrl+Shift+I` (Windows) or `Cmd+Option+I` (Mac)
   - Firefox: Press `F12` or `Ctrl+Shift+K` (Windows) or `Cmd+Option+K` (Mac)

2. Go to the "Console" tab

3. Type this command and press Enter:
   ```javascript
   localStorage.clear();
   ```

4. Refresh the page (press `F5` or click the refresh button)

**Option B: Clear All Browser Data**
1. In Chrome/Edge: 
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cookies and other site data"
   - Click "Clear data"

2. In Firefox:
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cookies" and "Cache"
   - Click "Clear Now"

### Step 2: Login Again
After clearing the data, go back to the login page and login with your credentials.

### Step 3: Verify the Fix
1. Go to the Purchase Requests page
2. You should now see the "Edit Request" button on:
   - Your own purchase requests
   - Only those with status "DRAFT" or "SUBMITTED"

## How to Check if You Need This Fix

Open the browser console (F12) and type:
```javascript
console.log(JSON.parse(localStorage.getItem('user')));
```

If you see something like:
```javascript
{id: "abc-123", email: "user@example.com", role: "sales_department"}
```

**WITHOUT** a `userId` field, you need to clear localStorage and login again.

After the fix, it should look like:
```javascript
{id: "abc-123", userId: "abc-123", email: "user@example.com", role: "sales_department"}
```

## What Was the Problem?

The system was updated to use a normalized user object structure. Users who logged in before this update had incomplete user data stored in their browser, causing ownership checks to fail. This prevented the "Edit Request" button from appearing.

## Technical Details

The fix includes:
- ✅ Automatic normalization of user data when loading from localStorage
- ✅ Enhanced debug logging to help diagnose issues
- ✅ Improved type safety for user ID comparisons
- ✅ Backward compatibility with old and new user object formats

## Need More Help?

If the button still doesn't appear after following these steps, open the browser console (F12) and look for debug messages starting with:
- `[Auth] Loaded user from localStorage`
- `[loadRequests] Current user`
- `[canEditRequest] Checking`

Share these console messages with the system administrator for further investigation.

## Expected Behavior

### Sales Department / Marketing Users:
- ✅ Can see "Edit Request" button on their OWN requests that are DRAFT or SUBMITTED
- ❌ Cannot see button on other users' requests
- ❌ Cannot see button on APPROVED, REJECTED, or PAID requests

### Super Admin:
- ✅ Can see "Edit Request" button on ALL requests that are DRAFT or SUBMITTED
- ❌ Cannot see button on APPROVED, REJECTED, or PAID requests

### Accountant:
- ❌ Cannot edit purchase requests
- ✅ Can see "Review" button on SUBMITTED or UNDER_REVIEW requests
