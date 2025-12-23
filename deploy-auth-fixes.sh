#!/bin/bash

# EC2 DEPLOYMENT SCRIPT - Auth Fixes
# Run this on your EC2 instance to deploy the auth fixes

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  DEPLOYING CRITICAL AUTH FIXES TO EC2                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're on EC2
if [ ! -d "/home/ubuntu/fyp_system" ]; then
  echo -e "${RED}❌ ERROR: Not in EC2 environment${NC}"
  echo "This script should be run on your EC2 instance at /home/ubuntu/fyp_system"
  exit 1
fi

cd /home/ubuntu/fyp_system

echo -e "${YELLOW}Step 1: Pulling latest code from GitHub...${NC}"
git pull origin main
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Git pull failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

echo -e "${YELLOW}Step 2: Checking if npm install needed...${NC}"
cd frontend
npm install --production
cd ..
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 3: Building frontend...${NC}"
cd frontend
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Frontend build failed${NC}"
  exit 1
fi
cd ..
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

echo -e "${YELLOW}Step 4: Restarting services...${NC}"
pm2 restart ecosystem.config.js
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ PM2 restart failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

echo -e "${YELLOW}Step 5: Checking service status...${NC}"
pm2 list
echo ""

echo -e "${YELLOW}Step 6: Showing recent logs...${NC}"
echo "Backend logs:"
pm2 logs backend --lines 20 --nostream
echo ""
echo "Frontend logs:"
pm2 logs frontend --lines 20 --nostream
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOYMENT COMPLETE                                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Auth fixes deployed successfully!${NC}"
echo ""
echo "IMPORTANT: Tell all users to do this:"
echo "1. Clear browser cache (Ctrl+Shift+Delete)"
echo "2. Close and reopen browser"
echo "3. Login again"
echo ""
echo "To monitor logs:"
echo "  pm2 logs backend"
echo "  pm2 logs frontend"
echo ""
echo "To check status:"
echo "  pm2 status"
echo ""
