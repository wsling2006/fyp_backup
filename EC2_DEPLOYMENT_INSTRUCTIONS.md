# 🚀 EC2 Deployment Instructions - Purchase Requests Fix

## Current Situation on EC2
You have:
- Modified files: `backend/package-lock.json`, `check-backend-errors.sh`, `fix-backend-complete.sh`
- Untracked file: `frontend/.env.production`
- Git conflict: Remote has changes you don't have locally (the purchase-requests fix)

## Solution: Safe Pull and Deploy

Run these commands **on your EC2 server** (`ubuntu@ip-172-31-14-249`):

### Option 1: Quick Deploy (Recommended)

```bash
cd ~/fyp_system

# Stash your local changes
git stash push -m "Local EC2 changes before purchase-requests fix"

# Pull the fix from GitHub
git pull origin main

# Verify the page file exists
ls -lh frontend/app/purchase-requests/page.tsx

# Build and restart frontend
cd frontend
npm install
rm -rf .next node_modules/.cache
npm run build
pm2 restart frontend

# Check status
pm2 logs frontend --lines 30
```

### Option 2: Using the Deployment Script

If you've pulled the latest code (which includes `deploy-purchase-requests-ec2.sh`):

```bash
cd ~/fyp_system
git stash
git pull origin main
chmod +x deploy-purchase-requests-ec2.sh
./deploy-purchase-requests-ec2.sh
```

### Option 3: Manual Step-by-Step

```bash
cd ~/fyp_system

# 1. Save your local changes
echo "Backing up local changes..."
git stash push -m "EC2 local changes $(date +%Y%m%d_%H%M%S)"

# 2. Pull the fix
echo "Pulling purchase-requests fix..."
git pull origin main

# 3. Verify the file exists
if [ -f "frontend/app/purchase-requests/page.tsx" ]; then
  echo "✅ Purchase requests page found!"
else
  echo "❌ File not found - pull may have failed"
  exit 1
fi

# 4. Rebuild frontend
cd frontend
npm install
rm -rf .next node_modules/.cache
npm run build 2>&1 | tee build.log

# 5. Check if route is in build
if grep -q "purchase-requests" build.log; then
  echo "✅ Route is in build!"
else
  echo "⚠️ Route not found in build output"
fi

# 6. Restart frontend
pm2 restart frontend

# 7. Check logs
pm2 logs frontend --lines 50 --nostream
```

## Verification After Deployment

### 1. Check PM2 Status
```bash
pm2 status
# Should show: frontend | online
```

### 2. Check Frontend Logs
```bash
pm2 logs frontend --lines 30
# Should show: ✓ Ready in XXXms
```

### 3. Test the Page Locally
```bash
curl -I http://localhost:3001/purchase-requests
# Should return: HTTP/1.1 200 OK
```

### 4. Test with Full HTML
```bash
curl -s http://localhost:3001/purchase-requests | grep -o "Purchase Request" | head -1
# Should return: Purchase Request
```

### 5. Test from Browser
Open your browser and navigate to:
```
http://your-ec2-public-ip:3001/purchase-requests
```
Or if you have a domain:
```
https://your-domain.com/purchase-requests
```

You should see the page load (no more 404!)

## If You Want to Keep Your Local Changes

After deploying, you can reapply your stashed changes:

```bash
# List stashed changes
git stash list

# Apply the most recent stash
git stash pop

# Or apply a specific stash
git stash apply stash@{0}
```

## Troubleshooting

### Issue: "Cannot find module '@/context/AuthContext'"
```bash
cd ~/fyp_system/frontend
npm install
npm run build
```

### Issue: Frontend not starting
```bash
pm2 delete frontend
cd ~/fyp_system/frontend
pm2 start npm --name "frontend" -- start
pm2 logs frontend
```

### Issue: Still getting 404
```bash
# Clear Next.js cache completely
cd ~/fyp_system/frontend
rm -rf .next node_modules/.cache
npm run build
pm2 restart frontend

# Wait 10 seconds then test
sleep 10
curl -I http://localhost:3001/purchase-requests
```

### Issue: Port 3001 already in use
```bash
# Find what's using port 3001
sudo lsof -i :3001

# Kill the process (replace PID)
kill -9 <PID>

# Or restart PM2
pm2 restart frontend
```

## Expected Build Output

After `npm run build`, you should see:

```
Route (app)                              Size     First Load JS
┌ ○ /                                    1.69 kB         112 kB
├ ○ /purchase-requests                   2.4 kB          112 kB  ← This line!
├ ○ /login                               3.67 kB         114 kB
└ ...
```

If you see `/purchase-requests` in the route list, **the fix is deployed correctly!**

## What Changed

1. **Added**: `frontend/app/purchase-requests/page.tsx`
2. **Added**: `PURCHASE_REQUESTS_FRONTEND_FIX.md`
3. **Added**: `PURCHASE_REQUESTS_COMPLETE_STATUS.md`
4. **Added**: `deploy-purchase-requests-ec2.sh`

## Summary

The fix resolves the 404 error by creating the missing frontend page file. The page includes:
- ✅ Authentication and role-based access control
- ✅ Proper routing and navigation
- ✅ Loading states and error handling
- ✅ Placeholder UI (can be enhanced later)

All backend APIs are already functional with OTP, ClamAV, and audit logging.

---

**After deployment, accountants will be able to access the Purchase Requests page without getting a 404 error!**
