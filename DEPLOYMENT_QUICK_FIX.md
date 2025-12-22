# 🚀 Quick Deployment Fix - EC2 Commands

## Issue Summary
- ✅ ClamAV already installed
- ❌ freshclam lock error (harmless - just means it's already running)
- ❌ Missing migration scripts in package.json → **FIXED**

---

## ✅ Quick Fix - Run These Commands on EC2

### Option 1: Automated Script (Recommended)
```bash
cd ~/fyp_system
git pull origin main
chmod +x deploy-purchase-requests.sh
./deploy-purchase-requests.sh
```

### Option 2: Manual Steps
```bash
cd ~/fyp_system
git pull origin main

# Fix ClamAV (ignore freshclam lock error if shown)
sudo systemctl stop clamav-freshclam
sleep 2
sudo freshclam || echo "Already up to date"
sudo systemctl start clamav-freshclam
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon

# Verify ClamAV is running
sudo systemctl status clamav-daemon

# Run migration
cd backend
npm run migration:run

# Restart backend
pm2 restart backend

# Verify everything is working
pm2 logs backend --lines 50
```

---

## 🔍 Verification Checklist

### 1. Check ClamAV Status
```bash
sudo systemctl status clamav-daemon
# Expected: "active (running)"
```

### 2. Check Backend Logs
```bash
pm2 logs backend --lines 50
# Look for: No errors related to ClamAV or database
```

### 3. Check Database Migration
```bash
cd ~/fyp_system/backend
npm run migration:show
# Should show the migration has been executed
```

### 4. Test File Upload (via Frontend)
- Upload a clean PDF or JPG file through the purchase request claim upload
- Check backend logs for:
  ```
  Scanning file with ClamAV: upload_...
  File is clean: upload_...
  ```

---

## 🐛 Troubleshooting

### ClamAV freshclam Lock Error
This error is **harmless** if you see it:
```
ERROR: Failed to lock the log file /var/log/clamav/freshclam.log
```

**Why?** The freshclam service is already running and updating virus definitions.

**Fix:** Stop it first, then run freshclam manually:
```bash
sudo systemctl stop clamav-freshclam
sudo freshclam
sudo systemctl start clamav-freshclam
```

### ClamAV Daemon Not Starting
```bash
# Check logs
sudo journalctl -u clamav-daemon -n 50

# Common fix: Database needs updating
sudo systemctl stop clamav-daemon
sudo freshclam
sudo systemctl start clamav-daemon
```

### Migration Already Executed Error
If you see: "Migration has already been executed"
```bash
# This is GOOD - it means the migration was already run
# No action needed
```

### Migration Fails
```bash
# Check if tables already exist
psql -d your_database_name -c "\dt" | grep purchase

# If tables exist, you can skip migration or revert and re-run
npm run migration:revert  # Only if you want to undo
npm run migration:run     # Run again
```

---

## 📊 Expected Logs After Deployment

### Backend Logs (pm2 logs backend)
```
✓ Database connected
✓ Server running on port 3000
✓ TypeORM initialized
```

### ClamAV Logs (sudo tail /var/log/clamav/clamav.log)
```
Daemon started
SelfCheck: Database status OK
```

### On First File Upload
```
[Backend] Scanning file with ClamAV: upload_123456...
[Backend] File is clean: upload_123456...
[Backend] Claim created successfully
```

---

## 🎯 What Changed

### Backend package.json
Added migration scripts:
```json
"migration:run": "ts-node-dev ./node_modules/typeorm/cli.js migration:run -d src/data-source.ts",
"migration:revert": "ts-node-dev ./node_modules/typeorm/cli.js migration:revert -d src/data-source.ts",
"migration:show": "ts-node-dev ./node_modules/typeorm/cli.js migration:show -d src/data-source.ts"
```

### Deployment Script
Created `deploy-purchase-requests.sh` for automated deployment:
- Fixes ClamAV freshclam lock
- Runs database migration
- Restarts backend service
- Verifies everything is working

---

## 🔒 Security Verification

### Test ClamAV is Working
```bash
# 1. Download EICAR test virus (safe test file)
cd /tmp
curl https://secure.eicar.org/eicar.com.txt -o eicar.txt

# 2. Test with clamdscan
clamdscan eicar.txt
# Expected: "eicar.txt: Eicar-Test-Signature FOUND"

# 3. Upload via frontend
# Expected: Backend rejects with "File failed security scan"
```

### Monitor File Uploads
```bash
# Watch backend logs in real-time
pm2 logs backend --lines 0

# In another terminal, upload a file via frontend
# You should see:
# - "Scanning file with ClamAV: ..."
# - "File is clean: ..." (for legitimate files)
# OR
# - "Malware detected in file: ..." (for infected files)
```

---

## ✅ Success Indicators

You'll know everything is working when:
1. ✅ `sudo systemctl status clamav-daemon` shows "active (running)"
2. ✅ `pm2 list` shows backend is "online"
3. ✅ `npm run migration:show` shows migration executed
4. ✅ File upload via frontend succeeds
5. ✅ Backend logs show "Scanning file with ClamAV" and "File is clean"
6. ✅ Uploaded files appear in `~/fyp_system/backend/uploads/receipts/`

---

## 📝 Next Steps After Deployment

1. **Test the complete workflow:**
   - Create purchase request → Get OTP → Submit
   - Accountant approves → Get OTP → Approve
   - Upload claim with file → Get OTP → Submit (ClamAV scans here)
   - Accountant verifies claim → Get OTP → Process

2. **Monitor for 24 hours:**
   ```bash
   pm2 logs backend
   sudo tail -f /var/log/clamav/clamav.log
   ```

3. **Check virus definition updates:**
   ```bash
   sudo systemctl status clamav-freshclam
   # Should run daily to update signatures
   ```

---

## 🆘 Still Having Issues?

### Check All Services
```bash
pm2 status
sudo systemctl status clamav-daemon
sudo systemctl status postgresql
sudo systemctl status nginx
```

### Review All Logs
```bash
# Backend
pm2 logs backend --lines 100

# ClamAV
sudo tail -100 /var/log/clamav/clamav.log

# PostgreSQL
sudo tail -100 /var/log/postgresql/postgresql-*.log

# System
sudo journalctl -xe
```

### Database Connection
```bash
# Test database connection
cd ~/fyp_system/backend
node -e "const { DataSource } = require('typeorm'); const config = require('./dist/data-source').AppDataSource; config.initialize().then(() => { console.log('✓ Database connected'); process.exit(0); }).catch(err => { console.error('✗ Database error:', err); process.exit(1); });"
```

---

**Created:** December 22, 2025  
**Status:** Ready to deploy - run commands above on EC2
