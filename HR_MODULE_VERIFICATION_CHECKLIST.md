# ✅ HR MODULE - FINAL VERIFICATION CHECKLIST

**Use this checklist to verify the HR module is working correctly before production deployment.**

---

## 🔧 PRE-DEPLOYMENT VERIFICATION

### **Backend Code Review**

- [ ] `employee-document.entity.ts` exists in `backend/src/employees/`
- [ ] `hr.service.ts` exists in `backend/src/employees/`
- [ ] `hr.controller.ts` exists in `backend/src/employees/`
- [ ] `employee.entity.ts` has been updated with new fields
- [ ] `hr.module.ts` imports ClamavModule
- [ ] `hr.module.ts` imports AuditModule
- [ ] `hr.module.ts` includes Employee and EmployeeDocument entities
- [ ] Migration file `1736899300000-AddHREmployeeManagement.ts` exists

### **Database Preparation**

- [ ] PostgreSQL is running
- [ ] Database backup created (recommended)
- [ ] Can connect to database: `psql -U jw -d fyp_db`
- [ ] Migration shows as pending: `npm run migration:show`

### **Dependencies**

- [ ] ClamAV installed: `clamscan --version`
- [ ] ClamAV updated: `sudo freshclam`
- [ ] Node modules installed: `npm install`
- [ ] Backend builds successfully: `npm run build`

---

## 🚀 DEPLOYMENT EXECUTION

### **Step 1: Run Migration**

```bash
cd backend
npm run migration:run
```

**Expected Output:**
```
Migration 1736899300000-AddHREmployeeManagement has been executed successfully.
```

- [ ] Migration executed without errors
- [ ] No warnings or failures

### **Step 2: Verify Database Changes**

```bash
psql -U jw -d fyp_db
```

```sql
-- Check employees table
\d employees
-- Should show: employee_id, status, ic_number, birthday, bank_account_number

-- Check employee_documents table
\d employee_documents
-- Should exist with all columns

-- Check migration recorded
SELECT * FROM migrations WHERE name LIKE '%AddHREmployeeManagement%';
-- Should return 1 row
```

- [ ] `employees` table has new columns
- [ ] `employee_documents` table exists
- [ ] Migration recorded in `migrations` table

### **Step 3: Restart Backend**

```bash
# Development
npm run dev

# Production
pm2 restart fyp-backend
pm2 logs fyp-backend --lines 50
```

- [ ] Backend starts without errors
- [ ] No "Module not found" errors
- [ ] HR module loaded successfully

---

## 🧪 FUNCTIONAL TESTING

### **Test 1: Authentication**

```bash
# Login as HR user
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "hr@company.com", "password": "password"}'
```

- [ ] Login successful
- [ ] JWT token received (or OTP required)
- [ ] Token decoded shows role: `human_resources`

### **Test 2: Employee List**

```bash
curl -X GET http://localhost:3000/hr/employees \
  -H "Authorization: Bearer <token>"
```

**Expected:**
```json
{
  "employees": [
    {
      "id": "uuid",
      "employee_id": "EMP001",
      "name": "John Doe",
      "status": "ACTIVE"
    }
  ]
}
```

- [ ] Returns 200 OK
- [ ] Response has `employees` array
- [ ] Only shows: id, employee_id, name, status
- [ ] NO sensitive data (email, IC, bank account)

### **Test 3: Employee Search**

```bash
curl -X GET "http://localhost:3000/hr/employees/search?q=John" \
  -H "Authorization: Bearer <token>"
```

- [ ] Returns 200 OK
- [ ] Search results match query
- [ ] Only minimal data returned

### **Test 4: Employee Detail (Sensitive)**

```bash
curl -X GET http://localhost:3000/hr/employees/<employee-id> \
  -H "Authorization: Bearer <token>"
```

**Expected:**
```json
{
  "employee": {
    "id": "uuid",
    "employee_id": "EMP001",
    "name": "John Doe",
    "email": "john@company.com",
    "phone": "+65 9123 4567",
    "ic_number": "S1234567A",
    "birthday": "1990-01-15",
    "bank_account_number": "1234567890",
    ...
  }
}
```

- [ ] Returns 200 OK
- [ ] Response includes ALL fields
- [ ] Sensitive data present (IC, bank account, etc.)
- [ ] Audit log created (verify below)

### **Test 5: Document Upload**

```bash
curl -X POST http://localhost:3000/hr/employees/<employee-id>/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf" \
  -F "document_type=RESUME" \
  -F "description=Test resume"
```

**Test with clean file:**
- [ ] Returns 200 OK
- [ ] Response has `success: true`
- [ ] Document ID returned

**Test with EICAR test file (malware simulation):**
```bash
# Download EICAR test file
curl -o eicar.txt https://secure.eicar.org/eicar.com.txt

# Upload (should be rejected)
curl -X POST http://localhost:3000/hr/employees/<employee-id>/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@eicar.txt" \
  -F "document_type=OTHER"
```

- [ ] Returns 400 Bad Request
- [ ] Error message mentions malware

**Test with invalid file type:**
```bash
curl -X POST http://localhost:3000/hr/employees/<employee-id>/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.exe" \
  -F "document_type=OTHER"
```

- [ ] Returns 400 Bad Request
- [ ] Error mentions invalid file type

### **Test 6: Document List**

```bash
curl -X GET http://localhost:3000/hr/employees/<employee-id>/documents \
  -H "Authorization: Bearer <token>"
```

- [ ] Returns 200 OK
- [ ] Response has `documents` array
- [ ] Shows uploaded document

### **Test 7: Document Download**

```bash
curl -X GET http://localhost:3000/hr/employees/<employee-id>/documents/<doc-id>/download \
  -H "Authorization: Bearer <token>" \
  --output downloaded.pdf
```

- [ ] Returns 200 OK
- [ ] File downloads successfully
- [ ] Content-Type header correct
- [ ] Content-Disposition header present
- [ ] File content matches original

### **Test 8: Document Delete**

```bash
curl -X DELETE http://localhost:3000/hr/employees/<employee-id>/documents/<doc-id> \
  -H "Authorization: Bearer <token>"
```

- [ ] Returns 200 OK
- [ ] Success message returned
- [ ] Document no longer in list

---

## 🔐 SECURITY TESTING

### **Test 9: RBAC Enforcement**

**Test with non-HR user (Sales/Marketing):**
```bash
# Login as Sales user
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "sales@company.com", "password": "password"}'

# Try to access HR endpoint
curl -X GET http://localhost:3000/hr/employees \
  -H "Authorization: Bearer <sales-token>"
```

- [ ] Returns 403 Forbidden
- [ ] Access denied message

**Test without authentication:**
```bash
curl -X GET http://localhost:3000/hr/employees
```

- [ ] Returns 401 Unauthorized
- [ ] Authentication required message

### **Test 10: Audit Logging**

```sql
-- Check audit logs created
SELECT 
  action, 
  resource, 
  metadata,
  created_at
FROM audit_logs 
WHERE action LIKE 'HR_%' 
ORDER BY created_at DESC 
LIMIT 10;
```

**Expected actions:**
- [ ] `HR_VIEW_EMPLOYEE_LIST`
- [ ] `HR_SEARCH_EMPLOYEES`
- [ ] `HR_VIEW_EMPLOYEE_PROFILE`
- [ ] `HR_VIEW_EMPLOYEE_DOCUMENTS`
- [ ] `HR_UPLOAD_EMPLOYEE_DOCUMENT`
- [ ] `HR_DOWNLOAD_EMPLOYEE_DOCUMENT`
- [ ] `HR_DELETE_EMPLOYEE_DOCUMENT`

**Verify sensitive data access logged:**
```sql
SELECT 
  metadata->>'employee_id' as employee,
  metadata->>'accessed_fields' as fields,
  ip_address,
  created_at
FROM audit_logs
WHERE action = 'HR_VIEW_EMPLOYEE_PROFILE'
ORDER BY created_at DESC;
```

- [ ] Accessed fields listed in metadata
- [ ] IP address recorded
- [ ] User ID recorded

---

## 🔄 REGRESSION TESTING

### **Test 11: Existing Modules Unaffected**

**Purchase Requests:**
```bash
curl -X GET http://localhost:3000/purchase-requests \
  -H "Authorization: Bearer <token>"
```

- [ ] Still works
- [ ] Returns expected data

**Claims:**
```bash
curl -X POST http://localhost:3000/purchase-requests/claims/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@receipt.pdf" \
  -F "..."
```

- [ ] Still works
- [ ] File upload still functional

**Revenue:**
```bash
curl -X GET http://localhost:3000/revenue \
  -H "Authorization: Bearer <accountant-token>"
```

- [ ] Still works
- [ ] Returns expected data

**Audit:**
```bash
curl -X GET http://localhost:3000/audit \
  -H "Authorization: Bearer <superadmin-token>"
```

- [ ] Still works
- [ ] Shows all audit logs including HR actions

---

## 📊 PERFORMANCE TESTING

### **Test 12: Performance**

**Load test employee list:**
```bash
for i in {1..100}; do
  curl -s http://localhost:3000/hr/employees \
    -H "Authorization: Bearer <token>" > /dev/null
  echo "Request $i"
done
```

- [ ] All requests succeed
- [ ] Response time < 500ms
- [ ] No memory leaks

**Check database performance:**
```sql
EXPLAIN ANALYZE SELECT * FROM employees WHERE employee_id = 'EMP001';
EXPLAIN ANALYZE SELECT * FROM employee_documents WHERE employee_id = 'uuid';
```

- [ ] Indexes used correctly
- [ ] Query time < 10ms

---

## 🎯 PRODUCTION READINESS

### **Test 13: EC2 Compatibility**

If deploying to AWS EC2:

- [ ] No hardcoded file paths
- [ ] Files stored in database, not filesystem
- [ ] Environment variables used for configuration
- [ ] PM2 starts successfully
- [ ] No port conflicts

### **Test 14: Error Handling**

**Test invalid employee ID:**
```bash
curl -X GET http://localhost:3000/hr/employees/invalid-uuid \
  -H "Authorization: Bearer <token>"
```

- [ ] Returns 404 Not Found
- [ ] Proper error message

**Test invalid document ID:**
```bash
curl -X GET http://localhost:3000/hr/employees/<id>/documents/invalid/download \
  -H "Authorization: Bearer <token>"
```

- [ ] Returns 404 Not Found
- [ ] Proper error message

---

## 📚 DOCUMENTATION VERIFICATION

### **Test 15: Documentation Complete**

- [ ] `HR_MODULE_IMPLEMENTATION_COMPLETE.md` exists
- [ ] `HR_MODULE_DEPLOYMENT_GUIDE.md` exists
- [ ] `HR_MODULE_SUMMARY.md` exists
- [ ] `test-hr-module.sh` exists and is executable
- [ ] All API endpoints documented
- [ ] Security features documented
- [ ] Deployment steps documented

---

## ✅ FINAL SIGN-OFF

### **Pre-Production Checklist**

- [ ] All functional tests passed
- [ ] All security tests passed
- [ ] All regression tests passed
- [ ] Performance acceptable
- [ ] Documentation complete
- [ ] Team review completed
- [ ] Backup created

### **Production Deployment Approval**

- [ ] Stakeholder approval obtained
- [ ] Deployment window scheduled
- [ ] Rollback plan documented
- [ ] Monitoring configured
- [ ] Support team notified

---

## 🚨 ROLLBACK PROCEDURE

If issues occur, rollback with:

```bash
cd backend
npm run migration:revert
pm2 restart fyp-backend
```

**Verify rollback:**
```sql
\d employees  -- New columns should be gone
SELECT * FROM employee_documents;  -- Table should not exist
```

---

## 📊 SUCCESS CRITERIA

**Deployment is successful when:**

✅ All tests in this checklist pass  
✅ No errors in backend logs  
✅ Audit logs show HR activity  
✅ No regressions in existing modules  
✅ Performance is acceptable  
✅ Documentation is complete  

---

**Checklist Status:** [ ] Complete  
**Tested By:** _______________  
**Date:** _______________  
**Approved For Production:** [ ] Yes [ ] No  

---

🎉 **Once this checklist is complete, the HR module is ready for production!**
