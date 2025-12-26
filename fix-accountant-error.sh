#!/bin/bash

# Quick Fix for Accountant Approval Error
# Fixes the .toFixed() error when approving purchase requests

echo "🔧 Fixing accountant approval error..."
echo ""

cd ~/fyp_system

echo "1. Pulling latest code..."
git pull origin main

echo ""
echo "2. Rebuilding frontend..."
cd frontend
rm -rf .next
npm run build

if [ $? -eq 0 ]; then
    echo ""
    echo "3. Restarting frontend..."
    pm2 restart frontend
    
    echo ""
    echo "✅ Fix deployed!"
    echo ""
    pm2 status
    
    echo ""
    echo "Test now:"
    echo "1. Login as accountant"
    echo "2. Approve a purchase request"
    echo "3. Page should work without errors"
else
    echo ""
    echo "❌ Build failed! Check errors above."
    exit 1
fi
