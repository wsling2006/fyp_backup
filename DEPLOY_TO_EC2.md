# 🚀 Deploy Latest Changes to EC2

## Latest Update
Moved Revenue Dashboard button from file upload section to sidebar navigation for better UI organization.

**Latest Commit**: `9fec3d2` - refactor: move revenue dashboard button to sidebar navigation

---

## 📋 Steps to Pull on EC2 Instance

### Step 1: SSH into Your EC2 Instance
```bash
ssh -i /path/to/your-key.pem ec2-user@your-ec2-public-ip
```

Replace:
- `/path/to/your-key.pem` - Path to your EC2 key file
- `your-ec2-public-ip` - Your EC2 instance public IP address

---

### Step 2: Navigate to Project Directory
```bash
cd /path/to/fyp_system
```

Replace `/path/to/fyp_system` with your actual project path on EC2.

---

### Step 3: Pull Latest Changes
```bash
git pull
```

This will pull all the latest commits, including:
- Dashboard UI improvements
- Revenue dashboard button moved to sidebar
- All documentation updates

---

### Step 4: Rebuild Frontend
```bash
cd frontend
npm run build
```

This rebuilds the Next.js application with all the latest changes.

Expected output:
```
✓ Compiled successfully
✓ Generating static pages (12/12)
```

---

### Step 5: Restart Frontend Service
```bash
pm2 restart frontend
```

Or if you need to check status first:
```bash
pm2 status
pm2 restart frontend
pm2 logs frontend  # to see real-time logs
```

---

### Step 6: Verify the Changes
Open your browser and visit:
```
http://your-ec2-public-ip:3001/dashboard/accountant
```

You should see:
- ✅ File upload buttons (Choose File, Upload)
- ✅ Revenue Dashboard in the LEFT SIDEBAR (not above the file section)
- ✅ Modern UI with gradients and better spacing
- ✅ No console errors

---

## 🔍 Full Update Process (All-in-One)

If you want to do everything at once:

```bash
# SSH in
ssh -i your-key.pem ec2-user@your-ec2-ip

# Navigate to project
cd /path/to/fyp_system

# Pull latest
git pull

# Build frontend
cd frontend && npm run build

# Restart
pm2 restart frontend

# Check logs
pm2 logs frontend

# Exit
exit
```

---

## 📊 What Changed?

| Component | Before | After |
|-----------|--------|-------|
| **File Upload Buttons** | Below revenue button | Centered, takes full focus |
| **Revenue Dashboard Button** | Next to file buttons | In LEFT SIDEBAR navigation |
| **Layout** | Cluttered | Clean, organized |
| **Visual Hierarchy** | File upload secondary | File upload primary action |

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] Frontend builds without errors
- [ ] Browser shows updated page
- [ ] File upload buttons visible and clickable
- [ ] Revenue Dashboard link in left sidebar
- [ ] No console errors in browser DevTools
- [ ] Upload/Download/Delete buttons work
- [ ] All styling looks correct

---

## 🔄 If Something Goes Wrong

### Check Frontend Status
```bash
pm2 status
pm2 logs frontend
```

### Rebuild Frontend
```bash
cd frontend
rm -rf .next
npm run build
pm2 restart frontend
```

### Check Git Status
```bash
git status
git log --oneline | head -10
```

### Revert Last Change (if needed)
```bash
git revert HEAD
npm run build
pm2 restart frontend
```

---

## 📝 Backend Note

**No backend changes needed!** The changes are frontend-only:
- ✅ Backend API unchanged
- ✅ Database unchanged
- ✅ All endpoints working as before
- ✅ No restart needed

---

## 🎯 Summary

**What you did**: Improved the UI layout by moving Revenue Dashboard to sidebar
**What changed**: Frontend only (no backend impact)
**What you need to do**: 
1. Pull on EC2
2. Rebuild frontend
3. Restart PM2

That's it! The new version will be live. 🚀

---

## 💡 Next Time

For future updates, the process is always:
```bash
git pull              # Get latest code
npm run build         # Rebuild
pm2 restart frontend  # Restart service
```

Easy! ✅
