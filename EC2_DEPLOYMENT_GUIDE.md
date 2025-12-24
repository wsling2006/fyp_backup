# 🚀 EC2 Deployment Guide - IP-Agnostic Architecture

**Last Updated:** December 20, 2025  
**Commit:** `refactor: remove hardcoded IPs and add Next.js same-origin API proxy`

## ✅ What Changed

Your system is now **100% IP-agnostic**. After this deployment:
- ✅ No hardcoded IPs in codebase
- ✅ Works after every EC2 restart
- ✅ Clean git workflow (no IP conflicts)
- ✅ Production-safe and FYP-defensible

## 📦 Pre-Deployment Checklist

On your **local machine**, ensure:

```bash
# 1. Verify you're on the latest commit
cd /Users/jw/fyp_system
git log --oneline -1
# Should show: "refactor: remove hardcoded IPs and add Next.js same-origin API proxy"

# 2. Push to remote (if not already done)
git push origin main

# 3. Verify no hardcoded IPs remain
grep -r "47\.128\." . --exclude-dir=node_modules --exclude-dir=.next
grep -r "13\.251\." . --exclude-dir=node_modules --exclude-dir=.next
# Should return: No matches found
```

## 🔧 EC2 Deployment Steps

### Step 1: SSH into EC2

```bash
# Use your current or new EC2 public IP
ssh -i /path/to/your-key.pem ubuntu@<your-ec2-public-ip>
```

### Step 2: Pull Latest Changes

```bash
cd ~/fyp_system

# Stash any local changes (if any)
git stash

# Pull the latest refactored code
git pull origin main

# Verify you got the latest commit
git log --oneline -1
# Should show: "refactor: remove hardcoded IPs and add Next.js same-origin API proxy"
```

### Step 3: Update Backend Environment

```bash
cd ~/fyp_system/backend

# Check if .env exists
ls -la .env

# If .env doesn't exist or needs update, ensure it has:
nano .env
```

**Required backend .env content:**
```bash
NODE_ENV=production
PORT=3000

# IMPORTANT: This must be http://localhost:3001 (NOT the public IP!)
FRONTEND_URL=http://localhost:3001

# Your existing database credentials
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

# Your existing JWT secret
JWT_SECRET=your_jwt_secret

# Your existing email credentials
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Your existing admin credentials
ADMIN_EMAIL=admin@fyp.com
ADMIN_PASSWORD=your_admin_password
```

**Save and exit** (Ctrl+O, Enter, Ctrl+X in nano)

### Step 4: Rebuild Backend

```bash
cd ~/fyp_system/backend

# Install dependencies (in case package.json changed)
npm install

# Rebuild TypeScript
npm run build
```

### Step 5: Update Frontend Environment

```bash
cd ~/fyp_system/frontend

# Create or update .env.production
nano .env.production
```

**Required frontend .env.production content:**
```bash
# API base path for frontend (relative path via Next.js proxy)
NEXT_PUBLIC_API_BASE=/api

# Backend URL for server-side proxy (NOT exposed to browser)
# This stays as localhost because frontend and backend are on same EC2 instance
BACKEND_URL=http://localhost:3000
```

**Save and exit** (Ctrl+O, Enter, Ctrl+X in nano)

### Step 6: Rebuild Frontend

```bash
cd ~/fyp_system/frontend

# Remove old build artifacts
rm -rf .next node_modules

# Fresh install
npm install

# Build for production
npm run build
```

**Expected output:**
```
✓ Generating static pages (12/12)
✓ Finalizing page optimization

Route (app)                              Size     First Load JS
┌ ○ /                                    ...
├ ƒ /api/[...path]                       0 B                0 B
├ ○ /dashboard                           ...
└ ○ /login                               ...
```

### Step 7: Restart PM2

```bash
cd ~/fyp_system

# Restart both frontend and backend
pm2 restart all

# Verify both are running
pm2 status
```

**Expected output:**
```
┌─────┬────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name       │ mode        │ ↺       │ status  │ cpu      │
├─────┼────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ backend    │ fork        │ 0       │ online  │ 0%       │
│ 1   │ frontend   │ fork        │ 0       │ online  │ 0%       │
└─────┴────────────┴─────────────┴─────────┴─────────┴──────────┘
```

### Step 8: Check Logs

```bash
# Check backend logs
pm2 logs backend --lines 30

# Should see:
# 🔒 CORS enabled for origin: http://localhost:3001
# 🚀 Backend running on http://localhost:3000
# 📡 Accessible via Next.js proxy at <frontend-url>/api/*

# Check frontend logs
pm2 logs frontend --lines 30

# Should see:
# ▲ Next.js 14.x.x
# - Local:        http://localhost:3001
# - ready started server on 0.0.0.0:3001
```

### Step 9: Verify Ports

```bash
# Check that ports 3000 and 3001 are listening
sudo lsof -i :3000
# Should show: node (backend)

sudo lsof -i :3001
# Should show: node (frontend)
```

### Step 10: Test in Browser

1. **Get your EC2 public IP:**
   ```bash
   curl -s http://checkip.amazonaws.com
   ```

2. **Open browser and navigate to:**
   ```
   http://<your-ec2-public-ip>:3001/login
   ```

3. **Test login:**
   - Email: `admin@fyp.com`
   - Password: (your ADMIN_PASSWORD from backend .env)

4. **Verify in browser DevTools:**
   - Open **Console** (F12)
   - Check for errors: Should be **NO CORS errors**
   - Open **Network tab**
   - Perform login
   - API calls should go to `/api/auth/login` (relative path)
   - Should see **200 OK** responses

## ✅ Post-Deployment Verification

### Test Checklist

- [ ] Login page loads: `http://<ec2-ip>:3001/login`
- [ ] Login works with admin credentials
- [ ] Dashboard loads after login
- [ ] No CORS errors in browser console
- [ ] API calls in Network tab show `/api/*` paths
- [ ] Backend logs show requests from `localhost:3001`
- [ ] PM2 shows both apps `online`

### Verify No Hardcoded IPs

```bash
cd ~/fyp_system

# Search for old IPs in source files
grep -r "47\.128\." . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist
grep -r "13\.251\." . --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist

# Should return: No matches found (or only in logs/documentation)
```

## 🔄 After EC2 Restart (Public IP Changes)

When your EC2 instance restarts and gets a new public IP:

1. **SSH into new IP:**
   ```bash
   ssh -i /path/to/your-key.pem ubuntu@<new-ec2-public-ip>
   ```

2. **Start PM2 (if not auto-started):**
   ```bash
   pm2 resurrect
   # OR
   cd ~/fyp_system && pm2 start ecosystem.config.js
   ```

3. **Access via new IP:**
   ```
   http://<new-ec2-public-ip>:3001/login
   ```

4. **That's it!** No code changes, no rebuilds, no environment updates needed! 🎉

## 🐛 Troubleshooting

### Issue: "Cannot connect to backend"

**Check:**
```bash
# 1. Is backend running?
pm2 status

# 2. Backend logs
pm2 logs backend --lines 50

# 3. Is backend on port 3000?
sudo lsof -i :3000
```

**Fix:**
```bash
pm2 restart backend
```

### Issue: "CORS error" in browser console

**Check backend FRONTEND_URL:**
```bash
cat ~/fyp_system/backend/.env | grep FRONTEND_URL
```

**Must be:**
```
FRONTEND_URL=http://localhost:3001
```

**NOT:**
```
FRONTEND_URL=http://<some-public-ip>:3001  ❌ WRONG
```

**Fix:**
```bash
cd ~/fyp_system/backend
nano .env
# Change FRONTEND_URL to http://localhost:3001
pm2 restart backend
```

### Issue: Frontend build fails

**Check Node version:**
```bash
node --version
# Should be v18.x or v20.x
```

**Try clean rebuild:**
```bash
cd ~/fyp_system/frontend
rm -rf node_modules .next package-lock.json
npm install
npm run build
```

### Issue: "Module not found" during build

**Verify file structure:**
```bash
cd ~/fyp_system/frontend
ls -la app/api/[...path]/
# Should show: route.ts

ls -la lib/
# Should show: api.ts

ls -la context/
# Should show: AuthContext.tsx
```

**If files are missing:**
```bash
git pull origin main --force
```

# EC2 Deployment - Quick Reference Guide

## Latest Fix (Current Deployment)
**Date:** After fixing annual_expense.controller.ts corruption
**Issue:** Accidental shell commands were inserted into `backend/src/accounting/annual_expense.controller.ts`, causing TypeScript syntax errors
**Resolution:** Removed shell commands, restored valid TypeScript code
**Action Required:** Rebuild and restart backend on EC2

---

## 📊 Architecture Summary

```
Browser (User)
  ↓
http://<ec2-public-ip>:3001  ← User accesses this (public)
  ↓ (Next.js Frontend)
  ↓
  ↓ Same-origin API proxy: /api/* → localhost:3000
  ↓
http://localhost:3000         ← Backend (internal only)
  ↓ (NestJS Backend)
  ↓
PostgreSQL Database (localhost:5432)
```

**Key Points:**
- Frontend is publicly accessible on port 3001
- Backend is internal-only on localhost:3000
- All browser requests to `/api/*` are proxied by Next.js
- No hardcoded IPs anywhere in the code
- Works with any public IP (EC2 restart-proof)

## 📝 Environment Variables Summary

### Frontend (.env.production)
```bash
NEXT_PUBLIC_API_BASE=/api
BACKEND_URL=http://localhost:3000
```

### Backend (.env)
```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=http://localhost:3001
# ... database, JWT, email config
```

## 🎓 For FYP Questions

**Q: Why use localhost for FRONTEND_URL if it's on EC2?**  
A: The backend only receives requests from the Next.js server (same machine), not directly from browsers. The Next.js server runs on localhost:3001, so that's the origin the backend sees.

**Q: How do users access the app?**  
A: Users access `http://<public-ip>:3001`. Their browser only talks to the Next.js frontend. The frontend proxies API requests to the backend internally.

**Q: What if EC2 IP changes?**  
A: No problem! The public IP is never in the code. Users just use the new IP. Everything else stays the same.

**Q: Is this secure?**  
A: Yes! The backend is not directly exposed to the internet. It only accepts requests from localhost:3001 (the Next.js server).

## 📞 Support

If you encounter issues:

1. **Check PM2 logs:**
   ```bash
   pm2 logs --lines 100
   ```

2. **Check system resources:**
   ```bash
   free -h  # Memory
   df -h    # Disk space
   ```

3. **Restart everything:**
   ```bash
   pm2 restart all
   pm2 logs --lines 50
   ```

---

**Deployment completed!** 🚀  
**System is now 100% IP-agnostic and production-ready!** ✅
