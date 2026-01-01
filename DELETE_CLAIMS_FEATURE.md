# ✅ Delete Claims Feature - Complete

**Date:** January 1, 2026  
**Feature:** Allow accountants to delete VERIFIED claims in purchase requests

---

## 🎯 Feature Summary

Accountants can now delete claims that they have already reviewed (VERIFIED status) from the purchase requests page.

---

## ✨ What's New

### Backend Changes:

1. **New DELETE Endpoint:** `/purchase-requests/claims/:id`
   - Only accessible by accountants and super admins
   - Requires JWT authentication
   - Protected by role-based guards

2. **Service Method:** `deleteClaim()`
   - Validates user permissions
   - Checks claim status (must be VERIFIED)
   - Logs deletion in audit trail
   - Removes claim from database

3. **Business Rules:**
   - ✅ Only accountants and super admins can delete
   - ✅ Only VERIFIED claims can be deleted
   - ❌ Cannot delete PENDING claims (not yet reviewed)
   - ❌ Cannot delete PROCESSED claims (already handled)

### Frontend Changes:

1. **Delete Button:**
   - Shows only for accountants/super admins
   - Shows only for VERIFIED claims
   - Red button with trash icon

2. **Confirmation Dialog:**
   - "Are you sure?" prompt
   - "Yes, Delete" and "Cancel" buttons
   - Prevents accidental deletion

3. **User Feedback:**
   - Success message after deletion
   - Error message if deletion fails
   - Automatic claim list refresh

---

## 🔧 Technical Implementation

### Backend Files Changed:

**`backend/src/purchase-requests/purchase-request.controller.ts`**
```typescript
@Delete('claims/:id')
@Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
async deleteClaim(@Param('id') id: string, @Req() req: any) {
  const userId = req.user.userId;
  const userRole = req.user.role;
  await this.purchaseRequestService.deleteClaim(id, userId, userRole, req);
  return { success: true, message: 'Claim deleted successfully' };
}
```

**`backend/src/purchase-requests/purchase-request.service.ts`**
```typescript
async deleteClaim(
  claimId: string,
  userId: string,
  userRole: string,
  req: any,
): Promise<void> {
  // Permission check
  if (userRole !== Role.ACCOUNTANT && userRole !== Role.SUPER_ADMIN) {
    throw new ForbiddenException('Only accountants and super admins can delete claims');
  }

  // Find claim
  const claim = await this.claimRepo.findOne({
    where: { id: claimId },
    relations: ['purchaseRequest', 'uploadedBy'],
  });

  if (!claim) {
    throw new NotFoundException('Claim not found');
  }

  // Status check - only VERIFIED claims
  if (claim.status !== ClaimStatus.VERIFIED) {
    throw new BadRequestException(
      `Cannot delete claim in ${claim.status} status. Only VERIFIED claims can be deleted.`
    );
  }

  // Audit log
  await this.auditService.logFromRequest(req, userId, 'DELETE_CLAIM', 'claim', claimId, {
    claim_id: claimId,
    vendor_name: claim.vendor_name,
    amount_claimed: claim.amount_claimed,
    purchase_request_id: claim.purchase_request_id,
    uploaded_by: claim.uploadedBy?.email || 'Unknown',
  });

  // Delete
  await this.claimRepo.delete(claimId);
}
```

### Frontend Files Changed:

**`frontend/app/purchase-requests/page.tsx`**

1. Added state:
```typescript
const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
const [success, setSuccess] = useState<string | null>(null);
```

2. Added handler:
```typescript
const handleDelete = async (claimId: string) => {
  try {
    await api.delete(`/purchase-requests/claims/${claimId}`);
    setSuccess('Claim deleted successfully');
    setDeleteConfirm(null);
    await loadClaims(); // Refresh list
  } catch (err: any) {
    setError(err.response?.data?.message || 'Failed to delete claim');
  }
};

const canDeleteClaim = () => {
  return user?.role === 'accountant' || user?.role === 'super_admin';
};
```

3. Updated UI:
```typescript
{canDeleteClaim() && claim.status === 'VERIFIED' && (
  <div className="mt-4 flex gap-2">
    <button onClick={() => setDeleteConfirm(claim.id)}>
      Delete Claim
    </button>
    
    {deleteConfirm === claim.id && (
      <div>
        <p>Are you sure?</p>
        <button onClick={() => handleDelete(claim.id)}>Yes, Delete</button>
        <button onClick={() => setDeleteConfirm(null)}>Cancel</button>
      </div>
    )}
  </div>
)}
```

---

## 🚀 Deployment

**On EC2:**

```bash
cd ~/fyp_system

# Pull latest changes
git pull origin main

# Rebuild backend
cd backend
npm run build
pm2 restart backend

# Rebuild frontend
cd ../frontend
npm run build
pm2 restart frontend

# Verify
pm2 status
```

---

## 🧪 Testing

### Test as Accountant:

1. **Login** as accountant
2. **Go to** Purchase Requests page
3. **Click** "View Claims" on any purchase request
4. **Find** a claim with status "VERIFIED"
5. **Click** "Delete Claim" button (red button)
6. **Confirm** deletion in dialog
7. **Verify** claim is removed from list
8. **Check** success message appears

### Expected Behavior:

✅ **VERIFIED claims:**
- Delete button is visible
- Can be deleted successfully
- Confirmation required
- Success message shown
- List refreshes automatically

❌ **PENDING claims:**
- Delete button NOT visible
- If somehow attempted: "Cannot delete claim in PENDING status"

❌ **PROCESSED claims:**
- Delete button NOT visible
- If somehow attempted: "Cannot delete claim in PROCESSED status"

❌ **Non-accountants (Sales/Marketing):**
- Delete button NOT visible
- If somehow attempted: "Only accountants and super admins can delete claims"

---

## 📊 Audit Trail

All deletions are logged in the audit log:

```json
{
  "action": "DELETE_CLAIM",
  "resource_type": "claim",
  "resource_id": "<claim-uuid>",
  "metadata": {
    "claim_id": "<claim-uuid>",
    "vendor_name": "Example Vendor",
    "amount_claimed": "123.45",
    "purchase_request_id": "<pr-uuid>",
    "uploaded_by": "user@example.com"
  }
}
```

You can view audit logs to see who deleted what and when.

---

## 🔒 Security

1. **Authentication Required:** JWT token must be valid
2. **Role-Based Access:** Only accountants and super admins
3. **Status Validation:** Only VERIFIED claims can be deleted
4. **Audit Logging:** All deletions are logged
5. **Confirmation Required:** User must confirm before deletion

---

## 💡 Why This Feature?

**User Request:** "Can u allow the accountant can delete the one which is already view?"

**Solution:**
- Accountants review claims and mark them as VERIFIED
- After review, they may need to remove invalid/duplicate claims
- This feature allows cleanup of already-reviewed claims
- Prevents deletion of pending (not reviewed) or processed (already handled) claims

---

## ✅ Status

- [x] Backend endpoint implemented
- [x] Service method with business rules
- [x] Frontend UI with delete button
- [x] Confirmation dialog
- [x] Success/error messages
- [x] Audit logging
- [x] Role-based permissions
- [x] Status validation
- [x] Committed to Git
- [x] Pushed to GitHub
- [ ] Deployed to EC2 (waiting for user)
- [ ] Tested on EC2

---

## 📝 Related Files

- `backend/src/purchase-requests/purchase-request.controller.ts`
- `backend/src/purchase-requests/purchase-request.service.ts`
- `frontend/app/purchase-requests/page.tsx`

---

**Commit:** `214918b - feat: Add delete claim functionality for accountants`
