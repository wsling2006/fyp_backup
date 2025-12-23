# 🔧 URGENT FIX: Sales/Marketing Dashboard Access

## ❌ Problem Found

When Sales or Marketing users logged in, they saw:
- ❌ Blank welcome page with only logout button
- ❌ No access to Purchase Requests
- ❌ No sidebar navigation

**Root Cause:**
1. Dashboard routing didn't handle `sales_department` or `marketing` roles
2. Sidebar menu only showed Purchase Requests to `super_admin` and `accountant`

---

## ✅ What Was Fixed

### 1. Dashboard Routing (`frontend/app/dashboard/page.tsx`)
**Before:**
```tsx
// Only redirected super_admin and accountant
// Sales/Marketing got stuck on welcome page
```

**After:**
```tsx
else if (user.role === "sales_department" || user.role === "marketing") {
  router.replace("/purchase-requests");
}
// Now Sales/Marketing auto-redirect to Purchase Requests
```

### 2. Sidebar Menu (`frontend/components/Sidebar.tsx`)
**Before:**
```tsx
{ label: 'Purchase Requests', ..., roles: ['super_admin', 'accountant'] }
```

**After:**
```tsx
{ label: 'Purchase Requests', ..., roles: ['super_admin', 'accountant', 'sales_department', 'marketing'] }
// Now all roles can see the menu item
```

---

## 🚀 Deploy This Fix NOW

### On Your Local Machine (Build the fix):

```bash
cd /Users/jw/fyp_system/frontend
npm run build
```

### Then Upload to EC2:

**Replace `YOUR-KEY.pem` and `YOUR-EC2-IP` with your actual values:**

```bash
# Upload the built frontend to EC2
scp -i YOUR-KEY.pem -r /Users/jw/fyp_system/frontend/.next ubuntu@YOUR-EC2-IP:/home/ubuntu/fyp_system/frontend/

# Also upload the source files (for completeness)
scp -i YOUR-KEY.pem /Users/jw/fyp_system/frontend/app/dashboard/page.tsx ubuntu@YOUR-EC2-IP:/home/ubuntu/fyp_system/frontend/app/dashboard/
scp -i YOUR-KEY.pem /Users/jw/fyp_system/frontend/components/Sidebar.tsx ubuntu@YOUR-EC2-IP:/home/ubuntu/fyp_system/frontend/components/

# SSH into EC2 and restart frontend
ssh -i YOUR-KEY.pem ubuntu@YOUR-EC2-IP
cd /home/ubuntu/fyp_system
pm2 reload frontend
pm2 list
```

---

## ✅ After Deployment, Test:

### 1. Login as Sales User
- Should auto-redirect to `/purchase-requests`
- Should see sidebar with "Purchase Requests" menu item
- Should see "+ New Request" button (if sales role)

### 2. Login as Marketing User
- Should auto-redirect to `/purchase-requests`
- Should see sidebar with "Purchase Requests" menu item
- Should see "+ New Request" button

### 3. Login as Accountant
- Should auto-redirect to `/dashboard/accountant`
- Should see "Purchase Requests" in sidebar
- Should see "Review" buttons on submitted requests

### 4. Login as SuperAdmin
- Should auto-redirect to `/dashboard/superadmin`
- Should see "Purchase Requests" in sidebar
- Should see all features (create, review, upload claim)

---

## 🎯 What Each Role Can Do Now

| Role | Access | Features |
|------|--------|----------|
| **Sales Department** | ✅ Purchase Requests | Create requests, Upload claims (own requests) |
| **Marketing** | ✅ Purchase Requests | Create requests, Upload claims (own requests) |
| **Accountant** | ✅ Purchase Requests | View all, Review (approve/reject), View claims |
| **SuperAdmin** | ✅ Purchase Requests | All features (create, review, upload, view all) |

---

## 📊 Summary

**Files Changed:** 2
- `frontend/app/dashboard/page.tsx` - Added sales/marketing redirect
- `frontend/components/Sidebar.tsx` - Added sales/marketing to menu

**Lines Changed:** 3 lines total
**Breaking Changes:** None
**Risk Level:** ⚠️ VERY LOW

**This is a critical fix** - Sales/Marketing users couldn't access any features before!

---

## 🆘 Quick Deploy Command

If you just want to get it working fast:

```bash
# On your Mac (build):
cd /Users/jw/fyp_system/frontend && npm run build

# Then copy-paste your scp and ssh commands with your actual key and IP
```

The fix is already in GitHub, so you can also just pull and rebuild on EC2 (but that takes longer).
