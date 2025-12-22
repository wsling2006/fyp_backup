#!/bin/bash

# Complete Deployment: Silent Parameter + Real IP Detection
# Run these commands on your EC2 server

echo "================================================"
echo "Deploy Both Fixes to EC2"
echo "================================================"
echo ""
echo "Fix 1: Silent parameter (no VIEW_REVENUE noise)"
echo "Fix 2: Real IP detection (no more 127.0.0.1)"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}STEP-BY-STEP DEPLOYMENT${NC}"
echo ""

echo -e "${GREEN}1. SSH to EC2:${NC}"
echo -e "${BLUE}   ssh -i your-key.pem ubuntu@your-ec2-ip${NC}"
echo ""

echo -e "${GREEN}2. Pull latest changes:${NC}"
echo -e "${BLUE}   cd ~/fyp_system${NC}"
echo -e "${BLUE}   git pull origin main${NC}"
echo ""

echo -e "${GREEN}3. Rebuild backend:${NC}"
echo -e "${BLUE}   cd ~/fyp_system/backend${NC}"
echo -e "${BLUE}   npm run build${NC}"
echo ""

echo -e "${GREEN}4. Rebuild frontend:${NC}"
echo -e "${BLUE}   cd ~/fyp_system/frontend${NC}"
echo -e "${BLUE}   npm run build${NC}"
echo ""

echo -e "${GREEN}5. Restart services:${NC}"
echo -e "${BLUE}   pm2 restart backend${NC}"
echo -e "${BLUE}   pm2 restart frontend${NC}"
echo ""

echo -e "${GREEN}6. Verify deployment:${NC}"
echo -e "${BLUE}   pm2 logs backend --lines 20${NC}"
echo ""

echo "================================================"
echo "QUICK ONE-LINER (copy-paste this):"
echo "================================================"
echo ""
echo "cd ~/fyp_system && git pull origin main && cd backend && npm run build && cd ../frontend && npm run build && pm2 restart all && pm2 status"
echo ""

echo "================================================"
echo "TESTING CHECKLIST"
echo "================================================"
echo ""
echo "✅ Test Silent Parameter:"
echo "   1. Create revenue → Check audit log"
echo "   2. Should see: CREATE_REVENUE only (no VIEW_REVENUE)"
echo ""
echo "✅ Test Real IP:"
echo "   1. Perform any action"
echo "   2. Check audit log IP column"
echo "   3. Should see: Your real IP (not 127.0.0.1)"
echo ""

echo "================================================"
echo "EXPECTED RESULTS"
echo "================================================"
echo ""
echo "Before Deployment:"
echo "  ❌ CREATE_REVENUE + VIEW_REVENUE (noise)"
echo "  ❌ IP: 127.0.0.1 (localhost)"
echo ""
echo "After Deployment:"
echo "  ✅ CREATE_REVENUE only (clean)"
echo "  ✅ IP: 203.87.45.123 (your real IP)"
echo ""
