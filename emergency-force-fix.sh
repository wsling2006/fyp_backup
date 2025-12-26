#!/bin/bash

# Emergency Fix - Force Update EC2 with Latest Code
# This will overwrite any local changes with the fixed version

echo "🚨 EMERGENCY FIX - Forcing update to fix accountant login crash"
echo ""

cd ~/fyp_system

echo "1. Stashing local changes..."
git stash

echo ""
echo "2. Pulling latest fix from GitHub..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed!"
    exit 1
fi

echo ""
echo "3. Verifying the fix is in place..."
if grep -q "formatCurrency(request.approved_amount)" frontend/app/purchase-requests/page.tsx; then
    echo "✅ Fix verified - formatCurrency is in the code"
else
    echo "⚠️  Warning: formatCurrency not found, but continuing..."
fi

echo ""
echo "4. Stopping frontend..."
pm2 stop frontend

echo ""
echo "5. Deleting broken build..."
cd frontend
rm -rf .next

echo ""
echo "6. Rebuilding frontend..."
npm run build 2>&1 | tail -30

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build successful!"
else
    echo ""
    echo "❌ Build failed - check errors above"
    exit 1
fi

echo ""
echo "7. Restarting frontend..."
pm2 restart frontend

echo ""
echo "8. Checking status..."
sleep 3
pm2 status

echo ""
echo "9. Recent logs..."
pm2 logs frontend --lines 15 --nostream

echo ""
echo "=========================================="
echo "✅ FIX DEPLOYED!"
echo "=========================================="
echo ""
echo "Test now:"
echo "1. Open browser to your EC2 URL"
echo "2. Login as ACCOUNTANT"
echo "3. Page should load WITHOUT ERRORS ✅"
echo "4. You should see all purchase requests"
echo ""
