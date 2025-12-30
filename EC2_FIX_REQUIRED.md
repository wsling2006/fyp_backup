# 🚨 EC2 Issues Fixed - Action Required

## Date: December 30, 2025

---

## 🔍 Issues Identified on Your EC2

Based on your error logs, two critical issues were found:

### 1. ❌ ECONNREFUSED (Backend not accessible)
```
errno: -111,
code: 'ECONNREFUSED',
port: 3000
```
**Problem:** Frontend can't connect to backend on port 3000.

### 2. ❌ Invalid Project Directory
```
⨯ Invalid project directory provided: /home/ubuntu/fyp_system/frontend/3001
```
**Problem:** PM2 configuration error treating port number as directory.

---

## ✅ Fixes Applied

### 1. Fixed `ecosystem.config.js`
Changed frontend configuration from:
```javascript
args: 'start -p 3001'  // ❌ WRONG
```

To:
```javascript
args: 'start'
env_production: {
  PORT: 3001  // ✅ CORRECT
}
```

### 2. Created Fix Scripts
- **`ec2-fix.sh`** - Automated fix script for EC2
- **`EC2_TROUBLESHOOTING.md`** - Complete troubleshooting guide

---

## 🚀 How to Fix Your EC2 (Choose One)

### Option A: Quick Fix with Script (RECOMMENDED) ⭐

```bash
# On your EC2 instance:
cd /home/ubuntu/fyp_system
git pull origin main
./ec2-fix.sh
```

This script will:
- Stop all PM2 processes
- Check and rebuild if needed
- Create log directories
- Start services with fixed configuration
- Verify everything is working

### Option B: Manual Fix

```bash
# On your EC2 instance:
cd /home/ubuntu/fyp_system

# 1. Stop PM2
pm2 stop all
pm2 delete all

# 2. Pull fixes
git pull origin main

# 3. Rebuild (if needed)
cd backend && npm run build
cd ../frontend && npm run build

# 4. Start with fixed config
cd /home/ubuntu/fyp_system
pm2 start ecosystem.config.js --env production --update-env

# 5. Check status
pm2 status
pm2 logs --lines 20
```

---

## 📋 What to Do Right Now

### Step 1: Push to GitHub (Run on Mac)

```bash
cd /Users/jw/fyp_system
./git-push.sh
```

This will push:
- Fixed `ecosystem.config.js`
- New fix scripts
- Updated documentation
- Claims download feature

### Step 2: Fix EC2 (Run on EC2)

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd /home/ubuntu/fyp_system

# Pull and fix
git pull origin main
./ec2-fix.sh
```

---

## ✅ Verification

After running the fix script, you should see:

```bash
pm2 status
```

Should show:
```
┌────┬────────┬─────────┬──────┬────────┬──────────┬──────────┐
│ id │ name   │ mode    │ ↺    │ status │ cpu      │ memory   │
├────┼────────┼─────────┼──────┼────────┼──────────┼──────────┤
│ 0  │backend │ fork    │ 0    │ online │ 0%       │ 50.0mb   │
│ 1  │frontend│ fork    │ 0    │ online │ 0%       │ 80.0mb   │
└────┴────────┴─────────┴──────┴────────┴──────────┴──────────┘
```

Both should be **online** ✅

Test in browser:
- `http://your-ec2-ip:3001` - Should show login page
- Claims download should work

---

## 🔧 If Still Having Issues

### Backend Not Starting?

Check database connection:
```bash
cd /home/ubuntu/fyp_system/backend
cat .env
# Verify DATABASE_URL is correct

# Test database
psql $DATABASE_URL -c "SELECT 1;"
```

### Frontend Not Starting?

Check build:
```bash
cd /home/ubuntu/fyp_system/frontend
ls -la .next/
# Should exist

# Rebuild if missing
npm run build
```

### Check Detailed Logs:

```bash
pm2 logs backend --lines 100
pm2 logs frontend --lines 100
```

---

## 📚 Documentation Available

1. **EC2_TROUBLESHOOTING.md** - Comprehensive troubleshooting guide
2. **AWS_DEPLOYMENT_GUIDE.md** - Full deployment guide
3. **QUICK_DEPLOYMENT_REFERENCE.md** - Quick commands

---

## 🎯 Summary

**Problem:** PM2 configuration error + backend connection issues  
**Solution:** Fixed ecosystem.config.js + automated fix script  
**Action:** Run `./git-push.sh` then `./ec2-fix.sh` on EC2  

**Expected Result:** Both services online, claims download working ✅

---

## 📞 Next Steps

1. **Now (Mac):** Run `./git-push.sh`
2. **Then (EC2):** Run `git pull && ./ec2-fix.sh`
3. **Test:** Open browser, verify app works
4. **Celebrate:** Claims download feature is live! 🎉

---

**Files Changed:**
- ✅ `ecosystem.config.js` (FIXED)
- ✅ Added `ec2-fix.sh` (NEW FIX SCRIPT)
- ✅ Added `EC2_TROUBLESHOOTING.md` (TROUBLESHOOTING GUIDE)
- ✅ Updated `git-push.sh`

Ready to deploy! 🚀
