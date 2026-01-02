# Deploy Toast Notifications to EC2 🚀

## Step-by-Step Deployment Guide

### 1. Connect to Your EC2 Instance
```bash
# SSH into your EC2 instance
ssh -i "your-key.pem" ec2-user@your-ec2-ip-address

# OR if you have it configured in SSH config
ssh your-ec2-alias
```

---

### 2. Navigate to Your Project Directory
```bash
# Go to the project directory
cd /path/to/fyp_system

# Check current branch
git branch
```

---

### 3. Pull Latest Changes from GitHub
```bash
# Stash any local changes (if any)
git stash

# Pull the latest changes from main branch
git pull origin main

# Or if you prefer to be more explicit
git fetch origin
git merge origin/main
```

**Expected Output:**
```
remote: Enumerating objects...
remote: Counting objects: 100%
Unpacking objects: 100%
From github.com:jingwei3088/fyp_system
   c89fae1..6dcf054  main -> origin/main
Updating c89fae1..6dcf054
Fast-forward
 frontend/app/globals.css           | 15 +++++++
 frontend/components/Toast.tsx      | 58 +++++++++++++++++++------
 frontend/context/ToastContext.tsx  | 32 ++++----------
 ...
```

---

### 4. Rebuild Frontend with New Toast Changes
```bash
# Navigate to frontend directory
cd frontend

# Install any new dependencies (if any)
npm install

# Build the frontend
npm run build
```

**Expected Output:**
```
> frontend@0.1.0 build
> next build

✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (21/21)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    ...
├ ○ /announcements                       6.54 kB   116 kB
├ ○ /announcements/create                5.96 kB   116 kB
...
```

---

### 5. Restart Frontend Service
```bash
# If using PM2
pm2 restart frontend

# Or if running directly
pm2 restart "npm run start"

# Check status
pm2 status
pm2 logs frontend --lines 50
```

---

### 6. Verify Backend is Running (No Changes Needed)
```bash
# Backend has no changes, but verify it's running
cd ../backend

# Check if backend is running
pm2 status

# If not running, start it
pm2 restart backend
```

---

### 7. Test the Toast Notifications

#### Open your browser and go to:
```
http://your-ec2-ip:3000/announcements/create
```

#### Test Scenarios:

**Test 1: Create Announcement** ✅
1. Fill in title and content
2. Click "Create Announcement"
3. **Expected**: Big centered green success message appears!

**Test 2: Delete Announcement** 🗑️
1. Go to announcements list
2. Click delete button (HR only)
3. Confirm deletion
4. **Expected**: Big centered green "Deleted successfully" message

**Test 3: Upload File with Virus** 🦠
1. Create announcement
2. Attach EICAR test file
3. Submit
4. **Expected**: Big centered red "Virus detected" message

**Test 4: Download Attachment** 📥
1. Click download on any attachment
2. **Expected**: Big centered green "Downloaded [filename]" message

---

## Quick Command Summary

### Full Deployment Script
```bash
# 1. SSH to EC2
ssh -i "your-key.pem" ec2-user@your-ec2-ip

# 2. Navigate and pull
cd /path/to/fyp_system
git stash
git pull origin main

# 3. Rebuild frontend
cd frontend
npm install
npm run build

# 4. Restart services
pm2 restart frontend
pm2 status
pm2 logs frontend --lines 20

# 5. Done! Test in browser
```

---

## Troubleshooting

### Issue: Git pull fails with "local changes"
```bash
# Check what changed
git status

# Stash your local changes
git stash

# Pull again
git pull origin main

# Apply your stashed changes back (if needed)
git stash pop
```

### Issue: Build fails
```bash
# Clear cache and rebuild
cd frontend
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### Issue: PM2 process not restarting
```bash
# List all processes
pm2 list

# Force restart by name
pm2 restart frontend --force

# Or restart all
pm2 restart all

# Check logs
pm2 logs frontend --lines 50
```

### Issue: Port 3000 already in use
```bash
# Check what's using port 3000
sudo lsof -i :3000

# Kill the process if needed
sudo kill -9 <PID>

# Restart
pm2 restart frontend
```

### Issue: Changes not showing in browser
```bash
# Clear browser cache
# OR open in incognito/private mode
# OR hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

---

## What Changed in This Update

### Files Modified:
1. ✅ `frontend/components/Toast.tsx` - Centered modal design
2. ✅ `frontend/context/ToastContext.tsx` - Show only latest toast
3. ✅ `frontend/app/globals.css` - New animations
4. ✅ `frontend/app/announcements/create/page.tsx` - Toast integration
5. ✅ `frontend/app/announcements/page.tsx` - Toast integration

### Features Added:
- ✅ Centered toast notifications (not corner)
- ✅ Larger size (400-600px width)
- ✅ Backdrop overlay for focus
- ✅ Bigger icons (48px)
- ✅ Larger bold text (18px)
- ✅ Smooth scale-in animation
- ✅ Virus detection alerts
- ✅ Success/error feedback for all actions

---

## Alternative: Direct Docker Deployment (If Using Docker)

```bash
# SSH to EC2
ssh -i "your-key.pem" ec2-user@your-ec2-ip

# Navigate to project
cd /path/to/fyp_system

# Pull changes
git pull origin main

# Rebuild and restart containers
docker-compose down
docker-compose build frontend
docker-compose up -d

# Check logs
docker-compose logs -f frontend
```

---

## Verification Checklist

After deployment, verify:
- [ ] Frontend builds successfully without errors
- [ ] Frontend service is running (pm2 status shows "online")
- [ ] Can access the application in browser
- [ ] Can navigate to announcements page
- [ ] Toast appears centered when creating announcement
- [ ] Toast appears centered when deleting announcement
- [ ] Toast has backdrop overlay
- [ ] Toast auto-dismisses after 4 seconds
- [ ] Toast can be dismissed by clicking X or backdrop
- [ ] Virus detection shows red error toast

---

## Rollback (If Something Goes Wrong)

```bash
# Go back to previous commit
cd /path/to/fyp_system
git log --oneline -5  # Find the previous commit hash

# Rollback
git reset --hard <previous-commit-hash>

# Rebuild
cd frontend
npm run build

# Restart
pm2 restart frontend
```

Previous commit before toast changes: `c89fae1`

---

## Need Help?

### Check Logs:
```bash
# Frontend logs
pm2 logs frontend --lines 100

# Backend logs
pm2 logs backend --lines 100

# System logs
tail -f /var/log/messages
```

### Check Service Status:
```bash
pm2 status
pm2 monit  # Live monitoring
```

### Check Network:
```bash
# Test if frontend is accessible
curl http://localhost:3000

# Test if backend is accessible
curl http://localhost:5000/health
```

---

## Summary

**To deploy the new centered toast notifications:**
1. SSH into EC2
2. `git pull origin main`
3. `cd frontend && npm run build`
4. `pm2 restart frontend`
5. Test in browser!

**That's it!** Your toast notifications will now appear as big, centered acknowledgment messages! 🎉
