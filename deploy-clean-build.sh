#!/bin/bash

# EC2 DEPLOYMENT FIX - Clean Build
# Run this on EC2 to fix module resolution issues

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  FIXING MODULE RESOLUTION & DEPLOYING                     ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /home/ubuntu/fyp_system

echo -e "${YELLOW}Step 1: Pulling latest code...${NC}"
git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

echo -e "${YELLOW}Step 2: Cleaning frontend build cache...${NC}"
cd frontend
rm -rf .next
rm -rf node_modules/.cache
echo -e "${GREEN}✅ Build cache cleared${NC}"
echo ""

echo -e "${YELLOW}Step 3: Verifying tsconfig.json...${NC}"
if grep -q '"@/\*"' tsconfig.json; then
  echo -e "${GREEN}✅ tsconfig.json has correct path alias${NC}"
else
  echo -e "${RED}❌ tsconfig.json missing path alias${NC}"
  exit 1
fi
echo ""

echo -e "${YELLOW}Step 4: Reinstalling node_modules...${NC}"
rm -rf node_modules
npm install
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ npm install failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 5: Building frontend (clean build)...${NC}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Frontend build failed${NC}"
  echo ""
  echo "Checking for common issues..."
  
  # Check if critical files exist
  echo "Checking critical files..."
  for file in "context/AuthContext.tsx" "lib/api.ts" "components/ui/Button.tsx"; do
    if [ -f "$file" ]; then
      echo -e "${GREEN}✅ $file exists${NC}"
    else
      echo -e "${RED}❌ $file MISSING${NC}"
    fi
  done
  
  exit 1
fi
cd ..
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

echo -e "${YELLOW}Step 6: Restarting services...${NC}"
pm2 restart ecosystem.config.js
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ PM2 restart failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Services restarted${NC}"
echo ""

echo -e "${YELLOW}Step 7: Verifying deployment...${NC}"
pm2 list
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  ✅ DEPLOYMENT COMPLETE                                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ All fixes deployed successfully!${NC}"
echo ""
echo "IMPORTANT: Tell all users to:"
echo "1. Clear browser cache (Ctrl+Shift+Delete)"
echo "2. Close and reopen browser"
echo "3. Login again"
echo ""
echo "To monitor:"
echo "  pm2 logs backend"
echo "  pm2 logs frontend"
echo ""
