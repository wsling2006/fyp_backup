# EC2 Deployment & Diagnostic Scripts

## 📋 Overview

Two powerful scripts to help you diagnose and deploy the delete employee feature to your EC2 instance.

---

## 🔍 Script 1: Diagnostic Script

**File**: `check-ec2-delete-button.sh`

### What It Does
Performs a comprehensive 10-point check of your EC2 instance to diagnose why the delete button might not be visible:

1. ✅ SSH connection test
2. ✅ Git repository status
3. ✅ Check for delete feature commits
4. ✅ Verify delete button code exists
5. ✅ Verify DeleteEmployeeModal component
6. ✅ PM2 process status
7. ✅ Frontend build status and age
8. ✅ Backend delete endpoints
9. ✅ Compare local vs EC2 commits
10. ✅ Frontend logs for errors

### Usage

```bash
./check-ec2-delete-button.sh <EC2_IP> <path-to-key.pem>
```

**Example:**
```bash
./check-ec2-delete-button.sh 18.123.45.67 ~/.ssh/my-ec2-key.pem
```

### Output

The script will:
- ✅ Show green checkmarks for passing checks
- ❌ Show red X marks for issues found
- ⚠️  Show yellow warnings for potential problems
- 📊 Provide a summary of all issues
- 🔧 Give specific commands to fix each issue

### Sample Output

```
🔍 EC2 Delete Button Diagnostic Report
========================================

Target EC2: 18.123.45.67
SSH Key: ~/.ssh/my-key.pem

[1/10] Testing SSH connection...
✅ SSH connection successful

[2/10] Checking Git repository status...
Branch: main
Latest commit: 7a98e8c docs: Add comprehensive project completion summary
✅ Repository is clean

[3/10] Checking if delete feature commits are present...
✅ Delete feature commits found:
470d237 feat: Complete delete employee frontend with password+OTP modal

[9/10] Comparing local vs EC2 commits...
Local latest commit: 7a98e8c docs: Add comprehensive project completion summary
EC2 latest commit: 8ae2038 feat: Add secure backend endpoints for employee deletion
❌ EC2 is BEHIND local - needs git pull!

📊 DIAGNOSTIC SUMMARY
========================================
❌ Issue: EC2 is behind local repository

🔧 RECOMMENDED ACTIONS:

1. Update EC2 code:
   ssh -i "~/.ssh/my-key.pem" ec2-user@18.123.45.67 "cd /home/ec2-user/fyp_system && git pull origin main"

2. Rebuild frontend:
   ssh -i "~/.ssh/my-key.pem" ec2-user@18.123.45.67 "cd /home/ec2-user/fyp_system/frontend && npm install && npm run build"

3. Restart PM2 processes:
   ssh -i "~/.ssh/my-key.pem" ec2-user@18.123.45.67 "pm2 restart frontend && pm2 restart backend"
```

---

## 🚀 Script 2: Deployment Script

**File**: `deploy-delete-feature.sh`

### What It Does
Automatically deploys the delete employee feature to your EC2 instance:

1. Tests SSH connection
2. Pulls latest code from GitHub
3. Installs frontend dependencies
4. Builds frontend (production build)
5. Restarts frontend service
6. Restarts backend service
7. Checks service status

### Usage

```bash
./deploy-delete-feature.sh <EC2_IP> <path-to-key.pem>
```

**Example:**
```bash
./deploy-delete-feature.sh 18.123.45.67 ~/.ssh/my-ec2-key.pem
```

### Output

```
🚀 Deploy Delete Employee Feature to EC2
========================================

Target EC2: 18.123.45.67

[1/7] Testing SSH connection...
✅ SSH connection successful

[2/7] Pulling latest code from GitHub...
Current branch: main
Current commit: 8ae2038 feat: Add secure backend endpoints
Pulling latest changes...
New commit: 7a98e8c docs: Add comprehensive project completion summary
✅ Code updated

[3/7] Installing frontend dependencies...
✅ Dependencies installed

[4/7] Building frontend (this may take 2-3 minutes)...
✅ Frontend built successfully

[5/7] Restarting frontend service...
✅ Frontend restarted

[6/7] Restarting backend service...
✅ Backend restarted

[7/7] Checking service status...
frontend    │ online    │ 3000
backend     │ online    │ 3001

========================================
✅ Deployment Complete!
========================================

📋 Verification Steps:

1. Open browser: http://18.123.45.67:3000
2. Login as HR user
3. Navigate to: HR Dashboard → Employees → Click any employee
4. Look for: 🗑️ Delete Employee button (red outline, top right)
```

---

## 🎯 Quick Start Guide

### Step 1: Make Scripts Executable (Already Done)

```bash
chmod +x check-ec2-delete-button.sh
chmod +x deploy-delete-feature.sh
```

### Step 2: Run Diagnostic First

```bash
./check-ec2-delete-button.sh YOUR_EC2_IP ~/.ssh/your-key.pem
```

This will tell you:
- ❓ Is the code deployed?
- ❓ Is the frontend built?
- ❓ Are services running?
- ❓ What's the issue?

### Step 3: Deploy if Needed

If diagnostic shows issues, run the deployment script:

```bash
./deploy-delete-feature.sh YOUR_EC2_IP ~/.ssh/your-key.pem
```

This will automatically:
- ✅ Pull latest code
- ✅ Build frontend
- ✅ Restart services

### Step 4: Verify in Browser

1. Open: `http://YOUR_EC2_IP:3000`
2. Login as HR user
3. Go to any employee page
4. Look for **🗑️ Delete Employee** button (red outline, top right)

---

## 🔧 Common Scenarios

### Scenario 1: Code Not Deployed
**Symptom**: Diagnostic shows "EC2 is BEHIND local"

**Solution**:
```bash
./deploy-delete-feature.sh YOUR_EC2_IP ~/.ssh/your-key.pem
```

### Scenario 2: Frontend Not Built
**Symptom**: Build is older than 24 hours or missing

**Solution**:
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@YOUR_EC2_IP
cd /home/ec2-user/fyp_system/frontend
npm run build
pm2 restart frontend
```

### Scenario 3: Services Not Running
**Symptom**: PM2 shows "stopped" or "errored"

**Solution**:
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@YOUR_EC2_IP
pm2 restart all
pm2 logs frontend
pm2 logs backend
```

### Scenario 4: Button Still Not Visible
**Symptom**: Everything deployed but button not showing

**Solution**:
1. **Hard refresh browser**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. **Clear cache**: Chrome → Settings → Privacy → Clear browsing data
3. **Incognito mode**: Open in private/incognito window
4. **Check console**: Open DevTools (F12) → Console → Look for errors

---

## 📊 Understanding Diagnostic Results

### ✅ Green Check = Good
- Feature is deployed correctly
- No action needed

### ❌ Red X = Issue Found
- Something is wrong
- Follow recommended actions

### ⚠️ Yellow Warning = Potential Issue
- May or may not be a problem
- Review and decide if action needed

---

## 🛠️ Manual Commands (If Scripts Don't Work)

### Check EC2 Code Version
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@YOUR_EC2_IP
cd /home/ec2-user/fyp_system
git log -1 --oneline
git status
```

### Check if Delete Button Code Exists
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@YOUR_EC2_IP
cd /home/ec2-user/fyp_system
grep -n "Delete Employee" frontend/app/hr/employees/\[id\]/page.tsx
```

### Update Code Manually
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@YOUR_EC2_IP
cd /home/ec2-user/fyp_system
git pull origin main
cd frontend
npm install
npm run build
pm2 restart frontend
pm2 restart backend
pm2 list
```

### Check PM2 Logs
```bash
ssh -i ~/.ssh/your-key.pem ec2-user@YOUR_EC2_IP
pm2 logs frontend --lines 50
pm2 logs backend --lines 50
```

---

## 🎯 Expected Behavior After Successful Deployment

### On Employee Detail Page
```
┌─────────────────────────────────────────────────┐
│  ← Back to Employee List                        │
│                                                  │
│  John Doe                                        │
│  Employee ID: EMP001                             │
│                                                  │
│         [ACTIVE]  [🗑️ Delete]  [✏️ Edit]        │
│                   (red)        (blue)            │
└─────────────────────────────────────────────────┘
```

### Delete Button Appearance
- **Icon**: 🗑️
- **Text**: "Delete Employee"
- **Style**: Red outline, red text, white background
- **Location**: Between status badge and edit button
- **Hover**: Red background on hover

---

## 🐛 Troubleshooting

### Issue: "Permission denied" when running scripts
**Solution**:
```bash
chmod +x check-ec2-delete-button.sh
chmod +x deploy-delete-feature.sh
```

### Issue: "Connection refused"
**Solution**:
- Check EC2 security group allows SSH (port 22) from your IP
- Verify EC2 instance is running
- Check EC2 IP address is correct

### Issue: "Host key verification failed"
**Solution**:
```bash
ssh-keyscan -H YOUR_EC2_IP >> ~/.ssh/known_hosts
```

### Issue: Build fails with "out of memory"
**Solution**:
```bash
# Increase Node.js memory limit
ssh -i ~/.ssh/your-key.pem ec2-user@YOUR_EC2_IP
cd /home/ec2-user/fyp_system/frontend
NODE_OPTIONS="--max-old-space-size=2048" npm run build
```

---

## 📞 Support

If both scripts show everything is deployed correctly but you still don't see the button:

1. **Check browser console** (F12 → Console) for JavaScript errors
2. **Check network tab** (F12 → Network) to see if page assets are loading
3. **Try different browser** (Chrome, Firefox, Safari)
4. **Check EC2 security group** allows access to port 3000
5. **Verify you're logged in as HR user** (not regular employee)

---

## 📝 Notes

- **Build time**: Frontend build takes 2-3 minutes
- **Cache**: Browser caching may require hard refresh
- **PM2**: Restart both frontend and backend for best results
- **OTP**: Check backend logs for OTP codes during testing
- **Logs**: Use `pm2 logs` to monitor application behavior

---

## ✅ Success Checklist

After running scripts, verify:
- [ ] Diagnostic script shows all green checks
- [ ] PM2 shows frontend and backend as "online"
- [ ] Can SSH to EC2 successfully
- [ ] Git shows latest commits are deployed
- [ ] Frontend build is recent (< 1 hour old)
- [ ] Browser shows delete button on employee page
- [ ] Button has red outline and trash icon
- [ ] Clicking button opens modal with warnings

---

**Created**: January 2026  
**Purpose**: Deploy and diagnose delete employee feature on EC2  
**Status**: Ready to use
