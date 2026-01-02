# 🔧 Fix: Cannot POST /api/auth/login (404 Error)

**Error:** `Cannot POST /api/auth/login` with 404 status  
**Location:** Browser accessing `http://13.251.103.187/api/auth/login`  
**Date:** January 3, 2026

---

## 🔍 Problem Analysis

When you see this error in the browser console:
```
POST http://13.251.103.187/api/auth/login 404 (Not Found)
{message: 'Cannot POST /api/auth/login', error: 'Not Found', statusCode: 404}
```

It means the backend NestJS server is **either not running** or the `/auth/login` route **does not exist**.

---

## 🎯 Request Flow (How it SHOULD work)

```
1. Browser → http://13.251.103.187:3001/api/auth/login (Next.js frontend)
2. Next.js Proxy → http://localhost:3000/auth/login (strips /api prefix)
3. NestJS Backend → @Controller('auth') → @Post('login') → Returns response
```

**Key Point:** The Next.js proxy **removes the `/api` prefix** before forwarding to backend.
- Frontend calls: `/api/auth/login`
- Backend receives: `/auth/login`

---

## 🚀 Solution: Run This on EC2

### **Step 1: SSH to EC2**
```bash
ssh ubuntu@13.251.103.187
# Or your EC2 SSH command
```

### **Step 2: Run the Diagnostic Script**
```bash
cd ~/fyp_system
git pull origin main
bash diagnose-login-404.sh
```

This script will check:
- ✅ Is backend running on port 3000?
- ✅ Is frontend running on port 3001?
- ✅ Does `/auth/login` route exist?
- ✅ Is the Next.js proxy working?
- ✅ PM2 process status
- ✅ Recent error logs

---

## 🔧 Common Fixes

### **Fix 1: Backend Not Running**

If the diagnostic shows "Backend is NOT running":

```bash
cd ~/fyp_system
pm2 list  # Check if backend process exists

# If backend is stopped
pm2 start ecosystem.config.js --only backend

# If backend doesn't exist
cd backend
npm run build
pm2 start ecosystem.config.js --only backend
```

### **Fix 2: Backend Route Doesn't Exist (TypeScript Errors)**

If the diagnostic shows "404 on direct backend test":

```bash
cd ~/fyp_system/backend

# Pull latest code (announcement import fixes)
git pull origin main

# Rebuild to fix TypeScript errors
npm run build

# If build succeeds, restart
pm2 restart backend

# Check logs
pm2 logs backend --lines 50
```

### **Fix 3: Old Code Running (Cache Issue)**

```bash
# Stop all processes
pm2 stop all

# Pull latest code
cd ~/fyp_system
git pull origin main

# Rebuild backend
cd backend
npm install
npm run build

# Rebuild frontend
cd ../frontend
npm install
npm run build

# Restart all
pm2 restart all

# Check status
pm2 status
pm2 logs --lines 50
```

### **Fix 4: Migration Not Run**

If backend builds but crashes on startup:

```bash
cd ~/fyp_system/backend

# Run migrations
npm run migration:run

# Restart backend
pm2 restart backend

# Check logs
pm2 logs backend --lines 50
```

### **Fix 5: Nuclear Option (Complete Reset)**

If nothing works, do a complete reset:

```bash
cd ~/fyp_system

# Stop all processes
pm2 delete all

# Pull latest code
git pull origin main

# Backend setup
cd backend
npm install
npm run build
npm run migration:run

# Frontend setup
cd ../frontend
npm install
npm run build

# Start everything
cd ..
pm2 start ecosystem.config.js

# Monitor
pm2 logs
```

---

## 🧪 Manual Testing

### **Test 1: Backend Direct (Bypass Proxy)**

```bash
# On EC2, test backend directly
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leejingwei123@gmail.com","password":"your_password"}'
```

**Expected Results:**
- ✅ **HTTP 200/201:** Login success (if credentials valid)
- ✅ **HTTP 401:** Invalid credentials (means route EXISTS)
- ❌ **HTTP 404:** Route doesn't exist (backend not built correctly)
- ❌ **Connection refused:** Backend not running

### **Test 2: Through Next.js Proxy**

```bash
# On EC2, test through Next.js proxy
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leejingwei123@gmail.com","password":"your_password"}'
```

**Expected Results:**
- ✅ **HTTP 200/201 or 401:** Proxy working
- ❌ **HTTP 404:** Either proxy broken or backend route missing

### **Test 3: From Your Browser (External)**

Open browser console and run:

```javascript
fetch('http://13.251.103.187:3001/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'leejingwei123@gmail.com',
    password: 'your_password'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

---

## 📊 Diagnostic Checklist

Run through this checklist on EC2:

```bash
# 1. Check PM2 processes
pm2 list
# Should show: backend (online), frontend (online)

# 2. Check ports
sudo lsof -i :3000  # Backend should be here
sudo lsof -i :3001  # Frontend should be here

# 3. Check backend logs
pm2 logs backend --lines 50
# Look for: "Nest application successfully started"
# Look for: "Application is running on: http://0.0.0.0:3000"

# 4. Check frontend logs
pm2 logs frontend --lines 50
# Look for: "Ready in XXms"
# Look for: "Local: http://localhost:3001"

# 5. Test backend health
curl http://localhost:3000
# Should NOT return "Cannot GET /" 404 (means server is up)

# 6. Test auth route
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}'
# Should return 401 or 400 (means route EXISTS)
```

---

## 🎯 Root Causes (Most Common)

### **1. TypeScript Compilation Errors**

The announcement system had import path errors that prevented backend from building.

**Fix:** Already pushed (commit `a9d0e3b`)
```bash
git pull origin main
cd backend && npm run build
pm2 restart backend
```

### **2. Backend Crashed on Startup**

Database connection issues or migration failures.

**Fix:**
```bash
# Check if database is accessible
cd ~/fyp_system/backend
npm run migration:run
pm2 restart backend
pm2 logs backend --lines 50
```

### **3. PM2 Process Not Running**

Backend or frontend stopped.

**Fix:**
```bash
pm2 restart all
# Or
pm2 start ecosystem.config.js
```

### **4. Old Code Cached**

PM2 is running old code that doesn't have the auth routes.

**Fix:**
```bash
cd ~/fyp_system
git pull origin main
pm2 restart all --update-env
```

---

## 🔥 Quick Fix (90% of Cases)

```bash
# Run this on EC2 - fixes most issues
cd ~/fyp_system
git pull origin main
cd backend && npm install && npm run build && cd ..
pm2 restart all
pm2 logs --lines 50
```

---

## 📞 Still Not Working?

If the issue persists after trying all fixes:

1. **Capture full logs:**
   ```bash
   pm2 logs backend --lines 200 > ~/backend-logs.txt
   pm2 logs frontend --lines 200 > ~/frontend-logs.txt
   ```

2. **Check environment variables:**
   ```bash
   cat ~/fyp_system/backend/.env | grep -v PASSWORD
   ```

3. **Check if port 3000 is already in use:**
   ```bash
   sudo lsof -i :3000
   # If something else is using it, kill it or change backend port
   ```

4. **Check system resources:**
   ```bash
   free -h          # Check RAM
   df -h            # Check disk space
   top              # Check CPU usage
   ```

---

## ✅ Expected Result

After fixing, you should see:

**Browser:**
```javascript
// Login with valid credentials
✅ HTTP 200/201 with JWT token
{ access_token: "eyJ...", user: {...} }

// Login with invalid credentials  
✅ HTTP 401 Unauthorized
{ message: "Invalid credentials" }
```

**PM2 Status:**
```bash
pm2 list
┌─────┬──────────┬─────────┬────────┐
│ id  │ name     │ status  │ cpu    │
├─────┼──────────┼─────────┼────────┤
│ 0   │ backend  │ online  │ 0%     │
│ 1   │ frontend │ online  │ 0%     │
└─────┴──────────┴─────────┴────────┘
```

**Backend Logs:**
```
Nest application successfully started
Application is running on: http://0.0.0.0:3000
🔒 CORS enabled for origin: http://localhost:3001
```

**Frontend Logs:**
```
▲ Next.js 14.x.x
- Local: http://localhost:3001
✓ Ready in 2.5s
```

---

## 📝 Summary

**Problem:** Browser gets 404 when calling `/api/auth/login`

**Root Cause:** One of:
1. Backend not running
2. Backend TypeScript compile errors (import paths)
3. Backend crashed due to database/migration issues
4. PM2 running old code

**Solution:** 
1. Run diagnostic script: `bash diagnose-login-404.sh`
2. Follow the fix recommendations
3. Most likely: Pull latest code + rebuild + restart

**Files Fixed in Latest Commit:**
- Import paths for announcement system
- TypeScript compilation errors

**Quick Fix:**
```bash
cd ~/fyp_system && git pull origin main && \
cd backend && npm run build && cd .. && \
pm2 restart all && pm2 logs --lines 50
```

---

Good luck! 🚀
