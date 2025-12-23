#!/bin/bash
# Safe deployment script for Purchase Request feature
# This script ONLY updates the frontend - backend is already deployed

set -e  # Exit on any error

echo "=========================================="
echo "Purchase Request Feature Deployment"
echo "=========================================="
echo ""

echo "Step 1: Pull latest code from GitHub..."
git pull origin main || {
    echo "❌ Git pull failed"
    exit 1
}

echo ""
echo "Step 2: Build frontend..."
cd frontend
npm run build || {
    echo "❌ Frontend build failed"
    exit 1
}

echo ""
echo "Step 3: Restart frontend with PM2 (zero downtime)..."
cd ..
pm2 reload frontend || pm2 restart frontend || {
    echo "❌ PM2 restart failed"
    exit 1
}

echo ""
echo "Step 4: Verify services..."
pm2 list

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "Purchase Request features now available:"
echo "  1. ✓ Create Purchase Request (with OTP)"
echo "  2. ✓ Review Purchase Request (Accountant/SuperAdmin with OTP)"
echo "  3. ✓ Upload Receipt/Claim (with OTP + ClamAV scanning)"
echo ""
echo "To verify:"
echo "  - Check PM2 status: pm2 list"
echo "  - Check logs: pm2 logs frontend --lines 50"
echo "  - Check backend logs: pm2 logs backend --lines 50"
echo ""
