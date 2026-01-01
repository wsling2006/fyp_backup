#!/bin/bash

# Complete deployment script for HR edit feature (backend + frontend)

echo "=========================================="
echo "🚀 Deploying HR Employee Edit Feature"
echo "=========================================="
echo ""

echo "📦 Step 1: Pull latest code from GitHub..."
cd ~/fyp_system
git pull

echo ""
echo "🔧 Step 2: Rebuild backend..."
cd ~/fyp_system/backend
rm -rf dist/
npm run build

echo ""
echo "🎨 Step 3: Rebuild frontend..."
cd ~/fyp_system/frontend  
npm run build

echo ""
echo "🔄 Step 4: Restart all services..."
pm2 restart all
sleep 3

echo ""
echo "✅ Step 5: Verify services are running..."
pm2 status

echo ""
echo "📋 Step 6: Check backend logs..."
pm2 logs backend --lines 15 --nostream

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🎉 New Feature Available:"
echo "   ✏️ Edit Employee Button on employee detail page"
echo "   📝 Full edit form at /hr/employees/{id}/edit"
echo ""
echo "📊 Backend API:"
echo "   PUT /hr/employees/:id - Update employee"
echo "   Audit: UPDATE_EMPLOYEE (tracks changed fields)"
echo ""
echo "🧪 Test It:"
echo "   1. Go to http://your-ec2-ip:3001"
echo "   2. Login as HR user"
echo "   3. Navigate to Employees → Click employee → Edit"
echo "   4. Update some fields and save"
echo "   5. Login as Super Admin"
echo "   6. Check Audit Dashboard for UPDATE_EMPLOYEE action"
echo ""
echo "📖 Documentation:"
echo "   - Backend: HR_UPDATE_EMPLOYEE_FEATURE.md"
echo "   - Frontend: HR_EDIT_FRONTEND_COMPLETE.md"
echo ""
