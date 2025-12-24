#!/bin/bash
# Emergency frontend fix script

echo "=========================================="
echo "FRONTEND EMERGENCY FIX"
echo "=========================================="
echo ""

cd ~/fyp_system/frontend

echo "Step 1: Checking for build errors..."
if [ -f ".next/BUILD_ID" ]; then
    echo "✓ Build exists"
else
    echo "✗ No build found, rebuilding..."
fi

echo ""
echo "Step 2: Clean and rebuild..."
rm -rf .next
rm -rf node_modules/.cache
npm run build 2>&1 | tee /tmp/frontend-build.log

if [ $? -eq 0 ]; then
    echo "✓ Build successful"
else
    echo "✗ Build failed! Check /tmp/frontend-build.log"
    tail -50 /tmp/frontend-build.log
    exit 1
fi

echo ""
echo "Step 3: Restarting frontend..."
pm2 delete frontend 2>/dev/null || true
pm2 start npm --name "frontend" -- start

echo ""
echo "Step 4: Checking status..."
sleep 3
pm2 status

echo ""
echo "Step 5: Checking logs..."
pm2 logs frontend --lines 20 --nostream

echo ""
echo "=========================================="
echo "If still failing, check:"
echo "  pm2 logs frontend"
echo "=========================================="
