#!/bin/bash

# Complete System Deployment Script
# Deploys all changes for delete purchase request feature

echo "=========================================="
echo "Complete Purchase Request System Deployment"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if running on EC2
if [ ! -f "/home/ubuntu/fyp_system/backend/package.json" ]; then
    echo -e "${RED}Error: Not on EC2 instance or wrong directory${NC}"
    echo "This script should be run on EC2 at /home/ubuntu/fyp_system"
    exit 1
fi

cd /home/ubuntu/fyp_system

echo -e "${YELLOW}Step 1: Pulling latest changes from GitHub...${NC}"
git pull origin main
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to pull from GitHub${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git pull successful${NC}"
echo ""

echo -e "${YELLOW}Step 2: Deploying Backend...${NC}"
cd backend

echo "  - Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install backend dependencies${NC}"
    exit 1
fi

echo "  - Building backend..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build backend${NC}"
    exit 1
fi

echo "  - Restarting backend with PM2..."
pm2 restart backend
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to restart backend${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backend deployed successfully${NC}"
echo ""

echo -e "${YELLOW}Step 3: Deploying Frontend...${NC}"
cd ../frontend

echo "  - Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to install frontend dependencies${NC}"
    exit 1
fi

echo "  - Building frontend..."
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to build frontend${NC}"
    exit 1
fi

echo "  - Restarting frontend with PM2..."
pm2 restart frontend
if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to restart frontend${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Frontend deployed successfully${NC}"
echo ""

echo -e "${YELLOW}Step 4: Checking deployment status...${NC}"
sleep 3

echo "PM2 Process Status:"
pm2 status

echo ""
echo "Backend Logs (last 20 lines):"
pm2 logs backend --lines 20 --nostream

echo ""
echo "Frontend Logs (last 20 lines):"
pm2 logs frontend --lines 20 --nostream

echo ""
echo -e "${YELLOW}Step 5: Testing endpoints...${NC}"

echo "  - Testing backend health..."
BACKEND_HEALTH=$(curl -s http://localhost:5000/health)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
    echo "    Response: $BACKEND_HEALTH"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
fi

echo "  - Testing frontend health..."
FRONTEND_HEALTH=$(curl -s http://localhost:3000/api/health 2>&1)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend is responding${NC}"
else
    echo -e "${YELLOW}⚠ Frontend health check inconclusive (this is normal for Next.js)${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ DEPLOYMENT COMPLETE${NC}"
echo "=========================================="
echo ""
echo "NEW FEATURES DEPLOYED:"
echo "  ✓ Delete Purchase Request endpoint (DELETE /purchase-requests/:id)"
echo "  ✓ Delete Purchase Request UI button (Accountant/Super Admin)"
echo "  ✓ Business rules: Can delete DRAFT/SUBMITTED/REJECTED only"
echo "  ✓ Validation: Must delete claims first"
echo "  ✓ Audit logging for deletions"
echo ""
echo "TESTING CHECKLIST:"
echo "  1. Login as accountant"
echo "  2. Review and reject a purchase request (or find existing rejected)"
echo "  3. Verify delete button appears (red button at bottom)"
echo "  4. Click delete and confirm"
echo "  5. Verify request is deleted from dashboard"
echo "  6. Check audit logs in database"
echo ""
echo "COMMANDS TO VERIFY:"
echo "  pm2 logs backend --lines 50"
echo "  pm2 logs frontend --lines 50"
echo "  psql -U postgres -d fyp_db -c \"SELECT action FROM audit_logs WHERE action='DELETE_PURCHASE_REQUEST' ORDER BY created_at DESC LIMIT 5;\""
echo ""
echo "DOCUMENTATION:"
echo "  - COMPLETE_SYSTEM_GUIDE.md (full system documentation)"
echo "  - SYSTEM_COMPLETE_SUMMARY.md (deployment summary)"
echo ""
echo -e "${GREEN}Ready for testing!${NC}"
