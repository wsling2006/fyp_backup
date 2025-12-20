# Database Setup Troubleshooting Guide

## Problem: "database 'fyp_system' does not exist"

The PostgreSQL database hasn't been created yet or is using a different name.

---

## Solution: Complete Database Setup

### Step 1: Check PostgreSQL Status

```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql

# If not running, start it
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Step 2: Check Available Databases

```bash
# Connect to PostgreSQL default database
sudo -u postgres psql

# Inside psql, list all databases
\l

# Exit
\q
```

### Step 3: Create the Database

The FYP system uses database name: **`fyp_db`** (not `fyp_system`)

Check your backend configuration in `backend/src/data-source.ts`:

```typescript
const database = process.env.DB_NAME || 'fyp_db';
```

**Create the database:**

```bash
# Option 1: As postgres user
sudo -u postgres psql -c "CREATE DATABASE fyp_db;"

# Option 2: With environment variables
DB_HOST=localhost \
DB_PORT=5433 \
DB_USERNAME=postgres \
DB_PASSWORD="" \
DB_NAME=fyp_db \
./setup-database.sh
```

### Step 4: Verify Database Created

```bash
# List databases
sudo -u postgres psql -l

# Should show: fyp_db | postgres | UTF8 | ...
```

### Step 5: Run TypeORM Migrations

```bash
cd ~/fyp_system/backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Run migrations
npm run typeorm -- migration:run

# Expected output:
# query: SELECT * FROM "typeorm_metadata" ...
# Migration QueryRunner created
# 0 migrations are pending
```

### Step 6: Verify Tables Created

```bash
# Connect to the database
sudo -u postgres psql -d fyp_db

# List tables
\dt

# Expected tables:
# - users
# - revenue
# - accountant_files
# - other entities...

# Exit
\q
```

### Step 7: Check Revenue Table Specifically

```bash
# Check if revenue table exists
sudo -u postgres psql -d fyp_db -c "\dt revenue"

# Should show:
# Schema | Name | Type | Owner
# ------+--------+-------+---------
# public | revenue | table | postgres

# Check columns in revenue table
sudo -u postgres psql -d fyp_db -c "\d revenue"

# Should show:
# Column           | Type | ...
# id               | uuid | ...
# client           | varchar | ...
# created_by_user_id | uuid | ...
# ...
```

---

## Common Issues & Solutions

### Issue 1: "could not change directory" Permission Error

**Cause**: Running from a directory without read permissions

**Solution**: Change to /tmp first

```bash
cd /tmp
sudo -u postgres psql -d fyp_db -c "SELECT * FROM revenue LIMIT 5;"
```

### Issue 2: "FATAL: role 'postgres' does not exist"

**Cause**: PostgreSQL not installed or database user not created

**Solution**: Install PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib

# Verify installation
sudo -u postgres psql --version
```

### Issue 3: "Could not connect to database server"

**Cause**: PostgreSQL service not running or wrong port

**Solution**: Check service and port

```bash
# Check status
sudo systemctl status postgresql

# Check if listening on correct port
sudo netstat -tulpn | grep postgres
# or
sudo ss -tulpn | grep postgres

# Expected: 127.0.0.1:5433 or :5433
```

### Issue 4: Database Created but Tables Missing

**Cause**: Migrations not run yet

**Solution**: Run migrations

```bash
cd ~/fyp_system/backend
npm run typeorm -- migration:run
```

---

## Quick Command Reference

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database
sudo -u postgres psql -c "CREATE DATABASE fyp_db;"

# Drop database (CAREFUL!)
sudo -u postgres psql -c "DROP DATABASE IF EXISTS fyp_db;"

# List all databases
sudo -u postgres psql -l

# Connect to specific database
sudo -u postgres psql -d fyp_db

# Run SQL file
sudo -u postgres psql -d fyp_db -f setup.sql

# Execute single command
sudo -u postgres psql -d fyp_db -c "SELECT * FROM users;"

# View table structure
sudo -u postgres psql -d fyp_db -c "\d users"

# View all tables
sudo -u postgres psql -d fyp_db -c "\dt"

# Check record count
sudo -u postgres psql -d fyp_db -c "SELECT COUNT(*) FROM revenue;"
```

---

## Environment Variables

Set these in your `.env` file or export them:

```bash
export DB_HOST=localhost
export DB_PORT=5433
export DB_USERNAME=postgres
export DB_PASSWORD=
export DB_NAME=fyp_db
```

Or in backend `.env`:

```
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=
DB_NAME=fyp_db
```

---

## Verify Complete Setup

Once everything is set up, run this sequence:

```bash
# 1. Check PostgreSQL running
sudo systemctl status postgresql

# 2. Check database exists
sudo -u postgres psql -l | grep fyp_db

# 3. Check tables exist
sudo -u postgres psql -d fyp_db -c "\dt"

# 4. Check revenue table has revenue column
sudo -u postgres psql -d fyp_db -c "\d revenue"

# 5. Check for test data
sudo -u postgres psql -d fyp_db -c "SELECT COUNT(*) FROM revenue;"
```

If all these succeed, your database is ready! ✅

---

## Troubleshooting Backend Connection

Once database is set up, verify the backend can connect:

```bash
cd ~/fyp_system/backend

# Run in development (should connect to database)
npm run dev

# Expected output:
# [Nest] 12345  - 12/21/2025, 10:00:00 AM     LOG [NestFactory] Starting Nest application...
# [Nest] 12345  - 12/21/2025, 10:00:01 AM     LOG [InstanceLoader] TypeOrmModule dependencies initialized...
# [Nest] 12345  - 12/21/2025, 10:00:01 AM     LOG [InstanceLoader] ... more modules ...
# [Nest] 12345  - 12/21/2025, 10:00:02 AM     LOG [NestApplication] Nest application successfully started
```

If you see database connection errors, check:
1. PostgreSQL is running: `sudo systemctl status postgresql`
2. Database exists: `sudo -u postgres psql -l | grep fyp_db`
3. Port is correct: Check data-source.ts for port 5433
4. Credentials are correct: Check .env file

---

## Need More Help?

Check logs in this order:

```bash
# 1. PostgreSQL logs
sudo tail -50 /var/log/postgresql/postgresql-*.log

# 2. Application logs
cd ~/fyp_system/backend
npm run dev 2>&1 | head -50

# 3. Database connectivity test
npm run typeorm -- query "SELECT 1"
```
