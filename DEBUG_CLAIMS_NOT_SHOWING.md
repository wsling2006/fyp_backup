# 🔍 CLAIMS NOT SHOWING - DEBUGGING GUIDE

## ⚡ Quick Actions - Do This NOW

### **On EC2:**

```bash
# Pull latest debug code
cd /home/ubuntu/fyp_system
git pull origin main

# Rebuild frontend with debug logging
cd frontend
rm -rf .next
npm run build
pm2 restart frontend
```

### **In Your Browser:**

1. **Hard refresh:** Ctrl + Shift + R
2. **Open DevTools:** Press F12
3. **Go to Console tab**
4. **Login as Accountant**
5. **Go to Purchase Requests page**
6. **Look for these debug messages:**

```javascript
[DEBUG] Total requests loaded: X
[DEBUG] Request 1: {...}
[DEBUG] Request 2: {...}
...
```

---

## 📊 What to Look For in Console

### ✅ **GOOD Output (Claims are loaded):**

```javascript
[loadRequests] Loaded requests: Array(5)
[DEBUG] Total requests loaded: 5
[DEBUG] Request 1: {
  id: "abc-123",
  title: "Office Supplies",
  status: "APPROVED",
  hasClaims: "YES",         // ← Should be YES
  claimsCount: 1,           // ← Should be > 0
  claimsData: [             // ← Should have data
    {
      id: "claim-123",
      vendor_name: "Office Depot",
      amount_claimed: 450.00,
      ...
    }
  ]
}
```

If you see this → **Backend is returning claims correctly**  
Problem is: Frontend display logic

---

### ❌ **BAD Output (Claims NOT loaded):**

```javascript
[loadRequests] Loaded requests: Array(5)
[DEBUG] Total requests loaded: 5
[DEBUG] Request 1: {
  id: "abc-123",
  title: "Office Supplies",
  status: "APPROVED",
  hasClaims: "NO",          // ← Shows NO
  claimsCount: 0,           // ← Shows 0
  claimsData: undefined     // ← No data!
}
```

If you see this → **Backend is NOT returning claims**  
Problem is: Backend query not loading relations

---

## 🔍 Diagnosis Based on Console Output

### **Case 1: `hasClaims: "NO"` and `claimsCount: 0`**

**Problem:** Backend is not including claims in the response

**Solution:** Check backend service - relations not loaded

```bash
# On EC2, check backend code:
grep -A 10 "findAllForUser" /home/ubuntu/fyp_system/backend/src/purchase-requests/purchase-request.service.ts
```

Should see:
```typescript
return this.purchaseRequestRepository.find({
  relations: ['createdBy', 'reviewedBy', 'claims'], // ← Must have 'claims'
  ...
});
```

---

### **Case 2: `hasClaims: "YES"` but button doesn't show**

**Problem:** Frontend render logic issue

**Check in the page.tsx around line 354:**
```tsx
{request.claims.length > 0 && (
  <button ...>
    {request.claims.length} Claim(s)
  </button>
)}
```

**Possible issues:**
- `request.claims` is defined but empty array `[]`
- TypeScript/React not re-rendering
- CSS hiding the button

---

### **Case 3: Console shows claims but no [DEBUG] messages**

**Problem:** Old frontend code still running

**Solution:**
```bash
# Clear everything and rebuild
cd /home/ubuntu/fyp_system
git pull origin main
cd frontend
rm -rf .next node_modules/.cache
npm run build
pm2 restart frontend
```

Then in browser:
- Ctrl + Shift + R (hard refresh)
- Clear all cache
- Close and reopen browser

---

## 🔧 Backend Check - Verify Claims Relations

### **Test Backend API Directly:**

```bash
# On EC2:

# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"accountant@example.com","password":"YourPassword123!"}' \
  | jq -r '.access_token')

echo "Token: $TOKEN"

# 2. Get purchase requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/purchase-requests | jq '.[] | {id, title, status, claims}'

# Expected output:
# {
#   "id": "...",
#   "title": "...",
#   "status": "APPROVED",
#   "claims": [        ← Should see claims array
#     {
#       "id": "...",
#       "vendor_name": "...",
#       ...
#     }
#   ]
# }
```

---

## 🎯 Most Common Issues & Fixes

### **Issue 1: Backend Not Loading Claims Relation** ⭐ MOST LIKELY

**Symptom:** Console shows `hasClaims: "NO"`, API response doesn't have claims

**Check:**
```bash
# Check purchase-request.service.ts
cat /home/ubuntu/fyp_system/backend/src/purchase-requests/purchase-request.service.ts | grep -A 20 "async findAllForUser"
```

**Should have:**
```typescript
relations: ['createdBy', 'reviewedBy', 'claims']
```

**If missing, fix it:**
1. Edit the file
2. Add `'claims'` to relations array
3. Restart backend: `pm2 restart backend`

---

### **Issue 2: Frontend Cache Not Cleared**

**Symptom:** Old code running, no [DEBUG] messages

**Fix:**
```bash
cd /home/ubuntu/fyp_system/frontend
rm -rf .next .next.cache node_modules/.cache
npm run build
pm2 restart frontend
```

Browser:
- Ctrl + Shift + R
- F12 → Application → Clear storage → Clear site data

---

### **Issue 3: Claims Array is Undefined**

**Symptom:** Console error: `Cannot read property 'length' of undefined`

**Fix:** Add null check in code:
```tsx
{request.claims && request.claims.length > 0 && (
  <button>...</button>
)}
```

---

## 📋 Complete Debugging Checklist

Run through this checklist:

### ✅ **Backend Checks:**

```bash
# 1. Backend is running
pm2 list | grep backend
# Should show: online

# 2. Backend logs clean
pm2 logs backend --lines 50 --nostream
# Should NOT show errors

# 3. Database has claims
sudo -u postgres psql -d fyp_db -c "SELECT COUNT(*) FROM claims;"
# Should show: count = 9

# 4. API returns claims
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/purchase-requests | jq '.[0].claims'
# Should show: array with claims
```

### ✅ **Frontend Checks:**

```bash
# 1. Latest code
cd /home/ubuntu/fyp_system
git log --oneline -1
# Should show: debug: Add enhanced logging...

# 2. Clean build
ls -la frontend/.next
# Should exist and be recent (today's date)

# 3. Frontend running
pm2 list | grep frontend
# Should show: online

# 4. No errors in logs
pm2 logs frontend --lines 30 --nostream
# Should NOT show: "Failed to find Server Action"
```

### ✅ **Browser Checks:**

1. Hard refresh: Ctrl + Shift + R
2. F12 → Console → Look for `[DEBUG]` messages
3. F12 → Network → Check `/api/purchase-requests` response
4. F12 → Application → Clear storage if needed

---

## 🚨 Emergency Fix - If Nothing Works

```bash
# Complete reset on EC2:

cd /home/ubuntu/fyp_system

# Stop everything
pm2 stop all

# Pull latest
git stash
git pull origin main

# Backend
cd backend
rm -rf dist node_modules/.cache
npm install
npm run build

# Frontend
cd ../frontend
rm -rf .next node_modules/.cache
npm install
npm run build

# Restart
cd ..
pm2 restart all

# Wait 10 seconds
sleep 10

# Check status
pm2 status
pm2 logs --lines 20 --nostream
```

Then in browser:
1. Close all tabs
2. Clear all cache
3. Reopen browser
4. Go to app
5. Hard refresh

---

## 📊 Share This Info With Me:

When you run the debug version, share:

1. **Console output:**
   ```
   [DEBUG] Total requests loaded: X
   [DEBUG] Request 1: {...}
   ```

2. **Network tab:**
   - F12 → Network
   - Find `/api/purchase-requests` request
   - Click it → Preview tab
   - Screenshot the response

3. **Backend API test:**
   ```bash
   curl -H "Authorization: Bearer TOKEN" http://localhost:3000/purchase-requests | jq '.'
   ```

This will tell me EXACTLY where the problem is! 🎯
