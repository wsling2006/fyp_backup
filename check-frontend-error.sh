#!/bin/bash

# Quick Frontend Error Check
# Run this on EC2 to see what's wrong with frontend

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  CHECKING FRONTEND ERROR                                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. PM2 Status:${NC}"
pm2 status
echo ""

echo -e "${YELLOW}2. Frontend Error Logs (last 50 lines):${NC}"
pm2 logs frontend --lines 50 --nostream
echo ""

echo -e "${YELLOW}3. Checking if frontend build exists:${NC}"
if [ -d "/home/ubuntu/fyp_system/frontend/.next" ]; then
  echo -e "${GREEN}✅ .next build folder exists${NC}"
  ls -la /home/ubuntu/fyp_system/frontend/.next/
else
  echo -e "${RED}❌ .next build folder MISSING - Need to build!${NC}"
fi
echo ""

echo -e "${YELLOW}4. Checking frontend package.json:${NC}"
if [ -f "/home/ubuntu/fyp_system/frontend/package.json" ]; then
  echo -e "${GREEN}✅ package.json exists${NC}"
  grep -A 5 '"scripts"' /home/ubuntu/fyp_system/frontend/package.json
else
  echo -e "${RED}❌ package.json MISSING${NC}"
fi
echo ""

echo -e "${YELLOW}5. Checking ecosystem config:${NC}"
if [ -f "/home/ubuntu/fyp_system/ecosystem.config.js" ]; then
  echo -e "${GREEN}✅ ecosystem.config.js exists${NC}"
  cat /home/ubuntu/fyp_system/ecosystem.config.js
else
  echo -e "${RED}❌ ecosystem.config.js MISSING${NC}"
fi
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  RECOMMENDED FIX                                          ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Based on error logs above, likely need to:"
echo "1. Stop frontend: pm2 stop frontend"
echo "2. Delete process: pm2 delete frontend"
echo "3. Build frontend: cd frontend && npm run build"
echo "4. Start fresh: cd .. && pm2 start ecosystem.config.js"
echo ""
