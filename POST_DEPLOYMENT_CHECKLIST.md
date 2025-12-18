# ✅ POST-DEPLOYMENT VERIFICATION CHECKLIST

**Run this checklist AFTER deploying to EC2**

---

## ✅ BUILD VERIFICATION

### Backend Build
```bash
cd ~/app/backend
npm install
npm run build
```
- [ ] `npm install` completes without errors
- [ ] `npm run build` completes without errors
- [ ] `dist/main.js` exists and has content
- [ ] No TypeScript errors
- [ ] Build time: < 2 minutes

### Frontend Build
```bash
cd ~/app/frontend
npm install
npm run build
```
- [ ] `npm install` completes without errors
- [ ] `npm run build` completes without errors
- [ ] `.next/` directory created
- [ ] No "window is not defined" errors ✅
- [ ] No "useSearchParams" errors ✅
- [ ] No SSR crashes ✅
- [ ] All static pages generated successfully
- [ ] Build time: < 5 minutes

---

## ✅ PM2 STATUS

### Check PM2 Process List
```bash
pm2 status
```

Expected output:
```
┌─────┬────────────┬─────────┬───────┬────────┬──────────┐
│ id  │ name       │ status  │ cpu   │ memory │ watching │
├─────┼────────────┼─────────┼───────┼────────┼──────────┤
│ 0   │ backend    │ online  │ 0%    │ 50mb   │ disabled │
│ 1   │ frontend   │ online  │ 0%    │ 150mb  │ disabled │
└─────┴────────────┴─────────┴───────┴────────┴──────────┘
```

- [ ] `backend` status = `online` ✅
- [ ] `frontend` status = `online` ✅
- [ ] No crash loops (uptime > 1 minute) ✅
- [ ] Memory usage reasonable (< 500MB per app) ✅
- [ ] CPU usage low (< 10% when idle) ✅

### PM2 Logs Check
```bash
pm2 logs --lines 50
```
- [ ] No critical errors in backend logs ✅
- [ ] No critical errors in frontend logs ✅
- [ ] Backend shows: "Backend running on http://0.0.0.0:3000" ✅
- [ ] Backend shows: "Super Admin created or already exists" ✅
- [ ] Frontend shows: "Ready in Xms" or similar ✅

### PM2 Startup
```bash
pm2 save
sudo systemctl status pm2-ubuntu  # or pm2-amazonlinux
```
- [ ] PM2 processes saved ✅
- [ ] PM2 startup service enabled ✅
- [ ] Will auto-start on reboot ✅

---

## ✅ API HEALTH CHECK

### Backend Health Endpoint
```bash
curl http://localhost:3000/health
```
- [ ] Returns HTTP 200 OK ✅
- [ ] Response time: < 1 second ✅

### Backend via Nginx (if configured)
```bash
curl http://api.yourdomain.com/health
# OR
curl http://YOUR_EC2_IP/health
```
- [ ] Returns HTTP 200 OK ✅
- [ ] No 502 Bad Gateway ✅
- [ ] No SSL errors (if using HTTPS) ✅

### Frontend Health
```bash
curl http://localhost:3001
```
- [ ] Returns HTML ✅
- [ ] Contains "<!DOCTYPE html>" ✅
- [ ] No error messages in HTML ✅

### Frontend via Nginx
```bash
curl http://yourdomain.com
# OR
curl http://YOUR_EC2_IP
```
- [ ] Returns HTML ✅
- [ ] No 502 Bad Gateway ✅

---

## ✅ AUTH FLOW TESTING

### Login Test
**Via Browser:**
1. Open `http://yourdomain.com/login` (or EC2 IP)
2. Enter super admin credentials
3. Click Login

- [ ] Login page loads without errors ✅
- [ ] No console errors in browser DevTools ✅
- [ ] Login succeeds with valid credentials ✅
- [ ] Redirected to dashboard after login ✅
- [ ] JWT token/cookie set correctly ✅
- [ ] Dashboard shows user email ✅

### Session Persistence
1. Refresh the page (F5)
2. Check if still logged in

- [ ] Page refresh keeps session ✅
- [ ] No redirect to login page ✅
- [ ] User data still displayed ✅

### Logout Test
1. Click Logout button
2. Check redirect

- [ ] Logout succeeds ✅
- [ ] Redirected to login page ✅
- [ ] Cookie/token cleared ✅
- [ ] Cannot access dashboard after logout ✅

### Invalid Credentials
1. Try logging in with wrong password
2. Check error handling

- [ ] Error message displayed ✅
- [ ] No application crash ✅
- [ ] Account locks after 5 failed attempts ✅

---

## ✅ EMAIL / OTP FUNCTIONALITY

### OTP Email (Forgot Password)
1. Click "Forgot Password"
2. Enter email address
3. Submit

- [ ] OTP request succeeds ✅
- [ ] Email received within 1 minute ✅
- [ ] Email contains 6-digit OTP ✅
- [ ] Email links use production domain (not localhost) ✅
- [ ] OTP is valid (can be used) ✅

### Email Configuration
```bash
# Check backend logs for email sending
pm2 logs backend | grep -i email
```
- [ ] No Gmail authentication errors ✅
- [ ] No "Invalid credentials" errors ✅
- [ ] Email successfully sent (logged) ✅

### Common Email Issues
- [ ] EMAIL_USER is correct ✅
- [ ] EMAIL_PASS is Gmail App Password (not regular password) ✅
- [ ] No firewall blocking port 587 (SMTP) ✅
- [ ] Check spam folder if email not in inbox ✅

---

## ✅ FILE UPLOAD / CLAMAV

### File Upload Test (Accountant Dashboard)
1. Log in as accountant or super admin
2. Navigate to accountant dashboard
3. Upload a safe file (PDF, Excel, etc.)

- [ ] File upload form loads ✅
- [ ] Can select file ✅
- [ ] Upload succeeds ✅
- [ ] File appears in file list ✅
- [ ] Upload time: < 30 seconds ✅

### ClamAV Malware Detection
1. Download EICAR test file: `wget https://secure.eicar.org/eicar.com.txt`
2. Try uploading EICAR file

- [ ] Upload is rejected ✅
- [ ] Error message: "Malware detected" or similar ✅
- [ ] Application does not crash ✅

### ClamAV Service
```bash
sudo systemctl status clamav-daemon
```
- [ ] ClamAV daemon is running ✅
- [ ] No errors in status ✅

### ClamAV Resilience Test
```bash
# Stop ClamAV temporarily
sudo systemctl stop clamav-daemon

# Try uploading a file (should fail gracefully)
# Then restart ClamAV
sudo systemctl start clamav-daemon
```
- [ ] App does NOT crash if ClamAV is down ✅
- [ ] Graceful error message shown to user ✅
- [ ] App recovers when ClamAV restarts ✅

---

## ✅ NGINX VERIFICATION

### Nginx Status
```bash
sudo systemctl status nginx
```
- [ ] Nginx is active (running) ✅
- [ ] No error messages ✅

### Nginx Configuration
```bash
sudo nginx -t
```
- [ ] Configuration test passes ✅
- [ ] No syntax errors ✅

### Nginx Logs
```bash
# Check for errors
sudo tail -50 /var/log/nginx/error.log
```
- [ ] No critical errors ✅
- [ ] No 502 Bad Gateway errors ✅
- [ ] No upstream connection errors ✅

### Proxy Headers
**In browser DevTools (Network tab):**
- [ ] Requests to API include correct headers ✅
- [ ] CORS headers present (if using subdomain) ✅
- [ ] Cookies are set and sent correctly ✅

---

## ✅ DATABASE VERIFICATION

### PostgreSQL Status
```bash
sudo systemctl status postgresql
```
- [ ] PostgreSQL is running ✅

### Database Connection
```bash
psql -h localhost -U fyp_user -d fyp_db -c "SELECT 1;"
```
- [ ] Connection succeeds ✅
- [ ] Returns "1" ✅

### Check Super Admin
```bash
psql -h localhost -U fyp_user -d fyp_db -c "SELECT email, role FROM users WHERE role = 'super_admin';"
```
- [ ] Super admin exists ✅
- [ ] Email matches ADMIN_EMAIL from .env ✅

---

## ✅ CORS VERIFICATION

### Check CORS Headers
```bash
curl -I -X OPTIONS http://api.yourdomain.com/users \
  -H "Origin: http://yourdomain.com" \
  -H "Access-Control-Request-Method: GET"
```
- [ ] Returns 200 or 204 ✅
- [ ] `Access-Control-Allow-Origin` header present ✅
- [ ] `Access-Control-Allow-Credentials: true` present ✅

### Browser CORS Test
**In browser console (yourdomain.com):**
```javascript
fetch('http://api.yourdomain.com/health')
  .then(r => r.text())
  .then(console.log)
```
- [ ] No CORS errors in console ✅
- [ ] Request succeeds ✅

### Common CORS Issues
- [ ] `FRONTEND_URL` in backend .env matches frontend URL EXACTLY ✅
- [ ] No trailing slash in `FRONTEND_URL` ✅
- [ ] Protocol matches (http:// or https://) ✅

---

## ✅ SECURITY VERIFICATION

### JWT Secret
```bash
# Check JWT secret is set (DO NOT PRINT IT)
cat ~/app/backend/.env | grep JWT_SECRET | wc -c
```
- [ ] JWT_SECRET length > 40 characters ✅

### Passwords
- [ ] Admin password is strong ✅
- [ ] Database password is strong ✅
- [ ] No default passwords in use ✅

### Environment Files
```bash
# Check .env files are NOT in git
git ls-files | grep -E '\.env$|\.env\.production$'
```
- [ ] No .env files tracked by git ✅
- [ ] Only .env.example files in git ✅

---

## ✅ PERFORMANCE VERIFICATION

### Page Load Time
**In browser DevTools (Network tab):**
- [ ] Login page loads in < 2 seconds ✅
- [ ] Dashboard loads in < 2 seconds ✅
- [ ] No slow API requests (> 5 seconds) ✅

### API Response Time
```bash
time curl http://localhost:3000/health
```
- [ ] Response time < 500ms ✅

### Memory Usage
```bash
free -h
```
- [ ] At least 500MB free memory ✅

### Disk Space
```bash
df -h
```
- [ ] At least 5GB free disk space ✅

---

## ✅ MONITORING & LOGS

### PM2 Monitoring
```bash
pm2 monit
```
- [ ] Real-time monitoring works ✅
- [ ] CPU and memory stats visible ✅

### Log Rotation
```bash
ls -lh ~/app/logs/
```
- [ ] Log files exist ✅
- [ ] Log files not too large (< 100MB each) ✅

### System Logs
```bash
journalctl -xe
```
- [ ] No critical system errors ✅

---

## ✅ REBOOT TEST (Critical!)

### Test Auto-Restart on Reboot
```bash
# Reboot the server
sudo reboot

# After reboot (reconnect via SSH):
pm2 status
```
- [ ] Server reboots successfully ✅
- [ ] PM2 auto-starts on boot ✅
- [ ] Both apps restart automatically ✅
- [ ] Application accessible after reboot ✅

**If PM2 doesn't auto-start:**
```bash
pm2 startup
# Run the command it outputs
pm2 save
```

---

## ✅ SSL/HTTPS (If Configured)

### Certificate Status
```bash
sudo certbot certificates
```
- [ ] Certificates valid ✅
- [ ] Expiry date > 30 days ✅

### HTTPS Access
```bash
curl -I https://yourdomain.com
```
- [ ] Returns 200 OK ✅
- [ ] No SSL errors ✅
- [ ] Certificate valid ✅

### Auto-Renewal
```bash
sudo certbot renew --dry-run
```
- [ ] Dry run succeeds ✅
- [ ] Auto-renewal configured ✅

---

## ✅ FINAL CONFIDENCE CHECK

### All Systems Green
- [ ] ✅ PM2: Both apps online
- [ ] ✅ Nginx: Running and proxying correctly
- [ ] ✅ PostgreSQL: Connected and responsive
- [ ] ✅ ClamAV: Running and scanning files
- [ ] ✅ Logs: No critical errors
- [ ] ✅ Auth: Login/logout works
- [ ] ✅ Email: OTP delivery works
- [ ] ✅ File Upload: Works with malware detection
- [ ] ✅ Performance: Acceptable load times
- [ ] ✅ Auto-Restart: Survives reboot

### Production Ready
If ALL items above are checked ✅, your application is:
- 🟢 **PRODUCTION READY**
- 🟢 **FULLY OPERATIONAL**
- 🟢 **SAFE TO USE**

You can now:
```bash
# Make updates
git pull
npm run build
pm2 restart all

# Monitor
pm2 logs
pm2 monit
```

---

## 🔥 COMMON POST-DEPLOYMENT ISSUES

| Issue | Symptom | Fix |
|-------|---------|-----|
| App binds to localhost | Works via SSH but not externally | Change to `0.0.0.0` in main.ts |
| Missing proxy headers | Cookies not set | Check Nginx proxy_set_header config |
| Static rendering | Auth breaks on refresh | Add `export const dynamic = 'force-dynamic'` |
| Wrong env prefix | API URL undefined | Use `NEXT_PUBLIC_` prefix |
| Gmail blocked | Emails not sending | Use Gmail App Password |
| PM2 not auto-starting | Apps down after reboot | Run `pm2 startup` and `pm2 save` |
| CORS errors | API requests blocked | Verify FRONTEND_URL exactly matches |
| 502 Bad Gateway | Nginx can't reach app | Check PM2 status, restart if needed |

---

**Checklist Version:** 1.0.0  
**Last Updated:** December 19, 2025  
**Status:** Ready for production validation
