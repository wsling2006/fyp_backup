# 🧪 HR UI MODULE - TESTING GUIDE

**Quick testing checklist for the HR Employee Management UI**

---

## 🚀 QUICK START TESTING

### **1. Start Frontend & Backend**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Expected:**
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`

---

## 👤 CREATE TEST HR USER

If you don't have an HR user yet:

```bash
# Connect to database
psql -U jw -d fyp_db

# Create HR user
INSERT INTO users (id, email, password, role, is_mfa_enabled, is_mfa_verified)
VALUES (
  uuid_generate_v4(),
  'hr@test.com',
  '$2b$10$YourHashedPasswordHere', -- Use bcrypt to hash 'password123'
  'human_resources',
  false,
  true
);
```

Or update existing user:

```sql
UPDATE users 
SET role = 'human_resources' 
WHERE email = 'your-email@example.com';
```

---

## 🧪 UI TESTING WORKFLOW

### **Test 1: Login & Navigation**

1. **Navigate to:** `http://localhost:3001/login`
2. **Login as:** `hr@test.com` / `password123`
3. **Expected:** Redirect to `/hr/employees` (Employee Directory)
4. **Check Sidebar:** Should show "Employee Management" link

✅ **PASS:** HR user logged in and redirected to employee page  
❌ **FAIL:** Check user role in database

---

### **Test 2: Employee List Page**

**URL:** `http://localhost:3001/hr/employees`

**Visual Checks:**
- [ ] Page title: "Employee Directory"
- [ ] Search bar present
- [ ] Table with columns: Employee ID, Full Name, Status, Actions
- [ ] Status badges colored correctly (green/yellow/red)
- [ ] "View Profile" buttons present
- [ ] Data privacy notice at bottom

**Functional Checks:**
- [ ] Search by name filters results
- [ ] Search by employee ID filters results
- [ ] "Refresh" button reloads data
- [ ] Click "View Profile" navigates to detail page

**Console Checks:**
```
[HR] Loaded employees: 5
```

✅ **PASS:** List loads with minimal data (ID, name, status only)  
❌ **FAIL:** Check backend API: `GET /api/hr/employees`

---

### **Test 3: Employee Detail Page**

**URL:** `http://localhost:3001/hr/employees/[employee-id]`

**Visual Checks:**
- [ ] Employee name in header
- [ ] Status badge (ACTIVE/INACTIVE/TERMINATED)
- [ ] "Back to Employee List" button
- [ ] Personal Information card (name, email, phone, address, emergency, birthday)
- [ ] Sensitive Information card with 🔒 lock icon
  - [ ] IC Number displayed
  - [ ] Bank Account Number displayed
  - [ ] Amber warning border
  - [ ] Audit warning text
- [ ] Employment Information card (position, department, joining date)
- [ ] Employee Documents section
- [ ] "Upload Document" button
- [ ] Audit Trail notice at bottom

**Functional Checks:**
- [ ] Back button navigates to list
- [ ] All fields display correctly (or "N/A" if null)
- [ ] Dates formatted properly (e.g., "January 15, 1990")
- [ ] Documents table loads (if any exist)

**Console Checks:**
```
[HR] Loaded employee details
[HR] Loaded employee documents: 0
```

✅ **PASS:** Detail page shows full employee data with security warnings  
❌ **FAIL:** Check backend API: `GET /api/hr/employees/:id`

---

### **Test 4: Document Upload**

**Steps:**
1. Click "Upload Document" button
2. Modal should open
3. Select a test file (PDF, Word, Image)
4. Choose document type (e.g., "Resume / CV")
5. Add optional description
6. Click "Upload Document"

**Visual Checks:**
- [ ] Modal opens
- [ ] File selector accepts files
- [ ] Selected file name displays
- [ ] Document type dropdown works
- [ ] Description textarea optional
- [ ] "Uploading..." loading state shows
- [ ] Success: Modal closes, documents reload
- [ ] Error: Error message displays (e.g., file too large, infected)

**Functional Checks:**
- [ ] Valid file uploads successfully
- [ ] Large file (>10MB) rejected
- [ ] Documents list refreshes after upload
- [ ] New document appears in table

**Console Checks:**
```
[HR] Document uploaded successfully
[HR] Loaded employee documents: 1
```

✅ **PASS:** Document uploaded and appears in list  
❌ **FAIL:** Check ClamAV running, check backend logs

---

### **Test 5: Document Download**

**Steps:**
1. Click "Download" button on a document
2. File should download to your browser's download folder

**Visual Checks:**
- [ ] Download button clickable
- [ ] Browser download prompt appears
- [ ] File downloaded with correct name
- [ ] File opens correctly (e.g., PDF viewer)

**Console Checks:**
```
[HR] Downloading document: <document-id>
[HR] Document downloaded successfully
```

✅ **PASS:** Document downloads with correct filename  
❌ **FAIL:** Check backend API: `GET /api/hr/employees/:id/documents/:docId/download`

---

### **Test 6: Search Functionality**

**Test Cases:**

| Search Query | Expected Result |
|--------------|----------------|
| `john` | Shows employees with "John" in name |
| `emp001` | Shows employee with ID "EMP001" |
| `doe` | Shows employees with "Doe" in name |
| `xyz123` | Shows "No employees found" |

**Visual Checks:**
- [ ] Results update instantly (no API call)
- [ ] Count updates: "Showing X of Y employees"
- [ ] Clear search shows all employees

✅ **PASS:** Search filters correctly  
❌ **FAIL:** Check filter logic in `page.tsx`

---

### **Test 7: Status Badge Colors**

**Visual Checks:**
- [ ] ACTIVE: Green background, green text
- [ ] INACTIVE: Yellow background, yellow text
- [ ] TERMINATED: Red background, red text

✅ **PASS:** Status badges colored correctly  
❌ **FAIL:** Check `getStatusBadgeColor()` function

---

### **Test 8: Security & Authorization**

**Test as Non-HR User:**

1. Logout
2. Login as ACCOUNTANT or SALES user
3. Try to access: `http://localhost:3001/hr/employees`

**Expected:**
- [ ] Redirect to `/dashboard`
- [ ] OR "Access denied" message

**Test as Unauthenticated:**

1. Logout
2. Try to access: `http://localhost:3001/hr/employees`

**Expected:**
- [ ] Redirect to `/login`

✅ **PASS:** Non-HR users blocked from HR pages  
❌ **FAIL:** Check role authorization in `useEffect`

---

### **Test 9: Error Handling**

**Test 401 Unauthorized:**
1. Delete JWT token from localStorage: `localStorage.removeItem('token')`
2. Refresh page

**Expected:**
- [ ] Auto-logout
- [ ] Redirect to `/login`

**Test 403 Forbidden:**
1. Manually change user role in localStorage to non-HR
2. Refresh page

**Expected:**
- [ ] "Access denied" error message
- [ ] OR redirect to `/dashboard`

**Test 404 Not Found:**
1. Access invalid employee ID: `/hr/employees/invalid-uuid`

**Expected:**
- [ ] "Employee not found" error message
- [ ] Back button to return to list

✅ **PASS:** Errors handled gracefully  
❌ **FAIL:** Check error handling in `catch` blocks

---

### **Test 10: Mobile Responsiveness**

**Steps:**
1. Open browser DevTools (F12)
2. Toggle device toolbar (mobile view)
3. Test on iPhone, iPad, Android sizes

**Visual Checks:**
- [ ] Layout doesn't break on small screens
- [ ] Table scrolls horizontally if needed
- [ ] Cards stack vertically on mobile
- [ ] Buttons remain clickable
- [ ] Text readable (not too small)

✅ **PASS:** UI works on mobile devices  
❌ **FAIL:** Adjust CSS classes (add more responsive breakpoints)

---

## 🐛 COMMON ISSUES & SOLUTIONS

### **Issue 1: "Employee Management" link not showing in sidebar**

**Solution:**
Check user role matches exactly:
```sql
SELECT role FROM users WHERE email = 'hr@test.com';
-- Should return: 'human_resources' (not 'HR' or 'hr')
```

### **Issue 2: Employee list empty**

**Solution:**
Add test employees:
```sql
INSERT INTO employees (id, employee_id, name, email, status)
VALUES 
  (uuid_generate_v4(), 'EMP001', 'John Doe', 'john@test.com', 'ACTIVE'),
  (uuid_generate_v4(), 'EMP002', 'Jane Smith', 'jane@test.com', 'ACTIVE');
```

### **Issue 3: Document upload fails with "Virus detected"**

**Solution:**
Use EICAR test file to verify ClamAV is working:
```bash
# Generate safe test file
echo "X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*" > test-virus.txt

# Upload should be rejected
```

For normal files, ensure ClamAV is running:
```bash
sudo systemctl status clamav-daemon
```

### **Issue 4: Download button not working**

**Solution:**
Check browser console for errors. Verify backend returns file:
```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/hr/employees/<id>/documents/<docId>/download \
  --output test-download.pdf
```

### **Issue 5: Page shows blank or loading forever**

**Solution:**
Check:
1. Backend is running: `curl http://localhost:3000/health`
2. Frontend is running: `curl http://localhost:3001`
3. JWT token is valid: Check localStorage in DevTools
4. API proxy working: Check `/frontend/app/api/[...path]/route.ts`

---

## ✅ FINAL CHECKLIST

Before deploying to production:

- [ ] All Test 1-10 passed
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Mobile responsiveness verified
- [ ] Security authorization works
- [ ] Error handling graceful
- [ ] Audit notices visible
- [ ] Documents upload/download work
- [ ] Search functionality works
- [ ] Status badges display correctly

---

## 📊 TEST RESULTS TEMPLATE

```
TESTING DATE: ___________
TESTER: ___________

Test 1: Login & Navigation          [ PASS / FAIL ]
Test 2: Employee List Page          [ PASS / FAIL ]
Test 3: Employee Detail Page        [ PASS / FAIL ]
Test 4: Document Upload             [ PASS / FAIL ]
Test 5: Document Download           [ PASS / FAIL ]
Test 6: Search Functionality        [ PASS / FAIL ]
Test 7: Status Badge Colors         [ PASS / FAIL ]
Test 8: Security & Authorization    [ PASS / FAIL ]
Test 9: Error Handling              [ PASS / FAIL ]
Test 10: Mobile Responsiveness      [ PASS / FAIL ]

OVERALL: [ PASS / FAIL ]

NOTES:
_____________________________________
_____________________________________
```

---

**Happy Testing! 🧪✅**
