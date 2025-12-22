#!/bin/bash
# ONE-SHOT EC2 CLEANUP AND RESTART SCRIPT
# This fixes the duplicate PM2 processes and port conflicts

set -e

echo "============================================"
echo "🧹 EC2 PURCHASE REQUESTS FIX - ONE SHOT"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Step 1: Stopping all frontend processes...${NC}"
pm2 delete all 2>/dev/null || echo "No PM2 processes to delete"

echo ""
echo -e "${YELLOW}Step 2: Killing any process using port 3001...${NC}"
sudo lsof -ti:3001 | xargs -r sudo kill -9 2>/dev/null || echo "No processes on port 3001"

echo ""
echo -e "${YELLOW}Step 3: Killing any process using port 3000...${NC}"
sudo lsof -ti:3000 | xargs -r sudo kill -9 2>/dev/null || echo "No processes on port 3000"

echo ""
echo -e "${YELLOW}Step 4: Waiting 3 seconds...${NC}"
sleep 3

echo ""
echo -e "${YELLOW}Step 5: Starting backend...${NC}"
cd ~/fyp_system/backend
pm2 start npm --name "backend" -- run start:prod

echo ""
echo -e "${YELLOW}Step 6: Starting frontend...${NC}"
cd ~/fyp_system/frontend
pm2 start npm --name "frontend" -- start

echo ""
echo -e "${YELLOW}Step 7: Waiting for services to start...${NC}"
sleep 10

echo ""
echo -e "${YELLOW}Step 8: Checking PM2 status...${NC}"
pm2 status

echo ""
echo -e "${YELLOW}Step 9: Checking backend health...${NC}"
curl -s http://localhost:3000/api/ | head -5 || echo "Backend not responding yet"

echo ""
echo -e "${YELLOW}Step 10: Checking frontend health...${NC}"
curl -I http://localhost:3001/purchase-requests

echo ""
echo -e "${YELLOW}Step 11: Viewing recent logs...${NC}"
echo -e "${GREEN}=== Backend Logs ===${NC}"
pm2 logs backend --lines 10 --nostream
echo ""
echo -e "${GREEN}=== Frontend Logs ===${NC}"
pm2 logs frontend --lines 10 --nostream

echo ""
echo "============================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE${NC}"
echo "============================================"
echo ""
echo "🔍 Verification:"
echo "  1. Backend: http://localhost:3000/api/"
echo "  2. Frontend: http://localhost:3001/purchase-requests"
echo ""
echo "📊 PM2 Commands:"
echo "  - View logs: pm2 logs"
echo "  - Check status: pm2 status"
echo "  - Restart: pm2 restart all"
echo "  - Stop: pm2 stop all"
echo ""
echo "✅ Purchase Requests page should now be accessible!"
echo ""
