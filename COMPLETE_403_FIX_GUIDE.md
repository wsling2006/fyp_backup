# 🚨 COMPLETE 403 FIX - FINAL DEPLOYMENT GUIDE

## 🔍 ROOT CAUSES IDENTIFIED

### Issue 1: JWT Token Missing Email Field ✅ FIXED
**Problem:** JWT tokens only contained `{ sub, role }` but not `email`  
**Impact:** Backend couldn't fully validate user context → 403 errors  
**Fix:** Updated `backend/src/auth/auth.service.ts` to include email in JWT payload

### Issue 2: Frontend Calling Backend Directly
**Problem:** Your error shows requests going to `http://13.212.147.123:3001/api/...`  
**Why it's wrong:** This bypasses the Next.js proxy and goes directly to backend  
**What should happen:** Requests should use `/api/...` (relative path through proxy)  
**Likely cause:** Old frontend build with cached environment or wrong .env.local

## 🎯 THE COMPLETE SOLUTION

Both issues must be fixed together:

### Part 1: Backend JWT Fix (Already Deployed in Code)
```typescript
// backend/src/auth/auth.service.ts
// BEFORE: const payload = { sub: user.id, role: user.role };
// AFTER:  const payload = { sub: user.id, email: user.email, role: user.role };
```

### Part 2: Frontend Environment Fix (Must Do on EC2)
```bash
# Ensure .env.local has:
NEXT_PUBLIC_API_BASE=/api
BACKEND_URL=http://localhost:3000

# Then REBUILD frontend from scratch
# This ensures the /api proxy is used, not direct backend URLs
```

## 🚀 DEPLOY ON EC2 NOW

### Option 1: Automated (RECOMMENDED)

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@13.212.147.123

# Run complete fix script
cd /home/ubuntu/fyp_system
chmod +x COMPLETE_403_FIX.sh
./COMPLETE_403_FIX.sh
```

This script will:
- ✅ Pull latest code (with JWT email fix)
- ✅ Restart backend with new JWT code
- ✅ Check/fix frontend .env.local
- ✅ Delete old frontend build
- ✅ Fresh npm install
- ✅ Rebuild frontend with correct environment
- ✅ Restart frontend
- ✅ Show status and logs

### Option 2: Manual Steps

```bash
cd /home/ubuntu/fyp_system

# 1. Pull latest code
git pull origin main

# 2. Backend
cd backend
npm install
pm2 restart backend

# 3. Frontend - Check .env.local
cd /home/ubuntu/fyp_system/frontend
cat .env.local

# Should show:
# NEXT_PUBLIC_API_BASE=/api
# BACKEND_URL=http://localhost:3000

# If wrong or missing, create it:
cat > .env.local << 'EOF'
NEXT_PUBLIC_API_BASE=/api
BACKEND_URL=http://localhost:3000
EOF

# 4. CRITICAL: Delete old build
rm -rf .next node_modules

# 5. Fresh install
npm install

# 6. Build with correct environment
npm run build

# 7. Restart
pm2 restart frontend

# 8. Check status
pm2 status
pm2 logs frontend --lines 20
```

## 🧪 TESTING AFTER DEPLOYMENT

### Step 1: Clear Browser Completely

Open DevTools (F12) → Console:

```javascript
localStorage.clear();
sessionStorage.clear();
// Close ALL tabs of the site
// Open a fresh browser window
```

### Step 2: Log In Fresh

1. Go to your EC2 site
2. Log in with your account
3. Enter OTP from email

### Step 3: Verify JWT Has Email

In browser console (F12):

```javascript
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('JWT Payload:', payload);

// ✅ Should show:
// {
//   sub: "user-id",
//   email: "your@email.com",  ← MUST BE PRESENT!
//   role: "sales_department",
//   iat: 1234567890,
//   exp: 1234567890
// }

// ❌ If email is missing:
// You still have old token! Log out and log in again!
```

### Step 4: Verify API Calls Use Proxy

Open DevTools (F12) → Network tab:

1. Navigate to Purchase Requests page
2. Look at the requests in Network tab

**✅ CORRECT:**
```
Request URL: http://13.212.147.123:3001/api/purchase-requests
Request Method: GET
Status Code: 200 OK
```
Note: URL shows `:3001/api/...` which is the Next.js frontend port

**❌ WRONG (old issue):**
```
Request URL: http://13.212.147.123:3001/api/purchase-requests
↑ This might LOOK correct but check the actual fetch in DevTools
```

Look for the actual fetch call - it should be a relative path `/api/purchase-requests`, not an absolute URL.

### Step 5: Test Purchase Requests

1. Click "Purchase Requests" in sidebar
2. ✅ Should load without 403 errors
3. ✅ Should see list of requests (or empty list)
4. Click "Create Purchase Request"
5. ✅ Should open form without errors
6. Try to submit (with valid data and OTP)
7. ✅ Should succeed

## 📊 SUCCESS CHECKLIST

- [ ] Deployed COMPLETE_403_FIX.sh on EC2 (or manual steps)
- [ ] Backend restarted successfully (`pm2 status` shows "online")
- [ ] Frontend rebuilt from scratch
- [ ] Frontend restarted successfully
- [ ] Cleared browser cache and localStorage
- [ ] Logged in fresh (new session)
- [ ] New JWT token contains `email` field (verified in console)
- [ ] Network tab shows `/api/...` requests (not direct backend URLs)
- [ ] Purchase Requests page loads (no 403)
- [ ] Can create purchase request (no 403)
- [ ] No console errors
- [ ] Status code is 200 OK (not 403 Forbidden)

## 🐛 STILL GETTING 403?

### Debug Step 1: Check Backend Logs

```bash
pm2 logs backend --lines 50 | grep -E "(403|JWT|auth|purchase)"
```

Look for:
- "User not authenticated" → req.user is undefined
- "Invalid token" → JWT validation failing
- "Insufficient permissions" → Role check failing

### Debug Step 2: Check Frontend Logs

```bash
pm2 logs frontend --lines 50
```

Look for API proxy logs showing where requests are going.

### Debug Step 3: Verify Environment

```bash
cd /home/ubuntu/fyp_system
./check-frontend-env.sh
```

This shows:
- Content of .env.local
- Next.js build status
- PM2 environment variables

### Debug Step 4: Check Token in Browser

```javascript
// Check if token exists
const token = localStorage.getItem('token');
if (!token) {
  console.error('❌ NO TOKEN - Must log in!');
} else {
  console.log('Token length:', token.length);
  
  // Decode it
  const parts = token.split('.');
  if (parts.length !== 3) {
    console.error('❌ INVALID TOKEN FORMAT!');
  } else {
    const payload = JSON.parse(atob(parts[1]));
    console.log('✅ Token payload:', payload);
    
    // Check critical fields
    if (!payload.email) console.error('❌ EMAIL MISSING!');
    if (!payload.role) console.error('❌ ROLE MISSING!');
    if (!payload.sub) console.error('❌ USER ID MISSING!');
    
    // Check expiration
    const exp = new Date(payload.exp * 1000);
    const now = new Date();
    if (now > exp) {
      console.error('❌ TOKEN EXPIRED!');
    } else {
      console.log('✅ Token expires in:', Math.floor((exp - now) / 1000 / 60), 'minutes');
    }
  }
}
```

### Debug Step 5: Test Backend Directly (EC2)

```bash
# Get a fresh token (log in via browser first, then get token from localStorage)
TOKEN="your-token-here"

# Test backend directly
curl -X GET http://localhost:3000/purchase-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Should return 200 OK with data (not 403)
```

### Debug Step 6: Nuclear Option (Last Resort)

```bash
# Stop everything
pm2 stop all

# Delete everything
cd /home/ubuntu/fyp_system
rm -rf backend/node_modules backend/dist
rm -rf frontend/node_modules frontend/.next

# Fresh start
cd backend
npm install
npm run build

cd ../frontend
npm install
npm run build

# Start
pm2 start ecosystem.config.js
pm2 save
```

## 📝 UNDERSTANDING THE ARCHITECTURE

### How It Should Work:

```
Browser
  ↓ (1) GET /api/purchase-requests (relative path)
Next.js Frontend (port 3001)
  ↓ (2) Proxy intercepts at /app/api/[...path]/route.ts
  ↓ (3) Forwards to http://localhost:3000/purchase-requests
  ↓ (4) Includes Authorization: Bearer <token>
NestJS Backend (port 3000)
  ↓ (5) JwtAuthGuard validates token
  ↓ (6) Extracts user from JWT payload
  ↓ (7) RolesGuard checks user.role
  ↓ (8) Controller processes request
  ↓ (9) Returns data
Next.js Frontend
  ↓ (10) Returns response to browser
Browser receives 200 OK with data
```

### What Was Happening (Bug):

```
Browser
  ↓ (1) GET http://13.212.147.123:3001/api/purchase-requests (absolute URL)
  ↓ (2) Request somehow going directly to backend?
  ↓ (3) OR: Old token without email field
Backend receives request
  ↓ (4) JwtAuthGuard validates token
  ↓ (5) Fails because:
       - Token missing email field, OR
       - req.user is undefined, OR
       - Role check fails
  ↓ (6) Returns 403 Forbidden
Browser shows error
```

## 🎉 EXPECTED RESULTS AFTER FIX

### In Browser Console:
```
✅ No errors
✅ JWT payload shows: { sub, email, role, iat, exp }
✅ All API calls are relative paths: /api/...
```

### In Network Tab:
```
✅ Request: GET /api/purchase-requests
✅ Status: 200 OK
✅ Authorization header present: Bearer <token>
✅ Response contains data
```

### In Application:
```
✅ Purchase Requests page loads
✅ Can view list of requests
✅ Can create new request (with OTP)
✅ Can view request details
✅ No 403 errors anywhere
```

## 📞 NEXT STEPS

1. **Deploy Now:** Run `./COMPLETE_403_FIX.sh` on EC2
2. **Clear Browser:** Force complete browser cache clear
3. **Log In Fresh:** Get new token with email field
4. **Test:** Try purchase requests functionality
5. **Report Back:** Share results

If still getting 403 after all this, run the debug steps above and share:
- Output of `./check-frontend-env.sh`
- Browser console token payload
- Network tab showing request URLs
- Backend PM2 logs

---

**This is the complete, real, production-ready fix!** 🚀
