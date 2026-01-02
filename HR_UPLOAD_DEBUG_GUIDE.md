# HR Upload Debugging Guide

## Issue Report
**Status**: 🔍 INVESTIGATING  
**Symptom**: Upload fails AFTER ClamAV scan completes successfully  
**Frontend Error**: "⚠️ Document upload failed. Please try again later."

## Backend Logs (Current)
```
[ClamavService] Writing temporary file for scanning: upload_1767311722694_nxvtmm_eStatement20251111-000567862.pdf
[ClamavService] Scanning file with ClamAV: upload_1767311722694_nxvtmm_eStatement20251111-000567862.pdf
[ClamavService] File is clean: upload_1767311722694_nxvtmm_eStatement20251111-000567862.pdf
[ClamavService] Temporary file deleted: upload_1767311722694_nxvtmm_eStatement20251111-000567862.pdf
```

**Key Observation**: ClamAV scan passes, but then NO ERROR is logged! This suggests:
1. The error happens after ClamAV scan
2. Error might be in database save operation
3. Error handling might be swallowing the details

## Enhanced Logging Added

### Controller Level (`hr.controller.ts`)
Now logs:
- ✅ File validation start
- ✅ ClamAV scan start
- ✅ ClamAV scan pass
- ✅ Database upload start
- ✅ Upload success with document ID
- ✅ **Full error details with stack trace**

### Service Level (`hr.service.ts`)
Now logs:
- ✅ Upload start with employee ID
- ✅ File details (name, type, uploader)
- ✅ Employee verification
- ✅ Hash generation
- ✅ Duplicate check
- ✅ Document creation
- ✅ Database save start
- ✅ Database save success with ID
- ✅ **Database save errors with stack trace**

## Deployment Steps for Debugging

### 1. Push Code to GitHub
```bash
cd /Users/jw/fyp_system
git push origin main
```

### 2. Deploy to EC2
```bash
# SSH to EC2
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_IP

# Pull latest code
cd /home/ubuntu/fyp_system
git pull origin main

# Rebuild backend
cd backend
npm install
npm run build

# Restart backend
pm2 restart backend

# Verify it's running
pm2 status
```

### 3. Monitor Logs During Upload
```bash
# Watch backend logs in real-time
pm2 logs backend --lines 0

# Then try uploading a file and watch for detailed logs
```

## Expected Log Output (With Fix)

### Successful Upload
```
[HR] Validating file: resume.pdf
[HR] Scanning file with ClamAV: resume.pdf
[ClamavService] Writing temporary file for scanning: upload_xxx_resume.pdf
[ClamavService] Scanning file with ClamAV: upload_xxx_resume.pdf
[ClamavService] File is clean: upload_xxx_resume.pdf
[ClamavService] Temporary file deleted: upload_xxx_resume.pdf
[HR] ClamAV scan passed: resume.pdf
[HR] Uploading document to database for employee: abc-123-def
[uploadDocument] Starting upload for employee: abc-123-def
[uploadDocument] File: resume.pdf, Type: RESUME, UploadedBy: user-456
[uploadDocument] Checking if employee exists...
[uploadDocument] Employee found: John Doe
[uploadDocument] Generating file hash...
[uploadDocument] File hash: 7f83b1657ff1fc...
[uploadDocument] Checking for duplicate files...
[uploadDocument] No duplicate found
[uploadDocument] Creating document record...
[uploadDocument] Document record created, saving to database...
[uploadDocument] Document saved successfully with ID: doc-789
[HR] Document uploaded successfully: doc-789
```

### Failed Upload (We'll see where)
The new logging will show EXACTLY which step fails:
- Employee not found?
- Duplicate file?
- Database connection error?
- Foreign key constraint?
- Permission error?

## Potential Issues to Check

### Issue 1: Database Connection
```bash
# On EC2, check if PostgreSQL is running
sudo systemctl status postgresql

# Check database connection
cd /home/ubuntu/fyp_system/backend
npx typeorm query "SELECT NOW()"
```

### Issue 2: User ID Issue
The controller passes `req.user.userId` to the service. Check:
- Is user authenticated?
- Is userId valid UUID?
- Does the user exist in the database?

**Look for this in logs:**
```
[uploadDocument] UploadedBy: undefined  ← BAD!
[uploadDocument] UploadedBy: null       ← BAD!
[uploadDocument] UploadedBy: abc-123    ← GOOD!
```

### Issue 3: Foreign Key Constraint
The document has:
- `employee_id` → must reference valid employee
- `uploaded_by_id` → must reference valid user

**Potential SQL Error:**
```
SQLSTATE[23503]: Foreign key violation: 
Key (uploaded_by_id)=(xxx) is not present in table "users"
```

### Issue 4: Column Name Mismatch
Check entity definition:
```typescript
// In employee-document.entity.ts
@Column()
uploaded_by_id: string;  // Must match database column
```

### Issue 5: Transaction/Connection Pool
Database might be:
- Out of connections
- Transaction timeout
- Lock conflict

## Quick Tests

### Test 1: Check Employee Exists
```sql
SELECT id, name FROM employees WHERE id = 'EMPLOYEE_ID_HERE';
```

### Test 2: Check User Exists
```sql
SELECT id, email FROM users WHERE id = 'USER_ID_HERE';
```

### Test 3: Check Document Table
```sql
-- Check table structure
\d employee_documents

-- Check recent uploads
SELECT id, filename, employee_id, uploaded_by_id, created_at 
FROM employee_documents 
ORDER BY created_at DESC 
LIMIT 5;
```

### Test 4: Manual Insert Test
```sql
-- Try inserting a document manually to see if it's a code issue or DB issue
INSERT INTO employee_documents (
  id, employee_id, filename, mimetype, size, 
  document_type, uploaded_by_id, file_hash, created_at
) VALUES (
  gen_random_uuid(), 
  'VALID_EMPLOYEE_ID', 
  'test.pdf', 
  'application/pdf', 
  1000, 
  'OTHER', 
  'VALID_USER_ID', 
  'test_hash_123', 
  NOW()
);
```

## Comparison with Working Accountant Upload

### Accountant Upload (WORKS)
```typescript
// Controller
const saved = await this.service.create(file, req.user?.userId);

// Service
async create(file: UploadedFile, userId?: string) {
  const entity = this.repo.create({
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    data: file.buffer,
    file_hash: fileHash,
    uploaded_by_id: userId || null,  // ← NULL ALLOWED!
  });
  return this.repo.save(entity);
}
```

**Key Difference**: Accountant allows `uploaded_by_id` to be NULL!

### HR Upload (BROKEN?)
```typescript
// Controller
const document = await this.hrService.uploadDocument(
  employeeId,
  file,
  documentType,
  description || null,
  req.user.userId,  // ← What if this is undefined?
);

// Service
uploaded_by_id: uploadedBy,  // ← NOT NULL!
```

**Possible Fix**: Make `uploaded_by_id` optional/nullable?

## Hypothesis

Based on the logs stopping after ClamAV scan, I suspect:

1. **Most Likely**: `req.user.userId` is undefined or invalid
   - Check: Does JWT token have userId?
   - Check: Is user properly authenticated?

2. **Second Most Likely**: Foreign key constraint failure
   - uploaded_by_id doesn't exist in users table
   - employee_id doesn't exist (unlikely, since we just checked)

3. **Third Most Likely**: Database column name mismatch
   - Entity says `uploaded_by_id`
   - Database has different column name

## Action Plan

1. ✅ Add comprehensive logging (DONE)
2. ⏳ Push to GitHub
3. ⏳ Deploy to EC2
4. ⏳ Try upload and capture full logs
5. ⏳ Identify exact failure point from logs
6. ⏳ Apply targeted fix based on error
7. ⏳ Test and verify

## Quick Fix If It's User ID Issue

If logs show `UploadedBy: undefined`, apply this fix:

```typescript
// In hr.controller.ts
const document = await this.hrService.uploadDocument(
  employeeId,
  file,
  documentType,
  description || null,
  req.user?.userId || null,  // ← Add null fallback
);

// In hr.service.ts - change parameter type
uploadedBy: string | null,  // ← Allow null

// In create call
uploaded_by_id: uploadedBy || null,  // ← Handle null
```

---

**Next Step**: Deploy to EC2 and collect detailed logs!
