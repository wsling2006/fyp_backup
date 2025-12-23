#!/bin/bash

# Fix Errored Frontend on EC2
# This script fixes the frontend error and redeploys everything

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  FIXING ERRORED FRONTEND                                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd /home/ubuntu/fyp_system

echo -e "${YELLOW}Step 1: Stopping all PM2 processes...${NC}"
pm2 stop all
pm2 delete all
echo -e "${GREEN}✅ All processes stopped${NC}"
echo ""

echo -e "${YELLOW}Step 2: Pulling latest code...${NC}"
git pull origin main
echo -e "${GREEN}✅ Code updated${NC}"
echo ""

echo -e "${YELLOW}Step 3: Cleaning frontend cache...${NC}"
cd frontend
rm -rf .next
rm -rf node_modules/.cache
echo -e "${GREEN}✅ Cache cleared${NC}"
echo ""

echo -e "${YELLOW}Step 4: Installing/updating dependencies...${NC}"
npm install
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ npm install failed${NC}"
  echo "Trying with --force flag..."
  npm install --force
fi
echo -e "${GREEN}✅ Dependencies installed${NC}"
echo ""

echo -e "${YELLOW}Step 5: Building frontend (this may take a few minutes)...${NC}"
npm run build
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Frontend build failed${NC}"
  echo ""
  echo "Build failed. Let's try to identify the issue:"
  echo ""
  echo "1. Checking if files exist..."
  ls -la context/ 2>&1 | head -5
  ls -la lib/ 2>&1 | head -5
  ls -la components/ 2>&1 | head -5
  echo ""
  echo "2. Checking tsconfig.json..."
  cat tsconfig.json | grep -A 5 "paths"
  echo ""
  echo -e "${RED}Build failed. Please check the output above for missing files.${NC}"
  exit 1
fi
cd ..
echo -e "${GREEN}✅ Frontend built successfully${NC}"
echo ""

echo -e "${YELLOW}Step 6: Checking backend...${NC}"
cd backend
if [ ! -d "dist" ]; then
  echo -e "${YELLOW}Backend not built, building now...${NC}"
  npm install
  npm run build
  if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
  fi
fi
cd ..
echo -e "${GREEN}✅ Backend ready${NC}"
echo ""

echo -e "${YELLOW}Step 7: Starting services with PM2...${NC}"
pm2 start ecosystem.config.js
if [ $? -ne 0 ]; then
  echo -e "${RED}❌ PM2 start failed${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Services started${NC}"
echo ""

echo -e "${YELLOW}Step 8: Saving PM2 configuration...${NC}"
pm2 save
echo -e "${GREEN}✅ PM2 config saved${NC}"
echo ""

echo -e "${YELLOW}Step 9: Checking status...${NC}"
pm2 status
echo ""

echo -e "${YELLOW}Step 10: Showing recent logs...${NC}"
echo -e "${BLUE}Backend logs:${NC}"
pm2 logs backend --lines 10 --nostream
echo ""
echo -e "${BLUE}Frontend logs:${NC}"
pm2 logs frontend --lines 10 --nostream
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  ✅ FIX COMPLETE                                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ All services restarted successfully!${NC}"
echo ""
echo "Verify everything is working:"
echo "  1. Check status: pm2 status"
echo "  2. Monitor logs: pm2 logs"
echo "  3. Test app: curl http://localhost:3001"
echo "  4. Open browser: http://13.212.147.123:3001"
echo ""
echo "IMPORTANT: Tell all users to clear browser cache!"
echo ""
