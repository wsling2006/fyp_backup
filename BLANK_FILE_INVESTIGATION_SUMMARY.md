# Blank File Download Issue - Investigation Summary

## Current Status
The download feature for claim receipts is implemented and working, BUT the downloaded files are blank/empty even though files appear to be uploaded successfully.

## What I've Added

### 1. Enhanced Logging (✅ COMMITTED & PUSHED)
Added detailed console.log statements to track the file through its entire lifecycle:

**Upload Process Logging:**
- File details when received (size, mimetype, first 20 bytes)
- Buffer integrity after ClamAV scan
- Write operation details
- Verification after write (comparing sizes and content)

**Download Process Logging:**
- Claim details
- File existence and size on disk
- Buffer after reading from disk
- Response headers and content type

**Location:** `backend/src/purchase-requests/purchase-request.controller.ts`

### 2. Investigation Guide (✅ COMMITTED & PUSHED)
Created `INVESTIGATE_BLANK_FILES.md` with:
- Possible causes (5 main theories)
- Step-by-step investigation process
- Expected findings for different scenarios
- Quick fixes to try
- Next steps

### 3. Deployment Script (✅ COMMITTED & PUSHED)
Created `deploy-diagnosis.sh` to:
- Deploy the enhanced logging to EC2
- Rebuild and restart backend
- Show instructions for testing
- Monitor logs in real-time

### 4. File Checker Scripts (✅ COMMITTED & PUSHED)
- `check-latest-upload.sh` - Analyzes the most recent uploaded file
  - Shows file size, type, hex dump
  - Checks file signatures (PDF, JPEG, PNG, EICAR)
  - Verifies against database record
  
- `check-upload-flow.sh` - Creates diagnostic script for EC2
  - Lists all files in upload directory
  - Shows hex dump of recent files
  - Queries database for claim records

## Root Cause Theories

### Theory 1: Buffer Corruption During ClamAV Scan ⚠️
**Evidence:**
- ClamAV writes file to /tmp, scans it, then deletes it
- File buffer is passed to ClamAV, then used again for disk write
- Some old files were EICAR test files (68 bytes)

**How to Verify:**
- Check logs for buffer size changes
- Compare "before scan" and "after scan" hex dumps
- If they differ, buffer is being modified

**Fix:**
- Create buffer copy before ClamAV scan
- Or disable ClamAV temporarily to test

### Theory 2: File Write Failure 🔍
**Evidence:**
- Need to verify actual file content on disk

**How to Verify:**
- Run `check-latest-upload.sh` after upload
- Check file size and hex dump
- If size is 0 or all zeros, write failed

**Fix:**
- Check disk space
- Check file permissions
- Use sync write operations

### Theory 3: ClamAV Quarantine 🦠
**Evidence:**
- EICAR test files found in uploads
- Some files exactly 68 bytes (EICAR size)

**How to Verify:**
- Check ClamAV logs: `sudo tail -50 /var/log/clamav/clamd.log`
- Check quarantine dir: `sudo find /var/lib/clamav -name "*quarantine*"`
- Check if ClamAV is replacing infected files

**Fix:**
- Configure ClamAV to not quarantine
- Or ensure we're using clean test files

### Theory 4: File Path Issue 📁
**Evidence:**
- Files might be saved to wrong location
- Database might have wrong path

**How to Verify:**
- Check database `receipt_file_path` field
- Verify file exists at that exact path
- Check if multiple files with same name

**Fix:**
- Ensure path is absolute and consistent
- Verify upload directory exists

### Theory 5: Frontend Blob Handling ❌ (Less Likely Now)
**Evidence:**
- Backend sends correct Content-Type
- Frontend uses authenticated API client

**How to Verify:**
- Check browser network tab
- Verify response size matches file size
- Check if blob is actually empty

**Fix:**
- Already fixed in previous iteration
- But can verify with browser dev tools

## Action Plan

### Step 1: Deploy Enhanced Logging ⏭️ NEXT
```bash
./deploy-diagnosis.sh
```
This will:
1. Pull latest code on EC2
2. Rebuild backend
3. Restart service
4. Show live logs

### Step 2: Upload Test File
1. Use a **simple, clean PDF** (not EICAR test file!)
2. Make it small (< 1MB) for easy debugging
3. Upload via the frontend as Sales/Marketing user
4. Watch the logs for `[UPLOAD]` messages

### Step 3: Check File on Disk
```bash
./check-latest-upload.sh
```
This will show:
- File size and type
- Hex dump to verify content
- File signature (PDF, JPEG, etc.)
- Database record

### Step 4: Try Download
1. Login as Accountant
2. Click download button
3. Watch logs for `[DOWNLOAD]` messages
4. Check if downloaded file is blank

### Step 5: Analyze Results

**If upload shows valid bytes but download shows zeros:**
→ File read/send issue

**If upload shows zeros from the start:**
→ Buffer corruption or write issue

**If file size is 0 or 68 bytes:**
→ ClamAV or test file issue

**If file not found during download:**
→ Path or storage issue

## Files Modified
- ✅ `backend/src/purchase-requests/purchase-request.controller.ts` - Added logging
- ✅ `INVESTIGATE_BLANK_FILES.md` - Investigation guide
- ✅ `deploy-diagnosis.sh` - Deployment script
- ✅ `check-latest-upload.sh` - File checker
- ✅ `check-upload-flow.sh` - Diagnostic script generator

## Git Status
- ✅ All changes committed
- ✅ Pushed to GitHub main branch
- ✅ Ready for EC2 deployment

## Next Step for User
**RUN THIS COMMAND:**
```bash
./deploy-diagnosis.sh
```

Then follow the on-screen instructions to:
1. Upload a test file
2. Monitor the logs
3. Check the file on disk
4. Try downloading
5. Report what you see in the logs

Based on the log output, we'll be able to pinpoint exactly where the file becomes blank/corrupted.
