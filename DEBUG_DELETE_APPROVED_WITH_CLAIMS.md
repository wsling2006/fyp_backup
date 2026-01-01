# Debug: Cannot Delete APPROVED Request After Removing All Claims

## Issue Report
**Date:** January 1, 2026  
**Issue:** After deleting all claims from an APPROVED purchase request, attempting to delete the request still shows the error:

```
Cannot delete purchase request with status APPROVED. Only DRAFT, SUBMITTED, or REJECTED requests can be deleted. APPROVED, UNDER_REVIEW, or PAID requests have active workflows.
```

## Root Cause Analysis

The backend logic in `purchase-request.service.ts` is CORRECT and should allow deletion of APPROVED requests with no claims. However, there might be a race condition or stale data issue:

### Possible Causes:

1. **Stale Claims Data**: The purchase request entity still has claims in memory even though they were deleted
2. **TypeORM Caching**: TypeORM might be caching the relations and not fetching fresh data
3. **Transaction Timing**: The frontend is calling delete too quickly before the database has committed the claim deletion

## Debug Logging Added

Added comprehensive logging to `deletePurchaseRequest()` function:

```typescript
// DEBUG: Log the purchase request details
console.log('[deletePurchaseRequest] PR ID:', prId);
console.log('[deletePurchaseRequest] PR Status:', pr.status);
console.log('[deletePurchaseRequest] Claims count:', pr.claims?.length || 0);
console.log('[deletePurchaseRequest] Claims data:', pr.claims);
console.log('[deletePurchaseRequest] canDeleteApproved:', canDeleteApproved);
console.log('[deletePurchaseRequest] alwaysDeletableStatuses.includes:', alwaysDeletableStatuses.includes(pr.status));
```

## Testing Steps

1. **Start backend with debug logging**:
   ```bash
   cd /Users/jw/fyp_system/backend
   npm run start
   ```

2. **Reproduce the issue**:
   - Log in as accountant
   - Find an APPROVED purchase request with claims
   - Delete all claims one by one
   - Try to delete the purchase request
   - Check backend console logs

3. **Expected Console Output** (if working correctly):
   ```
   [deletePurchaseRequest] PR ID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   [deletePurchaseRequest] PR Status: APPROVED
   [deletePurchaseRequest] Claims count: 0
   [deletePurchaseRequest] Claims data: []
   [deletePurchaseRequest] canDeleteApproved: true
   [deletePurchaseRequest] alwaysDeletableStatuses.includes: false
   [deletePurchaseRequest] ✅ Deletion allowed, proceeding...
   ```

4. **If Claims Count is > 0** (indicating stale data):
   - This means TypeORM is not fetching fresh claims data
   - Solution: Add `cache: false` to the findOne query

## Potential Solutions

### Solution 1: Disable TypeORM Caching (RECOMMENDED)

Modify the findOne query in `deletePurchaseRequest()`:

```typescript
const pr = await this.purchaseRequestRepo.findOne({
  where: { id: prId },
  relations: ['createdBy', 'claims'],
  cache: false,  // ← Add this
});
```

### Solution 2: Manually Reload Relations

```typescript
// After finding the PR, reload claims
await this.purchaseRequestRepo
  .createQueryBuilder()
  .relation(PurchaseRequest, 'claims')
  .of(pr)
  .loadMany();
```

### Solution 3: Add Delay in Frontend

Add a small delay before allowing deletion (not ideal, but temporary fix):

```typescript
// After deleting last claim
await loadRequests();
await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms
```

### Solution 4: Refresh from Database

```typescript
// Force a fresh query
const pr = await this.purchaseRequestRepo.findOne({
  where: { id: prId },
  relations: ['createdBy', 'claims'],
});

// Refresh from database
await this.purchaseRequestRepo.manager.connection
  .getRepository(Claim)
  .createQueryBuilder('claim')
  .where('claim.purchase_request_id = :prId', { prId })
  .getCount();
```

## Next Steps

1. ✅ Debug logging added to backend
2. ⏳ Restart backend and test
3. ⏳ Review console logs to identify exact issue
4. ⏳ Implement appropriate solution based on findings
5. ⏳ Update documentation with final fix

## Expected Behavior

After implementing the fix:
1. User deletes all claims from an APPROVED request
2. Backend loads fresh purchase request data (claims.length === 0)
3. Backend allows deletion because `canDeleteApproved === true`
4. Purchase request is successfully deleted
5. User is redirected back to the purchase requests list

## Files Modified

- `backend/src/purchase-requests/purchase-request.service.ts` - Added debug logging

## Status

🔍 **INVESTIGATING** - Debug logging added, awaiting test results

---

**Updated:** January 1, 2026, 10:43 PM SGT
