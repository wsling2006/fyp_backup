# 🚀 AWS EC2 Production Deployment Checklist

## ✅ PRE-DEPLOYMENT VERIFICATION

### 1. Environment Variables Setup

#### Frontend (.env.production)
```bash
# Create this file before building
NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP:3000
# OR for domain:
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

#### Backend (.env or .env.production)
```bash
# Server
PORT=3000
NODE_ENV=production

# CORS - MUST match frontend URL
FRONTEND_URL=http://YOUR_EC2_PUBLIC_IP:3001
# OR: FRONTEND_URL=https://yourdomain.com

# Database (RDS or local PostgreSQL)
DB_HOST=localhost  # or RDS endpoint
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=YOUR_SECURE_DB_PASSWORD
DB_NAME=fyp_db

# JWT - Generate a strong 32+ character secret
JWT_SECRET=YOUR_SECURE_JWT_SECRET_MIN_32_CHARS

# Email (Gmail SMTP)
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-app-specific-password

# Admin Account
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YOUR_SECURE_ADMIN_PASSWORD
```

### 2. Security Hardening

- [ ] JWT_SECRET is a strong random string (32+ characters)
- [ ] All passwords are strong and unique
- [ ] Database password is secure
- [ ] Gmail App Password is set up (not regular password)
- [ ] CORS origin matches frontend URL exactly
- [ ] synchronize is disabled in production (via NODE_ENV=production)

### 3. Code Quality Checks

- [ ] No console.log in production code (or use proper logging)
- [ ] All TypeScript errors resolved
- [ ] All ESLint warnings addressed
- [ ] No hardcoded localhost URLs
- [ ] All browser globals (window, document, localStorage) are in useEffect or client components
- [ ] All pages using auth have `export const dynamic = 'force-dynamic'`

---

## 🏗️ EC2 INSTANCE SETUP

### 1. Launch EC2 Instance
```bash
# Recommended: Ubuntu 22.04 LTS
# Instance Type: t3.medium or larger (2GB+ RAM for build)
# Security Group: Allow ports 22, 80, 443, 3000, 3001
```

### 2. Initial Server Configuration
```bash
# SSH into instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version  # Should show v20.x.x
npm --version   # Should show v10.x.x

# Install build essentials
sudo apt install -y build-essential
```

### 3. Install PostgreSQL
```bash
# Install PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql
```

```sql
-- In PostgreSQL shell
CREATE DATABASE fyp_db;
CREATE USER fyp_user WITH ENCRYPTED PASSWORD 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE fyp_db TO fyp_user;
\q
```

### 4. Install ClamAV (for malware scanning)
```bash
# Install ClamAV
sudo apt install -y clamav clamav-daemon

# Update virus definitions (this takes 5-10 minutes)
sudo systemctl stop clamav-freshclam
sudo freshclam
sudo systemctl start clamav-freshclam

# Start ClamAV daemon
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon

# Verify it's running
sudo systemctl status clamav-daemon
```

### 5. Install PM2 (Process Manager)
```bash
# Install PM2 globally
sudo npm install -g pm2

# Configure PM2 to start on boot
pm2 startup
# Run the command it outputs (starts with 'sudo')
```

---

## 📦 APPLICATION DEPLOYMENT

### 1. Clone Repository
```bash
# Create app directory
mkdir -p ~/app
cd ~/app

# Clone your repository
git clone YOUR_REPO_URL .
# OR upload via SCP/SFTP
```

### 2. Backend Setup
```bash
cd ~/app/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
# Paste your production environment variables
# Save: Ctrl+O, Enter, Ctrl+X

# Build the application
npm run build

# Run database migrations (if you have any)
# npm run typeorm migration:run

# Test run (verify no errors)
node dist/main.js
# Press Ctrl+C after confirming it starts

# Start with PM2
pm2 start dist/main.js --name backend
pm2 save
```

### 3. Frontend Setup
```bash
cd ~/app/frontend

# Install dependencies
npm install

# Create .env.production file
nano .env.production
# Add: NEXT_PUBLIC_API_URL=http://YOUR_EC2_IP:3000
# Save: Ctrl+O, Enter, Ctrl+X

# Build the application
npm run build

# Test run
npm run start
# Press Ctrl+C after confirming it starts

# Start with PM2
pm2 start npm --name frontend -- start
pm2 save
```

### 4. Verify Both Apps Running
```bash
# Check PM2 status
pm2 status

# Should show:
# ┌─────┬────────────┬─────────┬───────┬────────┐
# │ id  │ name       │ status  │ cpu   │ memory │
# ├─────┼────────────┼─────────┼───────┼────────┤
# │ 0   │ backend    │ online  │ 0%    │ 50.0mb │
# │ 1   │ frontend   │ online  │ 0%    │ 150mb  │
# └─────┴────────────┴─────────┴───────┴────────┘

# View logs
pm2 logs backend --lines 50
pm2 logs frontend --lines 50
```

---

## 🌐 NGINX REVERSE PROXY SETUP

### 1. Install Nginx
```bash
sudo apt install -y nginx
```

### 2. Configure Nginx
```bash
sudo nano /etc/nginx/sites-available/fyp
```

Paste this configuration:
```nginx
# Backend API
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # Backend API
    location /api {
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Frontend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Increase upload size for file uploads
    client_max_body_size 10M;
}
```

### 3. Enable Configuration
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/fyp /etc/nginx/sites-enabled/

# Remove default config
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

---

## 🔒 SSL/HTTPS SETUP (Optional but Recommended)

### Using Let's Encrypt (Free SSL)
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

### Update Environment Variables for HTTPS
After SSL is configured:
```bash
# Backend .env
FRONTEND_URL=https://yourdomain.com

# Frontend .env.production
NEXT_PUBLIC_API_URL=https://yourdomain.com/api
```

Rebuild and restart:
```bash
cd ~/app/backend && npm run build && pm2 restart backend
cd ~/app/frontend && npm run build && pm2 restart frontend
```

---

## 🔥 FIREWALL CONFIGURATION

```bash
# Enable UFW
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verify
sudo ufw status
```

---

## 📊 MONITORING & MAINTENANCE

### View Application Logs
```bash
# Real-time logs
pm2 logs

# Backend logs only
pm2 logs backend

# Frontend logs only
pm2 logs frontend

# Show last 100 lines
pm2 logs --lines 100
```

### System Monitoring
```bash
# PM2 dashboard
pm2 monit

# System resources
htop
# Install if needed: sudo apt install htop
```

### Restart Applications
```bash
# Restart backend
pm2 restart backend

# Restart frontend
pm2 restart frontend

# Restart all
pm2 restart all

# Reload without downtime
pm2 reload all
```

### Update Application Code
```bash
# Pull latest changes
cd ~/app
git pull

# Backend
cd backend
npm install --production
npm run build
pm2 restart backend

# Frontend
cd ../frontend
npm install
npm run build
pm2 restart frontend
```

---

## 🧪 POST-DEPLOYMENT TESTING

### 1. Health Checks
- [ ] Frontend loads at http://YOUR_EC2_IP or https://yourdomain.com
- [ ] Backend API responds at http://YOUR_EC2_IP:3000 or https://yourdomain.com/api
- [ ] Login page loads without errors
- [ ] Can create a new user
- [ ] Can log in with super admin account
- [ ] Dashboard loads correctly based on role

### 2. Feature Testing
- [ ] File upload works (accountant dashboard)
- [ ] ClamAV scans files (check logs: `pm2 logs backend | grep -i clam`)
- [ ] Email sending works (forgot password, OTP, etc.)
- [ ] Role-based access control works
- [ ] Account lockout after failed logins works
- [ ] MFA/OTP flow works
- [ ] Password reset works
- [ ] Super admin can create users
- [ ] Super admin can suspend/unsuspend users

### 3. Security Testing
- [ ] JWT tokens are validated
- [ ] Unauthorized access is blocked
- [ ] CORS is properly configured
- [ ] File upload rejects malware (test with EICAR test file)
- [ ] SQL injection is prevented (TypeORM handles this)
- [ ] XSS is prevented (React handles this)

### 4. Performance Testing
- [ ] Page load times are acceptable
- [ ] File uploads complete within timeout
- [ ] Database queries are fast
- [ ] No memory leaks (monitor with `pm2 monit`)

---

## 🆘 TROUBLESHOOTING

### Frontend Build Fails
```bash
# Check Node version
node --version  # Should be 20.x

# Clear Next.js cache
rm -rf .next
npm run build

# Check for SSR errors
npm run build 2>&1 | grep -i error
```

### Backend Won't Start
```bash
# Check logs
pm2 logs backend --lines 100

# Common issues:
# - Database connection: Check DB_HOST, DB_PORT, credentials
# - Port in use: Check if port 3000 is available
# - Missing env vars: Ensure .env file exists and is complete
```

### Database Connection Issues
```bash
# Test PostgreSQL connection
psql -h localhost -U fyp_user -d fyp_db

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### ClamAV Issues
```bash
# Check if ClamAV daemon is running
sudo systemctl status clamav-daemon

# Update virus definitions
sudo freshclam

# Check ClamAV logs
sudo tail -f /var/log/clamav/clamav.log
```

### CORS Errors
```bash
# Verify FRONTEND_URL in backend .env matches exactly
# Common mistakes:
# ❌ http://example.com/ (trailing slash)
# ❌ http://example.com:80 (unnecessary port for default HTTP)
# ✅ http://example.com
# ✅ https://example.com
```

### 502 Bad Gateway (Nginx)
```bash
# Check if backend/frontend are running
pm2 status

# Restart services
pm2 restart all

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

---

## 📝 MAINTENANCE TASKS

### Daily
- [ ] Check PM2 status: `pm2 status`
- [ ] Monitor disk space: `df -h`
- [ ] Check application logs for errors

### Weekly
- [ ] Update virus definitions: `sudo freshclam`
- [ ] Review security logs
- [ ] Check for application updates: `git pull`

### Monthly
- [ ] Update system packages: `sudo apt update && sudo apt upgrade`
- [ ] Review and rotate logs
- [ ] Backup database: `pg_dump fyp_db > backup_$(date +%Y%m%d).sql`
- [ ] Test disaster recovery procedures

---

## 🎯 SUCCESS CRITERIA

Your deployment is successful when:

1. ✅ Both frontend and backend are running via PM2
2. ✅ Applications restart automatically on reboot
3. ✅ All environment variables are properly set
4. ✅ Database is accessible and seeded with super admin
5. ✅ ClamAV is running and scanning uploaded files
6. ✅ Email notifications are being sent
7. ✅ HTTPS is configured (if using a domain)
8. ✅ All features work as expected in production
9. ✅ Logs show no critical errors
10. ✅ Application is accessible from external network

---

## 📞 SUPPORT

If you encounter issues:

1. Check the troubleshooting section above
2. Review PM2 logs: `pm2 logs --lines 200`
3. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
4. Verify environment variables are correct
5. Ensure all services are running: `pm2 status`, `sudo systemctl status postgresql nginx clamav-daemon`

---

**Last Updated:** December 19, 2025  
**Version:** 1.0.0  
**Status:** Production Ready ✅
