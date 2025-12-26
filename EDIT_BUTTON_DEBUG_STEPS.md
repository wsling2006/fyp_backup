# Edit Button Debugging Checklist

## You should see the Edit button on those two test requests!

Let me help you debug why it's not showing.

## Step 1: Open Browser Console (F12)

Press `F12` on your keyboard to open the Developer Console.

## Step 2: Check for Debug Logs

Look for these console messages:
- `[Auth] Loaded user from localStorage`
- `[loadRequests] Current user:`
- `[canEditRequest] Checking:`

## Step 3: Check Your User Object

In the console, type:
```javascript
console.log(JSON.parse(localStorage.getItem('user')));
```

**It should show:**
```javascript
{
  id: "a11b07a6-7897-406e-bd08-8198606ae82b",
  userId: "a11b07a6-7897-406e-bd08-8198606ae82b",  // ← Must match your ID
  email: "leejwei004@gmail.com",
  role: "sales_department"
}
```

## Step 4: Clear localStorage and Login Again

**MOST LIKELY ISSUE:** Your localStorage has old user data without the `userId` property!

In browser console (F12):
```javascript
localStorage.clear();
```

Then:
1. Refresh the page (F5)
2. Login again with your credentials
3. Go back to Purchase Requests page
4. The Edit buttons should now appear on the DRAFT and SUBMITTED test requests!

## Step 5: If Still Not Working

Share these console outputs with me:

```javascript
// 1. Your user object
console.log('User:', JSON.parse(localStorage.getItem('user')));

// 2. Fetch the requests manually
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
    if (req.title.includes('TEST')) {
      console.log(`Request: ${req.title}`);
      console.log(`  Created by: ${req.created_by_user_id}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Match: ${req.created_by_user_id === (user.userId || user.id)}`);
    }
  });
});
```

## Quick Fix Command

Just run this in browser console:
```javascript
localStorage.clear();
location.reload();
```

Then login again. That should fix it! 🎯
