#!/bin/bash

# Quick deployment script for purchase request audit log fix

echo "=========================================="
echo "🚀 Deploying Purchase Request Audit Fix"
echo "=========================================="
echo ""

echo "Step 1: Pull latest code..."
cd ~/fyp_system
git pull

echo ""
echo "Step 2: Rebuild backend (clear old compiled code)..."
cd ~/fyp_system/backend
rm -rf dist/
npm run build

echo ""
echo "Step 3: Restart backend..."
pm2 restart backend

echo ""
echo "Step 4: Clean old audit logs..."
cd ~/fyp_system
chmod +x cleanup-purchase-request-logs.sh
./cleanup-purchase-request-logs.sh

echo ""
echo "Step 5: Verify services..."
pm2 status

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🧪 Test it:"
echo "   1. Login as accountant"
echo "   2. Go to purchase requests page"
echo "   3. Refresh multiple times"
echo "   4. Check audit dashboard"
echo "   5. Should see NO new VIEW logs!"
echo ""
