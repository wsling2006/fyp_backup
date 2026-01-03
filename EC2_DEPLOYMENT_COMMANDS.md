# Quick EC2 Deployment Commands

## Option 1: One-Line Update (Recommended)

Copy and paste this entire command into your EC2 terminal:

```bash
cd ~/fyp_system && git pull origin main && chmod +x security-audit.sh deploy-security-fix-to-ec2.sh && cd frontend && npm install && npm run build && cd .. && ./security-audit.sh
```

---

## Option 2: Step-by-Step Commands

If you prefer to run commands separately:

### 1. Pull Latest Changes
```bash
cd ~/fyp_system
git pull origin main
```

### 2. Make Scripts Executable
```bash
chmod +x security-audit.sh
chmod +x deploy-security-fix-to-ec2.sh
```

### 3. Install Dependencies
```bash
cd ~/fyp_system/frontend
npm install
```

### 4. Build Frontend
```bash
npm run build
```

### 5. Run Security Audit
```bash
cd ~/fyp_system
./security-audit.sh
```

### 6. Restart Application
```bash
cd ~/fyp_system/frontend

# If using PM2:
pm2 restart frontend

# If using nohup or manual start:
pkill -f "npm start" || true
nohup npm start > ../logs/frontend.log 2>&1 &
```

---

## Option 3: Automated Deployment Script

Run the automated deployment script:

```bash
cd ~/fyp_system
./deploy-security-fix-to-ec2.sh
```

---

## Verification Commands

After deployment, verify everything is working:

### Check Security Status
```bash
cd ~/fyp_system
./security-audit.sh
```

### Check Application Status
```bash
# If using PM2:
pm2 status

# If using manual process:
ps aux | grep "npm start"
```

### View Logs
```bash
# If using PM2:
pm2 logs frontend

# If using nohup:
tail -f ~/fyp_system/logs/frontend.log
```

### Check Git Status
```bash
cd ~/fyp_system
git status
git log --oneline -5
```

---

## Troubleshooting

### If git pull fails:
```bash
cd ~/fyp_system
git stash
git pull origin main
git stash pop
```

### If npm build fails:
```bash
cd ~/fyp_system/frontend
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### If security-audit.sh is not found:
```bash
cd ~/fyp_system
ls -la security-audit.sh
chmod +x security-audit.sh
./security-audit.sh
```

### If port 3000 is already in use:
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or kill all node processes:
pkill -f node
```

---

## Expected Output

After running the security audit, you should see:

```
==================================================
📊 SECURITY AUDIT SUMMARY
==================================================

Total Pages Scanned: 21
Secure Pages: 16
Public Pages: 5
Vulnerable Pages: 0

✓ ALL PAGES ARE SECURE!
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `git pull origin main` | Get latest code |
| `npm install` | Install dependencies |
| `npm run build` | Build production app |
| `./security-audit.sh` | Check security |
| `pm2 restart frontend` | Restart app (PM2) |
| `npm start` | Start app (manual) |

---

## Notes

- All security fixes are in the `main` branch
- Frontend must be rebuilt after pulling changes
- Security audit script verifies all pages
- Application restart required for changes to take effect
