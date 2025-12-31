# Quick Deployment Guide - You're Already on EC2!

Since you're already on the EC2 server, use the LOCAL deployment script:

## Run These Commands on EC2:

```bash
cd ~/fyp_system
git pull origin main
./deploy-database-fix-local.sh
```

## Or Run Manually Step-by-Step:

```bash
# 1. Pull latest code
cd ~/fyp_system
git pull origin main

# 2. Run database migration (adds new columns)
cd backend
npm run migration:run

# 3. Install dependencies
npm install

# 4. Rebuild backend
npm run build

# 5. Restart service
pm2 restart fyp-backend

# 6. Check status
pm2 status

# 7. Monitor logs
pm2 logs fyp-backend
```

## What This Does:

1. **Adds 3 new columns** to the `claims` table:
   - `receipt_file_data` (BYTEA) - stores the actual file
   - `receipt_file_size` (BIGINT) - file size
   - `receipt_file_mimetype` (VARCHAR) - content type

2. **Changes upload logic** to store files in database instead of disk

3. **Changes download logic** to read from database (same as accountant files)

## After Deployment - Test It:

1. **Upload a NEW receipt** (must be new upload):
   - Login as Sales/Marketing
   - Upload a receipt to an approved purchase request

2. **Download the receipt**:
   - Login as Accountant
   - Click the blue download button
   - File should NOT be blank! ✅

3. **Check logs** while testing:
   ```bash
   pm2 logs fyp-backend
   ```
   
   Look for:
   - `[UPLOAD] Storing file in database (not disk)`
   - `[DOWNLOAD] Using database-stored file`

## Why This Works:

Your accountant files feature works perfectly because it stores files in the database.

Now claim receipts will use the EXACT SAME storage method → Same result!

## Need Help?

If migration fails or something goes wrong, let me know and I'll help troubleshoot.
