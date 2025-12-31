#!/bin/bash

# 🔧 EC2 Claims Diagnostic Script
# Run this on your EC2 instance to check why claims aren't showing

echo "========================================"
echo "🔍 CLAIMS NOT SHOWING - DIAGNOSTIC"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Navigate to project directory
cd /home/ubuntu/fyp_system || {
    echo -e "${RED}❌ ERROR: Project directory not found!${NC}"
    exit 1
}

echo -e "${BLUE}=== STEP 1: Check Git Status ===${NC}"
echo "Current branch:"
git branch --show-current
echo ""
echo "Latest commits on EC2:"
git log --oneline -5
echo ""
echo -e "${GREEN}Expected commit: 64cb802 (docs: Add EC2 deployment quick reference guide)${NC}"
echo ""
read -p "Press Enter to continue..."
echo ""

echo -e "${BLUE}=== STEP 2: Check PM2 Services ===${NC}"
pm2 list
echo ""
read -p "Press Enter to continue..."
echo ""

echo -e "${BLUE}=== STEP 3: Check Backend Logs (Last 20 lines) ===${NC}"
pm2 logs backend --lines 20 --nostream
echo ""
read -p "Press Enter to continue..."
echo ""

echo -e "${BLUE}=== STEP 4: Check Frontend Logs (Last 20 lines) ===${NC}"
pm2 logs frontend --lines 20 --nostream
echo ""
read -p "Press Enter to continue..."
echo ""

echo -e "${BLUE}=== STEP 5: Check Database - Do Claims Exist? ===${NC}"
echo "Checking claims table..."
sudo -u postgres psql -d purchase_request_db -c "
SELECT 
  COUNT(*) as total_claims,
  COUNT(CASE WHEN status = 'PENDING' THEN 1 END) as pending_claims
FROM claims;
" 2>/dev/null || echo -e "${YELLOW}⚠️  Could not connect to database. Check credentials.${NC}"
echo ""

echo "Recent claims with purchase requests:"
sudo -u postgres psql -d purchase_request_db -c "
SELECT 
  c.id,
  LEFT(pr.title, 30) as request_title,
  pr.status as request_status,
  c.vendor_name,
  c.amount_claimed,
  c.status as claim_status,
  c.created_at
FROM claims c
LEFT JOIN purchase_requests pr ON c.purchase_request_id = pr.id
ORDER BY c.created_at DESC
LIMIT 5;
" 2>/dev/null || echo -e "${YELLOW}⚠️  Could not query database.${NC}"
echo ""
read -p "Press Enter to continue..."
echo ""

echo -e "${BLUE}=== STEP 6: Test Backend API ===${NC}"
echo "Testing backend health endpoint..."
BACKEND_HEALTH=$(curl -s http://localhost:3000/api/health || echo "ERROR")
if [ "$BACKEND_HEALTH" = "ERROR" ]; then
    echo -e "${RED}❌ Backend is not responding!${NC}"
else
    echo -e "${GREEN}✅ Backend is responding${NC}"
    echo "Response: $BACKEND_HEALTH"
fi
echo ""
read -p "Press Enter to continue..."
echo ""

echo -e "${BLUE}=== STEP 7: Check Frontend Build ===${NC}"
if [ -d "frontend/.next" ]; then
    echo -e "${GREEN}✅ Frontend build directory exists${NC}"
    echo "Build directory size:"
    du -sh frontend/.next
    echo "Last modified:"
    ls -ld frontend/.next
else
    echo -e "${RED}❌ Frontend build directory missing! Need to rebuild.${NC}"
fi
echo ""
read -p "Press Enter to continue..."
echo ""

echo -e "${BLUE}=== STEP 8: Check Node Modules ===${NC}"
if [ -d "backend/node_modules" ]; then
    echo -e "${GREEN}✅ Backend node_modules exists${NC}"
else
    echo -e "${RED}❌ Backend node_modules missing!${NC}"
fi

if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅ Frontend node_modules exists${NC}"
else
    echo -e "${RED}❌ Frontend node_modules missing!${NC}"
fi
echo ""

echo "========================================"
echo -e "${YELLOW}📊 DIAGNOSTIC COMPLETE${NC}"
echo "========================================"
echo ""

echo -e "${BLUE}🔍 DIAGNOSIS SUMMARY:${NC}"
echo ""
echo "1. Check git log above - Is it commit 64cb802 or newer?"
echo "   ❌ NO  → Run: git pull origin main"
echo "   ✅ YES → Code is up to date"
echo ""
echo "2. Check PM2 status - Are both services 'online'?"
echo "   ❌ NO  → Run: pm2 restart all"
echo "   ✅ YES → Services are running"
echo ""
echo "3. Check logs - Are there any errors?"
echo "   ❌ YES → Share the error messages"
echo "   ✅ NO  → No obvious errors"
echo ""
echo "4. Check database - Are there any claims?"
echo "   ❌ NO  → Need to upload claims as Sales/Marketing user"
echo "   ✅ YES → Claims exist in database"
echo ""
echo "5. Check backend API - Is it responding?"
echo "   ❌ NO  → Backend is down, check logs"
echo "   ✅ YES → Backend is working"
echo ""
echo "6. Check frontend build - Does .next exist?"
echo "   ❌ NO  → Need to rebuild frontend"
echo "   ✅ YES → Frontend is built"
echo ""

echo -e "${YELLOW}📋 RECOMMENDED ACTIONS:${NC}"
echo ""

# Check if code is outdated
CURRENT_COMMIT=$(git rev-parse --short HEAD)
if [ "$CURRENT_COMMIT" != "64cb802" ]; then
    echo -e "${RED}⚠️  CODE IS OUTDATED!${NC}"
    echo ""
    echo -e "${GREEN}Quick Fix:${NC}"
    echo "  1. git pull origin main"
    echo "  2. cd frontend && npm run build && cd .."
    echo "  3. pm2 restart all"
    echo ""
fi

# Check if services are down
if ! pm2 list | grep -q "online"; then
    echo -e "${RED}⚠️  SERVICES ARE NOT RUNNING!${NC}"
    echo ""
    echo -e "${GREEN}Quick Fix:${NC}"
    echo "  pm2 restart all"
    echo "  pm2 logs"
    echo ""
fi

# Check if frontend build is missing
if [ ! -d "frontend/.next" ]; then
    echo -e "${RED}⚠️  FRONTEND NOT BUILT!${NC}"
    echo ""
    echo -e "${GREEN}Quick Fix:${NC}"
    echo "  cd frontend"
    echo "  npm run build"
    echo "  pm2 restart frontend"
    echo ""
fi

echo -e "${BLUE}🚀 If all checks passed but claims still not showing:${NC}"
echo "  1. Check browser console (F12) for JavaScript errors"
echo "  2. Test API manually: curl -H 'Authorization: Bearer TOKEN' http://localhost:3000/purchase-requests"
echo "  3. Check if purchase request is APPROVED (claims only show for approved requests)"
echo "  4. Share this diagnostic output for further help"
echo ""

echo "========================================"
echo -e "${GREEN}✅ DIAGNOSTIC SCRIPT COMPLETE${NC}"
echo "========================================"
