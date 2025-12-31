# 🚀 Quick EC2 Deployment Steps

**Date:** January 1, 2026  
**Purpose:** Deploy backend fixes (5 roles, secure JWT, network binding, file storage)

## Part 1: Commit Changes (Local Machine)

```bash
cd /Users/jw/fyp_system

# Check what changed
git status

# Add all changes
git add .

# Commit
git commit -m "Fix backend: 5 roles, secure JWT, network binding, migrations"

# Push to GitHub
git push origin main
```

## Part 2: Deploy to EC2

### 1️⃣ SSH into EC2

```bash
# Replace with your actual EC2 details
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip-address
```

### 2️⃣ Pull and Deploy

```bash
# Pull latest code
cd ~/fyp_system
git pull origin main

# Run deployment script
chmod +x deploy-ec2-backend.sh
./deploy-ec2-backend.sh
```

### 3️⃣ Generate Secure JWT Secret

```bash
# Generate secure random string
openssl rand -base64 32
```

**Copy the output!** You'll use it in the next step.

### 4️⃣ Update Environment Variables

```bash
cd ~/fyp_system/backend
nano .env
```

**Update these lines:**

```env
NODE_ENV=production

# Your actual PostgreSQL password
DB_PASSWORD=your_actual_password_here

# Paste the JWT secret from step 3
JWT_SECRET=paste_secure_jwt_secret_here

# Choose a strong admin password
ADMIN_PASSWORD=YourStrongPassword123!

# If you have a domain, update this
FRONTEND_URL=http://your-ec2-ip:3001
```

Save: `Ctrl+X`, then `Y`, then `Enter`

### 5️⃣ Restart Backend

```bash
cd ~/fyp_system
pm2 restart backend

# Verify it's running
pm2 logs backend --lines 20
```

### 6️⃣ Verify Deployment

```bash
# Check backend is online
pm2 list

# Test API endpoint
curl http://localhost:3000/auth/login

# Should see: {"statusCode":400,"message":"Invalid credentials"}
# (This is good - means backend is responding!)
```

## Part 3: Test in Browser

1. Navigate to: `http://your-ec2-ip:3001`
2. Login as admin: `admin@example.com` / (password from .env)
3. Test file upload/download functionality

## 🎉 Done!

Your backend is now deployed with:
- ✅ Only 5 roles (super_admin, accountant, human_resources, marketing, sales_department)
- ✅ Secure JWT secret
- ✅ Network bound to 0.0.0.0:3000 (accessible to frontend)
- ✅ File storage in database (BYTEA)

## 📊 Useful Commands

```bash
# View logs
pm2 logs backend

# Restart backend
pm2 restart backend

# Check backend status
pm2 list

# View last 50 lines of logs
pm2 logs backend --lines 50
```

## ❗ Troubleshooting

**Backend won't start?**
```bash
pm2 logs backend --err
lsof -i :3000
```

**Database error?**
```bash
sudo systemctl status postgresql
psql -U ubuntu -d fyp_db -c "SELECT 1;"
```

**Frontend can't connect?**
```bash
# Make sure NODE_ENV=production in .env
cat ~/fyp_system/backend/.env | grep NODE_ENV
pm2 logs backend | grep "listening"
# Should show: http://0.0.0.0:3000
```

## 📞 Need Help?

Check the full deployment guide:
- `/Users/jw/fyp_system/EC2_DEPLOYMENT_GUIDE.md` (comprehensive guide)
- `/Users/jw/fyp_system/BACKEND_FIX_SUMMARY.md` (what was fixed)
