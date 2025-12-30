# 🚀 DEPLOYMENT MASTER GUIDE

## Current Status: Ready to Deploy with EC2 Fixes

**Date:** December 30, 2025  
**Action Required:** Push to GitHub, then fix EC2

---

## 🎯 What You're Deploying

### New Feature:
✅ **Claims Download Feature**
- Accountants can view and download claim receipts
- New endpoint: `GET /purchase-requests/claims/:id/download`
- New UI component: ViewClaimsModal with download button

### Critical Fixes:
✅ **Fixed EC2 PM2 Configuration**
- Fixed ecosystem.config.js (port configuration issue)
- Added automated fix scripts
- Added comprehensive troubleshooting guides

---

## 📋 Quick Action Plan

### 1️⃣ PUSH TO GITHUB (Run on Mac Now)

```bash
cd /Users/jw/fyp_system
./git-push.sh
```

**What this pushes:**
- ✅ Claims download feature (backend + frontend)
- ✅ Fixed ecosystem.config.js (fixes EC2 errors)
- ✅ ec2-fix.sh (automated fix script)
- ✅ Complete documentation

### 2️⃣ FIX AND DEPLOY ON EC2

```bash
# SSH into your EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Run these commands:
cd /home/ubuntu/fyp_system
git pull origin main
./ec2-fix.sh
```

**What this fixes:**
- ❌ ECONNREFUSED error on port 3000
- ❌ Invalid project directory error
- ✅ Proper PM2 configuration
- ✅ Claims download feature deployed

---

## 🔍 Understanding Your EC2 Errors

### Error 1: ECONNREFUSED
```
errno: -111, code: 'ECONNREFUSED', port: 3000
```
**Meaning:** Frontend can't reach backend  
**Fixed by:** Proper PM2 configuration + fix script

### Error 2: Invalid Directory
```
Invalid project directory: /home/ubuntu/fyp_system/frontend/3001
```
**Meaning:** PM2 config had wrong syntax for port  
**Fixed by:** Updated ecosystem.config.js

---

## ✅ What Gets Fixed

### In ecosystem.config.js:

**BEFORE (Broken):**
```javascript
script: 'node_modules/next/dist/bin/next',
args: 'start -p 3001',  // ❌ This caused the error!
```

**AFTER (Fixed):**
```javascript
script: 'node_modules/next/dist/bin/next',
args: 'start',  // ✅ Correct
env_production: {
  PORT: 3001  // ✅ Port set via environment
}
```

---

## 📁 Files Being Deployed

### Backend:
- `backend/src/purchase-requests/purchase-request.controller.ts` *(modified)*

### Frontend:
- `frontend/app/purchase-requests/page.tsx` *(modified)*

### Configuration:
- `ecosystem.config.js` *(FIXED - critical)*

### Scripts (New):
- `ec2-fix.sh` - Automated EC2 fix
- `deploy-ec2.sh` - Standard deployment
- `git-push.sh` - Git helper

### Documentation (New):
- `EC2_FIX_REQUIRED.md` - Your current issues + fixes
- `EC2_TROUBLESHOOTING.md` - Complete troubleshooting
- `AWS_DEPLOYMENT_GUIDE.md` - Deployment guide
- `QUICK_DEPLOYMENT_REFERENCE.md` - Quick reference
- `READY_TO_DEPLOY.md` - Overview
- `DEPLOYMENT_MASTER_GUIDE.md` - This file

---

## 🎬 Step-by-Step Execution

### On Your Mac (Right Now):

```bash
# 1. Navigate to project
cd /Users/jw/fyp_system

# 2. Run push script
./git-push.sh

# It will:
# - Show you what will be committed
# - Ask for confirmation (type 'y')
# - Commit everything
# - Push to GitHub
# - Show you next steps
```

### On Your EC2 (After Pushing):

```bash
# 1. SSH into EC2
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip-address

# 2. Navigate to project
cd /home/ubuntu/fyp_system

# 3. Pull changes
git pull origin main

# 4. Run fix script
./ec2-fix.sh

# The script will:
# - Stop all PM2 processes
# - Check/rebuild if needed
# - Create log directories
# - Start with fixed configuration
# - Show status and logs
# - Verify services are working
```

---

## ✅ Expected Results

### After git-push.sh:
```
✓ Changes committed and pushed to GitHub

Next Steps on AWS EC2:
1. SSH into your EC2 instance
2. Navigate to project directory
3. Pull the latest changes
4. Run the deployment script
```

### After ec2-fix.sh on EC2:
```
✓ Backend built
✓ Frontend built
✓ Services restarted
✓ Backend is responding
✓ Frontend is responding

Services should now be running properly.
```

### PM2 Status Should Show:
```
┌────┬─────────┬─────────┬──────┬────────┬─────────┬──────────┐
│ id │ name    │ mode    │ ↺    │ status │ cpu     │ memory   │
├────┼─────────┼─────────┼──────┼────────┼─────────┼──────────┤
│ 0  │ backend │ fork    │ 0    │ online │ 0%      │ 50.0mb   │
│ 1  │ frontend│ fork    │ 0    │ online │ 0%      │ 80.0mb   │
└────┴─────────┴─────────┴──────┴────────┴─────────┴──────────┘
```
Both **online** ✅

---

## 🧪 Testing After Deployment

### 1. Check Services
```bash
pm2 status  # Both should be online
pm2 logs --lines 20  # Check for errors
```

### 2. Test Endpoints
```bash
curl http://localhost:3000  # Backend
curl http://localhost:3001  # Frontend
```

### 3. Test in Browser
1. Open: `http://your-ec2-ip:3001`
2. Login as accountant
3. Go to Purchase Requests
4. Find request with claims
5. Click "View Claims"
6. Click "Download Receipt"
7. Verify file downloads ✅

---

## 🆘 If Something Goes Wrong

### Check Logs First:
```bash
pm2 logs backend --lines 50
pm2 logs frontend --lines 50
```

### Common Issues:

**Backend not starting?**
```bash
# Check database connection
cd /home/ubuntu/fyp_system/backend
cat .env  # Verify DATABASE_URL
psql $DATABASE_URL -c "SELECT 1;"
```

**Frontend not starting?**
```bash
# Check build
cd /home/ubuntu/fyp_system/frontend
ls -la .next/  # Should exist
npm run build  # Rebuild if needed
```

**Port already in use?**
```bash
sudo lsof -ti:3000 | xargs sudo kill -9
sudo lsof -ti:3001 | xargs sudo kill -9
pm2 restart all
```

### Full Documentation:
- Read `EC2_TROUBLESHOOTING.md` for complete troubleshooting guide
- Read `EC2_FIX_REQUIRED.md` for specific EC2 issues

---

## 📊 Timeline

1. **Now:** Run `./git-push.sh` on Mac
2. **~1 minute:** Changes pushed to GitHub
3. **~2 minutes:** SSH into EC2
4. **~3 minutes:** Run `git pull && ./ec2-fix.sh`
5. **~5 minutes:** Services online, ready to test
6. **~10 minutes:** Test claims download feature

**Total Time:** ~10 minutes ⏱️

---

## 🎉 Success Criteria

✅ Git push successful  
✅ EC2 pull successful  
✅ PM2 shows both services online  
✅ Backend responds on port 3000  
✅ Frontend responds on port 3001  
✅ Can login to application  
✅ Can view claims  
✅ Can download receipts  
✅ Download logged in audit trail  

---

## 📞 Support Documents

| Document | Purpose |
|----------|---------|
| `EC2_FIX_REQUIRED.md` | Your specific EC2 issues + fixes |
| `EC2_TROUBLESHOOTING.md` | Complete troubleshooting guide |
| `AWS_DEPLOYMENT_GUIDE.md` | Full deployment instructions |
| `QUICK_DEPLOYMENT_REFERENCE.md` | Quick command reference |
| `CLAIMS_DOWNLOAD_FEATURE.md` | Feature documentation |
| `DEPLOYMENT_MASTER_GUIDE.md` | This document |

---

## 🚀 Ready to Go!

Everything is prepared. Just run:

**On Mac:**
```bash
./git-push.sh
```

**On EC2:**
```bash
git pull origin main && ./ec2-fix.sh
```

That's it! Your claims download feature will be live and your EC2 errors will be fixed! 🎯

---

**Last Updated:** December 30, 2025  
**Status:** Ready for Deployment  
**Priority:** High (EC2 is currently broken, fixes included)
