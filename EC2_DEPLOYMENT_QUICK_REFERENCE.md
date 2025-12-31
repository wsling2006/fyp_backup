# 🚀 EC2 DEPLOYMENT GUIDE - Quick Reference

## ✅ ALL CHANGES ARE NOW IN GITHUB

The following has been pushed to your GitHub repository:
- ✅ Secure accountant download feature (complete implementation)
- ✅ Database migration for malware_scan_status
- ✅ Build error fixes
- ✅ Deployment scripts
- ✅ Complete documentation

---

## 📋 DEPLOY TO EC2 NOW

### Step 1: SSH to Your EC2 Instance

```bash
ssh -i /path/to/your-key.pem ubuntu@<your-ec2-public-ip>
```

Replace:
- `/path/to/your-key.pem` with your actual PEM key file path
- `<your-ec2-public-ip>` with your EC2 instance public IP

---

### Step 2: Navigate to Project Directory

```bash
cd /home/ubuntu/fyp_system
# Or wherever your project is located
```

---

### Step 3: Pull Latest Code

```bash
git pull origin main
```

You should see:
- Updates to backend files
- New accountant module
- Migration files
- Deployment scripts

---

### Step 4: Run Automated Deployment

```bash
chmod +x ec2-pull-and-deploy.sh
./ec2-pull-and-deploy.sh
```

This script will:
1. ✅ Pull latest code
2. ✅ Run database migration (add malware_scan_status column)
3. ✅ Install dependencies
4. ✅ Build backend
5. ✅ Build frontend
6. ✅ Restart PM2 services
7. ✅ Show status and logs

---

## 🧪 TEST THE FEATURE

### Test 1: Verify Backend is Running

```bash
curl http://localhost:3000/purchase-requests/claims
```

Expected: Should return claims list (or 401 if not authenticated)

---

### Test 2: Check Database Column

```bash
PGPASSWORD=leejw1354 psql -h localhost -p 5433 -U postgres -d fyp_db

# Inside psql:
\d claims

# Should see malware_scan_status column
SELECT id, status, malware_scan_status FROM claims LIMIT 5;

# All existing claims should have status 'CLEAN'
\q
```

---

### Test 3: Test Secure Endpoint (Need JWT Token)

**Step 3a: Login as Accountant**

```bash
# POST to login endpoint
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "accountant@example.com",
    "password": "your-password"
  }'

# If MFA enabled, verify OTP:
curl -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "email": "accountant@example.com",
    "otp": "123456"
  }'

# Copy the JWT token from response
```

**Step 3b: Download Receipt**

```bash
# Replace <TOKEN> with your JWT token
# Replace <CLAIM-ID> with actual claim UUID

curl -H "Authorization: Bearer <TOKEN>" \
     http://localhost:3000/api/accountant/claims/<CLAIM-ID>/receipt \
     --output test-download.pdf

# Check if file downloaded
ls -lh test-download.pdf

# Try to open it
file test-download.pdf
```

---

### Test 4: Check Audit Logs

```bash
PGPASSWORD=leejw1354 psql -h localhost -p 5433 -U postgres -d fyp_db

# Inside psql:
SELECT * FROM audit_logs 
WHERE action LIKE '%ACCOUNTANT%' 
ORDER BY created_at DESC 
LIMIT 10;

# Should see ACCOUNTANT_DOWNLOADED_RECEIPT entries
\q
```

---

## 🔍 TROUBLESHOOTING

### Backend Won't Start

```bash
# Check logs
pm2 logs backend --lines 100

# Check for TypeScript errors
cd /home/ubuntu/fyp_system/backend
npm run build

# If errors, check:
# - All dependencies installed: npm install
# - Database connection working
# - Environment variables set
```

---

### Database Migration Failed

```bash
# Check if column exists
PGPASSWORD=leejw1354 psql -h localhost -p 5433 -U postgres -d fyp_db
\d claims

# If column doesn't exist, run manually:
ALTER TABLE claims 
ADD COLUMN malware_scan_status VARCHAR(20) DEFAULT 'CLEAN';

UPDATE claims 
SET malware_scan_status = 'CLEAN' 
WHERE malware_scan_status IS NULL;

\q
```

---

### 403 Forbidden on Download

**Possible Causes:**

1. **Not logged in as accountant**
   - Check token is valid
   - Check user has ACCOUNTANT role

2. **MFA not verified**
   - The guard checks `user.mfaVerified`
   - Make sure you logged in with OTP

3. **Claim state not allowed**
   - Only VERIFIED, PROCESSED, REJECTED states allowed
   - Check: `SELECT status FROM claims WHERE id = '<claim-id>';`

4. **Malware scan status not CLEAN**
   - Check: `SELECT malware_scan_status FROM claims WHERE id = '<claim-id>';`

---

### 404 Not Found

**Possible Causes:**

1. **Claim doesn't exist**
   - Check: `SELECT * FROM claims WHERE id = '<claim-id>';`

2. **File doesn't exist on disk**
   - Check: `SELECT receipt_file_path FROM claims WHERE id = '<claim-id>';`
   - Verify file: `ls -la /home/ubuntu/fyp_system/backend/uploads/receipts/`

3. **Wrong endpoint URL**
   - Correct: `/api/accountant/claims/{id}/receipt`
   - NOT: `/purchase-requests/claims/{id}/download`

---

### PM2 Services Not Running

```bash
# Check PM2 status
pm2 status

# If stopped, restart
pm2 restart all

# If not found, start them
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save
```

---

## 📊 VERIFY DEPLOYMENT SUCCESS

After deployment, verify:

- [ ] Backend running: `pm2 status` shows "online"
- [ ] Frontend running: `pm2 status` shows "online"
- [ ] Database column exists: `\d claims` shows malware_scan_status
- [ ] No errors in logs: `pm2 logs --lines 50`
- [ ] Build successful: `npm run build` completes without errors
- [ ] Endpoint accessible: curl returns 401 (not 404)

---

## 🎯 EXPECTED RESULTS

### Success Scenario:
1. ✅ Accountant logs in with MFA
2. ✅ Gets JWT token
3. ✅ Calls `/api/accountant/claims/{id}/receipt`
4. ✅ File downloads successfully
5. ✅ Audit log entry created
6. ✅ File opens correctly (PDF/image)

### Error Scenarios:
| Error | Cause | Fix |
|-------|-------|-----|
| 401 | No JWT token | Login first |
| 403 | Not accountant | Check user role |
| 403 | No MFA | Login with OTP |
| 403 | Invalid state | Check claim status |
| 403 | Malware scan | Check scan status |
| 404 | Claim not found | Check claim ID |
| 404 | File not found | Check file path |

---

## 📞 NEED HELP?

### Documentation Files in Your Repo:
- **SECURE_ACCOUNTANT_DOWNLOAD_IMPLEMENTATION.md** - Complete technical docs
- **FINAL_IMPLEMENTATION_SUMMARY.md** - Executive summary
- **EC2_DEPLOYMENT_QUICK_REFERENCE.md** - This file
- **ec2-pull-and-deploy.sh** - Automated deployment

### Quick Commands:
```bash
# View all logs
pm2 logs --lines 100

# Restart everything
pm2 restart all

# Check PM2 status
pm2 status

# Check database
PGPASSWORD=leejw1354 psql -h localhost -p 5433 -U postgres -d fyp_db

# Rebuild backend
cd /home/ubuntu/fyp_system/backend
npm run build

# Rebuild frontend
cd /home/ubuntu/fyp_system/frontend
npm run build
```

---

## ✅ SUMMARY

**Status**: All changes pushed to GitHub ✅

**To Deploy**:
1. SSH to EC2
2. `cd /home/ubuntu/fyp_system`
3. `git pull origin main`
4. `./ec2-pull-and-deploy.sh`
5. Test the feature

**Expected Time**: 5-10 minutes

**Risk Level**: LOW (additive changes only)

---

**Ready to deploy!** 🚀
