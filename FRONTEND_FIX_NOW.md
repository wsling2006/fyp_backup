# 🚨 QUICK FIX - Frontend Error

## Current Status
- ✅ Backend: **ONLINE** (stable at 16s uptime)
- ❌ Frontend: **ERRORED** (45 restarts, pid 0)

## 🔧 IMMEDIATE FIX

Run this **ONE COMMAND** on EC2:

```bash
cd ~/fyp_system && git pull origin main && ./fix-frontend-now.sh
```

This will:
1. Show frontend error logs
2. Check if `.next` build exists
3. Rebuild frontend if needed
4. Delete and recreate PM2 frontend process
5. Start frontend fresh
6. Show final status

---

## ⚡ ALTERNATIVE: Manual Quick Fix

If the script doesn't work, run these commands manually:

```bash
# On EC2
cd ~/fyp_system/frontend

# Stop and delete frontend
pm2 stop frontend
pm2 delete frontend

# Rebuild
npm run build

# Start fresh
pm2 start npm --name frontend -- run start

# Check status
pm2 status
pm2 logs frontend --lines 20
```

---

## 🎯 Expected Result

```
┌────┬─────────────┬────────────┬─────────┐
│ id │ name        │ status     │ uptime  │
├────┼─────────────┼────────────┼─────────┤
│ 0  │ backend     │ online     │ Xs      │
│ 2  │ frontend    │ online     │ Xs      │  ← Should be online
└────┴─────────────┴────────────┴─────────┘
```

---

## 🔍 Common Frontend Issues & Solutions

### Issue 1: Missing .next directory
**Symptom:** Frontend keeps restarting
**Fix:**
```bash
cd ~/fyp_system/frontend
npm run build
pm2 restart frontend
```

### Issue 2: Port 3001 already in use
**Symptom:** Cannot start, address already in use
**Fix:**
```bash
sudo lsof -ti:3001 | xargs kill -9
pm2 restart frontend
```

### Issue 3: node_modules missing
**Symptom:** Cannot find module 'next'
**Fix:**
```bash
cd ~/fyp_system/frontend
npm install
npm run build
pm2 restart frontend
```

### Issue 4: PM2 configuration wrong
**Symptom:** Script not found, wrong command
**Fix:**
```bash
pm2 delete frontend
pm2 start npm --name frontend -- run start
pm2 save
```

---

## 📊 After Frontend Starts

### Verify it's working:
```bash
# Check it's online
pm2 status

# Check logs (should see "Ready in Xms")
pm2 logs frontend --lines 20

# Test HTTP endpoint
curl http://localhost:3001

# Should return HTML, not errors
```

### Test in Browser:
- **URL:** http://54.254.162.43:3001
- Should see login page
- No errors in browser console
- Can login and navigate

---

## 🆘 If Still Failing

### Get full error details:
```bash
pm2 logs frontend --lines 200 --nostream
```

### Check what's actually happening:
```bash
# Check if Next.js is installed
cd ~/fyp_system/frontend
npm list next

# Check package.json scripts
cat package.json | grep -A 10 '"scripts"'

# Try running directly (not via PM2)
npm run start
# Press Ctrl+C to stop, then use PM2 again
```

### Nuclear option (complete rebuild):
```bash
cd ~/fyp_system/frontend
rm -rf .next node_modules
npm install
npm run build
pm2 delete frontend
pm2 start npm --name frontend -- run start
pm2 save
```

---

## ✅ Success Checklist

After running fix:
- [ ] Frontend status shows "online" in PM2
- [ ] Frontend logs show "Ready in Xms"
- [ ] No error messages in logs
- [ ] Can curl http://localhost:3001
- [ ] Can access in browser
- [ ] Login page loads
- [ ] No console errors in browser

---

**RUN THIS NOW:**
```bash
cd ~/fyp_system && git pull origin main && ./fix-frontend-now.sh
```

Then report back the output! 🚀
