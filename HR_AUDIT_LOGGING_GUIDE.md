# HR Audit Logging Configuration Guide

## Overview
The HR module now has properly configured audit logging that only tracks sensitive operations, not routine browsing.

---

## What Gets Logged (Audit Dashboard)

### ✅ View Actions (Sensitive Data Access)
**Action: `VIEW_EMPLOYEE_PROFILE`**
- **When**: HR user clicks on an employee to view their full profile
- **Why**: This exposes sensitive data:
  - IC Number / Passport
  - Bank Account Number
  - Birthday
  - Phone Number
  - Address
  - Emergency Contact
- **Logged Data**:
  ```json
  {
    "action": "VIEW_EMPLOYEE_PROFILE",
    "resource": "employee",
    "employee_id": "EMP001",
    "name": "John Doe",
    "accessed_fields": [
      "email", "phone", "address", "emergency_contact",
      "ic_number", "birthday", "bank_account_number"
    ]
  }
  ```

### ✅ Create Actions
**Action: `CREATE_EMPLOYEE`**
- **When**: HR user creates a new employee
- **Why**: Creating employee records is a sensitive operation
- **Logged Data**:
  ```json
  {
    "action": "CREATE_EMPLOYEE",
    "resource": "employee",
    "name": "Jane Smith",
    "email": "jane@company.com",
    "employee_id": "EMP002",
    "position": "Software Engineer",
    "department": "IT"
  }
  ```

### ✅ Document Actions
**Action: `UPLOAD_EMPLOYEE_DOCUMENT`**
- **When**: HR uploads a document (resume, agreement, etc.)
- **Logged Data**: filename, document type, file size

**Action: `DOWNLOAD_EMPLOYEE_DOCUMENT`**
- **When**: HR downloads an employee document
- **Logged Data**: filename, document type, file size

**Action: `DELETE_EMPLOYEE_DOCUMENT`**
- **When**: HR deletes an employee document
- **Logged Data**: filename, document type

---

## What Does NOT Get Logged (Not Sensitive)

### ❌ Employee List View
- **Route**: `/hr/employees` (list page)
- **Data Shown**: Only employee ID, name, and status
- **Why Not Logged**: This is minimal, non-sensitive data - just browsing

### ❌ Document Metadata View
- **Route**: `/hr/employees/:id/documents` (document list)
- **Data Shown**: Only filenames, types, sizes (no actual file content)
- **Why Not Logged**: Just metadata - actual document downloads are logged

---

## Audit Dashboard Display

### Summary Cards
```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ Total Actions   │  │ View Actions    │  │ Create Actions  │  │ Delete Actions  │
│      6          │  │      0          │  │      0          │  │      0          │
└─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘
```

- **Total Actions**: All logged actions (sum of all)
- **View Actions**: Any action starting with `VIEW_` (e.g., `VIEW_EMPLOYEE_PROFILE`)
- **Create Actions**: Any action starting with `CREATE_` (e.g., `CREATE_EMPLOYEE`)
- **Delete Actions**: Any action starting with `DELETE_` (e.g., `DELETE_EMPLOYEE`)

### Action Filters
The audit dashboard now includes HR-specific filters:
- **Revenue Actions**: VIEW_REVENUE, CREATE_REVENUE, UPDATE_REVENUE, DELETE_REVENUE
- **Employee/HR Actions**: VIEW_EMPLOYEE_PROFILE, CREATE_EMPLOYEE, UPDATE_EMPLOYEE, DELETE_EMPLOYEE
- **Document Actions**: UPLOAD_DOCUMENT, DOWNLOAD_DOCUMENT, DELETE_DOCUMENT

---

## Testing the Audit Logging

### Test 1: View Employee Profile (Should Log)
1. Login as HR user
2. Navigate to `/hr/employees`
3. Click on any employee to view their profile
4. **Expected**: New audit log entry with `VIEW_EMPLOYEE_PROFILE`
5. Verify in audit dashboard:
   - Total Actions: +1
   - View Actions: +1

### Test 2: Browse Employee List (Should NOT Log)
1. Login as HR user
2. Navigate to `/hr/employees`
3. Browse the list, scroll, filter
4. **Expected**: NO audit log entries
5. Verify in audit dashboard:
   - Total Actions: unchanged
   - View Actions: unchanged

### Test 3: Create Employee (Should Log)
1. Login as HR user
2. Navigate to `/hr/employees/add`
3. Fill in employee details and submit
4. **Expected**: New audit log entry with `CREATE_EMPLOYEE`
5. Verify in audit dashboard:
   - Total Actions: +1
   - Create Actions: +1

### Test 4: Upload Document (Should Log)
1. Login as HR user
2. Open employee profile
3. Upload a document (resume, agreement, etc.)
4. **Expected**: New audit log entry with action containing `UPLOAD`
5. Verify in audit dashboard:
   - Total Actions: +1
   - Create Actions: +1

---

## Action Naming Convention

All audit actions follow this pattern for dashboard categorization:

```
<PREFIX>_<RESOURCE>_<OPERATION>

Prefixes:
- VIEW_     → Counts as "View Action"
- CREATE_   → Counts as "Create Action"
- UPDATE_   → Counts as "Update Action" (if implemented)
- DELETE_   → Counts as "Delete Action"

Examples:
✅ VIEW_EMPLOYEE_PROFILE    (View Action)
✅ CREATE_EMPLOYEE          (Create Action)
✅ DELETE_EMPLOYEE_DOCUMENT (Delete Action)
❌ HR_VIEW_EMPLOYEE_PROFILE (Won't categorize - doesn't start with VIEW_)
```

---

## Compliance & Security Notes

### Why This Approach?
1. **Focused Logging**: Only log access to sensitive data (IC, bank account, personal info)
2. **Performance**: Don't log every list view (reduces database load)
3. **Meaningful Audit Trail**: Logs show who accessed what sensitive information, when
4. **GDPR/Privacy Compliance**: Track access to personal identifiable information (PII)

### What Gets Logged
- ✅ Viewing sensitive employee data (IC, bank account, birthday)
- ✅ Creating new employee records
- ✅ Uploading/downloading employee documents
- ✅ Deleting employee documents or records

### What Doesn't Get Logged
- ❌ Browsing employee lists (non-sensitive overview)
- ❌ Viewing document metadata (just filenames)
- ❌ Login/logout (handled by auth system)
- ❌ Dashboard access (routine navigation)

---

## Deployment

### Update EC2
```bash
# Pull latest changes
cd /home/ubuntu/fyp_system
git pull origin main

# Restart backend (audit logging changes)
cd backend
pm2 restart backend

# Rebuild and restart frontend (dashboard UI changes)
cd ../frontend
npm run build
pm2 restart frontend

# Verify
pm2 logs backend --lines 50
pm2 logs frontend --lines 50
```

### Quick Update Script
```bash
./quick-update-ec2.sh /path/to/your-key.pem your-ec2-ip
```

---

## Example Audit Log Entry

When HR views an employee profile:
```json
{
  "id": "uuid",
  "user_id": "hr-user-uuid",
  "action": "VIEW_EMPLOYEE_PROFILE",
  "resource": "employee",
  "resource_id": "employee-uuid",
  "ip_address": "113.211.97.238",
  "metadata": {
    "employee_id": "EMP001",
    "name": "John Doe",
    "accessed_fields": [
      "email",
      "phone",
      "address",
      "emergency_contact",
      "ic_number",
      "birthday",
      "bank_account_number"
    ]
  },
  "created_at": "2026-01-02T02:43:00Z",
  "user": {
    "email": "hr@company.com",
    "role": "human_resources"
  }
}
```

This appears in the audit dashboard as:
- **User**: hr@company.com (human_resources)
- **Action**: VIEW_EMPLOYEE_PROFILE (blue badge)
- **Resource**: employee
- **Time**: 2 Jan 2026 at 02:43 AM
- **IP Address**: 113.211.97.238

---

## Summary

✅ **View Actions**: Only when clicking to view employee profile (sensitive data)
✅ **Create Actions**: Only when creating new employee
✅ **Total Actions**: Sum of all above
❌ **NOT Logged**: Browsing lists, viewing metadata

This provides a meaningful audit trail without excessive logging! 🎯
