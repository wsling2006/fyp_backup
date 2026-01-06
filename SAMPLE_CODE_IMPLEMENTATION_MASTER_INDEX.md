# SAMPLE CODE IMPLEMENTATION - MASTER INDEX

**Project:** Zero Trust Access Control System  
**Final Year Project Documentation**  
**Date:** January 6, 2026  
**Author:** Student Documentation  
**Tech Stack:** NestJS + Next.js + PostgreSQL + TypeORM  

---

## 📚 DOCUMENTATION OVERVIEW

This comprehensive implementation guide is divided into **4 parts** covering all aspects of your Zero Trust Access Control System. Each part builds upon the previous one to provide a complete understanding of the system architecture, security implementations, and deployment procedures.

---

## 📖 DOCUMENTATION PARTS

### **PART 1: Core Architecture & Authentication**
**File:** `SAMPLE_CODE_IMPLEMENTATION_PART1.md`

**What's Covered:**
- System overview and technology stack
- Architecture design diagrams
- Database schema (Users table, ERD)
- Complete authentication flow
- User entity with TypeORM
- Auth service implementation
- Password hashing with Argon2
- MFA with Email OTP (6-digit, 5-min expiry)
- Account lockout mechanism (5 attempts = 60-min lock)
- Password reset flow
- Non-office hours detection

**Key Components:**
- `user.entity.ts` - User database model
- `auth.service.ts` - Authentication business logic
- `auth.controller.ts` - Authentication endpoints
- `roles.enum.ts` - User role definitions

**Use This Part For:**
- Understanding system architecture
- Implementing user authentication
- Setting up database schema
- Configuring Argon2 password hashing
- Building MFA with OTP

---

### **PART 2: RBAC, Guards & API Security**
**File:** `SAMPLE_CODE_IMPLEMENTATION_PART2.md`

**What's Covered:**
- JWT strategy implementation
- Authentication guards (JwtAuthGuard)
- Role-based access control (RolesGuard)
- Permission matrix for 5 roles
- Backend main configuration
- App module setup
- Environment variables
- Complete API endpoint documentation
- Request/response examples
- Error handling

**Key Components:**
- `jwt.strategy.ts` - JWT validation strategy
- `jwt-auth.guard.ts` - JWT guard implementation
- `roles.guard.ts` - RBAC enforcement
- `roles.decorator.ts` - Role decorator
- `main.ts` - Application bootstrap
- `app.module.ts` - Module configuration

**Use This Part For:**
- Implementing JWT authentication
- Setting up RBAC permissions
- Protecting API endpoints
- Configuring CORS and security
- Understanding API structure

---

### **PART 3: File Security & Frontend**
**File:** `SAMPLE_CODE_IMPLEMENTATION_PART3.md`

**What's Covered:**
- File upload security system
- ClamAV malware scanning service
- SHA-256 file deduplication
- Database file storage (BYTEA)
- Claim entity with file handling
- Frontend architecture (Next.js)
- API client configuration
- Auth context (React Context API)
- Protected route component
- Login and OTP pages

**Key Components:**
- `claim.entity.ts` - Claim model with file storage
- `clamav.service.ts` - Malware scanning
- `purchase-request.service.ts` - File upload logic
- `api.ts` - Frontend API client
- `AuthContext.tsx` - React authentication context
- `ProtectedRoute.tsx` - Route protection
- Login and OTP verification pages

**Use This Part For:**
- Implementing secure file uploads
- Setting up malware scanning
- Building frontend authentication
- Creating protected routes
- Handling file downloads

---

### **PART 4: Dashboard, Business Logic & Deployment**
**File:** `SAMPLE_CODE_IMPLEMENTATION_PART4.md`

**What's Covered:**
- Dashboard implementation
- Role-based statistics display
- Purchase request creation
- Claim upload workflow
- PM2 process management
- Nginx reverse proxy configuration
- Docker Compose setup
- Deployment scripts
- Testing procedures
- Security checklist
- Production configuration

**Key Components:**
- `dashboard/page.tsx` - Main dashboard
- `purchase-requests/create/page.tsx` - PR creation
- `upload-claim/page.tsx` - Claim submission
- `ecosystem.config.js` - PM2 config
- `nginx.conf` - Nginx configuration
- `docker-compose.yml` - Docker setup
- Testing scripts and checklists

**Use This Part For:**
- Building user interfaces
- Implementing business workflows
- Deploying to production
- Testing the complete system
- Security hardening

---

## 🎯 QUICK NAVIGATION BY TOPIC

### Authentication & Security
- **User Registration:** Part 1 → Auth Service → `register()`
- **Login Flow:** Part 1 → Auth Service → `login()`
- **MFA/OTP:** Part 1 → Auth Service → `verifyOtp()`
- **JWT Strategy:** Part 2 → JWT Strategy & Guards
- **Password Reset:** Part 1 → Auth Service → `resetPassword()`
- **Account Lockout:** Part 1 → Auth Service → `handleFailedLogin()`

### Authorization & RBAC
- **Role Definitions:** Part 2 → Roles Enum
- **Permission Matrix:** Part 2 → RBAC Permission Matrix
- **Guards:** Part 2 → JWT Auth Guard & Roles Guard
- **Protected Endpoints:** Part 2 → Example: Protected Endpoint

### File Management
- **File Upload:** Part 3 → File Upload Service
- **Malware Scanning:** Part 3 → ClamAV Service
- **File Deduplication:** Part 3 → SHA-256 Hash
- **File Download:** Part 3 → Download Receipt Method
- **File Storage:** Part 3 → Claim Entity (BYTEA)

### Frontend
- **Login Page:** Part 3 → Login Page Component
- **OTP Verification:** Part 3 → OTP Page Component
- **Dashboard:** Part 4 → Dashboard Implementation
- **Protected Routes:** Part 3 → Protected Route Component
- **API Client:** Part 3 → API Configuration

### Database
- **User Entity:** Part 1 → User Entity & Models
- **Claim Entity:** Part 3 → Claim Entity
- **Purchase Request:** Part 4 → Purchase Request Entity
- **Employee Entity:** Part 4 → Employee Entity
- **Revenue Entity:** Part 4 → Revenue Entity

### Deployment
- **PM2 Setup:** Part 4 → PM2 Configuration
- **Nginx Config:** Part 4 → Nginx Configuration
- **Docker Setup:** Part 4 → Docker Compose
- **Environment Variables:** Part 4 → Production Security
- **Deployment Script:** Part 4 → Deployment Script

### Testing
- **Authentication Tests:** Part 4 → Authentication Test Script
- **Manual Testing:** Part 4 → Manual Testing Checklist
- **Security Testing:** Part 4 → Security Checklist

---

## 🏗️ SYSTEM ARCHITECTURE SUMMARY

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT BROWSER                           │
│            (Next.js 14 React Frontend)                      │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTPS + JWT Token
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  NEXT.JS SERVER (Port 3001)                 │
│  - Server-Side Rendering                                    │
│  - API Route Proxy                                          │
│  - Static Assets                                            │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP (localhost:3000)
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               NESTJS BACKEND API (Port 3000)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Security Layer                                       │  │
│  │  - JwtAuthGuard (validates token)                    │  │
│  │  - RolesGuard (checks permissions)                   │  │
│  │  - Rate Limiting, Helmet, CORS                       │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                                 │  │
│  │  - Auth Service (Argon2 hashing, OTP)               │  │
│  │  - Users Service                                      │  │
│  │  - Purchase Request Service                          │  │
│  │  - ClamAV Service (malware scan)                     │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Data Access Layer (TypeORM)                         │  │
│  │  - User Repository                                    │  │
│  │  - Claim Repository                                   │  │
│  │  - Employee Repository                                │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │ SQL Queries
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE (Port 5432)                │
│  - Users, Roles, Permissions                                │
│  - Purchase Requests, Claims                                │
│  - Employees, Revenue, Announcements                        │
│  - Files stored as BYTEA (binary)                           │
│  - Audit Logs                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 CLAMAV SERVICE (Port 3310)                  │
│  - Real-time malware scanning                               │
│  - INSTREAM protocol                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 KEY FEATURES IMPLEMENTED

### ✅ Zero Trust Security
1. **Verify Explicitly:** JWT validation on every request
2. **Least Privilege:** RBAC with 5 roles, granular permissions
3. **Assume Breach:** All files scanned for malware
4. **Continuous Validation:** Token validation + MFA for sensitive actions
5. **Account Protection:** Automatic lockout after 5 failed attempts

### ✅ Authentication & Authorization
- **Password Security:** Argon2id hashing (industry best practice)
- **Multi-Factor Authentication:** Email OTP (6-digit, 5-min expiry)
- **Account Lockout:** 5 failed attempts = 60-min lock + password reset
- **JWT Tokens:** Role-based claims, validated on every request
- **Non-Office Hours Alerts:** Admins notified of unusual login times

### ✅ File Security
- **Layer 1:** File size validation (max 10MB)
- **Layer 2:** MIME type whitelist
- **Layer 3:** SHA-256 deduplication
- **Layer 4:** ClamAV malware scanning
- **Layer 5:** Database storage (BYTEA, not filesystem)
- **MFA Required:** For sensitive file downloads

### ✅ Role-Based Access Control
- **5 Roles:** Super Admin, Accountant, HR, Marketing, Sales
- **Permission Matrix:** Granular control over who can do what
- **Guards:** Automatic enforcement at endpoint level
- **Decorators:** Simple, declarative permission syntax

### ✅ Business Modules
- **Purchase Requests:** Create, submit, approve/reject workflow
- **Claims Management:** Upload receipts, verify, process payments
- **Employee Management:** CRUD operations, document handling
- **Revenue Tracking:** Record and analyze financial data
- **Announcements:** System-wide notifications with priorities

---

## 📋 ROLE PERMISSION MATRIX

| Feature | Super Admin | Accountant | HR | Marketing | Sales |
|---------|-------------|------------|-----|-----------|-------|
| **User Management** |
| Create Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| View All Users | ✅ | ❌ | ✅ | ❌ | ❌ |
| Suspend Users | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Employee Management** |
| Create Employees | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Employees | ✅ | ✅ | ✅ | ❌ | ❌ |
| Update Employees | ✅ | ❌ | ✅ | ❌ | ❌ |
| **Purchase Requests** |
| Create PR | ✅ | ❌ | ❌ | ✅ | ✅ |
| View Own PR | ✅ | ❌ | ❌ | ✅ | ✅ |
| View All PR | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve PR | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Claims** |
| Submit Claims | ✅ | ❌ | ❌ | ✅ | ✅ |
| View All Claims | ✅ | ✅ | ❌ | ❌ | ❌ |
| Verify Claims | ✅ | ✅ | ❌ | ❌ | ❌ |
| Process Claims | ✅ | ✅ | ❌ | ❌ | ❌ |
| Download Receipts | ✅ | ✅ | ❌ | ✅* | ✅* |
| **Revenue** |
| Create Revenue | ✅ | ✅ | ❌ | ❌ | ❌ |
| View Revenue | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Announcements** |
| Create Announcements | ✅ | ❌ | ✅ | ❌ | ❌ |
| View Announcements | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Audit Logs** |
| View Audit Logs | ✅ | ❌ | ❌ | ❌ | ❌ |

*\* Can only download their own receipts*

---

## 🚀 GETTING STARTED

### Prerequisites
```bash
# Required Software
- Node.js v18+
- PostgreSQL v14+
- npm or yarn
- PM2 (for production)
- ClamAV (for malware scanning)
```

### Quick Setup (Development)

```bash
# 1. Clone repository
git clone <your-repo-url>
cd fyp_system

# 2. Setup Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run build
npm run start:dev

# 3. Setup Frontend (in new terminal)
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local with your configuration
npm run dev

# 4. Access Application
# Frontend: http://localhost:3001
# Backend: http://localhost:3000
```

### Production Deployment

```bash
# 1. Build both applications
cd backend && npm run build
cd ../frontend && npm run build

# 2. Start with PM2
cd ..
pm2 start ecosystem.config.js

# 3. Setup Nginx (optional but recommended)
sudo cp nginx.conf /etc/nginx/nginx.conf
sudo nginx -s reload
```

---

## 📚 RECOMMENDED READING ORDER

### For Complete Understanding:
1. **Start with Part 1** - Understand architecture and authentication
2. **Read Part 2** - Learn about RBAC and API security
3. **Study Part 3** - Implement file security and frontend
4. **Finish with Part 4** - Deploy and test the system

### For Specific Tasks:
- **Implementing Authentication:** Part 1 + Part 2
- **Building Frontend:** Part 3 + Part 4 (Dashboard)
- **File Upload Security:** Part 3
- **Deployment:** Part 4
- **Testing:** Part 4

---

## 🔍 TROUBLESHOOTING

### Common Issues

**Issue:** JWT token always returns 401
- **Solution:** Check JWT_SECRET matches between sign and verify
- **Location:** Part 2 → JWT Strategy

**Issue:** ClamAV connection failed
- **Solution:** Ensure ClamAV service is running on port 3310
- **Location:** Part 3 → ClamAV Service

**Issue:** File upload fails with size error
- **Solution:** Check MAX_FILE_SIZE in .env and Nginx client_max_body_size
- **Location:** Part 3 → File Upload Service

**Issue:** CORS errors in frontend
- **Solution:** Verify FRONTEND_URL in backend .env matches frontend URL
- **Location:** Part 2 → Main Configuration

**Issue:** Database connection failed
- **Solution:** Check database credentials in .env
- **Location:** Part 2 → App Module

---

## 📞 SUPPORT & RESOURCES

### Official Documentation
- NestJS: https://docs.nestjs.com
- Next.js: https://nextjs.org/docs
- TypeORM: https://typeorm.io
- PostgreSQL: https://www.postgresql.org/docs

### Security Resources
- OWASP Top 10: https://owasp.org/www-project-top-ten
- Argon2: https://github.com/P-H-C/phc-winner-argon2
- JWT Best Practices: https://jwt.io/introduction

---

## 📝 FINAL NOTES

This documentation provides a **complete, production-ready implementation** of a Zero Trust Access Control System. All code samples are tested and functional. However, you should:

1. **Customize** the code to fit your specific requirements
2. **Review** all security settings before production deployment
3. **Test** thoroughly in a staging environment
4. **Monitor** the application in production
5. **Update** dependencies regularly for security patches

**Good luck with your Final Year Project! 🎓**

---

**Created:** January 6, 2026  
**Version:** 1.0  
**Status:** Complete Implementation Guide  
**Total Parts:** 4 comprehensive documents
