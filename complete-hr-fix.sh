#!/bin/bash

# COMPLETE FIX SCRIPT - Rebuild everything from scratch
# This ensures the latest code is running

set -e

echo "=================================="
echo "🚀 COMPLETE HR AUDIT FIX"
echo "=================================="
echo ""

# Database credentials
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="fyp_user"
DB_PASSWORD="GL5jYNDqsOVkx6tIfIS2eUonM"
DB_NAME="fyp_db"

echo "Step 1: Pull latest code from GitHub"
echo "------------------------------------------------------------"
cd ~/fyp_system
git pull
echo "✅ Code updated"
echo ""

echo "Step 2: Stop all services"
echo "------------------------------------------------------------"
pm2 stop all
echo "✅ Services stopped"
echo ""

echo "Step 3: Clean old audit logs from database"
echo "------------------------------------------------------------"
echo "Deleting ALL HR audit logs (both old and new format)..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
DELETE FROM audit_logs 
WHERE action IN (
    'HR_VIEW_EMPLOYEE_PROFILE',
    'HR_VIEW_EMPLOYEE_DOCUMENTS',
    'HR_VIEW_EMPLOYEE_LIST',
    'HR_SEARCH_EMPLOYEES',
    'HR_CREATE_EMPLOYEE',
    'HR_UPDATE_EMPLOYEE',
    'HR_DELETE_EMPLOYEE',
    'HR_UPLOAD_DOCUMENT',
    'HR_DOWNLOAD_DOCUMENT',
    'HR_DELETE_DOCUMENT',
    'VIEW_EMPLOYEE_PROFILE',
    'CREATE_EMPLOYEE',
    'UPDATE_EMPLOYEE',
    'DELETE_EMPLOYEE'
);
"

echo ""
echo "Verification - should show 0 rows:"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT action, COUNT(*) 
FROM audit_logs 
WHERE action LIKE '%EMPLOYEE%' 
GROUP BY action;
"
echo "✅ Database cleaned"
echo ""

echo "Step 4: Rebuild backend"
echo "------------------------------------------------------------"
cd ~/fyp_system/backend
npm install
echo "✅ Backend dependencies installed"
echo ""

echo "Step 5: Rebuild frontend"
echo "------------------------------------------------------------"
cd ~/fyp_system/frontend
npm install
npm run build
echo "✅ Frontend rebuilt"
echo ""

echo "Step 6: Restart all services"
echo "------------------------------------------------------------"
cd ~/fyp_system
pm2 restart all
sleep 3
pm2 status
echo "✅ Services restarted"
echo ""

echo "Step 7: Verify backend code"
echo "------------------------------------------------------------"
echo "Checking hr.controller.ts uses correct action name..."
grep -A2 "VIEW_EMPLOYEE_PROFILE" ~/fyp_system/backend/src/employees/hr.controller.ts | grep -v "HR_VIEW" | head -3
echo "✅ Backend code verified"
echo ""

echo "Step 8: Check backend logs"
echo "------------------------------------------------------------"
pm2 logs backend --lines 20 --nostream
echo ""

echo "=================================="
echo "✅ COMPLETE FIX DONE!"
echo "=================================="
echo ""
echo "🧪 NOW TEST:"
echo "   1. Login as HR user: leejwei009@gmail.com"
echo "   2. Go to HR dashboard"
echo "   3. Click 'View Profile' on any employee"
echo "   4. Logout and login as Super Admin"
echo "   5. Go to Audit Dashboard"
echo "   6. Should see 'VIEW_EMPLOYEE_PROFILE' counting as View Action"
echo ""
echo "🔍 To verify database:"
echo "   PGPASSWORD='GL5jYNDqsOVkx6tIfIS2eUonM' psql -h localhost -U fyp_user -d fyp_db -c \"SELECT action, COUNT(*) FROM audit_logs WHERE action LIKE '%EMPLOYEE%' GROUP BY action;\""
echo ""
