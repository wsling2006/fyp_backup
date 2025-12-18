# 🚀 QUICK START GUIDE - EC2 Deployment

## 📝 TL;DR - What Was Changed

### Critical Backend Changes (3 files)
1. **`backend/src/auth/auth.module.ts`** - JWT secret now from env var `JWT_SECRET`
2. **`backend/src/auth/jwt.strategy.ts`** - JWT validation uses env var `JWT_SECRET`
3. **`backend/src/app.module.ts`** - Database `synchronize` disabled in production

### Critical Frontend Changes (1 file)
1. **`frontend/package.json`** - Added missing `axios` and `@tanstack/react-query`

### New Documentation (3 files)
1. **`PRODUCTION_DEPLOYMENT_CHECKLIST.md`** - Complete EC2 setup guide
2. **`REFACTORING_SUMMARY.md`** - Detailed change log
3. **`QUICK_START_GUIDE.md`** - This file

---

## ⚡ 5-Minute Local Test

```bash
# Backend
cd backend
npm install
npm run build
node dist/main.js
# Should show: "🚀 Backend running on http://0.0.0.0:3000"

# Frontend (new terminal)
cd frontend
npm install
npm run build
npm start
# Should show: "✓ Ready in Xms"
```

---

## 🌐 EC2 Deployment in 30 Minutes

### Step 1: Launch EC2 Instance (5 min)
- Ubuntu 22.04 LTS
- t3.medium or larger
- Allow ports: 22, 80, 443, 3000, 3001

### Step 2: Install Prerequisites (10 min)
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE DATABASE fyp_db;"
sudo -u postgres psql -c "CREATE USER fyp_user WITH PASSWORD 'secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fyp_db TO fyp_user;"

# Install ClamAV
sudo apt install -y clamav clamav-daemon
sudo freshclam
sudo systemctl start clamav-daemon

# Install PM2
sudo npm install -g pm2
```

### Step 3: Deploy Application (10 min)
```bash
# Clone repo
cd ~ && git clone YOUR_REPO_URL app && cd app

# Backend
cd backend
npm install --production
cat > .env << 'EOF'
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://YOUR_EC2_IP:3001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=fyp_user
DB_PASSWORD=secure_password
DB_NAME=fyp_db
JWT_SECRET=GENERATE_A_LONG_RANDOM_STRING_HERE_32_CHARS_MIN
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-password
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=secure_admin_password
EOF
npm run build
pm2 start dist/main.js --name backend

# Frontend
cd ../frontend
npm install
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=http://YOUR_EC2_IP:3000
EOF
npm run build
pm2 start npm --name frontend -- start

# Save PM2 configuration
pm2 save
pm2 startup  # Run the command it outputs
```

### Step 4: Install Nginx (5 min)
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/fyp
```

Paste:
```nginx
server {
    listen 80;
    server_name YOUR_EC2_IP;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /api {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    client_max_body_size 10M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/fyp /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### Step 5: Test (2 min)
- Open browser: `http://YOUR_EC2_IP`
- Should see login page
- Try logging in with super admin credentials

---

## 🔑 Environment Variables Quick Reference

### Backend (.env)
```bash
# REQUIRED
PORT=3000
NODE_ENV=production
FRONTEND_URL=http://YOUR_EC2_IP:3001
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=fyp_user
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD
DB_NAME=fyp_db
JWT_SECRET=MINIMUM_32_RANDOM_CHARACTERS
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-gmail-app-password
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=SECURE_ADMIN_PASSWORD
```

### Frontend (.env.production)
```bash
# REQUIRED
NEXT_PUBLIC_API_URL=http://YOUR_EC2_IP:3000
```

---

## 🛠️ Essential Commands

### Check Status
```bash
pm2 status           # Check if apps are running
pm2 logs             # View logs
pm2 monit            # Monitor resources
```

### Restart Apps
```bash
pm2 restart backend
pm2 restart frontend
pm2 restart all
```

### Update Code
```bash
cd ~/app
git pull
cd backend && npm install && npm run build && pm2 restart backend
cd ../frontend && npm install && npm run build && pm2 restart frontend
```

### View Logs
```bash
pm2 logs backend --lines 100
pm2 logs frontend --lines 100
sudo tail -f /var/log/nginx/error.log
```

---

## 🚨 Common Issues & Fixes

### Backend won't start
```bash
# Check logs
pm2 logs backend --lines 50

# Common fixes:
# 1. Database connection
sudo systemctl status postgresql
psql -h localhost -U fyp_user -d fyp_db

# 2. Missing environment variables
cat ~/app/backend/.env

# 3. Port already in use
sudo lsof -i :3000
```

### Frontend won't start
```bash
# Check logs
pm2 logs frontend --lines 50

# Common fixes:
# 1. Build failed
cd ~/app/frontend
rm -rf .next
npm run build

# 2. Environment variable
cat .env.production
```

### 502 Bad Gateway
```bash
# Check if apps are running
pm2 status

# Restart if needed
pm2 restart all

# Check Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### CORS errors in browser console
```bash
# Verify backend FRONTEND_URL matches frontend URL EXACTLY
# No trailing slashes!
# ✅ http://example.com
# ❌ http://example.com/
```

---

## ✅ Success Checklist

After deployment, verify:
- [ ] `pm2 status` shows both apps "online"
- [ ] Can access frontend in browser
- [ ] Login page loads without errors
- [ ] Can log in with super admin credentials
- [ ] Dashboard loads correctly
- [ ] File upload works (accountant page)
- [ ] No console errors in browser
- [ ] `pm2 logs` shows no critical errors

---

## 📞 Need Help?

1. Check `PRODUCTION_DEPLOYMENT_CHECKLIST.md` for detailed troubleshooting
2. Check `REFACTORING_SUMMARY.md` for what changed and why
3. Review logs: `pm2 logs --lines 200`
4. Verify environment variables are correct

---

## 🎯 Next Steps After Deployment

### Optional but Recommended:

1. **Set up HTTPS** (if using domain)
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d yourdomain.com
   ```

2. **Set up firewall**
   ```bash
   sudo ufw allow OpenSSH
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```

3. **Set up database backups**
   ```bash
   # Add to crontab
   0 2 * * * pg_dump fyp_db > ~/backups/fyp_$(date +\%Y\%m\%d).sql
   ```

4. **Monitor disk space**
   ```bash
   df -h
   # If /tmp fills up, ClamAV scanning will fail
   ```

---

**Status:** ✅ PRODUCTION READY  
**Build Verified:** ✅ Both apps build successfully  
**Deploy Time:** ~30 minutes for first deployment  
**Update Time:** ~5 minutes for code updates  

---

**Questions? Issues? Check the comprehensive guides:**
- `PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Detailed deployment guide
- `REFACTORING_SUMMARY.md` - All changes explained
