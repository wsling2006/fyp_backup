# Enhanced Logging Deployment & Debugging Guide

## 🎯 What Changed

I've added **comprehensive logging** to all JWT authentication components to diagnose why `req.user` is undefined when RolesGuard executes:

### Modified Files:
1. **backend/src/auth/jwt-auth.guard.ts** - Added detailed logging to track authentication flow
2. **backend/src/auth/roles.guard.ts** - Added logging to see exact user object state
3. **backend/src/auth/jwt.strategy.ts** - Added logging to track JWT validation

### New Scripts:
1. **deploy-with-logging.sh** - Automated deployment with logging enabled
2. **analyze-logs.sh** - Analyzes PM2 logs to find authentication issues

---

## 📋 EC2 DEPLOYMENT STEPS

### Step 1: SSH into EC2
```bash
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

### Step 2: Deploy with Enhanced Logging
```bash
cd /var/www/fyp_system
./deploy-with-logging.sh
```

This script will:
- Pull latest code from GitHub
- Build the backend
- Restart PM2
- Show you the verification commands

---

## 🔍 TESTING & LOG ANALYSIS

### Test 1: Make a Request
From your local machine or EC2:

```bash
# Replace YOUR_TOKEN with the actual JWT token
curl -X GET https://fyp-system.online/api/purchase-requests \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -v
```

### Test 2: View Real-Time Logs
On EC2, run:

```bash
pm2 logs fyp-backend --raw
```

Then make the request from Test 1. You should see logs like:

**✅ GOOD - JwtStrategy is being called:**
```
[DEBUG] JwtStrategy.validate called with payload: {"sub":123,"email":"test@example.com","role":"sales_department"}
[DEBUG] JwtStrategy: User lookup result = Found
[DEBUG] JwtStrategy: Returning user object = {"userId":123,"username":"test@example.com","role":"sales_department"}
```

**✅ GOOD - JwtAuthGuard is working:**
```
[DEBUG] JwtAuthGuard: Starting authentication
[DEBUG] JwtAuthGuard: Authorization header = Present
[DEBUG] JwtAuthGuard: Passport validation result = true
[DEBUG] JwtAuthGuard: req.user after validation = {"userId":123,"username":"test@example.com","role":"sales_department"}
```

**✅ GOOD - RolesGuard receives user:**
```
[DEBUG] RolesGuard: Required roles = ["sales_department","marketing","super_admin"]
[DEBUG] RolesGuard: req.user = {"userId":123,"username":"test@example.com","role":"sales_department"}
[DEBUG] RolesGuard: User role = sales_department, hasRole = true
[DEBUG] RolesGuard: Access granted
```

**❌ BAD - If you see this:**
```
[ERROR] RolesGuard: User not authenticated - req.user is undefined
```

This means JwtAuthGuard did NOT populate req.user before RolesGuard ran.

### Test 3: Analyze Logs Automatically
On EC2, run:

```bash
cd /var/www/fyp_system
./analyze-logs.sh
```

This will show you:
- JWT Strategy validations
- JWT Auth Guard checks
- Roles Guard checks
- Any errors

---

## 🐛 DIAGNOSTIC SCENARIOS

### Scenario 1: No JwtStrategy Logs
**Problem:** JwtStrategy.validate is never called
**Cause:** Passport is not being invoked or JWT extraction is failing
**Fix:** Check that:
- PassportModule is properly registered in AuthModule
- JWT_SECRET matches between token generation and validation
- Token format is correct (Bearer <token>)

### Scenario 2: JwtStrategy Works but req.user is Undefined
**Problem:** Strategy validates successfully but req.user is not set in RolesGuard
**Cause:** Guard order issue or Passport not attaching user to request
**Fix:** 
- Verify guards are applied in correct order: `@UseGuards(JwtAuthGuard, RolesGuard)`
- Check that JwtAuthGuard extends `AuthGuard('jwt')` correctly
- Ensure JwtStrategy returns user object from validate()

### Scenario 3: Authorization Header Missing
**Problem:** JwtAuthGuard reports "Authorization header = Missing"
**Cause:** Frontend not sending token or API proxy stripping header
**Fix:**
- Check frontend localStorage has valid token
- Verify Next.js API route proxy forwards headers
- Check Nginx doesn't strip Authorization header

---

## 📊 EXPECTED LOG FLOW (Success)

When a request to `/api/purchase-requests` is made with a valid token:

1. **JwtAuthGuard starts**
   ```
   [DEBUG] JwtAuthGuard: Starting authentication
   [DEBUG] JwtAuthGuard: Authorization header = Present
   ```

2. **JwtStrategy validates token**
   ```
   [DEBUG] JwtStrategy.validate called with payload: {...}
   [DEBUG] JwtStrategy: User lookup result = Found
   [DEBUG] JwtStrategy: Returning user object = {...}
   ```

3. **JwtAuthGuard completes**
   ```
   [DEBUG] JwtAuthGuard: Passport validation result = true
   [DEBUG] JwtAuthGuard: req.user after validation = {...}
   ```

4. **RolesGuard checks permissions**
   ```
   [DEBUG] RolesGuard: Required roles = [...]
   [DEBUG] RolesGuard: req.user = {...}
   [DEBUG] RolesGuard: User role = sales_department, hasRole = true
   [DEBUG] RolesGuard: Access granted
   ```

5. **Request proceeds to controller**

---

## 🚨 WHAT TO DO IF STILL FAILING

### Option A: Share Logs
After running the tests above, run:

```bash
cd /var/www/fyp_system
./analyze-logs.sh > /tmp/auth-logs.txt
cat /tmp/auth-logs.txt
```

Copy the output and share it. This will show exactly where the authentication flow is breaking.

### Option B: Check Environment
Verify JWT_SECRET matches:

```bash
# On EC2
cd /var/www/fyp_system/backend
cat .env | grep JWT_SECRET

# Should match the secret used to create the token
```

### Option C: Test Token Validity
On EC2, create a test script:

```bash
# On EC2
cd /var/www/fyp_system/backend
node -e "
const jwt = require('jsonwebtoken');
const token = 'YOUR_TOKEN_HERE';
const secret = process.env.JWT_SECRET || 'fallback_dev_secret_change_in_production';
try {
  const decoded = jwt.verify(token, secret);
  console.log('✅ Token valid:', decoded);
} catch (err) {
  console.log('❌ Token invalid:', err.message);
}
"
```

---

## 🎬 NEXT STEPS

1. **Deploy** using `deploy-with-logging.sh` on EC2
2. **Test** by making a request with your JWT token
3. **Monitor** logs with `pm2 logs fyp-backend --raw`
4. **Analyze** with `analyze-logs.sh`
5. **Share** the log output if issue persists

The logs will reveal exactly where req.user is lost in the authentication pipeline!

---

## 📝 Quick Commands Reference

```bash
# Deploy
cd /var/www/fyp_system && ./deploy-with-logging.sh

# Watch logs live
pm2 logs fyp-backend --raw

# Analyze logs
cd /var/www/fyp_system && ./analyze-logs.sh

# Test endpoint
curl -X GET https://fyp-system.online/api/purchase-requests \
  -H "Authorization: Bearer YOUR_TOKEN" -v

# Check PM2 status
pm2 status

# Restart backend
pm2 restart fyp-backend
```

---

## 🔧 Rollback if Needed

If the new logging causes issues (unlikely, but just in case):

```bash
cd /var/www/fyp_system
git reset --hard 337a397  # Previous working commit
npm run build
pm2 restart fyp-backend
```
