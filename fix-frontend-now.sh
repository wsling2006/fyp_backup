#!/bin/bash

# Frontend Fix Script for EC2
# Diagnoses and fixes frontend startup issues

echo "=========================================="
echo "FRONTEND DIAGNOSTIC & FIX"
echo "=========================================="
echo ""

# Step 1: Check frontend error logs
echo "=== Step 1: Frontend Error Logs ==="
pm2 logs frontend --lines 100 --nostream --err 2>&1 | tail -50
echo ""

# Step 2: Check frontend directory and build
echo "=== Step 2: Checking Frontend Directory ==="
cd ~/fyp_system/frontend
echo "Current directory: $(pwd)"
echo ""

echo "Checking package.json start script:"
cat package.json | grep -A 2 '"start"'
echo ""

echo "Checking if .next build exists:"
if [ -d ".next" ]; then
    echo "✓ .next directory exists"
    ls -lh .next/ | head -10
else
    echo "✗ .next directory NOT found - need to build!"
fi
echo ""

echo "Checking node_modules:"
if [ -d "node_modules" ]; then
    echo "✓ node_modules exists"
else
    echo "✗ node_modules NOT found - need to install!"
fi
echo ""

# Step 3: Check if Next.js is installed
echo "=== Step 3: Checking Next.js Installation ==="
npm list next 2>&1 | head -5
echo ""

# Step 4: Check PM2 startup command
echo "=== Step 4: PM2 Frontend Configuration ==="
pm2 describe frontend 2>&1 | grep -A 5 "script path\|exec mode\|error"
echo ""

# Step 5: Fix frontend
echo "=== Step 5: Applying Frontend Fix ==="

# Stop frontend first
echo "Stopping frontend..."
pm2 stop frontend 2>&1

# Delete old PM2 process
echo "Deleting old frontend process..."
pm2 delete frontend 2>&1

# Install dependencies if needed
if [ ! -d "node_modules" ] || [ ! -d "node_modules/next" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build frontend
echo "Building frontend..."
npm run build 2>&1 | tail -20

if [ $? -eq 0 ]; then
    echo "✓ Build successful"
else
    echo "✗ Build failed - check errors above"
    exit 1
fi

# Start frontend with PM2
echo "Starting frontend with PM2..."
pm2 start npm --name frontend -- run start

# Wait for startup
sleep 5

# Step 6: Check final status
echo ""
echo "=== Step 6: Final Status ==="
pm2 status

echo ""
echo "=== Frontend Logs (last 20 lines) ==="
pm2 logs frontend --lines 20 --nostream

echo ""
echo "=========================================="
echo "FRONTEND FIX COMPLETE"
echo "=========================================="
echo ""
echo "If frontend is now 'online', test in browser:"
echo "http://54.254.162.43:3001"
echo ""
echo "If still errored, check logs with:"
echo "pm2 logs frontend"
