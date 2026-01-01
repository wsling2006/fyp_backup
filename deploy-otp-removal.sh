#!/bin/bash

# ============================================
# EC2 Deployment Script - OTP Removal Update
# ============================================
# This script deploys the latest changes including OTP removal from claim upload
# Date: January 1, 2026

set -e  # Exit on error

echo "=================================================="
echo "🚀 Starting EC2 Deployment"
echo "=================================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Pull latest changes
echo -e "${BLUE}📥 Step 1: Pulling latest changes from GitHub...${NC}"
git pull origin main
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Git pull successful${NC}"
else
    echo -e "${RED}✗ Git pull failed${NC}"
    exit 1
fi
echo ""

# Step 2: Update Backend
echo -e "${BLUE}🔧 Step 2: Building Backend...${NC}"
cd backend

echo "Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ npm install failed${NC}"
    exit 1
fi

echo "Building backend..."
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend built successfully${NC}"
else
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi

echo "Restarting backend with PM2..."
pm2 restart backend 2>/dev/null || pm2 restart all
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend restarted${NC}"
else
    echo -e "${YELLOW}⚠ PM2 restart had warnings (check logs)${NC}"
fi
echo ""

# Step 3: Update Frontend
echo -e "${BLUE}🎨 Step 3: Building Frontend...${NC}"
cd ../frontend

echo "Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${RED}✗ npm install failed${NC}"
    exit 1
fi

echo "Building frontend..."
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend built successfully${NC}"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi

echo "Restarting frontend with PM2..."
pm2 restart frontend 2>/dev/null || pm2 restart all
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend restarted${NC}"
else
    echo -e "${YELLOW}⚠ PM2 restart had warnings (check logs)${NC}"
fi
echo ""

# Step 4: Check Status
echo -e "${BLUE}📊 Step 4: Checking Service Status...${NC}"
cd ..
pm2 status
echo ""

# Step 5: Show logs
echo -e "${BLUE}📝 Step 5: Recent Logs (last 20 lines)${NC}"
echo -e "${YELLOW}Backend logs:${NC}"
pm2 logs backend --lines 20 --nostream
echo ""
echo -e "${YELLOW}Frontend logs:${NC}"
pm2 logs frontend --lines 20 --nostream
echo ""

echo "=================================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "=================================================="
echo ""
echo "🎯 What was deployed:"
echo "  ✓ Multiple claims per purchase request"
echo "  ✓ Simplified claim review (PROCESS/REJECT only)"
echo "  ✓ Enhanced delete logic (APPROVED/PAID with no claims)"
echo "  ✓ OTP removed from claim upload (NEW!)"
echo ""
echo "📋 Next Steps:"
echo "  1. Test claim upload without OTP"
echo "  2. Test multiple claims upload"
echo "  3. Test claim review workflow"
echo "  4. Test delete functionality"
echo ""
echo "🔍 Monitor logs with: pm2 logs"
echo "📊 Check status with: pm2 status"
echo ""
echo -e "${GREEN}Happy deploying! 🚀${NC}"
