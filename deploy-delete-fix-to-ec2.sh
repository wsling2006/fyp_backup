#!/bin/bash

# Deploy Delete APPROVED Request Fix to EC2
# This script deploys the cache fix for deleting APPROVED requests with no claims

echo "=========================================="
echo "🚀 Deploying Delete Fix to EC2"
echo "=========================================="
echo ""

# Check if we're on EC2 or local
if [ -f /home/ubuntu/fyp_system/backend/package.json ]; then
    echo "✅ Running on EC2"
    BASE_DIR="/home/ubuntu/fyp_system"
else
    echo "❌ This script should be run on EC2"
    echo ""
    echo "📋 To deploy from local machine:"
    echo "1. SSH to EC2: ssh ubuntu@your-ec2-ip"
    echo "2. Run: cd ~/fyp_system && git pull"
    echo "3. Run: bash deploy-delete-fix-to-ec2.sh"
    exit 1
fi

cd $BASE_DIR

echo "Step 1: Pull latest changes from GitHub"
echo "----------------------------------------"
git pull
if [ $? -ne 0 ]; then
    echo "❌ Git pull failed. Please resolve conflicts manually."
    exit 1
fi
echo "✅ Code updated"
echo ""

echo "Step 2: Rebuild backend"
echo "----------------------------------------"
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Backend build failed"
    exit 1
fi
echo "✅ Backend built"
echo ""

echo "Step 3: Restart backend with PM2"
echo "----------------------------------------"
pm2 restart backend
echo "✅ Backend restarted"
echo ""

echo "Step 4: Check backend status"
echo "----------------------------------------"
pm2 status backend
echo ""

echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "📝 Testing Instructions:"
echo "1. Log in as accountant"
echo "2. Find an APPROVED request with claims"
echo "3. Delete all claims"
echo "4. Try to delete the purchase request"
echo "5. Monitor backend logs: pm2 logs backend --lines 50"
echo ""
echo "🔍 Expected backend logs:"
echo "  [deletePurchaseRequest] PR ID: xxxx"
echo "  [deletePurchaseRequest] Claims count: 0"
echo "  [deletePurchaseRequest] canDeleteApproved: true"
echo "  [deletePurchaseRequest] ✅ Deletion allowed, proceeding..."
echo ""
echo "If you still see errors, check the logs with:"
echo "  pm2 logs backend --lines 100"
echo ""
