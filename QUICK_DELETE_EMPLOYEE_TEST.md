# Quick Test Guide: Delete Employee Feature

## 🚀 How to Test the Delete Employee Feature

### Prerequisites
- Backend and frontend running (locally or on EC2)
- HR user account credentials
- At least one test employee in the system

---

## Local Testing (Development)

### 1. Start Backend & Frontend
```bash
# Terminal 1 - Backend
cd /Users/jw/fyp_system/backend
npm run start:dev

# Terminal 2 - Frontend
cd /Users/jw/fyp_system/frontend
npm run dev
```

### 2. Login as HR User
- Open browser: `http://localhost:3000`
- Login with HR credentials
- Navigate to: **HR Dashboard** → **Employees** → **Click any employee**

### 3. Test Delete Flow

#### Step 1: Open Delete Modal
- Click **"Delete Employee"** button (red outline, top right)
- Modal should appear with warnings

#### Step 2: Read Warnings & Proceed
- Read the red warning banner
- Read the blue alternative suggestion
- Click **"Proceed with Deletion"**

#### Step 3: Enter Password
- Enter your HR account password
- Click **"Request OTP Code"**
- Watch Terminal 1 (backend logs) for OTP

**Expected Backend Log:**
```
[HR] Generated OTP for user [user-id]: 123456 (expires in 5 minutes)
```

#### Step 4: Enter OTP
- Copy the 6-digit OTP from backend logs
- Paste into the OTP field
- Click **"🗑️ Delete Employee"**

**Expected Results:**
- Success message (or redirect)
- Redirected to employee list
- Employee no longer in list
- Backend logs show audit entry:
  ```
  [HR] Employee deleted: [employee-id] by user [user-id]
  [Audit] DELETE_EMPLOYEE: [details]
  ```

---

## EC2 Testing (Production)

### 1. SSH into EC2
```bash
ssh -i "your-key.pem" ec2-user@your-ec2-ip
```

### 2. Check Services Running
```bash
pm2 list
# Should show: backend (online), frontend (online)
```

### 3. Monitor Logs
```bash
# Terminal 1 - Backend logs (watch for OTP)
pm2 logs backend --lines 50

# Terminal 2 - Frontend logs (optional)
pm2 logs frontend --lines 20
```

### 4. Test in Browser
- Open: `http://your-ec2-ip:3000`
- Follow same testing steps as local
- Watch PM2 logs for OTP code

---

## Testing Checklist

### ✅ Positive Tests
- [ ] Click delete button → modal opens
- [ ] Enter correct password → OTP step opens
- [ ] Enter correct OTP → employee deleted
- [ ] Employee removed from list
- [ ] Audit log created in backend

### ✅ Negative Tests (Error Handling)
- [ ] Leave password empty → button disabled
- [ ] Enter wrong password → error message shown
- [ ] Leave OTP empty → button disabled
- [ ] Enter wrong OTP → error message shown
- [ ] Enter OTP with letters → only numbers accepted
- [ ] Enter OTP > 6 digits → truncated to 6

### ✅ User Experience Tests
- [ ] Click "Cancel" at each step → modal closes
- [ ] Click "×" button → modal closes
- [ ] Click "Back" button → returns to previous step
- [ ] Press Enter key in password field → submits
- [ ] Press Enter key in OTP field → submits (if 6 digits)
- [ ] Loading states shown during API calls
- [ ] Error messages clear and helpful
- [ ] Warnings are prominent and clear

### ✅ Security Tests
- [ ] Cannot delete without password
- [ ] Cannot delete without OTP
- [ ] OTP expires after 5 minutes (try waiting)
- [ ] Old OTP doesn't work after new request
- [ ] Audit log includes all details

---

## Common Issues & Solutions

### Issue: "Failed to request OTP"
**Cause**: Wrong password or backend not running  
**Solution**: 
- Check password is correct
- Verify backend is running: `pm2 list`
- Check backend logs: `pm2 logs backend`

### Issue: "Failed to delete employee"
**Cause**: Wrong OTP or OTP expired  
**Solution**:
- Check you copied OTP correctly
- OTP is case-sensitive (though it's only numbers)
- Request new OTP if >5 minutes passed
- Check backend logs for OTP value

### Issue: Can't find OTP in logs
**Cause**: Backend logs too long or scrolled away  
**Solution**:
```bash
# Local
# Check Terminal 1 (backend) after clicking "Request OTP"

# EC2
pm2 logs backend --lines 100 | grep "Generated OTP"
```

### Issue: Modal doesn't close after deletion
**Cause**: Network error or API timeout  
**Solution**:
- Check backend logs for error
- Check browser console (F12)
- Verify employee was deleted (check database or employee list)

---

## Expected OTP Log Format

### Development (Console)
```
[UsersService] Generated OTP for user abc-123: 456789
[UsersService] OTP expires at: 2025-01-20T10:45:00.000Z
```

### Production (Email - Future)
```
Subject: Your OTP Code for Employee Deletion

Your one-time password (OTP) is: 456789

This code will expire in 5 minutes.

If you did not request this, please contact IT immediately.
```

---

## Quick Create Test Employee (Optional)

If you need a test employee to delete:

```bash
# Method 1: Via HR Portal UI
1. Login as HR
2. Go to Employees → Add Employee
3. Fill form and submit

# Method 2: Via API (Postman/cURL)
curl -X POST http://localhost:3001/api/hr/employees \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Employee",
    "employee_id": "TEST001",
    "email": "test@example.com",
    "status": "ACTIVE"
  }'
```

---

## Cleanup After Testing

### Remove Test Audit Logs (Optional)
```bash
# Backend logs stored in database - use admin tools to clean
# Or let them stay for testing audit trail feature
```

### Reset Test Employee (Optional)
```bash
# If you want to re-test, create a new test employee
# Original employee is permanently deleted (as designed)
```

---

## Video Walkthrough Script

If recording a demo:

1. **[0:00-0:10]** Show employee list page
2. **[0:10-0:20]** Click on employee to view details
3. **[0:20-0:30]** Click "Delete Employee" button
4. **[0:30-0:50]** Show warning modal, read warnings
5. **[0:50-1:00]** Click "Proceed with Deletion"
6. **[1:00-1:20]** Enter password, click "Request OTP"
7. **[1:20-1:40]** Show backend logs with OTP
8. **[1:40-2:00]** Copy OTP, paste in modal
9. **[2:00-2:10]** Click "Delete Employee"
10. **[2:10-2:20]** Show redirect to list
11. **[2:20-2:30]** Show employee gone from list
12. **[2:30-2:40]** Show audit log in backend

---

## Success Indicators ✅

You'll know it works when:
1. ✅ Modal opens with clear warnings
2. ✅ Password validation works (wrong password = error)
3. ✅ OTP appears in backend logs
4. ✅ OTP validation works (wrong OTP = error)
5. ✅ Employee deleted from database
6. ✅ Employee removed from list
7. ✅ Audit log created
8. ✅ No errors in console or logs

---

## Next Steps After Testing

### If Tests Pass ✅
1. Deploy to production EC2
2. Test with real HR user
3. Monitor audit logs
4. Document for team

### If Tests Fail ❌
1. Check browser console (F12)
2. Check backend logs: `pm2 logs backend`
3. Check database connection
4. Check JWT token validity
5. Check API endpoints match

---

## Support & Documentation

- **Backend Implementation**: `EMPLOYEE_DELETE_FEATURE_GUIDE.md`
- **Frontend Implementation**: `DELETE_EMPLOYEE_FRONTEND_COMPLETE.md`
- **Audit System**: `COMPLETE_HR_AUDIT_SYSTEM.md`
- **API Docs**: Check backend controller comments

---

**Happy Testing! 🧪✨**
