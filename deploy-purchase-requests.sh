#!/bin/bash
# Purchase Request System - EC2 Deployment Script
# Run this on your EC2 instance

set -e  # Exit on error

echo "================================================"
echo "Purchase Request System - Deployment"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Fix ClamAV freshclam lock issue
echo -e "${YELLOW}Step 1: Fixing ClamAV freshclam lock issue...${NC}"
sudo systemctl stop clamav-freshclam || true
sleep 2
sudo freshclam || echo "Warning: freshclam may already be up to date"
sudo systemctl start clamav-freshclam
sudo systemctl start clamav-daemon
sudo systemctl enable clamav-daemon
echo -e "${GREEN}✓ ClamAV configured${NC}"
echo ""

# Step 2: Verify ClamAV is running
echo -e "${YELLOW}Step 2: Verifying ClamAV status...${NC}"
if sudo systemctl is-active --quiet clamav-daemon; then
    echo -e "${GREEN}✓ ClamAV daemon is running${NC}"
else
    echo -e "${RED}✗ ClamAV daemon is NOT running - file uploads will fail!${NC}"
    echo "Try: sudo systemctl start clamav-daemon"
fi
echo ""

# Step 3: Run database migration
echo -e "${YELLOW}Step 3: Running database migration...${NC}"
cd ~/fyp_system/backend
npm run migration:run
echo -e "${GREEN}✓ Migration completed${NC}"
echo ""

# Step 4: Restart backend
echo -e "${YELLOW}Step 4: Restarting backend service...${NC}"
pm2 restart backend
sleep 3
echo -e "${GREEN}✓ Backend restarted${NC}"
echo ""

# Step 5: Verify services
echo -e "${YELLOW}Step 5: Verifying services...${NC}"
echo ""
echo "=== PM2 Status ==="
pm2 list
echo ""
echo "=== Backend Logs (last 30 lines) ==="
pm2 logs backend --lines 30 --nostream
echo ""
echo "=== ClamAV Daemon Status ==="
sudo systemctl status clamav-daemon --no-pager -l
echo ""

# Step 6: Check upload directory
echo -e "${YELLOW}Step 6: Ensuring upload directory exists...${NC}"
mkdir -p ~/fyp_system/backend/uploads/receipts
chmod 755 ~/fyp_system/backend/uploads/receipts
ls -la ~/fyp_system/backend/uploads/
echo -e "${GREEN}✓ Upload directory ready${NC}"
echo ""

# Final summary
echo "================================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo "1. Test file upload via frontend"
echo "2. Monitor logs: pm2 logs backend"
echo "3. Check ClamAV: sudo tail -f /var/log/clamav/clamav.log"
echo ""
echo "To test ClamAV scanning:"
echo "  Upload a clean PDF/JPG file - should succeed"
echo "  Backend will log: 'Scanning file with ClamAV: ...'"
echo "  Backend will log: 'File is clean: ...'"
echo ""
echo "================================================"
