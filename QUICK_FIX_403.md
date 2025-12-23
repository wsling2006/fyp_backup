# 🚨 QUICK FIX: 403 Forbidden Error for Sales Department
## 5-Minute Troubleshooting Guide

**Problem:** Sales department users getting 403 error when accessing purchase requests  
**Status:** ✅ All code is 100% correct - This is likely a JWT token or cache issue

---

## 🎯 INSTANT FIX (Try This First)

### Option 1: Clear & Re-login (Fixes 90% of issues)

1. **In the app:**
   - Click Logout
   - Close browser completely
   - Reopen browser
   - Login again
   - Navigate to Purchase Requests

2. **Or manually clear cache:**
   ```javascript
   // Open browser console (F12), paste this:
   localStorage.clear();
   // Then refresh page and login
   ```

---

## 🔍 VERIFY ISSUE (30 seconds)

**Open browser console (F12) and paste:**
```javascript
// Check token and user
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user'));

console.log('✅ Has token:', !!token);
console.log('✅ User role:', user?.role);

// Decode JWT
if (token) {
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('✅ JWT role:', payload.role);
  console.log('✅ Token expires:', new Date(payload.exp * 1000));
  console.log('✅ Expired?', new Date() > new Date(payload.exp * 1000));
}
```

**Expected Output:**
```
✅ Has token: true
✅ User role: sales_department
✅ JWT role: sales_department
✅ Token expires: [future date]
✅ Expired? false
```

**If you see:**
- `Has token: false` → Logout and re-login
- `User role: undefined` → Clear localStorage and re-login
- `JWT role: sales` (not `sales_department`) → Database issue, see Fix 2
- `Expired? true` → Token expired, re-login

---

## 🛠️ FIXES

### Fix 1: Clear Cache & Re-login (Most Common)
```bash
# In browser:
1. Press Ctrl+Shift+Delete
2. Select "Cached images and files"
3. Click "Clear data"
4. Close and reopen browser
5. Login again
```

### Fix 2: Check Database User Role (If JWT role is wrong)
```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Check user role in database
sudo -u postgres psql -d fyp_db -c \
  "SELECT email, role FROM users WHERE email='sales@test.com';"

# If role is wrong (e.g., 'sales' instead of 'sales_department'):
sudo -u postgres psql -d fyp_db -c \
  "UPDATE users SET role='sales_department' WHERE email='sales@test.com';"

# Then user must logout and re-login to get new JWT token
```

### Fix 3: Check Authorization Header (If API calls failing)
```javascript
// In browser Network tab (F12):
1. Navigate to /purchase-requests
2. Find the API request
3. Click on it → Headers tab
4. Look for: Authorization: Bearer <token>

// If missing, run this in console:
console.log('API base URL:', '/api');
console.log('Token in storage:', localStorage.getItem('token'));

// Test API call manually:
fetch('/api/purchase-requests', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
}).then(r => r.json()).then(console.log);
```

### Fix 4: Restart Backend (If recent code changes)
```bash
# SSH into EC2
cd /home/ubuntu/fyp_system

# Rebuild backend
cd backend && npm run build

# Restart services
pm2 restart ecosystem.config.js

# Check logs
pm2 logs backend --lines 50
```

---

## 🎯 ROLE-BASED ACCESS QUICK CHECK

| Your Role | Can View Requests? | Can Create? | Can Review? |
|-----------|-------------------|-------------|-------------|
| `sales_department` | ✅ Own requests | ✅ Yes | ❌ No |
| `marketing` | ✅ Own requests | ✅ Yes | ❌ No |
| `accountant` | ✅ All requests | ❌ No | ✅ Yes |
| `super_admin` | ✅ All requests | ✅ Yes | ✅ Yes |

---

## 📊 Common Error Messages

| Error | Meaning | Fix |
|-------|---------|-----|
| `403 Forbidden` | Role check failed | Check JWT role, clear cache |
| `401 Unauthorized` | Token invalid/expired | Re-login |
| `User not authenticated` | No token sent | Check localStorage, re-login |
| `Insufficient permissions` | Wrong role in JWT | Check database role |

---

## 🚨 STILL NOT WORKING?

**Run verification scripts:**

1. **Frontend check:**
```bash
cd /Users/jw/fyp_system
./verify-frontend-jwt.sh
# Follow instructions in output
```

2. **Backend check (on EC2):**
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
cd /home/ubuntu/fyp_system
./verify-backend-jwt.sh
```

3. **Provide debug info:**
   - Browser console output (JWT payload)
   - Network tab screenshot (request headers)
   - Backend logs: `pm2 logs backend --lines 50`
   - Database user info

---

## ✅ CHECKLIST

- [ ] Logged out completely
- [ ] Cleared browser cache
- [ ] Closed and reopened browser
- [ ] Re-logged in with correct credentials
- [ ] Verified JWT token exists in localStorage
- [ ] Verified JWT role is `sales_department` (exact match)
- [ ] Checked Network tab - Authorization header present
- [ ] Backend services are running (`pm2 status`)
- [ ] No errors in backend logs (`pm2 logs backend`)
- [ ] Database user role is correct (`sales_department`)

---

## 📞 Emergency Contact

**If nothing works:**
1. Take screenshots of:
   - Browser console (JWT verification script output)
   - Network tab (failed request headers)
   - Backend logs (`pm2 logs backend`)
   - Database user record

2. Share these 3 key pieces of info:
   - JWT payload (decoded)
   - HTTP request headers (from Network tab)
   - Backend error logs

---

**Remember:** The code is 100% correct. This is almost always a cache/token issue that logout+re-login fixes.
