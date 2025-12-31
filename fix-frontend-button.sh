#!/bin/bash

# 🔥 EMERGENCY FIX - Rebuild Frontend with Button Fix

echo "========================================"
echo "🔥 REBUILDING FRONTEND - BUTTON FIX"
echo "========================================"
echo ""

GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

cd /home/ubuntu/fyp_system || exit 1

echo -e "${BLUE}=== STEP 1: Pull Latest Code ===${NC}"
git pull origin main
echo ""

echo -e "${BLUE}=== STEP 2: Stop Frontend ===${NC}"
pm2 stop frontend
echo ""

echo -e "${BLUE}=== STEP 3: DELETE Old Build ===${NC}"
cd frontend
rm -rf .next
echo "✓ Deleted .next folder"
echo ""

echo -e "${BLUE}=== STEP 4: Rebuild Frontend ===${NC}"
echo "Building... (this takes 1-2 minutes)"
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
else
    echo -e "${RED}✗ Build failed!${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}=== STEP 5: Restart Frontend ===${NC}"
pm2 restart frontend
echo ""

echo "Waiting for frontend to start..."
sleep 3

echo -e "${BLUE}=== STEP 6: Check Logs ===${NC}"
pm2 logs frontend --lines 15 --nostream
echo ""

echo "========================================"
echo -e "${GREEN}✅ FRONTEND REBUILT!${NC}"
echo "========================================"
echo ""
echo -e "${BLUE}NOW DO THIS:${NC}"
echo "1. Go to browser: http://your-ec2-ip:3001"
echo "2. Press Ctrl + Shift + Del (or Cmd + Shift + Del)"
echo "3. Clear ALL cache and cookies"
echo "4. Close browser completely"
echo "5. Reopen browser"
echo "6. Go to app again"
echo "7. Hard refresh: Ctrl + Shift + R"
echo ""
echo "The button should NOW be a real button with:"
echo "  - 📥 icon"
echo "  - Clickable (cursor changes to pointer)"
echo "  - Downloads receipt when clicked"
echo ""
echo -e "${RED}CRITICAL: You MUST clear browser cache!${NC}"
echo ""
