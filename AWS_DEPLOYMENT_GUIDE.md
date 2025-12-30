# AWS EC2 Deployment Guide - Claims Download Feature

## Date: December 30, 2025

## Overview
This guide covers deploying the new Claims Download feature to your AWS EC2 instance.

## Changes to Deploy

### Modified Files:
1. `backend/src/purchase-requests/purchase-request.controller.ts` - Added download endpoint
2. `frontend/app/purchase-requests/page.tsx` - Added ViewClaimsModal and download UI

### New Files:
1. `CLAIMS_DOWNLOAD_FEATURE.md` - Feature documentation
2. `IMPLEMENTATION_SUMMARY_CLAIMS_DOWNLOAD.md` - Implementation details
3. `test-claims-download.sh` - Test script
4. `AWS_DEPLOYMENT_GUIDE.md` - This file

## Pre-Deployment Checklist

### On Local Machine (macOS):
- [x] Backend builds successfully
- [x] Frontend builds successfully
- [x] All TypeScript errors resolved
- [x] Local testing completed
- [x] PM2 services running locally
- [x] Git status checked

## Deployment Steps

### Step 1: Commit and Push Changes

```bash
# Navigate to project directory
cd /Users/jw/fyp_system

# Check current status
git status

# Add the modified and new files
git add backend/src/purchase-requests/purchase-request.controller.ts
git add frontend/app/purchase-requests/page.tsx
git add CLAIMS_DOWNLOAD_FEATURE.md
git add IMPLEMENTATION_SUMMARY_CLAIMS_DOWNLOAD.md
git add test-claims-download.sh
git add AWS_DEPLOYMENT_GUIDE.md

# Optional: Add migration if you want to keep it
# git add backend/src/migrations/20250115AddFileHashToClaims.ts

# Commit with descriptive message
git commit -m "feat: Add claims download feature for accountants

- Added GET /purchase-requests/claims/:id/download endpoint
- Added ViewClaimsModal component with download functionality
- Accountants can now view and download claim receipts
- Added audit logging for downloads
- Includes role-based access control and ownership validation
- Updated documentation with feature details and deployment guide"

# Push to GitHub
git push origin main
```

### Step 2: Connect to AWS EC2

```bash
# SSH into your EC2 instance
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip-address

# Or if using different user
ssh -i /path/to/your-key.pem ec2-user@your-ec2-ip-address
```

### Step 3: Pull Changes on EC2

```bash
# Navigate to project directory on EC2
cd /path/to/fyp_system

# Stash any local changes (if needed)
git stash

# Pull latest changes
git pull origin main

# If you stashed changes, you can reapply them (optional)
# git stash pop
```

### Step 4: Install Dependencies (if needed)

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

### Step 5: Build Applications

```bash
# Build Backend
cd /path/to/fyp_system/backend
npm run build

# Build Frontend
cd /path/to/fyp_system/frontend
npm run build
```

### Step 6: Restart Services

#### Option A: Using PM2 (Recommended)

```bash
# Navigate to project root
cd /path/to/fyp_system

# Restart all services
pm2 restart ecosystem.config.js --env production

# Or restart individually
pm2 restart backend
pm2 restart frontend

# Check status
pm2 status

# View logs
pm2 logs --lines 50
```

#### Option B: Using Systemd (if configured)

```bash
# Restart backend
sudo systemctl restart fyp-backend

# Restart frontend
sudo systemctl restart fyp-frontend

# Check status
sudo systemctl status fyp-backend
sudo systemctl status fyp-frontend
```

### Step 7: Verify Deployment

```bash
# Check backend is running
curl http://localhost:3000/

# Check frontend is running
curl http://localhost:3001/

# Check PM2 processes
pm2 list

# View logs for any errors
pm2 logs backend --lines 100
pm2 logs frontend --lines 100
```

### Step 8: Test the Feature

1. **Open browser and navigate to your EC2 instance:**
   - `http://your-ec2-ip-address:3001` (or your domain)

2. **Login as accountant or super admin**

3. **Navigate to Purchase Requests page**

4. **Find a purchase request with claims**

5. **Click "View Claims (X)" button**

6. **Verify modal opens with claim details**

7. **Click "Download Receipt" button**

8. **Verify file downloads successfully**

9. **Check audit logs** (if you have audit page)

## Troubleshooting

### Issue: Build Fails

```bash
# Clear node_modules and rebuild
cd backend
rm -rf node_modules package-lock.json
npm install
npm run build

cd ../frontend
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### Issue: PM2 Not Starting

```bash
# Check PM2 status
pm2 status

# Delete all PM2 processes and restart
pm2 delete all
pm2 start ecosystem.config.js --env production

# Check logs
pm2 logs
```

### Issue: Port Already in Use

```bash
# Find process using port 3000 (backend)
sudo lsof -i :3000
sudo kill -9 <PID>

# Find process using port 3001 (frontend)
sudo lsof -i :3001
sudo kill -9 <PID>

# Restart PM2
pm2 restart all
```

### Issue: Permission Denied

```bash
# Ensure proper ownership
sudo chown -R $USER:$USER /path/to/fyp_system

# Ensure upload directories exist
mkdir -p /path/to/fyp_system/backend/uploads/receipts
chmod 755 /path/to/fyp_system/backend/uploads/receipts
```

### Issue: File Download Not Working

1. **Check file permissions:**
   ```bash
   ls -la /path/to/fyp_system/backend/uploads/receipts/
   chmod 644 /path/to/fyp_system/backend/uploads/receipts/*
   ```

2. **Check backend logs:**
   ```bash
   pm2 logs backend --lines 100
   ```

3. **Verify endpoint is registered:**
   - Look for `/purchase-requests/claims/:id/download` in backend startup logs

4. **Test endpoint directly:**
   ```bash
   # Get a claim ID from database
   curl -X GET http://localhost:3000/purchase-requests/claims/CLAIM_ID/download \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

### Issue: Frontend Modal Not Showing

1. **Hard refresh browser:** Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

2. **Clear browser cache**

3. **Check browser console for errors:** F12 → Console tab

4. **Verify frontend build:**
   ```bash
   ls -la frontend/.next/
   ```

## Environment Variables

Ensure these are set on EC2 (usually in `.env` files):

### Backend (.env)
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://your-domain.com
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://your-domain.com/api
```

## Security Considerations

1. **Firewall Rules:**
   - Ensure ports 3000 and 3001 are accessible (or use reverse proxy)
   - If using Nginx, ensure it's configured to proxy to these ports

2. **File Permissions:**
   ```bash
   # Restrict upload directory
   chmod 755 /path/to/fyp_system/backend/uploads
   chmod 644 /path/to/fyp_system/backend/uploads/receipts/*
   ```

3. **Nginx Configuration (if using):**
   ```nginx
   # Add to your Nginx config
   location /api/purchase-requests/claims {
       proxy_pass http://localhost:3000/purchase-requests/claims;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_cache_bypass $http_upgrade;
       
       # Important for file downloads
       proxy_buffering off;
   }
   ```

## Rollback Plan

If something goes wrong:

```bash
# On EC2
cd /path/to/fyp_system

# Revert to previous commit
git log --oneline -5  # Find the previous commit hash
git reset --hard <previous-commit-hash>

# Rebuild
cd backend && npm run build
cd ../frontend && npm run build

# Restart
pm2 restart all
```

## Post-Deployment Verification

### 1. Check Services
```bash
pm2 status
pm2 logs --lines 20
```

### 2. Test API Endpoint
```bash
# Should see the new download endpoint in logs
pm2 logs backend | grep "download"
```

### 3. Test UI
- Login as accountant
- Navigate to Purchase Requests
- Click "View Claims" button
- Verify modal opens
- Click "Download Receipt"
- Verify file downloads

### 4. Check Audit Logs
- Navigate to audit page (if available)
- Verify DOWNLOAD_RECEIPT entries appear

## Monitoring

### Watch logs in real-time:
```bash
pm2 logs
```

### Monitor specific service:
```bash
pm2 logs backend
pm2 logs frontend
```

### Check error logs:
```bash
tail -f /path/to/fyp_system/backend/logs/backend-error.log
tail -f /path/to/fyp_system/frontend/logs/frontend-error.log
```

## Support Commands

```bash
# PM2 Commands
pm2 list                    # List all processes
pm2 restart <name>          # Restart specific process
pm2 stop <name>             # Stop specific process
pm2 delete <name>           # Delete specific process
pm2 logs <name>             # View logs for specific process
pm2 monit                   # Monitor CPU/Memory usage

# Git Commands
git status                  # Check status
git log --oneline -10       # View recent commits
git diff <file>             # View changes in file
git stash                   # Stash local changes
git pull origin main        # Pull latest changes

# Build Commands
npm run build               # Build the app
npm run start:prod          # Start in production mode (if not using PM2)
```

## Contact

If you encounter issues during deployment, check:
1. PM2 logs: `pm2 logs`
2. Backend error logs: `backend/logs/backend-error.log`
3. Frontend error logs: `frontend/logs/frontend-error.log`
4. System logs: `journalctl -xe`

---

**Deployment Status:** Ready for deployment  
**Last Updated:** December 30, 2025  
**Version:** 1.0.0 - Claims Download Feature
