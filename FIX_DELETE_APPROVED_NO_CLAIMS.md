# Fix: Allow Deleting APPROVED Requests with No Claims

## 🐛 Problem

**User Report:**
> "after i remove all claim the request still cannot delete not showing delete button like the request which is haven't view"

**Issue:** 
- APPROVED purchase requests cannot be deleted, even after all claims are deleted
- Delete button only shows for DRAFT, SUBMITTED, REJECTED statuses
- APPROVED requests remain stuck in the system with no way to clean them up

**Screenshot Evidence:**
- Request #1: Status APPROVED, $0.52 approved
- Request #e: Status APPROVED, $0.58 approved
- Both have no claims (all deleted), but no delete button appears

---

## ✅ Solution

### Change: Allow Deleting APPROVED Requests with No Claims

**Rationale:**
- APPROVED status means claims CAN be uploaded (active workflow)
- But if ALL claims have been deleted, there's no active workflow anymore
- Should allow accountants to delete these "empty" APPROVED requests for cleanup

**New Logic:**
```
Can delete if:
  ✅ DRAFT (never submitted)
  ✅ SUBMITTED (awaiting review)
  ✅ REJECTED (rejected by accountant)
  ✅ APPROVED + NO CLAIMS (approved but no active claims) ← NEW!

Cannot delete if:
  ❌ APPROVED + HAS CLAIMS (active claims workflow)
  ❌ UNDER_REVIEW (being reviewed)
  ❌ PAID (completed and paid)
```

---

## 🔧 Implementation

### Frontend Changes

**File:** `frontend/app/purchase-requests/page.tsx`

**Before:**
```typescript
const canDeleteRequest = (request: PurchaseRequest) => {
  if (user?.role !== 'accountant' && user?.role !== 'super_admin') return false;
  
  // Can only delete DRAFT, SUBMITTED, or REJECTED
  return ['DRAFT', 'SUBMITTED', 'REJECTED'].includes(request.status);
};
```

**After:**
```typescript
const canDeleteRequest = (request: PurchaseRequest) => {
  if (user?.role !== 'accountant' && user?.role !== 'super_admin') return false;
  
  // Can delete DRAFT, SUBMITTED, or REJECTED (no active workflow)
  if (['DRAFT', 'SUBMITTED', 'REJECTED'].includes(request.status)) {
    return true;
  }
  
  // Can also delete APPROVED requests IF no claims exist ← NEW!
  if (request.status === 'APPROVED' && (!request.claims || request.claims.length === 0)) {
    return true;
  }
  
  // Cannot delete UNDER_REVIEW, PAID, or APPROVED with claims
  return false;
};
```

### Backend Changes

**File:** `backend/src/purchase-requests/purchase-request.service.ts`

**Before:**
```typescript
// Check status - only allow deletion of inactive/rejected requests
const deletableStatuses = [
  PurchaseRequestStatus.DRAFT,
  PurchaseRequestStatus.SUBMITTED,
  PurchaseRequestStatus.REJECTED,
];

if (!deletableStatuses.includes(pr.status)) {
  throw new BadRequestException(
    `Cannot delete purchase request with status ${pr.status}. ` +
    `Only DRAFT, SUBMITTED, or REJECTED requests can be deleted.`
  );
}

// Check if there are any claims
if (pr.claims && pr.claims.length > 0) {
  throw new BadRequestException('Please delete all claims first');
}
```

**After:**
```typescript
// Check if there are any claims (must be deleted first)
if (pr.claims && pr.claims.length > 0) {
  throw new BadRequestException('Please delete all claims first');
}

// Check status - allow deletion based on status and claims
const alwaysDeletableStatuses = [
  PurchaseRequestStatus.DRAFT,
  PurchaseRequestStatus.SUBMITTED,
  PurchaseRequestStatus.REJECTED,
];

// APPROVED requests can be deleted ONLY if no claims exist ← NEW!
const canDeleteApproved = pr.status === PurchaseRequestStatus.APPROVED && 
                          (!pr.claims || pr.claims.length === 0);

if (!alwaysDeletableStatuses.includes(pr.status) && !canDeleteApproved) {
  throw new BadRequestException(
    `Cannot delete purchase request with status ${pr.status}. ` +
    `Only DRAFT, SUBMITTED, REJECTED, or APPROVED (with no claims) can be deleted.`
  );
}
```

**Key Change:** Check claims BEFORE status validation, allow APPROVED if no claims exist.

---

## 🎯 How It Works Now

### Scenario: Empty APPROVED Request

```
1. Purchase Request created → SUBMITTED
2. Accountant approves → APPROVED
3. User uploads claims → APPROVED + 2 claims
4. Accountant deletes all claims → APPROVED + 0 claims
5. ✅ Delete button NOW APPEARS (previously hidden)
6. Accountant clicks "Delete Purchase Request"
7. ✅ Request deleted successfully!
```

### Decision Tree:

```
Is user accountant/super_admin?
  ├─ No → ❌ Cannot delete
  └─ Yes
      ├─ Status is DRAFT/SUBMITTED/REJECTED? → ✅ Can delete
      ├─ Status is APPROVED + No claims? → ✅ Can delete (NEW!)
      ├─ Status is APPROVED + Has claims? → ❌ Cannot delete (delete claims first)
      ├─ Status is UNDER_REVIEW? → ❌ Cannot delete (active review)
      └─ Status is PAID? → ❌ Cannot delete (completed)
```

---

## 🧪 Testing

### Test 1: Delete APPROVED Request with No Claims

**Steps:**
1. Login as sales user
2. Create purchase request → SUBMITTED
3. Login as accountant
4. Approve request → APPROVED
5. ✅ **Verify:** Upload Claim button appears
6. ✅ **Verify:** Delete button does NOT appear (no claims to delete yet)
7. Login as sales user
8. Upload 2 claims
9. Login as accountant
10. View claims and delete all claims
11. ✅ **Verify:** Delete button NOW APPEARS
12. Click "Delete Purchase Request"
13. Confirm deletion
14. ✅ **Verify:** Request deleted successfully

### Test 2: Cannot Delete APPROVED with Claims

**Steps:**
1. APPROVED request with 2 claims
2. Login as accountant
3. ✅ **Verify:** Delete button does NOT appear
4. Try to delete via API
5. ✅ **Verify:** Error: "Please delete all claims first"

### Test 3: Can Still Delete Other Statuses

**Steps:**
1. Test DRAFT request → ✅ Can delete
2. Test SUBMITTED request → ✅ Can delete
3. Test REJECTED request → ✅ Can delete
4. Test UNDER_REVIEW request → ❌ Cannot delete
5. Test PAID request → ❌ Cannot delete

---

## 📊 Status Matrix

| Status | Has Claims? | Can Delete? | Notes |
|--------|-------------|-------------|-------|
| DRAFT | N/A | ✅ Yes | Never submitted |
| SUBMITTED | N/A | ✅ Yes | Awaiting review |
| REJECTED | N/A | ✅ Yes | Rejected by accountant |
| APPROVED | No claims | ✅ **Yes (NEW!)** | **Empty approved request** |
| APPROVED | Has claims | ❌ No | Active claims workflow |
| UNDER_REVIEW | N/A | ❌ No | Active review process |
| PAID | N/A | ❌ No | Completed transaction |

---

## 💡 Benefits

### For Accountants:
1. **Better Cleanup:** Can remove empty approved requests
2. **Less Clutter:** Dashboard stays clean
3. **Flexibility:** If all claims deleted, can delete the request
4. **No Orphaned Data:** No "stuck" APPROVED requests with no claims

### For System:
1. **Data Hygiene:** Remove unused approved requests
2. **Logical:** Approved + No Claims = No active workflow = Deletable
3. **Safe:** Still prevents deletion of requests with active claims
4. **Backwards Compatible:** All existing delete rules still work

---

## ⚠️ Important Notes

### What Changed:
- ✅ Can now delete APPROVED requests **IF** no claims exist
- ✅ Claims check happens BEFORE status check (more efficient)
- ✅ Error messages updated to reflect new logic

### What Didn't Change:
- ❌ Still cannot delete APPROVED requests WITH claims
- ❌ Still cannot delete UNDER_REVIEW or PAID requests
- ❌ Still requires accountant/super_admin role
- ❌ Still requires confirmation dialog

### Why This Makes Sense:
- **APPROVED** status means "ready for claims to be uploaded"
- If all claims are deleted → No active workflow → Safe to delete
- Similar to REJECTED status (no active workflow)
- Prevents orphaned APPROVED requests cluttering the system

---

## 🚀 Deployment

### Deploy Commands:

```bash
# On EC2
cd /home/ubuntu/fyp_system
git pull origin main
./deploy-complete-system.sh
```

### Verify Deployment:

```bash
# Check backend logs
pm2 logs backend --lines 50

# Test via API
curl -X DELETE http://localhost:5000/purchase-requests/<REQUEST_ID> \
  -H "Authorization: Bearer <TOKEN>"

# Expected: Success if APPROVED + no claims
```

---

## 📝 Summary

**Problem:** APPROVED requests with no claims cannot be deleted

**Root Cause:** Delete logic only allowed DRAFT/SUBMITTED/REJECTED statuses

**Solution:** Allow deleting APPROVED requests if no claims exist

**Result:** 
- ✅ Delete button appears for APPROVED requests with 0 claims
- ✅ Backend validation updated to match
- ✅ Better data cleanup for accountants
- ✅ No breaking changes to existing functionality

---

**Status:** ✅ **FIXED**

**Files Changed:** 2
- `frontend/app/purchase-requests/page.tsx`
- `backend/src/purchase-requests/purchase-request.service.ts`

**Issue Resolved:** Delete button now appears for APPROVED requests after all claims are deleted
