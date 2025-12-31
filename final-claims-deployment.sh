#!/bin/bash

# FINAL CLAIMS FIX DEPLOYMENT SCRIPT
# This script will completely rebuild and redeploy the frontend with the correct button code

set -e  # Exit on error

echo "================================================"
echo "FINAL CLAIMS FIX DEPLOYMENT"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Verify local changes
echo -e "${YELLOW}Step 1: Verifying local changes...${NC}"
if grep -q "DOWNLOAD.*CLAIM" frontend/app/purchase-requests/page.tsx; then
    echo -e "${GREEN}✓ Button text is correct${NC}"
else
    echo -e "${RED}✗ Button text not found!${NC}"
    exit 1
fi

if grep -q "setShowViewClaimsModal" frontend/app/purchase-requests/page.tsx; then
    echo -e "${GREEN}✓ Button element found${NC}"
else
    echo -e "${RED}✗ Button element not found!${NC}"
    exit 1
fi

if grep -q 'function ViewClaimsModal' frontend/app/purchase-requests/page.tsx; then
    echo -e "${GREEN}✓ ViewClaimsModal component exists${NC}"
else
    echo -e "${RED}✗ ViewClaimsModal component not found!${NC}"
    exit 1
fi

echo ""

# Step 2: Commit and push changes
echo -e "${YELLOW}Step 2: Committing and pushing changes...${NC}"
git add frontend/app/purchase-requests/page.tsx
if git diff --staged --quiet; then
    echo -e "${YELLOW}No changes to commit${NC}"
else
    git commit -m "fix: Remove corrupted emoji from claims button text"
    echo -e "${GREEN}✓ Changes committed${NC}"
fi

git push origin main
echo -e "${GREEN}✓ Changes pushed to repository${NC}"
echo ""

# Step 3: Deploy to EC2
echo -e "${YELLOW}Step 3: Deploying to EC2...${NC}"

# SSH command that will be executed on EC2
ssh -i ~/.ssh/fyp-system-key.pem ec2-user@54.169.184.80 << 'ENDSSH'
    set -e
    cd /home/ec2-user/fyp_system
    
    echo "=== Pulling latest changes ==="
    git fetch origin
    git reset --hard origin/main
    
    echo ""
    echo "=== Verifying file content on EC2 ==="
    if grep -q "DOWNLOAD.*CLAIM" frontend/app/purchase-requests/page.tsx; then
        echo "✓ Button text is correct on EC2"
    else
        echo "✗ Button text NOT correct on EC2!"
        exit 1
    fi
    
    echo ""
    echo "=== Stopping frontend ==="
    pm2 stop frontend || true
    
    echo ""
    echo "=== Cleaning build artifacts ==="
    cd frontend
    rm -rf .next
    rm -rf node_modules/.cache
    
    echo ""
    echo "=== Installing dependencies ==="
    npm install
    
    echo ""
    echo "=== Building frontend ==="
    NODE_ENV=production npm run build
    
    echo ""
    echo "=== Starting frontend ==="
    cd ..
    pm2 start frontend
    
    echo ""
    echo "=== Waiting for frontend to start ==="
    sleep 5
    
    echo ""
    echo "=== PM2 Status ==="
    pm2 status
    
    echo ""
    echo "=== Recent logs ==="
    pm2 logs frontend --lines 20 --nostream
ENDSSH

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Next steps:"
echo "1. Clear your browser cache (Cmd+Shift+R on Mac)"
echo "2. Log in as an accountant"
echo "3. Navigate to Purchase Requests"
echo "4. Look for approved requests with claims"
echo "5. You should see a red 'DOWNLOAD X CLAIM(S)' button"
echo "6. Click the button to download the receipt"
echo ""
echo "If you still don't see the button, check:"
echo "- Browser console for errors (F12)"
echo "- PM2 logs: ssh to EC2 and run 'pm2 logs frontend'"
echo ""
