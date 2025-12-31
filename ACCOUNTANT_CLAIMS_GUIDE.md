# 📋 HOW ACCOUNTANTS CHECK AND DOWNLOAD UPLOADED CLAIMS

## Complete User Guide for Accountants

---

## 🎯 Overview

As an **Accountant**, you can:
1. ✅ View ALL purchase requests (from all departments)
2. ✅ Review and approve/reject purchase requests
3. ✅ View ALL claims submitted by Sales/Marketing
4. ✅ Download receipts uploaded by Sales/Marketing
5. ✅ Verify claims and mark them as processed

---

## 🔄 Complete Workflow

```
Sales/Marketing → Create Purchase Request → Submit for Approval
                                              ↓
Accountant → Review Purchase Request → Approve (with approved amount)
                                              ↓
Sales/Marketing → Upload Claim + Receipt → Submit
                                              ↓
Accountant → View Claim → Download Receipt → Verify → Process Payment
```

---

## 📱 FRONTEND: How to Check Claims (Current System)

### Step 1: Login to the System

1. Go to the application URL: `http://your-ec2-ip:3001`
2. Click **"Login"**
3. Enter your accountant credentials:
   - **Email**: `accountant@example.com` (or your email)
   - **Password**: Your password
4. If MFA is enabled, enter the **OTP code** sent to your email
5. Click **"Verify"**

---

### Step 2: Navigate to Purchase Requests Page

After logging in:
1. You'll be on the **Dashboard**
2. Click **"Purchase Requests"** in the navigation menu
3. You'll see the **Purchase Requests** page with all requests

---

### Step 3: View Purchase Requests with Claims

On the Purchase Requests page, you'll see a list of all purchase requests:

```
┌─────────────────────────────────────────────────────┐
│ Purchase Request Card                               │
├─────────────────────────────────────────────────────┤
│ Title: Office Supplies                              │
│ Status: APPROVED                                    │
│ Department: Sales                                   │
│ Estimated Amount: $500.00                           │
│ Approved Amount: $450.00                            │
│                                                     │
│ [✓ Claim Submitted]  [1 Claim(s)] ← CLICK HERE    │
└─────────────────────────────────────────────────────┘
```

**Key Indicators**:
- **"✓ Claim Submitted"** badge = Sales/Marketing uploaded a receipt
- **"X Claim(s)"** button = Number of claims submitted
  - Blue badge with claim count
  - Clickable button

---

### Step 4: View Claim Details

#### Option A: Single Claim (Direct Download)
If the purchase request has **only 1 claim**:
1. Click the **"1 Claim(s)"** button
2. **File downloads immediately** (no modal)
3. The receipt file downloads to your computer

#### Option B: Multiple Claims (Modal View)
If the purchase request has **multiple claims**:
1. Click the **"X Claim(s)"** button
2. A **modal popup** opens showing all claims
3. You see detailed information for each claim:

```
┌─────────────────────────────────────────────────────┐
│ Claims for Purchase Request: Office Supplies        │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ┌─────────────────────────────────────────────┐   │
│ │ Claim #12345678              [PENDING]      │   │
│ │                                              │   │
│ │ Vendor: Office Depot                        │   │
│ │ Amount Claimed: $450.00                     │   │
│ │ Purchase Date: 12/25/2025                   │   │
│ │ Uploaded: 12/26/2025 10:30 AM              │   │
│ │ Uploaded By: sales@example.com              │   │
│ │                                              │   │
│ │ Description: Purchased office supplies...   │   │
│ │                                              │   │
│ │ Receipt File: office-receipt-2025.pdf       │   │
│ │                                              │   │
│ │ [📥 Download Receipt] ← CLICK TO DOWNLOAD   │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│                         [Close]                     │
└─────────────────────────────────────────────────────┘
```

---

### Step 5: Download Receipt

**Two ways to download**:

#### Method 1: Direct Download (Single Claim)
1. Click **"1 Claim(s)"** button on the purchase request card
2. Receipt downloads immediately

#### Method 2: From Modal (Multiple Claims)
1. Click **"X Claim(s)"** button
2. Modal opens with claim details
3. Click **"Download Receipt"** button on the specific claim
4. Receipt file downloads to your computer

**Download Features**:
- ✅ Original filename preserved
- ✅ Supports PDF, JPG, PNG formats
- ✅ Downloads to your browser's default download folder
- ✅ Success message appears after download

---

### Step 6: Verify the Claim

After downloading and reviewing the receipt:

1. Check if the receipt matches the claim details:
   - ✅ Vendor name matches
   - ✅ Amount matches
   - ✅ Purchase date is reasonable
   - ✅ Receipt looks legitimate

2. Go back to the Purchase Requests page
3. Find the same purchase request
4. Click **"Verify Claim"** button (if available)
5. Choose action:
   - **VERIFIED** - Receipt is valid, approve for processing
   - **REJECTED** - Receipt is invalid or doesn't match
6. Add verification notes
7. Click **"Submit"**

---

## 🔌 BACKEND: API Endpoints (Technical)

### Current Implementation

#### 1. Get All Purchase Requests
```http
GET /purchase-requests
Authorization: Bearer <jwt-token>
```

**Response**: List of all purchase requests (accountants see ALL)

---

#### 2. Get Single Claim Details
```http
GET /purchase-requests/claims/:claimId
Authorization: Bearer <jwt-token>
```

**Response**: Detailed claim information including:
- Vendor name
- Amount claimed
- Purchase date
- Description
- Uploaded by user
- Verified by user (if verified)
- Receipt filename
- Status

---

#### 3. Download Receipt (Current Endpoint)
```http
GET /purchase-requests/claims/:claimId/download
Authorization: Bearer <jwt-token>
```

**Response**: Binary file stream (PDF/image)

**Headers**:
```
Content-Type: application/octet-stream
Content-Disposition: attachment; filename="receipt.pdf"
```

**Security** (Current):
- ✅ JWT authentication required
- ✅ Role check (accountant can download any claim)
- ⚠️ No MFA verification check (old implementation)
- ⚠️ No state validation (old implementation)
- ⚠️ No malware scan validation (old implementation)

---

#### 4. Secure Download Endpoint (NEW - After Deployment)
```http
GET /api/accountant/claims/:claimId/receipt
Authorization: Bearer <jwt-token>
```

**Response**: Binary file stream (PDF/image)

**Security** (NEW):
- ✅ JWT authentication required
- ✅ Role check (ACCOUNTANT or SUPER_ADMIN only)
- ✅ MFA session verification (must login with OTP)
- ✅ State validation (only VERIFIED, PROCESSED, REJECTED)
- ✅ Malware scan validation (only CLEAN files)
- ✅ Comprehensive audit logging
- ✅ Memory-safe streaming

---

### After EC2 Deployment

Once you deploy the new secure endpoint, the frontend will need to be updated to use:
```
/api/accountant/claims/:claimId/receipt
```

Instead of:
```
/purchase-requests/claims/:claimId/download
```

---

## 🗄️ DATABASE: How Claims Are Stored

### Claims Table Structure

```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY,
  purchase_request_id UUID NOT NULL,           -- Links to purchase request
  receipt_file_path VARCHAR(500),              -- Actual file path on disk
  receipt_file_original_name VARCHAR(255),     -- Original filename
  file_hash VARCHAR(64),                       -- SHA-256 for duplicate detection
  malware_scan_status VARCHAR(20),             -- CLEAN, INFECTED, PENDING, ERROR
  vendor_name VARCHAR(255),                    -- Vendor/supplier name
  amount_claimed DECIMAL(12,2),                -- Amount to be reimbursed
  purchase_date DATE,                          -- Date of purchase
  claim_description TEXT,                      -- Description of purchase
  uploaded_by_user_id UUID,                    -- Who uploaded (Sales/Marketing)
  status VARCHAR(50) DEFAULT 'PENDING',        -- PENDING, VERIFIED, PROCESSED, REJECTED
  verified_by_user_id UUID,                    -- Who verified (Accountant)
  verification_notes TEXT,                     -- Accountant's notes
  verified_at TIMESTAMP,                       -- When verified
  uploaded_at TIMESTAMP,                       -- When uploaded
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

---

### Query to See All Claims (SQL)

```sql
-- View all claims with details
SELECT 
  c.id,
  c.vendor_name,
  c.amount_claimed,
  c.status,
  c.malware_scan_status,
  c.receipt_file_original_name,
  pr.title as purchase_request_title,
  uploader.email as uploaded_by,
  verifier.email as verified_by,
  c.uploaded_at,
  c.verified_at
FROM claims c
LEFT JOIN purchase_requests pr ON c.purchase_request_id = pr.id
LEFT JOIN users uploader ON c.uploaded_by_user_id = uploader.id
LEFT JOIN users verifier ON c.verified_by_user_id = verifier.id
ORDER BY c.uploaded_at DESC;
```

---

### Query to See Pending Claims (SQL)

```sql
-- See claims waiting for accountant review
SELECT 
  c.id,
  c.vendor_name,
  c.amount_claimed,
  pr.title as purchase_request,
  pr.department,
  uploader.email as uploaded_by,
  c.uploaded_at
FROM claims c
LEFT JOIN purchase_requests pr ON c.purchase_request_id = pr.id
LEFT JOIN users uploader ON c.uploaded_by_user_id = uploader.id
WHERE c.status = 'PENDING'
ORDER BY c.uploaded_at ASC;
```

---

## 🔐 Security & Permissions

### What Accountants CAN Do:

✅ **View**:
- All purchase requests (all departments)
- All claims (from any user)
- All claim details
- All receipt files

✅ **Download**:
- Any receipt file uploaded by Sales/Marketing
- Regardless of who uploaded it

✅ **Actions**:
- Approve/Reject purchase requests
- Verify/Reject claims
- Add verification notes
- Download receipts for review

---

### What Accountants CANNOT Do:

❌ **Create**:
- Cannot create purchase requests
- Cannot upload claims
- Cannot upload receipts

❌ **Edit**:
- Cannot edit purchase requests created by others
- Cannot edit claims uploaded by others

❌ **Delete**:
- Cannot delete purchase requests
- Cannot delete claims

---

## 🎨 Visual Guide: Screenshots Description

### 1. Purchase Requests List View
```
┌────────────────────────────────────────────────────────────┐
│ Purchase Requests                          [+ New Request]  │
├────────────────────────────────────────────────────────────┤
│ Filter: [All Status ▼] [All Departments ▼]                │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Office Supplies                     🟢 APPROVED      │ │
│ │ Normal Priority                     1 Claim(s) ←──┐  │ │
│ │                                                    │  │ │
│ │ Department: Sales                                  │  │ │
│ │ Estimated: $500.00                                 │  │ │
│ │ Approved: $450.00                                  │  │ │
│ │ Created: 12/24/2025                                │  │ │
│ │                                                    │  │ │
│ │ [Review] [Verify Claim]                    Click here│ │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Marketing Materials                🟡 SUBMITTED      │ │
│ │ High Priority                                        │ │
│ │                                                      │ │
│ │ Department: Marketing                                │ │
│ │ Estimated: $1,200.00                                 │ │
│ │ Created: 12/25/2025                                  │ │
│ │                                                      │ │
│ │ [Review]                                             │ │
│ └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

### 2. Claims Modal View
```
┌────────────────────────────────────────────────────────────┐
│ Claims for Purchase Request: Office Supplies          [X]  │
├────────────────────────────────────────────────────────────┤
│                                                            │
│ ┌──────────────────────────────────────────────────────┐ │
│ │ Claim #a1b2c3d4                    🟡 PENDING        │ │
│ │                                                      │ │
│ │ Vendor: Office Depot                                 │ │
│ │ Amount Claimed: $450.00                              │ │
│ │ Purchase Date: 12/20/2025                            │ │
│ │ Uploaded: 12/26/2025 10:30 AM                        │ │
│ │ Uploaded By: sales@company.com                       │ │
│ │                                                      │ │
│ │ Description:                                         │ │
│ │ Purchased office supplies including paper,           │ │
│ │ pens, and folders for the sales department.          │ │
│ │                                                      │ │
│ │ Receipt File: office-depot-2025-12-20.pdf            │ │
│ │                                                      │ │
│ │                    [📥 Download Receipt]             │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                            │
│                                      [Close]               │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 Claim Status Flow

```
PENDING (Yellow)
  ↓
  When Accountant downloads receipt and reviews
  ↓
VERIFIED (Blue)
  ↓
  When Accountant processes payment
  ↓
PROCESSED (Green)

Or:

PENDING (Yellow)
  ↓
  If receipt is invalid or doesn't match
  ↓
REJECTED (Red)
```

---

## 🧪 Testing Guide for Accountants

### Test Scenario: Complete Claim Review Workflow

1. **Login as Accountant**
   - Email: `accountant@example.com`
   - Password: Your password
   - OTP: Check email for code

2. **View Purchase Requests**
   - Navigate to "Purchase Requests"
   - Filter by status: "APPROVED"
   - Look for requests with "Claim Submitted" badge

3. **Check Claim**
   - Click "1 Claim(s)" button
   - If single claim: File downloads immediately
   - If multiple: Modal opens with details

4. **Download Receipt**
   - Click "Download Receipt" button
   - File saves to Downloads folder
   - Open file to review

5. **Verify Receipt Content**
   - Check vendor name matches
   - Check amount matches
   - Check date is reasonable
   - Check receipt looks legitimate

6. **Verify Claim in System**
   - Go back to Purchase Requests
   - Click "Verify Claim" button
   - Select "VERIFIED" or "REJECTED"
   - Add notes: "Receipt verified, approved for payment"
   - Submit

7. **Check Audit Log** (Admin/Database)
   - Query: `SELECT * FROM audit_logs WHERE action = 'DOWNLOAD_RECEIPT';`
   - Should see your download recorded

---

## 🆘 Troubleshooting

### Issue: Cannot See Claims Button

**Problem**: Purchase request shows no "X Claim(s)" button

**Solution**:
- Check if the purchase request is APPROVED
- Sales/Marketing must upload a claim first
- Refresh the page
- Check `claims` table: `SELECT * FROM claims WHERE purchase_request_id = '<id>';`

---

### Issue: Cannot Download Receipt

**Problem**: Click "Download Receipt" but nothing happens

**Solutions**:
1. **Check browser console** (F12):
   - Look for error messages
   - May show 403 Forbidden or 404 Not Found

2. **Check your role**:
   - You must be logged in as ACCOUNTANT
   - Check: `SELECT role FROM users WHERE email = 'your-email';`

3. **Check file exists**:
   - SSH to EC2
   - Check: `ls -la /home/ubuntu/fyp_system/backend/uploads/receipts/`
   - File should exist at the path in database

4. **Check claim status** (after new deployment):
   - New secure endpoint only allows: VERIFIED, PROCESSED, REJECTED
   - Check: `SELECT status FROM claims WHERE id = '<claim-id>';`

---

### Issue: Downloaded File is Corrupted

**Problem**: File downloads but won't open

**Solutions**:
1. **Check if Next.js proxy is fixed**:
   - We fixed this in the latest deployment
   - Proxy now handles binary data correctly
   - Pull latest code: `git pull origin main`

2. **Test backend directly**:
   ```bash
   curl -H "Authorization: Bearer <token>" \
        http://localhost:3000/purchase-requests/claims/<claim-id>/download \
        --output test.pdf
   
   # Check file
   file test.pdf
   ```

3. **Check malware scan status**:
   ```sql
   SELECT malware_scan_status FROM claims WHERE id = '<claim-id>';
   ```
   Should be 'CLEAN'

---

## 📞 Support & Documentation

### For More Information:

- **Technical Docs**: `SECURE_ACCOUNTANT_DOWNLOAD_IMPLEMENTATION.md`
- **Deployment Guide**: `EC2_DEPLOYMENT_QUICK_REFERENCE.md`
- **System Overview**: `COMPLETE_SYSTEM_DOCUMENTATION.md`

### Contact:
- System Administrator: `admin@company.com`
- Technical Support: Check logs in `/var/log/` or PM2 logs

---

## ✅ Summary

**As an Accountant, you can check uploaded claims by:**

1. ✅ **Login** to the system
2. ✅ Go to **"Purchase Requests"** page
3. ✅ Look for requests with **"X Claim(s)"** button
4. ✅ **Click** the claims button:
   - 1 claim = Direct download
   - Multiple = Modal with details
5. ✅ **Click "Download Receipt"** to get the file
6. ✅ **Review** the receipt
7. ✅ **Verify** or reject the claim
8. ✅ System **logs** all your actions

**Easy and secure!** 🎉
