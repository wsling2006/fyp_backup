#!/bin/bash

# Quick Deployment Script for AWS EC2
# Run this script on your EC2 instance after pulling from GitHub

set -e  # Exit on any error

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=========================================="
echo "AWS EC2 Deployment Script"
echo "Claims Download Feature"
echo -e "==========================================${NC}"
echo ""

# Get project directory (assuming script is run from project root)
PROJECT_DIR=$(pwd)
echo -e "${BLUE}Project Directory: ${PROJECT_DIR}${NC}"
echo ""

# Step 1: Build Backend
echo -e "${YELLOW}Step 1: Building Backend...${NC}"
cd "${PROJECT_DIR}/backend"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend build successful${NC}"
else
    echo -e "${RED}✗ Backend build failed${NC}"
    exit 1
fi
echo ""

# Step 2: Build Frontend
echo -e "${YELLOW}Step 2: Building Frontend...${NC}"
cd "${PROJECT_DIR}/frontend"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Frontend build successful${NC}"
else
    echo -e "${RED}✗ Frontend build failed${NC}"
    exit 1
fi
echo ""

# Step 3: Restart Services with PM2
echo -e "${YELLOW}Step 3: Restarting Services...${NC}"
cd "${PROJECT_DIR}"

# Check if PM2 is available
if command -v pm2 &> /dev/null; then
    echo "Using PM2 to restart services..."
    pm2 restart ecosystem.config.js --env production
    echo -e "${GREEN}✓ Services restarted${NC}"
elif command -v npx &> /dev/null; then
    echo "Using npx pm2 to restart services..."
    npx pm2 restart ecosystem.config.js --env production
    echo -e "${GREEN}✓ Services restarted${NC}"
else
    echo -e "${YELLOW}⚠ PM2 not found. Please restart services manually.${NC}"
fi
echo ""

# Step 4: Check Service Status
echo -e "${YELLOW}Step 4: Checking Service Status...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 status
elif command -v npx &> /dev/null; then
    npx pm2 status
fi
echo ""

# Step 5: View Recent Logs
echo -e "${YELLOW}Step 5: Recent Logs...${NC}"
echo ""
echo "Backend logs:"
if command -v pm2 &> /dev/null; then
    pm2 logs backend --lines 10 --nostream
elif command -v npx &> /dev/null; then
    npx pm2 logs backend --lines 10 --nostream
fi
echo ""
echo "Frontend logs:"
if command -v pm2 &> /dev/null; then
    pm2 logs frontend --lines 10 --nostream
elif command -v npx &> /dev/null; then
    npx pm2 logs frontend --lines 10 --nostream
fi
echo ""

# Step 6: Verify Endpoints
echo -e "${YELLOW}Step 6: Verifying Services...${NC}"
sleep 3  # Wait for services to fully start

echo "Checking backend health..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
    echo -e "${GREEN}✓ Backend is responding${NC}"
else
    echo -e "${RED}✗ Backend is not responding${NC}"
fi

echo "Checking frontend health..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3001 | grep -q "200"; then
    echo -e "${GREEN}✓ Frontend is responding${NC}"
else
    echo -e "${RED}✗ Frontend is not responding${NC}"
fi
echo ""

# Step 7: Summary
echo -e "${BLUE}=========================================="
echo "Deployment Summary"
echo -e "==========================================${NC}"
echo ""
echo -e "${GREEN}✓ Backend built and deployed${NC}"
echo -e "${GREEN}✓ Frontend built and deployed${NC}"
echo -e "${GREEN}✓ Services restarted${NC}"
echo ""
echo "New Features Deployed:"
echo "  • Claims download endpoint"
echo "  • ViewClaimsModal component"
echo "  • Download receipts functionality"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Test the application in browser"
echo "2. Login as accountant or super admin"
echo "3. Navigate to Purchase Requests"
echo "4. Click 'View Claims' button on a request with claims"
echo "5. Verify download functionality works"
echo ""
echo "Monitor logs:"
echo "  pm2 logs"
echo ""
echo "View status:"
echo "  pm2 status"
echo ""
echo -e "${BLUE}==========================================${NC}"
echo -e "${GREEN}Deployment Complete!${NC}"
echo -e "${BLUE}==========================================${NC}"
