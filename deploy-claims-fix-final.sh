#!/bin/bash

# FINAL CLAIMS FIX DEPLOYMENT SCRIPT
# Deploys the corrected claims button to EC2

set -e  # Exit on error

EC2_IP="13.214.167.194"
EC2_USER="ec2-user"
SSH_KEY="$HOME/Desktop/fyp-key.pem"

echo "================================================"
echo "DEPLOYING CLAIMS FIX TO EC2"
echo "IP: $EC2_IP"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Verify local file has the correct button
echo -e "${YELLOW}Verifying local file...${NC}"
if grep -q "ViewClaimsModal" frontend/app/purchase-requests/page.tsx; then
    echo -e "${GREEN}✓ Button code verified locally${NC}"
else
    echo -e "${RED}✗ Button code not found locally!${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}Pushing to git...${NC}"
git add -A
if git diff --staged --quiet; then
    echo "No changes to commit"
else
    git commit -m "fix: Update claims button for accountants"
fi
git push origin main
echo -e "${GREEN}✓ Pushed to git${NC}"

echo ""
echo -e "${YELLOW}Deploying to EC2...${NC}"

ssh -i "$SSH_KEY" ${EC2_USER}@${EC2_IP} << 'ENDSSH'
    set -e
    cd /home/ec2-user/fyp_system
    
    echo "=== Pulling latest code ==="
    git fetch origin
    git reset --hard origin/main
    
    echo ""
    echo "=== Verifying button code on EC2 ==="
    if grep -q "ViewClaimsModal" frontend/app/purchase-requests/page.tsx; then
        echo "✓ Button code present on EC2"
    else
        echo "✗ Button code NOT found on EC2!"
        exit 1
    fi
    
    echo ""
    echo "=== Stopping frontend ==="
    pm2 stop frontend || true
    
    echo ""
    echo "=== Cleaning build cache ==="
    cd frontend
    rm -rf .next
    rm -rf node_modules/.cache
    
    echo ""
    echo "=== Installing dependencies ==="
    npm install
    
    echo ""
    echo "=== Building frontend (this may take a minute) ==="
    NODE_ENV=production npm run build
    
    if [ ! -d ".next" ]; then
        echo "✗ Build failed - .next directory not created!"
        exit 1
    fi
    
    echo "✓ Build successful"
    
    echo ""
    echo "=== Starting frontend ==="
    cd ..
    pm2 start frontend
    
    echo ""
    echo "=== Waiting for startup ==="
    sleep 5
    
    echo ""
    echo "=== PM2 Status ==="
    pm2 status
    
    echo ""
    echo "=== Frontend logs (last 20 lines) ==="
    pm2 logs frontend --lines 20 --nostream
ENDSSH

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo "Frontend URL: http://$EC2_IP:3000"
echo ""
echo "Next steps:"
echo "1. Open http://$EC2_IP:3000 in your browser"
echo "2. Clear browser cache (Cmd+Shift+R)"
echo "3. Log in as accountant"
echo "4. Go to Purchase Requests"
echo "5. Look for approved requests with claims"
echo "6. You should see a RED 'DOWNLOAD X CLAIM(S)' button"
echo ""
echo "If the button still doesn't appear:"
echo "- Check browser console (F12) for errors"
echo "- Check if request.claims has data"
echo "- Run: ssh -i ~/.ssh/fyp-system-key.pem ec2-user@$EC2_IP 'pm2 logs frontend'"
echo ""
