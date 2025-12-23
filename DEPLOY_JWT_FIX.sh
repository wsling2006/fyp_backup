#!/bin/bash

# DEPLOY JWT FIX - Add email to JWT payload
# This script deploys the critical fix for 403 errors caused by missing email in JWT

set -e

echo "=========================================="
echo "DEPLOYING JWT EMAIL FIX"
echo "=========================================="
echo ""

# Change to project directory
cd /home/ubuntu/fyp_system

echo "1. Pulling latest code from GitHub..."
git pull origin main

echo ""
echo "2. Installing backend dependencies (if needed)..."
cd backend
npm install

echo ""
echo "3. Restarting backend with PM2..."
pm2 restart fyp-backend

echo ""
echo "4. Waiting for backend to start..."
sleep 5

echo ""
echo "5. Checking backend status..."
pm2 status fyp-backend

echo ""
echo "=========================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo "=========================================="
echo ""
echo "NEXT STEPS:"
echo "1. IMPORTANT: All existing JWT tokens are now INVALID"
echo "2. Users must LOG OUT and LOG IN AGAIN to get new tokens with email"
echo "3. Test login with: leejwei004@gmail.com"
echo "4. New JWT tokens will include: { sub, email, role }"
echo ""
echo "TO TEST:"
echo "1. Clear browser cache and localStorage"
echo "2. Log in again"
echo "3. Check token in browser console:"
echo "   const token = localStorage.getItem('token');"
echo "   const payload = JSON.parse(atob(token.split('.')[1]));"
echo "   console.log(payload);"
echo "4. Verify payload contains email field"
echo ""
echo "TO VERIFY FIX:"
echo "curl -X GET http://localhost:3001/purchase-requests \\"
echo "  -H 'Authorization: Bearer NEW_TOKEN_HERE' \\"
echo "  -H 'Content-Type: application/json'"
echo ""
