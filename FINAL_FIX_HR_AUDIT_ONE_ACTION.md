# FINAL FIX: Only ONE HR Audit Log - VIEW_EMPLOYEE_PROFILE

## What You Wanted
**ONE** audit log action for HR: `VIEW_EMPLOYEE_PROFILE`
- Should count as "View Action" in audit dashboard
- No other HR actions should be logged

## Problem Found
1. **Multiple audit logs were being created** for various HR actions (search, create, upload, download, delete)
2. **Action names had `HR_` prefix** like `HR_VIEW_EMPLOYEE_PROFILE` instead of just `VIEW_EMPLOYEE_PROFILE`
3. **Dashboard logic checks for action.startsWith('VIEW')** - so `HR_VIEW_*` didn't count as "View Action"

## Solution Applied

### ✅ Removed ALL audit logging except profile view

#### **Removed from these endpoints:**
1. ❌ `GET /hr/employees/search` - Employee search (removed `HR_SEARCH_EMPLOYEES`)
2. ❌ `POST /hr/employees` - Create employee (removed `CREATE_EMPLOYEE`)
3. ❌ `POST /hr/employees/:id/documents/upload` - Upload document (removed `HR_UPLOAD_EMPLOYEE_DOCUMENT`)
4. ❌ `GET /hr/employees/:employeeId/documents/:documentId/download` - Download document (removed `HR_DOWNLOAD_EMPLOYEE_DOCUMENT`)
5. ❌ `DELETE /hr/employees/:employeeId/documents/:documentId` - Delete document (removed `HR_DELETE_EMPLOYEE_DOCUMENT`)

#### **Kept ONLY this one:**
✅ `GET /hr/employees/:id` - **View employee profile** (keeps `VIEW_EMPLOYEE_PROFILE`)

### Action Name Verification
```typescript
// Correct action name (no HR_ prefix)
await this.auditService.logFromRequest(
  req,
  req.user.userId,
  'VIEW_EMPLOYEE_PROFILE',  // ✅ Starts with 'VIEW'
  'employee',
  id,
  { employee_id, name, accessed_fields: [...] }
);
```

---

## How Audit Dashboard Categorizes Actions

The dashboard checks action prefixes:

```typescript
// From frontend/app/audit/superadmin/page.tsx

// View Actions count
{logs.filter(l => l.action.startsWith('VIEW')).length}

// Create Actions count
{logs.filter(l => l.action.startsWith('CREATE')).length}

// Delete Actions count
{logs.filter(l => l.action.startsWith('DELETE')).length}
```

### Examples:
| Action Name | Starts With | Counts As |
|------------|-------------|-----------|
| `VIEW_EMPLOYEE_PROFILE` | `VIEW` | ✅ View Action |
| `VIEW_REVENUE` | `VIEW` | ✅ View Action |
| `CREATE_EMPLOYEE` | `CREATE` | ✅ Create Action |
| `DELETE_REVENUE` | `DELETE` | ✅ Delete Action |
| `HR_VIEW_EMPLOYEE_PROFILE` | `HR_VIEW` | ❌ None (doesn't match) |
| `HR_CREATE_EMPLOYEE` | `HR_CREATE` | ❌ None (doesn't match) |

---

## Why Old Logs Don't Count as "View Actions"

If you have logs showing in "Total Actions" but not in "View Actions", they likely have the **old action name** with `HR_` prefix:

```
❌ HR_VIEW_EMPLOYEE_PROFILE  → Counts in Total, but NOT in View Actions
✅ VIEW_EMPLOYEE_PROFILE     → Counts in both Total AND View Actions
```

---

## Clean Up Old Logs

Run this on your EC2 database to remove old logs with incorrect action names:

```bash
# SSH into EC2
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip

# Connect to database
sudo -u postgres psql company_portal

# Delete old HR logs with incorrect action names
DELETE FROM audit_logs 
WHERE action IN (
  'HR_VIEW_EMPLOYEE_LIST',
  'HR_VIEW_EMPLOYEE_PROFILE',
  'HR_VIEW_EMPLOYEE_DOCUMENTS',
  'HR_SEARCH_EMPLOYEES',
  'HR_CREATE_EMPLOYEE',
  'HR_UPLOAD_EMPLOYEE_DOCUMENT',
  'HR_DOWNLOAD_EMPLOYEE_DOCUMENT',
  'HR_DELETE_EMPLOYEE_DOCUMENT'
);

# Check remaining HR logs
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE resource = 'employee' OR resource = 'employee_document'
GROUP BY action;

# Expected: Only VIEW_EMPLOYEE_PROFILE (or empty if no profiles viewed yet)
```

---

## Update EC2

```bash
# Pull latest changes
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/fyp_system
git pull origin main

# Restart backend (removed audit logging)
cd backend
pm2 restart backend

# Check logs
pm2 logs backend --lines 50
```

**OR use quick update script:**
```bash
./quick-update-ec2.sh /path/to/your-key.pem your-ec2-ip
```

---

## After Update - Expected Behavior

### ❌ These actions will NOT create audit logs:
1. Navigating to `/hr/employees` page
2. Clicking "View Employee List" button
3. Searching/filtering employees
4. Creating new employee
5. Uploading employee documents
6. Downloading employee documents
7. Deleting employee documents

### ✅ This action WILL create audit log:
**Clicking "View Profile" button** → Creates `VIEW_EMPLOYEE_PROFILE` log
- Exposes sensitive data: IC number, bank account, birthday, address, emergency contact
- Counts as **View Action** in audit dashboard
- Shows in "Total Actions" count
- Shows in "View Actions" count

---

## Testing After Update

### Test 1: Clean Database (Remove Old Logs)
```sql
-- Remove all old HR logs
DELETE FROM audit_logs WHERE resource = 'employee' OR resource = 'employee_document';

-- Verify empty
SELECT * FROM audit_logs WHERE resource = 'employee';
```

### Test 2: View Employee Profile
1. Login as HR user
2. Click "View Employee List"
3. Click "View Profile" on any employee
4. Check audit dashboard as super admin

**Expected Result:**
```
Total Actions:  1
View Actions:   1   ← Counts correctly!
Create Actions: 0
Delete Actions: 0

Audit log shows:
- Action: VIEW_EMPLOYEE_PROFILE
- Resource: employee
- User: hr@company.com
```

### Test 3: Create Employee (Should NOT Log)
1. Login as HR user
2. Click "Add Employee"
3. Create new employee
4. Check audit dashboard

**Expected Result:**
```
Total Actions:  1   ← Still just 1 (from previous profile view)
View Actions:   1
Create Actions: 0   ← NOT increased
```

### Test 4: Upload Document (Should NOT Log)
1. Upload document to employee profile
2. Check audit dashboard

**Expected Result:**
```
Total Actions:  1   ← Still just 1
View Actions:   1
Create Actions: 0
```

---

## Summary

✅ **ONLY** `VIEW_EMPLOYEE_PROFILE` is audit logged
✅ Action name starts with `VIEW` - counts correctly in dashboard
✅ All other HR operations are NOT logged
✅ Clean up old logs with incorrect names using SQL script

---

## Files Changed

1. `backend/src/employees/hr.controller.ts`
   - Removed audit logging from 5 endpoints
   - Kept only `VIEW_EMPLOYEE_PROFILE` for profile view
   
2. `cleanup-old-hr-audit-logs.sh`
   - SQL script to remove old logs with incorrect action names

---

## Action Name Standard

For future reference, all audit actions should follow this pattern:

```
<VERB>_<RESOURCE>_<DETAIL>

Where VERB is one of:
- VIEW    → Counts as "View Action"
- CREATE  → Counts as "Create Action"
- UPDATE  → Counts as "Update Action"  
- DELETE  → Counts as "Delete Action"

Examples:
✅ VIEW_EMPLOYEE_PROFILE
✅ VIEW_REVENUE
✅ CREATE_REVENUE
✅ DELETE_REVENUE
✅ UPDATE_REVENUE

❌ HR_VIEW_EMPLOYEE_PROFILE  (doesn't start with VIEW)
❌ EMPLOYEE_VIEW             (doesn't start with VIEW)
❌ VIEWING_EMPLOYEE          (doesn't start with VIEW)
```

All changes pushed to GitHub! 🎉
