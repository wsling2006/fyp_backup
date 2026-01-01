# 🚀 EC2 Deployment Steps - HR Audit Log Fix

## ✅ What Was Fixed (Already Pushed to GitHub)

1. **Backend** (`backend/src/employees/hr.controller.ts`):
   - ✅ Removed audit logging from all HR endpoints except viewing employee profiles
   - ✅ Changed action name to `VIEW_EMPLOYEE_PROFILE` (no `HR_` prefix)
   - ✅ Only logs when viewing full employee profile with sensitive data

2. **Frontend** (`frontend/app/audit/superadmin/page.tsx`):
   - ✅ Already configured to count actions starting with `VIEW` as "View Actions"
   - ✅ Includes `VIEW_EMPLOYEE_PROFILE` in the action filter dropdown

3. **Database Cleanup Scripts**:
   - ✅ `cleanup-hr-logs-ec2.sh` - Simple cleanup script
   - ✅ `fix-hr-audit-complete.sh` - Comprehensive cleanup with verification

---

## 📋 Steps to Deploy on EC2

### Step 1: Pull Latest Code from GitHub
```bash
cd ~/fyp_system
git pull
```

**Expected output:**
```
Updating 17c6090..9ab9208
Fast-forward
 cleanup-hr-logs-ec2.sh      | 31 +++++++++++++++++++
 fix-hr-audit-complete.sh    | 203 +++++++++++++++++++++++++++++++++++
 2 files changed, 234 insertions(+)
```

---

### Step 2: Run the Database Cleanup Script
```bash
cd ~/fyp_system
chmod +x cleanup-hr-logs-ec2.sh
./cleanup-hr-logs-ec2.sh
```

**This will:**
- Show current HR audit logs with incorrect action names
- Delete all old logs (`HR_VIEW_EMPLOYEE_PROFILE`, `HR_VIEW_EMPLOYEE_DOCUMENTS`, `HR_VIEW_EMPLOYEE_LIST`)
- Verify they are removed

**Expected output:**
```
=== Cleaning up old HR audit logs ===

1. Current HR audit logs in database:
           action           | count 
----------------------------+-------
 HR_VIEW_EMPLOYEE_DOCUMENTS |     2
 HR_VIEW_EMPLOYEE_LIST      |     1
 HR_VIEW_EMPLOYEE_PROFILE   |     2
(3 rows)

2. Deleting all HR audit logs (old incorrect action names)...
DELETE 5

3. Verification - remaining EMPLOYEE audit logs:
 action | count 
--------+-------
(0 rows)

✅ Cleanup complete!
```

---

### Step 3: Restart Backend and Frontend
```bash
cd ~/fyp_system
pm2 restart all
pm2 logs --lines 20
```

Press `Ctrl+C` to exit logs.

---

### Step 4: Verify Everything is Working

#### 4a. Check PM2 Status
```bash
pm2 status
```

**Expected:**
```
┌────┬────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name       │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ backend    │ fork     │ 13   │ online    │ 0%       │ 89.2mb   │
│ 1  │ frontend   │ fork     │ 12   │ online    │ 0%       │ 54.9mb   │
└────┴────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

#### 4b. Check Database (Should Show 0 HR Logs)
```bash
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -U fyp_user -d fyp_db -c "SELECT action, COUNT(*) FROM audit_logs WHERE action LIKE '%EMPLOYEE%' GROUP BY action;"
```

**Expected:**
```
 action | count 
--------+-------
(0 rows)
```

---

### Step 5: Test the System

1. **Open your browser** and go to your EC2 public IP
2. **Login as HR user**: `leejwei009@gmail.com`
3. **Go to HR dashboard** and click "View Profile" on any employee
4. **Logout and login as Super Admin**
5. **Go to Audit Dashboard** at: `http://your-ec2-ip:3001/audit/superadmin`

#### Expected Results:
- ✅ Dashboard shows: **"Total Actions: 1"**
- ✅ Dashboard shows: **"View Actions: 1"** (in blue box)
- ✅ Audit log table shows action: **`VIEW_EMPLOYEE_PROFILE`** (NOT `HR_VIEW_EMPLOYEE_PROFILE`)
- ✅ No other HR actions are logged (search, list, etc.)

---

## 🔍 Troubleshooting

### If backend won't start:
```bash
cd ~/fyp_system/backend
npm install
pm2 restart backend
pm2 logs backend --lines 50
```

### If frontend won't build:
```bash
cd ~/fyp_system/frontend
npm install
npm run build
pm2 restart frontend
pm2 logs frontend --lines 50
```

### If old logs still appear:
Run the comprehensive cleanup script:
```bash
cd ~/fyp_system
chmod +x fix-hr-audit-complete.sh
./fix-hr-audit-complete.sh
```

### To manually check database:
```bash
PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -U fyp_user -d fyp_db

# Then run:
SELECT * FROM audit_logs WHERE action LIKE '%EMPLOYEE%' ORDER BY created_at DESC LIMIT 10;
\q
```

---

## 📝 Summary

**What happens now:**
- ✅ Only `VIEW_EMPLOYEE_PROFILE` is logged (when viewing full employee profile)
- ✅ This action counts as a "View Action" in the audit dashboard
- ✅ All other HR operations (search, list, upload, download) are NOT logged
- ✅ Old logs with incorrect names are removed from database

**No manual code changes needed on EC2** - just pull, cleanup database, and restart! 🎉
