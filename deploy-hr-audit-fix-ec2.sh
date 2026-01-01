#!/bin/bash

# Deploy HR Audit Fix to EC2
# This script will rebuild and restart the backend with the anti-spam fix

echo "=========================================="
echo "Deploying HR Audit Anti-Spam Fix"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Step 1: Pull latest code
echo -e "${BLUE}[1/5] Pulling latest code from GitHub...${NC}"
cd ~/fyp_system || exit 1
git pull
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Git pull failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Code updated${NC}"
echo ""

# Step 2: Check TypeScript for errors
echo -e "${BLUE}[2/5] Checking TypeScript compilation...${NC}"
cd backend
echo "Running: npx tsc --noEmit"
npx tsc --noEmit
TS_CHECK=$?
if [ $TS_CHECK -ne 0 ]; then
    echo -e "${YELLOW}⚠ TypeScript errors detected, but will try to build anyway${NC}"
else
    echo -e "${GREEN}✓ No TypeScript errors${NC}"
fi
echo ""

# Step 3: Build backend
echo -e "${BLUE}[3/5] Building backend...${NC}"
echo "Running: npm run build"
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ Build failed! Check errors above.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 4: Verify compiled code has anti-spam logic
echo -e "${BLUE}[4/5] Verifying compiled code...${NC}"
COMPILED_FILE="dist/employees/hr.controller.js"
if [ ! -f "$COMPILED_FILE" ]; then
    echo -e "${RED}✗ Compiled hr.controller.js not found!${NC}"
    exit 1
fi

if grep -q "viewedEmployees" "$COMPILED_FILE"; then
    echo -e "${GREEN}✓ Anti-spam logic found in compiled code${NC}"
else
    echo -e "${RED}✗ Anti-spam logic NOT found in compiled code!${NC}"
    echo "This shouldn't happen. Check the build output."
    exit 1
fi

if grep -q "AUDIT SPAM DEBUG" "$COMPILED_FILE"; then
    echo -e "${GREEN}✓ Debug logs found in compiled code${NC}"
else
    echo -e "${YELLOW}⚠ Debug logs not found (might be stripped by compiler)${NC}"
fi
echo ""

# Step 5: Restart PM2
echo -e "${BLUE}[5/5] Restarting backend with PM2...${NC}"
pm2 restart backend
if [ $? -ne 0 ]; then
    echo -e "${RED}✗ PM2 restart failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Backend restarted${NC}"
echo ""

# Wait a moment for the app to start
echo "Waiting 3 seconds for backend to initialize..."
sleep 3

# Show recent logs
echo ""
echo "=========================================="
echo -e "${GREEN}DEPLOYMENT SUCCESSFUL!${NC}"
echo "=========================================="
echo ""
echo "Recent backend logs:"
pm2 logs backend --nostream --lines 20
echo ""
echo "=========================================="
echo "NEXT STEPS - TEST THE FIX"
echo "=========================================="
echo ""
echo "1. Clear browser cache and localStorage"
echo "2. Login as an HR user"
echo "3. View an employee profile"
echo "4. Check logs:"
echo "   pm2 logs backend --lines 30 | grep 'AUDIT SPAM DEBUG'"
echo ""
echo "5. Refresh the page (F5)"
echo "6. Check logs again:"
echo "   pm2 logs backend --lines 30 | grep 'AUDIT SPAM DEBUG'"
echo "   Should see: 'Already viewed, skipping audit log'"
echo ""
echo "7. Check for spam:"
echo "   pm2 logs backend --lines 100 | grep 'Employee View'"
echo "   Should see only ONE log per employee (not duplicates)"
echo ""
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Fix deployed! Test it now.${NC}"
echo ""
