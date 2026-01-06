# AWS ALB HTTPS Deployment - Readiness Checklist

**Date:** January 6, 2026  
**System:** FYP System (NestJS Backend + Next.js Frontend)  
**Target Architecture:** AWS Application Load Balancer (ALB) with HTTPS

---

## 🎯 Target Architecture

```
Internet (HTTPS/443)
         ↓
    AWS ALB (HTTPS:443)
    ├─ /api/* → Target Group 1 (Backend :3000)
    └─ /*     → Target Group 2 (Frontend :3001)
         ↓
    EC2 Instance (Private IP)
    ├─ Backend: 0.0.0.0:3000
    └─ Frontend: 0.0.0.0:3001
```

---

## ✅ PASSED CHECKS

### Backend (NestJS)
- ✅ **Port Binding**: Correctly binds to `0.0.0.0:3000` in production
- ✅ **Trust Proxy**: Enabled (`app.set('trust proxy', 1)`) - will receive ALB headers
- ✅ **HTTPS Compatible**: No SSL termination in app - ALB handles it ✓

### Frontend (Next.js)
- ✅ **Relative API Paths**: Uses `/api/*` for all API calls (domain-agnostic)
- ✅ **Port Ready**: Can be accessed on port 3001
- ✅ **Proxy Architecture**: Has Next.js API proxy for backend communication

---

## ❌ CRITICAL ISSUES (MUST FIX)

### 1. 🚨 **CORS Configuration - WILL BREAK WITH ALB**

**Location:** `backend/src/main.ts` (Line 25)

**Current Problem:**
```typescript
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

app.enableCors({
  origin: frontendUrl,  // ❌ Only allows localhost:3001
  credentials: true,
});
```

**Issue:** 
- ALB will route requests from `https://yourdomain.com` to backend
- Backend only accepts `http://localhost:3001` 
- **Result: All API calls will be CORS-blocked** ❌

**Solution Required:**
```typescript
// For ALB deployment, CORS should accept requests from:
// 1. The public HTTPS domain (browser requests)
// 2. localhost:3001 (Next.js server-side proxy)

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3001',  // Next.js proxy
  process.env.PUBLIC_DOMAIN,  // https://yourdomain.com (ALB)
  'https://yourdomain.com',
  'https://www.yourdomain.com',
].filter(Boolean);

app.enableCors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Forwarded-For', 'X-Real-IP'],
});
```

---

### 2. 🚨 **Hardcoded URLs in Frontend Auth**

**Location:** `frontend/lib/auth.ts` (Lines 3, 12)

**Current Problem:**
```typescript
const res = await fetch('http://localhost:3000/auth/login', { ... });  // ❌
const res = await fetch('http://localhost:3000/auth/verify-otp', { ... }); // ❌
```

**Issue:**
- Hardcoded `localhost:3000` URLs bypass the Next.js proxy
- Will fail in production (browser can't reach localhost)
- **Result: Login and OTP verification will fail** ❌

**Solution Required:**
```typescript
// Use relative paths through Next.js proxy
const res = await fetch('/api/auth/login', { ... });  // ✅
const res = await fetch('/api/auth/verify-otp', { ... }); // ✅
```

---

### 3. ⚠️ **Frontend Port Binding**

**Location:** `frontend/` (Next.js config)

**Current Status:** 
- Frontend likely binds to `0.0.0.0:3001` but not explicitly configured

**Required Verification:**
```bash
# When starting frontend, ensure it binds to 0.0.0.0:3001
# Check ecosystem.config.js or package.json scripts
```

**Recommended:** Add to `.env.production`:
```bash
HOST=0.0.0.0
PORT=3001
```

---

### 4. ⚠️ **Missing Health Check Endpoints**

**Current Status:** No health check endpoints found

**Issue:** ALB needs health check endpoints to monitor instance health

**Solution Required:**

**Backend:** `backend/src/app.controller.ts`
```typescript
@Get('health')
getHealth() {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'backend' 
  };
}

@Get('health/ready')
async getReadiness() {
  // Check database connection
  try {
    await this.connection.query('SELECT 1');
    return { status: 'ready', database: 'connected' };
  } catch (error) {
    throw new HttpException('Service not ready', 503);
  }
}
```

**Frontend:** Create `frontend/app/health/route.ts`
```typescript
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'frontend' 
  });
}
```

---

### 5. ⚠️ **Missing HTTPS-Aware Security Headers**

**Current Status:** Helmet installed but not configured

**Solution Required:** `backend/src/main.ts`
```typescript
import helmet from 'helmet';

// Add after app creation
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Trust ALB's X-Forwarded-* headers
app.set('trust proxy', 1);
```

---

### 6. ⚠️ **Protocol Awareness for Cookies**

**Current Status:** No secure cookie configuration found

**Issue:** Cookies must be secure in production (HTTPS)

**Solution Required:** When setting cookies (if any):
```typescript
// In any cookie-setting middleware or guards
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,  // Only send over HTTPS in production
  sameSite: 'strict' as const,
  maxAge: 3600000,
};
```

---

### 7. ⚠️ **Environment Variables Update Required**

**Backend `.env` (Production):**
```bash
NODE_ENV=production
PORT=3000

# CORS Configuration
FRONTEND_URL=http://localhost:3001  # Next.js proxy (internal)
PUBLIC_DOMAIN=https://yourdomain.com  # Public ALB domain

# Database
DB_HOST=your-rds-endpoint.amazonaws.com
DB_PORT=5432
DB_USER=your_user
DB_PASSWORD=your_password
DB_NAME=fyp_system

# JWT
JWT_SECRET=your-production-secret-key
JWT_EXPIRES_IN=1h

# Email
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# Admin
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=secure_password
```

**Frontend `.env.production`:**
```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# API Configuration
NEXT_PUBLIC_API_BASE=/api  # Keep as-is
BACKEND_URL=http://localhost:3000  # Internal backend

# Optional: If you need public domain for client-side redirects
NEXT_PUBLIC_DOMAIN=https://yourdomain.com
```

---

## 🔧 RECOMMENDED IMPROVEMENTS

### 1. Add Request Logging for ALB Headers
```typescript
// backend/src/main.ts - Add middleware
app.use((req, res, next) => {
  console.log('[ALB Headers]', {
    'x-forwarded-proto': req.headers['x-forwarded-proto'],
    'x-forwarded-for': req.headers['x-forwarded-for'],
    'x-forwarded-port': req.headers['x-forwarded-port'],
    'x-real-ip': req.headers['x-real-ip'],
  });
  next();
});
```

### 2. Add Graceful Shutdown
```typescript
// backend/src/main.ts
async function bootstrap() {
  // ... existing code ...
  
  // Graceful shutdown on SIGTERM (ALB drain)
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing server gracefully...');
    await app.close();
    process.exit(0);
  });
}
```

### 3. Configure Next.js for ALB
```javascript
// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Trust ALB proxy headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
  
  // Disable X-Powered-By header
  poweredByHeader: false,
};

module.exports = nextConfig;
```

---

## 📋 ALB CONFIGURATION CHECKLIST

### ALB Setup
- [ ] Create ALB in same VPC as EC2
- [ ] Attach ACM SSL Certificate to ALB (HTTPS:443)
- [ ] Create Target Group 1: Backend (Port 3000)
  - Health Check: `/health` or `/health/ready`
  - Healthy threshold: 2
  - Unhealthy threshold: 3
  - Timeout: 5s
  - Interval: 30s
- [ ] Create Target Group 2: Frontend (Port 3001)
  - Health Check: `/health`
  - Healthy threshold: 2
  - Unhealthy threshold: 3
  - Timeout: 5s
  - Interval: 30s
- [ ] Register EC2 instance to both target groups

### ALB Listener Rules
- [ ] **HTTPS:443 Listener**
  - Rule 1: `/api/*` → Forward to Target Group 1 (Backend :3000)
  - Rule 2: `/*` (default) → Forward to Target Group 2 (Frontend :3001)
- [ ] **HTTP:80 Listener** (Optional)
  - Redirect to HTTPS:443

### Security Groups
- [ ] **ALB Security Group**
  - Inbound: 443 (HTTPS) from 0.0.0.0/0
  - Inbound: 80 (HTTP) from 0.0.0.0/0 (for redirect)
  - Outbound: 3000, 3001 to EC2 Security Group
  
- [ ] **EC2 Security Group**
  - Inbound: 22 (SSH) from your IP only
  - Inbound: 3000 from ALB Security Group only
  - Inbound: 3001 from ALB Security Group only
  - Outbound: All traffic

### DNS Configuration
- [ ] Point domain A record to ALB DNS name
- [ ] Or use Route 53 Alias record

---

## 🚀 DEPLOYMENT STEPS

### 1. Fix Critical Issues (Required)
```bash
# On your local machine
cd /Users/jw/fyp_system

# Fix backend CORS
# Edit backend/src/main.ts - implement CORS fix above

# Fix frontend auth URLs
# Edit frontend/lib/auth.ts - change to /api/auth/*

# Add health checks
# Edit backend/src/app.controller.ts - add health endpoint
# Create frontend/app/health/route.ts - add health endpoint

# Add helmet security
# Edit backend/src/main.ts - add helmet configuration

# Update environment files
# Edit backend/.env (production values)
# Edit frontend/.env.production (production values)
```

### 2. Build and Test Locally
```bash
# Backend
cd backend
npm run build
NODE_ENV=production npm run start:prod

# Frontend (separate terminal)
cd frontend
npm run build
NODE_ENV=production npm start
```

### 3. Deploy to EC2
```bash
# SSH to EC2
ssh -i your-key.pem ec2-user@your-ec2-ip

# Pull latest code
cd /home/ec2-user/fyp_system
git pull origin main

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Build
cd backend && npm run build
cd ../frontend && npm run build

# Set environment variables
nano backend/.env  # Set production values
nano frontend/.env.production  # Set production values

# Start with PM2
pm2 delete all  # Stop old processes
pm2 start ecosystem.config.js --env production
pm2 save
pm2 logs  # Check for errors
```

### 4. Configure ALB (AWS Console)
- Create ALB following checklist above
- Set up target groups with health checks
- Configure listener rules
- Update security groups
- Test health endpoints

### 5. Update DNS
- Point your domain to ALB
- Wait for DNS propagation (5-60 minutes)

### 6. Test End-to-End
```bash
# Test from your browser
https://yourdomain.com  # Should load frontend
https://yourdomain.com/api/health  # Should return backend health

# Test login flow
# Test file uploads
# Test all major features
```

---

## 🔍 TESTING CHECKLIST

After deployment:
- [ ] Frontend loads over HTTPS
- [ ] Login works (no CORS errors)
- [ ] OTP verification works
- [ ] API calls successful (check browser network tab)
- [ ] File uploads work
- [ ] File downloads work
- [ ] Session persistence works
- [ ] Health checks return 200 OK
- [ ] Mixed content warnings (check browser console)
- [ ] SSL certificate valid (no browser warnings)

---

## ⚠️ COMMON ISSUES & FIXES

### Issue: "Mixed Content" warnings
**Cause:** Frontend making HTTP requests over HTTPS page  
**Fix:** Ensure all API calls use relative paths (`/api/*`)

### Issue: CORS errors after ALB deployment
**Cause:** Backend CORS not configured for ALB domain  
**Fix:** Update CORS origins to include public domain

### Issue: Health checks failing
**Cause:** No health endpoint or wrong path  
**Fix:** Add `/health` endpoints to both apps

### Issue: Session/cookies not working
**Cause:** Cookies not marked as secure  
**Fix:** Set `secure: true` for cookies in production

### Issue: Real client IP not captured
**Cause:** Not reading ALB headers  
**Fix:** Ensure `trust proxy: 1` is set and read `x-forwarded-for`

---

## 📊 SUMMARY

### ✅ Ready for Deployment:
- Backend port binding (0.0.0.0:3000)
- Trust proxy enabled
- Frontend uses relative API paths (mostly)

### ❌ MUST Fix Before Deployment:
1. **CORS configuration** (critical - will block all API calls)
2. **Hardcoded URLs in auth.ts** (critical - login will fail)
3. **Health check endpoints** (required for ALB)
4. **Helmet security headers** (production best practice)
5. **Environment variables** (production values)

### ⏱️ Estimated Fix Time: 1-2 hours

### 🎯 Priority Order:
1. Fix `frontend/lib/auth.ts` hardcoded URLs (5 min)
2. Fix `backend/src/main.ts` CORS configuration (15 min)
3. Add health check endpoints (20 min)
4. Configure helmet and security (15 min)
5. Update environment files (10 min)
6. Test locally (30 min)
7. Deploy to EC2 + Configure ALB (30-60 min)

---

**Status:** ⚠️ **NOT READY - Critical fixes required**  
**Next Step:** Fix the 2 critical issues (#1 and #2) immediately
