# 🚀 EC2 Deployment Guide - Claim Upload for PARTIALLY_PAID Requests

## 📝 What's Being Deployed

**Latest Changes**:
- ✅ Backend now allows claim uploads for `PARTIALLY_PAID` requests
- ✅ Users can continue uploading claims even after some have been paid
- ✅ Frontend and backend logic are now consistent
- ✅ All documentation updated

**Git Commits**:
- `53979da` - Fix: Allow claim upload for PARTIALLY_PAID requests
- `72d55f2` - Add quick reference guide

---

## ⚠️ Prerequisites

Before starting, make sure you have:
- [ ] SSH access to your EC2 instance
- [ ] EC2 IP address or hostname
- [ ] SSH key file (`.pem` file)
- [ ] Database already migrated with `PARTIALLY_PAID` status (if not, see Database Migration section below)

---

## 🚀 Quick Deployment (5 Steps)

### Step 1: SSH into EC2
```bash
# Replace with your actual EC2 IP and key file
ssh -i /path/to/your-key.pem ubuntu@YOUR_EC2_IP

# Or if you're using ec2-user:
ssh -i /path/to/your-key.pem ec2-user@YOUR_EC2_IP
```

### Step 2: Navigate to Project Directory
```bash
cd ~/fyp_system
# Or wherever your project is located, e.g.:
# cd /home/ubuntu/fyp_system
```

### Step 3: Pull Latest Changes
```bash
git pull origin main
```

**Expected output**:
```
Updating 9fec3d2..72d55f2
Fast-forward
 backend/src/purchase-requests/purchase-request.service.ts | 6 ++++--
 CLAIM_UPLOAD_PARTIALLY_PAID_FIX.md                       | 245 ++++++++++++++++++
 COMPLETE_IMPLEMENTATION_SUMMARY.md                        | 298 ++++++++++++++++++++++
 QUICK_REFERENCE_CLAIMS.md                                 | 222 ++++++++++++++++
 4 files changed, 769 insertions(+), 2 deletions(-)
```

### Step 4: Rebuild and Restart Services
```bash
# Install dependencies (if needed)
cd backend
npm install

# Build backend
npm run build

# Go back to root
cd ..

# Restart services with PM2
pm2 restart all

# Check status
pm2 status
```

### Step 5: Verify Deployment
```bash
# Check backend logs
pm2 logs backend --lines 20

# Check frontend logs
pm2 logs frontend --lines 20

# Test backend is running
curl http://localhost:3000/health
```

---

## ✅ What Changed (Code Details)

### Backend Change
**File**: `backend/src/purchase-requests/purchase-request.service.ts`

**Before** (Line ~418):
```typescript
// Status check
if (pr.status !== PurchaseRequestStatus.APPROVED) {
  throw new BadRequestException('You can only submit claims for APPROVED purchase requests');
}
```

**After**:
```typescript
// Status check: Allow claim upload for APPROVED and PARTIALLY_PAID requests
// PARTIALLY_PAID means some claims have been paid, but user can still upload more claims
if (pr.status !== PurchaseRequestStatus.APPROVED && 
    pr.status !== PurchaseRequestStatus.PARTIALLY_PAID) {
  throw new BadRequestException(
    'You can only submit claims for APPROVED or PARTIALLY_PAID purchase requests'
  );
}
```

**Impact**: Users can now upload additional claims even when request status is `PARTIALLY_PAID`.

---

## 🗄️ Database Migration (If Not Done Yet)

### Check if Migration is Needed
```bash
# Connect to database
PGPASSWORD=your_password psql -h localhost -p 5432 -U postgres -d fyp_db

# Check if PARTIALLY_PAID status exists
SELECT unnest(enum_range(NULL::purchase_request_status_enum)) AS status;

# Expected output should include: PARTIALLY_PAID
# If not, run migration below
```

### Run Migration (If PARTIALLY_PAID Doesn't Exist)
```bash
# Connect to database
PGPASSWORD=your_password psql -h localhost -p 5432 -U postgres -d fyp_db

# Run migration
\i database-migration-partially-paid.sql

# Or manually paste from the file
```

### Verify Migration
```sql
-- Check enum has PARTIALLY_PAID
SELECT unnest(enum_range(NULL::purchase_request_status_enum)) AS status;

-- Check new columns exist
\d purchase_requests

-- Should see:
-- - total_claimed (DECIMAL)
-- - total_paid (DECIMAL)
-- - total_rejected (DECIMAL)
-- - payment_progress (INTEGER)
```

---

## 🧪 Testing After Deployment

### Test 1: Verify Backend is Running
```bash
curl http://localhost:3000/health
# Expected: {"status":"ok"}
```

### Test 2: Check Purchase Requests Endpoint
```bash
# Get all purchase requests (requires authentication)
curl http://localhost:3000/purchase-requests
```

### Test 3: Test the Feature in Browser
1. Open your application: `http://YOUR_EC2_IP:3000` or `http://YOUR_EC2_IP:3001` (depending on your setup)
2. Login as a user with an approved purchase request
3. Upload a claim (this will create a PARTIALLY_PAID status if verified)
4. Try to upload another claim to the same request
5. ✅ It should work now! (Previously would have been blocked)

### Test 4: Check PM2 Status
```bash
pm2 status

# Should show:
# ┌────┬────────────┬─────────┬─────────┐
# │ id │ name       │ status  │ restart │
# ├────┼────────────┼─────────┼─────────┤
# │ 0  │ backend    │ online  │ 0       │
# │ 1  │ frontend   │ online  │ 0       │
# └────┴────────────┴─────────┴─────────┘
```

---

## 🔍 Troubleshooting

### Issue: "git pull" shows conflicts
```bash
# Stash local changes
git stash

# Pull latest
git pull origin main

# Re-apply local changes (if needed)
git stash pop
```

### Issue: Build fails with TypeScript errors
```bash
# Clear build cache
cd backend
rm -rf dist node_modules
npm install
npm run build
```

### Issue: PM2 services not restarting
```bash
# Stop all services
pm2 stop all

# Delete all services
pm2 delete all

# Restart services manually
cd /home/ubuntu/fyp_system/backend
pm2 start dist/src/main.js --name backend

cd /home/ubuntu/fyp_system/frontend
pm2 start npm --name frontend -- start

# Save PM2 configuration
pm2 save
```

### Issue: Can't upload claims - still getting error
**Check**:
1. Backend actually restarted: `pm2 logs backend --lines 50`
2. Backend build completed: `ls -la backend/dist/`
3. Environment variables loaded: `pm2 env 0` (for backend)
4. Database has PARTIALLY_PAID status: Run database check query above

### Issue: Frontend not connecting to backend
**Check**:
1. Frontend `.env.local` has correct `NEXT_PUBLIC_API_URL`
2. Backend is running: `curl http://localhost:3000/health`
3. CORS is configured correctly in backend
4. Firewall/security groups allow traffic

---

## 📊 Monitoring

### View Real-Time Logs
```bash
# All services
pm2 logs

# Just backend
pm2 logs backend

# Just frontend
pm2 logs frontend

# Last 100 lines
pm2 logs --lines 100

# Only errors
pm2 logs --err
```

### Check Service Memory/CPU
```bash
pm2 monit
```

### View Service Details
```bash
pm2 show backend
pm2 show frontend
```

---

## 🔄 Rollback (If Something Goes Wrong)

### Option 1: Rollback Code
```bash
# See recent commits
git log --oneline -n 5

# Rollback to previous commit (replace with actual commit hash)
git reset --hard 9fec3d2

# Rebuild and restart
cd backend
npm run build
cd ..
pm2 restart all
```

### Option 2: Just Restart Services
```bash
pm2 restart all
```

---

## 📋 Complete Step-by-Step Script

Here's a complete script you can copy-paste into your EC2 terminal:

```bash
#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying latest changes...${NC}"

# Step 1: Navigate to project
cd ~/fyp_system || { echo -e "${RED}Error: Project directory not found${NC}"; exit 1; }

# Step 2: Pull latest code
echo -e "${BLUE}📥 Pulling latest code from GitHub...${NC}"
git pull origin main

# Step 3: Install backend dependencies
echo -e "${BLUE}📦 Installing backend dependencies...${NC}"
cd backend
npm install

# Step 4: Build backend
echo -e "${BLUE}🔨 Building backend...${NC}"
npm run build

# Step 5: Go back to root
cd ..

# Step 6: Restart services
echo -e "${BLUE}🔄 Restarting services...${NC}"
pm2 restart all

# Step 7: Wait for services to start
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 5

# Step 8: Check status
echo -e "${BLUE}📊 Checking service status...${NC}"
pm2 status

# Success
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Check logs: pm2 logs"
echo "2. Test feature: Upload a claim to a PARTIALLY_PAID request"
echo "3. Monitor: pm2 monit"
```

### To use this script:
```bash
# Save it
nano deploy-latest.sh

# Paste the script above, then save (Ctrl+X, Y, Enter)

# Make it executable
chmod +x deploy-latest.sh

# Run it
./deploy-latest.sh
```

---

## 📚 Documentation Reference

Created documentation files (available in project root):
1. `CLAIM_UPLOAD_PARTIALLY_PAID_FIX.md` - Detailed explanation of this fix
2. `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Full feature overview
3. `QUICK_REFERENCE_CLAIMS.md` - Quick reference guide

---

## ✅ Success Checklist

After deployment, verify:
- [ ] Backend service is online (`pm2 status`)
- [ ] Frontend service is online (`pm2 status`)
- [ ] No errors in logs (`pm2 logs --err --lines 50`)
- [ ] Health endpoint responds (`curl http://localhost:3000/health`)
- [ ] Can login to application
- [ ] Can upload claim to APPROVED request
- [ ] Can upload claim to PARTIALLY_PAID request ✅ **NEW**
- [ ] Status badges display correctly
- [ ] Payment progress shows correctly

---

## 🎉 Summary

**What's New**:
✅ Users can upload claims for `PARTIALLY_PAID` requests  
✅ No more "can only submit claims for APPROVED" error  
✅ More flexible workflow for multi-receipt expenses  

**Time to Deploy**: ~5 minutes  
**Difficulty**: Easy ⭐  
**Risk Level**: Low (only backend logic change, no database schema change)  

---

**Last Updated**: January 1, 2026  
**Status**: ✅ Ready for Deployment  
**Estimated Downtime**: < 10 seconds (during PM2 restart)
