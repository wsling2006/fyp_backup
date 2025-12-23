#!/bin/bash

# ============================================================================
# FINAL 403 FIX - COMPLETE SYSTEM DEPLOYMENT
# ============================================================================
# This script deploys the REAL working purchase request system
# Fixes JWT tokens and ensures proper authentication flow
# ============================================================================

set -e

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║           DEPLOYING PURCHASE REQUEST SYSTEM - FINAL FIX                  ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Change to project directory
cd /home/ubuntu/fyp_system

echo "1️⃣  Pulling latest code from GitHub..."
git pull origin main
echo "✅ Code updated"
echo ""

echo "2️⃣  BACKEND - Building and restarting..."
cd backend

# Check if node_modules exists, if not install
if [ ! -d "node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    npm install
fi

# Build backend
echo "🔨 Building backend..."
npm run build

# Restart or start backend
echo "🔄 Restarting backend..."
pm2 restart backend 2>/dev/null || pm2 start ../ecosystem.config.js --only backend --env production

# Wait for backend to start
sleep 5

# Check backend status
echo "📊 Backend status:"
pm2 list | grep backend
echo ""

echo "3️⃣  FRONTEND - Checking environment..."
cd /home/ubuntu/fyp_system/frontend

# Ensure .env.local exists with correct values
echo "📝 Creating/updating .env.local..."
cat > .env.local << 'EOF'
# API base path for frontend (relative path via Next.js proxy)
NEXT_PUBLIC_API_BASE=/api

# Backend URL for server-side proxy (NOT exposed to browser)
BACKEND_URL=http://localhost:3000
EOF

echo "✅ Frontend environment configured"
echo ""

echo "4️⃣  FRONTEND - Installing dependencies..."
# Always do fresh install to ensure correct versions
rm -rf node_modules package-lock.json
npm install
echo ""

echo "5️⃣  FRONTEND - Building production bundle..."
# Clean old build
rm -rf .next

# Build
npm run build
echo ""

echo "6️⃣  FRONTEND - Restarting..."
pm2 restart frontend 2>/dev/null || pm2 start ../ecosystem.config.js --only frontend --env production

# Wait for frontend to start
sleep 5

# Check frontend status
echo "📊 Frontend status:"
pm2 list | grep frontend
echo ""

echo "7️⃣  Verifying services..."
pm2 status
echo ""

echo "8️⃣  Checking backend logs for errors..."
pm2 logs backend --lines 20 --nostream | tail -20
echo ""

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                          ✅ DEPLOYMENT COMPLETE!                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔥 CRITICAL NEXT STEPS:"
echo ""
echo "1. ALL USERS MUST LOG OUT AND LOG IN AGAIN"
echo "   Why: New JWT tokens now include email field"
echo "   Old tokens are invalid and will cause 403 errors"
echo ""
echo "2. Clear your browser cache:"
echo "   - Open browser DevTools (F12)"
echo "   - Console tab, run:"
echo "     localStorage.clear();"
echo "     sessionStorage.clear();"
echo "     location.reload();"
echo ""
echo "3. Log in with your account:"
echo "   - Use your email and password"
echo "   - Enter OTP from email"
echo ""
echo "4. Verify JWT token has email (F12 Console):"
echo "   const token = localStorage.getItem('token');"
echo "   const payload = JSON.parse(atob(token.split('.')[1]));"
echo "   console.log('Token payload:', payload);"
echo ""
echo "   ✅ Should show:"
echo "   {" 
echo "     sub: 'user-id',"
echo "     email: 'your@email.com',  ← MUST BE PRESENT"
echo "     role: 'sales_department',"
echo "     iat: 1234567890,"
echo "     exp: 1234567890"
echo "   }"
echo ""
echo "5. Test Purchase Requests:"
echo "   - Navigate to Purchase Requests page"
echo "   - Should load without 403 errors"
echo "   - Try creating a new request"
echo ""
echo "6. Check Network tab (F12):"
echo "   - API calls should be /api/purchase-requests"
echo "   - Status should be 200 OK (not 403)"
echo ""
echo "📝 System Status:"
echo "   Backend:  Running on localhost:3000"
echo "   Frontend: Running on 0.0.0.0:3001"
echo "   Database: PostgreSQL (existing data preserved)"
echo ""
echo "🔐 Role Permissions:"
echo "   SALES / MARKETING:"
echo "     - Create purchase requests"
echo "     - View own requests"
echo "     - Upload receipts/claims"
echo ""
echo "   ACCOUNTANT:"
echo "     - View ALL requests"
echo "     - Approve/reject requests"
echo "     - Verify/process claims"
echo ""
echo "   SUPER_ADMIN:"
echo "     - Full access to everything"
echo ""
echo "🐛 If still getting 403 errors:"
echo "   1. Check token has email (step 4 above)"
echo "   2. Verify you logged out and logged in fresh"
echo "   3. Check PM2 logs: pm2 logs backend"
echo "   4. Check browser Network tab for actual error"
echo ""
echo "═══════════════════════════════════════════════════════════════════════════"
echo ""
