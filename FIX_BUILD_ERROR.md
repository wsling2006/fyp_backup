# 🚨 EC2 BUILD FAILURE - IMMEDIATE FIX

## ❌ ERROR: Module Not Found

```
Module not found: Can't resolve '@/context/AuthContext'
Module not found: Can't resolve '@/lib/api'
Module not found: Can't resolve '@/components/ui/Button'
```

## 🎯 ROOT CAUSE

The build is failing because:
1. **Stale build cache** - Old .next folder causing issues
2. **Module resolution** - `@/` alias not being resolved correctly
3. **Possible corrupted node_modules** - Dependencies might be broken

## ✅ SOLUTION: Clean Build

### **Option 1: Use Clean Build Script (RECOMMENDED)**

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@13.212.147.123

# Navigate to project
cd /home/ubuntu/fyp_system

# First, run diagnostic to check file structure
./diagnose-frontend.sh

# If all files exist, run clean build
./deploy-clean-build.sh
```

**This script will:**
- ✅ Pull latest code from GitHub
- ✅ Clear .next build cache
- ✅ Clear node_modules cache
- ✅ Reinstall all dependencies
- ✅ Do a clean build from scratch
- ✅ Restart PM2 services

---

### **Option 2: Manual Clean Build**

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@13.212.147.123

# Navigate to project
cd /home/ubuntu/fyp_system

# Pull latest code
git pull origin main

# Go to frontend directory
cd frontend

# Clear all caches
rm -rf .next
rm -rf node_modules/.cache

# Reinstall dependencies
rm -rf node_modules
npm install

# Build with clean cache
npm run build

# If build succeeds, restart services
cd ..
pm2 restart ecosystem.config.js
pm2 logs --lines 50
```

---

### **Option 3: If Files Are Missing**

If the diagnostic script shows missing files:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@13.212.147.123

cd /home/ubuntu/fyp_system

# Hard reset to latest code (⚠️ WILL LOSE LOCAL CHANGES)
git fetch origin
git reset --hard origin/main
git pull origin main

# Then run clean build script
./deploy-clean-build.sh
```

---

## 🔍 DIAGNOSTIC STEPS

### Step 1: Check File Structure
```bash
# On EC2
cd /home/ubuntu/fyp_system
./diagnose-frontend.sh
```

**Expected output:**
```
✅ tsconfig.json exists
✅ context/ exists
✅ lib/ exists
✅ components/ui/ exists
✅ context/AuthContext.tsx
✅ lib/api.ts
✅ components/ui/Button.tsx
```

**If you see ❌ MISSING:**
- Files might not have been pulled from GitHub
- Run `git reset --hard origin/main` and `git pull`

### Step 2: Check tsconfig.json
```bash
# On EC2
cd /home/ubuntu/fyp_system/frontend
cat tsconfig.json | grep -A 5 "paths"
```

**Expected output:**
```json
"paths": {
  "@/*": [
    "./*"
  ]
}
```

### Step 3: Verify Node/NPM Versions
```bash
# On EC2
node --version  # Should be v18 or higher
npm --version   # Should be v9 or higher
```

---

## 🛠️ TROUBLESHOOTING

### Issue 1: "Permission Denied" on scripts
```bash
# Make scripts executable
chmod +x /home/ubuntu/fyp_system/*.sh
```

### Issue 2: Git pull conflicts
```bash
# Discard local changes and force pull
cd /home/ubuntu/fyp_system
git fetch origin
git reset --hard origin/main
git clean -fd
git pull origin main
```

### Issue 3: npm install fails
```bash
# Clear npm cache
npm cache clean --force

# Remove package-lock.json
rm -f frontend/package-lock.json

# Try install again
cd frontend
npm install
```

### Issue 4: Build still fails after clean
```bash
# Check for syntax errors in files
cd /home/ubuntu/fyp_system/frontend
npx tsc --noEmit

# Check for missing dependencies
npm list next react react-dom
```

### Issue 5: PM2 restart fails
```bash
# Check PM2 status
pm2 list

# Delete and recreate processes
pm2 delete all
cd /home/ubuntu/fyp_system
pm2 start ecosystem.config.js

# Save PM2 config
pm2 save
```

---

## 📝 STEP-BY-STEP GUIDE

**Follow these steps in order:**

```bash
# 1. SSH into EC2
ssh -i your-key.pem ubuntu@13.212.147.123

# 2. Navigate to project
cd /home/ubuntu/fyp_system

# 3. Pull latest code (including new scripts)
git pull origin main

# 4. Make scripts executable
chmod +x *.sh

# 5. Run diagnostic
./diagnose-frontend.sh

# 6. If all files exist, run clean build
./deploy-clean-build.sh

# 7. Monitor logs
pm2 logs --lines 50

# 8. Check status
pm2 status
```

---

## ✅ SUCCESS INDICATORS

You'll know it worked when:

1. **Build completes successfully:**
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

2. **PM2 shows services running:**
```
┌─────┬────────────┬─────────┬─────────┬──────────┐
│ id  │ name       │ mode    │ status  │ cpu      │
├─────┼────────────┼─────────┼─────────┼──────────┤
│ 0   │ backend    │ fork    │ online  │ 0%       │
│ 1   │ frontend   │ fork    │ online  │ 0%       │
└─────┴────────────┴─────────┴─────────┴──────────┘
```

3. **No errors in logs:**
```bash
pm2 logs --lines 20 --nostream
# Should show "ready" or "compiled successfully"
```

4. **Can access app:**
- Open browser: `http://13.212.147.123:3001`
- Should load login page
- No console errors

---

## 🚨 IF STILL FAILING

**Provide this information:**

1. **Diagnostic output:**
```bash
./diagnose-frontend.sh > diagnostic-output.txt
cat diagnostic-output.txt
```

2. **Build error output:**
```bash
cd frontend
npm run build 2>&1 | tee build-error.txt
cat build-error.txt
```

3. **File structure:**
```bash
ls -la frontend/
ls -la frontend/context/
ls -la frontend/lib/
ls -la frontend/components/
```

4. **Git status:**
```bash
git status
git log -1
git remote -v
```

---

## 📞 QUICK COMMANDS REFERENCE

```bash
# Diagnostic
./diagnose-frontend.sh

# Clean build
./deploy-clean-build.sh

# Check logs
pm2 logs

# Check status
pm2 status

# Restart services
pm2 restart all

# Force pull latest code
git reset --hard origin/main && git pull

# Clear everything and start fresh
rm -rf frontend/.next frontend/node_modules
cd frontend && npm install && npm run build
```

---

## 🎯 EXPECTED TIMELINE

- Diagnostic: 1 minute
- Clean build: 5-10 minutes
- Service restart: 30 seconds
- Verification: 2 minutes

**Total:** ~15 minutes

---

**NEXT STEP:** Run `./diagnose-frontend.sh` on EC2 and report results!
