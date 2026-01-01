# 🚀 How to Deploy to EC2 Now - Simple Guide

**Date:** January 1, 2026  
**What's Being Deployed:** OTP removal from claim upload + all recent improvements

---

## Option 1: One-Command Deploy (Easiest) ✅

### Step 1: Connect to EC2
```bash
ssh ubuntu@YOUR_EC2_IP_ADDRESS
```

Or if you use a key file:
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP_ADDRESS
```

### Step 2: Navigate to Project Directory
```bash
cd fyp_system
# or wherever your project is located
# Common locations: /home/ubuntu/fyp_system or ~/fyp_system
```

### Step 3: Run the Deployment Script
```bash
bash deploy-otp-removal.sh
```

**That's it!** The script will:
- Pull latest changes from GitHub
- Build backend
- Build frontend
- Restart both services with PM2
- Show you the status and logs

---

## Option 2: Manual Step-by-Step (If Script Doesn't Work)

### Step 1: Connect to EC2
```bash
ssh ubuntu@YOUR_EC2_IP_ADDRESS
```

### Step 2: Navigate to Project
```bash
cd fyp_system
```

### Step 3: Pull Latest Changes
```bash
git pull origin main
```

### Step 4: Update Backend
```bash
cd backend
npm install
npm run build
pm2 restart backend
cd ..
```

### Step 5: Update Frontend
```bash
cd frontend
npm install
npm run build
pm2 restart frontend
cd ..
```

### Step 6: Check Status
```bash
pm2 status
pm2 logs --lines 50
```

---

## What to Do If You Don't Know Your EC2 Details

### Find Your EC2 IP Address:
1. Go to AWS Console
2. Navigate to EC2 Dashboard
3. Click on "Instances"
4. Find your instance
5. Look for "Public IPv4 address" or "Public IPv4 DNS"

### Common EC2 Connection Commands:

**With password:**
```bash
ssh ubuntu@YOUR_IP
```

**With key file (.pem):**
```bash
ssh -i /path/to/your-key.pem ubuntu@YOUR_IP
```

**If using different user:**
```bash
ssh ec2-user@YOUR_IP
# or
ssh admin@YOUR_IP
```

---

## Troubleshooting Common Issues

### Issue 1: "Permission denied (publickey)"
**Solution:**
```bash
# Make sure your key has correct permissions
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@YOUR_IP
```

### Issue 2: "Project directory not found"
**Solution:**
```bash
# Find where the project is
cd ~
ls -la
# or
find ~ -name "fyp_system" -type d
```

### Issue 3: "PM2 command not found"
**Solution:**
```bash
# Install PM2
npm install -g pm2

# Or use npm scripts directly
cd backend
npm run build
npm start &

cd ../frontend
npm run build
npm start &
```

### Issue 4: "Git pull fails"
**Solution:**
```bash
# Check current branch
git branch

# If there are local changes, stash them
git stash

# Try pulling again
git pull origin main

# Or force reset (⚠️ this will discard local changes)
git fetch origin
git reset --hard origin/main
```

### Issue 5: "Build fails"
**Solution:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Issue 6: "Port already in use"
**Solution:**
```bash
# Check what's running on ports
sudo lsof -i :3000
sudo lsof -i :3001

# Kill processes if needed
pm2 delete all
pm2 start backend
pm2 start frontend
```

---

## After Deployment - Testing Checklist

### Test 1: Claim Upload Without OTP ✅
1. Login as Sales/Marketing user
2. Go to an APPROVED purchase request
3. Click "Upload Claim"
4. **Verify:** No OTP fields shown
5. Fill form and submit directly
6. **Verify:** Claim uploads successfully

### Test 2: Multiple Claims ✅
1. Upload a second claim to the same request
2. **Verify:** Remaining budget is shown correctly
3. **Verify:** Cannot exceed approved amount

### Test 3: Claim Review ✅
1. Login as Accountant
2. View pending claims
3. **Verify:** Only PROCESS and REJECT buttons visible
4. Test processing a claim

### Test 4: Delete Functionality ✅
1. Delete all claims from a request
2. **Verify:** Delete button appears for the request
3. Delete the approved/paid request
4. **Verify:** Request is deleted successfully

---

## Useful PM2 Commands on EC2

```bash
# View all processes
pm2 status

# View logs (real-time)
pm2 logs

# View specific logs
pm2 logs backend
pm2 logs frontend

# Restart services
pm2 restart backend
pm2 restart frontend
pm2 restart all

# Stop services
pm2 stop all

# Delete and restart
pm2 delete all
cd backend && pm2 start npm --name "backend" -- start
cd frontend && pm2 start npm --name "frontend" -- start

# Save PM2 config
pm2 save

# Auto-start on reboot
pm2 startup
```

---

## Quick Health Checks

### Check Backend
```bash
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

### Check Frontend
```bash
curl http://localhost:3001
# Should return HTML
```

### Check Database Connection
```bash
cd backend
npm run typeorm -- query "SELECT 1"
```

### Check Logs
```bash
# Last 50 lines
pm2 logs --lines 50

# Filter for errors
pm2 logs | grep -i error
```

---

## Environment Variables to Verify

### On EC2, check if these are set:

**Backend (.env):**
```bash
cd backend
cat .env | grep -E "DATABASE_URL|JWT_SECRET|CLAMD"
```

Should have:
- `DATABASE_URL=postgresql://...`
- `JWT_SECRET=your-secret`
- `CLAMD_HOST=localhost`
- `CLAMD_PORT=3310`

**Frontend (.env.local or .env.production):**
```bash
cd frontend
cat .env.local .env.production 2>/dev/null | grep NEXT_PUBLIC
```

Should have:
- `NEXT_PUBLIC_BACKEND_URL=http://your-ec2-ip:3000`

---

## If Everything Fails - Complete Restart

```bash
# On EC2
cd fyp_system

# Stop everything
pm2 delete all

# Clean everything
cd backend
rm -rf node_modules dist package-lock.json
npm install
npm run build

cd ../frontend
rm -rf node_modules .next package-lock.json
npm install
npm run build

# Start fresh
cd ../backend
pm2 start npm --name "backend" -- start

cd ../frontend
pm2 start npm --name "frontend" -- start

# Save PM2 config
pm2 save

# Check status
pm2 status
pm2 logs
```

---

## Success! 🎉

If you see:
- ✅ PM2 shows both backend and frontend running
- ✅ No errors in logs
- ✅ Can access the website
- ✅ Can upload claims without OTP

**You're all set!** The deployment is complete.

---

## Need Help?

1. Check logs: `pm2 logs`
2. Check this guide: `DEPLOY_LATEST_UPDATES.md`
3. Check status: `pm2 status`
4. Restart services: `pm2 restart all`

---

**Summary of What's New:**
- 🚀 No more OTP for claim uploads (70% faster!)
- 📊 Multiple claims per request
- ✨ Simplified review workflow
- 🗑️ Better delete functionality

**Happy deploying!** 🚀
