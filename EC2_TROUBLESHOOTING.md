# EC2 Deployment Issues - Troubleshooting Guide

## Current Issues Identified

### Issue 1: ECONNREFUSED on port 3000
```
errno: -111,
code: 'ECONNREFUSED',
address: '127.0.0.1',
port: 3000
```

**Cause:** Frontend trying to connect to backend, but backend is not running or not accessible.

**Solutions:**

1. **Check if backend is running:**
   ```bash
   pm2 status
   pm2 logs backend --lines 50
   ```

2. **Check if port 3000 is listening:**
   ```bash
   sudo netstat -tlnp | grep 3000
   # Or
   sudo lsof -i :3000
   ```

3. **Restart backend:**
   ```bash
   pm2 restart backend
   ```

4. **Check database connection:**
   ```bash
   # Backend might be failing due to database connection
   cd /home/ubuntu/fyp_system/backend
   cat .env
   # Verify DATABASE_URL is correct
   ```

---

### Issue 2: Invalid project directory
```
⨯ Invalid project directory provided, no such directory: /home/ubuntu/fyp_system/frontend/3001
```

**Cause:** PM2 ecosystem.config.js has incorrect configuration for frontend. The `-p 3001` in args is being interpreted as a directory.

**Solution:** The ecosystem.config.js has been fixed to use PORT environment variable instead.

---

## Quick Fix Steps (Run on EC2)

### Option A: Use the Fix Script (RECOMMENDED)

```bash
cd /home/ubuntu/fyp_system
git pull origin main  # Get the updated ecosystem.config.js
./ec2-fix.sh
```

### Option B: Manual Fix

```bash
cd /home/ubuntu/fyp_system

# 1. Stop all PM2 processes
pm2 stop all
pm2 delete all

# 2. Pull latest changes (includes fixed ecosystem.config.js)
git pull origin main

# 3. Ensure builds are up to date
cd backend
npm run build

cd ../frontend
npm run build

# 4. Create log directories
cd ..
mkdir -p backend/logs frontend/logs

# 5. Start services with updated config
pm2 start ecosystem.config.js --env production --update-env

# 6. Check status
pm2 status
pm2 logs --lines 20
```

---

## Detailed Troubleshooting

### Check Backend Issues

```bash
# Check if backend built successfully
ls -la /home/ubuntu/fyp_system/backend/dist/src/main.js

# Check backend environment
cat /home/ubuntu/fyp_system/backend/.env

# Check backend logs
pm2 logs backend --lines 100

# Check if database is accessible
cd /home/ubuntu/fyp_system/backend
# Try connecting to database with psql
psql $DATABASE_URL -c "SELECT 1;"
```

### Check Frontend Issues

```bash
# Check if frontend built successfully
ls -la /home/ubuntu/fyp_system/frontend/.next

# Check frontend environment
cat /home/ubuntu/fyp_system/frontend/.env.local

# Check frontend logs
pm2 logs frontend --lines 100
```

### Check Network/Ports

```bash
# Check what's listening on ports
sudo netstat -tlnp | grep -E "3000|3001"

# Or with lsof
sudo lsof -i :3000
sudo lsof -i :3001

# Check if firewall is blocking
sudo ufw status

# Test connectivity
curl http://localhost:3000
curl http://localhost:3001
```

---

## Environment File Templates

### Backend .env
```bash
# /home/ubuntu/fyp_system/backend/.env
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/your_database_name

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret_key_here

# CORS / Frontend URL
FRONTEND_URL=http://your-domain.com
# Or for development/testing:
# FRONTEND_URL=http://your-ec2-ip:3001

# Email Configuration (if using email features)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
```

### Frontend .env.local
```bash
# /home/ubuntu/fyp_system/frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3000

# Or if using domain:
# NEXT_PUBLIC_API_URL=https://your-domain.com/api
```

---

## Common Issues and Solutions

### 1. Database Connection Failed

**Symptoms:**
- Backend logs show "ECONNREFUSED" to PostgreSQL
- Backend crashes immediately after starting

**Fix:**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# Start PostgreSQL if not running
sudo systemctl start postgresql

# Verify database exists
sudo -u postgres psql -c "\l"

# Create database if needed
sudo -u postgres createdb your_database_name

# Test connection
psql $DATABASE_URL -c "SELECT version();"
```

### 2. Build Artifacts Missing

**Symptoms:**
- PM2 can't find dist/src/main.js
- Frontend shows "module not found" errors

**Fix:**
```bash
cd /home/ubuntu/fyp_system

# Clean and rebuild backend
cd backend
rm -rf dist node_modules
npm install
npm run build

# Clean and rebuild frontend
cd ../frontend
rm -rf .next node_modules
npm install
npm run build
```

### 3. Port Already in Use

**Symptoms:**
- Error: "Port 3000 is already in use"
- Error: "EADDRINUSE"

**Fix:**
```bash
# Find process using port
sudo lsof -ti:3000
sudo lsof -ti:3001

# Kill the process
sudo kill -9 $(sudo lsof -ti:3000)
sudo kill -9 $(sudo lsof -ti:3001)

# Restart PM2
pm2 restart all
```

### 4. Permission Issues

**Symptoms:**
- Error: "EACCES: permission denied"
- Can't write to logs or uploads directory

**Fix:**
```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /home/ubuntu/fyp_system

# Fix permissions
chmod -R 755 /home/ubuntu/fyp_system
chmod 644 /home/ubuntu/fyp_system/backend/.env
chmod 644 /home/ubuntu/fyp_system/frontend/.env.local

# Create upload directories
mkdir -p /home/ubuntu/fyp_system/backend/uploads/receipts
chmod -R 755 /home/ubuntu/fyp_system/backend/uploads
```

### 5. PM2 Not Persisting After Reboot

**Fix:**
```bash
# Save PM2 process list
pm2 save

# Generate startup script
pm2 startup

# Follow the command it outputs (will be something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

---

## Verification Steps

After fixing, verify everything is working:

```bash
# 1. Check PM2 status
pm2 status
# Both backend and frontend should show "online"

# 2. Check logs for errors
pm2 logs --lines 50

# 3. Test backend API
curl http://localhost:3000
# Should return something (not connection refused)

# 4. Test frontend
curl http://localhost:3001
# Should return HTML

# 5. Test in browser
# Navigate to http://your-ec2-ip:3001
# Should see login page

# 6. Check if new endpoint is registered
pm2 logs backend | grep "download"
# Should see: Mapped {/purchase-requests/claims/:id/download, GET}
```

---

## Complete Fresh Start (Nuclear Option)

If nothing else works:

```bash
# 1. Stop and delete all PM2 processes
pm2 kill

# 2. Clean everything
cd /home/ubuntu/fyp_system
git stash  # Save any local changes
git pull origin main  # Get latest code

# 3. Clean backend
cd backend
rm -rf dist node_modules package-lock.json
npm install
npm run build

# 4. Clean frontend
cd ../frontend
rm -rf .next node_modules package-lock.json
npm install
npm run build

# 5. Start fresh
cd ..
pm2 start ecosystem.config.js --env production

# 6. Save configuration
pm2 save
```

---

## Monitoring Commands

```bash
# Real-time logs
pm2 logs

# Real-time monitoring
pm2 monit

# Restart with logs
pm2 restart all && pm2 logs

# Flush logs
pm2 flush

# Show specific process info
pm2 describe backend
pm2 describe frontend
```

---

## Need More Help?

1. **Check logs first:**
   ```bash
   pm2 logs backend --lines 200 > backend-logs.txt
   pm2 logs frontend --lines 200 > frontend-logs.txt
   ```

2. **Check system logs:**
   ```bash
   journalctl -xe | tail -100
   ```

3. **Check disk space:**
   ```bash
   df -h
   ```

4. **Check memory:**
   ```bash
   free -h
   ```

5. **Check CPU:**
   ```bash
   top
   ```

---

**Last Updated:** December 30, 2025
