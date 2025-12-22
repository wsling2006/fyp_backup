#!/bin/bash

# Deploy Silent Parameter Fix to EC2
# This script guides you through deploying the silent parameter feature

echo "================================================"
echo "Deploy Silent Parameter Fix to EC2"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Current situation:${NC}"
echo "✅ Code pushed to GitHub (local changes committed)"
echo "❌ EC2 server still running old code (audit log noise)"
echo ""

echo -e "${GREEN}Step 1: SSH to EC2${NC}"
echo "Run this command in a new terminal:"
echo -e "${BLUE}ssh -i your-key.pem ubuntu@your-ec2-ip${NC}"
echo ""
echo "Press Enter when connected to EC2..."
read

echo -e "${GREEN}Step 2: Navigate to project directory${NC}"
echo "Run on EC2:"
echo -e "${BLUE}cd ~/fyp_system${NC}"
echo ""
echo "Press Enter when done..."
read

echo -e "${GREEN}Step 3: Pull latest changes from GitHub${NC}"
echo "Run on EC2:"
echo -e "${BLUE}git pull origin main${NC}"
echo ""
echo "Expected output: Files updated:"
echo "- backend/src/revenue/revenue.controller.ts"
echo "- frontend/app/revenue/accountant/page.tsx"
echo ""
echo "Press Enter when done..."
read

echo -e "${GREEN}Step 4: Rebuild backend${NC}"
echo "Run on EC2:"
echo -e "${BLUE}cd ~/fyp_system/backend && npm run build${NC}"
echo ""
echo "Press Enter when done..."
read

echo -e "${GREEN}Step 5: Rebuild frontend${NC}"
echo "Run on EC2:"
echo -e "${BLUE}cd ~/fyp_system/frontend && npm run build${NC}"
echo ""
echo "Press Enter when done..."
read

echo -e "${GREEN}Step 6: Restart services with PM2${NC}"
echo "Run on EC2:"
echo -e "${BLUE}pm2 restart backend${NC}"
echo -e "${BLUE}pm2 restart frontend${NC}"
echo ""
echo "Press Enter when done..."
read

echo -e "${GREEN}Step 7: Verify deployment${NC}"
echo "Run on EC2:"
echo -e "${BLUE}pm2 logs backend --lines 20${NC}"
echo ""
echo "Look for: 'Nest application successfully started'"
echo ""
echo "Press Enter when verified..."
read

echo ""
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo ""
echo -e "${YELLOW}Test the fix:${NC}"
echo "1. Login as accountant"
echo "2. Create a revenue record"
echo "3. Check audit log - should see CREATE_REVENUE only"
echo "4. Update a revenue record"
echo "5. Check audit log - should see UPDATE_REVENUE only"
echo "6. Delete a revenue record"
echo "7. Check audit log - should see DELETE_REVENUE only"
echo ""
echo -e "${GREEN}No more VIEW_REVENUE noise! 🎉${NC}"
echo ""
