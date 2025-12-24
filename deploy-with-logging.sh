#!/bin/bash
# EC2 Deployment Script with Enhanced Logging
# This script deploys the latest code with comprehensive logging to diagnose 403 issues

echo "=========================================="
echo "ENHANCED LOGGING DEPLOYMENT"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Navigate to project directory
cd ~/fyp_system || cd /var/www/fyp_system || { echo -e "${RED}Failed to navigate to project directory${NC}"; exit 1; }

echo -e "${YELLOW}Step 1: Pulling latest code from GitHub...${NC}"
git pull origin main || { echo -e "${RED}Git pull failed${NC}"; exit 1; }

echo ""
echo -e "${YELLOW}Step 2: Building backend...${NC}"
cd backend
npm run build || { echo -e "${RED}Backend build failed${NC}"; exit 1; }

echo ""
echo -e "${YELLOW}Step 3: Restarting backend with PM2...${NC}"
pm2 restart backend || pm2 restart fyp-backend || pm2 start npm --name "backend" -- run start:prod

echo ""
echo -e "${YELLOW}Step 4: Waiting for backend to initialize...${NC}"
sleep 5

echo ""
echo -e "${GREEN}Deployment complete!${NC}"
echo ""
echo "=========================================="
echo "VERIFICATION COMMANDS"
echo "=========================================="
echo ""
echo "1. View live backend logs with filtering:"
echo "   pm2 logs backend --lines 50"
echo ""
echo "2. View only JWT/Auth logs:"
echo "   pm2 logs backend | grep -E 'JwtStrategy|JwtAuthGuard|RolesGuard'"
echo ""
echo "3. Monitor logs in real-time:"
echo "   pm2 logs backend --raw"
echo ""
echo "4. Test the endpoint:"
echo "   curl -X GET https://fyp-system.online/api/purchase-requests \\"
echo "     -H 'Authorization: Bearer YOUR_TOKEN_HERE'"
echo ""
echo "=========================================="
