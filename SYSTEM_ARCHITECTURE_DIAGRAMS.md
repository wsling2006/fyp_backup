# 🎨 Purchase Request System - Visual Architecture

## 📊 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │   Sales      │  │  Marketing   │  │  Accountant  │            │
│  │  Dashboard   │  │   Dashboard  │  │   Dashboard  │            │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘            │
│         │                  │                  │                    │
│         └──────────────────┼──────────────────┘                    │
│                            │                                       │
│                   ┌────────▼────────┐                              │
│                   │  Next.js        │                              │
│                   │  Frontend       │                              │
│                   │  (Port 3001)    │                              │
│                   └────────┬────────┘                              │
└────────────────────────────┼──────────────────────────────────────┘
                             │
                             │ HTTP/HTTPS
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                  NEXT.JS API PROXY                                 │
│                  /api/[...path]/route.ts                           │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  • Request/Response Interception                            │ │
│  │  • Binary File Handling (arrayBuffer for downloads)         │ │
│  │  • Authentication Header Forwarding                         │ │
│  │  • Error Handling & Logging                                 │ │
│  └─────────────────────────────────────────────────────────────┘ │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             │ Forward to Backend
                             │
┌────────────────────────────▼──────────────────────────────────────┐
│                    NESTJS BACKEND                                  │
│                    (Port 3000)                                     │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                     GUARDS LAYER                             │ │
│  │  ┌──────────────────┐    ┌───────────────────┐             │ │
│  │  │  JwtAuthGuard    │ →  │   RolesGuard      │             │ │
│  │  │  Verify JWT      │    │   Check RBAC      │             │ │
│  │  └──────────────────┘    └───────────────────┘             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                             │                                      │
│  ┌─────────────────────────▼───────────────────────────────────┐ │
│  │                   CONTROLLERS                                │ │
│  │                                                              │ │
│  │  ┌────────────────────────────────────────────────────────┐ │ │
│  │  │  Purchase Request Controller                           │ │ │
│  │  │  • GET    /purchase-requests                           │ │ │
│  │  │  • POST   /purchase-requests                           │ │ │
│  │  │  • PUT    /purchase-requests/:id/edit                  │ │ │
│  │  │  • POST   /purchase-requests/:id/approve               │ │ │
│  │  │  • POST   /purchase-requests/claims/upload             │ │ │
│  │  │  • GET    /purchase-requests/claims/:id/download       │ │ │
│  │  └────────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────┬───────────────────────────────────┘ │
│                             │                                      │
│  ┌─────────────────────────▼───────────────────────────────────┐ │
│  │                     SERVICES                                 │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │ │
│  │  │ Purchase     │  │   Auth       │  │   Audit      │     │ │
│  │  │ Request      │  │   Service    │  │   Service    │     │ │
│  │  │ Service      │  │   (OTP)      │  │   (Logging)  │     │ │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │ │
│  │         │                  │                  │             │ │
│  │  ┌──────▼──────────────────▼──────────────────▼────────┐   │ │
│  │  │           Business Logic Layer                       │   │ │
│  │  │  • Ownership Validation                              │   │ │
│  │  │  • Status Validation                                 │   │ │
│  │  │  • Amount Validation                                 │   │ │
│  │  │  • Duplicate Detection (SHA-256 hash)                │   │ │
│  │  │  • ClamAV Malware Scanning                           │   │ │
│  │  └──────────────────────────┬───────────────────────────┘   │ │
│  └─────────────────────────────┼───────────────────────────────┘ │
│                                 │                                  │
│  ┌──────────────────────────────▼──────────────────────────────┐ │
│  │                      TYPEORM (ORM)                           │ │
│  │  • Entity Mapping                                            │ │
│  │  • Query Building                                            │ │
│  │  • Transaction Management                                    │ │
│  └──────────────────────────────┬──────────────────────────────┘ │
└──────────────────────────────────┼────────────────────────────────┘
                                   │
                                   │ SQL Queries
                                   │
┌──────────────────────────────────▼────────────────────────────────┐
│                       POSTGRESQL DATABASE                          │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ purchase_requests│  │     claims       │  │   audit_logs   │ │
│  ├──────────────────┤  ├──────────────────┤  ├────────────────┤ │
│  │ • id (UUID)      │  │ • id (UUID)      │  │ • id (UUID)    │ │
│  │ • title          │  │ • pr_id (FK)     │  │ • user_id      │ │
│  │ • status         │  │ • file_path      │  │ • action       │ │
│  │ • amount         │  │ • file_hash      │  │ • old_values   │ │
│  │ • created_by     │  │ • vendor_name    │  │ • new_values   │ │
│  │ • reviewed_by    │  │ • amount         │  │ • timestamp    │ │
│  └────────┬─────────┘  └────────┬─────────┘  └────────────────┘ │
│           │                      │                                │
│           │    1:N Relationship  │                                │
│           └──────────────────────┘                                │
└───────────────────────────────────────────────────────────────────┘

                                   │
                                   │
┌──────────────────────────────────▼────────────────────────────────┐
│                     FILE SYSTEM STORAGE                            │
│                     /backend/uploads/                              │
│                                                                    │
│  receipt-1234567890-abc123-invoice.pdf                            │
│  receipt-1234567891-def456-receipt.jpg                            │
│  receipt-1234567892-ghi789-document.png                           │
│                                                                    │
│  • SHA-256 hash verification                                      │
│  • ClamAV scanned                                                 │
│  • Original filename preserved in database                        │
└───────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Complete Workflow Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PURCHASE REQUEST LIFECYCLE                       │
└─────────────────────────────────────────────────────────────────────┘

PHASE 1: REQUEST CREATION (Sales/Marketing)
═══════════════════════════════════════════

User Actions:                    System Actions:
─────────────                    ───────────────

1. Fill Form                     
   ├─ Title                      → Validate input
   ├─ Description                → Check required fields
   ├─ Department                 → Type checking
   ├─ Priority (1-5)             
   └─ Estimated Amount           
                                 
2. Submit Form                   
   ├─ Enter Password             → Verify password
   └─ Request OTP                → Generate 6-digit OTP
                                 → Send to user's email
                                 → Store OTP (expires 5 min)
                                 
3. Enter OTP                     
   └─ Confirm                    → Validate OTP
                                 → Create purchase request
                                 → Set status: DRAFT
                                 → Log: CREATE_PURCHASE_REQUEST
                                 
4. Review & Submit               
   └─ Click "Submit"             → Change status: SUBMITTED
                                 → Notify accountants
                                 → Log: SUBMIT_PURCHASE_REQUEST

State: SUBMITTED ─────────────────────────────────────────────────────→


PHASE 2: REVIEW (Accountant)
════════════════════════════

Accountant Actions:              System Actions:
──────────────────              ───────────────

1. View All Requests             → Query all SUBMITTED requests
   └─ Filter by:                 → Apply filters
      ├─ Status                  → Return paginated results
      ├─ Department              
      └─ Date Range              

2. Open Request Details          → Fetch request by ID
   ├─ View requester info        → Load creator details
   ├─ Check description          → Load audit history
   └─ Review amount              

3. Make Decision                 
   ├─ Set Status:                → Validate decision
   │  • Approve                  → Check amount not negative
   │  • Reject                   
   │  • Request Changes          
   ├─ Set Approved Amount        → Cannot exceed estimated
   └─ Add Review Notes           
                                 
4. Submit Review                 → Update purchase request
                                 → Set reviewed_by_user_id
                                 → Set reviewed_at timestamp
                                 → Send notification to requester
                                 → Log: APPROVE/REJECT_PURCHASE_REQUEST

IF APPROVED: State: APPROVED ─────────────────────────────────────────→
IF REJECTED: State: REJECTED (END) ────────────────────────────────────┘


PHASE 3: CLAIM SUBMISSION (Sales/Marketing)
═══════════════════════════════════════════

User Actions:                    System Actions:
─────────────                    ───────────────

1. Upload Receipt                
   ├─ Select File                → Validate file size (<10MB)
   │  (PDF, JPG, PNG)             → Check file type
   ├─ Vendor Name                → Validate vendor name
   ├─ Amount Claimed             → Check amount ≤ approved_amount
   ├─ Purchase Date              → Validate date format
   └─ Description                
                                 
2. Security Scanning             
   └─ Submit Form                → Generate SHA-256 hash
                                 → Check if hash exists (duplicate)
                                 ├─ IF DUPLICATE: Reject with error
                                 └─ IF UNIQUE: Continue
                                 
                                 → Scan with ClamAV
                                 ├─ IF INFECTED: Delete file, reject
                                 └─ IF CLEAN: Continue
                                 
3. OTP Verification              
   ├─ Enter Password             → Verify password
   ├─ Request OTP                → Generate & send OTP
   └─ Enter OTP                  → Validate OTP
                                 
4. Finalize Upload               → Save file to disk
                                 → Create claim record
                                 → Store file_path, file_hash
                                 → Link to purchase_request
                                 → Notify accountants
                                 → Log: UPLOAD_CLAIM

Claim State: PENDING ──────────────────────────────────────────────────→


PHASE 4: CLAIM VERIFICATION (Accountant)
════════════════════════════════════════

Accountant Actions:              System Actions:
──────────────────              ───────────────

1. View Claims                   → Query claims for request
   └─ Click "1 Claim(s)" badge   → IF 1 claim: Download directly ✨
                                 → IF >1 claims: Open modal
                                 
2. Download Receipt              
   └─ Click badge/button         → Fetch file from disk
                                 → Set Content-Type headers
                                 → Set Content-Disposition (attachment)
                                 → Stream file as binary
                                 → Log: DOWNLOAD_CLAIM_RECEIPT
                                 
3. Verify Offline                [Accountant reviews PDF/image]
   ├─ Check vendor matches       [Compare with claim data]
   ├─ Verify amount              [Check receipt amount]
   └─ Validate purchase date     [Confirm date is correct]
   
4. Make Decision                 
   ├─ Verify/Reject              → Update claim status
   └─ Add Notes                  → Set verified_by_user_id
                                 → Set verified_at timestamp
                                 → Notify requester
                                 → Log: VERIFY/REJECT_CLAIM

IF VERIFIED: Claim State: VERIFIED ────────────────────────────────────→
IF REJECTED: Claim State: REJECTED (END) ──────────────────────────────┘


PHASE 5: COMPLETION (Final State)
═════════════════════════════════

Status: PAID                     
└─ Request marked as complete    → All done!
   Claim marked as processed     → Archive for audit
   Available for reporting       → Include in financial reports
```

---

## 🔐 Security Flow Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                     AUTHENTICATION FLOW                             │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Initial Login
─────────────────────
User                        Backend                    Email Service
────                        ───────                    ─────────────

Enter email + password
         │
         └──────────→  Validate credentials
                       Check bcrypt hash
                              │
                              ├─ IF INVALID: Return error
                              └─ IF VALID: Generate OTP
                                     │
                                     ├─ Create 6-digit code
                                     ├─ Store in database
                                     ├─ Set expiry (5 minutes)
                                     └─────────────→ Send OTP email
                                                            │
                       ← ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
                       Return: "OTP sent to email"
         │
         ←──────────────┘
         
User checks email
User enters OTP
         │
         └──────────→  Validate OTP
                       ├─ Check if exists
                       ├─ Check if expired
                       └─ Check if matches
                              │
                              ├─ IF INVALID: Return error
                              └─ IF VALID:
                                     ├─ Delete OTP (single-use)
                                     ├─ Generate JWT token
                                     │  {
                                     │    userId: "uuid",
                                     │    email: "user@example.com",
                                     │    role: "sales_department",
                                     │    exp: timestamp + 3600
                                     │  }
                                     └─ Sign with secret key
         │
         ←──────────────┘
         
Store JWT in localStorage
Use JWT for all API calls


Step 2: Authenticated Request
──────────────────────────────

Frontend                    Next.js Proxy              NestJS Backend
────────                    ─────────────              ──────────────

Make API call
Add header:
Authorization: 
Bearer <JWT>
         │
         └──────────→  Forward request
                       Add headers
                              │
                              └──────────→  JwtAuthGuard
                                            ├─ Extract token
                                            ├─ Verify signature
                                            ├─ Check expiry
                                            └─ Decode payload
                                                   │
                                                   ├─ IF INVALID: 401
                                                   └─ IF VALID:
                                                          │
                                                   RolesGuard
                                                   ├─ Check user role
                                                   ├─ Check @Roles decorator
                                                   └─ Verify permission
                                                          │
                                                          ├─ IF NO PERMISSION: 403
                                                          └─ IF AUTHORIZED:
                                                                 │
                                                          Execute endpoint
                                                          Return response
         │                                                       │
         ←──────────────────────────────────────────────────────┘


Step 3: OTP for Actions
────────────────────────

User                        Backend
────                        ───────

Click action (e.g., Submit Request)
         │
         └──────────→  Require OTP
                              │
Prompt for password           │
         │                    │
         └──────────→  Validate password
                       Generate OTP
                       Send to email
         │
         ←──────────────┘
         
Enter OTP from email
         │
         └──────────→  Validate OTP
                       ├─ IF VALID:
                       │     └─ Perform action
                       └─ IF INVALID:
                             └─ Return error
         │
         ←──────────────┘
```

---

## 💾 Database Relationships Diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                        DATABASE SCHEMA                               │
└──────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│       users         │
├─────────────────────┤
│ • id (PK)          │
│ • email            │
│ • password_hash    │
│ • role             │
│ • created_at       │
└──────────┬──────────┘
           │
           │ 1:N (created_by)
           │
┌──────────▼──────────────────────────┐
│      purchase_requests              │
├─────────────────────────────────────┤
│ • id (PK)                          │
│ • title                            │
│ • description                      │
│ • department                       │
│ • priority (1-5)                   │
│ • estimated_amount                 │
│ • approved_amount                  │
│ • status (ENUM)                    │
│ • created_by_user_id (FK) ─────┐  │
│ • reviewed_by_user_id (FK) ────┼─→│  users
│ • review_notes                  │  │
│ • reviewed_at                   │  │
│ • created_at                    └──┘
│ • updated_at                       │
└──────────┬──────────────────────────┘
           │
           │ 1:N (claims)
           │
┌──────────▼──────────────────────────┐
│          claims                     │
├─────────────────────────────────────┤
│ • id (PK)                          │
│ • purchase_request_id (FK)         │
│ • receipt_file_path                │
│ • receipt_file_original_name       │
│ • file_hash (UNIQUE) ◄─────────── SHA-256 duplicate prevention
│ • vendor_name                      │
│ • amount_claimed                   │
│ • purchase_date                    │
│ • claim_description                │
│ • uploaded_by_user_id (FK) ────┐  │
│ • status (ENUM)                 │  │
│ • verified_by_user_id (FK) ────┼─→│  users
│ • verification_notes            │  │
│ • verified_at                   │  │
│ • uploaded_at                   └──┘
└─────────────────────────────────────┘


┌─────────────────────────────────────┐
│        audit_logs                   │
├─────────────────────────────────────┤
│ • id (PK)                          │
│ • user_id (FK) ──────────────────→│  users
│ • action                           │
│   (CREATE_PURCHASE_REQUEST,        │
│    APPROVE_PURCHASE_REQUEST,       │
│    UPLOAD_CLAIM,                   │
│    DOWNLOAD_CLAIM_RECEIPT, etc.)   │
│ • entity_type                      │
│ • entity_id                        │
│ • old_values (JSONB)               │
│ • new_values (JSONB)               │
│ • ip_address                       │
│ • user_agent                       │
│ • timestamp                        │
└─────────────────────────────────────┘


INDEXES:
────────
purchase_requests:
  • idx_pr_created_by (created_by_user_id)
  • idx_pr_status (status)
  • idx_pr_created_at (created_at)

claims:
  • idx_claims_pr_id (purchase_request_id)
  • idx_claims_file_hash (file_hash) WHERE file_hash IS NOT NULL
  • idx_claims_uploaded_by (uploaded_by_user_id)
  • idx_claims_status (status)

audit_logs:
  • idx_audit_user_id (user_id)
  • idx_audit_action (action)
  • idx_audit_timestamp (timestamp)
```

---

## 🎯 Feature Hierarchy Map

```
Purchase Request System
│
├─ 👥 User Management
│  ├─ Authentication (JWT + OTP)
│  ├─ Role-Based Access Control
│  │  ├─ Sales Department
│  │  ├─ Marketing
│  │  ├─ Accountant
│  │  └─ Super Admin
│  └─ Session Management
│
├─ 📋 Purchase Request Module
│  ├─ Create Request
│  │  ├─ Form Validation
│  │  ├─ OTP Verification
│  │  └─ Audit Logging
│  ├─ Edit Request
│  │  ├─ Status Check (DRAFT/SUBMITTED only)
│  │  ├─ Ownership Validation
│  │  └─ OTP Verification
│  ├─ Submit Request
│  │  ├─ Status Change (DRAFT → SUBMITTED)
│  │  └─ Notify Accountants
│  ├─ Review Request (Accountant)
│  │  ├─ Approve
│  │  │  ├─ Set Approved Amount
│  │  │  └─ Add Review Notes
│  │  ├─ Reject
│  │  │  └─ Add Rejection Reason
│  │  └─ Request Changes
│  │     └─ Status → UNDER_REVIEW
│  └─ View Requests
│     ├─ Filter by Status
│     ├─ Filter by Department
│     └─ Search by Title
│
├─ 📎 Claims Module
│  ├─ Upload Claim
│  │  ├─ File Upload
│  │  │  ├─ Size Validation (<10MB)
│  │  │  ├─ Type Validation (PDF, images)
│  │  │  ├─ ClamAV Scan (malware)
│  │  │  └─ SHA-256 Hash (duplicates)
│  │  ├─ Amount Validation (≤ approved)
│  │  ├─ OTP Verification
│  │  └─ One Claim Per Request
│  ├─ Edit Claim
│  │  ├─ Status Check (PENDING only)
│  │  ├─ Cannot Change File
│  │  └─ OTP Verification
│  ├─ Download Receipt
│  │  ├─ One-Click from Badge ✨
│  │  │  └─ If 1 claim: Download immediately
│  │  ├─ Binary File Streaming
│  │  ├─ Original Filename
│  │  └─ Audit Log Download
│  ├─ Verify Claim (Accountant)
│  │  ├─ Download Receipt
│  │  ├─ Verify Amount
│  │  ├─ Verify Vendor
│  │  ├─ Add Verification Notes
│  │  └─ Approve/Reject
│  └─ View Claims
│     ├─ Show in Badge
│     ├─ Modal with Details
│     └─ Filter by Status
│
├─ 🔐 Security Features
│  ├─ Authentication
│  │  ├─ JWT Tokens (1 hour expiry)
│  │  └─ OTP Verification (5 min expiry)
│  ├─ Authorization
│  │  ├─ JwtAuthGuard (all endpoints)
│  │  ├─ RolesGuard (RBAC)
│  │  └─ Ownership Validation
│  ├─ File Security
│  │  ├─ ClamAV Malware Scanning
│  │  ├─ SHA-256 Duplicate Prevention
│  │  └─ File Type Validation
│  └─ Audit Trail
│     ├─ All Actions Logged
│     ├─ Before/After Values
│     └─ IP & User Agent Tracking
│
├─ 📊 Reporting & Analytics
│  ├─ Audit Logs Viewer
│  ├─ Download Activity
│  └─ Request Statistics
│
└─ ⚙️ System Administration
   ├─ User Management
   ├─ System Configuration
   └─ Database Maintenance
```

---

## 🎨 UI Component Tree

```
Purchase Requests Page (/app/purchase-requests/page.tsx)
│
├─ Header
│  ├─ Title: "Purchase Requests"
│  └─ Create Button (Sales/Marketing only)
│
├─ Filters Section
│  ├─ Status Dropdown
│  ├─ Department Dropdown
│  └─ Search Input
│
├─ Request Cards List
│  │
│  └─ Request Card (repeated)
│     ├─ Header
│     │  ├─ Title
│     │  └─ Status Badge (color-coded)
│     ├─ Content
│     │  ├─ Priority Badge
│     │  ├─ Department
│     │  ├─ Estimated Amount
│     │  ├─ Approved Amount (if approved)
│     │  ├─ Created Date
│     │  └─ Requested By (accountant view)
│     └─ Actions
│        ├─ Edit Button (creator, if DRAFT/SUBMITTED)
│        ├─ Review Button (accountant, if SUBMITTED)
│        ├─ Upload Claim Button (creator, if APPROVED, no claim)
│        └─ Claims Badge (clickable) ✨
│           └─ Download on click if 1 claim
│
├─ Modals (overlays)
│  │
│  ├─ Create Request Modal
│  │  ├─ Title Input
│  │  ├─ Description Textarea
│  │  ├─ Department Radio
│  │  ├─ Priority Select
│  │  ├─ Estimated Amount Input
│  │  ├─ OTP Section
│  │  │  ├─ Password Input
│  │  │  ├─ Request OTP Button
│  │  │  └─ OTP Input
│  │  └─ Submit Button
│  │
│  ├─ Edit Request Modal
│  │  └─ (Same as Create, pre-filled)
│  │
│  ├─ Review Request Modal (Accountant)
│  │  ├─ Request Details (read-only)
│  │  ├─ Status Dropdown
│  │  │  ├─ Approve
│  │  │  ├─ Reject
│  │  │  └─ Request Changes
│  │  ├─ Approved Amount Input
│  │  ├─ Review Notes Textarea
│  │  └─ Submit Button
│  │
│  ├─ Upload Claim Modal
│  │  ├─ Security Notice
│  │  ├─ File Upload Input
│  │  ├─ Vendor Name Input
│  │  ├─ Amount Input
│  │  │  └─ Warning if > approved
│  │  ├─ Purchase Date Input
│  │  ├─ Description Textarea
│  │  ├─ OTP Section
│  │  └─ Upload Button
│  │     └─ Shows "🔍 Scanning..." during ClamAV
│  │
│  └─ View Claims Modal (Accountant)
│     └─ Claim Card (repeated)
│        ├─ Status Badge
│        ├─ Vendor Name
│        ├─ Amount
│        ├─ Purchase Date
│        ├─ Description
│        ├─ Uploaded By
│        ├─ Verified By (if verified)
│        ├─ Verification Notes
│        └─ Download Button
│
└─ Loading/Error States
   ├─ Skeleton Loaders
   ├─ Error Messages
   └─ Success Toasts
```

---

**Documentation Created:** December 30, 2025  
**System Version:** 1.0.0  
**Status:** ✅ Production Ready