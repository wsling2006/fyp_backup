#!/bin/bash

# 🔧 QUICK FIX - Deploy Claims Fix to EC2
# This will pull the backend fix and restart services

echo "========================================"
echo "🔧 DEPLOYING CLAIMS FIX"
echo "========================================"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /home/ubuntu/fyp_system || exit 1

echo -e "${BLUE}=== STEP 1: Pull Latest Code ===${NC}"
git pull origin main
echo ""

echo -e "${BLUE}=== STEP 2: Rebuild Backend ===${NC}"
cd backend
npm run build
echo ""

echo -e "${BLUE}=== STEP 3: Restart Backend ===${NC}"
pm2 restart backend
echo ""

echo "Waiting for backend to start..."
sleep 3

echo -e "${BLUE}=== STEP 4: Check Backend Logs ===${NC}"
pm2 logs backend --lines 20 --nostream
echo ""

echo "========================================"
echo -e "${GREEN}✅ CLAIMS FIX DEPLOYED!${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Open browser: http://your-ec2-ip:3001"
echo "2. Hard refresh: Ctrl + Shift + R"
echo "3. Open Console: F12"
echo "4. Login as accountant"
echo "5. Go to Purchase Requests"
echo ""
echo -e "${BLUE}Look for these debug logs in BACKEND (PM2):${NC}"
echo "  [getAllPurchaseRequests] Total requests: X"
echo "  [getAllPurchaseRequests] Request 1: {claimsCount: X, ...}"
echo ""
echo -e "${BLUE}Look for these debug logs in FRONTEND (Browser Console):${NC}"
echo "  [DEBUG] Total requests loaded: X"
echo "  [DEBUG] Request 1: {hasClaims: 'YES', claimsCount: X, ...}"
echo ""
echo "✅ You should NOW see the 'X Claim(s)' button!"
echo ""
