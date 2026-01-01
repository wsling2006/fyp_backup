# 🚀 Deploy PARTIALLY_PAID Status - Quick Guide

## ⚠️ IMPORTANT: Database Migration Required First!

**DO NOT skip the database migration or the deployment will fail!**

---

## Step-by-Step Deployment

### 1. SSH to EC2
```bash
ssh ubuntu@YOUR_EC2_IP
cd fyp_system
```

### 2. Pull Latest Code
```bash
git pull origin main
```

### 3. **🔴 CRITICAL: Run Database Migration FIRST**
```bash
# Connect to your database
psql $DATABASE_URL

# Or if you have credentials:
psql -U your_username -d your_database_name

# Copy and paste the entire contents of database-migration-partially-paid.sql
# Or run it directly:
\i database-migration-partially-paid.sql

# Verify the migration worked:
SELECT unnest(enum_range(NULL::purchase_request_status_enum)) AS status;
# Should see: DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PARTIALLY_PAID, PAID

# Check new columns:
\d purchase_requests
# Should see: total_claimed, total_paid, total_rejected, payment_progress

# Exit psql:
\q
```

### 4. Build Backend
```bash
cd backend
npm install
npm run build
```

### 5. Build Frontend
```bash
cd ../frontend
npm install
npm run build
```

### 6. Restart Services
```bash
pm2 restart all
# Or individually:
pm2 restart backend
pm2 restart frontend
```

### 7. Check Logs
```bash
pm2 logs --lines 50
```

### 8. Verify Everything Works
```bash
pm2 status
# Both should show "online"
```

---

## Quick Test After Deployment

1. **Login** to your system
2. **Create a request** for $100
3. **Get it approved** by accountant
4. **Upload 2 claims**: $50 each
5. **Process first claim** → Should show **PARTIALLY_PAID** 🟡 with 50% progress
6. **Process second claim** → Should show **PAID** 🟣 with 100% progress

---

## If Migration Fails

### Error: "already exists"
This is **SAFE to ignore** if you see:
```
ERROR: duplicate key value violates unique constraint
```
It means the enum value already exists. Continue with deployment.

### Error: "column already exists"  
This is **SAFE to ignore** if you see:
```
ERROR: column "total_claimed" of relation "purchase_requests" already exists
```
The `IF NOT EXISTS` clause handles this.

### Other Errors
If you get other errors:
1. Take a screenshot of the error
2. Don't proceed with deployment
3. Check database connection
4. Verify you're on the correct database

---

## Alternative: One-Line Migration

If you have the migration file on EC2:
```bash
psql $DATABASE_URL < database-migration-partially-paid.sql
```

---

## Rollback (If Needed)

If something goes wrong:

### 1. Stop Services
```bash
pm2 stop all
```

### 2. Revert Code
```bash
git reset --hard HEAD~1
```

### 3. Rebuild
```bash
cd backend && npm run build
cd ../frontend && npm run build
```

### 4. Restart
```bash
pm2 restart all
```

**Note:** We don't remove database columns in rollback - they're harmless if not used.

---

## Success Indicators

After deployment, you should see:

✅ PM2 shows both services "online"  
✅ No errors in logs  
✅ Can access the website  
✅ PARTIALLY_PAID badge shows as orange  
✅ Progress bar appears on partial payments  
✅ Financial details display correctly  

---

## Common Issues

### Issue: "Cannot read property of undefined"
**Solution:** Clear browser cache and refresh

### Issue: Status not updating
**Solution:** 
1. Check backend logs: `pm2 logs backend`
2. Verify migration ran: `psql $DATABASE_URL -c "SELECT unnest(enum_range(NULL::purchase_request_status_enum))"`

### Issue: Progress bar not showing
**Solution:** The request must have claims that are processed. Pending claims won't show progress.

---

## Need Help?

Check these files:
- `PARTIALLY_PAID_IMPLEMENTATION.md` - Full implementation details
- `database-migration-partially-paid.sql` - SQL migration script
- `HOW_TO_DEPLOY_EC2.md` - General deployment guide

---

**Summary:**
1. ✅ Pull code
2. ⚠️ **RUN DATABASE MIGRATION** (most important!)
3. ✅ Build backend
4. ✅ Build frontend
5. ✅ Restart PM2
6. ✅ Test

**Happy deploying!** 🚀
