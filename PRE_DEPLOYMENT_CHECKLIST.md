# ✅ PRE-DEPLOYMENT CHECKLIST

**Run this checklist BEFORE first deployment to EC2**

---

## 🟡 EC2 INSTANCE SETUP

### Instance Configuration
- [ ] EC2 instance launched (Ubuntu 20.04+ or Amazon Linux 2)
- [ ] Instance type: t3.medium or larger (minimum 2GB RAM)
- [ ] Storage: 20GB+ SSD

### Security Group Rules
- [ ] Port 22 (SSH) - Your IP only
- [ ] Port 80 (HTTP) - 0.0.0.0/0
- [ ] Port 443 (HTTPS) - 0.0.0.0/0
- [ ] Port 3000 (Backend) - localhost only (for testing)
- [ ] Port 3001 (Frontend) - localhost only (for testing)

### SSH Access
- [ ] Can SSH into instance: `ssh -i your-key.pem ubuntu@YOUR_EC2_IP`
- [ ] Key permissions correct: `chmod 400 your-key.pem`

---

## 🟡 SYSTEM DEPENDENCIES

### Node.js
```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs build-essential
```
- [ ] Node.js installed: `node --version` (should show v20.x.x)
- [ ] npm installed: `npm --version` (should show v10.x.x)

### PM2
```bash
sudo npm install -g pm2
```
- [ ] PM2 installed: `pm2 --version`
- [ ] PM2 startup configured: `pm2 startup` (run the command it outputs)

### PostgreSQL
```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```
- [ ] PostgreSQL installed: `psql --version`
- [ ] PostgreSQL running: `sudo systemctl status postgresql`
- [ ] Database created:
  ```bash
  sudo -u postgres psql -c "CREATE DATABASE fyp_db;"
  sudo -u postgres psql -c "CREATE USER fyp_user WITH PASSWORD 'secure_password';"
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE fyp_db TO fyp_user;"
  ```
- [ ] Can connect: `psql -h localhost -U fyp_user -d fyp_db`

### ClamAV
```bash
sudo apt install -y clamav clamav-daemon
sudo systemctl stop clamav-freshclam
sudo freshclam  # This takes 5-10 minutes
sudo systemctl start clamav-freshclam
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```
- [ ] ClamAV installed: `clamscan --version`
- [ ] ClamAV daemon running: `sudo systemctl status clamav-daemon`
- [ ] Virus definitions updated: `sudo freshclam` (no errors)

### Nginx
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```
- [ ] Nginx installed: `nginx -v`
- [ ] Nginx running: `sudo systemctl status nginx`
- [ ] Default page loads: `curl http://localhost`

### Git
```bash
sudo apt install -y git
```
- [ ] Git installed: `git --version`

---

## 🟡 ENVIRONMENT VARIABLES

### Backend .env
- [ ] File created: `backend/.env`
- [ ] `NODE_ENV=production` ✅
- [ ] `PORT=3000` ✅
- [ ] `FRONTEND_URL` set to actual frontend URL (NO trailing slash) ✅
- [ ] `DB_HOST` set correctly (localhost or RDS) ✅
- [ ] `DB_PORT=5432` ✅
- [ ] `DB_USERNAME` set ✅
- [ ] `DB_PASSWORD` is strong and secure ✅
- [ ] `DB_NAME=fyp_db` ✅
- [ ] `JWT_SECRET` is 32+ characters (generated with `openssl rand -base64 32`) ✅
- [ ] `EMAIL_USER` is Gmail address ✅
- [ ] `EMAIL_PASS` is Gmail App Password (NOT regular password) ✅
- [ ] `ADMIN_EMAIL` set ✅
- [ ] `ADMIN_PASSWORD` is strong and secure ✅
- [ ] NO hardcoded localhost in any value ✅
- [ ] NO trailing slashes in URLs ✅

### Frontend .env.production
- [ ] File created: `frontend/.env.production`
- [ ] `NEXT_PUBLIC_API_URL` set to backend URL (NO trailing slash) ✅
- [ ] URL is accessible from browser (not localhost if using domain) ✅

### Environment Variable Validation
```bash
# Backend
cat backend/.env | grep -v '^#' | grep -v '^$'

# Frontend
cat frontend/.env.production | grep -v '^#' | grep -v '^$'
```
- [ ] No empty values
- [ ] No placeholder text (like "CHANGE_THIS")
- [ ] URLs match between frontend and backend CORS config

---

## 🟡 DOMAIN / DNS CONFIGURATION

### DNS Records
- [ ] A record: `yourdomain.com` → EC2 IP
- [ ] A record: `www.yourdomain.com` → EC2 IP
- [ ] A record: `api.yourdomain.com` → EC2 IP
- [ ] DNS propagation complete: `nslookup yourdomain.com`

### Domain Verification
```bash
# Check DNS resolution
dig yourdomain.com +short
dig www.yourdomain.com +short
dig api.yourdomain.com +short
```
- [ ] All return EC2 IP address

---

## 🟡 CODE REPOSITORY

### Git Repository
- [ ] Repository pushed to git (GitHub, GitLab, Bitbucket, etc.)
- [ ] All production files committed:
  - [ ] ecosystem.config.js
  - [ ] nginx.conf
  - [ ] .env.production.backend.example
  - [ ] .env.production.frontend.example
  - [ ] DEPLOYMENT.md
  - [ ] All application code
- [ ] .gitignore includes:
  - [ ] .env
  - [ ] .env.production
  - [ ] .env.local
  - [ ] node_modules/
  - [ ] dist/
  - [ ] .next/
  - [ ] logs/

### Repository Access
- [ ] Can clone from EC2: `git clone YOUR_REPO_URL`
- [ ] SSH keys configured (if using private repo)

---

## 🟡 BUILD VERIFICATION (Local)

### Backend Build
```bash
cd backend
npm install
npm run build
```
- [ ] Build succeeds without errors
- [ ] `dist/main.js` exists

### Frontend Build
```bash
cd frontend
npm install
npm run build
```
- [ ] Build succeeds without errors
- [ ] `.next/` directory created
- [ ] No "window is not defined" errors
- [ ] No "useSearchParams" errors
- [ ] No SSR-related errors

---

## 🟡 SECURITY CHECKLIST

### Passwords & Secrets
- [ ] JWT_SECRET is strong (32+ chars, random)
- [ ] DB_PASSWORD is strong
- [ ] ADMIN_PASSWORD is strong
- [ ] EMAIL_PASS is Gmail App Password
- [ ] No secrets in git repository
- [ ] .env files in .gitignore

### SSL/HTTPS (Optional but Recommended)
- [ ] Domain ownership verified
- [ ] Certbot installed: `sudo apt install certbot python3-certbot-nginx`
- [ ] Ready to run: `sudo certbot --nginx -d yourdomain.com`

### Firewall
```bash
sudo ufw status
```
- [ ] UFW configured or AWS Security Groups properly set

---

## 🟡 APPLICATION CONFIGURATION

### Backend Verification
- [ ] `backend/src/main.ts` binds to `0.0.0.0` (not `localhost`)
- [ ] CORS configured with `FRONTEND_URL` from environment
- [ ] JWT secret from environment (not hardcoded)
- [ ] Database synchronize disabled in production

### Frontend Verification
- [ ] All pages with auth have `export const dynamic = 'force-dynamic'`
- [ ] Browser APIs (localStorage, window) only in useEffect
- [ ] `useSearchParams` wrapped in Suspense
- [ ] API calls use `NEXT_PUBLIC_API_URL`

---

## 🟡 FINAL PRE-DEPLOYMENT CHECKS

### Disk Space
```bash
df -h
```
- [ ] At least 10GB free space available

### Memory
```bash
free -h
```
- [ ] At least 1GB RAM available

### System Updates
```bash
sudo apt update && sudo apt upgrade -y
```
- [ ] System packages up to date

### Logs Directory
```bash
mkdir -p ~/app/logs
```
- [ ] Logs directory created

---

## ✅ READY FOR DEPLOYMENT

If ALL items above are checked, you are ready to:

1. SSH into EC2
2. Clone repository
3. Copy .env files
4. Build applications
5. Start with PM2
6. Configure Nginx
7. Test deployment

Proceed to **POST-DEPLOYMENT CHECKLIST** after deployment.

---

**Checklist Version:** 1.0.0  
**Last Updated:** December 19, 2025
