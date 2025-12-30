#!/bin/bash

################################################################################
# 🚀 QUICK DEPLOYMENT: File Download Fix
# 
# This script deploys the critical fix for accountant file downloads
# 
# Usage: ./quick-deploy-file-fix.sh
################################################################################

set -e  # Exit on any error

echo "=================================="
echo "🚀 DEPLOYING FILE DOWNLOAD FIX"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verify we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ]; then
    echo -e "${RED}❌ Error: Not in fyp_system root directory${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Step 1: Checking current status${NC}"
git status --short
echo ""

# 2. Pull latest changes
echo -e "${BLUE}📥 Step 2: Pulling latest changes from GitHub${NC}"
git pull origin main
echo ""

# 3. Install dependencies (if needed)
echo -e "${BLUE}📦 Step 3: Checking dependencies${NC}"
cd frontend
npm install --silent
cd ..
echo ""

# 4. Build frontend
echo -e "${BLUE}🔨 Step 4: Building frontend${NC}"
cd frontend
npm run build
cd ..
echo ""

# 5. Restart services with PM2
echo -e "${BLUE}🔄 Step 5: Restarting services${NC}"
pm2 restart all
echo ""

# 6. Wait for services to start
echo -e "${BLUE}⏳ Step 6: Waiting for services to start (5 seconds)${NC}"
sleep 5
echo ""

# 7. Check PM2 status
echo -e "${BLUE}📊 Step 7: Checking PM2 status${NC}"
pm2 status
echo ""

# 8. Check logs for errors
echo -e "${BLUE}📋 Step 8: Checking recent logs${NC}"
echo "Backend logs:"
pm2 logs backend --lines 10 --nostream
echo ""
echo "Frontend logs:"
pm2 logs frontend --lines 10 --nostream
echo ""

# Success
echo "=================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}🧪 NEXT STEPS:${NC}"
echo "1. Login as an accountant user"
echo "2. Go to Purchase Requests page"
echo "3. Click 'View Claims' on an approved request"
echo "4. Click 'Download Receipt' button"
echo "5. Verify the file downloads and opens correctly"
echo ""
echo -e "${YELLOW}📊 Monitor logs:${NC}"
echo "  pm2 logs --lines 50"
echo ""
echo -e "${YELLOW}🔍 If issues persist:${NC}"
echo "  - Check: pm2 logs backend"
echo "  - Check: pm2 logs frontend"
echo "  - Read: CRITICAL_FIX_FILE_DOWNLOADS.md"
echo ""
