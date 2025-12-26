# File Upload Security Deployment Guide

## Overview
This deployment adds comprehensive security features to the "Upload Receipt & Submit Claim" functionality, matching the security standards of the accountant dashboard file upload.

## Features Implemented

### 1. **ClamAV Malware Scanning** ✅
- All uploaded receipt files are scanned for malware before storage
- Infected files are rejected immediately
- Same security as accountant file uploads

### 2. **Duplicate File Detection** ✅
- Uses SHA-256 hashing to detect duplicate files
- Prevents users from uploading the same receipt file multiple times
- Database tracks file hash for each claim

### 3. **One Claim Per Purchase Request** ✅
- System enforces that each purchase request can only have ONE claim
- Backend validation prevents multiple claims
- Frontend hides "Upload Claim" button once a claim exists

### 4. **File Validation** ✅
- Allowed formats: PDF, JPG, PNG
- Maximum file size: 10MB
- MIME type validation

## Deployment Steps

### Step 1: Database Migration
Add the `file_hash` column to the `claims` table:

```bash
cd /Users/jw/fyp_system/backend
psql fyp_db -p 5433 -U <your_db_user> -f add-file-hash-column.sql
```

Or use your database client (DBeaver, pgAdmin, etc.) to run the SQL file:
`backend/add-file-hash-column.sql`

The migration script will:
- Add a `file_hash VARCHAR(64)` column to the `claims` table
- Create an index for fast duplicate lookups
- Skip if the column already exists

### Step 2: Verify Builds
Both frontend and backend have been built successfully:

✓ Backend: `backend/dist/` contains compiled code
✓ Frontend: `frontend/.next/` contains production build

### Step 3: Restart Services

#### If using PM2:
```bash
cd /Users/jw/fyp_system
pm2 restart ecosystem.config.js
pm2 status
pm2 logs
```

#### If using manual processes:
```bash
# Kill existing processes
pkill -f "node.*main.js"
pkill -f "next start"

# Start backend
cd /Users/jw/fyp_system/backend
NODE_ENV=production node dist/src/main.js &

# Start frontend
cd /Users/jw/fyp_system/frontend
npm run start &
```

## Testing

### Test 1: Upload a Valid Claim
1. Login as a sales/marketing user
2. Find an APPROVED purchase request without existing claims
3. Click "Upload Claim"
4. Upload a valid receipt (PDF/JPG/PNG)
5. Fill in the claim details and submit
6. ✅ Claim should be created successfully

### Test 2: Duplicate File Detection
1. Try to upload the SAME receipt file again for a different purchase request
2. ❌ Should be rejected with error: "This receipt file has already been uploaded..."

### Test 3: One Claim Per Purchase Request
1. Find a purchase request that already has a claim
2. ✅ "Upload Claim" button should NOT be visible
3. ✅ Should see "✓ Claim Submitted" badge instead

### Test 4: Malware Scanning
1. Try to upload a suspicious/test malware file (if you have one)
2. ❌ Should be rejected with error: "File failed security scan..."

### Test 5: File Validation
1. Try to upload an invalid file type (.exe, .zip, etc.)
2. ❌ Should be rejected with error: "Invalid file type..."
3. Try to upload a file larger than 10MB
4. ❌ Should be rejected with error: "File size exceeds limit..."

## Code Changes

### Backend Changes:
1. **purchase-request.service.ts**
   - Added `crypto` import for SHA-256 hashing
   - Added `generateFileHash()` method
   - Added `findClaimByFileHash()` method for duplicate detection
   - Updated `createClaim()` to check for:
     - Existing claims on the purchase request
     - Duplicate files by hash
     - Store hash in database

2. **purchase-request.controller.ts**
   - Updated `uploadReceipt()` to pass file buffer to service
   - Added comments explaining security steps

3. **claim.entity.ts**
   - Already has `file_hash` column defined

### Frontend Changes:
1. **app/purchase-requests/page.tsx**
   - Updated `canUploadClaim()` to check if claim already exists
   - Added "✓ Claim Submitted" badge for PRs with claims
   - Error messages display duplicate/security errors clearly

### Database Changes:
1. **add-file-hash-column.sql**
   - Adds `file_hash` column if it doesn't exist
   - Creates index for fast lookups
   - Safe to run multiple times (idempotent)

## Security Benefits

| Feature | Before | After |
|---------|--------|-------|
| Malware Scanning | ❌ None | ✅ ClamAV scanning |
| Duplicate Files | ❌ Allowed | ✅ Blocked by hash |
| Multiple Claims | ❌ Allowed | ✅ One per PR only |
| File Validation | ❌ Basic | ✅ Type + Size + Scan |

## Architecture Diagram

```
User Upload Receipt
       ↓
Frontend Validation (file type, size)
       ↓
Backend: JWT + Role Check
       ↓
Backend: File Validation
       ↓
Backend: ClamAV Malware Scan ← NEW!
       ↓
Backend: Generate SHA-256 Hash ← NEW!
       ↓
Backend: Check for Duplicate Hash ← NEW!
       ↓
Backend: Check One Claim Per PR ← NEW!
       ↓
Save File to Disk
       ↓
Save Claim Record (with hash) to DB
       ↓
Success Response
```

## Monitoring

### Check ClamAV Status:
```bash
# Check if ClamAV daemon is running
ps aux | grep clamd

# Check ClamAV logs
tail -f /var/log/clamav/clamd.log

# Test ClamAV
clamdscan --ping
```

### Check Database:
```sql
-- Check claims with file hashes
SELECT id, vendor_name, file_hash, uploaded_at 
FROM claims 
WHERE file_hash IS NOT NULL 
ORDER BY uploaded_at DESC 
LIMIT 10;

-- Check for duplicate hashes (should be none)
SELECT file_hash, COUNT(*) 
FROM claims 
WHERE file_hash IS NOT NULL 
GROUP BY file_hash 
HAVING COUNT(*) > 1;

-- Check purchase requests with multiple claims (should be none)
SELECT purchase_request_id, COUNT(*) as claim_count
FROM claims
GROUP BY purchase_request_id
HAVING COUNT(*) > 1;
```

### Application Logs:
```bash
# PM2 logs
pm2 logs backend --lines 100
pm2 logs frontend --lines 100

# Or direct logs
tail -f logs/backend-error.log
tail -f logs/backend-out.log
```

## Troubleshooting

### Issue: "ClamAV scan failed"
**Solution:** 
- Check if ClamAV daemon is running: `systemctl status clamav-daemon`
- Restart ClamAV: `sudo systemctl restart clamav-daemon`
- Update virus definitions: `sudo freshclam`

### Issue: "Database migration failed"
**Solution:**
- Verify database connection: `psql fyp_db -p 5433 -U <user> -c "\dt"`
- Run migration manually using pgAdmin or DBeaver
- Check if column already exists: `\d claims` in psql

### Issue: "File hash not being stored"
**Solution:**
- Verify migration was successful: `SELECT file_hash FROM claims LIMIT 1;`
- Check backend logs for errors
- Rebuild backend: `cd backend && npm run build`

### Issue: "Upload button still shows for existing claims"
**Solution:**
- Clear browser cache
- Rebuild frontend: `cd frontend && npm run build`
- Check API response includes claims array

## Rollback Plan

If issues occur, you can rollback:

### 1. Restore Previous Code:
```bash
git log --oneline
git checkout <previous-commit-hash>
npm run build
pm2 restart all
```

### 2. Remove Database Column (optional):
```sql
DROP INDEX IF EXISTS idx_claims_file_hash;
ALTER TABLE claims DROP COLUMN IF EXISTS file_hash;
```

## Success Criteria

✅ All tests pass
✅ ClamAV scanning works
✅ Duplicate files are rejected
✅ Only one claim per PR is allowed
✅ No errors in logs
✅ Frontend UI updates correctly
✅ Performance is acceptable (<2s upload time)

## Next Steps (Future Enhancements)

1. Add virus scan progress indicator in frontend
2. Implement claim status notifications
3. Add file compression for receipts
4. Implement receipt preview before upload
5. Add bulk file upload validation

## Support

For issues or questions:
1. Check application logs first
2. Review this deployment guide
3. Check ARCHITECTURE.md for system overview
4. Review TESTING_NEW_FEATURES.md for detailed test cases

---

**Deployment Date:** December 26, 2025
**Version:** 2.0.0 - File Upload Security Enhancement
**Status:** ✅ Ready for Production
