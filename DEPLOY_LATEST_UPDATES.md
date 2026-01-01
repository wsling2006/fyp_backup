# Quick Deployment Guide - Latest System Updates

## Overview
This guide covers the deployment of the latest system improvements including:
1. Multiple claims per purchase request
2. Simplified claim review workflow (PROCESS/REJECT only)
3. Delete APPROVED/PAID requests with no claims
4. **NEW: Remove OTP requirement from claim upload**

## Date
January 1, 2026

## Recent Changes Summary

### 1. Multiple Claims Per Purchase Request ✅
- Users can now submit multiple claims (receipts) for one purchase request
- Total claimed amount cannot exceed approved amount
- Remaining budget shown in upload modal
- Documentation: `MULTIPLE_CLAIMS_FEATURE.md`

### 2. Simplified Claim Review Workflow ✅
- Removed VERIFY button (no longer needed)
- Only two actions remain: PROCESS (approve & pay) and REJECT
- Streamlined accountant workflow
- Documentation: `SIMPLIFY_CLAIM_VERIFICATION.md`, `OPTION1_IMPLEMENTED.md`

### 3. Enhanced Delete Functionality ✅
- Can delete APPROVED requests with no claims
- Can delete PAID requests with no claims
- Delete button appears instantly after all claims are deleted
- Documentation: `FIX_DELETE_APPROVED_NO_CLAIMS.md`, `FIX_DELETE_BUTTON_AFTER_CLAIMS.md`

### 4. Remove OTP from Claim Upload (NEW) ✅
- Users no longer need OTP to upload claims
- Single-step upload form (no OTP request step)
- Faster and more efficient claim submission
- All security checks remain in place
- Documentation: `REMOVE_OTP_FROM_CLAIM_UPLOAD.md`

## Deployment Steps

### Step 1: Pull Latest Changes on EC2
```bash
ssh your-ec2-instance
cd /path/to/fyp_system
git pull origin main
```

### Step 2: Update Backend
```bash
cd backend

# Install dependencies (if any new ones)
npm install

# Build the backend
npm run build

# Restart PM2 process
pm2 restart backend
# or if using a different name
pm2 restart all

# Check logs
pm2 logs backend
```

### Step 3: Update Frontend
```bash
cd ../frontend

# Install dependencies (if any new ones)
npm install

# Build the frontend
npm run build

# Restart PM2 process
pm2 restart frontend
# or
pm2 restart all

# Check logs
pm2 logs frontend
```

### Step 4: Verify Services
```bash
# Check PM2 status
pm2 status

# Check backend health
curl http://localhost:3000/health

# Check frontend (if running)
curl http://localhost:3001
```

### Step 5: Test Key Features

1. **Test Claim Upload Without OTP**
   - Login as Sales/Marketing user
   - Navigate to an APPROVED purchase request
   - Click "Upload Claim"
   - Fill out form and submit WITHOUT requesting OTP
   - Verify claim is uploaded successfully

2. **Test Multiple Claims**
   - Upload a second claim for the same purchase request
   - Verify remaining budget is calculated correctly
   - Verify total cannot exceed approved amount

3. **Test Simplified Claim Review**
   - Login as Accountant
   - View a pending claim
   - Verify only PROCESS and REJECT buttons are visible
   - Test PROCESS action (approve & pay in one step)

4. **Test Enhanced Delete**
   - Create a purchase request and get it approved
   - Upload a claim
   - Delete the claim
   - Verify delete button for request appears immediately
   - Delete the approved request with no claims

## Quick PM2 Commands

```bash
# View all processes
pm2 status

# View logs
pm2 logs

# Restart specific process
pm2 restart backend
pm2 restart frontend

# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all

# Delete all processes and restart
pm2 delete all
pm2 start backend
pm2 start frontend
```

## Environment Variables to Check

Ensure these are set correctly on EC2:

### Backend (.env)
```
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
CLAMD_HOST=localhost
CLAMD_PORT=3310
```

### Frontend (.env.local or .env.production)
```
NEXT_PUBLIC_BACKEND_URL=http://your-ec2-ip:3000
```

## Rollback Plan

If issues occur, you can rollback to previous version:

```bash
# Find the previous commit hash
git log --oneline -10

# Rollback to previous commit
git reset --hard <previous-commit-hash>

# Force push (if needed)
git push -f origin main

# Rebuild and restart
cd backend && npm run build && pm2 restart backend
cd ../frontend && npm run build && pm2 restart frontend
```

## Troubleshooting

### Issue: OTP Still Required Error
**Solution**: 
- Verify backend was rebuilt after pulling changes
- Check that `CreateClaimDto` no longer has `otp` field
- Clear browser cache
- Restart backend: `pm2 restart backend`

### Issue: Claims Not Showing
**Solution**:
- Check backend logs: `pm2 logs backend`
- Verify database connection
- Check JWT authentication is working

### Issue: Delete Button Not Appearing
**Solution**:
- Verify all claims are deleted first
- Refresh the page
- Check console for errors
- Verify `canDeleteRequest` logic in frontend

### Issue: Build Failures
**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## Monitoring After Deployment

1. **Check PM2 Logs**
   ```bash
   pm2 logs --lines 100
   ```

2. **Monitor Error Rates**
   - Watch for any 500 errors
   - Check for authentication issues
   - Monitor claim upload success rate

3. **Database Monitoring**
   - Check claims table for new entries
   - Verify no duplicate entries
   - Check purchase_requests status updates

4. **User Feedback**
   - Ask accountants about claim review workflow
   - Ask sales/marketing about upload experience
   - Gather feedback on delete functionality

## Success Criteria

✅ Backend builds and starts successfully  
✅ Frontend builds and starts successfully  
✅ Users can upload claims without OTP  
✅ Multiple claims can be uploaded per request  
✅ Claim review shows only PROCESS/REJECT buttons  
✅ APPROVED/PAID requests can be deleted when no claims exist  
✅ Delete button appears immediately after deleting all claims  
✅ All security checks still function (auth, ownership, validation)  

## Support

If you encounter issues:
1. Check logs: `pm2 logs`
2. Review documentation files mentioned above
3. Verify environment variables
4. Check database connectivity
5. Restart services: `pm2 restart all`

## Related Documentation

- `REMOVE_OTP_FROM_CLAIM_UPLOAD.md` - OTP removal details
- `MULTIPLE_CLAIMS_FEATURE.md` - Multiple claims feature
- `SIMPLIFY_CLAIM_VERIFICATION.md` - Simplified review workflow
- `FIX_DELETE_APPROVED_NO_CLAIMS.md` - Enhanced delete functionality
- `COMPLETE_SYSTEM_GUIDE.md` - Complete system documentation
