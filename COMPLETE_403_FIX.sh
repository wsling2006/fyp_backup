#!/bin/bash

# COMPLETE FIX FOR 403 ERRORS - DEPLOY EVERYTHING
# This script deploys JWT fix + ensures frontend .env is correct

set -e

echo "=========================================="
echo "DEPLOYING COMPLETE 403 FIX"
echo "=========================================="
echo ""

# Change to project directory
cd /home/ubuntu/fyp_system

echo "1. Pulling latest code from GitHub..."
git pull origin main

echo ""
echo "2. BACKEND - Installing dependencies and restarting..."
cd backend
npm install
pm2 restart fyp-backend
sleep 3

echo ""
echo "3. FRONTEND - Checking .env.local..."
cd /home/ubuntu/fyp_system/frontend

if [ ! -f ".env.local" ]; then
    echo "❌ .env.local missing! Creating it..."
    cat > .env.local << 'EOF'
# API base path for frontend (relative path via Next.js proxy)
NEXT_PUBLIC_API_BASE=/api

# Backend URL for server-side proxy (NOT exposed to browser)
BACKEND_URL=http://localhost:3000
EOF
    echo "✅ Created .env.local"
else
    echo "✅ .env.local exists"
    echo "Content:"
    cat .env.local
    echo ""
    
    # Check if NEXT_PUBLIC_API_BASE is correct
    if grep -q "NEXT_PUBLIC_API_BASE=/api" .env.local; then
        echo "✅ NEXT_PUBLIC_API_BASE is correct"
    else
        echo "❌ NEXT_PUBLIC_API_BASE is WRONG! Fixing..."
        sed -i 's|NEXT_PUBLIC_API_BASE=.*|NEXT_PUBLIC_API_BASE=/api|' .env.local
        echo "✅ Fixed NEXT_PUBLIC_API_BASE"
    fi
fi

echo ""
echo "4. FRONTEND - Deleting old build and node_modules..."
rm -rf .next node_modules

echo ""
echo "5. FRONTEND - Fresh install..."
npm install

echo ""
echo "6. FRONTEND - Building with correct environment..."
npm run build

echo ""
echo "7. FRONTEND - Restarting with PM2..."
pm2 restart fyp-frontend

echo ""
echo "8. Waiting for services to start..."
sleep 5

echo ""
echo "9. Checking service status..."
pm2 status

echo ""
echo "10. Checking backend logs (last 20 lines)..."
pm2 logs fyp-backend --lines 20 --nostream

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "🔥 CRITICAL: ALL USERS MUST LOG OUT AND LOG IN AGAIN!"
echo ""
echo "WHY? Two fixes were applied:"
echo "1. JWT tokens now include email field (backend fix)"
echo "2. Frontend now uses /api proxy (no direct backend calls)"
echo ""
echo "Old tokens are INVALID. Users must get new tokens."
echo ""
echo "TESTING STEPS:"
echo "1. Clear browser:"
echo "   - Press F12"
echo "   - Console tab:"
echo "     localStorage.clear();"
echo "     sessionStorage.clear();"
echo "     location.reload();"
echo ""
echo "2. Log in fresh"
echo ""
echo "3. Check token has email:"
echo "   const token = localStorage.getItem('token');"
echo "   const payload = JSON.parse(atob(token.split('.')[1]));"
echo "   console.log(payload);"
echo "   // Should show: email: 'your@email.com'"
echo ""
echo "4. Check API calls in Network tab:"
echo "   - Should see: /api/purchase-requests"
echo "   - Should NOT see: http://13.212...3001/api/..."
echo "   - Should get: 200 OK (not 403)"
echo ""
echo "5. Test purchase requests:"
echo "   - Navigate to Purchase Requests"
echo "   - Should load without errors"
echo "   - Try creating new request"
echo ""
