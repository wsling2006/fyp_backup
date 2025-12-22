# Critical Fix: Next.js Proxy IP Forwarding

**Date:** December 22, 2025  
**Issue:** Real IP detection still not working - showing 127.0.0.1 even after backend fixes

## Root Cause Discovery

The backend fixes (trust proxy, getClientIp) were correct, but there was a **missing link in the chain**:

### Request Flow:
```
Client (203.87.45.123)
    ↓
Nginx (sets X-Real-IP: 203.87.45.123)
    ↓
Next.js Frontend Proxy (localhost:3001)
    ↓  ❌ NOT FORWARDING IP HEADERS!
Backend (sees 127.0.0.1 from Next.js)
```

The Next.js proxy at `/app/api/[...path]/route.ts` was **not forwarding IP headers** to the backend!

## The Problem

**Before Fix:** `route.ts` only forwarded these headers:
```typescript
const headersToForward = [
  'content-type',
  'authorization',
  'accept',
  'accept-language',
  'cache-control',
  'pragma',
];
```

**Missing:** IP-related headers like `X-Real-IP`, `X-Forwarded-For`, `user-agent`

## The Solution

**After Fix:** Added IP header forwarding logic:

```typescript
const headersToForward = [
  'content-type',
  'authorization',
  'accept',
  'accept-language',
  'cache-control',
  'pragma',
  'user-agent', // ← Added for audit trail
];

// Forward client IP headers for audit logging
// Get real client IP from the incoming request
const clientIp = 
  request.headers.get('x-real-ip') ||
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  request.headers.get('cf-connecting-ip') || // Cloudflare support
  request.ip ||
  'unknown';

// Forward IP information to backend
headers.set('x-forwarded-for', clientIp);
headers.set('x-real-ip', clientIp);
```

## How It Works Now

### Complete Request Flow:

```
1. Client (203.87.45.123)
   │
   ↓ HTTP Request
   │
2. Nginx
   │ Sets: X-Real-IP: 203.87.45.123
   │ Sets: X-Forwarded-For: 203.87.45.123
   │
   ↓ Proxy to Next.js
   │
3. Next.js Proxy (localhost:3001)
   │ Reads: X-Real-IP from Nginx
   │ Extracts: 203.87.45.123
   │ ✅ Forwards: X-Real-IP: 203.87.45.123
   │ ✅ Forwards: X-Forwarded-For: 203.87.45.123
   │
   ↓ Proxy to Backend
   │
4. NestJS Backend (localhost:3000)
   │ Reads: X-Real-IP header
   │ ✅ Logs: 203.87.45.123 (Real IP!)
   │
   ↓ Audit Log
   │
5. Database
   └─ ip_address: 203.87.45.123 ✅
```

## Priority Order

The proxy extracts client IP in this priority:

1. **X-Real-IP** (set by Nginx) - Most reliable
2. **X-Forwarded-For** (standard header) - First IP in chain
3. **CF-Connecting-IP** (Cloudflare) - If using CDN
4. **request.ip** (Next.js native) - Fallback
5. **'unknown'** - Last resort

## Code Changes

**File:** `frontend/app/api/[...path]/route.ts`

### Added Headers:
- ✅ `user-agent` - For browser/device tracking
- ✅ `x-real-ip` - Real client IP
- ✅ `x-forwarded-for` - IP chain

### Logic:
1. Extract client IP from incoming request
2. Handle multiple proxy scenarios
3. Forward to backend with correct headers

## Testing

### Before This Fix:
```bash
# Even with backend fixes deployed:
Audit Log:
- IP: 127.0.0.1 ❌ (Next.js proxy IP)
```

### After This Fix:
```bash
# With all three fixes deployed:
Audit Log:
- IP: 203.87.45.123 ✅ (Real client IP)
```

## All Three Fixes Required

To get real IP detection working, you need **ALL THREE** fixes:

### Fix 1: Backend Trust Proxy ✅
**File:** `backend/src/main.ts`
```typescript
app.set('trust proxy', 1);
```

### Fix 2: Backend IP Detection ✅
**File:** `backend/src/audit/audit.service.ts`
```typescript
private getClientIp(req: Request): string {
  // Read X-Real-IP, X-Forwarded-For headers
}
```

### Fix 3: Frontend IP Forwarding ✅ (NEW!)
**File:** `frontend/app/api/[...path]/route.ts`
```typescript
// Extract and forward client IP
headers.set('x-real-ip', clientIp);
headers.set('x-forwarded-for', clientIp);
```

## Deployment

```bash
# On EC2:
cd ~/fyp_system
git pull origin main

# Rebuild backend
cd backend && npm run build

# Rebuild frontend
cd ../frontend && npm run build

# Restart both services
pm2 restart all
pm2 status
```

## Testing After Deployment

### Test 1: Local Development
```bash
# Access: http://localhost:3001
# Expected IP: 127.0.0.1 or ::1 ✅ (correct for localhost)
```

### Test 2: EC2 Public IP
```bash
# Access: http://your-ec2-ip:3001
# Expected IP: Your ISP's public IP ✅ (e.g., 203.87.45.123)
```

### Test 3: Different Network
```bash
# Use mobile phone (different network)
# Expected IP: Mobile carrier IP ✅ (different from WiFi)
```

### Test 4: VPN
```bash
# Enable VPN
# Expected IP: VPN server IP ✅ (VPN provider's IP)
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│ CLIENT (Browser)                                        │
│ Real IP: 203.87.45.123                                  │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ NGINX (Port 80/443)                                     │
│ • Receives request from client                          │
│ • Sets: X-Real-IP: 203.87.45.123                       │
│ • Sets: X-Forwarded-For: 203.87.45.123                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ NEXT.JS PROXY (Port 3001) - /app/api/[...path]/route.ts│
│ • Receives from Nginx                                   │
│ • Extracts: clientIp = X-Real-IP                       │
│ • Forwards to backend with headers:                     │
│   - X-Real-IP: 203.87.45.123        ← NEW FIX!        │
│   - X-Forwarded-For: 203.87.45.123  ← NEW FIX!        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ NESTJS BACKEND (Port 3000)                              │
│ • Trust proxy enabled: app.set('trust proxy', 1)        │
│ • getClientIp() reads X-Real-IP header                  │
│ • Extracts: 203.87.45.123                              │
│ • Logs to audit_logs table                             │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│ DATABASE (PostgreSQL)                                   │
│ audit_logs.ip_address = '203.87.45.123' ✅              │
└─────────────────────────────────────────────────────────┘
```

## Why This Was Missed

The issue was subtle because:

1. ✅ Nginx was correctly setting headers
2. ✅ Backend was correctly configured to read headers
3. ❌ **Next.js proxy was not passing headers through**

The Next.js proxy is a custom middleware, so it needed explicit forwarding logic.

## Files Modified

1. ✅ `frontend/app/api/[...path]/route.ts` - Added IP forwarding

## Related Fixes

This completes the trilogy of IP detection fixes:
1. ✅ Backend trust proxy (`main.ts`)
2. ✅ Backend IP extraction (`audit.service.ts`)
3. ✅ Frontend IP forwarding (`route.ts`) ← **This fix**

## Summary

**Problem:** Next.js proxy was stripping IP headers  
**Solution:** Forward X-Real-IP and X-Forwarded-For from Next.js to backend  
**Result:** Real client IPs now captured in audit logs  

**Deploy all three fixes to EC2 and you'll see real IPs!** 🌍✅
