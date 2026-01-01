#!/bin/bash

# Comprehensive diagnostic script to find the HR audit log issue

echo "=================================="
echo "🔍 HR AUDIT LOG DIAGNOSTIC TOOL"
echo "=================================="
echo ""

# Database credentials
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="fyp_user"
DB_PASSWORD="GL5jYNDqsOVkx6tIfIS2eUonM"
DB_NAME="fyp_db"

echo "1️⃣ Checking ALL audit logs with EMPLOYEE in the action name:"
echo "------------------------------------------------------------"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    id,
    action, 
    resource,
    user_id,
    created_at 
FROM audit_logs 
WHERE action LIKE '%EMPLOYEE%' 
ORDER BY created_at DESC 
LIMIT 20;
"

echo ""
echo "2️⃣ Counting actions by name:"
echo "------------------------------------------------------------"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    action, 
    COUNT(*) as count 
FROM audit_logs 
WHERE action LIKE '%EMPLOYEE%' 
GROUP BY action 
ORDER BY action;
"

echo ""
echo "3️⃣ Checking if logs start with 'VIEW' (frontend filter logic):"
echo "------------------------------------------------------------"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    action,
    CASE 
        WHEN action LIKE 'VIEW%' THEN '✅ Counts as View Action'
        WHEN action LIKE 'HR_VIEW%' THEN '❌ Does NOT count (has HR_ prefix)'
        ELSE '❌ Does NOT count (no VIEW prefix)'
    END as dashboard_category,
    COUNT(*) as count
FROM audit_logs 
WHERE action LIKE '%EMPLOYEE%' 
GROUP BY action 
ORDER BY action;
"

echo ""
echo "4️⃣ Checking resource column (should be 'employee'):"
echo "------------------------------------------------------------"
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    resource, 
    COUNT(*) as count 
FROM audit_logs 
WHERE action LIKE '%EMPLOYEE%' OR resource = 'employee'
GROUP BY resource 
ORDER BY resource;
"

echo ""
echo "5️⃣ Checking backend logs for recent activity:"
echo "------------------------------------------------------------"
pm2 logs backend --lines 30 --nostream | grep -i "employee\|audit" || echo "No recent employee/audit logs found"

echo ""
echo "6️⃣ Verifying backend code is correct:"
echo "------------------------------------------------------------"
echo "Checking if backend uses 'VIEW_EMPLOYEE_PROFILE' (not 'HR_VIEW_EMPLOYEE_PROFILE')..."
grep -n "VIEW_EMPLOYEE_PROFILE" ~/fyp_system/backend/src/employees/hr.controller.ts | head -5

echo ""
echo "7️⃣ Checking when backend was last restarted:"
echo "------------------------------------------------------------"
pm2 status | grep backend

echo ""
echo "=================================="
echo "🎯 DIAGNOSIS COMPLETE"
echo "=================================="
echo ""
echo "📋 What to look for:"
echo "   ✅ Action should be 'VIEW_EMPLOYEE_PROFILE' (NO HR_ prefix)"
echo "   ❌ If you see 'HR_VIEW_EMPLOYEE_PROFILE', old code is still running"
echo ""
echo "💡 If old code is still running:"
echo "   1. Make sure you ran 'git pull' in ~/fyp_system"
echo "   2. Run 'pm2 restart backend'"
echo "   3. Run this script again to verify"
echo ""
