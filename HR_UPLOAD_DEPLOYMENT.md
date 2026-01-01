# HR Employee Upload - Deployment and Testing Guide

## Issue Summary
File uploads in HR employee dashboard were stuck showing "Uploading..." indefinitely.

## Root Causes (FIXED)
1. ✅ Wrong endpoint path (now corrected to `/documents/upload`)
2. ✅ Missing timeout configuration (now 120 seconds for ClamAV scan)

## What Was Fixed

### Frontend Changes

#### 1. Upload Modal (`frontend/app/hr/employees/[id]/page.tsx`)
```typescript
// BEFORE (BROKEN):
await api.post(`/hr/employees/${employeeId}/documents`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  // NO TIMEOUT - Would hang forever!
});

// AFTER (FIXED):
await api.post(`/hr/employees/${employeeId}/documents/upload`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 120000, // 2 minutes for ClamAV malware scan
});
```

#### 2. Create Employee (`frontend/app/hr/employees/add/page.tsx`)
```typescript
// BEFORE (BROKEN):
await api.post(`/hr/employees/${employeeId}/documents/upload`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  // NO TIMEOUT - Would hang forever!
});

// AFTER (FIXED):
await api.post(`/hr/employees/${employeeId}/documents/upload`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
  timeout: 120000, // 2 minutes for ClamAV malware scan
});
```

## Deployment Steps

### 1. On Local Machine (macOS)
```bash
cd /Users/jw/fyp_system

# Verify all checks pass
./diagnose-hr-upload.sh

# Should show all ✅ checks passing
```

### 2. Deploy to EC2
```bash
# SSH to EC2
ssh -i /path/to/key.pem ubuntu@YOUR_EC2_IP

# Pull latest code
cd /home/ubuntu/fyp_system
git pull origin main

# Verify the fixes are present
grep -n "timeout: 120000" frontend/app/hr/employees/[id]/page.tsx
grep -n "timeout: 120000" frontend/app/hr/employees/add/page.tsx

# Should show line numbers with timeout configuration
```

### 3. Rebuild and Restart Services
```bash
# Stop services
pm2 stop all

# Rebuild backend
cd /home/ubuntu/fyp_system/backend
npm install
npm run build

# Rebuild frontend
cd /home/ubuntu/fyp_system/frontend
npm install
npm run build

# Restart services
pm2 restart all

# Verify services are running
pm2 status

# Both backend and frontend should show "online" status
```

### 4. Verify ClamAV is Running
```bash
# Check ClamAV daemon
sudo systemctl status clamav-daemon

# Should show "active (running)"

# If not running, start it
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
```

## Testing Procedure

### Test 1: Upload Document in Employee Detail Page
1. Navigate to HR Dashboard: `http://YOUR_EC2_IP:3001/hr/employees`
2. Click on any employee to view details
3. Click "📤 Upload Document" button
4. Select a PDF file (max 10MB)
5. Choose document type (e.g., Resume)
6. Click "Upload Document"
7. **Expected Result**: 
   - Shows "Uploading..." for 30-60 seconds (ClamAV scan)
   - Success message appears
   - Document appears in list
   - Modal closes

### Test 2: Upload Documents During Employee Creation
1. Navigate to: `http://YOUR_EC2_IP:3001/hr/employees/add`
2. Fill in employee details
3. Attach Resume (PDF)
4. Attach Employment Agreement (PDF)
5. Click "Create Employee"
6. **Expected Result**:
   - Shows loading state for 30-60 seconds
   - Employee created successfully
   - Redirected to employee list
   - Documents attached to new employee

### Test 3: Error Handling
1. Try uploading a non-PDF file (e.g., .txt, .docx)
   - **Expected**: "Only PDF files are allowed" error
2. Try uploading a file > 10MB
   - **Expected**: "File size exceeds 10MB limit" error
3. Try uploading without selecting a file
   - **Expected**: "Please select a file" error

## Monitoring During Testing

### Terminal 1: Watch Backend Logs
```bash
pm2 logs backend --lines 50
```

Look for:
- `[HR] Uploading document for employee: <id>`
- `[ClamAV] Scanning file: <filename>`
- `[ClamAV] File is clean: <filename>`
- `[HR] Document uploaded successfully`

### Terminal 2: Watch Frontend Logs
```bash
pm2 logs frontend --lines 50
```

Look for:
- `[API Proxy] POST /api/hr/employees/<id>/documents/upload`
- Should NOT see any errors or timeouts

## Common Issues and Solutions

### Issue 1: Upload Still Stuck
**Symptoms**: Upload shows "Uploading..." forever

**Solution**:
```bash
# Check if latest code is deployed
cd /home/ubuntu/fyp_system
git log -1 --oneline

# Should show commit: "Fix HR employee document upload stuck issue"

# If not, pull and rebuild
git pull origin main
pm2 restart all
```

### Issue 2: 404 Not Found Error
**Symptoms**: Upload fails with "404 Not Found"

**Solution**:
```bash
# Check backend route is registered
cd /home/ubuntu/fyp_system/backend
grep -A 5 "documents/upload" src/employees/hr.controller.ts

# Rebuild backend
npm run build
pm2 restart backend
```

### Issue 3: 502 Bad Gateway
**Symptoms**: Upload fails with "502 Bad Gateway"

**Solution**:
```bash
# Backend is not running or crashed
pm2 restart backend
pm2 logs backend --lines 50
```

### Issue 4: ClamAV Scan Timeout
**Symptoms**: Upload times out after 2 minutes

**Solution**:
```bash
# Check if ClamAV is running
sudo systemctl status clamav-daemon

# Restart ClamAV
sudo systemctl restart clamav-daemon

# Update virus definitions
sudo freshclam
```

### Issue 5: "Malware Detected" Error
**Symptoms**: Upload rejected with malware message

**Solution**:
- This is expected behavior for infected files
- Try with a different, clean PDF file
- ClamAV is working correctly

## Verification Checklist

After deployment, verify:

- [ ] Backend is running (`pm2 status`)
- [ ] Frontend is running (`pm2 status`)
- [ ] ClamAV daemon is running (`sudo systemctl status clamav-daemon`)
- [ ] Latest code is deployed (`git log -1`)
- [ ] Upload in employee detail works (Test 1)
- [ ] Upload during employee creation works (Test 2)
- [ ] Error handling works (Test 3)
- [ ] Uploads complete within 2 minutes
- [ ] Documents appear in employee document list
- [ ] Audit logs are created for uploads

## Technical Details

### Upload Flow
```
1. User selects PDF file in browser
2. Frontend creates FormData with file
3. Frontend POSTs to /api/hr/employees/:id/documents/upload
   - With 120s timeout configuration
4. Next.js API proxy forwards to backend:
   - http://localhost:3000/hr/employees/:id/documents/upload
5. Backend receives file (Multer middleware)
6. Backend validates file type and size
7. Backend scans with ClamAV (30-60 seconds)
8. If clean: Backend saves to database
9. Backend returns success response
10. Frontend shows success and refreshes list
```

### Timeout Breakdown
- **ClamAV scan**: 30-60 seconds (typical for 10MB PDF)
- **Frontend timeout**: 120 seconds (2 minutes)
- **Buffer time**: 60 seconds (for network latency, DB operations)

### Why 120 Seconds?
- ClamAV scan can take up to 60 seconds for large PDFs
- Network latency on EC2: 5-10 seconds
- Database operations: 5-10 seconds
- Total: ~75 seconds
- Buffer: 45 seconds for safety
- **Total timeout: 120 seconds**

## Success Criteria

The fix is successful when:
1. ✅ Users can upload documents in employee detail page
2. ✅ Users can upload documents during employee creation
3. ✅ Uploads complete within 2 minutes
4. ✅ No more "stuck" uploads showing "Uploading..." forever
5. ✅ Error messages are clear and helpful
6. ✅ Documents appear in employee document list
7. ✅ Audit logs are created

## Rollback Plan

If issues persist after deployment:

```bash
# Rollback to previous commit
cd /home/ubuntu/fyp_system
git log --oneline -10  # Find previous stable commit
git checkout <previous-commit-hash>

# Rebuild and restart
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
pm2 restart all
```

## Support

If issues continue after following this guide:
1. Check PM2 logs: `pm2 logs --lines 100`
2. Check ClamAV status: `sudo systemctl status clamav-daemon`
3. Check disk space: `df -h`
4. Check memory: `free -m`
5. Review this guide: `/Users/jw/fyp_system/HR_UPLOAD_DEPLOYMENT.md`
6. Contact system administrator

---

**Last Updated**: 2026-01-02  
**Commit**: Fix HR employee document upload stuck issue (9945585)  
**Status**: ✅ FIXED - Awaiting deployment and testing
