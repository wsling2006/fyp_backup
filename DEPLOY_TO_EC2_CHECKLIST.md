# 🚀 EC2 Deployment Checklist - Announcement System

**Purpose:** Deploy the complete announcement system (v1.7) to EC2 production environment.

---

## ✅ **Pre-Deployment Checklist**

- [x] All code committed and pushed to GitHub
- [x] Backend builds successfully (`npm run build`)
- [x] Frontend builds successfully (`npm run build`)
- [x] TypeScript checks pass (no errors)
- [x] Documentation complete
- [x] Database migration files ready

---

## 🔧 **Step 1: Connect to EC2**

```bash
# Replace with your actual EC2 instance details
ssh -i /path/to/your-key.pem ec2-user@your-ec2-public-ip

# Or if you have SSH config set up:
ssh ec2-instance-name
```

---

## 📥 **Step 2: Pull Latest Code**

```bash
# Navigate to project directory
cd /path/to/fyp_system

# Check current branch
git branch

# Pull latest changes
git pull origin main

# Verify you have the latest code
git log --oneline -5
```

**Expected commits:**
- `docs: add comprehensive announcement system status report`
- `docs: add comprehensive comment edit/delete feature documentation`
- `feat: implement comment edit and delete functionality`
- And earlier announcement system commits

---

## 🗄️ **Step 3: Run Database Migrations**

```bash
# Navigate to backend directory
cd backend

# Check migration status
npm run migration:show

# Run pending migrations
npm run migration:run

# Expected migrations to run:
# - DropFileHashUnique (if not already run)
# - CreateAnnouncementTables (if fresh install)
# - AddFileHashColumn (if fresh install)
```

**Verify migration success:**
```bash
# Check PostgreSQL directly
psql -U postgres -d your_database_name

# Check announcements table
\d announcements

# Check announcement_comments table (should have deletedAt column)
\d announcement_comments

# Check announcement_files table (file_hash should NOT have UNIQUE constraint)
\d announcement_files

# Exit psql
\q
```

---

## 🏗️ **Step 4: Install Dependencies (if needed)**

```bash
# Backend dependencies
cd backend
npm install

# Frontend dependencies
cd ../frontend
npm install
```

---

## 🔨 **Step 5: Build Backend**

```bash
cd backend
npm run build

# Check for build errors
# If successful, you should see "nest build" complete without errors
```

**If build fails:**
- Check Node.js version: `node --version` (should be v18+)
- Check npm version: `npm --version`
- Check for TypeScript errors: `npx tsc --noEmit`

---

## 🔨 **Step 6: Build Frontend**

```bash
cd frontend
npm run build

# Check for build errors
# If successful, you should see Next.js build output with all routes
```

**Expected routes:**
- `/announcements` (○ Static)
- `/announcements/[id]` (ƒ Dynamic)
- `/announcements/[id]/edit` (ƒ Dynamic)
- `/announcements/create` (○ Static)

**If build fails:**
- Clear Next.js cache: `rm -rf .next`
- Check environment variables: `cat .env.local`
- Rebuild: `npm run build`

---

## 🔄 **Step 7: Restart Services**

### **Option A: Using PM2 (Recommended)**

```bash
# Restart backend
cd backend
pm2 restart backend

# Verify backend is running
pm2 status
pm2 logs backend --lines 20

# Restart frontend
cd ../frontend
pm2 restart frontend

# Verify frontend is running
pm2 status
pm2 logs frontend --lines 20
```

### **Option B: Manual Start (if not using PM2)**

```bash
# Start backend
cd backend
npm run start:prod &

# Start frontend
cd ../frontend
npm run start &
```

---

## 🧪 **Step 8: Verify Deployment**

### **8.1 Check Backend Health**

```bash
# Test backend API
curl http://localhost:3000/api/health

# Test announcements endpoint (should require auth)
curl http://localhost:3000/api/announcements
```

### **8.2 Check Frontend**

```bash
# Open browser and navigate to:
http://your-ec2-public-ip:3001

# Or if you have domain set up:
https://your-domain.com
```

### **8.3 Test Key Features**

**Login as HR:**
1. Navigate to `/login`
2. Login with HR credentials
3. Go to `/announcements`
4. Click "Create Announcement"

**Test Multi-File Upload:**
1. Click "Choose Files" button
2. Select 2-3 files
3. Click "Choose Files" again
4. Select 2-3 more files
5. Verify all files are listed
6. Click "X" on one file to remove it
7. Click "Clear All" to remove all files
8. Re-select files and submit

**Test Virus Detection (Optional):**
```bash
# Create EICAR test virus file
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > eicar.txt

# Upload this file with your announcement
# It should be blocked, but other clean files should upload successfully
```

**Test Edit Announcement:**
1. In announcements list, click "Edit" button (top right of card)
2. Modify title or content
3. Submit
4. Verify changes appear
5. Check audit log in database

**Test Comments:**
1. Open an announcement detail page
2. Add a comment
3. Click "Edit" on your comment
4. Modify the text and click "Save"
5. Verify edit appears
6. Click "Delete" on your comment
7. Verify comment is removed (soft deleted)

**Test Urgent Modal:**
1. Create an announcement with "Urgent" priority
2. Logout and login again
3. Navigate to dashboard
4. Verify urgent modal appears

**Test Toast Notifications:**
- Create announcement → Success toast
- Delete announcement → Success toast
- Upload virus file → Error toast with file name
- Edit announcement → Success toast

---

## 📊 **Step 9: Monitor Logs**

### **PM2 Logs**

```bash
# Watch backend logs in real-time
pm2 logs backend

# Watch frontend logs in real-time
pm2 logs frontend

# View last 100 lines of backend logs
pm2 logs backend --lines 100
```

### **PostgreSQL Logs (if needed)**

```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### **ClamAV Logs (Virus Scanning)**

```bash
# Check ClamAV service
sudo systemctl status clamav-daemon

# View ClamAV logs
sudo tail -f /var/log/clamav/clamav.log
```

---

## 🐛 **Troubleshooting**

### **Backend won't start:**
```bash
# Check Node.js version
node --version  # Should be v18 or higher

# Check environment variables
cd backend
cat .env

# Required variables:
# - DATABASE_HOST
# - DATABASE_PORT
# - DATABASE_USER
# - DATABASE_PASSWORD
# - DATABASE_NAME
# - JWT_SECRET

# Test database connection
psql -U postgres -d your_database_name
```

### **Frontend won't build:**
```bash
# Clear cache and reinstall
cd frontend
rm -rf .next node_modules package-lock.json
npm install
npm run build
```

### **File uploads fail:**
```bash
# Check upload directory permissions
cd backend
ls -la uploads/

# Should be writable by the backend process
# If not, fix permissions:
chmod -R 755 uploads/
```

### **Virus scanning fails:**
```bash
# Check ClamAV is running
sudo systemctl status clamav-daemon

# If not running, start it:
sudo systemctl start clamav-daemon

# Update virus definitions
sudo freshclam
```

### **Database migration fails:**
```bash
# Check migration status
cd backend
npm run migration:show

# If migration already applied, you'll see:
# [X] DropFileHashUnique

# If you need to revert and re-run:
npm run migration:revert
npm run migration:run

# Or manually fix in PostgreSQL:
psql -U postgres -d your_database_name
ALTER TABLE announcement_files DROP CONSTRAINT IF EXISTS UQ_file_hash;
\q
```

---

## 🔐 **Step 10: Security Checks**

```bash
# Ensure sensitive files are not exposed
ls -la backend/.env
ls -la frontend/.env.local

# Permissions should be 600 or 644 (not 777)
chmod 600 backend/.env
chmod 600 frontend/.env.local

# Check firewall rules
sudo iptables -L

# Only necessary ports should be open:
# - 22 (SSH)
# - 80 (HTTP)
# - 443 (HTTPS)
# - 3000 (Backend - should be internal only)
# - 3001 (Frontend - can be public or behind reverse proxy)
```

---

## 📝 **Step 11: Final Verification**

### **Database Check**

```bash
psql -U postgres -d your_database_name

-- Count announcements
SELECT COUNT(*) FROM announcements WHERE "deletedAt" IS NULL;

-- Count files
SELECT COUNT(*) FROM announcement_files WHERE "deletedAt" IS NULL;

-- Count comments
SELECT COUNT(*) FROM announcement_comments WHERE "deletedAt" IS NULL;

-- Check recent audit logs
SELECT action, "createdAt" 
FROM audit_logs 
WHERE action LIKE 'announcement%' 
ORDER BY "createdAt" DESC 
LIMIT 10;

\q
```

### **API Health Check**

```bash
# Test all announcement endpoints
curl -X GET http://localhost:3000/api/announcements
curl -X GET http://localhost:3000/api/announcements/1

# Should return JSON responses
```

### **Browser Check**

Open these URLs in browser:
1. `http://your-domain.com/login`
2. `http://your-domain.com/dashboard`
3. `http://your-domain.com/announcements`
4. `http://your-domain.com/announcements/create`

---

## ✅ **Deployment Complete Checklist**

- [ ] Code pulled from GitHub
- [ ] Database migrations run successfully
- [ ] Backend builds without errors
- [ ] Frontend builds without errors
- [ ] PM2 services restarted (backend + frontend)
- [ ] Backend API responds to health checks
- [ ] Frontend loads in browser
- [ ] Login works (HR user)
- [ ] Create announcement works
- [ ] Multi-file upload works (incremental + individual removal)
- [ ] Virus detection works (EICAR test)
- [ ] Edit announcement works (HR only)
- [ ] Comment system works (add/edit/delete)
- [ ] Reactions work (like/unlike)
- [ ] Urgent modal appears on dashboard
- [ ] Toast notifications appear (success + error)
- [ ] File downloads work (authenticated)
- [ ] Audit logs are created for important actions
- [ ] Duplicate file uploads work after deletion
- [ ] All pages render correctly (no 404s)
- [ ] No console errors in browser
- [ ] PM2 logs show no errors
- [ ] PostgreSQL queries execute successfully

---

## 🎉 **Success!**

If all checkboxes are ticked, your announcement system is successfully deployed to EC2!

### **Next Steps:**
1. **User Acceptance Testing (UAT):** Have HR test all features
2. **Monitor:** Watch logs for any errors over the next 24-48 hours
3. **Backup:** Create database backup before making further changes
4. **Document:** Note any issues or improvements needed

---

## 📞 **Support**

If you encounter issues during deployment:

1. **Check logs:**
   ```bash
   pm2 logs backend --lines 50
   pm2 logs frontend --lines 50
   ```

2. **Check database:**
   ```bash
   psql -U postgres -d your_database_name
   \dt  # List all tables
   ```

3. **Check services:**
   ```bash
   pm2 status
   sudo systemctl status postgresql
   sudo systemctl status clamav-daemon
   ```

4. **Restart everything:**
   ```bash
   pm2 restart all
   sudo systemctl restart postgresql
   sudo systemctl restart clamav-daemon
   ```

---

**Last Updated:** December 2024  
**Version:** 1.7 (Comment Edit/Delete + Full Announcement System)  
**Status:** Production Ready ✅
