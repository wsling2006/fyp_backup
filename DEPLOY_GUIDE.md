# Quick Deployment Guide - File Download Fix

## What Was Fixed

The **blank PDF download issue** was caused by the Next.js API proxy incorrectly converting binary data to ArrayBuffer, which corrupted the file. The backend and database were working perfectly.

**Fix**: Changed the proxy to stream `response.body` directly, preserving binary data integrity.

---

## Deploy to EC2 (Step by Step)

### 1. SSH to Your EC2 Instance

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. Pull the Latest Changes

```bash
cd ~/fyp_system
git pull origin main
```

You should see:
```
Updating f77b560..9698785
Fast-forward
 frontend/app/api/[...path]/route.ts | 31 ++++++++++++++++++++++++-------
 ...
```

### 3. Rebuild the Frontend

```bash
cd ~/fyp_system/frontend
npm run build
```

Wait for the build to complete (may take 1-2 minutes).

### 4. Restart Frontend with PM2

```bash
pm2 restart frontend
```

### 5. Check Logs (Optional)

```bash
pm2 logs frontend --lines 50
```

Look for:
```
[API Proxy] Using backend URL: http://localhost:3000
```

### 6. Test the Fix

```bash
cd ~/fyp_system
bash test-proxy-fix.sh
```

**Expected Output:**
```
=== Testing Frontend File Download After Proxy Fix ===

Step 1: Login to get JWT token
✅ Got JWT token: eyJhbGciOiJIUzI1NiIs...

Step 2: List accountant files
Found file: ID=xxx-xxx-xxx, filename=test.pdf

Step 3: Download file via Next.js proxy
HTTP status code: 200
Downloaded file size: 123456 bytes

✅ Downloaded file is a valid PDF

=== Test Summary ===
✅ Login: SUCCESS
✅ List files: SUCCESS
✅ Download HTTP: 200
✅ File size: 123456 bytes
```

### 7. Test in Browser

1. Open your browser: `http://your-ec2-ip:3001`
2. Login as Super Admin:
   - Email: `admin@example.com`
   - Password: `Admin123!`
3. Navigate to the "Accountant Files" section
4. Click "Download" on any file
5. **Result**: PDF should download and open correctly (not blank!)

---

## Troubleshooting

### If Frontend Won't Restart

```bash
# Check PM2 status
pm2 status

# If frontend is errored, check logs
pm2 logs frontend --lines 100

# Try stopping and starting
pm2 stop frontend
pm2 start frontend

# Or restart all services
pm2 restart all
```

### If Download Still Fails

```bash
# Check backend is running
curl http://localhost:3000/health

# Check frontend is running
curl http://localhost:3001

# Check PM2 processes
pm2 list

# View detailed logs
pm2 logs --lines 200
```

### If Test Script Fails

```bash
# Make sure the script is executable
chmod +x test-proxy-fix.sh

# Run with bash explicitly
bash test-proxy-fix.sh

# Check if there are accountant files in the database
cd ~/fyp_system/backend
npm run typeorm query "SELECT id, filename, LENGTH(data) as size FROM accountant_files LIMIT 5"
```

---

## What's Next

✅ **FIXED**: Accountant file download through frontend  
⬜ **TODO**: Fix claims file upload (separate issue - files not saving to database)

The claims file upload is a different issue in the backend purchase request service. We'll debug that separately once you confirm the download fix works.

---

## Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Backend API | ✅ Working | Confirmed with direct tests |
| Database Storage | ✅ Working | BYTEA columns have valid data |
| Next.js Proxy | ✅ **FIXED** | Now streams binary data correctly |
| Browser Download | 🧪 **TEST** | Test after deploying |
| Claims Upload | ❌ **TODO** | Files not saving to database |

---

## Quick Commands Reference

```bash
# Deploy
cd ~/fyp_system && git pull && cd frontend && npm run build && pm2 restart frontend

# Test
cd ~/fyp_system && bash test-proxy-fix.sh

# Logs
pm2 logs frontend --lines 50

# Status
pm2 status

# Restart all
pm2 restart all
```
