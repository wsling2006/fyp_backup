# ✅ Edit Feature - Quick Reference

## 🎯 What Was Added

Users can now **edit their purchase requests and claims** with complete audit logging for super admin review.

---

## ✨ Features

### 1. Edit Purchase Request
- **Who:** Owner or super_admin
- **When:** Status is `DRAFT` or `SUBMITTED`
- **What:** Title, description, department, priority, estimated amount
- **Security:** OTP required, ownership checked, fully logged

### 2. Edit Claim
- **Who:** Owner or super_admin
- **When:** Status is `PENDING`
- **What:** Vendor, amount, date, description
- **Cannot change:** Receipt file (permanent)
- **Security:** OTP required, ownership checked, amount validated, fully logged

---

## 🔒 Security

✅ **OTP Verification** - Email OTP required for all edits  
✅ **Ownership Check** - Users can only edit their own (except super_admin)  
✅ **Status Restrictions** - Can only edit in certain statuses  
✅ **Audit Logging** - All changes logged with before/after values  
✅ **Amount Validation** - Claim amount ≤ approved amount  

---

## 📡 API Endpoints

### Purchase Request

```bash
# 1. Request OTP
POST /purchase-requests/request-otp/edit-purchase-request
{
  "password": "user_password"
}

# 2. Edit request
PUT /purchase-requests/:id/edit
{
  "title": "Updated",
  "description": "New description",
  "estimated_amount": 1500,
  "otp": "123456"
}
```

### Claim

```bash
# 1. Request OTP
POST /purchase-requests/request-otp/edit-claim
{
  "password": "user_password"
}

# 2. Edit claim
PUT /purchase-requests/claims/:id/edit
{
  "vendor_name": "Updated Vendor",
  "amount_claimed": 950,
  "claim_description": "Updated",
  "otp": "123456"
}
```

---

## 🧪 Test It

```bash
# Deploy backend
cd /home/ubuntu/fyp_system
git pull origin main
cd backend && npm install && npm run build
pm2 restart backend

# Test API
curl -X POST http://localhost:3000/purchase-requests/request-otp/edit-purchase-request \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password":"your_password"}'

# Then edit
curl -X PUT http://localhost:3000/purchase-requests/PR_ID/edit \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"New Title","otp":"123456"}'
```

---

## 📊 Audit Logs

Super admin can view all edits:

```http
GET /audit?action=EDIT_PURCHASE_REQUEST
GET /audit?action=EDIT_CLAIM
```

Each log shows:
- Who edited
- When
- Old values
- New values
- Changed fields

---

## ⚠️ Restrictions

### Purchase Request
- ❌ Cannot edit if `APPROVED`, `REJECTED`, or `PAID`
- ❌ Cannot change who created it
- ❌ Cannot change status (only accountant can review)

### Claim
- ❌ Cannot edit if `VERIFIED`, `PROCESSED`, or `REJECTED`
- ❌ Cannot change receipt file
- ❌ Cannot exceed approved amount
- ❌ Cannot change status (only accountant can verify)

---

## 📋 What's Done

✅ Backend DTOs created  
✅ Service methods implemented  
✅ Controller endpoints added  
✅ OTP verification integrated  
✅ Ownership validation enforced  
✅ Status restrictions implemented  
✅ Audit logging complete  
✅ Amount validation for claims  
✅ Code tested and builds successfully  
✅ Documentation complete  

---

## 📝 What's Next (Frontend)

To complete the feature, add to frontend:

1. **Edit Button** on purchase request cards
2. **Edit Button** on claim details
3. **Edit Modal** with OTP flow
4. **Error handling** for validation failures
5. **(Optional)** Show edit history

---

## 🎯 Summary

**Backend is 100% complete!** ✅

- Users can edit their requests (before approval) and claims (before verification)
- All edits require OTP verification
- Complete audit trail for super admin review
- Ownership and status validation enforced
- Ready for frontend integration

See full documentation: `FEATURE_EDIT_REQUESTS_AND_CLAIMS.md`
