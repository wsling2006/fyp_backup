# PostgreSQL Connection Error Fix

## Error
```
psql: error: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: 
FATAL: Peer authentication failed for user "postgres"
```

## Root Cause
PostgreSQL is configured for "peer authentication" which requires you to connect as a system user that matches the database user.

## Solutions (Try in Order)

### Solution 1: Connect as postgres system user (RECOMMENDED)
```bash
# On EC2
sudo -u postgres psql -d fyp_system -f backend/migrations/add_document_types_to_enum.sql
```

### Solution 2: Connect as ubuntu user (if database owned by ubuntu)
```bash
sudo -u ubuntu psql -d fyp_system -f backend/migrations/add_document_types_to_enum.sql
```

### Solution 3: Use automated script (tries all methods)
```bash
cd /home/ubuntu/fyp_system
chmod +x run-hr-enum-migration.sh
./run-hr-enum-migration.sh
```

### Solution 4: Connect with localhost (uses password authentication)
```bash
psql -h localhost -U postgres -d fyp_system
# Enter password when prompted
# Then paste migration commands:
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'EMPLOYMENT_AGREEMENT';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'CERTIFICATION';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW';
\q
```

### Solution 5: Interactive method (manual)
```bash
# Connect as postgres system user
sudo -u postgres psql

# Switch to fyp_system database
\c fyp_system

# Run migration commands
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'EMPLOYMENT_AGREEMENT';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'CERTIFICATION';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW';

# Verify
SELECT unnest(enum_range(NULL::employee_documents_document_type_enum));

# Exit
\q
```

## Verification

After running migration, verify it worked:

```bash
# Method 1
sudo -u postgres psql -d fyp_system -c "SELECT unnest(enum_range(NULL::employee_documents_document_type_enum));"

# Method 2
sudo -u ubuntu psql -d fyp_system -c "SELECT unnest(enum_range(NULL::employee_documents_document_type_enum));"
```

Expected output (should include all 8 values):
```
              unnest              
──────────────────────────────────
 RESUME
 EMPLOYMENT_CONTRACT
 OFFER_LETTER
 IDENTITY_DOCUMENT
 OTHER
 EMPLOYMENT_AGREEMENT    ← NEW
 CERTIFICATION           ← NEW
 PERFORMANCE_REVIEW      ← NEW
(8 rows)
```

## Alternative: Check Database User

If none of the above work, check who owns the database:

```bash
sudo -u postgres psql -c "\l fyp_system"
```

Then connect as that user:
```bash
sudo -u <database_owner> psql -d fyp_system -f backend/migrations/add_document_types_to_enum.sql
```

## Quick Fix Summary

**Fastest method** (try this first):
```bash
cd /home/ubuntu/fyp_system
sudo -u postgres psql -d fyp_system << 'EOF'
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'EMPLOYMENT_AGREEMENT';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'CERTIFICATION';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW';
EOF
```

Then verify:
```bash
sudo -u postgres psql -d fyp_system -c "SELECT unnest(enum_range(NULL::employee_documents_document_type_enum));" | grep CERTIFICATION
```

If you see "CERTIFICATION" in the output, migration succeeded! ✅

Then continue with:
```bash
cd backend
npm run build
pm2 restart backend
```
