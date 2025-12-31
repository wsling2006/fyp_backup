#!/bin/bash

# Deployment script for enhanced logging to diagnose blank file issue
# This script will:
# 1. Pull latest code on EC2
# 2. Rebuild backend
# 3. Restart backend service
# 4. Show logs to verify deployment
# 5. Provide testing instructions

echo "============================================"
echo "Deploying Enhanced Logging for File Upload/Download Diagnosis"
echo "============================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we can connect to EC2
echo "Testing EC2 connection..."
if ! ssh -q fyp exit; then
    echo -e "${RED}ERROR: Cannot connect to EC2. Check your SSH configuration.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ EC2 connection successful${NC}"
echo ""

# Deploy backend
echo "============================================"
echo "DEPLOYING BACKEND"
echo "============================================"
ssh fyp << 'ENDSSH'
    cd ~/fyp_system
    echo "Pulling latest code..."
    git pull origin main
    
    cd backend
    echo "Installing dependencies..."
    npm install
    
    echo "Building backend..."
    npm run build
    
    echo "Restarting backend service..."
    pm2 restart fyp-backend
    
    echo "Waiting for service to start..."
    sleep 3
    
    echo ""
    echo "Backend deployment complete!"
    echo ""
ENDSSH

echo ""
echo "============================================"
echo "DEPLOYMENT COMPLETE"
echo "============================================"
echo ""
echo -e "${GREEN}Enhanced logging has been deployed!${NC}"
echo ""
echo "============================================"
echo "NEXT STEPS TO DIAGNOSE THE ISSUE"
echo "============================================"
echo ""
echo "1. Monitor the backend logs:"
echo "   ssh fyp 'pm2 logs fyp-backend --lines 50'"
echo ""
echo "2. Upload a test file:"
echo "   - Login as Sales/Marketing user"
echo "   - Create/approve a purchase request"
echo "   - Upload a receipt (small PDF or image)"
echo "   - Watch for [UPLOAD] log messages"
echo ""
echo "3. Download the test file:"
echo "   - Login as Accountant"
echo "   - Find the claim and click download"
echo "   - Watch for [DOWNLOAD] log messages"
echo ""
echo "4. Check the logs for these key indicators:"
echo "   - Buffer sizes (should match before/after scan)"
echo "   - First bytes in hex (should be non-zero)"
echo "   - File sizes on disk (should match upload size)"
echo ""
echo "5. If file is still blank, run manual diagnostics:"
echo "   ssh fyp 'bash /tmp/diagnostic-upload.sh'"
echo ""
echo -e "${YELLOW}Look for:${NC}"
echo "  - All zeros in hex dump = blank file"
echo "  - Size mismatch = write issue"
echo "  - File not found = storage/path issue"
echo "  - Size 0 or 68 bytes = EICAR test file (ClamAV issue)"
echo ""
echo "============================================"
echo "MONITORING LOGS NOW..."
echo "============================================"
echo ""
echo "Press Ctrl+C to stop monitoring"
echo ""

# Show live logs
ssh fyp 'pm2 logs fyp-backend --lines 100'
