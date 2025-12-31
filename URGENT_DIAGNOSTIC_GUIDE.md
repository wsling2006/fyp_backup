# URGENT: Both Features Showing Blank Files

## Critical Discovery
You mentioned that **BOTH** accountant files AND claim files are now showing blank downloads, even though accountant files worked before. This suggests:

1. **Something changed in the environment** (database, Node.js, TypeORM)
2. **Database corruption or configuration issue**
3. **Memory/Buffer handling problem**

## Run This Diagnostic ON EC2:

```bash
cd ~/fyp_system
git pull origin main
./diagnose-blank-files-comprehensive.sh
```

## What This Will Check:

### Test 1: PostgreSQL BYTEA Support
- Tests if the database can store and retrieve binary data
- If this fails → PostgreSQL has issues

### Test 2: Existing Accountant Files
- Checks actual files in the database
- Shows if data is empty, all zeros, or valid
- If files are empty → Data wasn't stored properly

### Test 3: TypeORM Write Test
- Simulates an upload using TypeORM
- Tests if TypeORM can write binary data
- If this fails → TypeORM configuration issue

### Test 4: System Check
- Node version, memory, disk space
- Could be out of memory or disk space

## Possible Causes:

### 1. PostgreSQL Configuration
```bash
# Check PostgreSQL settings
sudo -u postgres psql -d fyp_db -c "SHOW bytea_output;"
# Should be 'hex' or 'escape', not something else
```

### 2. Node.js pg Module Issue
```bash
# Check pg module version
cd ~/fyp_system/backend
npm list pg
# Should be a recent stable version
```

### 3. Memory Issues
```bash
# Check available memory
free -h
# If low, might cause buffer issues
```

### 4. TypeORM Entity Cache
```bash
# Try clearing TypeORM cache
cd ~/fyp_system/backend
rm -rf dist/
npm run build
pm2 restart fyp-backend
```

## Quick Test - Upload and Check Immediately:

```bash
# 1. Upload a file via the UI
# 2. Immediately check database:
cd ~/fyp_system/backend
node << 'EOF'
const { Client } = require('pg');

async function check() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: 'fyp_db',
  });
  
  await client.connect();
  
  const result = await client.query(`
    SELECT 
      filename,
      size,
      LENGTH(data) as actual_size,
      SUBSTRING(ENCODE(data, 'hex'), 1, 40) as first_bytes
    FROM accountant_files 
    ORDER BY created_at DESC 
    LIMIT 1
  `);
  
  console.log('Latest upload:');
  console.log(result.rows[0]);
  
  await client.end();
}

check();
EOF
```

## Expected Output:

**If working correctly:**
```
filename: 'test.pdf'
size: 12345
actual_size: 12345
first_bytes: '255044462d312e340a...' (non-zero data)
```

**If broken:**
```
filename: 'test.pdf'
size: 12345
actual_size: 0       ← PROBLEM!
first_bytes: null    ← NO DATA!
```

## Next Steps:

1. **Run the diagnostic script** and share the full output
2. **Check when it started failing** (after what change?)
3. **Check PostgreSQL logs** for errors
4. **Verify disk space** isn't full

This will help us pinpoint whether it's a database issue, application issue, or environment issue.
