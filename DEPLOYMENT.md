# 🚀 DEPLOYMENT GUIDE - PM2 + NGINX

This guide covers deploying the application to AWS EC2 using PM2 and Nginx.

---

## 📋 PREREQUISITES

Before deployment, ensure:
- ✅ EC2 instance running Ubuntu 20.04+ or Amazon Linux 2
- ✅ Node.js 18+ installed
- ✅ PM2 installed globally: `npm install -g pm2`
- ✅ Nginx installed: `sudo apt install nginx`
- ✅ PostgreSQL installed and configured
- ✅ ClamAV installed and running
- ✅ Domain DNS configured (A records pointing to EC2 IP)

---

## 🔧 INITIAL SETUP (One-Time)

### 1. Clone Repository
```bash
cd ~
git clone YOUR_REPO_URL app
cd app
```

### 2. Configure Environment Variables

#### Backend
```bash
cd ~/app/backend
cp ../.env.production.backend.example .env
nano .env
```

**Required Changes:**
- `FRONTEND_URL` → Your frontend URL
- `DB_PASSWORD` → Your PostgreSQL password
- `JWT_SECRET` → Generate with: `openssl rand -base64 32`
- `EMAIL_USER` → Your Gmail address
- `EMAIL_PASS` → Gmail App Password
- `ADMIN_PASSWORD` → Secure admin password

Save and exit (Ctrl+O, Enter, Ctrl+X)

#### Frontend
```bash
cd ~/app/frontend
cp ../.env.production.frontend.example .env.production
nano .env.production
```

**Required Changes:**
- `NEXT_PUBLIC_API_URL` → Your backend API URL

Save and exit

### 3. Build Applications

#### Backend
```bash
cd ~/app/backend
npm install --production
npm run build

# Verify build succeeded
ls -la dist/main.js
```

#### Frontend
```bash
cd ~/app/frontend
npm install
npm run build

# Verify build succeeded
ls -la .next/
```

### 4. Create Log Directory
```bash
mkdir -p ~/app/logs
```

### 5. Configure Nginx
```bash
# Copy Nginx config
sudo cp ~/app/nginx.conf /etc/nginx/sites-available/fyp

# Edit with your domain
sudo nano /etc/nginx/sites-available/fyp
# Replace 'yourdomain.com' with your actual domain

# Create symlink
sudo ln -s /etc/nginx/sites-available/fyp /etc/nginx/sites-enabled/

# Remove default config
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🚀 DEPLOYMENT COMMANDS

### Start Applications with PM2

#### Option 1: Using Ecosystem Config (Recommended)
```bash
cd ~/app
pm2 start ecosystem.config.js --env production
```

#### Option 2: Manual Start
```bash
# Start backend
cd ~/app/backend
pm2 start dist/main.js --name backend \
  --env production \
  --max-memory-restart 500M \
  --log ~/app/logs/backend.log \
  --error ~/app/logs/backend-error.log

# Start frontend
cd ~/app/frontend
pm2 start npm --name frontend -- start \
  --env production \
  --max-memory-restart 1G \
  --log ~/app/logs/frontend.log \
  --error ~/app/logs/frontend-error.log
```

### Save PM2 Configuration
```bash
# Save current PM2 process list
pm2 save

# Configure PM2 to start on system boot
pm2 startup
# Run the command it outputs (sudo ...)
```

### Verify Deployment
```bash
# Check PM2 status
pm2 status

# Should show:
# ┌─────┬────────────┬─────────┬───────┬────────┐
# │ id  │ name       │ status  │ cpu   │ memory │
# ├─────┼────────────┼─────────┼───────┼────────┤
# │ 0   │ backend    │ online  │ 0%    │ 50mb   │
# │ 1   │ frontend   │ online  │ 0%    │ 150mb  │
# └─────┴────────────┴─────────┴───────┴────────┘
```

---

## 🔄 UPDATE DEPLOYMENT (After Code Changes)

### Pull Latest Changes
```bash
cd ~/app
git pull origin main
```

### Rebuild and Restart

#### Backend Only
```bash
cd ~/app/backend
npm install --production
npm run build
pm2 restart backend
```

#### Frontend Only
```bash
cd ~/app/frontend
npm install
npm run build
pm2 restart frontend
```

#### Both Applications
```bash
# Backend
cd ~/app/backend && npm install --production && npm run build

# Frontend
cd ~/app/frontend && npm install && npm run build

# Restart all
pm2 restart all
```

### Zero-Downtime Reload
```bash
# Gracefully reload without downtime
pm2 reload all
```

---

## 📊 MONITORING & LOGS

### PM2 Commands

#### Check Status
```bash
pm2 status              # Overview
pm2 list                # Detailed list
pm2 info backend        # App details
pm2 monit               # Real-time monitoring
```

#### View Logs
```bash
# All logs (live)
pm2 logs

# Specific app
pm2 logs backend
pm2 logs frontend

# Last 100 lines
pm2 logs --lines 100

# Clear logs
pm2 flush
```

#### Restart/Reload
```bash
pm2 restart backend     # Restart backend
pm2 restart frontend    # Restart frontend
pm2 restart all         # Restart all

pm2 reload backend      # Reload without downtime
pm2 reload all          # Reload all
```

#### Stop/Delete
```bash
pm2 stop backend        # Stop (keeps in PM2 list)
pm2 delete backend      # Remove from PM2 list
pm2 delete all          # Remove all
```

### Nginx Commands

#### Reload Configuration
```bash
# Test config first
sudo nginx -t

# Reload if test passes
sudo systemctl reload nginx

# Full restart
sudo systemctl restart nginx
```

#### Check Status
```bash
sudo systemctl status nginx
```

#### View Logs
```bash
# Frontend logs
sudo tail -f /var/log/nginx/frontend-access.log
sudo tail -f /var/log/nginx/frontend-error.log

# Backend logs
sudo tail -f /var/log/nginx/backend-access.log
sudo tail -f /var/log/nginx/backend-error.log

# All error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🔒 SSL/HTTPS SETUP (Recommended)

### Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx
```

### Obtain SSL Certificate
```bash
# For main domain and API subdomain
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com -d api.yourdomain.com

# Follow prompts:
# 1. Enter email
# 2. Agree to terms
# 3. Choose redirect (recommended: yes)
```

### Auto-Renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Certbot auto-renews via systemd timer
sudo systemctl status certbot.timer
```

### Update Environment Variables (After SSL)
```bash
# Backend
cd ~/app/backend
nano .env
# Change FRONTEND_URL to https://yourdomain.com

# Frontend
cd ~/app/frontend
nano .env.production
# Change NEXT_PUBLIC_API_URL to https://api.yourdomain.com

# Rebuild and restart
cd ~/app/backend && npm run build && pm2 restart backend
cd ~/app/frontend && npm run build && pm2 restart frontend
```

---

## 🐛 TROUBLESHOOTING

### Application Won't Start

#### Check Logs
```bash
pm2 logs backend --lines 50
pm2 logs frontend --lines 50
```

#### Common Issues

**1. Port Already in Use**
```bash
# Find process using port 3000
sudo lsof -i :3000

# Kill process
sudo kill -9 PID
```

**2. Database Connection Failed**
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Test connection
psql -h localhost -U fyp_user -d fyp_db

# Check .env file
cat ~/app/backend/.env
```

**3. Environment Variables Missing**
```bash
# Verify .env files exist
ls -la ~/app/backend/.env
ls -la ~/app/frontend/.env.production

# Check PM2 environment
pm2 env backend
```

**4. Build Failed**
```bash
# Backend
cd ~/app/backend
rm -rf node_modules dist
npm install
npm run build

# Frontend
cd ~/app/frontend
rm -rf node_modules .next
npm install
npm run build
```

### Nginx Issues

**502 Bad Gateway**
```bash
# Check if apps are running
pm2 status

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log

# Restart apps
pm2 restart all
```

**CORS Errors**
```bash
# Verify FRONTEND_URL in backend .env
cat ~/app/backend/.env | grep FRONTEND_URL

# Must match exactly (no trailing slash):
# ✅ https://yourdomain.com
# ❌ https://yourdomain.com/
```

**SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check Nginx SSL config
sudo nginx -t
```

### Performance Issues

**High Memory Usage**
```bash
# Check PM2 memory
pm2 monit

# Restart app to free memory
pm2 restart backend
```

**Slow Response Times**
```bash
# Check backend logs for errors
pm2 logs backend | grep -i error

# Check ClamAV status (can slow file uploads)
sudo systemctl status clamav-daemon

# Check database connections
# In PostgreSQL:
SELECT count(*) FROM pg_stat_activity;
```

### ClamAV Issues

**File Upload Fails**
```bash
# Check ClamAV is running
sudo systemctl status clamav-daemon

# Check virus definitions are updated
sudo freshclam

# Restart ClamAV
sudo systemctl restart clamav-daemon
```

### Email Not Sending

**Check Logs**
```bash
pm2 logs backend | grep -i email
```

**Common Fixes:**
- ✅ Use Gmail App Password (NOT regular password)
- ✅ Enable "Less secure app access" (if needed)
- ✅ Check EMAIL_USER and EMAIL_PASS in .env
- ✅ Verify Gmail account is not locked

---

## 📋 HEALTH CHECK COMMANDS

Run these to verify everything is working:

```bash
# 1. PM2 Status
pm2 status
# Expected: Both apps "online"

# 2. Backend Health
curl http://localhost:3000/health
# Expected: 200 OK

# 3. Frontend Health
curl http://localhost:3001
# Expected: HTML response

# 4. Nginx Status
sudo systemctl status nginx
# Expected: active (running)

# 5. PostgreSQL Status
sudo systemctl status postgresql
# Expected: active (running)

# 6. ClamAV Status
sudo systemctl status clamav-daemon
# Expected: active (running)

# 7. Disk Space
df -h
# Expected: Enough free space (>10GB recommended)

# 8. Memory Usage
free -h
# Expected: Enough free memory (>500MB recommended)
```

---

## 🔥 EMERGENCY PROCEDURES

### Application Completely Down
```bash
# 1. Check PM2
pm2 list

# 2. Restart all
pm2 restart all

# 3. If still down, check logs
pm2 logs --lines 100

# 4. Check system resources
top
df -h
free -h

# 5. Reboot if necessary
sudo reboot
```

### After Reboot
```bash
# PM2 should auto-start if configured
pm2 list

# If not, start manually
cd ~/app
pm2 start ecosystem.config.js --env production
pm2 save
```

### Database Corruption
```bash
# 1. Stop applications
pm2 stop all

# 2. Backup database
pg_dump fyp_db > ~/backup_$(date +%Y%m%d_%H%M%S).sql

# 3. Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log

# 4. Restart PostgreSQL
sudo systemctl restart postgresql

# 5. Restart applications
pm2 start all
```

---

## 📞 SUPPORT CHECKLIST

Before asking for help, gather this information:

```bash
# 1. PM2 Status
pm2 status

# 2. PM2 Logs
pm2 logs --lines 50 > ~/debug_pm2.log

# 3. Nginx Logs
sudo tail -100 /var/log/nginx/error.log > ~/debug_nginx.log

# 4. System Info
uname -a
node --version
npm --version
pm2 --version

# 5. Environment Variables (redact secrets!)
cat ~/app/backend/.env | grep -v PASSWORD | grep -v SECRET

# 6. Running Processes
ps aux | grep -E 'node|nginx|postgres'
```

---

## ✅ POST-DEPLOYMENT CHECKLIST

After deployment, verify:

- [ ] `pm2 status` shows both apps "online"
- [ ] `curl http://localhost:3000` returns response
- [ ] `curl http://localhost:3001` returns HTML
- [ ] Frontend loads in browser
- [ ] Can log in with super admin credentials
- [ ] Dashboard loads correctly
- [ ] File upload works
- [ ] Email sending works (check spam folder)
- [ ] No errors in `pm2 logs`
- [ ] No errors in Nginx logs
- [ ] SSL certificate valid (if using HTTPS)
- [ ] Auto-restart on reboot works: `sudo reboot` then `pm2 list`

---

**Deployment Status Indicators:**
- 🟢 All systems operational
- 🟡 Minor issues, application still functional
- 🔴 Critical issues, application down

---

**Document Version:** 1.0.0  
**Last Updated:** December 19, 2025  
**Maintained By:** DevOps Team
