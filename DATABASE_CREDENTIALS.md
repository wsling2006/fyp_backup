# 🔐 Database Credentials and Setup Guide

## Your Database Configuration

Based on your system analysis, here's your PostgreSQL setup:

### Current Database Settings
```
Host: localhost
Port: 5432 (NOT 5433 as in code)
Username: jw (your macOS username)
Password: (no password - trust authentication)
Database Name: fyp_db (DOES NOT EXIST YET)
```

### ⚠️ Important Findings

1. **PostgreSQL is running on port 5432**, but your code expects port 5433
2. **Database `fyp_db` does not exist yet** - you need to create it
3. **Your PostgreSQL owner is `jw`** (your macOS user), not `postgres`
4. **No password is required** for local connections (trust authentication)

## How to Create the Database

### Option 1: Quick Setup (Recommended)
```bash
# Create the database
cd /Users/jw/fyp_system
psql postgres -c "CREATE DATABASE fyp_db;"

# Verify it was created
psql -l
```

### Option 2: Using psql Interactive
```bash
psql postgres

-- Inside psql:
CREATE DATABASE fyp_db;
\l              -- List databases to verify
\q              -- Quit
```

## Fix Your Backend Configuration

Your backend is configured to use port **5433**, but PostgreSQL is actually on port **5432**.

### Update: `backend/src/data-source.ts`

Change this line:
```typescript
const port = parseInt(process.env.DB_PORT || '5433', 10);
```

To:
```typescript
const port = parseInt(process.env.DB_PORT || '5432', 10);
```

Or set the environment variable:
```bash
export DB_PORT=5432
```

## Complete Database Connection Info

### For `backend/src/data-source.ts`
```typescript
const host = 'localhost';
const port = 5432;  // ← CHANGE FROM 5433
const username = 'jw';  // ← Your macOS username
const password = '';  // ← Empty (no password needed)
const database = 'fyp_db';
```

### For Environment Variables (if you want to use .env)
Create `/Users/jw/fyp_system/backend/.env`:
```bash
NODE_ENV=development
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=jw
DB_PASSWORD=
DB_NAME=fyp_db

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3001

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Email Configuration (for OTP)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-email-app-password

# Admin account
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

## Database Migration Commands

Once database is created, you need to:

### 1. Create Tables
```bash
cd /Users/jw/fyp_system/backend

# Run migrations
npm run migration:run

# Or manually run SQL files if migrations fail
psql fyp_db -f src/migrations/1703255400000-CreatePurchaseRequestsAndClaims.ts
```

### 2. Add File Hash Column (for the new feature)
```bash
cd /Users/jw/fyp_system/backend
psql fyp_db -f add-file-hash-column.sql
```

### 3. Verify Tables Exist
```bash
psql fyp_db -c "\dt"
```

You should see tables like:
- users
- purchase_requests
- claims
- audit_logs
- etc.

## How to Connect to Your Database

### Using psql (Command Line)
```bash
# Connect to fyp_db database
psql fyp_db

# List all tables
\dt

# Describe a table
\d users

# Run a query
SELECT * FROM users;

# Quit
\q
```

### Using GUI Tool (Recommended)
If you have **Postico**, **TablePlus**, or **pgAdmin**:

```
Host: localhost
Port: 5432
Database: fyp_db
Username: jw
Password: (leave empty)
```

## Quick Commands Reference

```bash
# List all databases
psql -l

# Create fyp_db database
psql postgres -c "CREATE DATABASE fyp_db;"

# Connect to fyp_db
psql fyp_db

# Drop database (careful!)
psql postgres -c "DROP DATABASE fyp_db;"

# Check if database exists
psql -lqt | cut -d \| -f 1 | grep -w fyp_db

# See database size
psql postgres -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;"
```

## Troubleshooting

### Issue: "database fyp_db does not exist"
**Solution:** Create it with:
```bash
psql postgres -c "CREATE DATABASE fyp_db;"
```

### Issue: "connection to server on port 5433 failed"
**Solution:** Change port to 5432 in your code or set environment variable

### Issue: "role 'postgres' does not exist"
**Solution:** Use username 'jw' instead of 'postgres'

### Issue: "password authentication failed"
**Solution:** Leave password empty (your local setup uses trust authentication)

## Summary

### What You Need to Do:

1. **Create the database:**
   ```bash
   psql postgres -c "CREATE DATABASE fyp_db;"
   ```

2. **Fix the port in your code:**
   Change 5433 → 5432 in `backend/src/data-source.ts`

3. **Run migrations:**
   ```bash
   cd /Users/jw/fyp_system/backend
   npm run migration:run
   ```

4. **Add file_hash column:**
   ```bash
   psql fyp_db -f add-file-hash-column.sql
   ```

5. **Rebuild and restart:**
   ```bash
   npm run build
   # Then restart your backend
   ```

### Your Credentials Summary:
```
Database: fyp_db (needs to be created)
Host: localhost
Port: 5432 (NOT 5433)
Username: jw
Password: (none/empty)
```

---

**Current Status:** ❌ Database not created yet
**Next Step:** Run `psql postgres -c "CREATE DATABASE fyp_db;"`
