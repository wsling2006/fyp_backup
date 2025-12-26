# 🚀 EC2 Deployment Instructions

## You're Currently On: EC2 Ubuntu Server

The error you got is because `/Users/jw/fyp_system` is your **local Mac** path.

On **EC2**, the project is located at: `/home/ubuntu/fyp_system`

---

## ✅ Correct Commands for EC2

### Step 1: Navigate to the correct directory
```bash
cd /home/ubuntu/fyp_system
```

### Step 2: Pull latest changes
```bash
git pull origin main
```

### Step 3: Run the deployment script
```bash
./deploy-claim-enhancements.sh
```

---

## 🔧 Quick Deploy (Copy-Paste This)

```bash
cd /home/ubuntu/fyp_system && \
git pull origin main && \
chmod +x deploy-claim-enhancements.sh && \
./deploy-claim-enhancements.sh
```

---

## 📋 Alternative: Manual Deployment Steps

If the script doesn't work, deploy manually:

```bash
# 1. Navigate to project
cd /home/ubuntu/fyp_system

# 2. Pull latest code
git pull origin main

# 3. Install dependencies
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# 4. Build frontend
cd frontend && npm run build && cd ..

# 5. Build backend
cd backend && npm run build && cd ..

# 6. Check ClamAV status
sudo systemctl status clamav-daemon

# If not running, start it:
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon

# 7. Restart PM2
cd /home/ubuntu/fyp_system
pm2 restart ecosystem.config.js --update-env

# 8. Check status
pm2 status
pm2 logs --lines 20
```

---

## ✅ What Gets Deployed

1. **Enhanced user feedback** during file upload
2. **Scanning status** display ("🔍 Scanning file...")
3. **Security notice** in upload modal
4. **Better error styling** (blue for info, red for errors)

**Backend already has all security:**
- ✅ Duplicate file prevention (SHA-256 hash)
- ✅ ClamAV malware scanning
- ✅ One claim per request enforcement
- ✅ Upload button disabled after submission

---

## 🧪 After Deployment - Test It

1. **Login** to your application (frontend URL)
2. **Create** a purchase request
3. **Approve** it (as accountant)
4. **Upload** a claim with receipt
5. **Verify** you see:
   - "🔍 Scanning file for malware..." message
   - Button changes to "✓ Claim Submitted"
   - Can't upload same file to another request

---

## 🐛 Troubleshooting

### If git pull fails:
```bash
cd /home/ubuntu/fyp_system
git status
git stash  # If you have local changes
git pull origin main
```

### If npm install fails:
```bash
# Check Node.js version
node --version  # Should be v18 or higher

# Clear npm cache
npm cache clean --force
```

### If PM2 restart fails:
```bash
pm2 delete all
pm2 start ecosystem.config.js
```

### If ClamAV not running:
```bash
sudo systemctl start clamav-daemon
sudo systemctl status clamav-daemon
```

---

## 📊 Check Everything Is Running

```bash
# Check PM2 processes
pm2 status

# Should show:
# backend  | online
# frontend | online

# Check logs
pm2 logs --lines 50

# Check if frontend is accessible
curl http://localhost:3001

# Check if backend is accessible
curl http://localhost:3000/health || curl http://localhost:3000
```

---

## 🌐 Access Your Application

After deployment, access via:
- **Frontend:** http://your-ec2-public-ip:3001
- **Backend API:** http://your-ec2-public-ip:3000

Or if you have nginx configured:
- **https://your-domain.com**

---

## 📝 Summary

**Wrong (Mac path):**
```bash
cd /Users/jw/fyp_system  ❌
```

**Correct (EC2 path):**
```bash
cd /home/ubuntu/fyp_system  ✅
```

**One-liner to deploy:**
```bash
cd /home/ubuntu/fyp_system && git pull && ./deploy-claim-enhancements.sh
```

Done! 🎉
