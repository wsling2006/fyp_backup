#!/bin/bash

# ============================================================================
# EC2 Deployment Guide - HR Audit sessionStorage Fix
# ============================================================================

cat << 'EOF'
========================================
EC2 Deployment - HR Audit Fix
========================================

The sessionStorage fix has been pushed to GitHub!
Now deploy it to your EC2 instance.

========================================
Step 1: SSH to EC2
========================================

ssh -i your-key.pem ubuntu@your-ec2-ip

========================================
Step 2: Pull Latest Changes
========================================

cd /home/ubuntu/fyp_system
git pull origin main

Expected output:
  remote: Enumerating objects...
  Updating 9a338af..d7c8206
  Fast-forward
   frontend/app/hr/employees/[id]/page.tsx | XX +-, XX -
   ...

========================================
Step 3: Deploy Frontend
========================================

# Navigate to frontend
cd frontend

# Install dependencies (if any new ones)
npm install

# Build the frontend
npm run build

# Restart the frontend process
pm2 restart frontend

# Check if it's running
pm2 list

========================================
Step 4: Check Logs
========================================

# View frontend logs
pm2 logs frontend --lines 50

# Press Ctrl+C to exit logs

========================================
Step 5: Test the Fix
========================================

1. Open browser to your EC2 frontend URL
2. Login as HR user
3. Open DevTools (F12) → Console tab
4. Clear sessionStorage:
   - Go to Application tab
   - Session Storage → Right-click → Clear
   - OR in Console: sessionStorage.clear()

5. Navigate to an employee profile
   Console should show: "[HR] Loaded employee details (silent=false)"
   
6. Check audit logs - new VIEW_EMPLOYEE_PROFILE should exist

7. Press F5 to refresh the page
   Console should show: "[HR] Loaded employee details (silent=true)"
   
8. Check audit logs - count should NOT increase!

9. Press F5 multiple times
   - Console keeps showing silent=true
   - Audit logs count stays the same

========================================
Expected Behavior
========================================

✅ First view → Audit log created
✅ Page refresh (F5) → NO audit log
✅ Multiple refreshes → NO audit logs
✅ Different employee → New audit log
✅ Browser close & reopen → New audit log (new session)

========================================
Troubleshooting
========================================

If console shows silent=false on refresh:
  → Check sessionStorage in Application tab
  → Should see: hr_viewed_employee_<id> = "true"
  → If not there, check browser console for errors

If audit logs still being created:
  → Check backend logs: pm2 logs backend
  → Verify silent=true is in the API request URL
  → Check Network tab: should see ?silent=true

If frontend build fails:
  → Check for TypeScript errors
  → Run: npm run build
  → Fix any errors shown

========================================
Quick Commands Summary
========================================

# Full deployment (run from EC2)
cd /home/ubuntu/fyp_system
git pull origin main
cd frontend
npm install
npm run build
pm2 restart frontend
pm2 logs frontend

========================================
Success Indicators
========================================

✅ Git pull shows: "Updating 9a338af..d7c8206"
✅ Build completes without errors
✅ pm2 restart shows: "frontend │ restart │ 0"
✅ Console shows silent=false then silent=true
✅ Audit logs don't increase on refresh

========================================
Files Changed in This Deployment
========================================

Modified:
  - frontend/app/hr/employees/[id]/page.tsx
    → Now uses sessionStorage instead of React state
    → Persists across page refresh

Added:
  - HR_AUDIT_SILENT_MODE_SESSIONSTORAGE_FIX.md
  - test-hr-audit-sessionstorage.sh

No backend changes needed!

========================================
Production Ready
========================================

This fix:
✅ Prevents audit log spam
✅ Maintains security (first access logged)
✅ Uses standard browser API (sessionStorage)
✅ Clears on browser close (new session)
✅ Per-employee tracking
✅ No server-side changes required

Status: READY FOR PRODUCTION 🚀

========================================

EOF

echo ""
echo "Copy the commands above and run them on your EC2 instance!"
echo ""
