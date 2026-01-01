# 🚀 EC2 Deployment - Quick Start

## ⚡ Fast Track (2 Minutes)

### Option 1: Automated Script (Recommended)
```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Navigate to project
cd ~/fyp_system

# Pull latest code (includes the script)
git pull origin main

# Make script executable (if not already)
chmod +x deploy-claim-fix.sh

# Run deployment script
./deploy-claim-fix.sh
```

**That's it!** The script will:
- ✅ Pull latest code
- ✅ Install dependencies
- ✅ Build backend
- ✅ Restart services
- ✅ Verify deployment

---

### Option 2: Manual Steps (5 Minutes)
```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Navigate to project
cd ~/fyp_system

# Pull latest code
git pull origin main

# Build backend
cd backend
npm install
npm run build
cd ..

# Restart services
pm2 restart all

# Check status
pm2 status
pm2 logs
```

---

## 📋 What Gets Deployed

**Changes**:
- Backend now allows claim uploads for `PARTIALLY_PAID` requests
- Users can upload multiple claims over time
- No more "can only submit claims for APPROVED" error

**Git Commits**:
- `53979da` - Fix: Allow claim upload for PARTIALLY_PAID requests
- `72d55f2` - Add quick reference guide
- `cc1b872` - Add EC2 deployment guide and script

---

## ✅ Verify After Deployment

```bash
# Check services are running
pm2 status

# Check backend health
curl http://localhost:3000/health

# View logs
pm2 logs --lines 50
```

**In Browser**:
1. Open `http://YOUR_EC2_IP:3000` or `:3001`
2. Login and navigate to purchase requests
3. Try uploading a claim to a PARTIALLY_PAID request
4. ✅ It should work now!

---

## 🆘 Quick Troubleshooting

### Issue: Git pull fails
```bash
git stash
git pull origin main
```

### Issue: Build fails
```bash
cd backend
rm -rf node_modules dist
npm install
npm run build
```

### Issue: Services won't restart
```bash
pm2 delete all
cd backend
pm2 start dist/main.js --name backend
cd ../frontend
pm2 start npm --name frontend -- start
pm2 save
```

### Issue: Still getting errors
```bash
# View detailed logs
pm2 logs backend --err --lines 100

# Restart and monitor
pm2 restart all
pm2 monit
```

---

## 🔗 Need More Help?

- **Full Deployment Guide**: `DEPLOY_EC2_LATEST_CLAIM_FIX.md`
- **Feature Documentation**: `CLAIM_UPLOAD_PARTIALLY_PAID_FIX.md`
- **Complete Overview**: `COMPLETE_IMPLEMENTATION_SUMMARY.md`
- **Quick Reference**: `QUICK_REFERENCE_CLAIMS.md`

---

## 📞 Support Commands

```bash
# View all documentation
ls -1 *.md | grep -E "(DEPLOY|CLAIM|COMPLETE|QUICK)"

# Read a documentation file
cat DEPLOY_EC2_LATEST_CLAIM_FIX.md

# Search for specific info
grep -r "PARTIALLY_PAID" *.md
```

---

## ⏱️ Estimated Time

- **Automated Script**: ~2 minutes
- **Manual Steps**: ~5 minutes
- **Downtime**: < 10 seconds (during PM2 restart)

---

## 🎯 Success Criteria

After deployment, you should be able to:
- ✅ Upload claims to APPROVED requests (existing feature)
- ✅ Upload claims to PARTIALLY_PAID requests (NEW!)
- ✅ See payment progress in UI
- ✅ Delete PAID requests directly
- ✅ Cannot delete PARTIALLY_PAID requests (user can still upload)

---

**Last Updated**: January 1, 2026  
**Status**: ✅ Ready to Deploy  
**Difficulty**: Easy ⭐  
**Risk**: Low (no database changes)
