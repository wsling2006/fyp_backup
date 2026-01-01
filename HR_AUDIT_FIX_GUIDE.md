# 🔧 HR AUDIT LOG ISSUE - COMPLETE FIX GUIDE

## 🔍 Problem Analysis

The issue you're seeing is likely one of these:

1. **Old logs in database** - Still showing `HR_VIEW_EMPLOYEE_PROFILE` (with `HR_` prefix)
2. **Old backend code running** - Not restarted after git pull
3. **Frontend not rebuilt** - Using old cached build

The frontend dashboard counts actions that start with `VIEW` - but `HR_VIEW_EMPLOYEE_PROFILE` starts with `HR_`, so it doesn't count! 

---

## 🚀 SOLUTION: Run These Commands on EC2

### Option 1: Quick Diagnostic (Find the Problem)

```bash
cd ~/fyp_system
git pull
chmod +x diagnose-hr-audit.sh
./diagnose-hr-audit.sh
```

**This will show you:**
- What audit logs are currently in the database
- Whether actions start with `VIEW` or `HR_VIEW`
- If backend is using the correct code
- When services were last restarted

**Send me the output** and I'll tell you exactly what's wrong!

---

### Option 2: Complete Nuclear Fix (Rebuild Everything)

If you want to just fix it completely without debugging:

```bash
cd ~/fyp_system
git pull
chmod +x complete-hr-fix.sh
./complete-hr-fix.sh
```

**This will:**
1. ✅ Pull latest code
2. ✅ Stop all services
3. ✅ Delete ALL old HR audit logs
4. ✅ Reinstall backend dependencies
5. ✅ Rebuild frontend from scratch
6. ✅ Restart everything
7. ✅ Verify the code is correct

**Takes 2-3 minutes but guarantees everything is fresh!**

---

## 🧪 After Running Either Script

### Test the System:

1. **Login as HR user**: `leejwei009@gmail.com`
2. **Go to HR Dashboard**
3. **Click "View Profile"** on any employee
4. **Logout** and **Login as Super Admin**
5. **Go to Audit Dashboard**: `http://your-ec2-ip:3001/audit/superadmin`

### Expected Result:

```
┌─────────────────────────────────────────────────────┐
│  Total Actions: 1                                   │
│  View Actions: 1  ← Should be 1, not 0!            │
│  Create Actions: 0                                  │
│  Delete Actions: 0                                  │
└─────────────────────────────────────────────────────┘

Table shows:
Action: VIEW_EMPLOYEE_PROFILE (NOT HR_VIEW_EMPLOYEE_PROFILE)
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Action shows `HR_VIEW_EMPLOYEE_PROFILE` (with HR_ prefix)
**Cause:** Old backend code still running  
**Fix:**
```bash
cd ~/fyp_system
git pull
pm2 restart backend
```

### Issue 2: View Actions count is 0 (but Total Actions shows 3)
**Cause:** Old logs in database with wrong action names  
**Fix:**
```bash
cd ~/fyp_system
./cleanup-hr-logs-ec2.sh
```

### Issue 3: Scripts not found or permission denied
**Cause:** Didn't pull latest code or make executable  
**Fix:**
```bash
cd ~/fyp_system
git pull
chmod +x *.sh
```

### Issue 4: Backend won't start after restart
**Cause:** Syntax error or missing dependencies  
**Fix:**
```bash
cd ~/fyp_system/backend
npm install
pm2 restart backend
pm2 logs backend --lines 50
```

---

## 📊 Manual Verification Commands

### Check database for HR logs:
```bash
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -U fyp_user -d fyp_db -c "SELECT action, COUNT(*) FROM audit_logs WHERE action LIKE '%EMPLOYEE%' GROUP BY action;"
```

**Expected:** Empty (0 rows) OR only `VIEW_EMPLOYEE_PROFILE`  
**NOT EXPECTED:** `HR_VIEW_EMPLOYEE_PROFILE`, `HR_VIEW_EMPLOYEE_LIST`, etc.

### Check PM2 status:
```bash
pm2 status
```

**Expected:** Both backend and frontend showing "online"

### Check backend code:
```bash
grep -n "VIEW_EMPLOYEE_PROFILE" ~/fyp_system/backend/src/employees/hr.controller.ts
```

**Expected:** Should see `'VIEW_EMPLOYEE_PROFILE'` (with quotes, no `HR_` prefix)

---

## 💡 Understanding the Fix

### Why `HR_VIEW_EMPLOYEE_PROFILE` doesn't count:

The frontend dashboard uses this logic:
```typescript
logs.filter(l => l.action.startsWith('VIEW')).length
```

- ✅ `VIEW_EMPLOYEE_PROFILE` → starts with `VIEW` → **COUNTS** 
- ❌ `HR_VIEW_EMPLOYEE_PROFILE` → starts with `HR_` → **DOESN'T COUNT**

### The Complete Flow:

1. **Backend** creates audit log with action: `VIEW_EMPLOYEE_PROFILE`
2. **Database** stores it in `audit_logs` table
3. **Frontend** fetches logs and filters by `action.startsWith('VIEW')`
4. **Dashboard** counts and displays it as "View Actions"

---

## 🎯 Next Steps

1. **Run diagnostic script** to see what's wrong
2. **OR run complete fix script** to rebuild everything
3. **Test the system** as described above
4. **Send me output** if it still doesn't work

I've pushed everything to GitHub - just pull and run! 🚀
