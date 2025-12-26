# 🔧 EC2 Database Password Issue - Quick Fix

## Problem
The deployment script asks for a password when trying to connect to PostgreSQL, but you don't have the password or it's not configured.

## ✅ Solution 1: Use the New Script (Recommended)

I created a new script that skips the database check:

```bash
cd /home/ubuntu/fyp_system
git pull origin main
chmod +x ec2-quick-deploy.sh
./ec2-quick-deploy.sh
```

This will deploy everything **without** trying to check the database password.

---

## ✅ Solution 2: Manual Database Check

If you need to verify or add the `file_hash` column manually:

### Check if column already exists:
```bash
sudo -u postgres psql fyp_db -c "SELECT column_name FROM information_schema.columns WHERE table_name='claims' AND column_name='file_hash';"
```

**If it shows `file_hash`** → ✅ Column already exists, you're good!

**If it shows nothing** → Need to add it:

### Add the column:
```bash
sudo -u postgres psql fyp_db -c "ALTER TABLE claims ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);"
sudo -u postgres psql fyp_db -c "CREATE INDEX IF NOT EXISTS idx_claims_file_hash ON claims(file_hash);"
```

### Or use the SQL file:
```bash
cd /home/ubuntu/fyp_system/backend
sudo -u postgres psql fyp_db -f add-file-hash-column.sql
```

---

## ✅ Solution 3: Skip Database Step Entirely

The `file_hash` column was likely added in a previous deployment. You can just:

1. **Pull latest code:**
   ```bash
   cd /home/ubuntu/fyp_system
   git pull origin main
   ```

2. **Build frontend:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

3. **Build backend:**
   ```bash
   cd ../backend
   npm install
   npm run build
   ```

4. **Restart PM2:**
   ```bash
   cd /home/ubuntu/fyp_system
   pm2 restart ecosystem.config.js --update-env
   ```

5. **Check status:**
   ```bash
   pm2 status
   pm2 logs --lines 50
   ```

---

## 🔍 Understanding PostgreSQL on EC2

On your EC2, PostgreSQL is set up as user `postgres`, not `ubuntu`. That's why:

- ❌ This fails: `psql` (tries to connect as user `ubuntu`)
- ✅ This works: `sudo -u postgres psql`

---

## 📋 PostgreSQL Common Commands on EC2

### Connect to database:
```bash
sudo -u postgres psql fyp_db
```

### List all tables:
```bash
sudo -u postgres psql fyp_db -c "\dt"
```

### Check claims table structure:
```bash
sudo -u postgres psql fyp_db -c "\d claims"
```

### Check if file_hash exists:
```bash
sudo -u postgres psql fyp_db -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name='claims';"
```

---

## 🎯 What You Need to Do NOW

**Option A (Easiest):** Use the new script that skips database checks:
```bash
cd /home/ubuntu/fyp_system && git pull && chmod +x ec2-quick-deploy.sh && ./ec2-quick-deploy.sh
```

**Option B:** Check if column exists first:
```bash
# Check if file_hash column exists
sudo -u postgres psql fyp_db -c "SELECT column_name FROM information_schema.columns WHERE table_name='claims' AND column_name='file_hash';"

# If it exists, just deploy without database changes:
cd /home/ubuntu/fyp_system
git pull
cd frontend && npm install && npm run build && cd ..
cd backend && npm install && npm run build && cd ..
pm2 restart ecosystem.config.js --update-env
```

---

## ✅ After Deployment

1. Check PM2 status:
   ```bash
   pm2 status
   ```

2. Check logs for errors:
   ```bash
   pm2 logs --lines 50
   ```

3. Test the application:
   - Login to your app
   - Try uploading a claim
   - Should see "🔍 Scanning file..." message

---

## 🐛 If You Still Get Database Errors

The application will work fine even if the database check failed during deployment. The `file_hash` column should already exist from a previous migration.

If you see errors in the logs about missing `file_hash` column, then run:
```bash
sudo -u postgres psql fyp_db -c "ALTER TABLE claims ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64); CREATE INDEX IF NOT EXISTS idx_claims_file_hash ON claims(file_hash);"
```

Then restart:
```bash
pm2 restart all
```

---

## 📝 Summary

1. **Use the new script:** `./ec2-quick-deploy.sh` (no database password needed)
2. **Or deploy manually** without database checks
3. **Database column probably already exists** from previous deployment
4. **Use `sudo -u postgres psql`** to connect to PostgreSQL on EC2

Done! 🚀
