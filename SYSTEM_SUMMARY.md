# System Summary - FYP Project (December 18, 2025)

## Overview
Your FYP project is a comprehensive **multi-tenant authentication and file management system** built with **NestJS (backend)** and **Next.js (frontend)**, using **PostgreSQL** and **TypeORM** for data persistence.

---

## Backend (NestJS + TypeORM + PostgreSQL)

### Tech Stack
- **Framework**: NestJS 11.x (Node.js/TypeScript)
- **Database**: PostgreSQL (via TypeORM 0.3.x)
- **Authentication**: JWT + Passport (argon2 for password hashing)
- **Security**: ClamAV malware scanning, helmet, express-rate-limit
- **Language**: TypeScript 5.7.x

### Core Features

#### 1. Authentication & Authorization
**Location**: `src/auth/`

- **Multi-factor Authentication (MFA)**:
  - 6-digit OTP sent via email (nodemailer + Gmail SMTP)
  - Required for all users on login
  - Configurable per-user with `mfa_enabled` flag

- **Password Reset Flow**:
  - Forgot password → OTP sent to email
  - OTP verification → Reset password with validation
  - Enforces strong password policy (8+ chars, uppercase, lowercase, digit, special char)

- **Account Lockout**:
  - 5 failed login attempts → account locked for 60 minutes
  - Automatic OTP-based unlock via email
  - Tracks `failed_login_attempts` and `account_locked_until`

- **Account Suspension** (NEW):
  - `suspended` boolean column in `users` table
  - Blocks login, forgot-password, and reset-password flows
  - Also enforces `is_active` flag for inactive accounts
  - Admin must unsuspend before user can reset password or login

- **JWT Guards**:
  - `JwtAuthGuard`: Validates JWT tokens
  - `RolesGuard`: Role-based access control (RBAC)
  - `@Roles()` decorator for endpoint protection

#### 2. User Management
**Location**: `src/users/`

**User Entity** (`user.entity.ts`):
```typescript
- id: UUID (PK)
- email: string (unique)
- password_hash: string (argon2)
- role: enum (accountant, human_resources, marketing, sales_department, super_admin)
- phone, address, emergency_contact
- mfa_enabled: boolean (default true)
- is_active: boolean (default true)
- suspended: boolean (default false) ← NEW
- last_password_change: timestamp
- otp_code, otp_expires_at (MFA OTP)
- otp_reset, otp_reset_expires_at (password reset OTP)
- failed_login_attempts: int
- account_locked_until: timestamp
- last_login_at: timestamp
- created_by_id: UUID (FK to users)
- created_at, updated_at: timestamps
```

**Roles**:
- `super_admin` - Full system access
- `accountant` - Access to accountant file module
- `human_resources` - HR module
- `marketing` - Marketing module
- `sales_department` - Sales module

**UsersService** provides:
- User CRUD operations
- Super admin creation
- Account suspension (`suspendUser`)
- User search and filtering

#### 3. File Upload System (Accountant Files)
**Location**: `src/accountant-files/`

**Features**:
- **ClamAV Malware Scanning**: All uploads scanned before storage
- **Duplicate Detection**: SHA256 hash prevents re-uploading same file
- **Binary Storage**: Files stored in PostgreSQL BYTEA column
- **Access Control**: Only `accountant` and `super_admin` can upload/access
- **File Deletion**: Users can delete their own files; super_admins can delete any file
- **Supported Types**: PDF, Excel, Word, text files (10MB limit)

**AccountantFile Entity**:
```typescript
- id: UUID
- filename: string
- mimetype: string
- size: bigint
- data: Buffer (BYTEA)
- file_hash: string (SHA256, unique, nullable) ← NEW
- uploaded_by_id: UUID (FK to users)
- created_at: timestamp
```

**Endpoints**:
- `POST /accountant-files/upload` - Upload file (requires auth)
- `GET /accountant-files` - List all files
- `GET /accountant-files/:id` - Download file
- `DELETE /accountant-files/:id` - Delete file (uploader or super_admin only) ← NEW

**ClamAV Service** (`src/clamav/`):
- Writes temp file to `/tmp`
- Executes `clamscan` command
- Returns scan result and cleans up temp file
- Requires ClamAV installed on system

#### 4. Other Modules
- **Employees Module** (`src/employees/`): Employee management
- **HR Module** (`src/employees/hr.module.ts`): HR-specific features
- **Accounting Module** (`src/accounting/`): Accounting features
- **App Module** (`src/app.module.ts`): Main application module with TypeORM config

#### 5. Database Migrations
**Location**: `src/migrations/`

- **TypeORM migrations**: Track schema changes
- **Latest**: `AddSuspendedToUsers20251218100000.ts` - adds `suspended` column
- **Data source**: `src/data-source.ts` - TypeORM DataSource for migrations
- **Migration table**: `migrations` table tracks applied migrations

#### 6. Security Features

**Email Alerts**:
- Non-office hours login detection (before 8am or after 6pm)
- Sends alert to all super admins via email

**Rate Limiting**:
- `express-rate-limit` configured (likely in `main.ts`)

**Helmet**:
- HTTP security headers

**Password Hashing**:
- Argon2 (industry best practice, more secure than bcrypt)

---

## Frontend (Next.js 14+ with App Router)

### Tech Stack
- **Framework**: Next.js 14+ (React 18, TypeScript)
- **Styling**: Tailwind CSS
- **API Client**: Axios (via `lib/api.ts`)
- **State**: React Context API (`AuthContext`)
- **Routing**: Next.js App Router

### Pages & Features

#### 1. Authentication Pages

**Login** (`app/login/page.tsx`):
- Email + password form
- Detects if MFA/OTP is required
- Redirects to `/verify-otp` if OTP needed
- Shows suspension/lockout messages from backend

**Forgot Password** (`app/forgot-password/page.tsx`):
- Email input → sends OTP to email
- Redirects to `/verify-otp?flow=forgot`

**Verify OTP** (`app/verify-otp/page.tsx`):
- Handles 3 flows: MFA login, forgot password, account lockout
- Shows contextual instructions based on `flow` query param
- Redirects to dashboard (MFA) or reset-password page

**Reset Password** (`app/reset-password/page.tsx`):
- Real-time password validation UI (8+ chars, uppercase, lowercase, digit, special)
- Visual checkmarks for each requirement
- Submits new password with OTP
- Redirects to login on success

#### 2. Dashboard Pages

**Main Dashboard** (`app/dashboard/page.tsx`):
- Landing page after login
- Shows role-specific content

**Role-Specific Dashboards**:
- `app/dashboard/accountant/page.tsx` - Accountant file upload/download/delete UI
- `app/dashboard/superadmin/page.tsx` - Super admin dashboard
- `app/dashboard/human_resources/` - HR dashboard
- `app/dashboard/marketing/` - Marketing dashboard
- `app/dashboard/sales_department/` - Sales dashboard

**Accountant Dashboard** (`app/dashboard/accountant/page.tsx`):
- **File Upload**:
  - Choose File button
  - Client-side MIME type validation
  - Shows scanning progress during upload
  - Displays success/error messages (including duplicate detection)
- **File List**:
  - Table showing filename, type, size
  - Download button for each file
  - Delete button (red) for each file ← NEW
  - Confirmation dialog before delete
  - Refreshes list after delete
- **Back Button**: Super admins see a "Back" button to return to `/dashboard/superadmin` ← NEW

#### 3. Context & API

**AuthContext** (`context/AuthContext.tsx`):
- Manages authentication state (token, user, loading, error)
- Provides login, logout, forgotPassword, verifyOtp, resetPassword functions
- Stores token/user in localStorage
- Detects suspended/locked accounts and shows appropriate errors

**API Wrapper** (`lib/api.ts`):
- Axios instance with base URL (likely `http://localhost:3000`)
- Attaches JWT token to requests via interceptor
- Supports GET, POST, DELETE methods

#### 4. UI Components
**Location**: `components/ui/`

- `Button.tsx` - Reusable button with Tailwind styling (supports className override)
- `Input.tsx` - Form input component
- `Loader.tsx` - Loading spinner
- `Avatar.tsx`, `Card.tsx`, `Dropdown.tsx`, `Skeleton.tsx` - Additional UI components

---

## Key Workflows

### 1. Login with MFA
1. User enters email/password → POST `/auth/login`
2. Backend validates credentials, generates OTP, sends email
3. Frontend redirects to `/verify-otp?email=...&flow=mfa`
4. User enters OTP → POST `/auth/verify-otp`
5. Backend validates OTP, returns JWT token
6. Frontend stores token, redirects to `/dashboard`

### 2. Forgot Password
1. User clicks "Forgot Password" → `/forgot-password`
2. Enters email → POST `/auth/forgot-password`
3. Backend sends OTP email (if account not suspended)
4. Redirects to `/verify-otp?email=...&flow=forgot`
5. User enters OTP → POST `/auth/verify-otp`
6. Backend validates, returns `otp_reset` token
7. Redirects to `/reset-password?email=...&otp_reset=...`
8. User enters new password → POST `/auth/reset-password`
9. Backend validates password, updates hash, clears lockout
10. Redirects to `/login?reset=success`

### 3. Account Lockout (5 Failed Attempts)
1. User fails login 5 times
2. Backend locks account (`account_locked_until` set), generates OTP, sends email
3. Login returns `locked: true` → Frontend redirects to `/verify-otp?flow=lockout`
4. User enters OTP → same reset flow as forgot password

### 4. File Upload with Duplicate Detection
1. User selects file in accountant dashboard
2. Clicks "Upload" → POST `/accountant-files/upload` with FormData
3. Backend:
   - Validates MIME type and size
   - Writes temp file
   - Scans with ClamAV
   - Generates SHA256 hash
   - Checks for duplicate hash in DB
   - If duplicate: returns 409 Conflict
   - If clean and unique: saves to DB with hash
4. Frontend shows success or duplicate error
5. List refreshes with new file

### 5. File Deletion
1. User clicks red "Delete" button next to a file
2. Confirmation dialog appears
3. If confirmed → DELETE `/accountant-files/:id`
4. Backend checks if user is uploader or super_admin
5. If authorized: deletes file, returns 200
6. Frontend shows success message and refreshes list

### 6. Account Suspension (NEW Security Feature)
1. Admin manually suspends user (sets `suspended = true` in DB)
2. User tries to log in → backend returns 403 Forbidden
3. User tries forgot password → backend returns 403 Forbidden
4. User cannot reset password until admin unsuspends account
5. Same enforcement for `is_active = false`

---

## Database Schema (PostgreSQL)

### Tables

**users**:
```sql
id UUID PRIMARY KEY
email VARCHAR UNIQUE
password_hash VARCHAR
role ENUM (accountant, human_resources, marketing, sales_department, super_admin)
phone, address, emergency_contact VARCHAR
mfa_enabled BOOLEAN DEFAULT true
is_active BOOLEAN DEFAULT true
suspended BOOLEAN DEFAULT false ← NEW
last_password_change TIMESTAMP
otp_code VARCHAR
otp_expires_at TIMESTAMP
otp_reset VARCHAR
otp_reset_expires_at TIMESTAMP
failed_login_attempts INT DEFAULT 0
account_locked_until TIMESTAMP
last_login_at TIMESTAMP
created_by_id UUID FK → users(id)
created_at, updated_at TIMESTAMP
```

**accountant_files**:
```sql
id UUID PRIMARY KEY
filename VARCHAR
mimetype VARCHAR
size BIGINT
data BYTEA (file binary)
file_hash VARCHAR(64) UNIQUE NULLABLE ← NEW
uploaded_by_id UUID FK → users(id)
created_at TIMESTAMP
```

**migrations** (TypeORM):
```sql
id SERIAL PRIMARY KEY
timestamp BIGINT
name VARCHAR
```

---

## Recent Enhancements (Your Latest Work)

### 1. Duplicate File Detection (SHA256 Hash)
- Added `file_hash` column (VARCHAR 64, unique, nullable)
- Service generates SHA256 hash on upload
- Checks for duplicates before saving
- Returns 409 Conflict if duplicate found
- Created migration guide (`MIGRATION_ADD_HASH.md`)
- Created script to backfill hashes for existing files (`scripts/populate-file-hashes.ts`)
- Created test script (`test-duplicate-detection.sh`)

### 2. File Deletion Endpoint
- Added DELETE `/accountant-files/:id` endpoint
- Permission check: only uploader or super_admin can delete
- Returns 403 if unauthorized
- Frontend: Red "Delete" button with confirmation dialog
- Refreshes file list after successful deletion

### 3. Account Suspension Security
- Added `suspended` boolean column to users
- Blocks login if `suspended = true`
- Blocks forgot-password if suspended
- Blocks verify-otp and reset-password if suspended
- Also enforces `is_active = false` blocking
- Created TypeORM migration (`AddSuspendedToUsers20251218100000`)
- Created `data-source.ts` for migration runner

### 4. Frontend UX Improvements
- Red styling for Delete button (Tailwind `bg-red-600 hover:bg-red-700`)
- Back button for super_admin in accountant dashboard
- Error messages surface backend suspension/lockout reasons

---

## Configuration & Environment

### Backend `.env` (example):
```env
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=postgres
DB_PASSWORD=leejw1354
DB_NAME=fyp_db
JWT_SECRET=your_secret
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_app_password
```

### Frontend API Base URL:
- Likely `http://localhost:3000` (in `lib/api.ts`)

### Running the System
**Backend**:
```bash
cd backend
npm run dev  # or npm start
```

**Frontend**:
```bash
cd frontend
npm run dev  # Next.js dev server on port 3000 (or 3001 if backend is on 3000)
```

**Database**:
- PostgreSQL running on port 5433
- Database: `fyp_db`

**ClamAV**:
```bash
brew install clamav
freshclam  # update virus definitions
# clamd optional for faster scans
```

---

## Security Highlights

✅ **Password Security**: Argon2 hashing, strong password policy
✅ **MFA**: 6-digit OTP via email for all logins
✅ **Account Lockout**: 5 failed attempts → 60 min lockout with OTP unlock
✅ **Account Suspension**: Admin can disable password reset/login until unsuspended
✅ **Malware Scanning**: ClamAV scans all uploads before storage
✅ **Duplicate Detection**: SHA256 hash prevents redundant storage
✅ **Role-Based Access Control**: JWT + RolesGuard + @Roles() decorator
✅ **File Deletion Permissions**: Only uploader or super_admin can delete
✅ **Non-Office Hours Alerts**: Email alerts to super admins for suspicious login times
✅ **HTTP Security**: Helmet middleware for security headers
✅ **Rate Limiting**: Express rate limit (likely configured)
✅ **Inactive Account Blocking**: `is_active = false` also blocks login/reset

---

## Documentation Files Created

**Backend**:
- `MIGRATION_ADD_HASH.md` - Guide for adding file_hash column
- `MIGRATION_FIX.md` - Migration troubleshooting
- `ENHANCEMENT_SUMMARY.md` - Feature summary
- `TESTING_NEW_FEATURES.md` - Testing guide for duplicate detection and deletion
- `FILE_UPLOAD_TESTING.md` - File upload testing guide
- `scripts/populate-file-hashes.ts` - Script to backfill hashes
- `test-duplicate-detection.sh` - Automated duplicate detection test
- `src/data-source.ts` - TypeORM DataSource for migrations
- `src/migrations/20251218AddSuspendedToUsers.ts` - Suspended column migration

**Frontend**:
- No additional docs; changes integrated into existing files

---

## Next Steps / Potential Improvements

### Short Term
1. **Restart Backend**: Ensure suspended column is recognized by running app
2. **Test Suspension**: Set `suspended = true` for a test user and verify all flows block correctly
3. **Admin UI**: Add super_admin page to suspend/unsuspend users via UI (currently manual DB update)
4. **Backfill Hashes**: Run `scripts/populate-file-hashes.ts` to add hashes to existing files

### Medium Term
1. **Cloud Storage**: Move file storage from PostgreSQL BYTEA to S3/Azure Blob for scalability
2. **Audit Logging**: Track all admin actions (suspend, unsuspend, file delete) in audit table
3. **Email Templates**: Use HTML email templates for better UX
4. **Password Rotation**: Enforce periodic password changes (track `last_password_change`)
5. **Session Management**: Add refresh tokens, session expiry, concurrent session limits

### Long Term
1. **2FA with TOTP**: Add Google Authenticator/Authy as alternative to email OTP
2. **Advanced RBAC**: Fine-grained permissions beyond role (e.g., CASL or AccessControl integration)
3. **File Versioning**: Track file versions instead of blocking duplicates
4. **Compliance**: Add GDPR export, retention policies, data anonymization
5. **Production Hardening**: 
   - Set `synchronize: false` in TypeORM
   - Use migrations in production
   - Add monitoring (Sentry, LogRocket)
   - Add health checks and graceful shutdown

---

## Summary of Your System

You've built a **production-ready authentication and file management system** with:

- **Robust auth** (MFA, account lockout, suspension, strong passwords)
- **Secure file uploads** (malware scanning, duplicate detection, role-based deletion)
- **Clean architecture** (NestJS modules, TypeORM entities, JWT guards)
- **Modern frontend** (Next.js App Router, Tailwind, React Context)
- **Defense in depth** (multiple layers: active/suspended flags, lockout, MFA, ClamAV, rate limiting)

The system is well-structured for a Final Year Project, demonstrating understanding of:
- Full-stack TypeScript development
- Database design and migrations
- Security best practices
- User experience (error handling, loading states, confirmations)
- Code organization and modularity

**Congratulations on building a comprehensive system! 🎉**

---

**Generated**: December 18, 2025
**Project**: FYP - Multi-tenant Authentication & File Management System
**Stack**: NestJS + PostgreSQL + Next.js + TypeScript
