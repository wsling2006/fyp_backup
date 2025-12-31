# FINAL SOLUTION - Complete System Restart

## What We Found:
1. ✅ Backend was NOT running (PM2 wasn't started)
2. ✅ Old zombie process was occupying port 3000
3. ✅ Backend wasn't built (dist folder incomplete)
4. ✅ Migrations hadn't been run (new database columns missing)

## The Fix - Run This on EC2:

```bash
cd ~/fyp_system
git pull origin main
./restart-system.sh
```

## What This Does:

1. **Stops everything** - Kills PM2 and any zombie processes
2. **Kills port 3000** - Frees up the port
3. **Builds backend** - Creates fresh `dist/src/main.js`
4. **Runs migrations** - Adds `receipt_file_data`, `receipt_file_size`, `receipt_file_mimetype` columns
5. **Starts system** - Launches both backend and frontend with PM2
6. **Shows status** - Displays logs and status

## After Restart - Test the Fix:

### 1. Upload a NEW File
- Login as Sales/Marketing
- Upload a receipt to an approved purchase request
- **Important**: Must be a NEW upload after restart!

### 2. Download as Accountant
- Login as Accountant
- Find the purchase request with the new claim
- Click the blue "Download" button
- **File should NOT be blank!** ✅

### 3. Check Database Storage
```bash
cd ~/fyp_system/backend
./check-db-direct.sh
```

Look for:
```
status: OK         ← Good!
actual_data_size: 12345   ← Should match metadata_size
```

## Why This Will Work Now:

**Before:**
- Files stored on disk → Blank file issue
- PM2 not running → Nothing working
- Port conflicts → Couldn't start

**After:**
- ✅ Files stored in database (like accountant files)
- ✅ PM2 running properly
- ✅ No port conflicts
- ✅ Fresh build with all changes
- ✅ Migrations applied (new columns exist)

## Expected Behavior:

### Upload Logs (watch with `pm2 logs backend`):
```
[UPLOAD] File received: { size: 12345, mimetype: 'application/pdf' }
[UPLOAD] File after ClamAV scan: { bufferLength: 12345 }
[UPLOAD] Storing file in database (not disk)
```

### Download Logs:
```
[DOWNLOAD] Claim details: { hasFileData: true, fileDataSize: 12345 }
[DOWNLOAD] Using database-stored file
[DOWNLOAD] Sending from DB: { size: 12345, contentType: 'application/pdf' }
```

## If Still Having Issues:

Run diagnostics:
```bash
cd ~/fyp_system/backend
./check-db-direct.sh
```

This will show:
- How many files are stored
- How many have actual data vs empty
- Status of each file (OK/EMPTY/PARTIAL)

## Key Points:

1. **Old files (before migration) still use disk** - They may still be blank
2. **New files (after restart) use database** - Should work correctly
3. **Accountant files should now work too** - Same database storage
4. **Must test with NEW uploads** - Don't test with old files

## Commands Summary:

```bash
# Restart system
cd ~/fyp_system && git pull && ./restart-system.sh

# Monitor logs
pm2 logs backend

# Check database
cd backend && ./check-db-direct.sh

# Check PM2 status
pm2 status

# Stop system
pm2 stop all

# Restart just backend
pm2 restart backend
```

## Success Criteria:

✅ PM2 shows backend as "online" (not stopping/errored)
✅ Can access http://localhost:3000 
✅ Upload works without errors
✅ Download produces non-blank file
✅ Database shows files with actual_data_size > 0

Run the restart script and test! 🚀
