# EC2 Setup Action Checklist

Follow these steps in order to get your FYP system running on EC2.

## ✅ STEP 1: Pull Latest Code from GitHub

```bash
cd /path/to/fyp_system
git pull origin main
```

**Expected**: Should see the setup scripts and database configuration files.

```bash
# Verify these files exist:
ls -la quick-setup-db.sh
ls -la setup-database.sh
ls -la complete-ec2-setup.sh
ls -la EC2_COMPLETE_SETUP.md
```

## ✅ STEP 2: Make Scripts Executable

```bash
chmod +x quick-setup-db.sh
chmod +x setup-database.sh
chmod +x complete-ec2-setup.sh
```

## ✅ STEP 3: Set Up PostgreSQL Database

```bash
# Navigate to your fyp_system directory
cd /path/to/fyp_system

# Run the quick setup script
./quick-setup-db.sh
```

**Expected Output**:
```
🔧 FYP System Database Quick Setup
✅ PostgreSQL is running
✅ Database fyp_db created (or already exists)
✅ Successfully connected to fyp_db
```

**If you see errors**, run the complete setup with verbose output:

```bash
./setup-database.sh -v
```

## ✅ STEP 4: Verify Database Setup

```bash
# Connect to the database and check tables exist
psql -U postgres -d fyp_db -c "\dt"
```

**Expected**: Should show tables like:
- users
- revenue_record
- accounting tables
- etc.

## ✅ STEP 5: Set Up Environment Variables

### Backend `.env`

```bash
cat > backend/.env << 'EOF'
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=fyp_db
JWT_SECRET=your_jwt_secret_here_change_in_production
JWT_EXPIRATION=86400
FRONTEND_URL=http://YOUR_EC2_IP:3000
BACKEND_API_URL=http://YOUR_EC2_IP:3001
NODE_ENV=production
EOF
```

**Replace `YOUR_EC2_IP`** with your actual EC2 IP address.

### Frontend `.env.local`

```bash
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://YOUR_EC2_IP:3001
NEXT_PUBLIC_APP_URL=http://YOUR_EC2_IP:3000
EOF
```

**Replace `YOUR_EC2_IP`** with your actual EC2 IP address.

## ✅ STEP 6: Install Dependencies

```bash
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

## ✅ STEP 7: Build Applications

```bash
# Backend
cd backend
npm run build
cd ..

# Frontend
cd frontend
npm run build
cd ..
```

## ✅ STEP 8: Start Services with PM2

```bash
# Install PM2 if needed
sudo npm install -g pm2

# Start services
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Check status
pm2 list
```

**Expected**: Both backend and frontend should be in "online" state.

## ✅ STEP 9: Verify Services

### Check Backend API

```bash
curl http://localhost:3001/api/health
```

**Expected**: `{"status":"ok"}` (or similar success response)

### Check Database Connection

```bash
curl http://localhost:3001/api/users/me -H "Authorization: Bearer YOUR_TOKEN"
```

### Check Frontend

Open browser and go to: `http://YOUR_EC2_IP:3000`

**Expected**: Login page loads

## ✅ STEP 10: Test Revenue Edit/Delete Functionality

1. **Login** as an accountant user
2. **Navigate** to Revenue section
3. **Create** a new revenue record
4. **Verify** Edit and Delete buttons appear on your record
5. **Verify** Edit/Delete buttons don't appear on other users' records
6. **Test** editing your record - it should work
7. **Test** deleting your record - it should work

## ✅ STEP 11: Monitor Logs

If anything doesn't work, check logs:

```bash
# View all logs
pm2 logs

# View backend logs specifically
pm2 logs backend --lines 50

# View frontend logs specifically
pm2 logs frontend --lines 50
```

## 🔧 Troubleshooting

### Issue: "database does not exist"

```bash
./quick-setup-db.sh
```

### Issue: Backend won't start

```bash
pm2 logs backend --lines 50
# Check:
# - Database is running: systemctl status postgresql
# - Environment variables are set: cat backend/.env
# - Port 3001 is free: lsof -i :3001
```

### Issue: Frontend won't load

```bash
pm2 logs frontend --lines 50
# Check:
# - Frontend built: ls -la frontend/.next
# - Backend is running: pm2 list
# - NEXT_PUBLIC_API_URL is correct in frontend/.env.local
```

### Issue: Can't edit/delete revenue records

```bash
# Check logs
pm2 logs backend --lines 100

# Verify database has correct ownership
psql -U postgres -d fyp_db -c "SELECT id, created_by_user_id, created_by FROM revenue_record LIMIT 5;"
```

## 📋 Quick Reference Commands

```bash
# View all services
pm2 list

# Restart all services
pm2 restart all

# Stop all services
pm2 stop all

# View real-time logs
pm2 logs --stream

# Check if ports are listening
netstat -tuln | grep -E '3000|3001|5432'

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check PostgreSQL status
sudo systemctl status postgresql

# Connect to database
psql -U postgres -d fyp_db

# View PM2 processes
pm2 monit
```

## ⏱️ Estimated Time

- Database setup: 2-5 minutes
- Dependencies install: 5-10 minutes
- Building applications: 5-15 minutes
- Starting services: 1-2 minutes
- **Total: 15-35 minutes**

## ✨ Next Steps

After successful setup:

1. Create test users
2. Test revenue records
3. Verify edit/delete works
4. Set up monitoring
5. Configure backups
6. Set up SSL/HTTPS (optional but recommended)

---

**For detailed information**, see `EC2_COMPLETE_SETUP.md`
