# Fix: JavaScript Validation for Amount Fields

## Problem
While HTML5 `min="0.01"` attribute was added to amount input fields, users could still type negative values or zero because there was no JavaScript validation to prevent it. The HTML5 validation only triggers on form submission and can be bypassed.

**Affected fields:**
- ✅ Estimated amount (CREATE form) - Already had proper validation
- ❌ Approved amount (REVIEW modal) - Missing JavaScript validation
- ❌ Claimed amount (UPLOAD CLAIM modal) - Missing JavaScript validation

## Root Cause
The `approved_amount` and `amount_claimed` input fields only had:
```tsx
<input
  type="number"
  min="0.01"
  onChange={(e) => setFormData({ ...formData, field: e.target.value })}
/>
```

This allows users to:
- Type negative values (e.g., -100)
- Type zero (0)
- Bypass HTML5 validation until form submission

## Solution Implemented

### 1. Added onChange Validation
Prevents negative values from being typed in real-time:

```tsx
onChange={(e) => {
  const value = e.target.value;
  // Allow empty string for user to clear field
  if (value === '') {
    setFormData({ ...formData, field: '' });
    return;
  }
  // Prevent negative values
  const numValue = parseFloat(value);
  if (!isNaN(numValue) && numValue >= 0) {
    setFormData({ ...formData, field: value });
  }
}}
```

### 2. Added onBlur Validation
Shows error messages when user leaves the field:

```tsx
onBlur={(e) => {
  const value = parseFloat(e.target.value);
  if (!isNaN(value) && value < 0) {
    setError('Amount cannot be negative');
    setFormData({ ...formData, field: '' });
  } else if (!isNaN(value) && value === 0) {
    setError('Amount must be greater than $0.00');
    setFormData({ ...formData, field: '' });
  } else {
    setError(null);
  }
}}
```

### 3. Added Pre-Submission Validation
Double-checks before sending to backend:

**Review Modal (approved_amount):**
```tsx
const handleSubmit = async () => {
  if (formData.status === 'APPROVED') {
    const approvedAmount = parseFloat(formData.approved_amount);
    if (isNaN(approvedAmount) || approvedAmount <= 0) {
      setError('Approved amount must be a positive number greater than $0.00');
      return;
    }
    if (approvedAmount < 0.01) {
      setError('Approved amount must be at least $0.01');
      return;
    }
  }
  // ... submit
}
```

**Claim Upload Modal (amount_claimed):**
```tsx
const handleSubmit = async () => {
  const claimedAmount = parseFloat(formData.amount_claimed);
  if (isNaN(claimedAmount) || claimedAmount <= 0) {
    setError('Claimed amount must be a positive number greater than $0.00');
    return;
  }
  if (claimedAmount < 0.01) {
    setError('Claimed amount must be at least $0.01');
    return;
  }
  // ... submit
}
```

### 4. Updated Help Text
Changed from:
- "Must be positive and not exceed..."

To:
- "Must be positive (min $0.01) and not exceed..."

## Files Modified

### Frontend
- `frontend/app/purchase-requests/page.tsx`
  - Added validation to `approved_amount` field in Review Modal
  - Added validation to `amount_claimed` field in Upload Claim Modal
  - Added pre-submission validation in both handleSubmit functions

## Testing Scenarios

### Approved Amount Field
1. ✅ Try typing negative value → Field rejects input
2. ✅ Try typing zero → Field accepts but shows error on blur
3. ✅ Try submitting with negative value → Pre-submit validation blocks
4. ✅ Try submitting with zero → Pre-submit validation blocks
5. ✅ Try typing amount > estimated → Shows error and resets to estimated amount

### Claimed Amount Field
1. ✅ Try typing negative value → Field rejects input
2. ✅ Try typing zero → Field accepts but shows error on blur
3. ✅ Try submitting with negative value → Pre-submit validation blocks
4. ✅ Try submitting with zero → Pre-submit validation blocks
5. ✅ Try typing amount > approved → Shows error and resets to approved amount

## Validation Layers

Now all amount fields have **three layers of validation**:

1. **HTML5 Validation** (`min="0.01" required`)
   - Browser-level validation
   - Can be bypassed but provides basic UX

2. **JavaScript Real-time Validation** (`onChange` + `onBlur`)
   - Prevents negative input in real-time
   - Shows user-friendly error messages
   - Cannot be easily bypassed

3. **Backend Validation** (`@Min(0.01)` in DTOs)
   - Final safety net
   - Prevents any malicious requests
   - Returns 400 Bad Request with error message

## User Experience

**Before:**
- Users could type `-100` in approved/claimed amount fields
- No immediate feedback
- Error only shown after API call

**After:**
- Users cannot type negative values (blocked immediately)
- Clear error messages on blur: "Amount cannot be negative"
- Pre-submission validation prevents API call with invalid data
- Better UX with real-time validation

## Backend Protection

Backend already has protection (added in previous fix):

```typescript
// DTOs with validation
@Min(0.01, { message: 'Estimated amount must be at least $0.01' })
estimated_amount: number;

@Min(0.01, { message: 'Approved amount must be at least $0.01' })
approved_amount: number;

@Min(0.01, { message: 'Amount claimed must be at least $0.01' })
amount_claimed: number;
```

## Deployment

```bash
# On EC2 server
cd ~/fyp_system
git pull origin main

# Rebuild frontend
cd frontend
npm run build
sudo systemctl restart fyp-frontend

# Hard refresh browser
Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

## Verification

After deployment, test each field:
1. Try entering `-50` → Should not allow
2. Try entering `0` → Should show error on blur
3. Try entering valid amount like `100.50` → Should work
4. Try submitting with invalid amount → Should block

## Related Documentation
- `FIX_PREVENT_NEGATIVE_AMOUNTS.md` - Initial fix (HTML5 + backend)
- `DEPLOY_ALL_FIXES_TO_EC2.md` - Deployment guide
- `CLEAR_BROWSER_CACHE.md` - Cache clearing instructions

## Summary

✅ **Problem:** Users could bypass HTML5 validation and type negative amounts  
✅ **Solution:** Added JavaScript onChange/onBlur validation + pre-submission checks  
✅ **Result:** Three-layer validation (HTML5 + JavaScript + Backend)  
✅ **Status:** Fixed, built, committed, and pushed to repository

**Next step:** Deploy to EC2 and test in production environment.
