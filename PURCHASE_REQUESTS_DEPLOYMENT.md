# Purchase Request System - Deployment Guide

## ✅ What Was Implemented

### 1. **Create Purchase Request** (Sales/Marketing/SuperAdmin)
- Full form with title, description, department, priority, estimated amount
- **OTP verification** required (2-step process)
- Password confirmation before OTP is sent
- Role-based department selection
- Beautiful modal UI with validation

### 2. **Review Purchase Request** (Accountant/SuperAdmin)
- Approve/Reject/Under Review options
- Set approved amount (must not exceed estimated)
- Add review notes
- **OTP verification** required
- Only visible to Accountant and SuperAdmin roles

### 3. **Upload Receipt/Claim** (Sales/Marketing/SuperAdmin)
- File upload (PDF/JPG/PNG, max 10MB)
- **ClamAV virus scanning** on backend
- Vendor name, amount, purchase date, description
- **OTP verification** required
- Only available for APPROVED requests

## 🎯 Features Included

✅ **Status Filters**: Filter by SUBMITTED, UNDER_REVIEW, APPROVED, REJECTED, PAID  
✅ **Department Filters**: Filter by Sales or Marketing  
✅ **Priority Badges**: Visual indicators (1-5, Normal to Urgent)  
✅ **Role-Based Access**: Different views for different roles  
✅ **Audit Logging**: All actions are logged via existing audit system  
✅ **Security**: OTP on all critical actions, ClamAV scanning, JWT auth  

## 📦 What Changed

### Files Modified:
- `frontend/app/purchase-requests/page.tsx` - Complete rewrite (117 → 980 lines)

### No Changes Needed:
- ✅ Backend (already fully implemented)
- ✅ Authentication system (untouched)
- ✅ API proxy (untouched)
- ✅ PM2 config (untouched)
- ✅ Nginx config (untouched)
- ✅ Environment variables (untouched)

## 🚀 Deployment Instructions

### On Your EC2 Instance:

```bash
# 1. SSH into your EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. Navigate to project directory
cd /home/ubuntu/fyp_system  # or wherever your project is

# 3. Run the deployment script
bash deploy-purchase-requests-feature.sh
```

### What the Script Does:
1. ✅ Pulls latest code from GitHub (main branch)
2. ✅ Builds the frontend (`npm run build`)
3. ✅ Reloads frontend with PM2 (zero downtime)
4. ✅ Verifies all services are running

### Expected Output:
```
==========================================
Purchase Request Feature Deployment
==========================================

Step 1: Pull latest code from GitHub...
Already up to date.

Step 2: Build frontend...
✓ Compiled successfully

Step 3: Restart frontend with PM2...
[PM2] Reloading process id 0

Step 4: Verify services...
┌─────┬────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name       │ mode        │ ↺       │ status  │ cpu      │
├─────┼────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ frontend   │ cluster     │ 0       │ online  │ 0%       │
│ 1   │ backend    │ cluster     │ 0       │ online  │ 0%       │
└─────┴────────────┴─────────────┴─────────┴─────────┴──────────┘

==========================================
✅ Deployment Complete!
==========================================
```

## 🧪 Testing After Deployment

### 1. Test Create Purchase Request (Sales/Marketing)
```
1. Login as sales_department or marketing user
2. Navigate to Purchase Requests page
3. Click "+ New Request" button
4. Fill in the form
5. Enter password → Request OTP
6. Check email for OTP code
7. Enter OTP → Create Request
8. Verify request appears in list with "SUBMITTED" status
```

### 2. Test Review Request (Accountant)
```
1. Login as accountant or super_admin
2. Navigate to Purchase Requests page
3. Find a SUBMITTED request
4. Click "Review" button
5. Select Approve/Reject, set amount, add notes
6. Enter password → Request OTP
7. Check email for OTP
8. Enter OTP → Submit Review
9. Verify status changes to APPROVED/REJECTED
```

### 3. Test Upload Claim (Sales/Marketing)
```
1. Login as sales_department or marketing (request creator)
2. Find an APPROVED request
3. Click "Upload Claim" button
4. Upload receipt file (PDF/JPG/PNG)
5. Fill in vendor, amount, date, description
6. Enter password → Request OTP
7. Check email for OTP
8. Enter OTP → Submit Claim
9. Verify claim count appears on request card
```

## 🔧 Troubleshooting

### Frontend Not Loading:
```bash
# Check frontend logs
pm2 logs frontend --lines 50

# Restart if needed
pm2 restart frontend

# Check if port 3001 is accessible
curl http://localhost:3001
```

### Backend API Errors:
```bash
# Check backend logs
pm2 logs backend --lines 50

# Verify backend is running
pm2 list | grep backend

# Check database connection
# (backend logs will show connection status)
```

### OTP Not Sending:
```bash
# Check backend environment variables
cat /home/ubuntu/fyp_system/backend/.env | grep EMAIL

# Verify EMAIL_USER, EMAIL_PASS, EMAIL_FROM are set
# Check backend logs for email sending errors
```

### File Upload Issues:
```bash
# Ensure uploads directory exists
ls -la /home/ubuntu/fyp_system/backend/uploads/receipts

# Check ClamAV is running (should be started by backend)
# Backend logs will show ClamAV scanning status
```

## 📊 Monitoring

### Check System Status:
```bash
pm2 list              # All processes
pm2 monit             # Real-time monitoring
pm2 logs --lines 100  # Recent logs
```

### Check Database:
```bash
# In backend directory
npm run typeorm migration:show
# Verify purchase_requests and claims tables exist
```

## 🔒 Security Notes

1. ✅ **OTP Required**: All critical actions require OTP verification
2. ✅ **ClamAV Scanning**: All uploaded files are scanned for viruses
3. ✅ **JWT Authentication**: All API calls require valid JWT token
4. ✅ **Role-Based Access**: Endpoints protected with @Roles() decorator
5. ✅ **Audit Logging**: All actions logged with user ID, IP, timestamp
6. ✅ **File Validation**: File size limit (10MB), type restriction (PDF/JPG/PNG)

## 📝 API Endpoints Used

All endpoints already exist in backend:

- `POST /purchase-requests/request-otp/create`
- `POST /purchase-requests` (create with OTP)
- `GET /purchase-requests` (list with role-based filtering)
- `GET /purchase-requests/:id` (get single)
- `POST /purchase-requests/request-otp/review`
- `PUT /purchase-requests/:id/review` (approve/reject with OTP)
- `POST /purchase-requests/request-otp/upload-receipt`
- `POST /purchase-requests/claims/upload` (with file + OTP)

## ✅ Verification Checklist

After deployment, verify:

- [ ] Frontend builds successfully
- [ ] PM2 shows both frontend and backend online
- [ ] Can access purchase requests page
- [ ] Create request modal opens
- [ ] OTP email is received
- [ ] Request creation works
- [ ] Accountant can see all requests
- [ ] Review modal works with OTP
- [ ] Upload claim modal appears for approved requests
- [ ] File upload works with ClamAV scanning
- [ ] Filters work (status, department)
- [ ] No console errors in browser
- [ ] No errors in PM2 logs

## 🎉 Success Criteria

You'll know it's working when:

1. ✅ Sales/Marketing can create purchase requests with OTP
2. ✅ Accountant sees all requests and can review them
3. ✅ Approved requests show "Upload Claim" button
4. ✅ File uploads are scanned and stored successfully
5. ✅ All actions are logged in audit logs
6. ✅ Email OTPs are sent and verified correctly

---

**Need Help?** Check:
- `pm2 logs frontend` - Frontend issues
- `pm2 logs backend` - Backend/API issues
- Browser console - Frontend JavaScript errors
- Nginx error log - Reverse proxy issues
