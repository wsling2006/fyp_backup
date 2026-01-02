# 🚀 START ANNOUNCEMENT SYSTEM - EC2 DEPLOYMENT GUIDE

## ⚠️ Current Issue: PM2 Process Not Found

You're seeing this error because PM2 doesn't have the "backend" process registered yet.

---

## ✅ SOLUTION: Complete Startup Sequence

### **Step 1: Check Current PM2 Status**
```bash
cd ~/fyp_system/backend
pm2 list
```

**Expected output:**
- If empty: No processes running (first time setup)
- If has processes: Note the actual process names

---

### **Step 2: Start Backend (Choose Your Method)**

#### **Method A: Start Fresh (Recommended)**
```bash
cd ~/fyp_system/backend

# Install dependencies (if needed)
npm install

# Build the application
npm run build

# Start with PM2
pm2 start dist/main.js --name backend

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Then run the command it outputs
```

#### **Method B: If You Have ecosystem.config.js**
```bash
cd ~/fyp_system/backend
pm2 start ecosystem.config.js
pm2 save
```

---

### **Step 3: Run Database Migration**
```bash
cd ~/fyp_system/backend

# Run the announcement tables migration
npm run typeorm migration:run
```

**Expected output:**
```
Migration CreateAnnouncementTables1700000000000 has been executed successfully.
```

---

### **Step 4: Verify Backend is Running**
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs backend --lines 20

# Test API endpoint
curl http://localhost:3000/health
# Should return: {"status":"ok"}
```

---

### **Step 5: Start Frontend**
```bash
cd ~/fyp_system/frontend

# Build frontend
npm run build

# Start with PM2 (if not already running)
pm2 start npm --name frontend -- start

# Or if using ecosystem.config.js
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save
```

---

### **Step 6: Verify Everything is Running**
```bash
pm2 list
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

---

## 🔧 TROUBLESHOOTING

### **Issue: Migration Fails with "relation already exists"**

**Solution 1: Check what's already migrated**
```bash
npm run typeorm migration:show
```

**Solution 2: Rollback and re-run (if needed)**
```bash
npm run typeorm migration:revert
npm run typeorm migration:run
```

---

### **Issue: Backend Crashes on Start**

**Check logs:**
```bash
pm2 logs backend --lines 50
```

**Common causes:**
1. **Database connection failed**
   - Check `.env` file has correct DATABASE_URL
   - Test: `psql $DATABASE_URL -c "SELECT 1"`

2. **Missing dependencies**
   - Run: `npm install`

3. **TypeScript compilation errors**
   - Run: `npm run build` and check for errors

---

### **Issue: "Cannot find module" Errors**

**Solution:**
```bash
cd ~/fyp_system/backend

# Install missing types
npm install --save-dev @types/multer @types/express

# Rebuild
npm run build

# Restart
pm2 restart backend
```

---

### **Issue: ClamAV Not Running**

**Check status:**
```bash
sudo systemctl status clamav-daemon
```

**Start if not running:**
```bash
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon

# Update virus definitions
sudo freshclam
```

**Test:**
```bash
curl http://localhost:3310/ping
# Should return: PONG
```

---

## 📋 COMPLETE STARTUP CHECKLIST

Use this checklist to ensure everything is working:

### **Backend**
- [ ] `npm install` completed
- [ ] `npm run build` successful (no errors)
- [ ] `.env` file configured with correct DATABASE_URL
- [ ] PostgreSQL is running
- [ ] Migration executed successfully
- [ ] PM2 process "backend" is online
- [ ] `curl http://localhost:3000/health` returns `{"status":"ok"}`
- [ ] ClamAV daemon is running

### **Frontend**
- [ ] `npm install` completed
- [ ] `npm run build` successful
- [ ] `.env.local` configured with NEXT_PUBLIC_API_BASE_URL
- [ ] PM2 process "frontend" is online
- [ ] Can access frontend in browser

### **Announcement System**
- [ ] Migration created 5 tables (announcements, announcement_acknowledgments, etc.)
- [ ] AnnouncementsModule is registered in app.module.ts
- [ ] Can access `/announcements` endpoint (with JWT token)

---

## 🧪 TEST THE ANNOUNCEMENT SYSTEM

```bash
cd ~/fyp_system

# Make test script executable
chmod +x test_announcement_system.sh

# Get a JWT token (login first, copy token from browser localStorage)
export JWT_TOKEN='your-jwt-token-here'

# Run automated tests
./test_announcement_system.sh
```

---

## 🔄 RESTART COMMANDS (For Future Use)

**Restart backend after code changes:**
```bash
cd ~/fyp_system/backend
npm run build
pm2 restart backend
```

**Restart frontend after code changes:**
```bash
cd ~/fyp_system/frontend
npm run build
pm2 restart frontend
```

**Restart everything:**
```bash
pm2 restart all
```

**View logs:**
```bash
pm2 logs backend
pm2 logs frontend
pm2 logs --lines 50  # Last 50 lines from all processes
```

**Stop everything:**
```bash
pm2 stop all
```

**Delete all processes (careful!):**
```bash
pm2 delete all
```

---

## 🆘 EMERGENCY RESET

If everything is broken:

```bash
# Stop all PM2 processes
pm2 delete all

# Rebuild backend
cd ~/fyp_system/backend
npm install
npm run build

# Rebuild frontend
cd ~/fyp_system/frontend
npm install
npm run build

# Start backend
cd ~/fyp_system/backend
pm2 start dist/main.js --name backend

# Start frontend
cd ~/fyp_system/frontend
pm2 start npm --name frontend -- start

# Save configuration
pm2 save

# Verify
pm2 list
```

---

## 📝 ECOSYSTEM CONFIG (RECOMMENDED)

Create this file for easier management:

**File: `~/fyp_system/ecosystem.config.js`**
```javascript
module.exports = {
  apps: [
    {
      name: 'backend',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
    {
      name: 'frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      error_file: './logs/frontend-error.log',
      out_file: './logs/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    },
  ],
};
```

**Then use:**
```bash
cd ~/fyp_system
pm2 start ecosystem.config.js
pm2 save
```

---

## ✅ NEXT STEPS

After successful startup:

1. **Test the announcement system** using the test script
2. **Login to the frontend** as HR user
3. **Create a test announcement** at `/announcements/create`
4. **Test file upload** (try PDF, then try .exe to verify blocking)
5. **Test urgent modal** (create URGENT announcement, logout, login as different user)

---

## 📞 SUPPORT COMMANDS

**Check system resources:**
```bash
# Memory usage
free -h

# Disk space
df -h

# CPU usage
top -n 1 | head -20

# PM2 monitoring
pm2 monit
```

**Check service status:**
```bash
# PostgreSQL
sudo systemctl status postgresql

# ClamAV
sudo systemctl status clamav-daemon

# Nginx (if using)
sudo systemctl status nginx
```

---

**Your announcement system is now ready to start!** 🚀

Follow the steps above and you'll have it running in minutes.
