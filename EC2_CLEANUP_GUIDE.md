# 🧹 EC2 CLEANUP & FRESH START GUIDE

## 🎯 Quick Summary

Your EC2 has a lot of old backup files. Let's clean them up and start fresh!

---

## 📋 What's on Your EC2 Right Now

### ❌ **OLD FILES (Will be deleted):**
- `fyp` - Old project (duplicate)
- `fyp_system_old` - Old backup
- `fyp_backup_20251219_123429` - Old backup from Dec 19
- `fyp_system_backup_20251219_183025` - Old backup from Dec 19
- `fyp_system_backup_20251219_183328` - Old backup from Dec 19
- `backend_env_backup` - Env backup (not needed)
- `frontend_env_backup` - Env backup (not needed)
- `package-lock.json` - Stray file
- `AuthContext.tsx` - Stray file

### ✅ **KEEP:**
- `fyp_system` - Your main project (KEEP)
- `fyp_db_backup.sql` - Database backup (KEEP)

---

## 🚀 OPTION 1: Complete Fresh Start (RECOMMENDED)

This does EVERYTHING in one command:
- Cleans up old files
- Pulls latest code
- Rebuilds everything
- Restarts services
- Shows debug info

```bash
# SSH to EC2
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Go to project
cd /home/ubuntu/fyp_system

# Pull scripts first
git pull origin main

# Run complete fresh start
./ec2-fresh-start.sh
```

**This will take 3-5 minutes.** It does everything automatically!

---

## 🧹 OPTION 2: Just Cleanup (No rebuild)

If you just want to clean up old files:

```bash
# SSH to EC2
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Go to project
cd /home/ubuntu/fyp_system

# Pull cleanup script
git pull origin main

# Run cleanup only
./ec2-cleanup.sh
```

Then manually rebuild later if needed.

---

## 📊 What Each Script Does

### `ec2-fresh-start.sh` (Complete Solution)
1. ✅ Stops PM2 services
2. ✅ Deletes all old backup files
3. ✅ Pulls latest code from GitHub
4. ✅ Rebuilds backend (fresh)
5. ✅ Rebuilds frontend (fresh)
6. ✅ Restarts all services
7. ✅ Shows status and logs
8. ✅ Tests if everything works

**Use this when:** You want a complete clean slate

---

### `ec2-cleanup.sh` (Cleanup Only)
1. ✅ Lists all files
2. ✅ Shows what will be deleted
3. ✅ Asks for confirmation
4. ✅ Deletes old backups
5. ✅ Shows final disk space

**Use this when:** You just want to free up space

---

## 💾 Disk Space You'll Free Up

Estimated space from old backups:
- Each `fyp_system_backup`: ~500MB - 1GB
- Each `fyp_backup`: ~500MB - 1GB
- Old `fyp` project: ~500MB

**Total: ~2-4GB of disk space** will be freed! 🎉

---

## ⚡ Step-by-Step: Complete Fresh Start

### Step 1: SSH to EC2
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
```

### Step 2: Pull Latest Scripts
```bash
cd /home/ubuntu/fyp_system
git pull origin main
```

### Step 3: Run Fresh Start Script
```bash
./ec2-fresh-start.sh
```

It will ask: **"Continue? (yes/no):"**  
Type: **yes** and press Enter

### Step 4: Wait (3-5 minutes)
The script will:
- Clean up files
- Pull latest code
- Rebuild backend (npm install + build)
- Rebuild frontend (npm install + build)
- Restart services

You'll see progress messages for each step.

### Step 5: Verify
At the end, you'll see:
```
✅ FRESH START COMPLETE!
```

And a summary of what to do next.

---

## 🧪 After Fresh Start: Test Claims

### In Your Browser:

1. **Open:** `http://your-ec2-ip:3001`
2. **Hard Refresh:** Ctrl + Shift + R
3. **Open DevTools:** F12
4. **Console Tab**
5. **Login as Accountant**
6. **Go to Purchase Requests**

### Look for Debug Messages:

```javascript
[DEBUG] Total requests loaded: X
[DEBUG] Request 1: {
  title: "...",
  status: "APPROVED",
  hasClaims: "YES",        ← Should be YES
  claimsCount: 1,          ← Should be > 0
  claimsData: [...]        ← Should have data
}
```

### Expected Result:

✅ You should see the **"X Claim(s)"** button appear!

---

## 🆘 If Something Goes Wrong

### Script Fails During Build:

```bash
# Check logs
pm2 logs --lines 50

# Try manual rebuild
cd /home/ubuntu/fyp_system/backend
npm install
npm run build

cd ../frontend
npm install
npm run build

pm2 restart all
```

### Services Won't Start:

```bash
# Check what's wrong
pm2 status
pm2 logs backend --lines 30
pm2 logs frontend --lines 30

# Try restart
pm2 restart all
```

### Still No Claims Button:

Share with me:
1. Console [DEBUG] output
2. Output of: `pm2 logs --lines 50`
3. Network tab response for `/api/purchase-requests`

---

## 📝 Quick Commands Reference

### Check Current Files:
```bash
ls -lh /home/ubuntu/
```

### Check Disk Space:
```bash
df -h /home/ubuntu
```

### Check PM2 Status:
```bash
pm2 status
pm2 logs --lines 20
```

### Check Latest Git Commit:
```bash
cd /home/ubuntu/fyp_system
git log --oneline -5
```

### Manual Cleanup (if script fails):
```bash
cd /home/ubuntu
rm -rf fyp fyp_system_old fyp_backup_* fyp_system_backup_*
rm -rf backend_env_backup frontend_env_backup
rm -f package-lock.json AuthContext.tsx
```

---

## 🎯 Recommended: Use Complete Fresh Start

```bash
# One command does everything:
./ec2-fresh-start.sh
```

This is the safest and most thorough option. It will:
- ✅ Clean up everything
- ✅ Pull latest code with debug logging
- ✅ Rebuild from scratch
- ✅ Test if it works

**Then test in browser and share the [DEBUG] console output!** 🚀

---

## ✅ Success Checklist

After running the fresh start:

- [ ] Old backup files deleted
- [ ] Latest code pulled (commit: 4ce3598 or newer)
- [ ] Backend built successfully
- [ ] Frontend built successfully
- [ ] PM2 shows both services "online"
- [ ] No errors in PM2 logs
- [ ] Browser shows [DEBUG] messages in console
- [ ] Claims button appears (if `hasClaims: "YES"`)

---

**Ready? Run `./ec2-fresh-start.sh` and let's fix this! 🎉**
