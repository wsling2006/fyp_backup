# Quick Deployment Reference

## 📦 Local Machine (macOS) - Push to GitHub

```bash
# Option 1: Use the helper script (RECOMMENDED)
./git-push.sh

# Option 2: Manual commit and push
git add backend/src/purchase-requests/purchase-request.controller.ts
git add frontend/app/purchase-requests/page.tsx
git add *.md deploy-ec2.sh test-claims-download.sh git-push.sh
git commit -m "feat: Add claims download feature for accountants"
git push origin main
```

## 🚀 AWS EC2 - Deploy

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd /path/to/fyp_system

# Pull changes
git pull origin main

# Option 1: Use deployment script (RECOMMENDED)
./deploy-ec2.sh

# Option 2: Manual deployment
cd backend && npm run build
cd ../frontend && npm run build
cd ..
pm2 restart ecosystem.config.js --env production
```

## ✅ Verify Deployment

```bash
# Check services
pm2 status

# View logs
pm2 logs --lines 20

# Test in browser
# Navigate to: http://your-ec2-ip:3001
# Login → Purchase Requests → Click "View Claims" → Download Receipt
```

## 🆘 Troubleshooting

```bash
# If build fails
cd backend
rm -rf node_modules dist
npm install
npm run build

cd ../frontend
rm -rf node_modules .next
npm install
npm run build

# If PM2 issues
pm2 delete all
pm2 start ecosystem.config.js --env production

# View detailed logs
pm2 logs backend --lines 100
pm2 logs frontend --lines 100
```

## 📋 Files Changed

### Backend:
- `backend/src/purchase-requests/purchase-request.controller.ts`

### Frontend:
- `frontend/app/purchase-requests/page.tsx`

### Documentation:
- `CLAIMS_DOWNLOAD_FEATURE.md`
- `IMPLEMENTATION_SUMMARY_CLAIMS_DOWNLOAD.md`
- `AWS_DEPLOYMENT_GUIDE.md`
- `QUICK_DEPLOYMENT_REFERENCE.md`

### Scripts:
- `git-push.sh` - Helper to commit and push
- `deploy-ec2.sh` - Deployment script for EC2
- `test-claims-download.sh` - Test script

## 🎯 Feature Summary

**New Endpoint:** `GET /purchase-requests/claims/:id/download`

**New UI Component:** `ViewClaimsModal` with download button

**Access:** Accountants/SuperAdmins can download any receipt, Sales/Marketing can download their own

**Security:** JWT auth, role-based access, audit logging

---

For detailed instructions, see `AWS_DEPLOYMENT_GUIDE.md`
