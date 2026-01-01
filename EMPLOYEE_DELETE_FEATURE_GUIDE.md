## 🗑️ EMPLOYEE DELETION FEATURE - IMPLEMENTATION GUIDE

### ✅ Backend Implemented (Committed: 68b0bfd)

**Security Features:**
1. ✅ Password verification (argon2)
2. ✅ OTP verification (10-minute expiry)
3. ✅ Audit log created BEFORE deletion
4. ✅ Cannot be undone warning
5. ✅ Deletes employee + all documents

**API Endpoints:**

```typescript
// Request OTP for deletion
POST /hr/employees/:id/request-delete-otp
Response: { success: true, message: "OTP sent to email", otp_debug: "123456" }

// Delete employee (requires password + OTP)
DELETE /hr/employees/:id
Body: { password: "user_password", otpCode: "123456" }
Response: { success: true, message: "Employee deleted", deleted_employee: {...} }
```

---

### 📋 FRONTEND TODO:

Create a Delete Employee Modal with:

1. **Warning Section** (Red background):
   - ⚠️ Icon
   - "PERMANENT DELETION - CANNOT BE UNDONE"
   - "This will delete:"
     - Employee record
     - All documents
     - Cannot be recovered

2. **Employee Info Display**:
   - Name, Employee ID
   - Position, Department

3. **Verification Steps**:
   ```
   Step 1: Enter your password
   [Password Input Field]
   
   Step 2: Request OTP
   [Button: Send OTP to Email]
   
   Step 3: Enter OTP
   [OTP Input Field]
   
   Step 4: Confirm Deletion
   [Button: DELETE EMPLOYEE (PERMANENT)]
   ```

4. **Buttons**:
   - Cancel (Grey)
   - Delete (Red, disabled until password + OTP entered)

---

### 🎨 FRONTEND IMPLEMENTATION:

**File to edit:**
`frontend/app/hr/employees/[id]/page.tsx`

**Add:**
1. State for delete modal
2. Delete modal component
3. Delete button in UI
4. API calls for request-delete-otp and delete

**Example code structure:**

```typescript
// State
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [deletePassword, setDeletePassword] = useState('');
const [deleteOtp, setDeleteOtp] = useState('');
const [otpSent, setOtpSent] = useState(false);

// Request OTP
const handleRequestDeleteOtp = async () => {
  const response = await api.post(`/hr/employees/${employeeId}/request-delete-otp`);
  setOtpSent(true);
  alert('OTP sent to your email');
};

// Delete employee
const handleDeleteEmployee = async () => {
  try {
    await api.delete(`/hr/employees/${employeeId}`, {
      data: { password: deletePassword, otpCode: deleteOtp }
    });
    alert('Employee deleted successfully');
    router.push('/hr/employees');
  } catch (error) {
    alert(error.response?.data?.message || 'Delete failed');
  }
};
```

---

### 🧪 TESTING:

1. **Request OTP**:
   ```bash
   curl -X POST http://localhost:4000/hr/employees/{id}/request-delete-otp \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```
   Check logs for OTP: `pm2 logs backend | grep "OTP"`

2. **Delete Employee**:
   ```bash
   curl -X DELETE http://localhost:4000/hr/employees/{id} \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"password":"your_password","otpCode":"123456"}'
   ```

3. **Check Audit Log**:
   - Should see DELETE_EMPLOYEE entry
   - Should show employee details before deletion
   - Should show "PERMANENT DELETION - CANNOT BE UNDONE"

---

### ⚠️ PRODUCTION NOTES:

1. **Email Sending**: Currently logs OTP to console. Implement proper email sending using your email service.

2. **Remove Debug OTP**: In production, remove `otp_debug` from response:
   ```typescript
   // REMOVE THIS LINE IN PRODUCTION:
   otp_debug: process.env.NODE_ENV === 'development' ? otp : undefined,
   ```

3. **Rate Limiting**: Add rate limiting to prevent OTP spam.

4. **Notification**: Consider sending email notification to super_admin when employee is deleted.

---

### 🚀 DEPLOYMENT:

```bash
cd ~/fyp_system
git pull
cd backend
npm run build
pm2 restart backend
```

---

Next: Implement frontend delete modal UI!
