#!/bin/bash

# MANUAL DEPLOYMENT INSTRUCTIONS FOR CLAIMS FIX
# Run these commands on EC2 to deploy the fix

echo "================================================"
echo "MANUAL EC2 DEPLOYMENT INSTRUCTIONS"
echo "================================================"
echo ""
echo "1. First, SSH to your EC2 instance:"
echo "   ssh -i /path/to/your/key.pem ec2-user@13.214.167.194"
echo ""
echo "2. Then run these commands:"
echo ""
cat << 'EOF'
cd /home/ec2-user/fyp_system

# Pull latest code
git fetch origin
git reset --hard origin/main

# Verify the button code is present
if grep -q "ViewClaimsModal" frontend/app/purchase-requests/page.tsx; then
    echo "✓ Button code verified"
else
    echo "✗ Button code NOT found!"
    exit 1
fi

# Stop frontend
pm2 stop frontend

# Clean build cache
cd frontend
rm -rf .next
rm -rf node_modules/.cache

# Install dependencies
npm install

# Build frontend
NODE_ENV=production npm run build

# Start frontend
cd ..
pm2 start frontend

# Check status
sleep 5
pm2 status
pm2 logs frontend --lines 20 --nostream

echo ""
echo "================================================"
echo "Deployment complete!"
echo "Open http://13.214.167.194:3000"
echo "Clear browser cache (Cmd+Shift+R)"
echo "Log in as accountant and check Purchase Requests"
echo "================================================"
EOF
