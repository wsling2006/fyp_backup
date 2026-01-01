#!/bin/bash

################################################################################
# 🚀 EC2 Deployment Script - Claim Upload for PARTIALLY_PAID Fix
# 
# This script deploys the latest changes that allow users to upload claims
# for purchase requests with PARTIALLY_PAID status.
# 
# Usage: Run this ON YOUR EC2 INSTANCE:
#   ssh -i your-key.pem ubuntu@your-ec2-ip
#   cd ~/fyp_system
#   chmod +x deploy-claim-fix.sh
#   ./deploy-claim-fix.sh
################################################################################

set -e  # Exit on any error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "========================================================================"
echo -e "${BLUE}🚀 EC2 DEPLOYMENT - Claim Upload for PARTIALLY_PAID Fix${NC}"
echo "========================================================================"
echo ""
echo -e "${YELLOW}This will deploy the latest changes that allow claim uploads for PARTIALLY_PAID requests.${NC}"
echo ""

# Step 1: Check current directory
echo -e "${BLUE}📍 Step 1: Checking current directory${NC}"
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Not in fyp_system directory${NC}"
    echo "Please cd to your fyp_system directory first"
    exit 1
fi
pwd
echo -e "${GREEN}✅ In correct directory${NC}"
echo ""

# Step 2: Pull latest code from GitHub
echo -e "${BLUE}📥 Step 2: Pulling latest code from GitHub${NC}"
echo "Current branch:"
git branch --show-current
echo ""
echo "Pulling latest changes..."
if git pull origin main; then
    echo -e "${GREEN}✅ Code pulled successfully${NC}"
else
    echo -e "${RED}❌ Failed to pull code${NC}"
    echo "This might be due to local changes. Run 'git status' to check."
    exit 1
fi
echo ""

# Step 3: Show what changed
echo -e "${BLUE}📋 Step 3: Recent commits${NC}"
git log --oneline -n 3
echo ""

# Step 4: Install backend dependencies
echo -e "${BLUE}📦 Step 4: Installing backend dependencies${NC}"
cd backend
if npm install; then
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠️  Some dependencies may have warnings (usually OK)${NC}"
fi
cd ..
echo ""

# Step 5: Build backend
echo -e "${BLUE}🔨 Step 5: Building backend${NC}"
cd backend
if npm run build; then
    echo -e "${GREEN}✅ Backend built successfully${NC}"
else
    echo -e "${RED}❌ Backend build failed${NC}"
    echo "Check the errors above"
    exit 1
fi
cd ..
echo ""

# Step 6: Verify build output
echo -e "${BLUE}🔍 Step 6: Verifying build output${NC}"
if [ -f "backend/dist/main.js" ]; then
    echo -e "${GREEN}✅ Build output verified: backend/dist/main.js exists${NC}"
    ls -lh backend/dist/main.js
else
    echo -e "${RED}❌ Build output missing${NC}"
    exit 1
fi
echo ""

# Step 7: Check PM2 current status
echo -e "${BLUE}📊 Step 7: Current PM2 status${NC}"
pm2 status
echo ""

# Step 8: Restart services
echo -e "${BLUE}🔄 Step 8: Restarting PM2 services${NC}"
if pm2 restart all; then
    echo -e "${GREEN}✅ Services restarted${NC}"
else
    echo -e "${RED}❌ Failed to restart services${NC}"
    exit 1
fi
echo ""

# Step 9: Wait for services to start
echo -e "${BLUE}⏳ Step 9: Waiting for services to start (10 seconds)${NC}"
for i in {10..1}; do
    echo -ne "\r   Waiting... $i seconds "
    sleep 1
done
echo ""
echo -e "${GREEN}✅ Wait complete${NC}"
echo ""

# Step 10: Check PM2 status again
echo -e "${BLUE}📊 Step 10: Verifying services are running${NC}"
pm2 status
echo ""

# Step 11: Check for errors in logs
echo -e "${BLUE}📋 Step 11: Checking for errors in logs${NC}"
echo ""
echo -e "${YELLOW}Backend logs (last 20 lines):${NC}"
pm2 logs backend --lines 20 --nostream || true
echo ""
echo -e "${YELLOW}Frontend logs (last 20 lines):${NC}"
pm2 logs frontend --lines 20 --nostream || true
echo ""

# Step 12: Test backend health
echo -e "${BLUE}🏥 Step 12: Testing backend health${NC}"
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✅ Backend is responding${NC}"
else
    echo -e "${YELLOW}⚠️  Backend may not be responding (check logs above)${NC}"
fi
echo ""

# Success
echo "========================================================================"
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "========================================================================"
echo ""
echo -e "${YELLOW}📝 WHAT WAS DEPLOYED:${NC}"
echo "  - Backend now allows claim uploads for PARTIALLY_PAID requests"
echo "  - Users can continue uploading claims even after some have been paid"
echo "  - Frontend and backend logic are now consistent"
echo ""
echo -e "${YELLOW}🧪 TEST THE FEATURE:${NC}"
echo ""
echo "1. Open your application in browser:"
echo "   http://YOUR_EC2_IP:3000 (or :3001 depending on your setup)"
echo ""
echo "2. Login and test the workflow:"
echo "   a) Create a purchase request"
echo "   b) Accountant approves it"
echo "   c) User uploads claim #1"
echo "   d) Accountant verifies claim #1 (status becomes PARTIALLY_PAID)"
echo "   e) User uploads claim #2 ✅ THIS SHOULD NOW WORK!"
echo ""
echo "3. Monitor logs in real-time:"
echo "   pm2 logs"
echo ""
echo "4. Check service status:"
echo "   pm2 status"
echo ""
echo -e "${YELLOW}🔍 TROUBLESHOOTING:${NC}"
echo "  - View all logs: pm2 logs --lines 100"
echo "  - Check backend errors: pm2 logs backend --err --lines 50"
echo "  - Check frontend errors: pm2 logs frontend --err --lines 50"
echo "  - Restart services: pm2 restart all"
echo "  - View service details: pm2 show backend"
echo ""
echo -e "${YELLOW}📚 DOCUMENTATION:${NC}"
echo "  - DEPLOY_EC2_LATEST_CLAIM_FIX.md - Full deployment guide"
echo "  - CLAIM_UPLOAD_PARTIALLY_PAID_FIX.md - Detailed feature explanation"
echo "  - COMPLETE_IMPLEMENTATION_SUMMARY.md - Complete feature overview"
echo "  - QUICK_REFERENCE_CLAIMS.md - Quick reference guide"
echo ""
echo -e "${GREEN}🎉 Your system is now updated and ready to use!${NC}"
echo ""
