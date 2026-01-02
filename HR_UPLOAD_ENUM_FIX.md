# HR Upload ENUM Mismatch Fix

## 🎯 ROOT CAUSE IDENTIFIED ✅

**Error**: `invalid input value for enum employee_documents_document_type_enum: "CERTIFICATION"`

### The Problem
Frontend, Controller, and Database had **mismatched document type enums**!

#### Frontend (Upload Modal)
Offers these document types:
- ✅ RESUME
- ❌ EMPLOYMENT_AGREEMENT (not in DB)
- ✅ EMPLOYMENT_CONTRACT  
- ✅ OFFER_LETTER
- ✅ IDENTITY_DOCUMENT
- ❌ **CERTIFICATION** ← **THIS CAUSED THE ERROR**
- ❌ PERFORMANCE_REVIEW (not in DB)
- ✅ OTHER

#### Controller Validation
Accepts these types:
```typescript
[
  'RESUME',
  'EMPLOYMENT_AGREEMENT',
  'EMPLOYMENT_CONTRACT',
  'OFFER_LETTER',
  'IDENTITY_DOCUMENT',
  'CERTIFICATION',
  'PERFORMANCE_REVIEW',
  'OTHER'
]
```

#### Database Entity (BEFORE FIX)
Only had these types:
```typescript
enum: ['RESUME', 'EMPLOYMENT_CONTRACT', 'OFFER_LETTER', 'IDENTITY_DOCUMENT', 'OTHER']
```

**Missing**: `EMPLOYMENT_AGREEMENT`, `CERTIFICATION`, `PERFORMANCE_REVIEW`

### The Flow of Failure
1. User selects "🎓 Certification / Qualification" in upload modal ✅
2. Frontend sends `documentType: "CERTIFICATION"` ✅
3. Controller validates - passes (CERTIFICATION is in the validTypes list) ✅
4. ClamAV scans file - passes ✅
5. Service tries to save to database with `document_type: "CERTIFICATION"` ❌
6. **PostgreSQL rejects**: Not a valid enum value! ❌
7. Upload fails with enum error ❌

## ✅ FIXES APPLIED

### 1. Updated Entity Enum
**File**: `backend/src/employees/employee-document.entity.ts`

**Before**:
```typescript
enum: ['RESUME', 'EMPLOYMENT_CONTRACT', 'OFFER_LETTER', 'IDENTITY_DOCUMENT', 'OTHER']
```

**After**:
```typescript
enum: [
  'RESUME',
  'EMPLOYMENT_AGREEMENT',
  'EMPLOYMENT_CONTRACT',
  'OFFER_LETTER',
  'IDENTITY_DOCUMENT',
  'CERTIFICATION',
  'PERFORMANCE_REVIEW',
  'OTHER'
]
```

### 2. Created Database Migration
**File**: `backend/migrations/add_document_types_to_enum.sql`

Adds the missing enum values to PostgreSQL:
```sql
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'EMPLOYMENT_AGREEMENT';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'CERTIFICATION';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW';
```

## 🚀 DEPLOYMENT STEPS

### 1. On Local Machine
```bash
cd /Users/jw/fyp_system
git add backend/src/employees/employee-document.entity.ts
git add backend/migrations/add_document_types_to_enum.sql
git commit -m "Fix HR upload enum mismatch - add missing document types"
git push origin main
```

### 2. On EC2 - Pull Code
```bash
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_IP
cd /home/ubuntu/fyp_system
git pull origin main
```

### 3. On EC2 - Run Database Migration
```bash
cd /home/ubuntu/fyp_system/backend

# Connect to PostgreSQL and run migration
psql -U postgres -d fyp_system -f migrations/add_document_types_to_enum.sql

# Or connect interactively
psql -U postgres -d fyp_system

# Then paste the migration commands:
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'EMPLOYMENT_AGREEMENT';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'CERTIFICATION';
ALTER TYPE employee_documents_document_type_enum ADD VALUE IF NOT EXISTS 'PERFORMANCE_REVIEW';
\q
```

### 4. On EC2 - Rebuild and Restart
```bash
cd /home/ubuntu/fyp_system/backend
npm run build
pm2 restart backend
pm2 status
```

### 5. Verify Migration
```bash
# Check the enum values in PostgreSQL
psql -U postgres -d fyp_system -c "SELECT unnest(enum_range(NULL::employee_documents_document_type_enum));"
```

Expected output:
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
```

## 🧪 TESTING

### Test 1: Upload with CERTIFICATION (Previously Failed)
1. Go to employee detail page
2. Click "📤 Upload Document"
3. Select a PDF file
4. Choose "🎓 Certification / Qualification"
5. Click "Upload Document"
6. **Expected**: ✅ Upload succeeds!

### Test 2: Upload with EMPLOYMENT_AGREEMENT
1. Choose "📝 Employment Agreement"
2. Upload file
3. **Expected**: ✅ Upload succeeds!

### Test 3: Upload with PERFORMANCE_REVIEW
1. Choose "⭐ Performance Review"
2. Upload file
3. **Expected**: ✅ Upload succeeds!

### Test 4: All Other Document Types
- ✅ Resume / CV
- ✅ Employment Contract
- ✅ Offer Letter
- ✅ Identity Document
- ✅ Other

All should work!

## 📊 MONITORING

### Watch Logs During Upload
```bash
pm2 logs backend --lines 0
```

### Expected Success Logs
```
[HR] Validating file: document.pdf
[HR] Scanning file with ClamAV: document.pdf
[ClamavService] File is clean: document.pdf
[HR] ClamAV scan passed: document.pdf
[HR] Uploading document to database for employee: abc-123
[uploadDocument] Starting upload for employee: abc-123
[uploadDocument] File: document.pdf, Type: CERTIFICATION, UploadedBy: user-456
[uploadDocument] Employee found: John Doe
[uploadDocument] No duplicate found
[uploadDocument] Document record created, saving to database...
[uploadDocument] Document saved successfully with ID: doc-789  ← SUCCESS!
[HR] Document uploaded successfully: doc-789
```

No more enum errors! ✅

## 🔍 TECHNICAL EXPLANATION

### Why This Happened
1. **Frontend was updated** to offer new document types (CERTIFICATION, etc.)
2. **Controller validation was updated** to accept these types
3. **Entity enum was NOT updated** ← Missing step!
4. **Database enum was NOT updated** ← Missing step!

Result: Frontend → Controller → Service → **Database rejects**

### The Fix
Synchronized all layers:
- ✅ Frontend offers document types
- ✅ Controller validates document types
- ✅ Entity defines document types
- ✅ Database accepts document types

All layers now consistent!

### PostgreSQL Enum Notes
- ✅ Can ADD values to enum (safe, what we did)
- ❌ Cannot REMOVE values from enum (requires recreating enum)
- ❌ Cannot REORDER enum values (order is append-only)
- ✅ `IF NOT EXISTS` prevents errors if value already added

## 🎉 SUCCESS CRITERIA

The fix is successful when:
1. ✅ All 8 document types can be uploaded
2. ✅ No more enum mismatch errors
3. ✅ Documents appear in employee document list
4. ✅ Downloads work for all document types
5. ✅ Backend logs show success messages

## 📋 ROLLBACK PLAN

If issues arise (unlikely):

### Rollback Code
```bash
git revert HEAD
git push origin main
# Deploy reverted code to EC2
```

### Note About Database
- Enum values CANNOT be easily removed from PostgreSQL
- But the extra values won't cause issues
- Old code will still work (it only uses subset of values)
- New code needs the extra values to work

## 🔗 RELATED ISSUES

This fix resolves:
- ❌ "invalid input value for enum" error
- ❌ Upload fails after ClamAV scan
- ❌ Frontend shows generic error message

Previous fixes (already applied):
- ✅ Timeout added (120s) - Fixed hanging uploads
- ✅ Endpoint corrected (/documents/upload) - Fixed 404 errors
- ✅ Enhanced logging - Helped identify this enum issue

---

**Status**: ✅ FIXED in code, ⏳ Pending deployment and DB migration  
**Commit**: Fix HR upload enum mismatch - add missing document types  
**Files Changed**: 2 (entity + migration SQL)  
**Database Changes**: 3 new enum values  
**Breaking**: No (backwards compatible)  
**Risk**: Low (adding enum values is safe)
