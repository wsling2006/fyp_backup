#!/bin/bash

# Deploy File Upload Security Enhancements
# This script deploys the following features:
# 1. ClamAV scanning for receipt uploads (already implemented)
# 2. Duplicate file detection using SHA-256 hashing
# 3. One claim per purchase request enforcement
# 4. Updated frontend to hide "Upload Claim" button when claim exists

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==================================="
echo "Deploying File Upload Security"
echo "==================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: Add file_hash column to claims table
echo ""
echo -e "${BLUE}Step 1: Database Migration${NC}"
echo "Please run the following SQL migration manually:"
echo ""
echo -e "${GREEN}  cd /Users/jw/fyp_system/backend"
echo "  psql fyp_db -p 5433 -U <your_db_user> -f add-file-hash-column.sql${NC}"
echo ""
echo "OR use your preferred database client to run:"
echo "  backend/add-file-hash-column.sql"
echo ""
read -p "Press Enter once you've run the migration, or Ctrl+C to exit..."

# Step 2: Rebuild backend
echo ""
echo -e "${BLUE}Step 2: Building backend...${NC}"
npm run build || {
    echo -e "${RED}Backend build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Backend built successfully${NC}"

# Step 3: Rebuild frontend
echo ""
echo -e "${BLUE}Step 3: Building frontend...${NC}"
cd ../frontend
npm run build || {
    echo -e "${RED}Frontend build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Step 4: Restart services
echo ""
echo -e "${BLUE}Step 4: Restarting services with PM2...${NC}"
cd ..
pm2 restart ecosystem.config.js || {
    echo -e "${RED}PM2 restart failed. Trying to start services...${NC}"
    pm2 start ecosystem.config.js
}
echo -e "${GREEN}✓ Services restarted${NC}"

# Step 5: Show PM2 status
echo ""
echo -e "${BLUE}Current PM2 Status:${NC}"
pm2 status

echo ""
echo -e "${GREEN}==================================="
echo "Deployment Complete!"
echo "===================================${NC}"
echo ""
echo "New Features Deployed:"
echo "  ✓ ClamAV malware scanning for receipt uploads"
echo "  ✓ Duplicate file detection (SHA-256 hashing)"
echo "  ✓ One claim per purchase request enforcement"
echo "  ✓ Frontend hides upload button when claim exists"
echo ""
echo "Security Enhancements:"
echo "  • Users cannot upload the same receipt file twice"
echo "  • Each purchase request can only have one claim"
echo "  • All receipts are scanned for malware before storage"
echo "  • File validation (PDF, JPG, PNG only, max 10MB)"
echo ""
echo "Test the new features:"
echo "  1. Try to upload a claim for an approved purchase request"
echo "  2. Try to upload the same file again (should be rejected)"
echo "  3. Try to upload another claim to the same PR (button should be hidden)"
echo ""
