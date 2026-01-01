# Fix: Delete Purchase Request Button Not Showing After Deleting Claims

## 🐛 Problem

**Issue:** After deleting all claims from a purchase request via the ViewClaimsModal, the "Delete Purchase Request" button remained hidden/disabled even though all claims were deleted.

**Root Cause:** 
- The parent component (`PurchaseRequestsPage`) stores the purchase request data in state
- When claims are deleted in the ViewClaimsModal, only the modal's internal state is updated
- The parent component's `request.claims` array remains stale (not updated)
- The delete button visibility check: `canDeleteRequest(request)` and disable check: `request.claims.length > 0` use the stale data
- Button only updated when modal was closed and page reloaded

---

## ✅ Solution

### Changes Made:

**File:** `frontend/app/purchase-requests/page.tsx`

#### 1. Added `onClaimChanged` Callback Prop to ViewClaimsModal

**Before:**
```typescript
function ViewClaimsModal({
  request,
  onClose,
}: {
  request: PurchaseRequest;
  onClose: () => void;
}) {
```

**After:**
```typescript
function ViewClaimsModal({
  request,
  onClose,
  onClaimChanged,
}: {
  request: PurchaseRequest;
  onClose: () => void;
  onClaimChanged?: () => void;  // NEW: Callback to notify parent of changes
}) {
```

#### 2. Call `onClaimChanged` After Deleting Claim

```typescript
const handleDelete = async (claimId: string) => {
  try {
    await api.delete(`/purchase-requests/claims/${claimId}`);
    setSuccess('Claim deleted successfully');
    await loadClaims(); // Reload claims in modal
    if (onClaimChanged) {
      onClaimChanged(); // ✅ Notify parent to reload purchase requests
    }
  } catch (err: any) {
    setError(err.response?.data?.message || 'Failed to delete claim');
  }
};
```

#### 3. Pass Callback When Opening Modal

```typescript
{showViewClaimsModal && selectedRequest && (
  <ViewClaimsModal
    request={selectedRequest}
    onClose={() => {
      setShowViewClaimsModal(false);
      setSelectedRequest(null);
      loadRequests(); // Reload when modal closes
    }}
    onClaimChanged={loadRequests} // ✅ Reload immediately when claim changes
  />
)}
```

---

## 🎯 How It Works Now

### Flow:

```
User deletes claim
    ↓
handleDelete() executes
    ├─ Delete via API ✅
    ├─ Update modal's claims ✅
    └─ Call onClaimChanged() ✅
        ↓
    loadRequests() in parent ✅
        ↓
    request.claims updated ✅
        ↓
    Delete button appears! ✅
```

---

## 🧪 Testing

1. Login as accountant
2. Find REJECTED purchase request with claims
3. Open "VIEW X CLAIM(S)" modal
4. Delete all claims
5. ✅ **Verify:** Delete button appears immediately
6. Close modal and delete purchase request
7. ✅ **Success!**

---

**Status:** ✅ **FIXED**
