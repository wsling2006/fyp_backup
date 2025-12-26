# 🔧 FIX FOR ACCOUNTANT APPROVAL ERROR

## 🔴 **Issue Reported**
After an accountant edits/approves a purchase request, the page shows:
```
Application error: a client-side exception has occurred
TypeError: e.approved_amount.toFixed is not a function
```

## ✅ **Root Cause Found**
There were **4 remaining `.toFixed(2)` calls** in the purchase-requests page that weren't converted to use the `formatCurrency` helper. 

PostgreSQL returns `DECIMAL` columns as **strings**, not numbers, so `.toFixed()` fails.

## 🛠️ **What Was Fixed**

Fixed all remaining `.toFixed(2)` calls on lines:
- Line 639: `request.estimated_amount.toFixed(2)` → `formatCurrency(request.estimated_amount)`
- Line 677: `request.estimated_amount.toFixed(2)` → `formatCurrency(request.estimated_amount)`
- Line 857: `request.approved_amount?.toFixed(2)` → `formatCurrency(request.approved_amount)`
- Line 909: `request.approved_amount?.toFixed(2)` → `formatCurrency(request.approved_amount)`

The `formatCurrency` helper safely handles both string and number inputs.

---

## 🚀 **DEPLOY TO EC2**

Run these commands on your EC2 instance:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@54.254.162.43

# Navigate to project
cd ~/fyp_system

# Pull latest fixes
git pull origin main

# Stop frontend
pm2 stop frontend
pm2 delete frontend

# Rebuild frontend with the fixes
cd frontend
rm -rf .next
npm run build

# Start frontend
pm2 start npm --name frontend -- run start

# Check status
pm2 status
pm2 logs frontend --lines 20
```

---

## ✅ **Verification Steps**

### 1. Check Frontend Builds Successfully
```bash
cd ~/fyp_system/frontend
npm run build
```
Should show:
```
✓ Compiled successfully
✓ Linting and checking validity of types
```

### 2. Check Frontend is Online
```bash
pm2 status
```
Should show:
```
│ frontend    │ online     │
```

### 3. Test in Browser
1. Login as **accountant** user
2. Go to **Purchase Requests** page
3. Find a **Pending** request
4. Click **Review** button
5. Set status to **Approved** or **Under Review**
6. Enter approved amount
7. Click **Submit**
8. **Page should refresh without errors**
9. **Approved amount should display correctly** (e.g., "$1,234.56")

### 4. Test as Sales Department
1. Login as **sales_department** user
2. Go to **Purchase Requests**
3. View your requests
4. **All amounts should display correctly**
5. **No browser console errors**

---

## 🔍 **What to Look For**

### ✅ Success Indicators:
- [ ] Frontend builds without TypeScript errors
- [ ] PM2 shows frontend as "online"
- [ ] No errors in PM2 logs
- [ ] Can approve/reject purchase requests
- [ ] Page doesn't crash after approval
- [ ] All amounts display with 2 decimals
- [ ] No "toFixed is not a function" errors in browser console

### ❌ If Errors Still Occur:
```bash
# Check browser console (F12)
# Look for any remaining .toFixed errors

# Check frontend logs
pm2 logs frontend --lines 50

# If you see .toFixed errors, verify the file on EC2:
cd ~/fyp_system/frontend/app/purchase-requests
grep "\.toFixed" page.tsx | grep -v "formatCurrency"

# Should ONLY show file.size (which is correct)
# Should NOT show any amount.toFixed
```

---

## 📋 **Summary of Changes**

### Files Modified:
- `frontend/app/purchase-requests/page.tsx`

### Changes Made:
- ✅ Replaced `request.estimated_amount.toFixed(2)` with `formatCurrency(request.estimated_amount)` (2 occurrences)
- ✅ Replaced `request.approved_amount.toFixed(2)` with `formatCurrency(request.approved_amount)` (2 occurrences)
- ✅ All amount displays now use the safe `formatCurrency` helper
- ✅ Helper handles both string and number inputs correctly

### Why This Fixes It:
PostgreSQL's `DECIMAL` type is returned as a **string** to JavaScript to preserve precision. The `.toFixed()` method only works on numbers, so calling it on a string causes the error. The `formatCurrency` helper:
1. Checks if value is null/undefined
2. Converts strings to numbers using `parseFloat()`
3. Safely applies `.toFixed(2)`
4. Returns formatted string

---

## 🎯 **Expected Result**

After deploying:
1. ✅ Accountants can approve/reject requests without errors
2. ✅ Page refreshes correctly after approval
3. ✅ All currency values display properly
4. ✅ No runtime errors in browser
5. ✅ Sales department users see correct amounts
6. ✅ Claims can be submitted against approved requests

---

**Deploy now with:**
```bash
cd ~/fyp_system && git pull origin main && cd frontend && rm -rf .next && npm run build && pm2 restart frontend
```

Let me know the results! 🚀
