# EC2 Migration Final Fix Guide

## Issue
The `AddMalwareScanStatusToClaims` migration is failing because the column already exists in the database, but the migration file on EC2 doesn't have the existence check yet.

## What Happened
1. ✅ Migration was run on EC2 previously and the column was created
2. ✅ Migration fix was committed and pushed to GitHub (just now)
3. ❌ EC2 server needs to pull the fix and handle the migration state

## Solution

### Step 1: Pull Latest Changes on EC2

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd ~/fyp_system

# Pull latest changes
git pull origin main
```

**Expected output:**
```
From github.com:jingwei3088/fyp_system
 * branch            main       -> FETCH_HEAD
   38d4313..293453a  main       -> origin/main
Updating 38d4313..293453a
Fast-forward
 backend/src/migrations/1704067200000-AddMalwareScanStatusToClaims.ts | 36 ++++++++++++++++++++++++------------
 1 file changed, 24 insertions(+), 12 deletions(-)
```

### Step 2: Verify the Fix

```bash
cd backend

# Check the migration file has the fix
grep -A5 "Check if column already exists" src/migrations/1704067200000-AddMalwareScanStatusToClaims.ts
```

**Expected output:**
```typescript
    // Check if column already exists
    const table = await queryRunner.getTable('claims');
    const column = table?.findColumnByName('malware_scan_status');

    // Only add column if it doesn't exist
    if (!column) {
```

### Step 3: Check Migration Status

```bash
# Check which migrations have been applied
npm run typeorm migration:show
```

You'll likely see that `AddMalwareScanStatusToClaims1704067200000` is **NOT** marked as run, even though the column exists.

### Step 4: Two Options

#### Option A: Mark Migration as Complete (Recommended if column exists)

First, verify the column actually exists:

```bash
# Connect to PostgreSQL and check
sudo -u postgres psql -d your_database_name -c "\d claims" | grep malware_scan_status
```

If the column exists, manually mark the migration as complete:

```bash
npm run typeorm query "INSERT INTO migrations (timestamp, name) VALUES (1704067200000, 'AddMalwareScanStatusToClaims1704067200000');"
```

#### Option B: Revert and Re-run (If you want to test the fix)

If you want to test the new migration logic:

```bash
# Drop the column (CAUTION: This will lose data if any)
npm run typeorm query "ALTER TABLE claims DROP COLUMN IF EXISTS malware_scan_status;"

# Delete the migration record
npm run typeorm query "DELETE FROM migrations WHERE name = 'AddMalwareScanStatusToClaims1704067200000';"

# Now run migrations again
npm run typeorm migration:run
```

### Step 5: Rebuild and Run Migrations

```bash
# Install dependencies (if needed)
npm install

# Rebuild TypeScript
npm run build

# Run all pending migrations
npm run typeorm migration:run
```

**Expected output:**
```
✓ Migration AddMalwareScanStatusToClaims1704067200000 has been executed successfully.
✓ Migration AddFileHashToClaims1736899200000 has been executed successfully.
✓ Migration AddHREmployeeManagement1736899300000 has been executed successfully.
```

### Step 6: Verify Success

```bash
# Check migration status
npm run typeorm migration:show

# Verify all columns exist
npm run typeorm query "SELECT column_name FROM information_schema.columns WHERE table_name='claims' ORDER BY column_name;"

# Check the HR tables were created
npm run typeorm query "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name;"
```

### Step 7: Restart Application

```bash
# If using PM2
pm2 restart backend
pm2 logs backend --lines 50

# Or if using systemd
sudo systemctl restart your-backend-service
sudo journalctl -u your-backend-service -n 50

# Or if running manually
npm run start:prod
```

### Step 8: Test the System

```bash
# Test backend health
curl http://localhost:3000/health

# Test HR endpoints (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/hr/employees

# Check audit logs
npm run typeorm query "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;"
```

## Quick Command Sequence (Copy-Paste)

```bash
# On EC2
cd ~/fyp_system
git pull origin main
cd backend

# Verify column exists
sudo -u postgres psql -d your_database_name -c "SELECT column_name FROM information_schema.columns WHERE table_name='claims' AND column_name='malware_scan_status';"

# If column exists, mark migration as complete
npm run typeorm query "INSERT INTO migrations (timestamp, name) VALUES (1704067200000, 'AddMalwareScanStatusToClaims1704067200000') ON CONFLICT DO NOTHING;"

# Rebuild and run remaining migrations
npm install
npm run build
npm run typeorm migration:run

# Restart app
pm2 restart backend

# Verify
npm run typeorm migration:show
```

## Troubleshooting

### Error: Migration already exists in migrations table

```bash
# Check if it's actually in the table
npm run typeorm query "SELECT * FROM migrations WHERE name LIKE '%Malware%';"

# If it's there but migrations:show says it's pending, there might be a cache issue
rm -rf dist/
npm run build
npm run typeorm migration:show
```

### Error: Cannot find module after rebuild

```bash
# Clean rebuild
rm -rf dist/ node_modules/
npm install
npm run build
```

### Error: Permission denied for table migrations

```bash
# Check database user permissions
sudo -u postgres psql -d your_database_name -c "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;"
sudo -u postgres psql -d your_database_name -c "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;"
```

## Verification Checklist

- [ ] Latest code pulled from GitHub
- [ ] Migration file has column existence checks
- [ ] `malware_scan_status` column exists in `claims` table
- [ ] Migration record exists in `migrations` table
- [ ] HR migration (`AddHREmployeeManagement`) completed successfully
- [ ] New tables exist: `employees`, `employee_documents`
- [ ] Application restarts without errors
- [ ] Can access HR endpoints (with proper authentication)
- [ ] Audit logs are being created for HR actions

## Success Indicators

When everything is working:

1. **Migrations table shows all migrations as complete:**
   ```
   [X] CreateUsersTable1234567890000
   [X] CreatePurchaseRequestsAndClaims1703255400000
   [X] AddMalwareScanStatusToClaims1704067200000
   [X] AddFileHashToClaims1736899200000
   [X] AddReceiptFileDataToClaims1735689600000
   [X] AddHREmployeeManagement1736899300000
   ```

2. **Application logs show no migration errors:**
   ```
   [Nest] INFO [TypeOrmModule] Connection has been established successfully
   [Nest] INFO [InstanceLoader] All migrations ran successfully
   ```

3. **Database has all expected tables:**
   - users
   - purchase_requests
   - claims
   - accountant_files
   - audit_logs
   - employees
   - employee_documents
   - migrations

## Next Steps After Success

1. ✅ Run the automated test script: `./test-hr-module.sh`
2. ✅ Test HR module endpoints manually
3. ✅ Verify file uploads work with ClamAV
4. ✅ Check audit logs are being created
5. ✅ Test frontend HR pages
6. ✅ Create an HR test user
7. ✅ Test complete HR workflow

## Notes

- All migrations are now idempotent (safe to re-run)
- Column existence checks prevent duplicate column errors
- The system follows zero-trust security principles
- All file operations use BYTEA storage (no file system issues)
- Audit logs track all sensitive operations
- RBAC ensures proper access control
