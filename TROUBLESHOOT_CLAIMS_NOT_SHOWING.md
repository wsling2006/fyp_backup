# 🔧 TROUBLESHOOTING: Claims Not Showing on Web Page

## 📋 Quick Summary

If you can't see the **"X Claim(s)"** button on the Purchase Requests page, follow this guide to diagnose and fix the issue.

---

## 🎯 **Expected Behavior**

When a Sales/Marketing user uploads a claim with a receipt, the Accountant should see:

```
┌─────────────────────────────────────────────────────┐
│ Office Supplies               ✅ APPROVED           │
│ Department: Sales                                   │
│                                                     │
│ ✓ Claim Submitted  [1 Claim(s)] ← THIS BUTTON     │
└─────────────────────────────────────────────────────┘
```

If you don't see the button, let's diagnose the issue.

---

## 🔍 **STEP 1: Check Your Local Code**

### On Your Local Machine (MacBook):

```bash
cd /Users/jw/fyp_system

# Check what's committed
git log --oneline -5

# You should see these commits:
# 64cb802 docs: Add EC2 deployment quick reference guide
# edd6f4f feat: Add EC2 pull and deploy script
# e055eba fix: Remove duplicate accountant download endpoint
# 041cf95 docs: Add deployment script and final summary
# 0a1e5e4 feat: Implement secure accountant receipt download feature
```

**✅ Your local code is correct** (based on the git log we checked).

---

## 🔍 **STEP 2: Check EC2 Instance**

### SSH into EC2:

```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
```

### Run Diagnostic Commands:

```bash
# 1. Check if code is up to date
cd /home/ubuntu/fyp_system
git status
git log --oneline -5

# Compare with local: Should match commit 64cb802
```

### **Possible Issues:**

#### Issue A: EC2 Code is Outdated
```bash
# If git log shows older commits, pull latest:
git pull origin main

# Then rebuild and restart
cd frontend
npm run build
pm2 restart frontend

cd ../backend
npm run build
pm2 restart backend
```

#### Issue B: EC2 Has Uncommitted Changes
```bash
# If git status shows modified files:
git stash          # Save local changes
git pull origin main
npm install        # In both frontend and backend
# Rebuild as above
```

---

## 🔍 **STEP 3: Check if Services Are Running**

```bash
# Check PM2 status
pm2 list

# Should show:
# ┌─────┬────────────┬─────────┬─────────┐
# │ id  │ name       │ status  │ restart │
# ├─────┼────────────┼─────────┼─────────┤
# │ 0   │ backend    │ online  │ 0       │
# │ 1   │ frontend   │ online  │ 0       │
# └─────┴────────────┴─────────┴─────────┘

# Check frontend logs
pm2 logs frontend --lines 50

# Check backend logs
pm2 logs backend --lines 50

# Look for errors like:
# - "Module not found"
# - "Cannot find module"
# - "Port already in use"
# - Build errors
```

---

## 🔍 **STEP 4: Check Database - Are Claims Actually There?**

### Connect to PostgreSQL:

```bash
# On EC2:
sudo -u postgres psql -d your_database_name

# Or if using connection string:
psql "postgresql://username:password@localhost:5432/database"
```

### Check if Claims Exist:

```sql
-- 1. Check claims table
SELECT 
  c.id,
  c.purchase_request_id,
  c.vendor_name,
  c.amount_claimed,
  c.receipt_file_original_name,
  pr.title as request_title,
  pr.status as request_status
FROM claims c
LEFT JOIN purchase_requests pr ON c.purchase_request_id = pr.id
ORDER BY c.created_at DESC
LIMIT 10;
```

**Expected Result:**
- If you see rows → Claims exist in DB
- If no rows → No claims have been uploaded yet

### Check Purchase Requests:

```sql
-- 2. Check if purchase requests have claims linked
SELECT 
  pr.id,
  pr.title,
  pr.status,
  COUNT(c.id) as claim_count
FROM purchase_requests pr
LEFT JOIN claims c ON c.purchase_request_id = pr.id
GROUP BY pr.id, pr.title, pr.status
ORDER BY pr.created_at DESC
LIMIT 10;
```

**Expected Result:**
- `claim_count` should be > 0 for requests with uploaded claims

---

## 🔍 **STEP 5: Check Backend API Response**

### Test Backend Directly:

```bash
# On EC2:

# 1. Login as accountant to get JWT token
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "accountant@example.com",
    "password": "your-password"
  }'

# Copy the "access_token" from response

# 2. Get purchase requests
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  http://localhost:3000/purchase-requests | jq '.'

# Look for "claims" array in each request:
# {
#   "id": "...",
#   "title": "...",
#   "claims": [        ← Should be array with claims
#     {
#       "id": "...",
#       "vendor_name": "...",
#       ...
#     }
#   ]
# }
```

### **Possible Issues:**

#### Issue A: `claims` Array is Empty `[]`
- **Problem**: Claims exist but not being loaded
- **Fix**: Check backend service method `findAllForUser()`

#### Issue B: `claims` Key Missing
- **Problem**: Backend not including claims in response
- **Fix**: Check if relations are loaded in query

#### Issue C: API Returns Error
- **Problem**: Backend crashed or has error
- **Fix**: Check `pm2 logs backend`

---

## 🔍 **STEP 6: Check Frontend Code**

### On EC2, Check File:

```bash
cd /home/ubuntu/fyp_system/frontend

# Check if page.tsx is correct
grep -A 5 "claims.length" app/purchase-requests/page.tsx

# Should show:
# {request.claims.length > 0 && (
#   <button
#     onClick={() => {
#       if (request.claims.length === 1) {
```

### Check Browser Console:

1. Open your EC2 app: `http://your-ec2-ip:3001`
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Look for errors:
   - `[loadRequests] Loaded requests:` → Check if claims array exists
   - Network errors
   - JavaScript errors

---

## 🔍 **STEP 7: Check Frontend Build**

```bash
# On EC2:
cd /home/ubuntu/fyp_system/frontend

# Check if .next folder exists
ls -la .next/

# If missing or old, rebuild:
rm -rf .next
npm run build

# Should complete without errors
# Then restart:
pm2 restart frontend
```

---

## 🚀 **QUICK FIX: Complete Rebuild**

If all else fails, do a complete rebuild on EC2:

```bash
# Stop services
pm2 stop all

# Pull latest code
cd /home/ubuntu/fyp_system
git stash
git pull origin main

# Reinstall dependencies
cd backend
npm install
npm run build

cd ../frontend
npm install
npm run build

# Restart services
pm2 restart all

# Check status
pm2 logs
```

---

## 🎯 **MOST COMMON ISSUES & SOLUTIONS**

### ❌ Issue 1: EC2 Code Not Updated
**Symptom**: Button doesn't show, old code on EC2
**Solution**:
```bash
git pull origin main
npm run build (in frontend)
pm2 restart frontend
```

### ❌ Issue 2: No Claims Uploaded Yet
**Symptom**: Button doesn't show for any request
**Solution**: Upload a claim first as Sales/Marketing user

### ❌ Issue 3: Request Not APPROVED
**Symptom**: Button doesn't show
**Solution**: Accountant must APPROVE the request first, then Sales/Marketing can upload claim

### ❌ Issue 4: Frontend Build Failed
**Symptom**: White screen or old version
**Solution**:
```bash
cd frontend
rm -rf .next
npm run build
pm2 restart frontend
```

### ❌ Issue 5: Backend Not Loading Claims Relation
**Symptom**: API response doesn't have `claims` array
**Solution**: Check backend code in `purchase-request.service.ts` - should have `relations: ['claims']`

---

## 📊 **Step-by-Step Diagnostic Workflow**

```
1. Check Local Code ✓ (Your local code is correct)
   ↓
2. SSH to EC2
   ↓
3. Check git log on EC2
   ├─ If older commits → git pull → rebuild → restart
   └─ If same commits → Continue
   ↓
4. Check pm2 list
   ├─ If not running → pm2 restart all
   └─ If running → Continue
   ↓
5. Check pm2 logs for errors
   ├─ If errors → Fix error → rebuild → restart
   └─ If no errors → Continue
   ↓
6. Check database - Do claims exist?
   ├─ If NO claims → Upload claim as Sales user
   └─ If claims exist → Continue
   ↓
7. Test backend API directly
   ├─ If claims missing in API → Fix backend
   └─ If claims in API → Continue
   ↓
8. Check browser console
   ├─ If console shows claims → Frontend display issue
   └─ If console doesn't show claims → API issue
   ↓
9. Complete rebuild (last resort)
```

---

## 🆘 **What to Share for Help**

If you need help, share these outputs:

```bash
# On EC2:
cd /home/ubuntu/fyp_system

echo "=== GIT STATUS ==="
git log --oneline -5
echo ""

echo "=== PM2 STATUS ==="
pm2 list
echo ""

echo "=== BACKEND LOGS ==="
pm2 logs backend --lines 30 --nostream
echo ""

echo "=== FRONTEND LOGS ==="
pm2 logs frontend --lines 30 --nostream
echo ""

echo "=== DATABASE CHECK ==="
sudo -u postgres psql -d your_database_name -c "SELECT COUNT(*) FROM claims;"
echo ""

echo "=== API TEST ==="
# (Test with your JWT token)
```

---

## ✅ **Expected Working State**

When everything is correct:

1. **EC2 Git**: Commit `64cb802` or newer
2. **PM2**: Both backend and frontend **online**
3. **Database**: Claims exist in `claims` table
4. **Backend API**: Returns requests with `claims` array
5. **Frontend**: Shows "X Claim(s)" button
6. **Browser Console**: No errors, shows claims data

---

## 🎉 **Success Check**

You know it's working when:
1. ✅ You see "X Claim(s)" button on approved requests
2. ✅ Clicking button downloads file (1 claim) or opens modal (multiple)
3. ✅ Browser console shows: `[loadRequests] Loaded requests: [{...claims: [...]}]`
4. ✅ No errors in PM2 logs

---

## 📞 **Next Steps**

1. **Run the diagnostic commands above**
2. **Share the outputs** (git log, pm2 status, logs)
3. **Check database** to confirm claims exist
4. **Test backend API** to see if claims are returned
5. **Based on findings**, we'll identify the exact issue

---

**Most likely issue**: EC2 code needs to be pulled and rebuilt! 🔄
