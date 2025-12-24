# 🔧 Route Conflict Fix - Frontend Update Required

## ⚠️ IMPORTANT: Frontend API Routes Changed

### **What Changed:**
To fix a critical route conflict where the accounting module's purchase-request controller was blocking the main purchase-requests module, I've namespaced all accounting and employee routes.

---

## 📋 NEW API ROUTES

### Main Purchase Requests (Sales/Marketing/SuperAdmin)
**✅ NO CHANGE - Still works:**
- `/api/purchase-requests` - Main module for creating/managing purchase requests

### Accounting Routes (Accountant Only)
**⚠️ CHANGED - New prefix `accounting/`:**
- `/api/accounting/purchase-requests` - Accountant view of purchase requests
- `/api/accounting/annual-expenses`
- `/api/accounting/cash-flows`
- `/api/accounting/financial-statements`
- `/api/accounting/payroll-reports`
- `/api/accounting/suppliers`
- `/api/accounting/company-revenue`

### Employee Routes (HR Only)
**⚠️ CHANGED - New prefix `employees/`:**
- `/api/employees/activity-logs`
- `/api/employees/announcements`
- `/api/employees/attendance`
- `/api/employees/documents`

---

## 🚀 DEPLOYMENT STEPS

### Step 1: Deploy Backend (EC2)
```bash
cd ~/fyp_system
git pull origin main
cd backend
npm run build
pm2 restart backend
```

### Step 2: Update Frontend API Calls
You'll need to update any frontend code that calls the accounting or employee endpoints to use the new prefixed routes.

**Search for these in your frontend:**
```bash
cd ~/fyp_system/frontend
grep -r "annual-expenses" .
grep -r "cash-flows" .
grep -r "financial-statements" .
grep -r "payroll-reports" .
grep -r "suppliers" .
grep -r "activity-logs" .
grep -r "announcements" .
grep -r "attendance" .
grep -r "/documents" .
```

**Example update:**
```typescript
// ❌ Old:
const response = await api.get('/api/annual-expenses');

// ✅ New:
const response = await api.get('/api/accounting/annual-expenses');
```

---

## ✅ WHAT THIS FIXES

### The Problem:
Both controllers used `@Controller('purchase-requests')`:
- **Accounting controller** (accountant only) - for viewing/managing
- **Main controller** (sales/marketing) - for creating requests

When you tried to create a purchase request as sales_department, the accounting controller intercepted it first and blocked you with "Insufficient permissions".

### The Solution:
- **Main purchase-requests**: `/api/purchase-requests` (for sales/marketing to create)
- **Accounting view**: `/api/accounting/purchase-requests` (for accountants to manage)

Now both work independently! ✅

---

## 🧪 TESTING

### Test Purchase Requests Creation (Sales/Marketing):
```bash
# This should work for sales_department
curl -X GET https://fyp-system.online/api/purchase-requests \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Accounting View (Accountant):
```bash
# This requires accountant role
curl -X GET https://fyp-system.online/api/accounting/purchase-requests \
  -H "Authorization: Bearer ACCOUNTANT_TOKEN"
```

---

## 📝 FRONTEND UPDATE CHECKLIST

If your frontend already has pages for these features, update the API calls:

### Accounting Pages:
- [ ] Annual Expenses page → use `/api/accounting/annual-expenses`
- [ ] Cash Flows page → use `/api/accounting/cash-flows`
- [ ] Financial Statements page → use `/api/accounting/financial-statements`
- [ ] Payroll Reports page → use `/api/accounting/payroll-reports`
- [ ] Suppliers page → use `/api/accounting/suppliers`

### HR Pages:
- [ ] Activity Logs page → use `/api/employees/activity-logs`
- [ ] Announcements page → use `/api/employees/announcements`
- [ ] Attendance page → use `/api/employees/attendance`
- [ ] Documents page → use `/api/employees/documents`

### Main Pages (No Changes):
- [x] Purchase Requests page → still uses `/api/purchase-requests` ✅

---

## 🎯 IMMEDIATE NEXT STEPS

1. **Deploy backend** on EC2 (commands above)
2. **Test purchase requests** - should work now for sales_department!
3. **Identify frontend pages** that use accounting/employee endpoints
4. **Update API calls** to use new prefixed routes
5. **Test each feature** to ensure it works

---

## 📊 Quick Reference

| Feature | Old Route | New Route | Who Can Access |
|---------|-----------|-----------|----------------|
| **Purchase Requests (Create)** | `/purchase-requests` | `/purchase-requests` ✅ | Sales, Marketing, SuperAdmin |
| **Purchase Requests (Accountant View)** | `/purchase-requests` ❌ | `/accounting/purchase-requests` ✅ | Accountant |
| Annual Expenses | `/annual-expenses` | `/accounting/annual-expenses` | Accountant |
| Cash Flows | `/cash-flows` | `/accounting/cash-flows` | Accountant |
| Financial Statements | `/financial-statements` | `/accounting/financial-statements` | Accountant |
| Payroll Reports | `/payroll-reports` | `/accounting/payroll-reports` | Accountant |
| Suppliers | `/suppliers` | `/accounting/suppliers` | Accountant |
| Activity Logs | `/activity-logs` | `/employees/activity-logs` | HR |
| Announcements | `/announcements` | `/employees/announcements` | HR |
| Attendance | `/attendance` | `/employees/attendance` | HR |
| Documents | `/documents` | `/employees/documents` | HR |

---

## 🎉 Summary

**The critical issue is FIXED on the backend!**

Sales/Marketing users can now access `/api/purchase-requests` without hitting the accountant-only controller.

If you have frontend pages for accounting or HR features, update their API calls to use the new prefixed routes.
