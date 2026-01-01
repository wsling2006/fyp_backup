# HR Employee Deletion Feature - Deployment & Testing Guide

## 🎯 Overview

This guide covers the complete deployment and testing of the HR Employee Deletion feature with:
- ✅ Secure password + OTP authentication
- ✅ Email-based OTP delivery (nodemailer)
- ✅ Session-based audit logging (spam-free)
- ✅ Irreversible deletion warning
- ✅ Complete audit trail
- ✅ Role-based access control

## 📋 Prerequisites

### Required
- EC2 instance with Ubuntu
- SSH access to EC2
- Git repository access
- Node.js 18+ installed on EC2
- PostgreSQL database configured
- Email service credentials (Gmail/SMTP)

### Recommended
- PM2 for process management (optional but recommended)
- Nginx for reverse proxy (optional)
- SSL certificates for production (optional)

## 🚀 Quick Start Deployment

### Step 1: Update EC2 Credentials

Edit `deploy-hr-delete-to-ec2.sh`:

```bash
nano deploy-hr-delete-to-ec2.sh

# Update these lines:
EC2_USER="ubuntu"                    # Your EC2 username
EC2_HOST="your-ec2-public-ip"       # Your EC2 public IP
EC2_KEY_PATH="~/.ssh/your-key.pem"  # Your SSH key path
```

### Step 2: Run Deployment Script

```bash
# Make script executable (if not already)
chmod +x deploy-hr-delete-to-ec2.sh

# Run deployment
./deploy-hr-delete-to-ec2.sh
```

The script will:
1. Pull latest code from GitHub
2. Install dependencies
3. Build backend and frontend
4. Restart services
5. Verify health

### Step 3: Verify Deployment

```bash
# Run status check
./check-hr-delete-status.sh
```

Expected output:
```
✓ HR Controller
✓ HR Service
✓ Users Service (OTP)
✓ Employee Detail Page
✓ Delete OTP endpoint
✓ Delete employee endpoint
✓ OTP generation method
✓ Email sending method
✓ Correct field name (otpCode)
```

## 🧪 Testing Guide

### Pre-Testing Checklist

- [ ] Backend is running on port 3000
- [ ] Frontend is running on port 3001
- [ ] Database connection is working
- [ ] Email service is configured
- [ ] You have HR admin credentials
- [ ] You have a test employee to delete

### Test Scenario 1: Spam-Free Audit Logging

**Purpose:** Verify audit logs only fire once per session

**Steps:**
1. Login as HR admin
2. Navigate to HR Dashboard
3. Click on an employee profile
4. SSH to EC2 and monitor audit logs:
   ```bash
   ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
   tail -f ~/fyp_system/backend/audit.log
   ```
5. Refresh the employee page 3-4 times
6. Navigate away and back to the same employee

**Expected Results:**
- Initial view: 1 audit log entry
- Multiple refreshes: NO additional logs
- Navigate away and back: 1 new audit log entry
- Total logs: 2 (not 6+)

**Success Criteria:** ✅ No audit spam

### Test Scenario 2: OTP Email Delivery

**Purpose:** Verify OTP is sent via email, not just console

**Steps:**
1. Navigate to an employee profile
2. Click "Delete Employee" button
3. Enter your password
4. Click "Request OTP"
5. Check your email inbox (within 30 seconds)

**Expected Results:**
- Success message: "OTP sent to your email"
- Email received with subject: "OTP for Employee Deletion"
- Email contains 6-digit OTP code
- OTP expires in 5 minutes

**Alternative (Development Mode):**
- OTP also displayed in modal for testing
- OTP logged in backend console

**Success Criteria:** ✅ Email received

### Test Scenario 3: Complete Deletion Flow

**Purpose:** End-to-end employee deletion

**Steps:**
1. Navigate to employee profile (e.g., test employee)
2. Click "Delete Employee"
3. Modal displays warning: "This action is IRREVERSIBLE"
4. Click "Confirm Deletion"
5. Enter your HR admin password
6. Click "Request OTP"
7. Check email and copy OTP
8. Paste OTP in modal
9. Click "Delete Employee"

**Expected Results:**
- Each step shows clear feedback
- Success message after OTP request
- Success message after deletion
- Redirected to employee list
- Deleted employee not in list
- Audit log contains deletion event

**Success Criteria:** ✅ Employee deleted from database

### Test Scenario 4: Security Validation

**Purpose:** Verify security measures work

**Test 4A: Invalid Password**
1. Click "Delete Employee"
2. Enter WRONG password
3. Click "Request OTP"
4. **Expected:** Error message "Invalid password"
5. **Expected:** OTP NOT sent

**Test 4B: Invalid OTP**
1. Request OTP with correct password
2. Enter WRONG OTP (e.g., 000000)
3. Click "Delete Employee"
4. **Expected:** Error "Invalid or expired OTP"
5. **Expected:** Employee NOT deleted

**Test 4C: Expired OTP**
1. Request OTP
2. Wait 6 minutes
3. Try to use OTP
4. **Expected:** Error "Invalid or expired OTP"

**Test 4D: Unauthorized Access**
1. Logout HR admin
2. Login as regular employee
3. Try to access `/hr/employees/123`
4. **Expected:** 403 Forbidden or redirect

**Success Criteria:** ✅ All security checks pass

## 📊 Monitoring

### Real-Time Log Monitoring

```bash
# Backend logs
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip 'tail -f ~/fyp_system/backend/backend.log'

# Audit logs
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip 'tail -f ~/fyp_system/backend/audit.log'

# Frontend logs
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip 'tail -f ~/fyp_system/frontend/frontend.log'
```

### Key Log Patterns

**Successful OTP Request:**
```
OTP for employee deletion requested by user 123 for employee: John Doe (EMP001)
```

**Successful Deletion:**
```
⚠️ CRITICAL: Employee deletion initiated by user 123 for employee 456
✓ Employee EMP001 (John Doe) permanently deleted by user 123
```

**Audit Log Entry:**
```json
{
  "event": "DELETE_EMPLOYEE",
  "userId": "123",
  "entityType": "employee",
  "entityId": "456",
  "details": {
    "employee_id": "EMP001",
    "name": "John Doe",
    "warning": "PERMANENT DELETION - CANNOT BE UNDONE"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## 🔧 Troubleshooting

### Issue: OTP Email Not Received

**Symptoms:**
- Success message appears
- No email in inbox
- No email in spam folder

**Solutions:**

1. **Check Email Configuration:**
   ```bash
   ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
   cd ~/fyp_system/backend
   cat .env | grep MAIL
   ```
   
   Should contain:
   ```env
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USER=your-email@gmail.com
   MAIL_PASSWORD=your-app-password
   MAIL_FROM=your-email@gmail.com
   ```

2. **Check Backend Logs:**
   ```bash
   tail -f ~/fyp_system/backend/backend.log | grep -i "email\|otp\|mail"
   ```

3. **Test Email Service:**
   ```bash
   cd ~/fyp_system/backend
   node -e "
   const nodemailer = require('nodemailer');
   const transporter = nodemailer.createTransport({
     host: 'smtp.gmail.com',
     port: 587,
     auth: {
       user: 'your-email@gmail.com',
       pass: 'your-app-password'
     }
   });
   transporter.sendMail({
     from: 'your-email@gmail.com',
     to: 'your-email@gmail.com',
     subject: 'Test',
     text: 'Test email'
   }).then(() => console.log('SUCCESS')).catch(console.error);
   "
   ```

4. **Check Gmail Settings:**
   - Enable "Less secure app access" (or use App Password)
   - Check "Blocked Senders" list
   - Check quota limits

### Issue: Backend 500 Error

**Symptoms:**
- Frontend shows "Failed to request OTP"
- Backend returns 500 Internal Server Error

**Solutions:**

1. **Check Backend Logs:**
   ```bash
   tail -n 50 ~/fyp_system/backend/backend.log
   ```

2. **Common Causes:**
   - Database connection error
   - UsersService not injected
   - Email service not initialized
   - Missing password_hash field

3. **Verify Database:**
   ```sql
   -- Connect to database
   psql -U your_user -d your_database
   
   -- Check user table structure
   \d users
   
   -- Verify password_hash exists
   SELECT user_id, email, password_hash IS NOT NULL as has_password
   FROM users
   WHERE user_id = YOUR_USER_ID;
   ```

4. **Restart Services:**
   ```bash
   cd ~/fyp_system/backend
   pkill -f "node dist/main.js"
   nohup node dist/main.js > backend.log 2>&1 &
   ```

### Issue: Frontend 404 on OTP Request

**Symptoms:**
- Click "Request OTP"
- Console shows: `POST /api/hr/employees/123/request-delete-otp 404`

**Solutions:**

1. **Check API Proxy:**
   ```bash
   cat frontend/app/api/[...path]/route.ts
   ```
   
   Should forward to backend port 3000

2. **Check Backend Route:**
   ```bash
   grep -n "request-delete-otp" backend/src/employees/hr.controller.ts
   ```
   
   Should be: `@Post('employees/:id/request-delete-otp')`

3. **Check Frontend Call:**
   ```bash
   grep -n "request-delete-otp" frontend/app/hr/employees/[id]/page.tsx
   ```
   
   Should be: `/api/hr/employees/${id}/request-delete-otp`

### Issue: "Cannot read property 'password_hash'"

**Symptoms:**
- Backend error when requesting OTP
- Error mentions undefined password_hash

**Solutions:**

1. **Check User Entity:**
   ```typescript
   // backend/src/users/user.entity.ts
   @Column()
   password_hash: string;  // Must exist
   ```

2. **Check User Loading:**
   ```typescript
   // backend/src/users/users.service.ts
   async findById(userId: string) {
     return this.usersRepository.findOne({
       where: { user_id: userId },
       select: ['user_id', 'email', 'password_hash', 'role']  // Include password_hash
     });
   }
   ```

3. **Run Migration:**
   If you added password_hash field, run migration:
   ```bash
   cd ~/fyp_system/backend
   npm run migration:run
   ```

## 📈 Performance Benchmarks

### Expected Response Times

| Operation | Target | Acceptable | Critical |
|-----------|--------|------------|----------|
| View Employee Profile | < 500ms | < 1s | > 2s |
| Request OTP | < 1s | < 2s | > 5s |
| Delete Employee | < 1s | < 2s | > 5s |
| Email Delivery | < 10s | < 30s | > 60s |

### Load Testing

Test with multiple concurrent users:

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test employee profile viewing (10 users, 100 requests)
ab -n 100 -c 10 -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://your-ec2-ip:3000/hr/employees/123
```

## 🔐 Security Audit

### Checklist

- [ ] Password required for OTP request
- [ ] Password hashed with argon2
- [ ] OTP expires after 5 minutes
- [ ] OTP is single-use
- [ ] OTP sent only via email (not logged in production)
- [ ] JWT token required
- [ ] Role-based access (HR admins only)
- [ ] Audit log for all views and deletions
- [ ] SQL injection prevention (TypeORM)
- [ ] XSS prevention (React escaping)
- [ ] CSRF protection (if needed)

### Penetration Testing

1. **Test Authentication Bypass:**
   ```bash
   # Try to delete without token
   curl -X DELETE http://your-ec2-ip:3000/hr/employees/123 \
     -H "Content-Type: application/json" \
     -d '{"password":"test","otpCode":"123456"}'
   
   # Expected: 401 Unauthorized
   ```

2. **Test Authorization Bypass:**
   ```bash
   # Try to delete with non-HR token
   curl -X DELETE http://your-ec2-ip:3000/hr/employees/123 \
     -H "Authorization: Bearer NON_HR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"password":"test","otpCode":"123456"}'
   
   # Expected: 403 Forbidden
   ```

3. **Test OTP Brute Force:**
   ```bash
   # Try multiple OTP codes rapidly
   for i in {000000..999999..111111}; do
     curl -X DELETE http://your-ec2-ip:3000/hr/employees/123 \
       -H "Authorization: Bearer YOUR_TOKEN" \
       -H "Content-Type: application/json" \
       -d "{\"password\":\"test\",\"otpCode\":\"$i\"}"
   done
   
   # Expected: Rate limiting or account lockout
   ```

## 📝 Documentation Files

### Implementation Guides
- `EMPLOYEE_DELETE_FEATURE_GUIDE.md` - Original feature specification
- `DELETE_EMPLOYEE_FRONTEND_COMPLETE.md` - Frontend implementation
- `OTP_EMAIL_FIX_COMPLETE.md` - OTP/email integration
- `EMPLOYEE_DELETE_FIELD_NAME_FIX.md` - Field name alignment

### Testing & Deployment
- `HR_DELETE_TESTING_CHECKLIST.md` - Comprehensive test cases
- `deploy-hr-delete-to-ec2.sh` - Automated deployment script
- `check-hr-delete-status.sh` - Status verification script

### Audit & Session Management
- `HR_AUDIT_SILENT_MODE_QUICK_REF.md` - Session-based audit logging
- `diagnose-ec2-hr-audit.sh` - Audit diagnostic script
- `deploy-to-ec2-hr-fix.sh` - HR audit fix deployment

## ✅ Production Checklist

Before going live:

### Backend
- [ ] Environment variables configured (.env)
- [ ] Database migrations run
- [ ] Email service tested
- [ ] Audit logging verified
- [ ] Error handling tested
- [ ] Security headers configured
- [ ] Rate limiting enabled (if applicable)

### Frontend
- [ ] Build completed without errors
- [ ] Environment variables set (.env.local)
- [ ] API proxy configured
- [ ] Error boundaries tested
- [ ] Loading states working
- [ ] Success/error messages clear

### Infrastructure
- [ ] SSL certificates installed
- [ ] Firewall configured (ports 80, 443, 3000, 3001)
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Log rotation configured
- [ ] Process manager (PM2) set up

### Testing
- [ ] All test scenarios passed
- [ ] Security audit completed
- [ ] Performance benchmarks met
- [ ] User acceptance testing done
- [ ] Documentation reviewed

## 🎓 Training Materials

### For HR Admins

**How to Delete an Employee:**

1. Login to the company portal
2. Navigate to HR Dashboard
3. Click on the employee you want to delete
4. Click the red "Delete Employee" button
5. Read the warning carefully
6. Click "Confirm Deletion"
7. Enter your password
8. Click "Request OTP"
9. Check your email for the OTP code
10. Enter the OTP code
11. Click "Delete Employee"
12. The employee will be permanently removed

**Important Notes:**
- Deletion is IRREVERSIBLE
- You will need your password AND email access
- OTP expires after 5 minutes
- All actions are logged for audit purposes

### For Developers

**Code Architecture:**

```
Backend:
- hr.controller.ts: Handles HTTP requests
- hr.service.ts: Business logic
- users.service.ts: OTP generation/verification
- audit.service.ts: Audit logging

Frontend:
- app/hr/employees/[id]/page.tsx: Employee detail page
- Components: DeleteEmployeeModal
- API: /api/[...path]/route.ts (proxy)

Database:
- users table: Stores employees
- audit_logs table: Stores audit trail
```

**Key Methods:**
- `requestDeleteOtp()`: Request OTP via email
- `deleteEmployee()`: Delete with password + OTP
- `generateOtp()`: Generate 6-digit OTP
- `verifyOtp()`: Verify OTP code
- `sendOtpEmail()`: Send email via nodemailer

## 🆘 Support

### Common Questions

**Q: Can I undo a deletion?**
A: No, deletions are permanent. Ensure you have backups.

**Q: What if I don't receive the OTP email?**
A: Check spam folder, verify email configuration, or contact system administrator.

**Q: How long is the OTP valid?**
A: 5 minutes from generation time.

**Q: Can I use the same OTP twice?**
A: No, OTPs are single-use only.

**Q: What if the OTP expires?**
A: Request a new OTP by clicking "Request OTP" again.

### Contact

For issues or questions:
- Check documentation in this repository
- Review audit logs for debugging
- Contact system administrator

---

**Last Updated:** 2024-01-15  
**Version:** 1.0.0  
**Status:** ✅ Ready for Deployment
