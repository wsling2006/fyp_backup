#!/bin/bash

# Deploy Purchase Requests Fix to EC2
# This script safely pulls the latest changes and deploys the frontend fix

set -e  # Exit on error

echo "============================================"
echo "🚀 Deploying Purchase Requests Fix to EC2"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Not in fyp_system directory${NC}"
    exit 1
fi

cd ~/fyp_system

echo -e "${YELLOW}📋 Step 1: Checking current status...${NC}"
git status

echo ""
echo -e "${YELLOW}📥 Step 2: Stashing local changes...${NC}"
git stash push -m "Auto-stash before pull $(date +%Y%m%d_%H%M%S)"

echo ""
echo -e "${YELLOW}🔄 Step 3: Pulling latest changes from GitHub...${NC}"
git pull origin main

echo ""
echo -e "${YELLOW}📦 Step 4: Checking if purchase-requests page exists...${NC}"
if [ -f "frontend/app/purchase-requests/page.tsx" ]; then
    echo -e "${GREEN}✅ Purchase requests page found!${NC}"
    ls -lh frontend/app/purchase-requests/page.tsx
else
    echo -e "${RED}❌ Purchase requests page NOT found! The pull may have failed.${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔧 Step 5: Installing/updating frontend dependencies...${NC}"
cd frontend
npm install

echo ""
echo -e "${YELLOW}🏗️  Step 6: Building frontend...${NC}"
rm -rf .next node_modules/.cache
npm run build

# Check if purchase-requests route is in the build
if npm run build 2>&1 | grep -q "purchase-requests"; then
    echo -e "${GREEN}✅ Purchase requests route is in the build!${NC}"
else
    echo -e "${YELLOW}⚠️  Warning: Could not verify purchase-requests route in build output${NC}"
fi

echo ""
echo -e "${YELLOW}🔄 Step 7: Restarting frontend with PM2...${NC}"
pm2 restart frontend || pm2 start npm --name "frontend" -- start

echo ""
echo -e "${YELLOW}📊 Step 8: Checking PM2 status...${NC}"
pm2 status

echo ""
echo -e "${YELLOW}📝 Step 9: Viewing frontend logs (last 30 lines)...${NC}"
pm2 logs frontend --lines 30 --nostream

echo ""
echo "============================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "============================================"
echo ""
echo "🔍 Verification Steps:"
echo "1. Check if frontend is running: pm2 status"
echo "2. View logs: pm2 logs frontend"
echo "3. Test the page: curl http://localhost:3001/purchase-requests"
echo "4. Access via browser: http://your-domain/purchase-requests"
echo ""
echo "📄 Page should now be accessible (no more 404!)"
echo ""
