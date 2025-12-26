#!/bin/bash

# Deploy Edit Button Fix to EC2
# This script deploys the normalized user object fix

set -e

echo "=================================================="
echo "Deploying Edit Button Fix"
echo "=================================================="

# 1. Pull latest code
echo ""
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# 2. Rebuild frontend
echo ""
echo "🔨 Building frontend with fix..."
cd frontend
npm run build

# 3. Restart PM2
echo ""
echo "🔄 Restarting frontend with PM2..."
cd ..
pm2 restart frontend

echo ""
echo "✅ Deployment complete!"
echo ""
echo "=================================================="
echo "IMPORTANT: Tell all users to do this:"
echo "=================================================="
echo "1. Open browser console (press F12)"
echo "2. Type: localStorage.clear()"
echo "3. Press Enter"
echo "4. Refresh page and login again"
echo ""
echo "After clearing localStorage, the Edit Request button"
echo "will appear on their own DRAFT/SUBMITTED requests."
echo "=================================================="
