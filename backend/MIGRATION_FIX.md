# 🔧 Migration Fix: Nullable Hash Column

## Problem

The backend failed to start with the error:
```
QueryFailedError: column "file_hash" of relation "accountant_files" contains null values
```

**Root Cause:** TypeORM was trying to add the `file_hash` column as NOT NULL, but existing rows in the `accountant_files` table had NULL values (since they were uploaded before the hash feature existed).

---

## Solution

Made the `file_hash` column **nullable** to support existing files.

### Code Change

**File:** `backend/src/accountant-files/accountant-file.entity.ts`

```typescript
// BEFORE (caused error)
@Column({ type: 'varchar', length: 64, unique: true })
file_hash: string;

// AFTER (fixed)
@Column({ type: 'varchar', length: 64, unique: true, nullable: true })
file_hash: string | null;
```

---

## How It Works Now

### For New Uploads
- ✅ SHA256 hash is **always generated**
- ✅ Hash is **always stored** in `file_hash` column
- ✅ Duplicate detection works perfectly

### For Existing Files (uploaded before this feature)
- ⚠️ `file_hash` is **NULL**
- ⚠️ These files **won't participate** in duplicate detection
- ✅ You can optionally populate hashes using the migration script

---

## Migration Status

### Automatic Migration (Development)

Since you're using TypeORM's `synchronize: true`, the migration happened automatically when the backend restarted:

```sql
-- TypeORM automatically executed:
ALTER TABLE accountant_files ADD COLUMN file_hash VARCHAR(64);
CREATE UNIQUE INDEX idx_accountant_files_hash ON accountant_files(file_hash);
```

✅ **Backend is now running successfully!**

---

## Optional: Populate Hashes for Existing Files

If you have existing files and want them to participate in duplicate detection:

### Method 1: Manual SQL (if you know there are no duplicates)

```sql
-- This will fail if there are duplicate files
UPDATE accountant_files 
SET file_hash = encode(digest(data, 'sha256'), 'hex')
WHERE file_hash IS NULL;
```

### Method 2: Using the Provided Script (Recommended)

```bash
# Run the hash population script
npx ts-node scripts/populate-file-hashes.ts
```

**The script will:**
- ✅ Find all files without hashes
- ✅ Generate SHA256 hash for each
- ✅ Handle duplicates gracefully (skip with warning)
- ✅ Show detailed progress
- ✅ Provide summary report

**Example Output:**
```
🔧 Starting hash population for existing files...
✅ Database connected

📊 Found 3 files without hashes

✅ report.pdf → 4e07408562bedb8b...
✅ invoice.xlsx → 2c26b46b68ffc68f...
✅ document.docx → 6b86b273ff34fce1...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary:
   ✅ Success: 3
   ❌ Errors:  0
   📁 Total:   3
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Done!
```

---

## Verification

### 1. Check Backend is Running

```bash
curl http://localhost:3000
# Should return: {"message":"Cannot GET /","error":"Not Found","statusCode":404}
# This 404 is expected - it means the backend is running
```

### 2. Check Database Schema

```sql
-- Connect to your database
\d accountant_files

-- You should see file_hash column:
-- file_hash | character varying(64) | | |
```

### 3. Test File Upload

```bash
# Upload a file
curl -X POST http://localhost:3000/accountant-files/upload \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -F "file=@test.txt"

# Should succeed and file should have a hash in database
```

### 4. Test Duplicate Detection

```bash
# Upload the same file again
curl -X POST http://localhost:3000/accountant-files/upload \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -F "file=@test.txt"

# Should return error: "This file already exists in the system..."
```

---

## Database State After Fix

### New Files (uploaded after fix)
```sql
SELECT id, filename, file_hash FROM accountant_files 
WHERE file_hash IS NOT NULL;

-- Example output:
-- id                                   | filename    | file_hash
-- ------------------------------------+-------------+------------------
-- 123e4567-e89b-12d3-a456-426614174000 | report.pdf  | 4e07408562bedb8b...
```

### Old Files (uploaded before fix)
```sql
SELECT id, filename, file_hash FROM accountant_files 
WHERE file_hash IS NULL;

-- Example output:
-- id                                   | filename     | file_hash
-- ------------------------------------+--------------+----------
-- 987e6543-e21b-98d7-a654-426614174999 | old-file.pdf | NULL
```

---

## Impact Analysis

### ✅ What's Working

- ✅ Backend starts successfully
- ✅ New file uploads work
- ✅ SHA256 hash is generated for all new uploads
- ✅ Duplicate detection works for new files
- ✅ All existing security features intact
- ✅ ClamAV scanning still active

### ⚠️ Limitations

- ⚠️ Existing files (with NULL hash) won't be checked for duplicates
- ⚠️ You can upload a duplicate of an old file (until you populate hashes)

### 🔧 To Fully Enable Duplicate Detection

Run the hash population script:
```bash
npx ts-node scripts/populate-file-hashes.ts
```

---

## Files Modified

1. **`accountant-file.entity.ts`**
   - Made `file_hash` column nullable
   - Updated TypeScript type to `string | null`

2. **`scripts/populate-file-hashes.ts`** (new)
   - Script to generate hashes for existing files
   - Handles duplicates gracefully

3. **`MIGRATION_ADD_HASH.md`** (updated)
   - Added information about nullable column
   - Added TypeORM auto-migration section
   - Updated hash population instructions

---

## For FYP Documentation

### Problem-Solving Demonstrated

**Issue:** Database migration conflict with existing data

**Solution:** 
- Made new column nullable to support legacy data
- Provided migration script for optional backfill
- Documented trade-offs and limitations

**Learning Points:**
1. Database schema evolution requires careful handling of existing data
2. Nullable columns provide backward compatibility
3. Unique constraints work with NULL values (multiple NULLs allowed)
4. TypeORM synchronize feature simplifies development migrations

---

## Summary

✅ **Issue Resolved:** Backend now starts successfully  
✅ **Migration Complete:** `file_hash` column added (nullable)  
✅ **New Uploads:** Working with hash generation  
✅ **Duplicate Detection:** Working for new files  
⚠️ **Existing Files:** Optional hash population available  
📚 **Documentation:** Updated with migration guide

**Status:** Ready for testing and development!
