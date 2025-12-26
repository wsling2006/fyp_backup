# 🎯 FOUND THE ISSUE! - Edit Button Mystery Solved

## The Real Problem

**YOU DON'T HAVE ANY DRAFT OR SUBMITTED REQUESTS!**

All your purchase requests are either:
- ❌ `APPROVED` (4 requests)
- ❌ `REJECTED` (1 request)

## Business Rule (Working as Designed)

The Edit button **ONLY appears** on requests with these statuses:
- ✅ `DRAFT` - Not yet submitted
- ✅ `SUBMITTED` - Pending review

The Edit button **NEVER appears** on:
- ❌ `APPROVED` - Already approved (immutable for data integrity)
- ❌ `REJECTED` - Already rejected (immutable for audit trail)
- ❌ `UNDER_REVIEW` - Being reviewed by accountant
- ❌ `PAID` - Already paid (immutable)

## Why This Design?

**Data Integrity & Audit Trail:**
- Once a request is approved/rejected, it becomes part of the financial record
- Editing approved requests would break audit compliance
- The accountant's decision must be permanent and traceable

## Your Database State

```
Request ID                           | Title   | Status   | Created By (Your ID)
-------------------------------------|---------|----------|---------------------
cfad998c-46d6-447c-a56e-e1331858c5c1 | 1       | APPROVED | a11b07a6-7897-...
1df9e9d4-b0e8-442f-9d39-1fef7805052a | test    | REJECTED | a11b07a6-7897-...
52e5537e-469d-423d-a497-f2a8aed42d86 | 3       | APPROVED | a11b07a6-7897-...
a39a9296-a157-45d9-9f74-6e16089c3613 | 1.test  | APPROVED | a11b07a6-7897-...
6af4bb81-2d97-4360-a47a-49a3ee5dc337 | 2       | APPROVED | a11b07a6-7897-...
```

**Result:** NO requests are editable (by design)!

## How to Test the Edit Button

### Option 1: Create New Requests via UI
1. Go to Purchase Requests page
2. Click "+ New Request"
3. Fill in details but **DO NOT submit yet** (or submit and it becomes SUBMITTED)
4. The request will be in DRAFT/SUBMITTED status
5. ✅ Edit button will appear!

### Option 2: Use the Test Script (Quick)

On EC2, run:
```bash
cd ~/fyp_system
git pull origin main
bash create-test-requests.sh
```

This will create 2 test requests for you:
- `TEST DRAFT - Please Edit Me` (DRAFT status)
- `TEST SUBMITTED - Please Edit Me` (SUBMITTED status)

Both will have the Edit button!

### Option 3: Change Existing Request to DRAFT (Not Recommended)

```bash
# Only for testing! This breaks audit trail in production
sudo -u postgres psql fyp_db -c "
UPDATE purchase_requests 
SET status = 'DRAFT', 
    approved_amount = NULL,
    reviewed_by_user_id = NULL,
    review_notes = NULL,
    reviewed_at = NULL,
    updated_at = NOW()
WHERE id = 'cfad998c-46d6-447c-a56e-e1331858c5c1';
"
```

## Complete System Test Checklist

### ✅ What Should Happen:

**For DRAFT Requests:**
- [ ] Edit button appears for owner
- [ ] Edit button opens modal
- [ ] Can change title, description, amount, priority
- [ ] OTP is required
- [ ] Changes are saved
- [ ] Audit log is created

**For SUBMITTED Requests:**
- [ ] Edit button appears for owner
- [ ] Same as DRAFT above

**For APPROVED Requests:**
- [ ] NO Edit button (immutable)
- [ ] Upload Claim button appears (if no claim yet)
- [ ] Can upload receipt as claim

**For REJECTED Requests:**
- [ ] NO Edit button (immutable)
- [ ] Can create new request instead

**For Super Admin:**
- [ ] Can edit ANY user's DRAFT/SUBMITTED requests
- [ ] Cannot edit APPROVED/REJECTED (same rules)

## The Code Is Working Correctly! ✅

The Edit button logic:

```typescript
const canEditRequest = (request: PurchaseRequest) => {
  // Only owner or super_admin can edit
  const isOwner = request.created_by_user_id === user?.userId;
  if (!isOwner && user?.role !== 'super_admin') return false;
  
  // Can only edit DRAFT or SUBMITTED status
  return ['DRAFT', 'SUBMITTED'].includes(request.status);  // ← THIS IS CORRECT!
};
```

Your requests are `APPROVED` → Returns `false` → No Edit button → **Working as designed!**

## Full System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Purchase Request Lifecycle                    │
└─────────────────────────────────────────────────────────────────┘

DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED/REJECTED → PAID
  ↑         ↑           
  └─────────┘           
  CAN EDIT             

                         ↓                ↓           ↓
                      CANNOT EDIT (Immutable for audit)
```

## Summary

**There is NO bug!** 🎉

The Edit button is working exactly as designed:
- ✅ You created 5 requests
- ✅ Accountant reviewed them (4 approved, 1 rejected)
- ✅ Those requests became immutable (cannot edit)
- ✅ Edit button correctly hidden on immutable requests

**To test the Edit button:**
1. Create new DRAFT requests, OR
2. Run the test script to create test requests, OR
3. Use the debug tool to verify the logic is working

**Next steps:**
- For APPROVED requests: Upload claims (receipts)
- For REJECTED requests: Create new requests
- For new requests: They'll be DRAFT/SUBMITTED and editable!

## If You Still Want to Test

```bash
# On EC2
cd ~/fyp_system
git pull origin main
bash create-test-requests.sh

# Then in browser:
# 1. Clear localStorage: localStorage.clear();
# 2. Login again
# 3. Go to Purchase Requests
# 4. See the 2 TEST requests with Edit buttons! ✅
```
