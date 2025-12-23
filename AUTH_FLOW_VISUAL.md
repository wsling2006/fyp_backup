# JWT Authentication Flow - Visual Guide

## 🔄 Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER LOGIN FLOW                                 │
└─────────────────────────────────────────────────────────────────────────┘

1. USER ENTERS CREDENTIALS
   ┌──────────┐
   │ Browser  │ → POST /api/auth/login
   │          │   { email: "sales@test.com", password: "..." }
   └──────────┘
        ↓
        
2. BACKEND AUTH SERVICE
   ┌──────────────────────┐
   │ auth.service.ts      │ → Verify password with argon2
   │                      │ → Check if account is active
   │                      │ → Generate JWT token
   └──────────────────────┘
        ↓
        
3. JWT TOKEN CREATION
   ┌──────────────────────────────────────────┐
   │ JWT Payload:                             │
   │ {                                        │
   │   sub: "user-uuid-1234",    ← User ID    │
   │   role: "sales_department", ← User Role  │
   │   iat: 1234567890,          ← Issued At  │
   │   exp: 1234567890           ← Expires    │
   │ }                                        │
   └──────────────────────────────────────────┘
        ↓
        
4. FRONTEND STORES TOKEN
   ┌──────────────────────────────────────────┐
   │ localStorage.setItem('token', JWT)       │
   │ localStorage.setItem('user', {           │
   │   id: "user-uuid-1234",                  │
   │   email: "sales@test.com",               │
   │   role: "sales_department"               │
   │ })                                       │
   └──────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                     API REQUEST FLOW                                     │
└─────────────────────────────────────────────────────────────────────────┘

1. USER NAVIGATES TO /purchase-requests
   ┌──────────┐
   │ Browser  │ → page.tsx loads
   │          │ → useEffect() → loadRequests()
   └──────────┘
        ↓
        
2. API CLIENT ADDS TOKEN
   ┌──────────────────────────────────────────┐
   │ api.ts (axios interceptor)               │
   │                                          │
   │ request.headers.Authorization =          │
   │   `Bearer ${localStorage.getItem('token')}`│
   └──────────────────────────────────────────┘
        ↓
        
3. HTTP REQUEST
   GET /api/purchase-requests
   Headers:
   ┌─────────────────────────────────────┐
   │ Authorization: Bearer eyJhbGc...     │ ← JWT Token
   │ Content-Type: application/json      │
   └─────────────────────────────────────┘
        ↓
        
4. NESTJS MIDDLEWARE CHAIN
   ┌──────────────────────────────────────┐
   │ 1. JwtAuthGuard                      │
   │    - Extracts token from header      │
   │    - Calls JwtStrategy.validate()    │
   │                                      │
   │ 2. JwtStrategy.validate()            │
   │    - Decodes JWT payload             │
   │    - Fetches user from database      │
   │    - Returns: {                      │
   │        userId: user.id,              │
   │        username: user.email,         │
   │        role: user.role               │
   │      }                               │
   │    - Attaches to req.user            │
   │                                      │
   │ 3. RolesGuard                        │
   │    - Reads @Roles() decorator        │
   │    - Checks req.user.role            │
   │    - Allows/denies access            │
   └──────────────────────────────────────┘
        ↓
        
5. CONTROLLER METHOD
   ┌──────────────────────────────────────────┐
   │ @Get()                                   │
   │ @Roles(Role.SALES, Role.MARKETING, ...)  │
   │ async getAllPurchaseRequests(@Req() req) │
   │                                          │
   │ req.user = {                             │
   │   userId: "user-uuid-1234",              │
   │   username: "sales@test.com",            │
   │   role: "sales_department"               │
   │ }                                        │
   └──────────────────────────────────────────┘
        ↓
        
6. SERVICE LOGIC
   - If role is SALES/MARKETING: Return only user's own requests
   - If role is ACCOUNTANT/SUPER_ADMIN: Return all requests
        ↓
        
7. RESPONSE
   200 OK
   [{ id: "...", title: "...", ... }]

┌─────────────────────────────────────────────────────────────────────────┐
│                     403 ERROR SCENARIOS                                  │
└─────────────────────────────────────────────────────────────────────────┘

SCENARIO 1: NO TOKEN
┌──────────┐
│ Browser  │ → GET /api/purchase-requests
│          │   ❌ No Authorization header
└──────────┘
     ↓
JwtAuthGuard → 401 Unauthorized

SCENARIO 2: INVALID/EXPIRED TOKEN
┌──────────┐
│ Browser  │ → GET /api/purchase-requests
│          │   Authorization: Bearer [expired-token]
└──────────┘
     ↓
JwtStrategy → 401 Unauthorized (Token expired)

SCENARIO 3: WRONG ROLE
┌──────────────────────┐
│ JWT Payload:         │
│ { role: "sales" }    │ ❌ Wrong! Should be "sales_department"
└──────────────────────┘
     ↓
RolesGuard → Check: "sales" in [Role.SALES, Role.MARKETING, ...]
          → "sales" ≠ "sales_department"
          → 403 Forbidden

SCENARIO 4: USER ROLE IN DB IS WRONG
Database: users table
┌─────────────────────┬──────┐
│ email               │ role │
├─────────────────────┼──────┤
│ sales@test.com      │ sales│ ❌ Wrong!
└─────────────────────┴──────┘
     ↓
JWT created with role="sales"
     ↓
RolesGuard fails because "sales" ≠ "sales_department"

┌─────────────────────────────────────────────────────────────────────────┐
│                     CORRECT FLOW                                        │
└─────────────────────────────────────────────────────────────────────────┘

Database: users table
┌─────────────────────┬──────────────────┐
│ email               │ role             │
├─────────────────────┼──────────────────┤
│ sales@test.com      │ sales_department │ ✅ Correct!
└─────────────────────┴──────────────────┘
     ↓
LOGIN → JWT created with role="sales_department"
     ↓
STORED in localStorage:
- token: "eyJhbGc..."
- user: { role: "sales_department" }
     ↓
API REQUEST → Authorization: Bearer [token]
     ↓
JwtStrategy → Extract user from DB
           → user.role = "sales_department"
           → req.user = { userId, username, role: "sales_department" }
     ↓
RolesGuard → @Roles(Role.SALES) = "sales_department"
          → req.user.role = "sales_department"
          → ✅ Match! Allow access
     ↓
200 OK → Purchase requests returned

┌─────────────────────────────────────────────────────────────────────────┐
│                     DEBUG CHECKPOINTS                                    │
└─────────────────────────────────────────────────────────────────────────┘

CHECKPOINT 1: localStorage
console.log(localStorage.getItem('token'));
console.log(localStorage.getItem('user'));
✅ Should exist and be populated

CHECKPOINT 2: JWT Payload
const token = localStorage.getItem('token');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload.role);
✅ Should be "sales_department" (exact match)

CHECKPOINT 3: Authorization Header
Open Network tab → Find API request → Headers
✅ Should see: Authorization: Bearer [long-token-string]

CHECKPOINT 4: Database Role
sudo -u postgres psql -d fyp_db -c "SELECT email, role FROM users WHERE email='sales@test.com';"
✅ role column should be "sales_department"

CHECKPOINT 5: Backend Logs
pm2 logs backend
✅ Should NOT see JWT validation errors or role mismatch errors

┌─────────────────────────────────────────────────────────────────────────┐
│                     FIX FLOWCHART                                        │
└─────────────────────────────────────────────────────────────────────────┘

START: User gets 403 error
    ↓
Clear localStorage?
    ├─ YES → Re-login → Test
    │         ↓
    │      Works? → ✅ FIXED!
    │         ↓ NO
    └─ NO → Check JWT payload
              ↓
          Role correct? (sales_department)
              ├─ YES → Check Authorization header
              │         ↓
              │     Header present?
              │         ├─ YES → Check backend logs
              │         │         ↓
              │         │     Errors?
              │         │         ├─ YES → Fix error
              │         │         └─ NO → Contact support
              │         └─ NO → Clear cache → Re-login
              │
              └─ NO → Check database role
                        ↓
                    Role = "sales_department"?
                        ├─ YES → Unclear issue → Contact support
                        └─ NO → UPDATE users SET role='sales_department'
                                → User must logout & re-login
                                → ✅ FIXED!

```

## 🎯 Key Takeaways

1. **JWT Token must contain exact role string:** `sales_department` (not `sales`)
2. **Database user.role must match Role enum:** `sales_department`
3. **Authorization header must be present:** `Bearer <token>`
4. **Token must not be expired:** Check `exp` claim
5. **User must re-login after role changes:** To get new JWT with updated role

## 🚀 Quick Debug Command

Run this in browser console to check everything at once:
```javascript
(function() {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  
  if (!token) {
    console.error('❌ No token found');
    return;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = new Date();
    const exp = new Date(payload.exp * 1000);
    
    console.log('=== AUTH STATUS ===');
    console.log(token ? '✅' : '❌', 'Token exists');
    console.log(user.role ? '✅' : '❌', 'User role:', user.role);
    console.log(payload.role ? '✅' : '❌', 'JWT role:', payload.role);
    console.log(now < exp ? '✅' : '❌', 'Token valid until:', exp);
    console.log(payload.role === user.role ? '✅' : '❌', 'Roles match');
    console.log(['sales_department','marketing','accountant','super_admin'].includes(payload.role) ? '✅' : '❌', 'Role is valid');
    
    if (now >= exp) console.error('🚨 TOKEN EXPIRED - Re-login required');
    if (payload.role !== user.role) console.error('🚨 ROLE MISMATCH - Clear cache & re-login');
    if (!['sales_department','marketing','accountant','super_admin'].includes(payload.role)) {
      console.error('🚨 INVALID ROLE - Check database');
    }
  } catch (e) {
    console.error('❌ Failed to decode token:', e);
  }
})();
```
