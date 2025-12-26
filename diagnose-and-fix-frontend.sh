#!/bin/bash

# Quick diagnostic and fix for frontend error
echo "=== Checking Frontend Error ==="
pm2 logs frontend --lines 30 --nostream --err | tail -20

echo ""
echo "=== Checking if .next exists ==="
ls -la ~/fyp_system/frontend/.next 2>&1 | head -10

echo ""
echo "=== Checking for build errors ==="
cd ~/fyp_system/frontend
if [ ! -f ".next/BUILD_ID" ]; then
    echo "❌ .next/BUILD_ID missing - need to rebuild"
    
    echo ""
    echo "=== Stopping frontend ==="
    pm2 stop frontend
    pm2 delete frontend
    
    echo ""
    echo "=== Rebuilding ==="
    rm -rf .next
    npm run build 2>&1 | tail -40
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Build successful"
        echo ""
        echo "=== Starting frontend ==="
        pm2 start npm --name frontend -- run start
        sleep 3
        pm2 status
    else
        echo ""
        echo "❌ Build failed - see errors above"
    fi
else
    echo "✓ .next/BUILD_ID exists"
    cat .next/BUILD_ID
    
    echo ""
    echo "=== Restarting frontend ==="
    pm2 restart frontend
    sleep 3
    pm2 status
    pm2 logs frontend --lines 10 --nostream
fi
