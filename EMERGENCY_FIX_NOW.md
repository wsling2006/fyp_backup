# 🚨 EMERGENCY FIX INSTRUCTIONS

## Current Issue
- **Backend:** Online but has missing column error (code 42703)
- **Frontend:** Errored state (not running)

## Root Cause
The database schema is missing required columns for the `purchase_requests` table.

---

## 🔧 IMMEDIATE FIX (Run on EC2)

### Quick Fix Command
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@54.254.162.43

# Pull latest fixes
cd ~/fyp_system
git pull origin main

# Run emergency fix script
./emergency-fix.sh
```

This script will:
1. ✅ Identify the missing column
2. ✅ Fix the database schema (add missing columns)
3. ✅ Restart backend
4. ✅ Rebuild frontend if needed
5. ✅ Restart frontend
6. ✅ Show final status

---

## 📊 What to Expect

### During Fix:
- You'll see database schema being updated
- Backend will restart
- Frontend will restart
- Takes about 1-2 minutes

### After Fix:
```
┌────┬─────────────┬─────────────┬─────────┬────────┬──────────┬
│ id │ name        │ status      │         │        │          │
├────┼─────────────┼─────────────┼─────────┼────────┼──────────┤
│ 0  │ backend     │ online      │ ✓       │        │          │
│ 2  │ frontend    │ online      │ ✓       │        │          │
└────┴─────────────┴─────────────┴─────────┴────────┴──────────┘
```

Both should show **online** with no errors.

---

## 🔍 If Emergency Fix Doesn't Work

### Manual Database Fix
```bash
# On EC2
cd ~/fyp_system

# Check what column is missing
pm2 logs backend --lines 50 --nostream | grep "column.*does not exist"

# Connect to database
psql -U postgres -d fyp_db

# In psql, check schema
\d purchase_requests

# If columns are missing, run:
\i backend/FINAL_FIX.sql

# Exit psql
\q

# Restart backend
pm2 restart backend
```

### Manual Frontend Fix
```bash
# On EC2
cd ~/fyp_system/frontend

# Check if .next exists
ls -la .next

# If missing or broken, rebuild
npm run build

# Restart frontend
pm2 restart frontend
pm2 logs frontend
```

---

## ✅ Verification After Fix

### Check Status:
```bash
pm2 status
```
Both backend and frontend should be **online**.

### Check Logs:
```bash
# Backend should show:
pm2 logs backend --lines 20
# Look for: "Nest application successfully started"
# No "column does not exist" errors

# Frontend should show:
pm2 logs frontend --lines 20
# Look for: "Ready in Xms"
# No build errors
```

### Test in Browser:
1. Go to http://54.254.162.43 (or your domain)
2. Login as sales_department
3. Navigate to Purchase Requests
4. Should load without errors

---

## 🎯 Quick Troubleshooting

### Backend Still Has Errors
```bash
# View full error
pm2 logs backend --lines 100

# Rebuild backend
cd ~/fyp_system/backend
npm run build
pm2 restart backend
```

### Frontend Won't Start
```bash
# Delete and rebuild
cd ~/fyp_system/frontend
rm -rf .next
npm run build
pm2 delete frontend
pm2 start npm --name frontend -- run start
```

### Database Connection Issues
```bash
# Check database is running
sudo systemctl status postgresql

# Check connection
psql -U postgres -d fyp_db -c "SELECT 1;"

# Check .env file has correct credentials
cat ~/fyp_system/backend/.env | grep DB_
```

---

## 📞 Support Commands

```bash
# View all logs in real-time
pm2 logs

# Restart everything
pm2 restart all

# Stop everything
pm2 stop all

# View process details
pm2 describe backend
pm2 describe frontend

# Check what's using ports
sudo lsof -i :3000  # Backend
sudo lsof -i :3001  # Frontend
```

---

## 🚀 After Everything Works

1. ✅ Verify PM2 status is all green
2. ✅ Test login
3. ✅ Test purchase request creation
4. ✅ Verify data displays correctly
5. ✅ Test all user roles

---

**Run this NOW on EC2:**
```bash
cd ~/fyp_system && git pull origin main && ./emergency-fix.sh
```

Good luck! Let me know the results.
