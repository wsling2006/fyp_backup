#!/bin/bash

# Deploy HR employee update feature

echo "=========================================="
echo "🚀 Deploying HR Employee Update Feature"
echo "=========================================="
echo ""

echo "Step 1: Pull latest code..."
cd ~/fyp_system
git pull

echo ""
echo "Step 2: Rebuild backend..."
cd ~/fyp_system/backend
rm -rf dist/
npm run build

echo ""
echo "Step 3: Restart backend..."
pm2 restart backend

echo ""
echo "Step 4: Verify services..."
pm2 status

echo ""
echo "Step 5: Check backend logs..."
pm2 logs backend --lines 20 --nostream

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📝 New Feature Available:"
echo "   PUT /hr/employees/:id - Update employee information"
echo ""
echo "✅ Audit Logging:"
echo "   Action: UPDATE_EMPLOYEE"
echo "   Tracks: Changed fields, old values, new values"
echo ""
echo "🧪 Test it:"
echo "   1. Login as HR user"
echo "   2. View an employee profile"
echo "   3. Use API to update (frontend UI needs to be built)"
echo "   4. Check audit dashboard for UPDATE_EMPLOYEE action"
echo ""
echo "📖 Full documentation: HR_UPDATE_EMPLOYEE_FEATURE.md"
echo ""
