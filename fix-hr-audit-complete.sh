#!/bin/bash

# Complete HR Audit Log Cleanup and Verification Script
# Run this on EC2 to fix audit log counting issues

set -e

echo "🔍 HR Audit Log Cleanup and Fix Script"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Database connection
DB_NAME="company_portal"
DB_USER="postgres"

echo "📊 Step 1: Checking current audit logs..."
echo ""

# Show current HR logs
sudo -u postgres psql -d $DB_NAME -c "
SELECT 
    action, 
    resource,
    COUNT(*) as count,
    MIN(created_at) as first_log,
    MAX(created_at) as last_log
FROM audit_logs
WHERE action LIKE '%EMPLOYEE%' 
   OR resource = 'employee' 
   OR resource = 'employee_document'
GROUP BY action, resource
ORDER BY last_log DESC;
"

echo ""
echo -e "${YELLOW}⚠️  Step 2: Identifying problematic logs...${NC}"
echo ""

# Count problematic logs
PROBLEM_COUNT=$(sudo -u postgres psql -t -d $DB_NAME -c "
SELECT COUNT(*) 
FROM audit_logs 
WHERE action IN (
    'HR_VIEW_EMPLOYEE_LIST',
    'HR_VIEW_EMPLOYEE_PROFILE',
    'HR_VIEW_EMPLOYEE_DOCUMENTS',
    'HR_SEARCH_EMPLOYEES',
    'HR_CREATE_EMPLOYEE',
    'HR_UPLOAD_EMPLOYEE_DOCUMENT',
    'HR_DOWNLOAD_EMPLOYEE_DOCUMENT',
    'HR_DELETE_EMPLOYEE_DOCUMENT',
    'CREATE_EMPLOYEE',
    'UPDATE_EMPLOYEE'
);
" | tr -d ' ')

echo "Found $PROBLEM_COUNT logs with incorrect/unwanted action names"
echo ""

if [ "$PROBLEM_COUNT" -gt 0 ]; then
    echo -e "${RED}🗑️  Step 3: Deleting problematic logs...${NC}"
    echo ""
    
    # Delete old/incorrect logs
    sudo -u postgres psql -d $DB_NAME -c "
    DELETE FROM audit_logs 
    WHERE action IN (
        'HR_VIEW_EMPLOYEE_LIST',
        'HR_VIEW_EMPLOYEE_PROFILE',
        'HR_VIEW_EMPLOYEE_DOCUMENTS',
        'HR_SEARCH_EMPLOYEES',
        'HR_CREATE_EMPLOYEE',
        'HR_UPLOAD_EMPLOYEE_DOCUMENT',
        'HR_DOWNLOAD_EMPLOYEE_DOCUMENT',
        'HR_DELETE_EMPLOYEE_DOCUMENT',
        'CREATE_EMPLOYEE',
        'UPDATE_EMPLOYEE'
    );
    "
    
    echo -e "${GREEN}✅ Deleted $PROBLEM_COUNT problematic logs${NC}"
else
    echo -e "${GREEN}✅ No problematic logs found${NC}"
fi

echo ""
echo "📊 Step 4: Showing remaining HR audit logs..."
echo ""

# Show remaining logs
sudo -u postgres psql -d $DB_NAME -c "
SELECT 
    action, 
    resource,
    COUNT(*) as count
FROM audit_logs
WHERE resource = 'employee' OR resource = 'employee_document'
GROUP BY action, resource
ORDER BY action;
"

echo ""
echo "🧪 Step 5: Testing action name matching..."
echo ""

# Show how actions will be categorized
sudo -u postgres psql -d $DB_NAME -c "
SELECT 
    action,
    CASE 
        WHEN action LIKE 'VIEW%' THEN 'View Action ✓'
        WHEN action LIKE 'CREATE%' THEN 'Create Action ✓'
        WHEN action LIKE 'DELETE%' THEN 'Delete Action ✓'
        WHEN action LIKE 'UPDATE%' THEN 'Update Action ✓'
        ELSE 'No Category ✗'
    END as category,
    COUNT(*) as count
FROM audit_logs
WHERE resource = 'employee' OR resource = 'employee_document'
GROUP BY action, category
ORDER BY action;
"

echo ""
echo "🎯 Step 6: Verifying expected behavior..."
echo ""

# Count VIEW actions
VIEW_COUNT=$(sudo -u postgres psql -t -d $DB_NAME -c "
SELECT COUNT(*) 
FROM audit_logs 
WHERE action LIKE 'VIEW%' 
  AND (resource = 'employee' OR resource = 'employee_document');
" | tr -d ' ')

# Count CREATE actions
CREATE_COUNT=$(sudo -u postgres psql -t -d $DB_NAME -c "
SELECT COUNT(*) 
FROM audit_logs 
WHERE action LIKE 'CREATE%' 
  AND (resource = 'employee' OR resource = 'employee_document');
" | tr -d ' ')

# Count DELETE actions
DELETE_COUNT=$(sudo -u postgres psql -t -d $DB_NAME -c "
SELECT COUNT(*) 
FROM audit_logs 
WHERE action LIKE 'DELETE%' 
  AND (resource = 'employee' OR resource = 'employee_document');
" | tr -d ' ')

# Total HR actions
TOTAL_COUNT=$(sudo -u postgres psql -t -d $DB_NAME -c "
SELECT COUNT(*) 
FROM audit_logs 
WHERE resource = 'employee' OR resource = 'employee_document';
" | tr -d ' ')

echo "Expected dashboard counts for HR:"
echo "- Total Actions: $TOTAL_COUNT"
echo "- View Actions: $VIEW_COUNT (should only be VIEW_EMPLOYEE_PROFILE)"
echo "- Create Actions: $CREATE_COUNT (should be 0)"
echo "- Delete Actions: $DELETE_COUNT (should be 0)"
echo ""

if [ "$VIEW_COUNT" -eq "$TOTAL_COUNT" ] && [ "$TOTAL_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✅ Perfect! All HR logs are VIEW_EMPLOYEE_PROFILE${NC}"
elif [ "$TOTAL_COUNT" -eq 0 ]; then
    echo -e "${YELLOW}⚠️  No HR logs yet (will be created when viewing employee profile)${NC}"
else
    echo -e "${RED}❌ Warning: Some logs are not VIEW_EMPLOYEE_PROFILE${NC}"
fi

echo ""
echo "🔄 Step 7: Restarting backend to ensure new code is active..."
echo ""

cd /home/ubuntu/fyp_system/backend
pm2 restart backend
sleep 2
pm2 logs backend --lines 10 --nostream

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Cleanup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📝 Next steps:"
echo "1. Login as HR user"
echo "2. Click 'View Profile' on an employee"
echo "3. Check audit dashboard as super admin"
echo "4. Should see: VIEW_EMPLOYEE_PROFILE counting as 'View Action'"
echo ""
echo "🔍 To manually check logs:"
echo "   sudo -u postgres psql -d company_portal"
echo "   SELECT * FROM audit_logs WHERE resource = 'employee' ORDER BY created_at DESC LIMIT 10;"
echo ""
