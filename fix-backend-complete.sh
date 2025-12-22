#!/bin/bash
# Complete Backend Fix Script - Rebuild and Restart
# This ensures the compiled JavaScript matches the source TypeScript

set -e  # Exit on error

echo "================================================"
echo "🔧 Complete Backend Fix - Rebuild Required"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Problem Identified:${NC}"
echo "  - Source code has AuditModule import ✓"
echo "  - Compiled JavaScript (dist/) is outdated ✗"
echo "  - Backend needs to be REBUILT"
echo ""

# Step 1: Stop backend
echo -e "${YELLOW}Step 1: Stopping backend...${NC}"
pm2 stop backend || true
sleep 2
echo -e "${GREEN}✓ Backend stopped${NC}"
echo ""

# Step 2: Clean old build
echo -e "${YELLOW}Step 2: Cleaning old build files...${NC}"
cd ~/fyp_system/backend
rm -rf dist
echo -e "${GREEN}✓ Old build cleaned${NC}"
echo ""

# Step 3: Rebuild backend
echo -e "${YELLOW}Step 3: Rebuilding backend (TypeScript → JavaScript)...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend rebuilt successfully${NC}"
else
    echo -e "${RED}✗ Build failed - check errors above${NC}"
    exit 1
fi
echo ""

# Step 4: Verify build output
echo -e "${YELLOW}Step 4: Verifying build output...${NC}"
if [ -f "dist/src/main.js" ]; then
    echo -e "${GREEN}✓ main.js exists${NC}"
else
    echo -e "${RED}✗ main.js not found - build may have failed${NC}"
    exit 1
fi

if [ -f "dist/src/purchase-requests/purchase-request.module.js" ]; then
    echo -e "${GREEN}✓ purchase-request.module.js exists${NC}"
else
    echo -e "${RED}✗ purchase-request.module.js not found${NC}"
    exit 1
fi
echo ""

# Step 5: Check compiled module has AuditModule
echo -e "${YELLOW}Step 5: Checking compiled code has AuditModule...${NC}"
if grep -q "AuditModule" dist/src/purchase-requests/purchase-request.module.js; then
    echo -e "${GREEN}✓ AuditModule found in compiled code${NC}"
else
    echo -e "${RED}✗ AuditModule NOT in compiled code - rebuild may have failed${NC}"
    exit 1
fi
echo ""

# Step 6: Start backend
echo -e "${YELLOW}Step 6: Starting backend...${NC}"
cd ~/fyp_system
pm2 start ecosystem.config.js --only backend
sleep 5
echo -e "${GREEN}✓ Backend started${NC}"
echo ""

# Step 7: Check status
echo -e "${YELLOW}Step 7: Checking backend status...${NC}"
pm2 list

# Step 8: Check logs for errors
echo ""
echo -e "${YELLOW}Step 8: Checking logs (last 50 lines)...${NC}"
echo ""
pm2 logs backend --lines 50 --nostream

# Step 9: Verify no errors
echo ""
echo -e "${YELLOW}Step 9: Checking for errors in logs...${NC}"
ERROR_COUNT=$(pm2 logs backend --lines 100 --nostream --err 2>/dev/null | grep -c "ERROR" || echo "0")
if [ "$ERROR_COUNT" -eq "0" ]; then
    echo -e "${GREEN}✓ No errors in backend logs${NC}"
else
    echo -e "${RED}⚠ Found $ERROR_COUNT errors in logs - check above${NC}"
fi
echo ""

# Final summary
echo "================================================"
echo -e "${GREEN}✅ Backend Fix Complete!${NC}"
echo "================================================"
echo ""
echo "Verification:"
echo "  1. Backend status: Run 'pm2 list'"
echo "  2. Check logs: Run 'pm2 logs backend --lines 30'"
echo "  3. Test frontend login"
echo ""
echo "If backend still crashes:"
echo "  1. Check error logs: pm2 logs backend --lines 100 --err"
echo "  2. Verify database connection: Check backend/.env"
echo "  3. Check PostgreSQL is running: sudo systemctl status postgresql"
echo ""
