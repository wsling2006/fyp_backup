# Fix Database Migration Connection Issue

## Your Database Credentials (from backend/.env):
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=fyp_user
DB_PASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM
DB_NAME=fyp_db
```

## Solution: Run Migration with Correct Credentials

### Option 1: Direct Command (Recommended)
```bash
# On EC2, run this:
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db < database-migration-partially-paid.sql
```

### Option 2: Interactive Mode (if you prefer to see what's happening)
```bash
# Connect to database
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db

# Then paste the SQL from database-migration-partially-paid.sql
# Or run:
\i database-migration-partially-paid.sql

# Exit when done:
\q
```

### Option 3: Using cat and pipe
```bash
cat database-migration-partially-paid.sql | PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db
```

## Step-by-Step (Safest Approach)

### 1. First, test the connection works:
```bash
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db -c "SELECT version();"
```

If this shows PostgreSQL version, your connection works!

### 2. Run the migration:
```bash
cd ~/fyp_system
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db < database-migration-partially-paid.sql
```

### 3. Verify migration succeeded:
```bash
# Check for new status value
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db -c "SELECT unnest(enum_range(NULL::purchase_request_status_enum)) AS status;"
```

You should see:
```
     status      
-----------------
 DRAFT
 SUBMITTED
 UNDER_REVIEW
 APPROVED
 REJECTED
 PARTIALLY_PAID  ← This should be new!
 PAID
```

### 4. Check new columns were added:
```bash
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db -c "\d purchase_requests"
```

Look for these columns:
- `total_claimed`
- `total_paid`
- `total_rejected`
- `payment_progress`

## If You Get "Permission Denied" or Similar Errors

### Check if PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

### Check if you can connect to database:
```bash
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db -c "SELECT 1;"
```

## After Successful Migration

Continue with deployment:

```bash
# Build backend
cd ~/fyp_system/backend
npm install
npm run build

# Build frontend
cd ~/fyp_system/frontend
npm install
npm run build

# Restart services
pm2 restart all

# Check logs
pm2 logs --lines 50
```

## Common Errors and Solutions

### Error: "database does not exist"
**Solution:** Database name might be wrong. Check with:
```bash
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -l
```

### Error: "password authentication failed"
**Solution:** Password might have special characters. Verify in backend/.env file:
```bash
cat ~/fyp_system/backend/.env | grep DB_
```

### Error: "FATAL: Peer authentication failed"
**Solution:** Use `-h localhost` to force TCP connection instead of socket:
```bash
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db
```

### Error: "enum value already exists"
**This is SAFE to ignore!** It means PARTIALLY_PAID was already added. Continue with deployment.

## Quick Copy-Paste Commands

### All-in-one test and migrate:
```bash
cd ~/fyp_system

# Test connection
echo "Testing connection..."
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db -c "SELECT 'Connection OK' as status;"

# Run migration
echo "Running migration..."
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db < database-migration-partially-paid.sql

# Verify
echo "Verifying migration..."
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db -c "SELECT unnest(enum_range(NULL::purchase_request_status_enum)) AS status;"

echo "Migration complete! Now build and restart services."
```

---

**TL;DR - Run this on EC2:**
```bash
cd ~/fyp_system
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -p 5432 -U fyp_user -d fyp_db < database-migration-partially-paid.sql
```

Then continue with build and restart steps! 🚀
