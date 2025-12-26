# 🔧 EC2 Permission Fix and Deployment

## Issues Found:

1. ✅ Database exists: **fyp_db** (owned by **fyp_user**, not postgres)
2. ❌ Permission denied on /home/ubuntu/fyp_system/backend
3. ❌ SQL file not found (wrong directory)

## Quick Fix Commands

Run these on your EC2 server:

```bash
# 1. Fix permissions
sudo chown -R ubuntu:ubuntu /home/ubuntu/fyp_system
sudo chmod -R 755 /home/ubuntu/fyp_system

# 2. Pull latest code from GitHub
cd /home/ubuntu/fyp_system
git pull

# 3. Go to backend and add file_hash column
cd /home/ubuntu/fyp_system/backend
sudo -u fyp_user psql -d fyp_db -f add-file-hash-column.sql

# If that doesn't work, use postgres user:
sudo -u postgres psql -d fyp_db -f add-file-hash-column.sql

# 4. Build backend
npm run build

# 5. Build frontend
cd /home/ubuntu/fyp_system/frontend
npm run build

# 6. Restart PM2
cd /home/ubuntu/fyp_system
pm2 restart ecosystem.config.js

# 7. Check status
pm2 status
pm2 logs backend --lines 30
```

## Your Actual EC2 Database Credentials

```
Database: fyp_db
Owner: fyp_user (NOT postgres)
Host: localhost
Port: 5432 (default)
```

## Alternative: Manual SQL Migration

If the SQL file is missing, run the SQL directly:

```bash
sudo -u postgres psql -d fyp_db << 'EOF'
-- Add file_hash column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND column_name = 'file_hash'
    ) THEN
        ALTER TABLE claims ADD COLUMN file_hash VARCHAR(64) NULL;
        COMMENT ON COLUMN claims.file_hash IS 'SHA-256 hash of receipt file for duplicate detection';
        CREATE INDEX idx_claims_file_hash ON claims(file_hash) WHERE file_hash IS NOT NULL;
        RAISE NOTICE 'Successfully added file_hash column and index';
    ELSE
        RAISE NOTICE 'Column file_hash already exists, skipping';
    END IF;
END $$;
EOF
```

## Verify Migration Worked

```bash
# Check if file_hash column exists
sudo -u postgres psql -d fyp_db -c "\d claims" | grep file_hash

# Should output:
# file_hash | character varying(64) |
```

## If Builds Are Already Running

I see your build started. Wait for it to complete, then:

```bash
# Check if backend build completed
ls -la /home/ubuntu/fyp_system/backend/dist/

# Check if frontend is building
cd /home/ubuntu/fyp_system/frontend
npm run build

# Then restart
cd /home/ubuntu/fyp_system
pm2 restart ecosystem.config.js
pm2 logs
```

## Full Clean Deployment (If Above Fails)

```bash
#!/bin/bash
# Complete clean deployment

# 1. Fix permissions
echo "Fixing permissions..."
sudo chown -R ubuntu:ubuntu /home/ubuntu/fyp_system
sudo chmod -R 755 /home/ubuntu/fyp_system

# 2. Pull latest code
echo "Pulling latest code..."
cd /home/ubuntu/fyp_system
git pull

# 3. Add file_hash column using heredoc
echo "Adding file_hash column..."
sudo -u postgres psql -d fyp_db << 'EOF'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'claims' AND column_name = 'file_hash'
    ) THEN
        ALTER TABLE claims ADD COLUMN file_hash VARCHAR(64) NULL;
        CREATE INDEX idx_claims_file_hash ON claims(file_hash) WHERE file_hash IS NOT NULL;
        RAISE NOTICE 'Added file_hash column';
    ELSE
        RAISE NOTICE 'file_hash already exists';
    END IF;
END $$;
EOF

# 4. Build backend
echo "Building backend..."
cd /home/ubuntu/fyp_system/backend
npm run build

# 5. Build frontend
echo "Building frontend..."
cd /home/ubuntu/fyp_system/frontend
npm run build

# 6. Restart services
echo "Restarting services..."
cd /home/ubuntu/fyp_system
pm2 restart ecosystem.config.js

# 7. Check status
pm2 status
echo ""
echo "Deployment complete! Check logs with: pm2 logs"
```

Save this as `quick-deploy.sh` and run:

```bash
chmod +x quick-deploy.sh
./quick-deploy.sh
```
