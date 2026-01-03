#!/bin/bash

# EC2 Backend Comment Edit/Delete Fix
# This script diagnoses and fixes the 404 error for comment edit/delete endpoints

echo "==================================="
echo "Comment Edit/Delete 404 Fix"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Check backend is running
echo -e "${YELLOW}Step 1: Checking backend status...${NC}"
pm2 list | grep backend
echo ""

# Step 2: Check backend routes
echo -e "${YELLOW}Step 2: Testing backend routes directly...${NC}"
echo ""

# Test if backend accepts PUT to /announcements/comments/:id
echo "Testing PUT /announcements/comments/test-id"
curl -X PUT http://localhost:3000/announcements/comments/test-id \
  -H "Content-Type: application/json" \
  -d '{"content":"test"}' \
  -w "\nHTTP Status: %{http_code}\n" \
  2>/dev/null
echo ""

# Test if backend accepts DELETE to /announcements/comments/:id
echo "Testing DELETE /announcements/comments/test-id"
curl -X DELETE http://localhost:3000/announcements/comments/test-id \
  -w "\nHTTP Status: %{http_code}\n" \
  2>/dev/null
echo ""

# Step 3: Check if latest code is pulled
echo -e "${YELLOW}Step 3: Checking git status...${NC}"
cd ~/fyp_system
git log --oneline -5
echo ""
git status
echo ""

# Step 4: Check backend build
echo -e "${YELLOW}Step 4: Checking backend build files...${NC}"
if [ -d "backend/dist/announcements" ]; then
  echo -e "${GREEN}✓ Backend dist folder exists${NC}"
  ls -la backend/dist/announcements/*.js | head -5
else
  echo -e "${RED}✗ Backend dist folder missing!${NC}"
fi
echo ""

# Step 5: Check controller file
echo -e "${YELLOW}Step 5: Checking if controller has comment endpoints...${NC}"
grep -n "comments/:commentId" backend/src/announcements/announcements.controller.ts
echo ""

# Step 6: Recommended fix
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}RECOMMENDED FIX:${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""
echo "1. Pull latest code:"
echo "   git pull origin main"
echo ""
echo "2. Rebuild backend:"
echo "   cd backend"
echo "   npm run build"
echo ""
echo "3. Restart backend:"
echo "   pm2 restart backend"
echo ""
echo "4. Check PM2 logs:"
echo "   pm2 logs backend --lines 50"
echo ""
echo "5. Test the endpoint directly:"
echo "   curl -X OPTIONS http://localhost:3000/announcements/comments/test"
echo ""

# Step 7: Auto-fix option
echo -e "${YELLOW}Would you like to auto-fix now? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  echo ""
  echo -e "${GREEN}Applying fix...${NC}"
  
  cd ~/fyp_system
  
  echo "Pulling latest code..."
  git pull origin main
  
  echo ""
  echo "Rebuilding backend..."
  cd backend
  npm run build
  
  echo ""
  echo "Restarting backend..."
  pm2 restart backend
  
  echo ""
  echo -e "${GREEN}✓ Fix applied!${NC}"
  echo ""
  echo "Waiting 5 seconds for backend to start..."
  sleep 5
  
  echo ""
  echo "Testing endpoint..."
  curl -X OPTIONS http://localhost:3000/announcements/comments/test -v 2>&1 | grep -i "HTTP\|allow"
  
  echo ""
  echo -e "${GREEN}Done! Please test comment edit/delete in your browser.${NC}"
else
  echo ""
  echo "Fix cancelled. Please apply manually."
fi
