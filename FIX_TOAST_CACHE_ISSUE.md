# How to Fix: Toast Still Showing Old Alert Dialog

## Problem
After pulling latest code on EC2, the toast notifications still show as old browser alert dialogs instead of the new centered modal design.

## Root Cause
**Browser Cache** - The browser has cached the old JavaScript bundle files and is not loading the new code.

---

## ✅ Solutions (Try in Order)

### **Solution 1: Hard Refresh Browser (Fastest)** ⚡
On your EC2 browser window:
- **Windows/Linux**: Press `Ctrl + Shift + R` or `Ctrl + F5`
- **Mac**: Press `Cmd + Shift + R`

This forces the browser to bypass cache and reload all files.

---

### **Solution 2: Empty Cache and Hard Reload** 🔄
1. Open the page where you're testing (announcements/create)
2. Press `F12` to open Developer Tools
3. **Right-click** the refresh button (next to address bar)
4. Select **"Empty Cache and Hard Reload"**
5. Close Developer Tools and test again

---

### **Solution 3: Clear Browser Data** 🗑️
1. Press `Ctrl + Shift + Delete` (Windows/Linux) or `Cmd + Shift + Delete` (Mac)
2. Select time range: **"All time"**
3. Check only:
   - ✅ Cached images and files
   - ✅ Hosted app data (if available)
4. Click **"Clear data"**
5. Refresh the page

---

### **Solution 4: Rebuild and Redeploy on EC2** 🛠️

If hard refresh doesn't work, the frontend might not have been rebuilt properly on EC2.

#### **On your EC2 instance, run:**

```bash
# Navigate to project directory
cd ~/fyp_system

# Pull latest changes
git pull origin main

# Navigate to frontend
cd frontend

# Clear Next.js cache
rm -rf .next
rm -rf node_modules/.cache

# Rebuild frontend
npm run build

# Restart PM2
pm2 restart all

# Check status
pm2 list
```

#### **Or use the automated script:**

```bash
cd ~/fyp_system
chmod +x deploy-toast-to-ec2.sh
./deploy-toast-to-ec2.sh
```

Then clear your browser cache and refresh.

---

### **Solution 5: Incognito/Private Mode** 🕵️
1. Open a new **Incognito/Private** browser window
2. Navigate to your EC2 IP address
3. Login and test announcements
4. This ensures no cache is used

---

### **Solution 6: Check PM2 Process** 🔍

Make sure the frontend is actually running the new code:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@13.251.103.187

# Check PM2 status
pm2 list

# View frontend logs
pm2 logs frontend --lines 50

# Restart frontend specifically
pm2 restart frontend

# Check if it's running on correct port
pm2 info frontend
```

---

### **Solution 7: Force New Build Hash** 🔨

If Next.js is still serving old cached bundles:

```bash
# On EC2
cd ~/fyp_system/frontend

# Delete build artifacts
rm -rf .next
rm -rf out
rm -rf node_modules/.cache

# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules
npm install

# Rebuild
npm run build

# Restart
pm2 restart all
```

---

## 🧪 How to Verify It's Working

After clearing cache, you should see:

### ❌ **OLD (What you showed in screenshot):**
```
Small browser alert dialog:
┌──────────────────────────────┐
│ 13.251.103.187:3001 says     │
│                              │
│ Announcement created         │
│ successfully!                │
│                              │
│          [  OK  ]            │
└──────────────────────────────┘
```

### ✅ **NEW (What you should see):**
```
Centered large modal with backdrop:

[Dark semi-transparent background covering whole screen]

          ┌─────────────────────────────────────┐
          │  ✅  ✅ Announcement created         │
          │     successfully!                X │
          └─────────────────────────────────────┘
```

**Features of the new design:**
- ✅ Appears in **center of screen**
- ✅ Large size (400-600px wide)
- ✅ Semi-transparent dark backdrop
- ✅ Big icon (48px)
- ✅ Bold large text
- ✅ Smooth scale-in animation
- ✅ Clickable backdrop to dismiss

---

## 🔍 Debugging Steps

### Check if frontend is serving new code:

```bash
# On EC2
cd ~/fyp_system/frontend

# Check build directory timestamp
ls -la .next

# The .next directory should have a recent timestamp
# If it's old, the build didn't run properly
```

### Check browser console:

1. Press `F12` on the browser
2. Go to **Console** tab
3. Look for any errors
4. Go to **Network** tab
5. Refresh page
6. Check if files are being loaded with `(from disk cache)` or fresh

### Check browser's loaded source:

1. Press `F12`
2. Go to **Sources** tab
3. Find `Toast.tsx` in the file tree
4. Check if it has the new centered code:
   - Should see: `top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`
   - Old code: `top-4 right-4`

---

## 📝 Quick Checklist

- [ ] Pulled latest code on EC2: `git pull origin main`
- [ ] Cleared `.next` folder on EC2: `rm -rf .next`
- [ ] Rebuilt frontend on EC2: `npm run build`
- [ ] Restarted PM2: `pm2 restart all`
- [ ] Hard refreshed browser: `Ctrl + Shift + R`
- [ ] Cleared browser cache: `Ctrl + Shift + Delete`
- [ ] Tested in incognito mode
- [ ] Checked browser console for errors

---

## 🆘 Still Not Working?

If you've tried all solutions and it still shows the old alert:

1. **Check the code on EC2:**
   ```bash
   cd ~/fyp_system/frontend/components
   cat Toast.tsx | grep "top-1/2"
   ```
   If this returns nothing, the new code isn't on EC2.

2. **Verify git is on main branch:**
   ```bash
   cd ~/fyp_system
   git status
   git branch
   git log --oneline -3
   ```

3. **Check frontend build output:**
   ```bash
   cd ~/fyp_system/frontend
   npm run build 2>&1 | tail -20
   ```

4. **Restart server completely:**
   ```bash
   pm2 delete all
   cd ~/fyp_system/backend && pm2 start "npm start" --name backend
   cd ~/fyp_system/frontend && pm2 start "npm start" --name frontend
   pm2 save
   ```

---

## 💡 Pro Tip

To avoid cache issues in the future:
- Always test in Incognito mode first
- Or disable cache in DevTools (F12 → Network tab → "Disable cache" checkbox)
- Keep DevTools open while developing
