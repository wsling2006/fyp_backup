# 🚀 Deploy All Latest Fixes to EC2

## Summary of Changes to Deploy

1. ✅ **Upload Claim for PARTIALLY_PAID** - Users can upload claims to partially paid requests
2. ✅ **Delete PAID Requests** - Delete button now works for PAID requests
3. ✅ **Delete PROCESSED Claims** - Can delete claims in any status
4. ✅ **Updated Warning Messages** - Shows "will be deleted automatically" instead of "delete claims first"

---

## Quick Deployment (5 Minutes)

### Step 1: Verify Local Changes Are Committed
```bash
# On your local machine
cd /Users/jw/fyp_system
git status
```

**Expected**: Should show "working tree clean" (all changes already committed)

### Step 2: Verify Changes Are Pushed
```bash
# Check if local is ahead of remote
git status
```

**Expected**: Should show "Your branch is up to date with 'origin/main'"

All changes are already committed and pushed! ✅

### Step 3: SSH to EC2
```bash
ssh -i your-key.pem ubuntu@13.214.167.194

# Or if using different user:
ssh -i your-key.pem ec2-user@13.214.167.194
```

### Step 4: Pull Latest Changes on EC2
```bash
# Navigate to project
cd ~/fyp_system
# Or: cd /home/ubuntu/fyp_system

# Check current status
git status

# Pull latest changes
git pull origin main
```

**Expected Output**:
```
Updating ...
Fast-forward
 frontend/app/purchase-requests/page.tsx | XX insertions(+), XX deletions(-)
 FIX_UPLOAD_BUTTON_PARTIALLY_PAID.md     | created
 FIX_DELETE_PAID_REQUEST_BUTTON.md       | created
 FIX_DELETE_PROCESSED_CLAIMS.md          | created
 ...
```

### Step 5: Rebuild Frontend on EC2
```bash
# Make sure you're in the project root
cd ~/fyp_system/frontend

# Install any new dependencies (if needed)
npm install

# Build frontend
npm run build
```

**This will take 1-2 minutes.**

### Step 6: Restart Frontend Service
```bash
# Restart using PM2
pm2 restart frontend

# Check status
pm2 status

# View logs to ensure no errors
pm2 logs frontend --lines 20
```

### Step 7: Verify Deployment
```bash
# Check if frontend is running
pm2 status

# View real-time logs
pm2 logs frontend
```

**Expected**: No errors, service running.

### Step 8: Test in Browser
1. Open: `http://13.214.167.194:3001/purchase-requests`
2. **Hard refresh**: `Cmd + Shift + R` (or `Ctrl + Shift + R`)
3. Login as accountant
4. Test the new features!

---

## Complete Deployment Script (Copy-Paste)

Here's a complete script you can run on EC2:

```bash
#!/bin/bash

echo "🚀 Deploying Latest Changes to EC2"
echo ""

# Navigate to project
cd ~/fyp_system || cd /home/ubuntu/fyp_system

# Show current status
echo "📍 Current directory:"
pwd

# Pull latest changes
echo ""
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Check if pull was successful
if [ $? -ne 0 ]; then
    echo "❌ Git pull failed. Check for conflicts."
    exit 1
fi

# Build frontend
echo ""
echo "🔨 Building frontend..."
cd frontend
npm install
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed. Check errors above."
    exit 1
fi

# Go back to root
cd ..

# Restart services
echo ""
echo "🔄 Restarting frontend service..."
pm2 restart frontend

# Wait a moment
sleep 3

# Show status
echo ""
echo "📊 Service Status:"
pm2 status

# Show recent logs
echo ""
echo "📋 Recent Logs:"
pm2 logs frontend --lines 15 --nostream

echo ""
echo "✅ Deployment Complete!"
echo ""
echo "🧪 Test in browser:"
echo "   1. Open: http://13.214.167.194:3001/purchase-requests"
echo "   2. Hard refresh: Cmd+Shift+R"
echo "   3. Login as accountant"
echo "   4. Test new features!"
```

### To use this script:

```bash
# On EC2, create the script
nano deploy-latest.sh

# Paste the script above, save (Ctrl+X, Y, Enter)

# Make executable
chmod +x deploy-latest.sh

# Run it
./deploy-latest.sh
```

---

## What You Should See After Deployment

### 1. Upload Claim for PARTIALLY_PAID Requests
- Login as sales user (owner of request)
- Find PARTIALLY_PAID request
- ✅ "Upload Claim" button should appear
- Click it and upload a new receipt
- ✅ Should work without errors

### 2. Delete PAID Request
- Login as accountant
- Find PAID request
- Click "Delete Request" button
- ✅ Should see: "ℹ️ All X claim(s) will be deleted automatically"
- ❌ Should NOT see: "⚠️ Please delete all claims first"
- Click "Yes, Delete"
- ✅ Request and all claims deleted

### 3. Delete PROCESSED Claim
- Login as accountant
- Find PAID request
- Click "VIEW X CLAIM(S)"
- ✅ "Delete Claim" button should appear for PROCESSED claims
- Click "Delete Claim"
- ✅ Should work without errors

---

## Troubleshooting

### Issue: Git pull shows conflicts
```bash
# Stash local changes on EC2
git stash

# Pull again
git pull origin main

# If needed, reapply stashed changes
git stash pop
```

### Issue: Build fails
```bash
# Clear build cache
cd frontend
rm -rf .next node_modules
npm install
npm run build
```

### Issue: Service won't start
```bash
# Check what's running
pm2 status

# Stop all
pm2 stop all

# Delete all
pm2 delete all

# Start fresh
cd ~/fyp_system/frontend
pm2 start npm --name frontend -- start

# Save configuration
pm2 save
```

### Issue: Still seeing old behavior
1. **Clear browser cache**: `Cmd + Shift + R`
2. **Try incognito mode**: `Cmd + Shift + N`
3. **Check server logs**: `pm2 logs frontend --lines 50`
4. **Verify build timestamp**: `ls -l frontend/.next/`

---

## Quick Commands Reference

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@13.214.167.194

# Pull latest code
cd ~/fyp_system && git pull origin main

# Rebuild frontend
cd frontend && npm run build && cd ..

# Restart service
pm2 restart frontend

# Check status
pm2 status

# View logs
pm2 logs frontend

# Real-time monitoring
pm2 monit
```

---

## Verification Checklist

After deployment, verify:
- [ ] SSH to EC2 successful
- [ ] Git pull successful (no conflicts)
- [ ] Frontend build successful (no errors)
- [ ] PM2 restart successful
- [ ] PM2 status shows "online"
- [ ] No errors in PM2 logs
- [ ] Browser hard refresh done
- [ ] Can upload claim to PARTIALLY_PAID request
- [ ] Can delete PAID request with new message
- [ ] Can delete PROCESSED claims

---

**Current Status**:
- ✅ Local changes: Committed and pushed
- ⏳ EC2 deployment: **Needs to be done** (follow steps above)
- ⏳ Browser: Will need hard refresh after EC2 deployment

**Estimated Time**: 5-10 minutes

---

**Next Step**: SSH to your EC2 and run the deployment script above! 🚀
