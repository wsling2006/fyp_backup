# HR Audit Log Spam - Complete Diagnostic & Fix Guide

## 🎯 Quick Start on EC2

### 1. Run the Comprehensive Diagnostic
```bash
cd ~/fyp_system
./diagnose-ec2-audit-complete.sh
```

This script will:
- ✅ Check what Git commit is deployed
- ✅ Verify anti-spam code is in hr.controller.ts
- ✅ Check if code is compiled (backend/dist)
- ✅ Verify debug logs are in compiled code
- ✅ Check PM2 process status
- ✅ Analyze recent audit logs for spam and debug messages
- ✅ Provide specific recommendations

### 2. Most Common Issue: Code Not Compiled

If the diagnostic shows "Compiled code is outdated", run:
```bash
cd ~/fyp_system/backend
npm run build
pm2 restart backend
pm2 logs backend --lines 50
```

### 3. Test the Fix

1. **Clear browser state:**
   - Clear browser cache
   - Clear localStorage (F12 → Application → Local Storage → Clear All)
   - Close and reopen browser

2. **Login and test:**
   - Login as an HR user
   - View an employee profile (e.g., `/hr/employees/123`)
   - Check logs:
     ```bash
     pm2 logs backend --lines 30 | grep "AUDIT SPAM DEBUG"
     ```
   - You should see: `[AUDIT SPAM DEBUG] First view - creating audit log`

3. **Refresh the page:**
   - Press F5 to refresh
   - Check logs again:
     ```bash
     pm2 logs backend --lines 30 | grep "AUDIT SPAM DEBUG"
     ```
   - You should see: `[AUDIT SPAM DEBUG] Already viewed, skipping audit log`

4. **View a different employee:**
   - Navigate to another employee profile
   - Should see "First view" again
   - Refresh → Should see "Already viewed"

---

## 🔧 How The Anti-Spam System Works

### Server-Side Map Tracking
```typescript
// In HRController
private viewedEmployees = new Map<string, Set<string>>();

async getEmployeeById(@Param('id') id: string, @Req() req) {
  const userId = req.user.id;
  const key = `${userId}-${id}`;
  
  // Check if this user has already viewed this employee
  if (!this.viewedEmployees.has(userId)) {
    this.viewedEmployees.set(userId, new Set());
  }
  
  const viewedSet = this.viewedEmployees.get(userId);
  
  if (viewedSet.has(id)) {
    // Already viewed - skip audit log
    console.log('[AUDIT SPAM DEBUG] Already viewed, skipping audit log');
  } else {
    // First view - log it
    viewedSet.add(id);
    await this.hrService.createAuditLog({
      performedBy: userId,
      action: 'Employee View',
      targetUserId: id,
      ...
    });
    console.log('[AUDIT SPAM DEBUG] First view - creating audit log');
  }
}
```

### Key Points:
- ✅ Tracks per-user, per-employee views in memory
- ✅ First view of an employee by a user = audit log created
- ✅ Subsequent views (refreshes) = no audit log
- ✅ Different employee = new first view (audit log created)
- ⚠️ Map clears on backend restart (by design for now)

---

## 🐛 Troubleshooting

### Issue 1: Debug Logs Not Appearing

**Symptom:** No `[AUDIT SPAM DEBUG]` messages in PM2 logs

**Causes:**
1. Code not compiled: Run `npm run build` in backend
2. Backend not restarted: Run `pm2 restart backend`
3. Old code deployed: Run `git pull` and rebuild

**Fix:**
```bash
cd ~/fyp_system
git pull
cd backend
npm run build
pm2 restart backend
pm2 logs backend --lines 50
```

### Issue 2: Spam Still Occurring

**Symptom:** Multiple "Employee View" audit logs on refresh

**Causes:**
1. Compiled code doesn't have anti-spam logic
2. viewedEmployees Map not persisting between requests
3. userId or employeeId is undefined/null

**Debug:**
```bash
# Check what userId and employeeId are being logged
pm2 logs backend --lines 50 | grep "AUDIT SPAM DEBUG"

# Should see something like:
# [AUDIT SPAM DEBUG] userId: abc123, employeeId: 456, key: abc123-456
```

**Fix:** Check that:
- `req.user.id` is populated (JWT auth working)
- Employee ID is correctly parsed from route params
- viewedEmployees Map is declared as class property

### Issue 3: TypeScript Compilation Errors

**Symptom:** `npm run build` fails

**Causes:**
- Missing methods in HRService (like getDocumentById)
- Type mismatches

**Fix:** Check the specific error messages. Most TypeScript errors in hr.service.ts are unrelated to audit logging and can be fixed separately.

---

## 📊 Expected Behavior

### Scenario 1: First View
```
User A views Employee 123 for the first time
→ Audit log created: "Employee View" for Employee 123 by User A
→ PM2 log: "[AUDIT SPAM DEBUG] First view - creating audit log"
```

### Scenario 2: Refresh (Same Employee)
```
User A refreshes Employee 123 page
→ NO audit log created
→ PM2 log: "[AUDIT SPAM DEBUG] Already viewed, skipping audit log"
```

### Scenario 3: Different Employee
```
User A views Employee 456 for the first time
→ Audit log created: "Employee View" for Employee 456 by User A
→ PM2 log: "[AUDIT SPAM DEBUG] First view - creating audit log"
```

### Scenario 4: Different User, Same Employee
```
User B views Employee 123 for the first time
→ Audit log created: "Employee View" for Employee 123 by User B
→ PM2 log: "[AUDIT SPAM DEBUG] First view - creating audit log"
(This is correct - each user's first view should be logged)
```

---

## 🚀 Quick Commands Reference

### Check Logs
```bash
# View all recent backend logs
pm2 logs backend --lines 100

# View only debug messages
pm2 logs backend --lines 100 | grep "AUDIT SPAM DEBUG"

# View only audit logs
pm2 logs backend --lines 100 | grep "Employee View"

# Follow logs in real-time
pm2 logs backend
```

### Rebuild & Restart
```bash
cd ~/fyp_system/backend
npm run build
pm2 restart backend
```

### Check Process
```bash
pm2 list
pm2 describe backend
```

### Git Status
```bash
cd ~/fyp_system
git status
git log -5 --oneline
```

---

## 📝 Files Modified

### Backend
- `backend/src/employees/hr.controller.ts` - Anti-spam logic, debug logs
- `backend/src/employees/hr.service.ts` - Audit log helper methods

### Frontend
- `frontend/app/hr/employees/[id]/page.tsx` - Silent mode logic (optional)

### Scripts
- `diagnose-ec2-audit-complete.sh` - Complete diagnostic tool
- `test-hr-audit-sessionstorage.sh` - Frontend sessionStorage test

### Documentation
- `HR_AUDIT_SERVER_SIDE_TRACKING.md` - Server-side approach
- `HR_AUDIT_SILENT_MODE_SESSIONSTORAGE_FIX.md` - Frontend approach
- `HR_AUDIT_COMPLETE_GUIDE.md` - This file

---

## ✅ Success Criteria

The fix is working correctly when:

1. ✅ First view of any employee profile creates ONE audit log
2. ✅ Refreshing the same profile does NOT create additional audit logs
3. ✅ Debug logs appear in PM2 logs showing spam prevention logic
4. ✅ Different employees each get their first view logged
5. ✅ Different users viewing the same employee each get logged once

---

## 🔄 If All Else Fails

### Nuclear Option: Fresh Deployment
```bash
cd ~/fyp_system
git pull origin main
cd backend
rm -rf node_modules dist
npm install
npm run build
pm2 restart backend
pm2 logs backend --lines 50
```

### Check Environment
```bash
# Verify Node.js version
node --version  # Should be 18+

# Verify PM2 is running
pm2 status

# Verify database connection
# (check backend logs for DB connection messages)
```

---

## 📞 Next Steps

1. **Run the diagnostic:** `./diagnose-ec2-audit-complete.sh`
2. **Follow the recommendations** from the diagnostic output
3. **Test the fix** with the steps above
4. **Report findings:** Share the diagnostic output if issues persist

The diagnostic script will tell you exactly what's wrong and what to do!
