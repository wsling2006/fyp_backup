# 🚀 QUICK START: Deploy Purchase Request System

## ⚡ One-Command Deployment (on EC2)

```bash
cd /home/ubuntu/fyp_system && bash deploy-purchase-requests-feature.sh
```

That's it! The script will:
1. Pull latest code
2. Build frontend
3. Reload PM2 (zero downtime)
4. Verify services

---

## ✅ What You Get

### 3 Complete Features:

1. **Create Purchase Request** (Sales/Marketing/SuperAdmin)
   - Form → Password → OTP → Create

2. **Review Purchase Request** (Accountant/SuperAdmin)
   - Approve/Reject → Password → OTP → Review

3. **Upload Receipt/Claim** (Sales/Marketing/SuperAdmin)
   - File Upload → ClamAV Scan → Password → OTP → Submit

---

## 🧪 Quick Test (after deployment)

```bash
# 1. Check services are running
pm2 list

# 2. Check frontend logs
pm2 logs frontend --lines 20

# 3. Test in browser
# Navigate to: http://your-ec2-ip:3001/purchase-requests
```

---

## ⚠️ CRITICAL: What We Did NOT Change

✅ **Backend code** - Already deployed, untouched  
✅ **Authentication system** - No changes  
✅ **API endpoints** - Already exist  
✅ **Database schema** - Already migrated  
✅ **PM2 config** - No changes  
✅ **Nginx config** - No changes  
✅ **Environment variables** - No changes  
✅ **Server ports** - No changes  

**Only changed:** `frontend/app/purchase-requests/page.tsx` (117 → 980 lines)

---

## 🔧 If Something Goes Wrong

```bash
# Rollback frontend
cd /home/ubuntu/fyp_system
git log --oneline -5  # Find commit before deployment
git checkout <previous-commit> frontend/app/purchase-requests/page.tsx
cd frontend && npm run build
pm2 restart frontend

# Check backend is still running
pm2 logs backend --lines 50

# Restart everything (if needed)
pm2 restart all
```

---

## 📞 Support Checklist

Before asking for help, check:

- [ ] `pm2 list` - Are both frontend and backend online?
- [ ] `pm2 logs frontend` - Any errors?
- [ ] `pm2 logs backend` - Any errors?
- [ ] Browser console - Any JavaScript errors?
- [ ] Can you access the page at all?
- [ ] Is ClamAV installed? (backend logs will show)
- [ ] Are OTP emails sending? (check backend .env EMAIL_* vars)

---

## 🎯 Success Indicators

You'll know it worked when:

1. ✅ Page loads at `/purchase-requests`
2. ✅ "+ New Request" button appears (for Sales/Marketing)
3. ✅ Modal opens when clicked
4. ✅ OTP email arrives after entering password
5. ✅ Request is created successfully
6. ✅ Accountant can see and review requests
7. ✅ Upload claim works for approved requests

---

**Total Implementation:**
- **Files Changed:** 1 (frontend page only)
- **Lines Added:** ~863 lines (forms, modals, logic)
- **Backend Changes:** 0 (already complete)
- **Breaking Changes:** 0 (safe deployment)
- **Downtime:** 0 seconds (PM2 reload)

**Deployment Time:** ~2 minutes  
**Risk Level:** ⚠️ LOW (only frontend changed)
