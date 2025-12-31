# 📋 Complete Purchase Request System Documentation

## 🎯 System Overview

The Purchase Request System is a comprehensive workflow management solution that enables employees to submit purchase requests, which are then reviewed by accountants, and finally tracked through claims submission and verification. The system includes role-based access control, audit logging, file upload with malware scanning, and complete approval workflows.

---

## 🏗️ System Architecture

### Technology Stack

**Backend:**
- Framework: NestJS (Node.js)
- Database: PostgreSQL
- ORM: TypeORM
- Authentication: JWT + OTP (Email-based)
- File Scanning: ClamAV
- File Storage: Local filesystem with hash-based deduplication

**Frontend:**
- Framework: Next.js 14 (React)
- Styling: Tailwind CSS
- HTTP Client: Axios
- State Management: React Hooks
- Routing: Next.js App Router

**Infrastructure:**
- Hosting: AWS EC2
- Process Manager: PM2
- Reverse Proxy: Next.js API Routes

---

## 👥 User Roles & Permissions

### 1. **Sales Department** (`sales_department`)
**Permissions:**
- ✅ Create purchase requests
- ✅ Edit own DRAFT/SUBMITTED requests
- ✅ Upload claims for own APPROVED requests
- ✅ View own purchase requests and claims
- ❌ Cannot approve requests
- ❌ Cannot verify claims
- ❌ Cannot view others' requests

**Use Cases:**
- Submit purchase requests for sales activities
- Upload receipts after purchases are approved
- Track status of submitted requests

### 2. **Marketing Department** (`marketing`)
**Permissions:**
- ✅ Create purchase requests
- ✅ Edit own DRAFT/SUBMITTED requests
- ✅ Upload claims for own APPROVED requests
- ✅ View own purchase requests and claims
- ❌ Cannot approve requests
- ❌ Cannot verify claims
- ❌ Cannot view others' requests

**Use Cases:**
- Submit purchase requests for marketing campaigns
- Upload receipts for marketing expenses
- Monitor campaign spending

### 3. **Accountant** (`accountant`)
**Permissions:**
- ✅ View ALL purchase requests
- ✅ Approve/Reject purchase requests
- ✅ View ALL claims
- ✅ Download ALL claim receipts (one-click from badge)
- ✅ Verify/Reject claims
- ✅ Add review notes
- ❌ Cannot create purchase requests
- ❌ Cannot upload claims

**Use Cases:**
- Review and approve/reject purchase requests
- Verify submitted claims against receipts
- Download and audit all receipts
- Manage company spending

### 4. **Super Admin** (`super_admin`)
**Permissions:**
- ✅ ALL permissions from all roles
- ✅ Create/Edit/Delete any purchase request
- ✅ View complete audit trail
- ✅ Override any workflow state
- ✅ Manage user accounts

**Use Cases:**
- System administration
- Handle escalations
- Generate reports
- Audit system activity

---

## 🔄 Purchase Request Workflow

### Workflow States

```
┌─────────────┐
│   DRAFT     │  Created but not submitted
└──────┬──────┘
       │ (Submit)
       ↓
┌─────────────┐
│  SUBMITTED  │  Waiting for accountant review
└──────┬──────┘
       │
       ├─────→ (Approve) → APPROVED
       │
       ├─────→ (Reject) → REJECTED
       │
       └─────→ (Request changes) → UNDER_REVIEW
```

### State Details

| State | Description | Who Can Edit | Next Actions |
|-------|-------------|--------------|--------------|
| **DRAFT** | Initial creation, not yet submitted | Creator only | Submit, Edit, Delete |
| **SUBMITTED** | Awaiting accountant review | Creator can edit | Accountant: Approve/Reject |
| **APPROVED** | Accountant approved the request | No one | Creator can upload claim |
| **REJECTED** | Accountant rejected the request | No one | None (final state) |
| **UNDER_REVIEW** | Accountant requested changes | Creator can edit | Re-submit after changes |
| **PAID** | Claim verified and payment processed | No one | None (final state) |

### Workflow Diagram

```
USER (Sales/Marketing)                ACCOUNTANT                    SYSTEM
─────────────────────                 ──────────                    ──────

1. Create Request
   ├─ Title
   ├─ Description
   ├─ Department
   ├─ Priority (1-5)
   ├─ Estimated Amount
   └─ OTP Verification
         │
         ↓
2. [DRAFT State]
         │
         ├─ Can Edit
         ├─ Can Delete
         └─ Submit → OTP Required
                │
                ↓
3. [SUBMITTED State] ────────────→  Receives Notification
         │                                    │
         │                                    ↓
         │                          4. Review Request
         │                             ├─ View Details
         │                             ├─ Check Amount
         │                             └─ Decision:
         │                                    │
         ↓                                    ├──→ APPROVE
4a. [APPROVED] ←──────────────────────────────┘        │
         │                                              └──→ REJECT
         │                                                     │
         ↓                                                     ↓
5. Upload Claim                                    4b. [REJECTED]
   ├─ Receipt File                                      (End)
   ├─ Vendor Name
   ├─ Amount
   ├─ Purchase Date
   ├─ Description
   ├─ OTP Verification
   └─ ClamAV Scan ───→ [Malware Check]
         │                   │
         ↓                   └─→ If infected: Reject
6. [CLAIM SUBMITTED] ───────────→  Receives Notification
         │                                  │
         │                                  ↓
         │                         7. Verify Claim
         │                            ├─ Download Receipt (One-Click)
         │                            ├─ Verify Amount
         │                            ├─ Check Vendor
         │                            └─ Decision:
         │                                   │
         ↓                                   ├──→ VERIFY
7a. [CLAIM VERIFIED] ←──────────────────────┘        │
         │                                           └──→ REJECT CLAIM
         ↓
8. [PAID] - Complete
```

---

## 📊 Database Schema

### Table: `purchase_requests`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `title` | VARCHAR(255) | Request title |
| `description` | TEXT | Detailed description |
| `department` | VARCHAR(50) | Department (Sales/Marketing) |
| `priority` | INT | Priority level (1-5) |
| `estimated_amount` | DECIMAL(12,2) | Estimated cost |
| `approved_amount` | DECIMAL(12,2) | Accountant-approved amount |
| `status` | VARCHAR(50) | Workflow state |
| `created_by_user_id` | UUID | Creator's user ID |
| `reviewed_by_user_id` | UUID | Accountant who reviewed |
| `review_notes` | TEXT | Accountant's comments |
| `reviewed_at` | TIMESTAMP | Review timestamp |
| `created_at` | TIMESTAMP | Creation timestamp |
| `updated_at` | TIMESTAMP | Last update timestamp |

**Relationships:**
- `created_by_user_id` → `users.id` (Creator)
- `reviewed_by_user_id` → `users.id` (Reviewer)
- One-to-Many with `claims`

### Table: `claims`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `purchase_request_id` | UUID | Associated request |
| `receipt_file_path` | VARCHAR(500) | Server file path |
| `receipt_file_original_name` | VARCHAR(255) | Original filename |
| `file_hash` | VARCHAR(64) | SHA-256 hash (prevents duplicates) |
| `vendor_name` | VARCHAR(255) | Vendor/merchant name |
| `amount_claimed` | DECIMAL(12,2) | Claimed amount |
| `purchase_date` | DATE | Date of purchase |
| `claim_description` | TEXT | Claim details |
| `uploaded_by_user_id` | UUID | User who uploaded |
| `status` | VARCHAR(50) | PENDING, VERIFIED, REJECTED |
| `verified_by_user_id` | UUID | Accountant who verified |
| `verification_notes` | TEXT | Verification comments |
| `verified_at` | TIMESTAMP | Verification timestamp |
| `uploaded_at` | TIMESTAMP | Upload timestamp |

**Relationships:**
- `purchase_request_id` → `purchase_requests.id`
- `uploaded_by_user_id` → `users.id`
- `verified_by_user_id` → `users.id`

**Constraints:**
- One claim per purchase request (enforced in backend)
- File hash must be unique (prevents same receipt uploaded twice)
- Amount claimed cannot exceed approved amount

### Table: `audit_logs`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | User who performed action |
| `action` | VARCHAR(100) | Action type |
| `entity_type` | VARCHAR(50) | Entity affected |
| `entity_id` | UUID | Entity ID |
| `old_values` | JSONB | Before state |
| `new_values` | JSONB | After state |
| `ip_address` | VARCHAR(45) | User's IP |
| `user_agent` | TEXT | Browser info |
| `timestamp` | TIMESTAMP | Action time |

**Audit Actions:**
- `CREATE_PURCHASE_REQUEST`
- `EDIT_PURCHASE_REQUEST`
- `SUBMIT_PURCHASE_REQUEST`
- `APPROVE_PURCHASE_REQUEST`
- `REJECT_PURCHASE_REQUEST`
- `UPLOAD_CLAIM`
- `EDIT_CLAIM`
- `VERIFY_CLAIM`
- `REJECT_CLAIM`
- `DOWNLOAD_CLAIM_RECEIPT`

---

## 🔐 Security Features

### 1. Authentication & Authorization

**JWT-Based Authentication:**
```typescript
// Login flow
User enters email + password
  ↓
Backend validates credentials
  ↓
Sends OTP to email (6-digit code)
  ↓
User enters OTP
  ↓
Backend validates OTP
  ↓
Issues JWT token (expires in 1 hour)
  ↓
Frontend stores token in localStorage
  ↓
All API requests include: Authorization: Bearer <token>
```

**Role-Based Access Control:**
- Every endpoint protected with `@UseGuards(JwtAuthGuard, RolesGuard)`
- User role extracted from JWT payload
- Permissions checked before any database operation

### 2. File Upload Security

**ClamAV Malware Scanning:**
```typescript
// Upload flow with security
User selects file
  ↓
Frontend validates file size (<10MB)
  ↓
File sent to backend
  ↓
ClamAV scans for malware/viruses
  │
  ├─→ If infected: Reject upload, delete file
  │
  └─→ If clean: Continue processing
        ↓
     Generate SHA-256 hash
        ↓
     Check if hash exists in database
        │
        ├─→ If duplicate: Reject (prevent same receipt twice)
        │
        └─→ If unique: Save file + metadata
```

**File Storage:**
- Location: `/backend/uploads/`
- Naming: `{timestamp}-{randomString}-{originalName}`
- Permissions: Read-only after upload
- Hash index: Fast duplicate detection

### 3. Ownership Validation

**Backend Checks:**
```typescript
// Example: Edit purchase request
if (user.role === 'sales_department' || user.role === 'marketing') {
  if (request.created_by_user_id !== user.id) {
    throw new ForbiddenException('Not your request');
  }
}

// Example: Download claim receipt
if (user.role === 'sales_department' || user.role === 'marketing') {
  if (claim.uploaded_by_user_id !== user.id) {
    throw new ForbiddenException('Not your claim');
  }
}

// Accountants and SuperAdmins bypass ownership checks
```

### 4. OTP Verification

**When Required:**
- Creating purchase request
- Editing purchase request
- Uploading claim
- Editing claim
- Approving/Rejecting requests (accountant)

**OTP Flow:**
```typescript
1. User clicks action (e.g., "Submit Request")
2. Frontend prompts for password
3. Backend validates password
4. Backend generates 6-digit OTP
5. Backend sends OTP to user's email
6. OTP expires in 5 minutes
7. User enters OTP in frontend
8. Backend validates OTP
9. If valid: Perform action
10. OTP is single-use (deleted after validation)
```

### 5. Data Validation

**Input Validation (Backend):**
- All DTOs use `class-validator` decorators
- Type checking with TypeScript
- Length limits on strings
- Numeric range validation
- Required field enforcement

**Example:**
```typescript
export class CreatePurchaseRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsNumber()
  @Min(0.01)
  @Max(999999.99)
  estimated_amount: number;

  @IsEnum(['sales_department', 'marketing'])
  department: string;
}
```

---

## 🎨 Frontend Features

### 1. Purchase Requests Page

**For Sales/Marketing:**
```
┌────────────────────────────────────────────────┐
│  My Purchase Requests                          │
├────────────────────────────────────────────────┤
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Office Supplies                     [✓]  │ │
│  │ APPROVED          Priority: High         │ │
│  │                                          │ │
│  │ Department: Sales                        │ │
│  │ Estimated: $500.00                       │ │
│  │ Approved: $500.00                        │ │
│  │ Created: 12/24/2025                      │ │
│  │                                          │ │
│  │ [Upload Claim]  [1 Claim(s)]            │ │  ← One-click download
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Marketing Campaign                  [📝] │ │
│  │ DRAFT             Priority: Normal       │ │
│  │                                          │ │
│  │ [Edit Request]  [Submit]                 │ │
│  └──────────────────────────────────────────┘ │
│                                                │
│  [+ Create New Request]                       │
└────────────────────────────────────────────────┘
```

**For Accountants:**
```
┌────────────────────────────────────────────────┐
│  All Purchase Requests (Filtered)              │
├────────────────────────────────────────────────┤
│  Status: [All ▼]  Department: [All ▼]         │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Office Supplies                          │ │
│  │ SUBMITTED         Priority: High         │ │
│  │ Requested by: john@example.com           │ │
│  │                                          │ │
│  │ Department: Sales                        │ │
│  │ Estimated: $500.00                       │ │
│  │ Created: 12/24/2025                      │ │
│  │                                          │ │
│  │ [Review]                                 │ │  ← Opens approval modal
│  └──────────────────────────────────────────┘ │
│                                                │
│  ┌──────────────────────────────────────────┐ │
│  │ Marketing Materials                      │ │
│  │ APPROVED          Priority: Normal       │ │
│  │ Approved by: accountant@example.com      │ │
│  │                                          │ │
│  │ [1 Claim(s)] ← Click to download!       │ │
│  └──────────────────────────────────────────┘ │
└────────────────────────────────────────────────┘
```

### 2. Create/Edit Request Modal

```
┌────────────────────────────────────────────┐
│  Create Purchase Request              [×]  │
├────────────────────────────────────────────┤
│                                            │
│  Title *                                   │
│  ┌──────────────────────────────────────┐ │
│  │ Office Supplies                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Description *                             │
│  ┌──────────────────────────────────────┐ │
│  │ Printer paper, ink cartridges, etc.  │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Department *                              │
│  ● Sales Department  ○ Marketing           │
│                                            │
│  Priority *                                │
│  ○ Low  ○ Normal  ● High  ○ Urgent         │
│                                            │
│  Estimated Amount *                        │
│  ┌──────────────────────────────────────┐ │
│  │ $500.00                              │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ─────────────────────────────────────    │
│  OTP Verification                          │
│                                            │
│  Password *                                │
│  ┌──────────────────────────────────────┐ │
│  │ ••••••••                             │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  [Request OTP]                             │
│                                            │
│  Enter OTP from email                      │
│  ┌──────────────────────────────────────┐ │
│  │ 123456                               │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  [Cancel]              [Create Request]    │
└────────────────────────────────────────────┘
```

### 3. Review Request Modal (Accountant)

```
┌────────────────────────────────────────────┐
│  Review Purchase Request              [×]  │
├────────────────────────────────────────────┤
│                                            │
│  Request Details:                          │
│  ─────────────────────────────────────     │
│  Title: Office Supplies                    │
│  Requested by: john@sales.com              │
│  Department: Sales                         │
│  Priority: High                            │
│  Estimated Amount: $500.00                 │
│  Created: 12/24/2025 10:30 AM              │
│                                            │
│  Description:                              │
│  Printer paper, ink cartridges, and        │
│  office supplies for Q1 2026.              │
│                                            │
│  ─────────────────────────────────────     │
│  Your Decision:                            │
│                                            │
│  Status *                                  │
│  ┌──────────────────────────────────────┐ │
│  │ Approve ▼                            │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Approved Amount (if approving) *          │
│  ┌──────────────────────────────────────┐ │
│  │ $500.00                              │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Review Notes                              │
│  ┌──────────────────────────────────────┐ │
│  │ Approved for Q1 budget               │ │
│  │                                      │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  [Cancel]                    [Submit]      │
└────────────────────────────────────────────┘
```

### 4. Upload Claim Modal

```
┌────────────────────────────────────────────┐
│  Upload Receipt & Submit Claim        [×]  │
├────────────────────────────────────────────┤
│                                            │
│  📄 Security Notice                        │
│  All files are scanned for malware.       │
│  No duplicate receipts allowed.            │
│  Maximum file size: 10MB                   │
│                                            │
│  Receipt File *                            │
│  ┌──────────────────────────────────────┐ │
│  │ [Choose File] receipt.pdf   [📎]     │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Vendor Name *                             │
│  ┌──────────────────────────────────────┐ │
│  │ Office Depot                         │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Amount *                                  │
│  ┌──────────────────────────────────────┐ │
│  │ $485.00                              │ │
│  └──────────────────────────────────────┘ │
│  ⚠️ Cannot exceed approved: $500.00        │
│                                            │
│  Purchase Date *                           │
│  ┌──────────────────────────────────────┐ │
│  │ 2025-12-24                           │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  Description                               │
│  ┌──────────────────────────────────────┐ │
│  │ Purchased office supplies as         │ │
│  │ approved                             │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ─────────────────────────────────────    │
│  OTP Verification                          │
│                                            │
│  [Request OTP]                             │
│                                            │
│  🔍 Scanning file for malware...           │
│                                            │
│  [Cancel]           [🔍 Scanning & Upload] │
└────────────────────────────────────────────┘
```

### 5. View Claims Modal (Accountant)

```
┌────────────────────────────────────────────┐
│  Claims for: Office Supplies          [×]  │
├────────────────────────────────────────────┤
│                                            │
│  Claim #1                                  │
│  ┌──────────────────────────────────────┐ │
│  │  Status: ✅ VERIFIED                 │ │
│  │  ─────────────────────────────────   │ │
│  │  Vendor: Office Depot                │ │
│  │  Amount: $485.00                     │ │
│  │  Purchase Date: 12/24/2025           │ │
│  │  Uploaded by: john@sales.com         │ │
│  │  Uploaded: 12/25/2025 2:30 PM        │ │
│  │                                      │ │
│  │  Description:                        │ │
│  │  Purchased office supplies as        │ │
│  │  approved in original request.       │ │
│  │                                      │ │
│  │  Verified by: accountant@company.com │ │
│  │  Verified: 12/26/2025 9:00 AM        │ │
│  │  Notes: Amount matches receipt.      │ │
│  │                                      │ │
│  │  Receipt: receipt.pdf                │ │
│  │  [Download Receipt] ← One-click!     │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  [Close]                                   │
└────────────────────────────────────────────┘
```

---

## 🔌 API Endpoints

### Purchase Requests

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/purchase-requests` | List requests | ✅ | All (filtered by role) |
| GET | `/purchase-requests/:id` | Get one request | ✅ | All (ownership check) |
| POST | `/purchase-requests` | Create request | ✅ | Sales, Marketing, SuperAdmin |
| PUT | `/purchase-requests/:id/edit` | Edit request | ✅ | Creator (if DRAFT/SUBMITTED) |
| POST | `/purchase-requests/request-otp/edit-purchase-request` | Request OTP for edit | ✅ | All |
| POST | `/purchase-requests/:id/approve` | Approve request | ✅ | Accountant, SuperAdmin |
| POST | `/purchase-requests/:id/reject` | Reject request | ✅ | Accountant, SuperAdmin |

### Claims

| Method | Endpoint | Description | Auth | Roles |
|--------|----------|-------------|------|-------|
| GET | `/purchase-requests/claims/:id` | Get claim details | ✅ | All (ownership check) |
| POST | `/purchase-requests/claims/upload` | Upload claim | ✅ | Sales, Marketing (for own PR) |
| GET | `/purchase-requests/claims/:id/download` | Download receipt | ✅ | Accountant, SuperAdmin, Creator |
| PUT | `/purchase-requests/claims/:id/edit` | Edit claim | ✅ | Uploader (if PENDING) |
| POST | `/purchase-requests/request-otp/edit-claim` | Request OTP for edit | ✅ | All |
| POST | `/purchase-requests/claims/:id/verify` | Verify claim | ✅ | Accountant, SuperAdmin |
| POST | `/purchase-requests/claims/:id/reject` | Reject claim | ✅ | Accountant, SuperAdmin |

### OTP

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/purchase-requests/request-otp/create-purchase-request` | Request OTP for creation | ✅ |
| POST | `/purchase-requests/request-otp/edit-purchase-request` | Request OTP for edit | ✅ |
| POST | `/purchase-requests/request-otp/upload-claim` | Request OTP for claim upload | ✅ |
| POST | `/purchase-requests/request-otp/edit-claim` | Request OTP for claim edit | ✅ |

---

## 📁 File Structure

```
fyp_system/
├── backend/
│   ├── src/
│   │   ├── purchase-requests/
│   │   │   ├── purchase-request.entity.ts      # Database entity
│   │   │   ├── claim.entity.ts                 # Claim entity
│   │   │   ├── purchase-request.service.ts     # Business logic
│   │   │   ├── purchase-request.controller.ts  # API endpoints
│   │   │   ├── dto/
│   │   │   │   ├── create-purchase-request.dto.ts
│   │   │   │   ├── edit-purchase-request.dto.ts
│   │   │   │   ├── upload-claim.dto.ts
│   │   │   │   ├── edit-claim.dto.ts
│   │   │   │   └── review-purchase-request.dto.ts
│   │   │   └── purchase-request.module.ts
│   │   ├── auth/
│   │   │   ├── auth.service.ts                 # Authentication logic
│   │   │   ├── jwt.strategy.ts                 # JWT validation
│   │   │   └── roles.guard.ts                  # RBAC guard
│   │   ├── audit/
│   │   │   └── audit.service.ts                # Audit logging
│   │   ├── clamav/
│   │   │   └── clamav.service.ts               # Malware scanning
│   │   └── main.ts                             # Application entry
│   ├── uploads/                                # Uploaded files
│   └── package.json
│
├── frontend/
│   ├── app/
│   │   ├── purchase-requests/
│   │   │   └── page.tsx                        # Main PR page (1500+ lines)
│   │   ├── api/
│   │   │   └── [...path]/
│   │   │       └── route.ts                    # Next.js API proxy
│   │   └── layout.tsx
│   ├── lib/
│   │   └── api.ts                              # Axios instance
│   ├── context/
│   │   └── AuthContext.tsx                     # Auth state management
│   └── package.json
│
└── ecosystem.config.js                          # PM2 configuration
```

---

## 🎯 Key Features Summary

### ✅ Implemented Features

1. **Complete Workflow Management**
   - Create → Submit → Review → Approve/Reject
   - Multiple status states (DRAFT, SUBMITTED, APPROVED, REJECTED, etc.)
   - Edit capabilities for appropriate states

2. **Claims Management**
   - Upload receipts with file validation
   - One claim per purchase request
   - Amount validation (cannot exceed approved amount)
   - Download receipts (one-click from badge for accountants)

3. **Security**
   - JWT authentication with OTP verification
   - Role-based access control (RBAC)
   - ClamAV malware scanning
   - SHA-256 file hashing (prevents duplicate uploads)
   - Ownership validation
   - Complete audit logging

4. **File Management**
   - Binary file download support
   - Original filename preservation
   - Duplicate prevention via hashing
   - 10MB file size limit
   - Supported formats: PDF, images, documents

5. **User Experience**
   - Responsive design
   - Real-time status updates
   - Color-coded status badges
   - Inline error messages
   - Loading states
   - Success/error notifications

6. **Audit & Compliance**
   - All actions logged
   - Before/after values tracked
   - IP address and user agent captured
   - Timestamp for every action
   - Accountant review notes
   - Download tracking

---

## 🚀 Deployment Information

**Production Environment:**
- Server: AWS EC2 (Ubuntu)
- Domain: (your domain)
- Backend: `http://your-domain:3000`
- Frontend: `http://your-domain:3001`
- Process Manager: PM2
- Database: PostgreSQL (local)
- File Storage: `/home/ubuntu/fyp_system/backend/uploads/`

**Deployment Commands:**
```bash
# Pull latest changes
cd /home/ubuntu/fyp_system
git pull origin main

# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build

# Restart services
cd ..
pm2 restart ecosystem.config.js

# Check status
pm2 status
pm2 logs
```

---

## 📈 System Metrics

**Database:**
- Tables: 4 (purchase_requests, claims, users, audit_logs)
- Indexes: 8 (optimized for queries)
- Relations: 6 foreign keys

**Code:**
- Backend: ~5,000 lines (TypeScript)
- Frontend: ~2,000 lines (TypeScript/React)
- Total: ~7,000 lines of code

**API:**
- Endpoints: 20+
- Authentication: JWT + OTP
- Security: Guards on all endpoints

---

## 🔧 Maintenance & Support

**Regular Tasks:**
- Monitor PM2 processes: `pm2 status`
- Check logs: `pm2 logs`
- Database backup: (schedule daily)
- Audit log review: Weekly
- Update dependencies: Monthly

**Common Issues & Solutions:**
- Backend crashed: `pm2 restart backend`
- Frontend not loading: `cd frontend && npm run build && pm2 restart frontend`
- File upload fails: Check ClamAV status: `systemctl status clamav-daemon`
- Database connection: Check PostgreSQL: `systemctl status postgresql`

---

## 📚 Additional Documentation

- **[ACCOUNTANT_ONECLICK_DOWNLOAD.md](ACCOUNTANT_ONECLICK_DOWNLOAD.md)** - One-click download feature
- **[CRITICAL_FIX_FILE_DOWNLOADS.md](CRITICAL_FIX_FILE_DOWNLOADS.md)** - Binary file download fix
- **[SENIOR_REVIEW_FILE_DOWNLOAD_FIX.md](SENIOR_REVIEW_FILE_DOWNLOAD_FIX.md)** - Complete security review
- **[FEATURE_EDIT_REQUESTS_AND_CLAIMS.md](FEATURE_EDIT_REQUESTS_AND_CLAIMS.md)** - Edit functionality
- **[CLAIMS_DOWNLOAD_FEATURE.md](CLAIMS_DOWNLOAD_FEATURE.md)** - Claims download implementation

---

## 🎓 Training Resources

**For Sales/Marketing:**
1. How to create a purchase request
2. How to upload a claim with receipt
3. How to track request status
4. Understanding approval workflow

**For Accountants:**
1. How to review purchase requests
2. How to approve/reject with notes
3. How to download and verify receipts (one-click!)
4. How to verify claims
5. Viewing audit trails

**For Administrators:**
1. System architecture overview
2. Database schema understanding
3. Security features and best practices
4. Deployment and maintenance
5. Troubleshooting common issues

---

## ✅ System Status: PRODUCTION READY

The Purchase Request System is fully functional, secure, and deployed in production. All features are tested and documented.

**Last Updated:** December 30, 2025
**Version:** 1.0.0
**Status:** ✅ Production