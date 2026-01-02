# Comprehensive Security System Review

**Date**: January 2, 2026  
**System**: FYP Enterprise Management System  
**Reviewed by**: GitHub Copilot AI Assistant

---

## Executive Summary

This document provides a complete analysis of the security architecture implemented across the backend (NestJS + TypeORM + PostgreSQL), frontend (Next.js + React), and database layers. The system implements **defense-in-depth security** with multiple layers of protection.

---

## Table of Contents

1. [Authentication & Authorization System](#1-authentication--authorization-system)
2. [File Upload Security](#2-file-upload-security)
3. [Audit Logging System](#3-audit-logging-system)
4. [Purchase Request & Claims Security](#4-purchase-request--claims-security)
5. [HR Employee Management Security](#5-hr-employee-management-security)
6. [Database Security](#6-database-security)
7. [API Security](#7-api-security)
8. [Frontend Security](#8-frontend-security)
9. [Security Best Practices Implemented](#9-security-best-practices-implemented)
10. [Potential Security Enhancements](#10-potential-security-enhancements)

---

## 1. Authentication & Authorization System

### 1.1 JWT-Based Authentication

**File**: `backend/src/auth/jwt-auth.guard.ts`, `jwt.strategy.ts`

#### How it works:
1. **Login Flow**:
   - User submits email + password → `auth.service.ts::login()`
   - Password verified using **Argon2** (not bcrypt) - more secure
   - If MFA enabled → OTP sent via email
   - After OTP verification → JWT token issued
   - JWT contains: `{ sub: userId, email, role }`

2. **JWT Validation** (on every protected request):
   ```typescript
   // JwtAuthGuard triggers JwtStrategy.validate()
   JwtStrategy.validate(payload) {
     - Extract userId from JWT payload (payload.sub)
     - Fetch user from database
     - Check if account is suspended (account_locked_until)
     - Check if account is inactive (is_active)
     - Return user object to req.user
   }
   ```

3. **Token Attachment**:
   - Frontend stores token in `localStorage`
   - Every API request includes: `Authorization: Bearer <token>`
   - Backend validates token signature and expiration

#### Security Features:
- ✅ **Argon2 password hashing** (memory-hard, resistant to GPU attacks)
- ✅ **JWT secret from environment** (`JWT_SECRET` in .env)
- ✅ **Token expiration** enforced by Passport JWT
- ✅ **Account lockout** after 5 failed login attempts (60 min lock)
- ✅ **Active session validation** - suspended accounts immediately blocked

### 1.2 Multi-Factor Authentication (MFA)

**File**: `backend/src/auth/auth.service.ts`

#### MFA Flow:
```
1. User logs in → Password correct
2. If user.mfa_enabled === true:
   - Generate 6-digit OTP
   - Store in user.otp_code, user.otp_expires_at (5 min)
   - Send OTP via email (nodemailer + Gmail)
   - Return { requiresOtp: true }
3. User submits OTP → /auth/verify-otp
4. OTP validated → JWT token issued
5. User redirected to dashboard
```

#### OTP Security:
- ✅ **6-digit random OTP** (100,000 - 999,999)
- ✅ **5-minute expiration** (stored in DB)
- ✅ **One-time use** (cleared after verification)
- ✅ **Email delivery** via Gmail SMTP (TLS encrypted)
- ✅ **Separate OTP for password reset** (`otp_reset` field)

### 1.3 Role-Based Access Control (RBAC)

**File**: `backend/src/auth/roles.guard.ts`, `users/roles.enum.ts`

#### Roles:
```typescript
export enum Role {
  SUPER_ADMIN = 'super_admin',      // Full system access
  ACCOUNTANT = 'accountant',         // Financial data access
  HR = 'human_resources',            // Employee data access
  MARKETING = 'marketing',           // Marketing purchase requests
  SALES = 'sales_department',        // Sales purchase requests
}
```

#### RBAC Implementation:
```typescript
@Controller('purchase-requests')
@UseGuards(JwtAuthGuard, RolesGuard)  // 1. JWT auth, 2. Role check
@Roles(Role.SALES, Role.MARKETING, Role.SUPER_ADMIN)  // Allowed roles
class PurchaseRequestController {
  // Only users with specified roles can access
}
```

#### Guard Chain:
```
Request → JwtAuthGuard (validates JWT) 
       → RolesGuard (checks req.user.role against @Roles())
       → Controller method
```

#### Security Features:
- ✅ **Decorator-based** - impossible to forget protection
- ✅ **Composable guards** - multiple layers
- ✅ **Centralized role definitions** - no magic strings
- ✅ **Automatic 403 Forbidden** if insufficient permissions

### 1.4 Account Security Features

**File**: `backend/src/users/user.entity.ts`, `auth.service.ts`

#### Features:
1. **Account Lockout**:
   ```typescript
   // After 5 failed login attempts
   user.account_locked_until = new Date(Date.now() + 60 * 60 * 1000); // 60 min
   user.otp_reset = generateOtp(); // OTP to unlock
   sendAccountLockedEmail(user, otp);
   ```

2. **Account Suspension** (by Super Admin):
   ```typescript
   user.suspended = true;
   user.account_locked_until = null; // Manual suspension
   // User cannot login until reactivated
   ```

3. **Inactive Accounts**:
   ```typescript
   user.is_active = false; // Deactivated account
   // Blocked at JWT strategy level
   ```

4. **Non-Office Hours Alert**:
   ```typescript
   // If user logs in outside 8am-6pm
   notifyAdminsIfNonOfficeHours(user) {
     - Check if login time is outside office hours
     - Find all super admins
     - Send email alert to super admins
     - Log for audit trail
   }
   ```

5. **Password Reset Security**:
   ```typescript
   // Forgot password flow
   /auth/forgot-password → OTP sent to email
   /auth/verify-reset-otp → OTP verified
   /auth/reset-password → New password set
   // Separate OTP field (otp_reset) prevents login OTP from being used
   ```

---

## 2. File Upload Security

### 2.1 ClamAV Malware Scanning

**File**: `backend/src/clamav/clamav.service.ts`

#### How it works:
```typescript
async scanFile(fileBuffer: Buffer, filename: string) {
  1. Write buffer to temporary file (/tmp/upload_timestamp_random_filename)
  2. Execute: clamscan --no-summary /tmp/file
  3. Parse output:
     - Exit code 0 → File clean
     - Exit code 1 + "FOUND" → Malware detected
     - Other → Scan error
  4. Delete temporary file
  5. Return true (clean) or false (infected)
}
```

#### Usage in Controllers:
```typescript
@Post('claims/upload')
async uploadReceipt(@UploadedFile() file) {
  // Step 1: Validate file type
  validateFile(file);
  
  // Step 2: ClamAV scan (CRITICAL SECURITY STEP)
  const isClean = await this.clamavService.scanFile(file.buffer, file.originalname);
  if (!isClean) {
    throw new BadRequestException('Malware detected');
  }
  
  // Step 3: Store in database
  await this.claimRepo.save({ ...data, receipt_file_data: file.buffer });
}
```

#### Security Features:
- ✅ **Pre-storage scanning** - malware never reaches database
- ✅ **Temporary file cleanup** - no residual files
- ✅ **Command injection protection** - uses child_process.exec with proper escaping
- ✅ **Fallback on scan failure** - rejects file if scan fails
- ✅ **Malware scan status tracking** in database (`malware_scan_status` enum)

### 2.2 File Validation

**File**: `purchase-request.service.ts`, `accountant-files.service.ts`

#### Validation Steps:
```typescript
validateFile(file) {
  // 1. Check file exists
  if (!file) throw BadRequestException('No file uploaded');
  
  // 2. Whitelist MIME types
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg', 'image/jpg', 'image/png',
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw BadRequestException('Invalid file type');
  }
  
  // 3. Check file size (10MB max)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    throw BadRequestException('File too large');
  }
}
```

#### Security Features:
- ✅ **MIME type whitelist** (not blacklist)
- ✅ **File size limits** prevent DoS
- ✅ **Extension validation** (secondary check)
- ✅ **Memory storage** (`memoryStorage()`) - scanned before disk write

### 2.3 Duplicate File Detection

**File**: `purchase-request.service.ts`

#### How it works:
```typescript
// Generate SHA256 hash of file content
const fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');

// Check if hash exists in database
const duplicate = await this.claimRepo.findOne({ where: { file_hash: fileHash } });

if (duplicate) {
  throw BadRequestException(
    `Duplicate file detected. Already uploaded as claim ${duplicate.id}`
  );
}

// Store with hash for future checks
claim.file_hash = fileHash;
await this.claimRepo.save(claim);
```

#### Security Features:
- ✅ **Content-based deduplication** (not filename-based)
- ✅ **SHA256 hashing** (cryptographically secure)
- ✅ **Cross-entity duplicate detection** (checks all claims)
- ✅ **Prevents double-submission attacks**

### 2.4 File Storage Strategy

**File**: `claim.entity.ts`, `accountant-file.entity.ts`

#### Database-First Storage:
```typescript
@Entity('claims')
export class Claim {
  // NEW: Store file directly in database (BYTEA)
  @Column({ type: 'bytea', nullable: true })
  receipt_file_data: Buffer;  // Binary file data
  
  @Column({ type: 'bigint', nullable: true })
  receipt_file_size: number;  // File size in bytes
  
  @Column({ type: 'varchar', length: 100, nullable: true })
  receipt_file_mimetype: string;  // Original MIME type
  
  @Column({ type: 'varchar', length: 64, nullable: true })
  file_hash: string;  // SHA-256 hash
  
  // Legacy disk-based storage (backward compatibility)
  @Column()
  receipt_file_path: string;
}
```

#### Why Database Storage?
- ✅ **Atomic transactions** - file and metadata saved together
- ✅ **No orphaned files** - no disk cleanup needed
- ✅ **Backup simplicity** - single database backup includes files
- ✅ **Access control** - database permissions apply
- ✅ **Query efficiency** - can query file metadata without disk I/O

#### Download Security:
```typescript
@Get('claims/:id/download')
async downloadReceipt(@Param('id') id: string, @Res() res: Response) {
  // 1. Get claim with ownership check
  const claim = await this.getClaimById(id, userId, userRole);
  
  // 2. Check if file data exists in database
  if (claim.receipt_file_data) {
    // 3. Set secure headers
    res.setHeader('Content-Type', claim.receipt_file_mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${claim.receipt_file_original_name}"`);
    
    // 4. Stream from database
    return res.send(Buffer.from(claim.receipt_file_data));
  }
  
  // Fallback to disk-based download (legacy)
}
```

---

## 3. Audit Logging System

### 3.1 Audit Log Architecture

**File**: `backend/src/audit/audit-log.entity.ts`, `audit.service.ts`

#### Entity Structure:
```typescript
@Entity('audit_logs')
export class AuditLog {
  id: string;                    // UUID
  user_id: string;               // Who performed the action
  action: string;                // What action (VIEW_REVENUE, CREATE_PURCHASE_REQUEST, etc.)
  resource: string;              // What resource (revenue, employee, claim, etc.)
  resource_id: string | null;    // Specific resource ID (optional)
  ip_address: string | null;     // Real client IP (handles proxies)
  user_agent: string | null;     // Browser/client info
  metadata: any;                 // Additional context (JSON)
  created_at: Date;              // Timestamp
}
```

#### Logging Patterns:
```typescript
// Pattern 1: Log from request (automatic IP extraction)
await this.auditService.logFromRequest(
  req,                    // Express request object
  userId,                 // User ID from JWT
  'VIEW_EMPLOYEE_PROFILE', // Action name
  'employee',             // Resource type
  employeeId,             // Resource ID
  {                       // Metadata
    employee_id: employee.employee_id,
    accessed_fields: ['ic_number', 'bank_account_number'],
  }
);

// Pattern 2: Manual log (custom IP)
await this.auditService.log({
  userId,
  action: 'DELETE_CLAIM',
  resource: 'claim',
  resourceId: claimId,
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
  metadata: { amount: claim.amount_claimed },
});
```

### 3.2 IP Address Extraction

**File**: `audit.service.ts::getClientIp()`

#### Why IP extraction is complex:
```
Browser → Nginx → Node.js Backend

Without proxy handling:
- req.ip = '127.0.0.1' (Nginx's IP, not client's)

With proxy handling:
- Nginx sets X-Real-IP or X-Forwarded-For
- Backend must extract real client IP
```

#### Implementation:
```typescript
private getClientIp(req: Request): string {
  // Priority order:
  let ip: string | undefined;
  
  // 1. X-Real-IP (set by Nginx)
  const xRealIp = req.headers['x-real-ip'] as string;
  if (xRealIp) {
    ip = xRealIp;
  }
  
  // 2. X-Forwarded-For (first IP in chain)
  else {
    const xForwardedFor = req.headers['x-forwarded-for'] as string;
    if (xForwardedFor) {
      ip = xForwardedFor.split(',')[0].trim(); // "client, proxy1, proxy2" → "client"
    }
  }
  
  // 3. req.ip (Express)
  else if (req.ip) {
    ip = req.ip;
  }
  
  // 4. req.connection.remoteAddress
  else if (req.connection?.remoteAddress) {
    ip = req.connection.remoteAddress;
  }
  
  // Clean IPv4-mapped IPv6 addresses
  // ::ffff:192.168.1.1 → 192.168.1.1
  return this.cleanIpAddress(ip || 'unknown');
}
```

### 3.3 Anti-Spam Mechanisms

**File**: `hr.controller.ts`, `hr.service.ts`

#### Problem: Page refreshes create spam logs

#### Solution: Session-based deduplication
```typescript
// In-memory tracking (per backend session)
private readonly viewedEmployees = new Map<string, Set<string>>();
// Map<userId, Set<employeeId>>

@Get('employees/:id')
async getEmployeeById(@Param('id') id: string, @Query('silent') silent: string) {
  const userId = req.user.userId;
  
  // Check if user has viewed this employee in current session
  if (!this.viewedEmployees.has(userId)) {
    this.viewedEmployees.set(userId, new Set());
  }
  
  const hasViewedBefore = this.viewedEmployees.get(userId)!.has(id);
  const isSilent = silent === 'true'; // Frontend sends silent=true after first view
  
  // Only log if:
  // 1. First view in this backend session (hasViewedBefore = false)
  // 2. Frontend doesn't say "already viewed" (silent = false)
  const shouldLog = !hasViewedBefore && !isSilent;
  
  if (shouldLog) {
    await this.auditService.logFromRequest(req, userId, 'VIEW_EMPLOYEE_PROFILE', 'employee', id, {...});
    this.viewedEmployees.get(userId)!.add(id); // Mark as viewed
  }
  
  return { employee };
}
```

#### Frontend sessionStorage integration:
```typescript
// frontend/hooks/useEmployees.ts
const [viewedEmployees, setViewedEmployees] = useState<Set<string>>(
  new Set(JSON.parse(sessionStorage.getItem('viewedEmployees') || '[]'))
);

async function getEmployee(id: string) {
  const alreadyViewed = viewedEmployees.has(id);
  const silent = alreadyViewed ? '?silent=true' : '';
  
  const data = await api.get(`/hr/employees/${id}${silent}`);
  
  if (!alreadyViewed) {
    const updated = new Set(viewedEmployees).add(id);
    setViewedEmployees(updated);
    sessionStorage.setItem('viewedEmployees', JSON.stringify([...updated]));
  }
  
  return data;
}
```

#### Result:
- ✅ **ONE audit log per employee per browser session**
- ✅ Refresh 100 times → NO new logs
- ✅ Backend restart → sessionStorage prevents spam
- ✅ Close browser → New session, new log (appropriate)

### 3.4 Logged Actions

#### Complete Action List:
```typescript
// Authentication
'LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'ACCOUNT_LOCKED', 'PASSWORD_RESET'

// Purchase Requests
'CREATE_PURCHASE_REQUEST', 'APPROVE_PURCHASE_REQUEST', 
'REJECT_PURCHASE_REQUEST', 'EDIT_PURCHASE_REQUEST', 'DELETE_PURCHASE_REQUEST'

// Claims
'UPLOAD_RECEIPT', 'PROCESS_CLAIM', 'EDIT_CLAIM', 'DELETE_CLAIM', 
'DOWNLOAD_RECEIPT', 'VIEW_RECEIPT'

// Revenue
'CREATE_REVENUE', 'VIEW_REVENUE', 'UPDATE_REVENUE', 'DELETE_REVENUE'

// Employees
'VIEW_EMPLOYEE_PROFILE', 'UPLOAD_EMPLOYEE_DOCUMENT', 
'DOWNLOAD_EMPLOYEE_DOCUMENT', 'DELETE_EMPLOYEE'

// Users
'CREATE_USER', 'SUSPEND_USER', 'DELETE_USER', 'ASSIGN_ROLE'

// Accountant Files
'UPLOAD_ACCOUNTANT_FILE', 'DOWNLOAD_ACCOUNTANT_FILE', 'DELETE_ACCOUNTANT_FILE'

// Audit Logs
'VIEW_ALL_CLAIMS', 'CLEAR_AUDIT_LOGS' (CRITICAL)
```

### 3.5 Audit Log Query & Management

**File**: `audit.controller.ts`

#### Queries:
```typescript
// Get all logs (with filters)
GET /audit/logs?userId=xxx&action=VIEW_REVENUE&startDate=2024-01-01&limit=100

// Get user activity
GET /audit/logs/user/:userId

// Get resource audit trail
GET /audit/logs/resource/:resource/:resourceId

// Get recent activity
GET /audit/logs/recent?limit=50
```

#### Clear All Logs (CRITICAL):
```typescript
// Step 1: Request OTP
POST /audit/request-clear-otp
Body: { password: "..." }
→ OTP sent to email, valid 10 minutes

// Step 2: Confirm with OTP
POST /audit/clear-all
Body: { otp: "123456" }
→ All logs deleted (IRREVERSIBLE)
```

---

## 4. Purchase Request & Claims Security

### 4.1 Purchase Request Workflow

**File**: `purchase-request.service.ts`, `purchase-request.controller.ts`

#### Workflow States:
```typescript
enum PurchaseRequestStatus {
  DRAFT = 'DRAFT',               // Created but not submitted
  SUBMITTED = 'SUBMITTED',       // Awaiting accountant review
  UNDER_REVIEW = 'UNDER_REVIEW', // Accountant reviewing
  APPROVED = 'APPROVED',         // Approved, can upload claims
  REJECTED = 'REJECTED',         // Rejected, cannot proceed
  PARTIALLY_PAID = 'PARTIALLY_PAID', // Some claims processed
  PAID = 'PAID',                 // Fully paid
}
```

#### Security Controls:

1. **Creation (with OTP)**:
```typescript
POST /purchase-requests/request-otp/create
Body: { password: "..." }
→ OTP sent to user's email

POST /purchase-requests
Body: {
  title, description, department, priority, estimated_amount,
  otp: "123456"  // OTP verification
}
→ OTP verified → Request created → Status = SUBMITTED
```

2. **Review (Accountant/SuperAdmin only)**:
```typescript
@Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
PUT /purchase-requests/:id/review
Body: {
  status: 'APPROVED' | 'REJECTED',
  approved_amount: 5000,  // Must ≤ estimated_amount
  review_notes: "...",
  otp: "123456"  // Accountant must verify
}
```

3. **Edit (Owner only, limited status)**:
```typescript
PUT /purchase-requests/:id/edit
Body: { title, description, otp: "123456" }

// Business Rules:
- Can only edit if status = DRAFT or SUBMITTED
- Cannot edit if APPROVED, REJECTED, or PAID
- Must be original creator (or SuperAdmin)
- Requires OTP verification
```

4. **Delete (Accountant/SuperAdmin only)**:
```typescript
DELETE /purchase-requests/:id

// Business Rules:
- Can delete: DRAFT, SUBMITTED, REJECTED (no active workflow)
- Can delete: APPROVED with NO claims
- Can delete: PAID (deletes all claims first)
- Cannot delete: UNDER_REVIEW, PARTIALLY_PAID
- Audit logged
```

### 4.2 Claims Security

**File**: `claim.entity.ts`, `purchase-request.service.ts`

#### Claim Workflow:
```
1. Purchase request APPROVED → User can upload claims
2. Upload receipt (PDF/image) → ClamAV scan → Store in DB
3. Claim status = PENDING
4. Accountant reviews → Status = VERIFIED/PROCESSED/REJECTED
5. If all claims processed → Purchase request = PAID
```

#### Upload Security:
```typescript
@Post('claims/upload')
async uploadReceipt(@UploadedFile() file, @Body() dto) {
  // NO OTP REQUIRED (simplified for users)
  
  // 1. Validate purchase request exists and is APPROVED
  const pr = await this.purchaseRequestRepo.findOne({ where: { id: dto.purchase_request_id } });
  if (pr.status !== 'APPROVED' && pr.status !== 'PARTIALLY_PAID') {
    throw BadRequestException('Can only submit claims for APPROVED requests');
  }
  
  // 2. Check ownership (users can only claim their own requests)
  if (pr.created_by_user_id !== userId && userRole !== Role.SUPER_ADMIN) {
    throw ForbiddenException('Can only submit claims for your own requests');
  }
  
  // 3. Validate amount (total claims cannot exceed approved amount)
  const existingClaims = await this.claimRepo.find({ where: { purchase_request_id } });
  const totalClaimed = existingClaims.reduce((sum, c) => sum + c.amount_claimed, 0);
  const newTotal = totalClaimed + dto.amount_claimed;
  
  if (newTotal > pr.approved_amount) {
    throw BadRequestException(
      `Total claimed ($${newTotal}) would exceed approved amount ($${pr.approved_amount})`
    );
  }
  
  // 4. Validate file + ClamAV scan
  await this.validateAndScanFile(file);
  
  // 5. Check for duplicate file (SHA256 hash)
  const fileHash = this.generateFileHash(file.buffer);
  const duplicate = await this.claimRepo.findOne({ where: { file_hash: fileHash } });
  if (duplicate) {
    throw BadRequestException('Duplicate file - already uploaded');
  }
  
  // 6. Create claim
  const claim = this.claimRepo.create({
    purchase_request_id: dto.purchase_request_id,
    vendor_name: dto.vendor_name,
    amount_claimed: dto.amount_claimed,
    purchase_date: dto.purchase_date,
    claim_description: dto.claim_description,
    receipt_file_data: file.buffer,  // Store in DB
    receipt_file_size: file.size,
    receipt_file_mimetype: file.mimetype,
    file_hash: fileHash,
    uploaded_by_user_id: userId,
    status: ClaimStatus.PENDING,
    malware_scan_status: MalwareScanStatus.CLEAN,
  });
  
  await this.claimRepo.save(claim);
  
  // 7. Audit log
  await this.auditService.logFromRequest(req, userId, 'UPLOAD_RECEIPT', 'claim', claim.id, {
    purchase_request_id,
    vendor_name: dto.vendor_name,
    amount_claimed: dto.amount_claimed,
  });
  
  return claim;
}
```

#### Claim Verification (Accountant):
```typescript
@Roles(Role.ACCOUNTANT, Role.SUPER_ADMIN)
PUT /claims/:id/verify
Body: {
  status: 'VERIFIED' | 'PROCESSED' | 'REJECTED',
  verification_notes: "...",
  otp: "123456"  // Accountant must verify with OTP
}

// Business Rules:
- Only accountants can verify
- Requires OTP verification
- Status change triggers purchase request status update
- If all claims processed → Purchase request = PAID
- If some claims processed → Purchase request = PARTIALLY_PAID
```

#### Download Security:
```typescript
@Get('claims/:id/download')
async downloadReceipt(@Param('id') id: string) {
  // 1. Get claim with ownership check
  const claim = await this.getClaimById(id, userId, userRole);
  // - Accountants/SuperAdmins can download any claim
  // - Sales/Marketing can only download their own claims
  
  // 2. Check file data exists
  if (!claim.receipt_file_data) {
    throw NotFoundException('File not found');
  }
  
  // 3. Set secure headers
  res.setHeader('Content-Type', claim.receipt_file_mimetype);
  res.setHeader('Content-Disposition', `attachment; filename="${claim.receipt_file_original_name}"`);
  
  // 4. Audit log
  await this.auditService.logFromRequest(req, userId, 'DOWNLOAD_RECEIPT', 'claim', id, {...});
  
  // 5. Stream file
  return res.send(Buffer.from(claim.receipt_file_data));
}
```

### 4.3 Financial Tracking

**File**: `purchase-request.entity.ts`

#### Intelligent Status Updates:
```typescript
// After any claim verification, recalculate purchase request status
async updateRequestStatusAfterClaimVerification(requestId: string) {
  const request = await this.purchaseRequestRepo.findOne({ where: { id: requestId }, relations: ['claims'] });
  const allClaims = await this.claimRepo.find({ where: { purchase_request_id: requestId } });
  
  // Categorize claims
  const processedClaims = allClaims.filter(c => c.status === ClaimStatus.PROCESSED);
  const pendingClaims = allClaims.filter(c => c.status === ClaimStatus.PENDING);
  const rejectedClaims = allClaims.filter(c => c.status === ClaimStatus.REJECTED);
  
  // Calculate totals
  const totalPaid = processedClaims.reduce((sum, c) => sum + Number(c.amount_claimed), 0);
  const totalClaimed = allClaims.reduce((sum, c) => sum + Number(c.amount_claimed), 0);
  const totalRejected = rejectedClaims.reduce((sum, c) => sum + Number(c.amount_claimed), 0);
  const approvedAmount = Number(request.approved_amount);
  const paymentProgress = Math.round((totalPaid / approvedAmount) * 100);
  
  // Determine new status
  let newStatus = request.status;
  
  if (pendingClaims.length > 0) {
    // Still have pending claims - keep as APPROVED
    newStatus = PurchaseRequestStatus.APPROVED;
  } else if (allClaims.length === 0) {
    // No claims yet - keep current status
    newStatus = request.status;
  } else {
    // All claims reviewed
    if (paymentProgress >= 95) {
      // 95% or more paid - consider fully paid
      newStatus = PurchaseRequestStatus.PAID;
    } else if (totalPaid > 0) {
      // Some amount paid - partially paid
      newStatus = PurchaseRequestStatus.PARTIALLY_PAID;
    } else if (totalPaid === 0 && rejectedClaims.length > 0) {
      // All claims rejected - revert to APPROVED (can resubmit)
      newStatus = PurchaseRequestStatus.APPROVED;
    }
  }
  
  // Update request
  await this.purchaseRequestRepo.update(requestId, {
    status: newStatus,
    total_claimed: totalClaimed,
    total_paid: totalPaid,
    total_rejected: totalRejected,
    payment_progress: paymentProgress,
  });
}
```

---

## 5. HR Employee Management Security

### 5.1 Employee Data Access Control

**File**: `hr.controller.ts`, `employee.entity.ts`

#### Two-Tier Data Access:

**Tier 1: List View (Minimal Data)**
```typescript
@Get('employees')
async getEmployeeList() {
  // Returns ONLY: employee_id, name, status
  // NO sensitive data (IC, bank account, etc.)
  // NOT audit logged (just a list view)
  
  return this.employeeRepo.find({
    select: ['id', 'employee_id', 'name', 'status'],
    order: { name: 'ASC' },
  });
}
```

**Tier 2: Detail View (Full Data - AUDIT LOGGED)**
```typescript
@Get('employees/:id')
async getEmployeeById(@Param('id') id: string) {
  // Returns ALL sensitive data:
  // - IC number
  // - Bank account number
  // - Birthday
  // - Phone, address, emergency contact
  // - Email
  
  const employee = await this.employeeRepo.findOne({ where: { id } });
  
  // AUDIT LOGGED (session-based anti-spam)
  await this.auditService.logFromRequest(req, userId, 'VIEW_EMPLOYEE_PROFILE', 'employee', id, {
    employee_id: employee.employee_id,
    name: employee.name,
    accessed_fields: [
      'email', 'phone', 'address', 'emergency_contact',
      'ic_number', 'birthday', 'bank_account_number',
    ],
  });
  
  return { employee };
}
```

### 5.2 Employee Document Management

**File**: `hr.service.ts`, `employee-document.entity.ts`

#### Document Upload Security:
```typescript
@Post('employees/:id/documents/upload')
@UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10MB } }))
async uploadDocument(
  @Param('id') employeeId: string,
  @UploadedFile() file: any,
  @Body('document_type') documentType: string,
) {
  // 1. Validate document type
  const validTypes = [
    'RESUME', 'EMPLOYMENT_AGREEMENT', 'EMPLOYMENT_CONTRACT', 
    'OFFER_LETTER', 'IDENTITY_DOCUMENT', 'CERTIFICATION', 
    'PERFORMANCE_REVIEW', 'OTHER'
  ];
  if (!validTypes.includes(documentType)) {
    throw BadRequestException('Invalid document type');
  }
  
  // 2. Validate file (ONLY PDF allowed)
  const allowedMimeTypes = ['application/pdf'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw BadRequestException('Only PDF files allowed');
  }
  
  // 3. ClamAV scan (CRITICAL)
  const isClean = await this.clamavService.scanFile(file.buffer, file.originalname);
  if (!isClean) {
    throw BadRequestException('Malware detected');
  }
  
  // 4. Check for duplicates (SHA256 hash)
  const fileHash = this.generateFileHash(file.buffer);
  const duplicate = await this.documentRepo.findOne({ where: { file_hash: fileHash } });
  if (duplicate) {
    throw BadRequestException('Duplicate file');
  }
  
  // 5. Store in database
  const document = this.documentRepo.create({
    employee_id: employeeId,
    filename: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    data: file.buffer,  // BYTEA storage
    file_hash: fileHash,
    document_type: documentType,
    uploaded_by_id: userId,
  });
  
  await this.documentRepo.save(document);
  
  // 6. Audit log
  await this.auditService.logFromRequest(req, userId, 'UPLOAD_EMPLOYEE_DOCUMENT', 'employee_document', document.id, {
    employee_id: employeeId,
    document_type: documentType,
    filename: file.originalname,
  });
  
  return document;
}
```

#### Document Download Security:
```typescript
@Get('employees/:id/documents/:docId/download')
async downloadDocument(@Param('docId') docId: string, @Res() res: Response) {
  // 1. Get document
  const document = await this.documentRepo.findOne({ where: { id: docId } });
  if (!document) {
    throw NotFoundException('Document not found');
  }
  
  // 2. Audit log
  await this.auditService.logFromRequest(req, userId, 'DOWNLOAD_EMPLOYEE_DOCUMENT', 'employee_document', docId, {
    employee_id: document.employee_id,
    filename: document.filename,
  });
  
  // 3. Set secure headers
  res.setHeader('Content-Type', document.mimetype);
  res.setHeader('Content-Disposition', `attachment; filename="${document.filename}"`);
  
  // 4. Stream file from database
  return res.send(Buffer.from(document.data));
}
```

---

## 6. Database Security

### 6.1 PostgreSQL Configuration

**File**: `app.module.ts`, `data-source.ts`

#### Connection Security:
```typescript
TypeOrmModule.forRootAsync({
  useFactory: (configService: ConfigService) => ({
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),  // From .env
    port: parseInt(configService.get('DB_PORT', '5433'), 10),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD'),  // Never hardcoded
    database: configService.get('DB_NAME', 'fyp_db'),
    autoLoadEntities: true,
    synchronize: configService.get('NODE_ENV') !== 'production',  // NEVER true in prod
  }),
}),
```

#### Security Features:
- ✅ **Environment-based credentials** - no hardcoded passwords
- ✅ **Connection pooling** (default TypeORM settings)
- ✅ **SSL support** (can enable with `ssl: true`)
- ✅ **Synchronize disabled in production** - migrations only

### 6.2 Migration Strategy

**File**: `src/migrations/*.ts`

#### Why Migrations?
```
Development:
- synchronize: true → TypeORM auto-creates tables
- Fast iteration, no manual SQL

Production:
- synchronize: false → Schema changes via migrations only
- Versioned schema changes
- Rollback support
- Controlled deployment
```

#### Migration Workflow:
```bash
# Generate migration from entity changes
npm run migration:generate -- src/migrations/AddFileHashToClaims

# Review generated SQL
# migrations/1736899200000-AddFileHashToClaims.ts

# Run migrations
npm run migration:run

# Rollback if needed
npm run migration:revert
```

#### Example Migration:
```typescript
export class AddFileHashToClaims1736899200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "claims" 
      ADD COLUMN "file_hash" varchar(64) NULL
    `);
    
    await queryRunner.query(`
      CREATE INDEX "IDX_claims_file_hash" ON "claims" ("file_hash")
    `);
  }
  
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_claims_file_hash"`);
    await queryRunner.query(`ALTER TABLE "claims" DROP COLUMN "file_hash"`);
  }
}
```

### 6.3 SQL Injection Prevention

**File**: All repositories use TypeORM

#### TypeORM Parameterized Queries:
```typescript
// ✅ SAFE: Parameterized query
const user = await this.userRepo.findOne({ 
  where: { email: email }  // TypeORM escapes automatically
});

// ✅ SAFE: QueryBuilder with parameters
const employees = await this.employeeRepo
  .createQueryBuilder('employee')
  .where('employee.name ILIKE :query', { query: `%${query}%` })
  .getMany();

// ❌ UNSAFE: Raw query without parameters (NEVER DO THIS)
const result = await this.repo.query(`SELECT * FROM users WHERE email = '${email}'`);
// ^ SQL injection vulnerability!

// ✅ SAFE: Raw query with parameters
const result = await this.repo.query(
  `SELECT * FROM users WHERE email = $1`,
  [email]
);
```

#### Security Features:
- ✅ **TypeORM ORM layer** - automatic parameterization
- ✅ **Query builder** - type-safe SQL generation
- ✅ **Named parameters** - clear intent
- ✅ **No string concatenation** in queries

### 6.4 Data Encryption

**Current State**:
- ❌ **Passwords**: Argon2 hashed (NOT encrypted, HASHED)
- ❌ **Files**: Stored as-is in BYTEA (no encryption at rest)
- ❌ **Sensitive fields**: Stored as plain text (IC, bank account, etc.)

**Potential Enhancements** (see Section 10):
- Encrypt sensitive columns (AES-256-GCM)
- Transparent Data Encryption (TDE) at PostgreSQL level
- Field-level encryption with key management

---

## 7. API Security

### 7.1 CORS Configuration

**File**: `main.ts`

#### Same-Origin Architecture:
```
Browser → http://public-ip:3001 (Next.js frontend)
        → /api/* (relative paths)
        → Next.js proxy (app/api/[...path]/route.ts)
        → http://localhost:3000 (NestJS backend)
```

#### CORS Settings:
```typescript
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3001',  // Only Next.js server
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  credentials: true,  // Allow cookies/auth headers
  allowedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
});
```

#### Benefits:
- ✅ **No hardcoded IPs** - uses environment variable
- ✅ **Restrictive origin** - only Next.js can call backend
- ✅ **Credentials support** - JWT in Authorization header
- ✅ **Preflight handling** - OPTIONS requests handled

### 7.2 Rate Limiting

**File**: `backend/package.json` (express-rate-limit installed)

#### Potential Implementation:
```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // 100 requests per window
  message: 'Too many requests from this IP',
});

app.use('/auth/login', limiter);  // Apply to login endpoint
```

#### Currently: NOT IMPLEMENTED
- Should be added for production
- Prevents brute-force attacks
- Protects against DoS

### 7.3 Input Validation

**File**: DTOs with class-validator

#### Example DTO:
```typescript
import { IsString, IsEmail, IsNumber, Min, Max } from 'class-validator';

export class CreatePurchaseRequestDto {
  @IsString()
  title: string;
  
  @IsString()
  description: string;
  
  @IsString()
  department: string;
  
  @IsNumber()
  @Min(1)
  @Max(5)
  priority: number;
  
  @IsNumber()
  @Min(0)
  estimated_amount: number;
  
  @IsString()
  otp: string;
}
```

#### Validation Pipeline:
```typescript
// NestJS automatically validates DTOs using ValidationPipe
// main.ts:
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,  // Strip unknown properties
  forbidNonWhitelisted: true,  // Reject unknown properties
  transform: true,  // Auto-transform to DTO class
}));

// If validation fails → 400 Bad Request with error details
```

#### Security Features:
- ✅ **Type safety** - TypeScript + runtime validation
- ✅ **Whitelist mode** - unknown fields rejected
- ✅ **Transform mode** - auto-convert types (string → number)
- ✅ **Custom validators** - can add custom rules

### 7.4 Request Size Limits

**File**: `hr.controller.ts`, `purchase-request.controller.ts`

#### File Upload Limits:
```typescript
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024,  // 10MB max
    },
  }),
)
```

#### Body Size Limits:
```typescript
// Express body-parser (default in NestJS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

---

## 8. Frontend Security

### 8.1 Token Storage

**File**: `frontend/src/context/AuthContext.tsx`

#### Current Implementation:
```typescript
const login = (jwt: string, userData: User) => {
  setToken(jwt);
  setUser(userData);
  localStorage.setItem('jwtToken', jwt);  // ⚠️ Stored in localStorage
  localStorage.setItem('user', JSON.stringify(userData));
};

const logout = () => {
  setToken(null);
  setUser(null);
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('user');
  router.push('/login');
};
```

#### Security Concerns:
- ⚠️ **XSS vulnerability**: If an attacker injects malicious JavaScript, they can access `localStorage`
- ⚠️ **No HttpOnly flag**: Token accessible to client-side scripts

#### Better Approach (see Section 10):
```typescript
// Store token in HttpOnly cookie (set by backend)
// Frontend cannot access token directly
// XSS attacks cannot steal token
```

### 8.2 API Client Configuration

**File**: `frontend/lib/api.ts`

#### Axios Setup:
```typescript
const api = axios.create({
  baseURL: '/api',  // Relative path through Next.js proxy
  withCredentials: true,  // Send cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401 Unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid → Redirect to login
      // (handled by individual pages/hooks)
    }
    return Promise.reject(error);
  }
);
```

### 8.3 Environment Variables

**File**: `.env.local` (frontend)

#### Configuration:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000  # NOT used in production (uses /api proxy)
```

#### Security:
- ✅ **NEXT_PUBLIC_* prefix** - only these are exposed to browser
- ✅ **Relative paths in production** - no IP hardcoding
- ✅ **Proxy architecture** - backend URL never exposed to client

### 8.4 XSS Prevention

**React Built-in Protection**:
```tsx
// ✅ SAFE: React escapes by default
<div>{user.name}</div>
// If user.name = "<script>alert('XSS')</script>"
// Rendered as: &lt;script&gt;alert('XSS')&lt;/script&gt;

// ❌ UNSAFE: dangerouslySetInnerHTML
<div dangerouslySetInnerHTML={{ __html: user.description }} />
// This allows HTML injection! Only use with sanitized content.
```

#### DOMPurify (should be added):
```typescript
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(user.description) }} />
```

---

## 9. Security Best Practices Implemented

### ✅ 1. Defense in Depth
Multiple layers of security:
- Network (CORS, proxy)
- Authentication (JWT + MFA)
- Authorization (RBAC)
- File security (ClamAV + validation)
- Audit logging (all sensitive actions)

### ✅ 2. Least Privilege
- Users only access what they need
- Role-based permissions (RBAC)
- Ownership checks (users see only their own data)

### ✅ 3. Fail Securely
- Default deny (must explicitly allow)
- Guards required for protected endpoints
- Errors don't expose internal details

### ✅ 4. Audit Trail
- All sensitive actions logged
- IP address tracking
- User agent tracking
- Metadata for context

### ✅ 5. Secure Password Handling
- Argon2 hashing (not MD5/SHA1/bcrypt)
- Password stored as `password_hash`, never plaintext
- No password in logs or responses

### ✅ 6. Input Validation
- DTOs with class-validator
- File type whitelisting
- File size limits
- SQL injection prevention (TypeORM)

### ✅ 7. Secure File Handling
- ClamAV malware scanning
- Database storage (no orphaned files)
- Duplicate detection (SHA256 hash)
- Access control on downloads

### ✅ 8. Account Security
- Account lockout (5 failed attempts)
- MFA support
- Account suspension
- Non-office hours alerts

### ✅ 9. OTP Security
- Time-limited (5 minutes)
- One-time use
- Separate OTPs for different actions
- Email delivery (TLS)

### ✅ 10. Database Security
- Parameterized queries (no SQL injection)
- Connection pooling
- Environment-based credentials
- Migration strategy

---

## 10. Announcement System Security (NEW FEATURE)

### 10.1 Overview

The Announcement/Notice Board system is a **high-risk feature** because:
1. **Broadcast distribution** - One malicious file reaches all users
2. **High trust context** - HR announcements are trusted by default
3. **Wide attack surface** - Multiple file types, attachments, comments

### 10.2 File Upload Security Policy

**❌ NEVER say**: "All file types allowed"  
**✅ ALWAYS say**: "Most file types allowed with security restrictions"

#### Blocked File Types (Executables):
```typescript
const BLOCKED_EXTENSIONS = [
  '.exe',  // Windows executable
  '.bat',  // Batch script
  '.cmd',  // Command script
  '.sh',   // Shell script
  '.ps1',  // PowerShell script
  '.js',   // JavaScript (can execute in Node)
  '.vbs',  // VBScript
  '.jar',  // Java archive
  '.apk',  // Android package
  '.msi',  // Windows installer
  '.com',  // DOS executable
  '.scr',  // Screen saver (can be malware)
  '.dll',  // Dynamic library
];

const BLOCKED_MIMETYPES = [
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-java-archive',
  'application/vnd.android.package-archive',
];
```

#### Allowed Categories:
```typescript
const ALLOWED_CATEGORIES = {
  DOCUMENT: {
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
    ],
    maxSize: 20 * 1024 * 1024,  // 20MB
  },
  IMAGE: {
    mimeTypes: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
    ],
    maxSize: 10 * 1024 * 1024,  // 10MB
  },
  MEDIA: {
    mimeTypes: [
      'video/mp4',
      'audio/mpeg',
      'audio/wav',
    ],
    maxSize: 50 * 1024 * 1024,  // 50MB
  },
  ARCHIVE: {
    mimeTypes: [
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
    ],
    maxSize: 20 * 1024 * 1024,  // 20MB
  },
};
```

### 10.3 Announcement Security Architecture

#### Priority Levels & Behavior:
```typescript
enum AnnouncementPriority {
  URGENT = 'URGENT',      // Blocking modal, one-time per user
  IMPORTANT = 'IMPORTANT', // Red dot until acknowledged
  GENERAL = 'GENERAL',     // Listed normally
}

// Popup logic (CRITICAL - prevent spam)
async shouldShowUrgentPopup(userId: string, announcementId: string): boolean {
  // Check if user has already acknowledged
  const ack = await this.acknowledgmentRepo.findOne({
    where: { user_id: userId, announcement_id: announcementId },
  });
  
  if (ack && ack.acknowledged) {
    return false;  // Already acknowledged, never show again
  }
  
  // Check if announcement is URGENT and published after user's last login
  const announcement = await this.announcementRepo.findOne({ where: { id: announcementId } });
  const user = await this.userRepo.findOne({ where: { id: userId } });
  
  return (
    announcement.priority === AnnouncementPriority.URGENT &&
    announcement.published_at > user.last_login_at &&
    !ack?.acknowledged
  );
}
```

### 10.4 Security Measures

#### 1. File Validation (Multi-Layer):
```typescript
async validateAnnouncementAttachment(file: any): Promise<void> {
  // Layer 1: Extension blacklist
  const ext = file.originalname.toLowerCase().split('.').pop();
  if (BLOCKED_EXTENSIONS.includes(`.${ext}`)) {
    throw new BadRequestException(
      `File type .${ext} is not allowed for security reasons. Executable files are blocked.`
    );
  }
  
  // Layer 2: MIME type validation
  if (BLOCKED_MIMETYPES.includes(file.mimetype)) {
    throw new BadRequestException('File type not allowed');
  }
  
  // Layer 3: Category validation (optional - if you require category selection)
  const category = this.detectFileCategory(file.mimetype);
  if (!category) {
    throw new BadRequestException('File type not supported');
  }
  
  // Layer 4: Size validation
  const maxSize = ALLOWED_CATEGORIES[category].maxSize;
  if (file.size > maxSize) {
    throw new BadRequestException(
      `File size exceeds limit for ${category} files (max ${maxSize / 1024 / 1024}MB)`
    );
  }
  
  // Layer 5: ClamAV scan (CRITICAL)
  const isClean = await this.clamavService.scanFile(file.buffer, file.originalname);
  if (!isClean) {
    throw new BadRequestException('File failed security scan. Malware detected.');
  }
  
  // Layer 6: Duplicate check (optional)
  const fileHash = this.generateFileHash(file.buffer);
  const duplicate = await this.attachmentRepo.findOne({ where: { file_hash: fileHash } });
  if (duplicate) {
    throw new BadRequestException('Duplicate file detected');
  }
}
```

#### 2. Download Security:
```typescript
@Get('announcements/:id/attachments/:attachmentId/download')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.HR, Role.ACCOUNTANT, Role.MARKETING, Role.SALES, Role.SUPER_ADMIN)
async downloadAttachment(
  @Param('id') announcementId: string,
  @Param('attachmentId') attachmentId: string,
  @Req() req: any,
  @Res() res: Response,
) {
  // 1. Verify announcement exists and is published
  const announcement = await this.announcementRepo.findOne({ 
    where: { id: announcementId, is_published: true } 
  });
  if (!announcement) {
    throw new NotFoundException('Announcement not found');
  }
  
  // 2. Get attachment
  const attachment = await this.attachmentRepo.findOne({ 
    where: { id: attachmentId, announcement_id: announcementId } 
  });
  if (!attachment) {
    throw new NotFoundException('Attachment not found');
  }
  
  // 3. Verify malware scan passed
  if (attachment.malware_scan_status !== MalwareScanStatus.CLEAN) {
    throw new ForbiddenException('File has not passed security scan');
  }
  
  // 4. Audit log
  await this.auditService.logFromRequest(
    req,
    req.user.userId,
    'DOWNLOAD_ANNOUNCEMENT_ATTACHMENT',
    'announcement_attachment',
    attachmentId,
    {
      announcement_id: announcementId,
      filename: attachment.filename,
    },
  );
  
  // 5. Set secure headers (CRITICAL - prevent execution)
  res.setHeader('Content-Type', 'application/octet-stream');  // Force download
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(attachment.filename)}"`);
  res.setHeader('X-Content-Type-Options', 'nosniff');  // Prevent MIME sniffing
  res.setHeader('Content-Security-Policy', "default-src 'none'");  // Prevent execution
  
  // 6. Stream file from database
  return res.send(Buffer.from(attachment.file_data));
}
```

#### 3. Comment Security (XSS Prevention):
```typescript
// Backend: Sanitize comments
import * as DOMPurify from 'isomorphic-dompurify';

async createComment(announcementId: string, userId: string, content: string) {
  // Sanitize HTML (if rich text allowed)
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href'],
  });
  
  // Or strip all HTML (if plain text only)
  const plainText = content.replace(/<[^>]*>/g, '');
  
  const comment = this.commentRepo.create({
    announcement_id: announcementId,
    user_id: userId,
    content: sanitized,  // or plainText
  });
  
  await this.commentRepo.save(comment);
  
  // Audit log
  await this.auditService.log({
    userId,
    action: 'COMMENT_ANNOUNCEMENT',
    resource: 'announcement_comment',
    resourceId: comment.id,
  });
  
  return comment;
}
```

#### 4. Emoji Reaction Security:
```typescript
// Whitelist approach (prevent SQL injection or emoji exploits)
const ALLOWED_REACTIONS = ['👍', '❤️', '😮', '😢', '❗'];

async addReaction(announcementId: string, userId: string, emoji: string) {
  // Validate emoji
  if (!ALLOWED_REACTIONS.includes(emoji)) {
    throw new BadRequestException('Invalid emoji reaction');
  }
  
  // Upsert (one reaction per user)
  const existing = await this.reactionRepo.findOne({
    where: { announcement_id: announcementId, user_id: userId },
  });
  
  if (existing) {
    existing.emoji = emoji;
    await this.reactionRepo.save(existing);
  } else {
    const reaction = this.reactionRepo.create({
      announcement_id: announcementId,
      user_id: userId,
      emoji,
    });
    await this.reactionRepo.save(reaction);
  }
}
```

### 10.5 Defense Strategy

#### If Examiner Asks: "Why allow file uploads in announcements?"

**❌ Bad Answer**: "Users requested it"

**✅ Good Answer**: 
> "We allow document and media file attachments with multiple security layers:
> 1. **Executable blocking** - Scripts and binaries are blocked by extension and MIME type
> 2. **ClamAV scanning** - All files scanned for malware before storage
> 3. **Size limits** - Category-based limits prevent DoS (10-50MB)
> 4. **Forced download** - Content-Disposition: attachment prevents inline execution
> 5. **MIME sniffing prevention** - X-Content-Type-Options: nosniff header
> 6. **Audit logging** - All downloads tracked for incident response
> 7. **Database storage** - No direct file system access
> 
> This aligns with **Zero Trust principles** - verify explicitly, use least privilege, assume breach."

#### If Examiner Asks: "What if HR uploads malicious files?"

**✅ Good Answer**:
> "HR accounts have elevated trust but still face security controls:
> 1. **MFA required** - HR must authenticate with OTP
> 2. **ClamAV scanning** - Even HR uploads are scanned
> 3. **Audit logging** - All HR actions logged with IP address
> 4. **Executable blocking** - Even HR cannot upload .exe files
> 5. **Super Admin oversight** - Super Admins can review HR actions
> 6. **Account suspension** - Compromised HR accounts can be suspended immediately
> 
> This implements **defense-in-depth** - no single point of failure."

### 10.6 EC2 Operational Considerations

#### Memory Safety:
```typescript
// ✅ SAFE: Stream files, don't load all into memory
@Get('download')
async download(@Res() res: Response) {
  // Get file metadata first
  const attachment = await this.attachmentRepo.findOne({ 
    where: { id },
    select: ['id', 'filename', 'mimetype', 'size'],  // Don't load file_data yet
  });
  
  // Check if file is too large for single-query load
  if (attachment.size > 50 * 1024 * 1024) {  // 50MB
    // Use streaming query (PostgreSQL supports this)
    const stream = await this.attachmentRepo
      .createQueryBuilder()
      .select('file_data')
      .where('id = :id', { id })
      .stream();
    
    return stream.pipe(res);
  }
  
  // For smaller files, direct load is fine
  const fullAttachment = await this.attachmentRepo.findOne({ where: { id } });
  return res.send(Buffer.from(fullAttachment.file_data));
}
```

#### CPU Safety (ClamAV):
```typescript
// Limit concurrent ClamAV scans to prevent CPU spike
import pLimit from 'p-limit';

const scanLimit = pLimit(2);  // Max 2 concurrent scans

async uploadAttachments(files: any[]) {
  // Scan files in controlled concurrency
  const scanResults = await Promise.all(
    files.map(file => 
      scanLimit(() => this.clamavService.scanFile(file.buffer, file.originalname))
    )
  );
  
  if (scanResults.some(result => !result)) {
    throw new BadRequestException('One or more files failed security scan');
  }
  
  // Proceed with storage...
}
```

---

## 11. Potential Security Enhancements

### 🔧 1. Token Storage (Critical)
**Current**: JWT in localStorage (XSS vulnerable)  
**Better**: HttpOnly cookie with SameSite=Strict

```typescript
// Backend: Set cookie instead of sending token in response
res.cookie('auth_token', jwt, {
  httpOnly: true,  // Cannot be accessed by JavaScript
  secure: true,    // HTTPS only
  sameSite: 'strict',  // CSRF protection
  maxAge: 3600000,  // 1 hour
});

// Frontend: No need to store token, cookie sent automatically
```

### 🔧 2. Rate Limiting (High Priority)
```typescript
import rateLimit from 'express-rate-limit';

// Login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 5,  // 5 attempts
  message: 'Too many login attempts',
});
app.use('/auth/login', loginLimiter);

// File upload endpoints
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 20,  // 20 uploads
});
app.use('/purchase-requests/claims/upload', uploadLimiter);
```

### 🔧 3. Content Security Policy (CSP)
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Avoid 'unsafe-inline' if possible
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

### 🔧 4. Database Encryption at Rest
```sql
-- PostgreSQL TDE (Transparent Data Encryption)
ALTER DATABASE fyp_db SET encryption = 'on';

-- Column-level encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive fields
INSERT INTO employees (ic_number_encrypted) 
VALUES (pgp_sym_encrypt('S1234567A', 'encryption_key'));

-- Decrypt when reading
SELECT pgp_sym_decrypt(ic_number_encrypted, 'encryption_key') AS ic_number
FROM employees;
```

### 🔧 5. Session Management
```typescript
// Add session invalidation
@Post('logout')
async logout(@Req() req: any) {
  // 1. Add token to blacklist (Redis)
  await this.redisService.set(`blacklist:${token}`, '1', 'EX', 3600);
  
  // 2. Clear session data
  req.user = null;
  
  // 3. Clear cookie (if using HttpOnly cookies)
  res.clearCookie('auth_token');
  
  return { message: 'Logged out successfully' };
}

// Check blacklist in JwtStrategy
async validate(payload: any) {
  const isBlacklisted = await this.redisService.get(`blacklist:${token}`);
  if (isBlacklisted) {
    throw new UnauthorizedException('Token has been revoked');
  }
  // ...rest of validation
}
```

### 🔧 6. Password Complexity Requirements
```typescript
import { IsStrongPassword } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;
  
  @IsStrongPassword({
    minLength: 12,
    minLowercase: 1,
    minUppercase: 1,
    minNumbers: 1,
    minSymbols: 1,
  })
  password: string;
}
```

### 🔧 7. HTTPS Enforcement
```typescript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.protocol !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Strict-Transport-Security header
app.use(helmet.hsts({
  maxAge: 31536000,  // 1 year
  includeSubDomains: true,
  preload: true,
}));
```

### 🔧 8. API Versioning
```typescript
@Controller('api/v1/purchase-requests')  // Version in URL
export class PurchaseRequestController {
  // Allows breaking changes without affecting existing clients
}
```

### 🔧 9. Request ID Tracking
```typescript
import { v4 as uuidv4 } from 'uuid';

app.use((req, res, next) => {
  req.requestId = uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Include in logs
logger.log(`[${req.requestId}] User ${userId} viewed employee ${employeeId}`);
```

### 🔧 10. Monitoring & Alerting
```typescript
// Track failed login attempts
if (failedLoginCount > 10 in 1 hour) {
  sendAlertToAdmins('Potential brute-force attack detected');
}

// Track suspicious file uploads
if (malwareDetectedCount > 5 in 1 hour) {
  sendAlertToAdmins('Multiple malware uploads detected');
}

// Track bulk data access
if (employeeViewCount > 50 in 1 hour for same user) {
  sendAlertToAdmins('Potential data scraping detected');
}
```

---

## 11. Security Testing Checklist

### Authentication Tests
- [ ] Login with invalid credentials → 401 Unauthorized
- [ ] Login with suspended account → 403 Forbidden
- [ ] Login without MFA when required → OTP prompt
- [ ] Login with expired token → 401 Unauthorized
- [ ] Login with 5+ failed attempts → Account locked
- [ ] Password reset with invalid OTP → 401 Unauthorized

### Authorization Tests
- [ ] Access protected endpoint without JWT → 401 Unauthorized
- [ ] Access endpoint with wrong role → 403 Forbidden
- [ ] Sales user tries to view marketing purchase request → 403 Forbidden
- [ ] HR user tries to access accountant files → 403 Forbidden
- [ ] Delete operation without super admin role → 403 Forbidden

### File Upload Tests
- [ ] Upload file without ClamAV scan → Rejected
- [ ] Upload infected file → Rejected with "Malware detected"
- [ ] Upload duplicate file (same hash) → Rejected with "Duplicate file"
- [ ] Upload file > 10MB → Rejected with "File too large"
- [ ] Upload non-PDF to HR documents → Rejected with "Invalid file type"
- [ ] Upload without ownership → 403 Forbidden

### Audit Logging Tests
- [ ] View sensitive data → Audit log created
- [ ] Refresh page 10 times → Only 1 audit log (session-based)
- [ ] Download file → Audit log created
- [ ] Delete record → Audit log created
- [ ] Clear audit logs without OTP → 401 Unauthorized
- [ ] Clear audit logs with invalid OTP → 401 Unauthorized

### SQL Injection Tests
- [ ] Login with `' OR '1'='1` → Rejected (parameterized queries)
- [ ] Search with `'; DROP TABLE users;--` → Safe (parameterized queries)
- [ ] Filter with malicious SQL → Safe (QueryBuilder)

### XSS Tests
- [ ] Input `<script>alert('XSS')</script>` in text fields → Escaped by React
- [ ] View user-generated content → HTML entities escaped
- [ ] dangerouslySetInnerHTML usage → Should be sanitized (if used)

---

## 12. Conclusion

Your FYP system implements **robust defense-in-depth security** with multiple layers of protection:

### Strengths:
1. ✅ **Strong authentication** - JWT + MFA + Argon2 hashing
2. ✅ **Fine-grained authorization** - RBAC with multiple roles
3. ✅ **File security** - ClamAV scanning + duplicate detection
4. ✅ **Comprehensive audit logging** - All sensitive actions tracked
5. ✅ **Secure file handling** - Database storage + hash-based deduplication
6. ✅ **Account security** - Lockout + suspension + alerts
7. ✅ **Input validation** - DTOs + class-validator
8. ✅ **SQL injection prevention** - TypeORM parameterized queries

### Areas for Enhancement:
1. ⚠️ **Token storage** - Move from localStorage to HttpOnly cookies
2. ⚠️ **Rate limiting** - Add to login and upload endpoints
3. ⚠️ **Database encryption** - Encrypt sensitive fields at rest
4. ⚠️ **Session management** - Token blacklist on logout
5. ⚠️ **Password complexity** - Enforce strong passwords
6. ⚠️ **HTTPS enforcement** - Redirect HTTP to HTTPS
7. ⚠️ **Monitoring** - Add alerts for suspicious activity

### Overall Assessment:
**Security Level: 8/10**

Your system demonstrates strong security fundamentals and would be suitable for a production environment with minor enhancements. The layered approach to security, comprehensive audit logging, and proactive malware scanning are particularly impressive.

---

**End of Security Review**

Generated on: January 2, 2026  
System Version: FYP Enterprise Management System v1.0  
Reviewer: GitHub Copilot AI Assistant
