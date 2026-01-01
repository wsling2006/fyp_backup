#!/bin/bash

# Script to clean up old HR audit logs with incorrect action names
# This fixes logs that used HR_* prefix instead of just VIEW_*, CREATE_*, etc.

echo "🧹 Cleaning up old HR audit logs with incorrect action names..."
echo ""

# Note: Run this SQL on your EC2 database

cat << 'EOF'
-- Clean up old HR audit logs that don't match the new naming convention
-- Keep only VIEW_EMPLOYEE_PROFILE logs

-- Show current HR-related logs
SELECT id, action, resource, created_at 
FROM audit_logs 
WHERE action LIKE '%EMPLOYEE%' 
ORDER BY created_at DESC 
LIMIT 20;

-- Delete logs with old action names (HR_ prefix)
DELETE FROM audit_logs 
WHERE action IN (
  'HR_VIEW_EMPLOYEE_LIST',
  'HR_VIEW_EMPLOYEE_PROFILE',
  'HR_VIEW_EMPLOYEE_DOCUMENTS',
  'HR_SEARCH_EMPLOYEES',
  'HR_CREATE_EMPLOYEE',
  'HR_UPLOAD_EMPLOYEE_DOCUMENT',
  'HR_DOWNLOAD_EMPLOYEE_DOCUMENT',
  'HR_DELETE_EMPLOYEE_DOCUMENT'
);

-- Show remaining logs
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE resource = 'employee' OR resource = 'employee_document'
GROUP BY action
ORDER BY action;

-- Expected result: Only VIEW_EMPLOYEE_PROFILE should remain for HR
EOF

echo ""
echo "📝 To clean up your database:"
echo ""
echo "1. SSH into EC2:"
echo "   ssh -i /path/to/your-key.pem ubuntu@your-ec2-ip"
echo ""
echo "2. Connect to PostgreSQL:"
echo "   sudo -u postgres psql company_portal"
echo ""
echo "3. Run the DELETE command above"
echo ""
echo "4. Verify only VIEW_EMPLOYEE_PROFILE remains for HR logs"
echo ""
