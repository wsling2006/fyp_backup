# Database Migration Guide - Add Hash Column

## Overview

This migration adds a `file_hash` column to the `accountant_files` table for duplicate detection.

## Migration SQL

Run this SQL to add the hash column to your existing database:

```sql
-- Add file_hash column to accountant_files table (nullable for existing files)
ALTER TABLE accountant_files 
ADD COLUMN file_hash VARCHAR(64);

-- Create unique index on file_hash for fast duplicate lookups
-- Note: NULL values are allowed and won't conflict with the unique constraint
CREATE UNIQUE INDEX idx_accountant_files_hash 
ON accountant_files(file_hash);

-- Verify the column was added
\d accountant_files
```

**Important Notes:**
- Column is nullable to support existing files without hashes
- New uploads will always get a hash
- Duplicate detection only works for files that have hashes
- You can optionally populate hashes for existing files (see below)

## TypeORM Auto-Migration (Alternative)

If you're using TypeORM's `synchronize: true` in development (which you likely are), TypeORM will automatically add the column when you restart the backend. **No manual SQL needed!**

Just restart your backend server:
```bash
npm run dev
```

TypeORM will detect the schema change and execute:
```sql
ALTER TABLE accountant_files ADD COLUMN file_hash VARCHAR(64);
CREATE UNIQUE INDEX idx_accountant_files_hash ON accountant_files(file_hash);
```

**For production** (with `synchronize: false`), you should generate a proper migration:

```bash
# Generate migration
npm run typeorm migration:generate -- -n AddFileHashColumn

# Run migration
npm run typeorm migration:run
```

## Rollback (if needed)

```sql
-- Remove the unique index
DROP INDEX IF EXISTS idx_accountant_files_hash;

-- Remove the column
ALTER TABLE accountant_files 
DROP COLUMN IF EXISTS file_hash;
```

## Verification

After running the migration, verify:

```sql
-- Check table structure
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'accountant_files'
ORDER BY ordinal_position;

-- Should show file_hash as varchar(64), not nullable (after first upload)
```

## Impact on Existing Data

- **Existing files**: Will have `NULL` hash initially
- **New uploads**: Will always have a hash
- **Duplicate detection**: Only works for files uploaded AFTER this migration
- **Recommendation**: If you have important existing files, consider writing a one-time script to generate hashes for them

## One-Time Hash Population Script (Optional)

If you want to generate hashes for existing files, use the provided script:

```bash
# Method 1: Using ts-node directly
npx ts-node scripts/populate-file-hashes.ts

# Method 2: Add to package.json scripts
# "scripts": {
#   "populate-hashes": "ts-node scripts/populate-file-hashes.ts"
# }
npm run populate-hashes
```

The script will:
1. Find all files without hashes
2. Generate SHA256 hash for each file
3. Update the database
4. Handle duplicates gracefully
5. Show a summary report

**Output Example:**
```
🔧 Starting hash population for existing files...
✅ Database connected

📊 Found 5 files without hashes

✅ report.pdf → 4e07408562bedb8b...
✅ invoice.xlsx → 2c26b46b68ffc68f...
⚠️  duplicate.txt → Error: duplicate hash
✅ document.docx → 6b86b273ff34fce1...
✅ notes.txt → ef2d127de37b942b...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary:
   ✅ Success: 4
   ❌ Errors:  1
   📁 Total:   5
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Post-Migration Testing

Test the new functionality:

```bash
# 1. Upload a file
curl -X POST http://localhost:3000/accountant-files/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@test.txt"

# 2. Try to upload the SAME file again
curl -X POST http://localhost:3000/accountant-files/upload \
  -H "Authorization: Bearer <TOKEN>" \
  -F "file=@test.txt"

# Expected: Error message about duplicate file
```
