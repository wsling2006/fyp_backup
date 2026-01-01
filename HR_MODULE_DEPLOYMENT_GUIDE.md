# 🚀 HR MODULE DEPLOYMENT - QUICK REFERENCE

**Date:** January 2, 2026  
**Module:** HR Employee Management  
**Deployment Target:** Local Dev + AWS EC2

---

## ⚡ QUICK DEPLOY COMMANDS

### **Local Development**

```bash
# 1. Navigate to backend
cd backend

# 2. Run migration
npm run migration:run

# 3. Restart backend
npm run dev

# 4. Test HR endpoints
./test-hr-module.sh
```

### **AWS EC2 Production**

```bash
# 1. SSH to EC2
ssh ubuntu@<ec2-ip>

# 2. Navigate to project
cd ~/fyp_system

# 3. Pull latest code
git pull origin main

# 4. Backend migration
cd backend
npm install
npm run migration:run
npm run build

# 5. Restart backend
pm2 restart fyp-backend

# 6. Check logs
pm2 logs fyp-backend --lines 50

# 7. Verify HR endpoints
curl http://localhost:3000/hr/employees \
  -H "Authorization: Bearer <token>"
```

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### **Backend:**
- [ ] Migration file exists: `1736899300000-AddHREmployeeManagement.ts`
- [ ] Employee entity updated with sensitive fields
- [ ] EmployeeDocument entity created
- [ ] HRService created
- [ ] HRController created
- [ ] HR module updated with new imports
- [ ] ClamavModule imported
- [ ] AuditModule imported

### **Database:**
- [ ] PostgreSQL running
- [ ] Database backup created (optional but recommended)
- [ ] Migration can be run successfully

### **Security:**
- [ ] ClamAV installed and updated (`clamscan --version`)
- [ ] Virus definitions current (`sudo freshclam`)
- [ ] JWT authentication working
- [ ] RBAC guards in place

---

## 🗄️ DATABASE MIGRATION

### **Run Migration:**

```bash
cd backend
npm run migration:run
```

### **Expected Output:**

```
query: SELECT * FROM "information_schema"."tables" WHERE "table_schema" = 'public' AND "table_name" = 'migrations'
query: SELECT * FROM "migrations" "migrations"
0 migrations are already loaded in the database.
1 migrations were found in the source code.
1 migrations are new migrations that need to be executed.
query: START TRANSACTION
query: ALTER TABLE employees ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50) UNIQUE...
query: CREATE TABLE "employee_documents" ...
query: INSERT INTO "migrations"("timestamp", "name") VALUES ...
Migration 1736899300000-AddHREmployeeManagement has been executed successfully.
query: COMMIT
```

### **Verify Migration:**

```sql
-- Check employees table has new columns
\d employees

-- Check employee_documents table exists
\d employee_documents

-- Check migration recorded
SELECT * FROM migrations WHERE name LIKE '%AddHREmployeeManagement%';
```

### **Rollback (if needed):**

```bash
npm run migration:revert
```

---

## 🔑 CREATE TEST DATA (Optional)

### **Create Test Employee:**

```sql
INSERT INTO employees (
  id, employee_id, name, email, status, phone, address, 
  ic_number, birthday, bank_account_number, 
  position, department, date_of_joining, is_active
) VALUES (
  uuid_generate_v4(),
  'EMP001',
  'John Doe',
  'john.doe@company.com',
  'ACTIVE',
  '+65 9123 4567',
  '123 Main St, Singapore 123456',
  'S1234567A',
  '1990-01-15',
  '1234567890',
  'Software Engineer',
  'Engineering',
  '2023-01-01',
  true
);
```

### **Create HR Test User:**

```sql
-- Check if HR user exists
SELECT id, email, role FROM users WHERE role = 'human_resources';

-- If no HR user, create one (via Super Admin in application)
-- Or insert directly:
INSERT INTO users (
  id, email, password_hash, role, mfa_enabled, is_active
) VALUES (
  uuid_generate_v4(),
  'hr@company.com',
  '<argon2-hash>', -- Use Super Admin UI to create properly
  'human_resources',
  true,
  true
);
```

---

## 🧪 POST-DEPLOYMENT TESTING

### **1. Quick Smoke Test:**

```bash
# Get employee list
curl http://localhost:3000/hr/employees \
  -H "Authorization: Bearer <hr-token>"

# Expected: {"employees": [...]}
```

### **2. Run Full Test Suite:**

```bash
chmod +x test-hr-module.sh
./test-hr-module.sh
```

### **3. Verify Audit Logs:**

```sql
SELECT 
  action, 
  resource, 
  metadata->>'employee_id' as employee_id,
  created_at
FROM audit_logs 
WHERE action LIKE 'HR_%' 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🐛 TROUBLESHOOTING

### **Problem: Migration Fails**

**Error:** `relation "employees" does not exist`

**Solution:**
```bash
# Check if employees table exists
psql -U jw -d fyp_db -c "\d employees"

# If it doesn't exist, run earlier migrations first
npm run migration:show
npm run migration:run
```

---

### **Problem: ClamAV Scan Fails**

**Error:** `ClamAV is not installed`

**Solution:**
```bash
# macOS
brew install clamav
sudo freshclam

# Linux (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install clamav clamav-daemon
sudo freshclam

# Verify
clamscan --version
```

---

### **Problem: 403 Forbidden on HR Endpoints**

**Error:** `Forbidden resource`

**Solution:**
1. Check user role:
```sql
SELECT email, role FROM users WHERE email = 'your@email.com';
```

2. Ensure role is `human_resources` or `super_admin`

3. Check JWT token is valid:
```bash
# Decode JWT at jwt.io or:
node -e "console.log(JSON.parse(Buffer.from('$JWT_PAYLOAD_PART', 'base64')))"
```

---

### **Problem: File Upload Fails**

**Error:** `File upload failed`

**Check:**
1. File size < 10MB
2. File type is allowed (PDF, Word, Excel, Images)
3. ClamAV is running
4. Database has space for BYTEA storage

**Solution:**
```bash
# Check ClamAV
clamscan --version
sudo freshclam

# Check database size
psql -U jw -d fyp_db -c "SELECT pg_size_pretty(pg_database_size('fyp_db'));"

# Check backend logs
pm2 logs fyp-backend
```

---

### **Problem: Audit Logs Not Created**

**Error:** Audit logs not appearing in database

**Solution:**
1. Check AuditModule is imported in HRModule
2. Check AuditService is injected in HRController
3. Check database:
```sql
SELECT COUNT(*) FROM audit_logs;
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5;
```

---

## 📊 MONITORING

### **Check System Health:**

```bash
# Backend status
pm2 status

# Backend logs
pm2 logs fyp-backend --lines 100

# Database connections
psql -U jw -d fyp_db -c "SELECT count(*) FROM pg_stat_activity;"

# Disk space
df -h

# ClamAV status
clamscan --version
```

### **Monitor HR Activity:**

```sql
-- HR operations in last hour
SELECT 
  al.action,
  u.email as hr_user,
  al.resource,
  al.created_at
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.action LIKE 'HR_%'
  AND al.created_at > NOW() - INTERVAL '1 hour'
ORDER BY al.created_at DESC;

-- Most accessed employees
SELECT 
  metadata->>'employee_id' as employee_id,
  metadata->>'name' as employee_name,
  COUNT(*) as access_count
FROM audit_logs
WHERE action = 'HR_VIEW_EMPLOYEE_PROFILE'
GROUP BY metadata->>'employee_id', metadata->>'name'
ORDER BY access_count DESC;

-- Document uploads by user
SELECT 
  u.email,
  COUNT(*) as uploads
FROM audit_logs al
JOIN users u ON al.user_id = u.id
WHERE al.action = 'HR_UPLOAD_EMPLOYEE_DOCUMENT'
GROUP BY u.email
ORDER BY uploads DESC;
```

---

## 🎯 SUCCESS CRITERIA

Deployment is successful when:

✅ Migration runs without errors  
✅ Backend restarts successfully  
✅ HR endpoints return 200 OK (with valid token)  
✅ Non-HR users get 403 Forbidden  
✅ File upload works with ClamAV scan  
✅ File download works with streaming  
✅ Audit logs are created for sensitive operations  
✅ No regressions in existing modules (purchase requests, claims)  

---

## 📞 SUPPORT

If you encounter issues:

1. Check logs: `pm2 logs fyp-backend`
2. Check database: `psql -U jw -d fyp_db`
3. Review documentation: `HR_MODULE_IMPLEMENTATION_COMPLETE.md`
4. Run test script: `./test-hr-module.sh`

---

**Deployment Ready!** 🚀

**Estimated Deployment Time:** 10-15 minutes  
**Downtime Required:** None (migration is additive)  
**Risk Level:** Low (no existing code modified)
