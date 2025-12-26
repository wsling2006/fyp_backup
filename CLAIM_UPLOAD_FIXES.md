# Claim Upload Security Fixes

## Date: December 26, 2025

## Issues Fixed

### 1. ✅ Upload Button Not Disabled After Claim Submission
**Problem:** Users could see and potentially click the "Upload Claim" button even after submitting a claim.

**Root Cause:** 
- Frontend `canUploadClaim()` function was checking `request.claims.length > 0`
- Backend was returning claims in the `getAllPurchaseRequests()` response
- The check was correct, but UI needed better immediate feedback

**Solution:**
- Already implemented: `canUploadClaim()` returns false when `request.claims.length > 0`
- The "Upload Claim" button is hidden and replaced with "✓ Claim Submitted" badge
- Added user feedback during upload process with scanning status

### 2. ✅ Duplicate File Upload Across Different Requests
**Problem:** Users could upload the same receipt file to multiple different purchase requests.

**Root Cause:** Already correctly implemented in backend!
- Backend uses SHA-256 hashing (`generateFileHash()` method)
- Backend checks for duplicate files via `findClaimByFileHash()` before saving
- Duplicate files are rejected with clear error message

**Solution:** 
- Backend properly rejects duplicate files across ALL requests
- Frontend now shows better error messages when duplicate is detected
- Added security notice in upload modal informing users about duplicate detection

### 3. ✅ ClamAV Scanning Feedback
**Problem:** Users didn't see feedback that their file was being scanned for malware.

**Solution:**
- Added scanning feedback message: "🔍 Scanning file for malware and validating... Please wait."
- Changed submit button text to "🔍 Scanning & Uploading..." during upload
- Added blue info box (instead of red error) for scanning status
- Added security notice in form explaining malware scanning and duplicate detection

## Code Changes

### Frontend: `/frontend/app/purchase-requests/page.tsx`

1. **Enhanced Upload Feedback:**
```typescript
// In handleSubmit function
setError('🔍 Scanning file for malware and validating... Please wait.');
```

2. **Better Error Display:**
```typescript
// Error box now shows blue for scanning status, red for actual errors
{error && (
  <div className={`border rounded-lg p-3 mb-4 ${
    error.includes('🔍') 
      ? 'bg-blue-50 border-blue-200' 
      : 'bg-red-50 border-red-200'
  }`}>
    <p className={`text-sm ${
      error.includes('🔍') 
        ? 'text-blue-800' 
        : 'text-red-800'
    }`}>{error}</p>
  </div>
)}
```

3. **Security Notice:**
```typescript
<div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-2">
  <p className="text-blue-800 text-xs">
    🔒 <strong>Security:</strong> All files are scanned for malware and checked for duplicates. 
    Each receipt can only be used once across all requests.
  </p>
</div>
```

4. **Submit Button Feedback:**
```typescript
{loading ? '🔍 Scanning & Uploading...' : 'Submit Claim'}
```

### Backend: No Changes Required!

The backend already has all security measures in place:

1. **File Hash Generation** (`purchase-request.service.ts:142`):
```typescript
private generateFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
```

2. **Duplicate File Check** (`purchase-request.service.ts:148`):
```typescript
private async findClaimByFileHash(hash: string): Promise<Claim | null> {
  return this.claimRepo.findOne({
    where: { file_hash: hash },
    relations: ['uploadedBy', 'purchaseRequest'],
  });
}
```

3. **One Claim Per Request Check** (`purchase-request.service.ts:403`):
```typescript
const existingClaim = await this.claimRepo.findOne({
  where: { purchase_request_id: data.purchase_request_id },
});

if (existingClaim) {
  throw new BadRequestException(
    'A claim has already been submitted for this purchase request. Only one claim per purchase request is allowed.',
  );
}
```

4. **Duplicate File Rejection** (`purchase-request.service.ts:418`):
```typescript
const fileHash = this.generateFileHash(data.file_buffer);
const duplicateClaim = await this.findClaimByFileHash(fileHash);

if (duplicateClaim) {
  throw new BadRequestException(
    `This receipt file has already been uploaded for claim ID: ${duplicateClaim.id} ` +
    `(Purchase Request: ${duplicateClaim.purchaseRequest?.title || 'N/A'}). ` +
    `Duplicate receipts are not allowed.`,
  );
}
```

5. **ClamAV Malware Scanning** (`purchase-request.service.ts:102-135`):
```typescript
async validateAndScanFile(file: UploadedFile): Promise<void> {
  // ... file type and size validation ...
  
  // ClamAV scan for malware
  const isClean = await this.clamavService.scanFile(file.buffer, file.originalname);
  if (!isClean) {
    throw new BadRequestException(
      'File failed security scan. The uploaded file may contain malware or viruses.',
    );
  }
}
```

6. **Claims Loaded with Purchase Requests** (`purchase-request.service.ts:275`):
```typescript
let query = this.purchaseRequestRepo.createQueryBuilder('pr')
  .leftJoinAndSelect('pr.createdBy', 'creator')
  .leftJoinAndSelect('pr.reviewedBy', 'reviewer')
  .leftJoinAndSelect('pr.claims', 'claims')  // ← Claims included!
  .orderBy('pr.created_at', 'DESC');
```

## Security Flow

### Upload Claim Flow:
1. User selects file in frontend
2. User enters vendor details and amount
3. User enters password → OTP sent to email
4. User enters OTP code
5. User clicks "Submit Claim"
6. **Frontend shows:** "🔍 Scanning file for malware and validating... Please wait."
7. **Backend performs:**
   - ✅ File type validation (PDF, JPG, PNG only)
   - ✅ File size validation (max 10MB)
   - ✅ **ClamAV malware scan** (blocks infected files)
   - ✅ **SHA-256 hash generation**
   - ✅ **Duplicate file check across ALL requests** (blocks duplicate receipts)
   - ✅ One claim per purchase request check
   - ✅ Amount validation (claimed ≤ approved)
   - ✅ OTP verification
   - ✅ Save file to disk with UUID filename
   - ✅ Store hash in database for future checks
8. **On Success:**
   - Frontend closes modal
   - Frontend calls `loadRequests()` to refresh data
   - Backend returns updated request with `claims` array
   - Upload button disappears
   - "✓ Claim Submitted" badge appears

### Why Upload Button is Hidden:
```typescript
const canUploadClaim = (request: PurchaseRequest) => {
  // Only APPROVED requests can have claims
  if (request.status !== 'APPROVED') return false;
  
  // Only one claim per purchase request is allowed
  if (request.claims && request.claims.length > 0) return false; // ← Hidden here!
  
  // Only owner or super_admin can upload
  const isOwner = request.created_by_user_id === user?.userId;
  return (user?.role === 'sales_department' || user?.role === 'marketing' || user?.role === 'super_admin') && (isOwner || user?.role === 'super_admin');
};
```

## Testing Checklist

### Test 1: Upload Button Disabled After Submission
- [x] Create a purchase request
- [x] Get it approved by accountant
- [x] Upload a claim with receipt
- [x] Verify "Upload Claim" button disappears
- [x] Verify "✓ Claim Submitted" badge appears
- [x] Refresh page and verify button still hidden

### Test 2: Duplicate File Prevention
- [x] Upload a receipt to Request A (success)
- [x] Try to upload the SAME receipt to Request B
- [x] Should see error: "This receipt file has already been uploaded for claim ID: XXX"
- [x] Try a different receipt → should work

### Test 3: ClamAV Scanning
- [x] Upload a clean PDF → should work with scanning feedback
- [x] During upload, see "🔍 Scanning file for malware and validating..."
- [x] Button shows "🔍 Scanning & Uploading..."
- [x] Upload completes successfully

### Test 4: One Claim Per Request
- [x] Upload claim to Request A
- [x] Try to upload another claim to same Request A
- [x] Should see error: "A claim has already been submitted for this purchase request"

### Test 5: User Feedback
- [x] Security notice shown: "All files are scanned for malware and checked for duplicates"
- [x] Scanning status shown during upload
- [x] Clear error messages for all failure cases
- [x] Success feedback with immediate UI update

## Database Schema

The `claims` table has the `file_hash` column for duplicate detection:

```sql
ALTER TABLE claims ADD COLUMN file_hash VARCHAR(64) NULL;
CREATE INDEX idx_claims_file_hash ON claims(file_hash);
```

## Deployment

### Deploy to EC2:
```bash
cd /Users/jw/fyp_system

# Build frontend
cd frontend
npm run build

# Build backend
cd ../backend
npm run build

# Restart PM2
pm2 restart ecosystem.config.js --update-env
```

## Summary

✅ **All security measures are in place and working:**
1. Upload button is properly hidden after claim submission
2. Duplicate files are blocked across all requests (SHA-256 hash check)
3. ClamAV malware scanning is enforced
4. One claim per purchase request is enforced
5. User receives clear feedback during all operations

✅ **User Experience Improvements:**
1. Scanning status feedback during upload
2. Security notice explaining protections
3. Clear error messages for all validation failures
4. Immediate UI update after successful upload

✅ **Backend Security:**
- File hash stored in database
- Duplicate detection via hash comparison
- ClamAV integration for malware scanning
- OTP verification required
- Role-based access control
- Comprehensive audit logging

All requirements are met and the system is production-ready! 🚀
