# Fix: PAID/PARTIALLY_PAID Requests Cannot Be Deleted

## Problem Identified ❌

After deleting all claims from a PAID or PARTIALLY_PAID request, the delete button for the request **did not appear** even though there were no claims left.

### Root Cause:
When a claim was deleted, the `deleteClaim()` method in the backend **did not update** the purchase request status. 

**Example Scenario:**
```
1. Request Status: APPROVED
2. Upload claim → Process claim
3. Request Status: PAID ✅
4. Delete the claim
5. Request Status: Still PAID ❌ (should revert to APPROVED!)
6. Frontend checks: status=PAID AND claims=0
   But backend returns: status=PAID (wrong!)
7. Delete button logic fails
```

---

## Solution ✅

Updated `deleteClaim()` method to **automatically recalculate** the purchase request status after a claim is deleted.

### Code Change:

**File:** `backend/src/purchase-requests/purchase-request.service.ts`

**Before:**
```typescript
async deleteClaim(...) {
  // ...validation code...
  
  // Delete the claim
  await this.claimRepo.delete(claimId);
  
  // ❌ Status not updated!
}
```

**After:**
```typescript
async deleteClaim(...) {
  // ...validation code...
  
  // Store purchase request ID before deletion
  const purchaseRequestId = claim.purchase_request_id;
  
  // Delete the claim
  await this.claimRepo.delete(claimId);
  
  // ✅ Update purchase request status after claim deletion
  await this.updateRequestStatusAfterClaimVerification(purchaseRequestId);
}
```

---

## How It Works Now:

### Scenario 1: Delete All Claims from PAID Request
```
1. Request Status: PAID
   Claims: 1 claim (PROCESSED)
   
2. Delete the claim → deleteClaim() is called
   
3. Claim deleted → updateRequestStatusAfterClaimVerification() is called
   
4. Status calculation:
   - Total claims: 0
   - Total paid: $0
   - Result: Status reverts to APPROVED ✅
   
5. Frontend checks: status=APPROVED AND claims=0
   → Delete button appears! ✅
```

### Scenario 2: Delete Some Claims from PARTIALLY_PAID Request
```
1. Request Status: PARTIALLY_PAID
   Claims: 2 claims (1 PROCESSED $50, 1 PENDING $50)
   
2. Delete PENDING claim → deleteClaim() is called
   
3. Claim deleted → updateRequestStatusAfterClaimVerification() is called
   
4. Status calculation:
   - Total claims: 1 (PROCESSED)
   - Total paid: $50
   - Payment progress: 50%
   - Result: Status remains PARTIALLY_PAID ✅
   
5. Cannot delete request (still has 1 claim) ✅
```

### Scenario 3: Delete All Claims from PARTIALLY_PAID Request
```
1. Request Status: PARTIALLY_PAID
   Claims: 2 claims (1 PROCESSED $50, 1 REJECTED $50)
   
2. Delete PROCESSED claim → Status still PARTIALLY_PAID (1 claim left)
   
3. Delete REJECTED claim → Status reverts to APPROVED ✅
   
4. Frontend checks: status=APPROVED AND claims=0
   → Delete button appears! ✅
```

---

## Status Update Logic

The `updateRequestStatusAfterClaimVerification()` method now handles:

### When Claims Exist:
- **Pending claims exist** → Status = APPROVED
- **All processed, ≥95% paid** → Status = PAID
- **Some processed, <95% paid** → Status = PARTIALLY_PAID

### When NO Claims Exist:
- **Total paid = $0** → Status = APPROVED ✅
- This allows the request to be deleted

---

## Testing Checklist

### Test 1: PAID Request with 1 Claim ✅
- [ ] Create request, upload claim, process claim → PAID
- [ ] Delete the claim
- [ ] **Verify:** Status changes to APPROVED
- [ ] **Verify:** Delete button appears
- [ ] Delete the request successfully

### Test 2: PARTIALLY_PAID Request with Multiple Claims ✅
- [ ] Create request for $100
- [ ] Upload 2 claims: $60 + $40
- [ ] Process first claim ($60) → PARTIALLY_PAID
- [ ] Reject second claim ($40) → Still PARTIALLY_PAID
- [ ] Delete rejected claim
- [ ] **Verify:** Status still PARTIALLY_PAID (has 1 processed claim)
- [ ] Delete processed claim
- [ ] **Verify:** Status changes to APPROVED
- [ ] **Verify:** Delete button appears
- [ ] Delete the request successfully

### Test 3: PAID Request with Multiple Claims ✅
- [ ] Create request for $100
- [ ] Upload 2 claims: $50 + $50
- [ ] Process both claims → PAID
- [ ] Delete first claim
- [ ] **Verify:** Status changes to PARTIALLY_PAID (50% paid)
- [ ] Delete second claim
- [ ] **Verify:** Status changes to APPROVED
- [ ] Delete the request successfully

---

## Build Status

✅ **Backend Build:** Successful  
✅ **No TypeScript Errors**  
✅ **Ready for Deployment**

---

## Deployment

### On EC2:
```bash
cd ~/fyp_system
git pull origin main

cd backend
npm run build
pm2 restart backend

pm2 logs backend --lines 50
```

### Verify Fix:
1. Go to a PAID or PARTIALLY_PAID request
2. Delete all its claims
3. **Expected:** Request status updates automatically
4. **Expected:** Delete button appears immediately
5. **Expected:** Can delete the request

---

## Benefits

✅ **Automatic Status Updates:** Status always reflects reality  
✅ **Consistent State:** Backend and frontend always in sync  
✅ **Better UX:** Delete button appears immediately after deleting last claim  
✅ **Accurate Reporting:** Status accurately shows payment state  
✅ **Data Integrity:** No orphaned statuses (PAID with no claims)

---

## Related Features

- ✅ **PARTIALLY_PAID Status** (implemented)
- ✅ **Financial Tracking** (implemented)
- ✅ **Multiple Claims** (implemented)
- ✅ **Smart Delete Logic** (implemented)
- ✅ **Auto Status Update on Claim Delete** (this fix)

---

**Status:** ✅ Fixed, Built, Ready for Deployment  
**Date:** January 1, 2026
