# ✅ IMPLEMENTATION COMPLETE: File Upload Security for Receipt Claims

## What Was Requested
You wanted the "Upload Receipt & Submit Claim" feature to have the same security as the accountant dashboard:
1. ✅ ClamAV scanning for malware
2. ✅ Prevent duplicate file uploads (same file uploaded multiple times)
3. ✅ Only allow ONE claim per purchase request

## What Was Implemented

### 🔒 Security Features

#### 1. Duplicate File Prevention (NEW)
- **How:** SHA-256 hashing of file content
- **Effect:** Users cannot upload the same receipt file twice
- **Error Message:** Shows which claim already has this file
- **Implementation:** `generateFileHash()` method in service

#### 2. One Claim Per Purchase Request (NEW)
- **How:** Database check + Frontend UI update
- **Effect:** Each purchase request can only have ONE claim
- **UI Change:** "Upload Claim" button disappears after claim is submitted
- **Badge:** Shows "✓ Claim Submitted" instead

#### 3. ClamAV Malware Scanning (Existing)
- **How:** Integration with ClamAV daemon
- **Effect:** All files scanned before storage
- **Status:** Already implemented, now fully integrated

### 📝 Code Changes

#### Backend (`backend/src/purchase-requests/`)
- **purchase-request.service.ts**
  - Added `crypto` import for SHA-256 hashing
  - Added `generateFileHash(buffer)` private method
  - Added `findClaimByFileHash(hash)` private method
  - Updated `createClaim()` to check for duplicates and existing claims
  
- **purchase-request.controller.ts**
  - Updated `uploadReceipt()` to pass file buffer to service
  - Added detailed comments explaining security flow

- **claim.entity.ts**
  - Already had `file_hash` column (no changes needed)

#### Frontend (`frontend/app/purchase-requests/`)
- **page.tsx**
  - Updated `canUploadClaim()` to check if claim exists
  - Added "✓ Claim Submitted" badge for PRs with claims
  - Hidden "Upload Claim" button when claim exists

#### Database
- **add-file-hash-column.sql**
  - Idempotent migration (safe to run multiple times)
  - Adds `file_hash VARCHAR(64)` column
  - Creates index for fast lookups

### 🏗️ Build Status
- ✅ Backend built: `/Users/jw/fyp_system/backend/dist/`
- ✅ Frontend built: `/Users/jw/fyp_system/frontend/.next/`
- ✅ No TypeScript errors
- ✅ All changes committed and pushed to GitHub

### 📋 What You Need To Do

#### Step 1: Run Database Migration
```bash
cd /Users/jw/fyp_system/backend

# Option A: Using psql
psql fyp_db -p 5433 -U <your_username> -f add-file-hash-column.sql

# Option B: Using PG Local app (if you have it)
# Just open the SQL file and run it in your database client
```

The migration will:
- Add `file_hash` column to `claims` table
- Create an index for fast duplicate detection
- Skip if column already exists (safe to run multiple times)

#### Step 2: Restart Your Application
```bash
cd /Users/jw/fyp_system

# If using PM2:
pm2 restart ecosystem.config.js
pm2 logs  # Check for any errors

# If running manually:
# Stop your current backend and frontend processes
# Then start them again
```

#### Step 3: Test The New Features

**Test 1: Upload a Claim**
1. Login as sales_department user (e.g., alice@example.com)
2. Find an APPROVED purchase request
3. Click "Upload Claim" button
4. Upload a receipt (PDF/JPG/PNG)
5. Fill in claim details and submit
6. ✅ Should succeed

**Test 2: Try to Upload Same File Again**
1. Try to upload THE SAME file for another approved purchase request
2. ❌ Should be REJECTED with error:
   ```
   This receipt file has already been uploaded for claim ID: xxx
   ```

**Test 3: Try to Upload Another Claim to Same PR**
1. Go back to the purchase request from Test 1
2. ✅ "Upload Claim" button should be HIDDEN
3. ✅ Should see "✓ Claim Submitted" badge instead
4. ✅ Should see "1 Claim(s)" count

**Test 4: Verify Malware Scanning**
1. Upload a valid receipt file
2. Check backend logs - should see ClamAV scan messages
3. File should be scanned before storage

### 📚 Documentation Files Created

1. **FILE_SECURITY_IMPLEMENTATION.md** - Complete implementation details
2. **DEPLOYMENT_FILE_SECURITY.md** - Deployment guide with test cases
3. **test-file-security.sh** - Automated test script
4. **deploy-file-security.sh** - Deployment script (optional)
5. **add-file-hash-column.sql** - Database migration

### 🔍 How To Verify It's Working

#### Check Database:
```sql
-- Should show file_hash column exists
\d claims

-- After uploading a claim, check the hash is stored
SELECT id, vendor_name, file_hash, uploaded_at 
FROM claims 
WHERE file_hash IS NOT NULL 
ORDER BY uploaded_at DESC 
LIMIT 5;

-- Verify no duplicates (should return 0 rows)
SELECT file_hash, COUNT(*) 
FROM claims 
WHERE file_hash IS NOT NULL 
GROUP BY file_hash 
HAVING COUNT(*) > 1;

-- Verify only one claim per PR (should return 0 rows)
SELECT purchase_request_id, COUNT(*) 
FROM claims 
GROUP BY purchase_request_id 
HAVING COUNT(*) > 1;
```

#### Check Logs:
```bash
# If using PM2:
pm2 logs backend --lines 50
pm2 logs frontend --lines 50

# Look for:
# - "ClamAV scan" messages
# - "Duplicate file" errors if you try to upload same file
# - "claim already exists" errors if you try to submit multiple claims
```

### 🎯 Expected Behavior

| Scenario | Before | After |
|----------|--------|-------|
| Upload same file twice | ✅ Allowed | ❌ Rejected (duplicate detected) |
| Multiple claims per PR | ✅ Allowed | ❌ Rejected (UI hides button) |
| Malware scanning | ✅ Working | ✅ Working (documented) |
| File validation | ✅ Working | ✅ Working (documented) |

### ⚠️ Important Notes

1. **Database Migration is Required**
   - Must run `add-file-hash-column.sql` before the feature works
   - Without it, duplicate detection won't work (but won't crash)

2. **ClamAV Must Be Running**
   - Check: `pgrep clamd` or `systemctl status clamav-daemon`
   - If not running, malware scanning will fail

3. **Existing Claims Won't Have Hashes**
   - Claims uploaded before migration won't have file_hash
   - They can't be checked for duplicates
   - New claims will have hashes

4. **Browser Cache**
   - Clear browser cache if UI doesn't update
   - Or hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

### 🐛 Troubleshooting

**"File hash not being stored"**
- Run the database migration
- Restart backend
- Check backend logs for errors

**"Duplicate detection not working"**
- Verify migration was successful: `\d claims` in psql
- Check backend includes crypto: `grep crypto backend/dist/.../service.js`
- Restart backend after building

**"Upload button still shows after claim"**
- Clear browser cache
- Rebuild frontend: `cd frontend && npm run build`
- Check API response includes claims array

### 📊 Monitoring

After deployment, monitor:
- Number of duplicate file rejections (should increase over time)
- Number of multiple claim attempts (should be zero)
- ClamAV scan failures (should be zero)
- Upload success rate (should be high)

### 🎉 Success Criteria

You'll know it's working when:
- ✅ Users cannot upload the same receipt twice
- ✅ Users cannot submit multiple claims for one purchase request
- ✅ "Upload Claim" button disappears after submitting claim
- ✅ Clear error messages guide users
- ✅ No system errors in logs

### 📞 Support

All code is committed and pushed to GitHub (commit: 7313214)

Files to review:
- `backend/src/purchase-requests/purchase-request.service.ts`
- `frontend/app/purchase-requests/page.tsx`
- `DEPLOYMENT_FILE_SECURITY.md` (detailed guide)
- `FILE_SECURITY_IMPLEMENTATION.md` (technical details)

---

## Quick Start Commands

```bash
# 1. Run migration
cd /Users/jw/fyp_system/backend
psql fyp_db -p 5433 -U <username> -f add-file-hash-column.sql

# 2. Restart services
cd /Users/jw/fyp_system
pm2 restart ecosystem.config.js

# 3. Check status
pm2 status
pm2 logs

# 4. Test
# Login as sales user and try uploading claims!
```

---

**Status:** ✅ READY FOR DEPLOYMENT
**Last Updated:** December 26, 2025
**Git Commit:** 7313214
