# HR Employee Deletion Feature - Testing Checklist

## Pre-Deployment Verification ✓

### Local Testing
- [x] Backend compiles without errors
- [x] Frontend compiles without errors
- [x] OTP generation works (UsersService)
- [x] OTP email sending works (nodemailer)
- [x] Field names match between frontend and backend (`otpCode`)
- [x] API proxy routes correctly
- [x] Audit logging is spam-free (session-based)

## EC2 Deployment Steps

### 1. Update EC2 Credentials
Edit `deploy-hr-delete-to-ec2.sh` and update:
```bash
EC2_USER="ubuntu"
EC2_HOST="your-ec2-public-ip"  # ← Update this
EC2_KEY_PATH="~/.ssh/your-key.pem"  # ← Update this
```

### 2. Run Deployment Script
```bash
./deploy-hr-delete-to-ec2.sh
```

### 3. Verify Deployment
- [ ] Backend started successfully
- [ ] Frontend started successfully
- [ ] Both services responding
- [ ] No deployment errors

## Post-Deployment Testing

### A. Authentication & Access Control

#### 1. Test HR Admin Access
- [ ] Login as HR admin user
- [ ] Navigate to HR Dashboard
- [ ] View employee list
- [ ] Click on an employee profile
- [ ] Verify "Delete Employee" button is visible

#### 2. Test Non-HR User (Should Fail)
- [ ] Login as regular employee
- [ ] Try to access HR dashboard (should be blocked)
- [ ] Try to access employee profile directly (should be blocked)

### B. Audit Logging (Spam-Free)

#### 1. Test Session-Based Logging
- [ ] View employee profile (should log once)
- [ ] Refresh page (should NOT log again)
- [ ] Click to another employee (should log once)
- [ ] Return to first employee (should log once, new session)
- [ ] Check backend audit logs: `tail -f ~/fyp_system/backend/audit.log`
- [ ] Verify only ONE log entry per viewing session

#### 2. Verify Log Format
Check audit log contains:
```json
{
  "event": "HR_VIEW_EMPLOYEE_PROFILE",
  "userId": "<hr_user_id>",
  "targetEmployeeId": "<employee_id>",
  "targetEmployeeName": "<employee_name>",
  "timestamp": "ISO-8601-timestamp",
  "ipAddress": "xxx.xxx.xxx.xxx"
}
```

### C. Employee Deletion Flow

#### 1. Initiate Deletion
- [ ] Click "Delete Employee" button
- [ ] Modal appears with warning message
- [ ] Warning shows employee name and "irreversible" message
- [ ] "Confirm Deletion" button present

#### 2. Request OTP
- [ ] Click "Confirm Deletion"
- [ ] Password input field appears
- [ ] Enter your password
- [ ] Click "Request OTP"
- [ ] Success message appears
- [ ] OTP input field appears

#### 3. Check OTP Email
- [ ] Open your email inbox
- [ ] Verify OTP email received
- [ ] Subject: "OTP for Employee Deletion"
- [ ] Body contains 6-digit OTP code
- [ ] Email sender is configured correctly

#### 4. Development Mode (if applicable)
If not in production:
- [ ] OTP also logged in backend console
- [ ] OTP displayed in modal (for testing convenience)

#### 5. Complete Deletion
- [ ] Enter OTP code from email
- [ ] Click "Delete Employee"
- [ ] Success message appears
- [ ] Modal closes automatically
- [ ] Redirected to employee list
- [ ] Deleted employee no longer in list

#### 6. Verify Database
Connect to database and verify:
```sql
SELECT * FROM users WHERE user_id = '<deleted_employee_id>';
-- Should return no rows
```

#### 7. Verify Audit Log
Check audit log for deletion event:
```json
{
  "event": "HR_DELETE_EMPLOYEE",
  "userId": "<hr_user_id>",
  "targetEmployeeId": "<deleted_employee_id>",
  "targetEmployeeName": "<deleted_employee_name>",
  "timestamp": "ISO-8601-timestamp",
  "ipAddress": "xxx.xxx.xxx.xxx"
}
```

### D. Error Handling

#### 1. Invalid Password
- [ ] Enter wrong password
- [ ] Click "Request OTP"
- [ ] Error message: "Invalid password"
- [ ] OTP NOT sent
- [ ] Cannot proceed

#### 2. Invalid OTP
- [ ] Request OTP with correct password
- [ ] Enter wrong OTP code
- [ ] Click "Delete Employee"
- [ ] Error message: "Invalid or expired OTP"
- [ ] Employee NOT deleted

#### 3. Expired OTP
- [ ] Request OTP
- [ ] Wait 6+ minutes
- [ ] Try to use OTP
- [ ] Error message: "Invalid or expired OTP"
- [ ] Employee NOT deleted

#### 4. Network Errors
- [ ] Test with network interruption
- [ ] Verify error messages display correctly
- [ ] Verify no partial deletions

#### 5. Missing Authorization
- [ ] Try to call delete API directly without token
- [ ] Should return 401 Unauthorized
- [ ] Try with non-HR user token
- [ ] Should return 403 Forbidden

### E. Security Checks

#### 1. Password Protection
- [ ] Cannot request OTP without correct password
- [ ] Password validated against database hash
- [ ] Password not exposed in logs

#### 2. OTP Security
- [ ] OTP expires after 5 minutes
- [ ] OTP is single-use
- [ ] OTP cannot be reused after successful deletion
- [ ] OTP stored securely (not in database)

#### 3. Authorization
- [ ] Only HR admins can delete employees
- [ ] JWT token required
- [ ] Role checked on backend

#### 4. Audit Trail
- [ ] All view actions logged
- [ ] All delete actions logged
- [ ] Logs include user ID, target employee, timestamp
- [ ] Logs tamper-evident (append-only)

### F. UI/UX Testing

#### 1. Modal Behavior
- [ ] Modal can be closed with X button
- [ ] Modal can be closed with Cancel button
- [ ] Modal closes on successful deletion
- [ ] Modal displays loading states
- [ ] Modal shows error messages clearly

#### 2. Form Validation
- [ ] Password field required
- [ ] Password field masked
- [ ] OTP field required
- [ ] OTP field numeric input
- [ ] Submit buttons disabled during requests

#### 3. User Feedback
- [ ] Clear warning messages
- [ ] Success messages appear
- [ ] Error messages appear
- [ ] Loading spinners during async operations
- [ ] Confirmation messages before destructive actions

### G. Integration Testing

#### 1. Cross-Feature Compatibility
- [ ] Employee deletion doesn't break other HR features
- [ ] Employee list updates correctly after deletion
- [ ] Search/filter still works after deletion
- [ ] Other employees unaffected

#### 2. System-Wide OTP
Compare with other OTP features:
- [ ] Purchase request approval OTP works
- [ ] Audit log clearing OTP works (if implemented)
- [ ] All use same OTP service
- [ ] All send email correctly

### H. Performance Testing

#### 1. Response Times
- [ ] View employee profile: < 1s
- [ ] Request OTP: < 2s
- [ ] Delete employee: < 2s
- [ ] Email delivery: < 30s

#### 2. Concurrent Users
- [ ] Multiple HR admins can view profiles simultaneously
- [ ] Multiple HR admins can delete different employees
- [ ] No race conditions
- [ ] No database locks

## Common Issues & Solutions

### Issue: OTP not received via email
**Solutions:**
1. Check email service configuration in `.env`
2. Check spam/junk folder
3. Verify email service credentials
4. Check backend logs for email sending errors
5. Test with different email address

### Issue: "Invalid or expired OTP"
**Solutions:**
1. Ensure OTP entered correctly (no spaces)
2. Check if OTP expired (5-minute limit)
3. Request new OTP
4. Check server clock sync

### Issue: Backend 500 error
**Solutions:**
1. Check backend logs: `tail -f ~/fyp_system/backend/backend.log`
2. Verify database connection
3. Check UsersService is injected correctly
4. Verify email service initialized

### Issue: "Cannot read property 'password_hash'"
**Solutions:**
1. Verify user entity has password_hash field
2. Check user is loaded with password in query
3. Run migration if schema changed

### Issue: Frontend shows 404 for OTP request
**Solutions:**
1. Check API proxy configuration
2. Verify endpoint path: `/hr/employees/:id/request-deletion-otp`
3. Check frontend calls correct URL
4. Verify backend route registered

## Success Criteria

All checkboxes above should be checked ✓

### Critical Success Factors
1. ✓ No audit log spam (session-based logging works)
2. ✓ OTP sent via email (not just console)
3. ✓ Password validation works
4. ✓ Employee actually deleted from database
5. ✓ Audit log records deletion
6. ✓ Only HR admins can access feature
7. ✓ Error handling robust
8. ✓ UI provides clear feedback

## Sign-Off

- [ ] All tests passed
- [ ] No critical bugs found
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Documentation complete
- [ ] Ready for production use

**Tested by:** _________________  
**Date:** _________________  
**Signature:** _________________

---

## Quick Commands Reference

### Check Backend Logs
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip 'tail -f ~/fyp_system/backend/backend.log'
```

### Check Audit Logs
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip 'tail -f ~/fyp_system/backend/audit.log'
```

### Check Frontend Logs
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip 'tail -f ~/fyp_system/frontend/frontend.log'
```

### Check Running Processes
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip 'ps aux | grep node'
```

### Restart Backend
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip 'cd ~/fyp_system/backend && pkill -f "node dist/main.js" && nohup node dist/main.js > backend.log 2>&1 &'
```

### Restart Frontend
```bash
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip 'cd ~/fyp_system/frontend && pkill -f "next start" && nohup npm start > frontend.log 2>&1 &'
```
