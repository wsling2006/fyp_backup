# 🔧 DATABASE SCHEMA FIX - Purchase Requests Table

## ⚠️ ISSUE: Missing Columns in purchase_requests Table

The error shows:
```
column "title" of relation "purchase_requests" does not exist
```

This means your database table doesn't have the required columns that the code expects.

---

## 🚀 QUICK FIX ON EC2

### Option 1: Automated Script (RECOMMENDED)
```bash
# SSH to EC2
ssh -i "your-key.pem" ubuntu@your-ec2-ip

# Pull latest code
cd ~/fyp_system
git pull origin main

# Run the fix script
./fix-purchase-requests-schema.sh

# Restart backend
pm2 restart backend
```

### Option 2: Manual SQL Execution
```bash
# SSH to EC2
ssh -i "your-key.pem" ubuntu@your-ec2-ip

# Pull latest code
cd ~/fyp_system
git pull origin main

# Run SQL fix
psql -U postgres -d fyp_system -f backend/fix-purchase-requests-table.sql

# Restart backend
pm2 restart backend
```

---

## 📋 WHAT THE FIX DOES

The script adds these columns to `purchase_requests` table if they don't exist:
- ✅ `title` (VARCHAR 255)
- ✅ `description` (TEXT)
- ✅ `department` (VARCHAR 50)
- ✅ `priority` (INT, default 1)
- ✅ `estimated_amount` (DECIMAL 12,2)
- ✅ `approved_amount` (DECIMAL 12,2)
- ✅ `status` (VARCHAR 50, default 'DRAFT')
- ✅ `created_by_user_id` (UUID)
- ✅ `reviewed_by_user_id` (UUID)
- ✅ `review_notes` (TEXT)
- ✅ `reviewed_at` (TIMESTAMP)
- ✅ `created_at` (TIMESTAMP)
- ✅ `updated_at` (TIMESTAMP)

---

## 🔍 WHY THIS HAPPENED

**Possible causes:**
1. **Migration not run**: The database migration that creates the table might not have been executed
2. **Table created manually**: Someone created the table manually without all columns
3. **Old schema**: The database was created before all columns were added to the entity

---

## ✅ VERIFICATION STEPS

### Step 1: Check Table Structure
After running the fix script, verify the table has all columns:

```bash
# On EC2
psql -U postgres -d fyp_system -c "\d purchase_requests"
```

You should see all the columns listed above.

### Step 2: Test Purchase Request Creation
1. **Login** as sales_department user
2. **Navigate** to Purchase Requests page
3. **Try to create** a new purchase request
4. **Should work!** ✅

### Step 3: Check Logs
```bash
pm2 logs backend --lines 20
```

Should see:
```
[DEBUG] JwtAuthGuard: Authorization header = Present
[DEBUG] JwtStrategy.validate called...
[DEBUG] RolesGuard: Access granted
```

**No more** "column does not exist" errors! ✅

---

## 🐛 IF STILL NOT WORKING

### Check 1: Database Exists
```bash
psql -U postgres -l | grep fyp_system
```

### Check 2: Table Exists
```bash
psql -U postgres -d fyp_system -c "\dt" | grep purchase_requests
```

### Check 3: Run Full Migration
If the table doesn't exist at all:

```bash
cd ~/fyp_system/backend
npm run typeorm migration:run
```

### Check 4: Database User Permissions
Make sure your database user has permissions:

```bash
psql -U postgres -d fyp_system -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;"
```

---

## 📊 ALTERNATIVE: Recreate Table (ONLY IF EMPTY)

**⚠️ WARNING: This will delete all existing purchase requests!**

Only do this if you have no data or are in development:

```sql
-- Drop and recreate (DANGER!)
DROP TABLE IF EXISTS claims CASCADE;
DROP TABLE IF EXISTS purchase_requests CASCADE;

-- Then run migrations
cd ~/fyp_system/backend
npm run typeorm migration:run
```

---

## 🎯 EXPECTED OUTCOME

After running the fix:

1. ✅ `purchase_requests` table has all required columns
2. ✅ Sales/Marketing users can create purchase requests
3. ✅ No more "column does not exist" errors
4. ✅ Data is saved correctly to database

---

## 📝 QUICK COMMAND SUMMARY

```bash
# Complete fix in one go:
cd ~/fyp_system && \
git pull origin main && \
./fix-purchase-requests-schema.sh && \
pm2 restart backend && \
pm2 logs backend --lines 20
```

---

## 🆘 TROUBLESHOOTING

### Error: "permission denied"
```bash
chmod +x ~/fyp_system/fix-purchase-requests-schema.sh
```

### Error: "psql: command not found"
```bash
sudo apt-get update
sudo apt-get install postgresql-client
```

### Error: "password authentication failed"
Update the script with your database credentials:
```bash
# Edit the script
nano ~/fyp_system/fix-purchase-requests-schema.sh

# Change:
DB_USER="postgres"  # to your actual DB user
```

### Error: "database does not exist"
```bash
# Create the database
psql -U postgres -c "CREATE DATABASE fyp_system;"

# Run migrations
cd ~/fyp_system/backend
npm run typeorm migration:run
```

---

## ✅ SUCCESS INDICATORS

After the fix, when creating a purchase request, you should see in logs:

```
[DEBUG] RolesGuard: Access granted
[LOG] Purchase request created successfully
```

And in your frontend, the purchase request should appear in the list! 🎉

---

**Run the fix script now and your purchase requests feature will work!** 🚀
