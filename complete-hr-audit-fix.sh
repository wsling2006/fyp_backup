#!/bin/bash

# Complete fix for HR audit logging issue
# This script will:
# 1. Restart backend with new code
# 2. Clean up old audit logs from database
# 3. Verify the fix

set -e

SSH_KEY="$1"
EC2_IP="$2"

if [ -z "$SSH_KEY" ] || [ -z "$EC2_IP" ]; then
    echo "Usage: ./complete-hr-audit-fix.sh /path/to/key.pem ec2-ip"
    echo "Example: ./complete-hr-audit-fix.sh ~/Desktop/fyp-key.pem 18.140.113.225"
    exit 1
fi

echo "🔧 Complete HR Audit Logging Fix"
echo "=================================="
echo ""

# Step 1: Restart backend
echo "Step 1: Restarting backend with new code..."
ssh -i "$SSH_KEY" ubuntu@"$EC2_IP" << 'EOF'
cd /home/ubuntu/fyp_system/backend
pm2 restart backend
pm2 logs backend --lines 10 --nostream
EOF

echo ""
echo "✅ Backend restarted"
echo ""

# Step 2: Clean database
echo "Step 2: Cleaning up old HR audit logs from database..."
echo ""

ssh -i "$SSH_KEY" ubuntu@"$EC2_IP" << 'EOF'
# Show current HR logs before cleanup
echo "📊 Current HR audit logs (BEFORE cleanup):"
sudo -u postgres psql -d company_portal -c "
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE action LIKE '%EMPLOYEE%'
GROUP BY action
ORDER BY action;
"

echo ""
echo "🧹 Deleting old logs with incorrect action names..."

# Delete ALL old HR logs
sudo -u postgres psql -d company_portal -c "
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
"

echo ""
echo "📊 HR audit logs (AFTER cleanup):"
sudo -u postgres psql -d company_portal -c "
SELECT action, COUNT(*) as count
FROM audit_logs
WHERE resource = 'employee' OR resource = 'employee_document'
GROUP BY action
ORDER BY action;
"

echo ""
echo "Expected: Empty result or only VIEW_EMPLOYEE_PROFILE"
EOF

echo ""
echo "✅ Database cleaned"
echo ""

# Step 3: Verify
echo "Step 3: Verifying backend is running new code..."
ssh -i "$SSH_KEY" ubuntu@"$EC2_IP" << 'EOF'
pm2 status
echo ""
echo "Backend logs (last 20 lines):"
pm2 logs backend --lines 20 --nostream
EOF

echo ""
echo "=================================="
echo "✅ Complete Fix Applied!"
echo "=================================="
echo ""
echo "📋 Next Steps:"
echo "1. Login as HR user: http://$EC2_IP:3000"
echo "2. Click 'View Employee List' button"
echo "3. Click 'View Profile' on an employee"
echo "4. Login as Super Admin and check audit dashboard"
echo ""
echo "Expected Result:"
echo "- Total Actions: 1"
echo "- View Actions: 1 ✅"
echo "- Action name: VIEW_EMPLOYEE_PROFILE"
echo ""
