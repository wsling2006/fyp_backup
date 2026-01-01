# Fix: Employee Detail Page Crash

## Problem
When viewing employee details, the page showed:
```
Application error: a client-side exception has occurred
TypeError: b.map is not a function
```

Console log showed:
```
[HR] Loaded employee documents: undefined
```

## Root Cause
The backend returns documents in a nested structure:
```json
{
  "documents": [...]
}
```

But the frontend was trying to access `response.data` directly as an array and call `.map()` on it, which failed because `response.data` was an object, not an array.

## Fix Applied
Updated `frontend/app/hr/employees/[id]/page.tsx`:

### Before:
```typescript
const response = await api.get(`/hr/employees/${employeeId}/documents`);
console.log('[HR] Loaded employee documents:', response.data.length);
setDocuments(response.data);
```

### After:
```typescript
const response = await api.get(`/hr/employees/${employeeId}/documents`);
const docs = response.data?.documents || [];
console.log('[HR] Loaded employee documents:', docs.length);
setDocuments(docs);
```

Also added error handling to set empty array on failure:
```typescript
} catch (err: any) {
  console.error('[HR] Failed to load documents:', err);
  setDocuments([]); // Prevent crash
}
```

## How to Update EC2

### Quick Update:
```bash
./quick-update-ec2.sh /path/to/your-key.pem your-ec2-ip
```

### Manual Update:
```bash
# SSH into EC2
ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd /home/ubuntu/fyp_system

# Pull latest changes
git pull origin main

# Rebuild frontend
cd frontend
npm run build

# Restart frontend
pm2 restart frontend

# Verify
pm2 logs frontend --lines 50
```

## Verification
After updating, the employee detail page should:
1. ✅ Load without errors
2. ✅ Show employee information correctly
3. ✅ Display "No documents uploaded yet" if no documents exist
4. ✅ Display documents table if documents exist

## Additional Changes
Also improved error handling for employee data:
```typescript
setEmployee(response.data?.employee || response.data);
```

This handles both response formats:
- `{ employee: {...} }` (wrapped)
- `{...}` (direct object)
