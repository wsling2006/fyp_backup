# Deployment Checklist

## Pre-Deployment (Mac) ✅

- [x] Claims download feature implemented
- [x] Backend download endpoint created
- [x] Frontend ViewClaimsModal created  
- [x] ecosystem.config.js fixed (EC2 port issue)
- [x] ec2-fix.sh script created
- [x] All documentation written
- [x] Local testing completed
- [x] Git push script ready

## Deployment Step 1: Push to GitHub (Mac)

- [ ] Run `./git-push.sh`
- [ ] Verify commit successful
- [ ] Verify push to GitHub successful
- [ ] Check GitHub repo shows latest commit

## Deployment Step 2: Deploy to EC2

- [ ] SSH into EC2: `ssh -i your-key.pem ubuntu@your-ec2-ip`
- [ ] Navigate to project: `cd /home/ubuntu/fyp_system`
- [ ] Pull changes: `git pull origin main`
- [ ] Verify ecosystem.config.js updated
- [ ] Run fix script: `./ec2-fix.sh`
- [ ] Wait for script to complete

## Post-Deployment Verification

### Check PM2 Status
- [ ] Run `pm2 status`
- [ ] Backend shows "online"
- [ ] Frontend shows "online"
- [ ] No error status

### Check Logs
- [ ] Run `pm2 logs --lines 20`
- [ ] No ECONNREFUSED errors
- [ ] No "Invalid project directory" errors
- [ ] Backend shows "Nest application successfully started"
- [ ] Frontend shows "Ready in XXXms"

### Test Backend
- [ ] Run `curl http://localhost:3000`
- [ ] Returns response (not connection refused)
- [ ] Check logs for download endpoint registration

### Test Frontend
- [ ] Run `curl http://localhost:3001`
- [ ] Returns HTML response

### Test in Browser
- [ ] Open `http://your-ec2-ip:3001`
- [ ] Login page loads correctly
- [ ] Login as accountant
- [ ] Navigate to Purchase Requests page
- [ ] Find a request with claims
- [ ] "View Claims" button appears
- [ ] Click "View Claims" button
- [ ] Modal opens with claim details
- [ ] Click "Download Receipt" button
- [ ] File downloads successfully
- [ ] File has correct original filename

### Check Audit Logs (if available)
- [ ] Navigate to audit page
- [ ] Look for "DOWNLOAD_RECEIPT" entries
- [ ] Verify download was logged

## Troubleshooting (if needed)

### If Backend Not Starting
- [ ] Check `pm2 logs backend --lines 50`
- [ ] Verify database connection in `.env`
- [ ] Test database: `psql $DATABASE_URL -c "SELECT 1;"`
- [ ] Rebuild: `cd backend && npm run build`

### If Frontend Not Starting
- [ ] Check `pm2 logs frontend --lines 50`
- [ ] Verify `.env.local` exists
- [ ] Check build exists: `ls frontend/.next/`
- [ ] Rebuild: `cd frontend && npm run build`

### If Port Issues
- [ ] Check ports: `sudo netstat -tlnp | grep -E "3000|3001"`
- [ ] Kill processes if needed:
  ```bash
  sudo kill -9 $(sudo lsof -ti:3000)
  sudo kill -9 $(sudo lsof -ti:3001)
  ```
- [ ] Restart PM2: `pm2 restart all`

### If Still Issues
- [ ] Read `EC2_TROUBLESHOOTING.md`
- [ ] Run nuclear option from troubleshooting guide
- [ ] Contact support with logs

## Success Criteria

### All Green ✅
- [ ] PM2 services online
- [ ] No errors in logs
- [ ] Backend accessible on port 3000
- [ ] Frontend accessible on port 3001
- [ ] Login works
- [ ] Claims view works
- [ ] Download works
- [ ] Audit logging works

## Rollback Plan (if everything fails)

- [ ] On EC2: `cd /home/ubuntu/fyp_system`
- [ ] Find previous commit: `git log --oneline -5`
- [ ] Rollback: `git reset --hard <previous-commit-hash>`
- [ ] Rebuild: `cd backend && npm run build`
- [ ] Rebuild: `cd ../frontend && npm run build`
- [ ] Restart: `pm2 restart all`

## Notes

Estimated time: ~10 minutes total
- Push to GitHub: ~1 minute
- Deploy on EC2: ~5 minutes
- Testing: ~4 minutes

## Documentation Reference

For detailed help, see:
- `DEPLOYMENT_MASTER_GUIDE.md` - Complete guide
- `EC2_FIX_REQUIRED.md` - Your specific issues
- `EC2_TROUBLESHOOTING.md` - Troubleshooting steps
- `AWS_DEPLOYMENT_GUIDE.md` - Full deployment process

---

**Date:** December 30, 2025  
**Feature:** Claims Download + EC2 Fixes  
**Status:** Ready for deployment
