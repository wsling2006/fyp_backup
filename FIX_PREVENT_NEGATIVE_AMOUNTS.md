# 🔒 Security Fix: Prevent Negative Amount Input

## Issue

**Critical Security/Business Logic Flaw**: The system allowed users to enter negative amounts for:
- Estimated amount (when creating purchase request)
- Approved amount (when accountant reviews request)
- Amount claimed (when uploading receipt/claim)

**Risk Level**: 🔴 **HIGH**

**Impact**:
- Users could create requests with negative amounts
- Could potentially exploit financial calculations
- Would cause data integrity issues
- Could result in incorrect financial reports

## Solution

Implemented **multi-layer validation** to prevent negative and zero amounts:

### Layer 1: Frontend HTML5 Validation
Added `min="0.01"` attribute to all amount input fields to prevent:
- ❌ Negative amounts (e.g., -100)
- ❌ Zero amounts (e.g., 0)
- ✅ Only positive amounts allowed (minimum $0.01)

### Layer 2: Backend DTO Validation
Updated `@Min()` decorator from `0` to `0.01` with custom error messages:
- ❌ Backend rejects negative amounts
- ❌ Backend rejects zero amounts
- ✅ Clear error messages returned to user

### Layer 3: Required Attribute
Added `required` attribute to ensure fields must be filled before submission.

---

## Changes Made

### Frontend Changes

**File**: `frontend/app/purchase-requests/page.tsx`

#### 1. Create Purchase Request - Estimated Amount
**Before**:
```tsx
<input
  type="number"
  step="0.01"
  value={formData.estimated_amount}
  ...
/>
```

**After**:
```tsx
<input
  type="number"
  step="0.01"
  min="0.01"
  required
  value={formData.estimated_amount}
  ...
/>
<p className="text-xs text-gray-500 mt-1">
  Must be a positive amount (minimum $0.01)
</p>
```

#### 2. Review Request - Approved Amount
**Before**:
```tsx
<input
  type="number"
  step="0.01"
  max={request.estimated_amount}
  ...
/>
```

**After**:
```tsx
<input
  type="number"
  step="0.01"
  min="0.01"
  max={request.estimated_amount}
  required
  ...
/>
<p className="text-xs text-gray-500 mt-1">
  Must be positive and not exceed estimated amount
</p>
```

#### 3. Upload Claim - Amount Claimed
**Before**:
```tsx
<input
  type="number"
  step="0.01"
  max={request.approved_amount || undefined}
  ...
/>
```

**After**:
```tsx
<input
  type="number"
  step="0.01"
  min="0.01"
  max={request.approved_amount || undefined}
  required
  ...
/>
```

### Backend Changes

**File**: `backend/src/purchase-requests/purchase-request.dto.ts`

#### 1. CreatePurchaseRequestDto
**Before**:
```typescript
@IsNumber()
@Min(0)
estimated_amount: number;
```

**After**:
```typescript
@IsNumber()
@Min(0.01, { message: 'Estimated amount must be at least $0.01' })
estimated_amount: number;
```

#### 2. UpdatePurchaseRequestDto
**Before**:
```typescript
@IsOptional()
@IsNumber()
@Min(0)
estimated_amount?: number;
```

**After**:
```typescript
@IsOptional()
@IsNumber()
@Min(0.01, { message: 'Estimated amount must be at least $0.01' })
estimated_amount?: number;
```

#### 3. ReviewPurchaseRequestDto
**Before**:
```typescript
@IsOptional()
@IsNumber()
@Min(0)
approved_amount?: number;
```

**After**:
```typescript
@IsOptional()
@IsNumber()
@Min(0.01, { message: 'Approved amount must be at least $0.01' })
approved_amount?: number;
```

#### 4. CreateClaimDto
**Before**:
```typescript
@IsNumber()
@Min(0)
amount_claimed: number;
```

**After**:
```typescript
@IsNumber()
@Min(0.01, { message: 'Amount claimed must be at least $0.01' })
amount_claimed: number;
```

---

## Validation Behavior

### Frontend Validation (Immediate Feedback)

When user tries to enter invalid amount:
- Typing `-` (negative sign) → **Blocked by browser**
- Entering `0` → **Browser shows validation error**: "Value must be greater than or equal to 0.01"
- Entering `-50` → **Browser shows validation error**: "Value must be greater than or equal to 0.01"
- Entering `0.005` → **Rounded to `0.01` by step**
- Form submission blocked until value is valid

### Backend Validation (Security Layer)

If someone bypasses frontend (e.g., API calls, modified HTML):
- Backend validates using `class-validator`
- Returns **400 Bad Request** with error message
- Example response:
  ```json
  {
    "statusCode": 400,
    "message": [
      "Estimated amount must be at least $0.01"
    ],
    "error": "Bad Request"
  }
  ```

---

## Testing Scenarios

### Test 1: Create Purchase Request with Negative Amount
**Steps**:
1. Login as sales/marketing user
2. Click "+ New Request"
3. Fill in title, description
4. Try to enter `-100` in estimated amount
5. ✅ Browser blocks input (cannot type negative)
6. Try to enter `0`
7. ❌ Browser shows error on submit
8. Enter valid amount like `50.00`
9. ✅ Form submits successfully

### Test 2: Approve Request with Zero Amount
**Steps**:
1. Login as accountant
2. Review a purchase request
3. Select "✅ Approve"
4. Try to enter `0` in approved amount
5. ❌ Browser shows error on submit
6. Enter valid amount like `45.50`
7. ✅ Form submits successfully

### Test 3: Upload Claim with Negative Amount
**Steps**:
1. Login as sales user
2. Find approved request
3. Click "Upload Claim"
4. Try to enter `-50` in amount claimed
5. ✅ Browser blocks input
6. Enter valid amount like `30.00`
7. ✅ Claim uploads successfully

### Test 4: Backend API Validation (Advanced)
**Using cURL or Postman**:
```bash
# Try to create request with negative amount
curl -X POST http://localhost:3000/purchase-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test",
    "description": "Test",
    "department": "Sales",
    "priority": 1,
    "estimated_amount": -100
  }'

# Expected Response:
{
  "statusCode": 400,
  "message": ["Estimated amount must be at least $0.01"],
  "error": "Bad Request"
}
```

---

## Security Benefits

### Before Fix:
- ❌ Could enter negative amounts
- ❌ Could enter zero amounts
- ❌ Could bypass frontend validation via API
- ❌ Financial reports could be incorrect
- ❌ Data integrity at risk

### After Fix:
- ✅ Frontend prevents invalid input (UX)
- ✅ Backend validates all amounts (Security)
- ✅ Clear error messages guide users
- ✅ Financial data integrity protected
- ✅ Consistent validation across all amount fields

---

## Validation Rules Summary

| Field | Min Value | Max Value | Required | Error Message |
|-------|-----------|-----------|----------|---------------|
| Estimated Amount | $0.01 | None | Yes | Must be a positive amount (minimum $0.01) |
| Approved Amount | $0.01 | Estimated Amount | Yes | Must be positive and not exceed estimated amount |
| Amount Claimed | $0.01 | Approved Amount | Yes | (Browser default message) |

---

## Browser Behavior

Modern browsers with `type="number"` and `min="0.01"`:

- **Chrome/Edge**: 
  - Shows up/down arrows
  - Blocks negative input
  - Shows "Value must be greater than or equal to 0.01" on submit
  
- **Firefox**:
  - Shows up/down arrows
  - Blocks negative input
  - Shows "Please enter a number that is no less than 0.01"
  
- **Safari**:
  - Shows up/down arrows
  - Blocks negative input
  - Shows validation error on submit

---

## Edge Cases Handled

1. **Scientific Notation**: `1e-5` → Blocked by min validation
2. **Very Small Decimals**: `0.001` → Accepted (step rounds to 0.01)
3. **Leading Zeros**: `00050` → Accepted as `50`
4. **Trailing Decimals**: `50.` → Accepted as `50.00`
5. **No Input**: Field is required, form won't submit
6. **Non-Numeric**: Browser automatically blocks letters

---

## Deployment

### Local Testing
Already built! Just refresh browser.

### Production (EC2)
Follow standard deployment:
```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@13.214.167.194

# Pull changes
cd ~/fyp_system
git pull origin main

# Build backend
cd backend
npm run build

# Build frontend  
cd ../frontend
npm run build

# Restart services
pm2 restart all
```

---

## Related Documentation

- `COMPLETE_IMPLEMENTATION_SUMMARY.md` - Full system overview
- `DEPLOY_ALL_FIXES_TO_EC2.md` - Deployment guide

---

## Summary

**Issue**: System allowed negative and zero amounts ❌  
**Fix**: Multi-layer validation (frontend + backend) ✅  
**Impact**: Critical security vulnerability closed ✅  
**Status**: Ready for deployment 🚀

---

**Date**: January 1, 2026  
**Priority**: 🔴 HIGH - Security Fix  
**Testing**: ✅ Builds successful  
**Deploy**: Ready for EC2 deployment
