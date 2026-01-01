# EC2 Pull and Migrate Guide

## Critical Issue
The EC2 server is running old migration files. You've fixed them locally and pushed to GitHub, but the server hasn't pulled the changes yet.

## Solution Steps

### 1. Connect to EC2
```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. Navigate to Backend Directory
```bash
cd /path/to/fyp_system/backend
```

### 3. Pull Latest Changes from GitHub
```bash
# Stash any local changes (if any)
git stash

# Pull the latest changes
git pull origin main

# If you get authentication errors, you may need to configure credentials:
# git config --global credential.helper store
```

### 4. Verify the Migration File was Updated
```bash
# Check that the malware scan status migration has the fix
cat src/migrations/1704067200000-AddMalwareScanStatusToClaims.ts | head -20
```

You should see lines like:
```typescript
// Check if column already exists
const table = await queryRunner.getTable('claims');
const column = table?.findColumnByName('malware_scan_status');
```

### 5. Install Dependencies (if needed)
```bash
npm install
```

### 6. Rebuild TypeScript
```bash
npm run build
```

### 7. Run Migrations
```bash
# Show pending migrations
npm run typeorm migration:show

# Run migrations
npm run typeorm migration:run
```

### 8. Verify Success
```bash
# Check the migrations table
npm run typeorm query "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;"

# Or connect to PostgreSQL directly
psql -h localhost -U your_db_user -d your_db_name -c "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;"
```

### 9. Restart the Application
```bash
# If using PM2
pm2 restart backend

# Or if using systemd
sudo systemctl restart your-backend-service

# Or if running manually
npm run start:prod
```

## Expected Output

After successful migration, you should see:
```
✓ Migration AddMalwareScanStatusToClaims1704067200000 completed
✓ Migration AddFileHashToClaims1736899200000 completed  
✓ Migration AddHREmployeeManagement1736899300000 completed
```

## Troubleshooting

### If git pull fails with merge conflicts:
```bash
# Backup your changes
cp -r /path/to/fyp_system/backend /path/to/fyp_system/backend_backup

# Hard reset to remote (WARNING: loses local changes)
git fetch origin
git reset --hard origin/main

# Or merge manually
git merge origin/main
```

### If migrations still fail:
```bash
# Check which migrations have run
npm run typeorm migration:show

# Manually mark a migration as run (ONLY if it actually succeeded)
npm run typeorm query "INSERT INTO migrations (timestamp, name) VALUES (1704067200000, 'AddMalwareScanStatusToClaims1704067200000');"

# Or revert a specific migration
npm run typeorm migration:revert
```

### If the column already exists but migration table is out of sync:
```bash
# Check if column exists
psql -h localhost -U your_db_user -d your_db_name -c "\d claims"

# Manually mark migration as run
npm run typeorm query "INSERT INTO migrations (timestamp, name) VALUES (1704067200000, 'AddMalwareScanStatusToClaims1704067200000');"
```

## Quick Commands (Copy-Paste Ready)

```bash
# Full update sequence
cd /path/to/fyp_system/backend
git stash
git pull origin main
npm install
npm run build
npm run typeorm migration:run
pm2 restart backend
```

## Security Notes
- Always backup the database before running migrations in production
- Test migrations in a staging environment first if available
- Keep a record of which migrations have been applied
- Monitor application logs after deployment

## Next Steps After Success
1. Test HR module endpoints
2. Run `./test-hr-module.sh` script on EC2
3. Verify audit logs are being created
4. Test file uploads with ClamAV
5. Check frontend HR pages work correctly
