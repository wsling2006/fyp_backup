# 📝 Database Setup Complete - Next Steps

## ✅ What I Found and Fixed

### Your Database Credentials:
```
Host: localhost
Port: 5432 (was incorrectly set to 5433)
Username: jw
Password: (none - empty string)
Database: fyp_db ✅ NOW CREATED
```

### Files Updated:
1. **`backend/src/data-source.ts`**
   - Changed port from 5433 → 5432
   - Changed username from 'postgres' → 'jw'
   - These match your actual PostgreSQL setup

2. **`DATABASE_CREDENTIALS.md`**
   - Complete guide with all your credentials
   - Troubleshooting tips
   - Connection commands

### Database Created:
✅ `fyp_db` database now exists and is ready to use

## ⚠️ Current Issue: Tables Don't Exist Yet

The database is empty. You need to create all the tables (users, purchase_requests, claims, etc.).

### Option 1: Let TypeORM Auto-Create Tables (Quick & Easy)

Temporarily enable synchronize in `backend/src/data-source.ts`:

```typescript
export default new DataSource({
  type: 'postgres',
  host,
  port,
  username,
  password,
  database,
  entities: [join(__dirname, '/**/*.entity.{ts,js}')],
  migrations: [join(__dirname, '/migrations/*.{ts,js}')],
  synchronize: true,  // ← Change to true temporarily
  logging: false,
});
```

Then:
```bash
cd /Users/jw/fyp_system/backend
npm run build
npm start  # Let it create tables automatically
# Stop it after it starts
# Change synchronize back to false
```

### Option 2: Manual Schema Creation (Production-Safe)

Create a schema initialization script:

```bash
cd /Users/jw/fyp_system/backend
psql fyp_db <<'EOF'
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  suspended BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create purchase_requests table  
CREATE TABLE purchase_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  department VARCHAR(50) NOT NULL,
  priority INT DEFAULT 1,
  estimated_amount DECIMAL(12,2) NOT NULL,
  approved_amount DECIMAL(12,2),
  status VARCHAR(50) DEFAULT 'DRAFT',
  created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reviewed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  review_notes TEXT,
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create claims table
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_request_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  receipt_file_path VARCHAR(500) NOT NULL,
  receipt_file_original_name VARCHAR(500) NOT NULL,
  file_hash VARCHAR(64),  -- For duplicate detection
  vendor_name VARCHAR(255) NOT NULL,
  amount_claimed DECIMAL(12,2) NOT NULL,
  purchase_date DATE NOT NULL,
  claim_description TEXT NOT NULL,
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) DEFAULT 'PENDING',
  verified_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  verification_notes TEXT,
  verified_at TIMESTAMP,
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for file hash lookups
CREATE INDEX idx_claims_file_hash ON claims(file_hash) WHERE file_hash IS NOT NULL;

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create other necessary tables (add more as needed)

COMMENT ON COLUMN claims.file_hash IS 'SHA-256 hash for duplicate file detection';
EOF
```

### Option 3: Use Existing Data (If You Had a Backup)

If you had a previous database with data:
```bash
pg_restore -d fyp_db /path/to/backup.dump
```

## 🚀 Quick Start - Recommended Steps

1. **Enable synchronize temporarily:**
   ```bash
   cd /Users/jw/fyp_system/backend
   # Edit src/data-source.ts: set synchronize: true
   npm run build
   npm start
   # Wait for "Nest application successfully started"
   # Press Ctrl+C to stop
   # Edit src/data-source.ts: set synchronize: false
   ```

2. **Add file_hash column:**
   ```bash
   psql fyp_db -f add-file-hash-column.sql
   ```

3. **Rebuild backend:**
   ```bash
   npm run build
   ```

4. **Start your application:**
   ```bash
   # Using PM2:
   cd /Users/jw/fyp_system
   pm2 restart ecosystem.config.js
   
   # Or manually:
   npm start
   ```

## 🔍 Verify Everything Works

```bash
# Check tables exist
psql fyp_db -c "\dt"

# Should show:
# - users
# - purchase_requests
# - claims  
# - audit_logs
# - migrations

# Check file_hash column exists
psql fyp_db -c "\d claims"

# Should show file_hash column
```

## 📋 Summary

### ✅ Done:
- Found your database credentials
- Created `fyp_db` database
- Fixed port (5433 → 5432) in code
- Fixed username ('postgres' → 'jw') in code
- Backend rebuilt with correct settings

### 🔄 Next Steps:
1. Create database tables (use Option 1 above - easiest)
2. Add file_hash column
3. Restart your application
4. Test file upload security features

### Your Connection String:
```
postgresql://jw@localhost:5432/fyp_db
```

### Quick Connect Commands:
```bash
# Connect to database
psql fyp_db

# List tables
\dt

# Check claims table
\d claims

# Quit
\q
```

---

**Files Created:**
- `DATABASE_CREDENTIALS.md` - Full credentials reference
- `DATABASE_SETUP_STATUS.md` - This file

**Updated:**
- `backend/src/data-source.ts` - Fixed port and username

**Ready:** Database exists, just needs tables!
