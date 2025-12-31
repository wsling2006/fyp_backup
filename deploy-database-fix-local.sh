#!/bin/bash

# Deploy database storage fix LOCALLY on EC2
# Run this script directly on the EC2 server

echo "============================================"
echo "DEPLOYING DATABASE STORAGE FIX (LOCAL)"
echo "============================================"
echo ""
echo "This fix changes how claim receipts are stored:"
echo "  OLD: Files stored on disk → Caused blank downloads"
echo "  NEW: Files stored in PostgreSQL database → Works like accountant files"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

cd ~/fyp_system || { echo "Error: ~/fyp_system directory not found"; exit 1; }

echo "============================================"
echo "STEP 1: Pull Latest Code"
echo "============================================"
git pull origin main
echo ""

echo "============================================"
echo "STEP 2: Run Database Migration"
echo "============================================"
echo "Adding columns: receipt_file_data, receipt_file_size, receipt_file_mimetype"
echo ""
cd backend
npm run migration:run
echo ""

echo "============================================"
echo "STEP 3: Install Dependencies"
echo "============================================"
npm install
echo ""

echo "============================================"
echo "STEP 4: Rebuild Backend"
echo "============================================"
npm run build
echo ""

echo "============================================"
echo "STEP 5: Restart Backend Service"
echo "============================================"
pm2 restart fyp-backend
sleep 3
pm2 status
echo ""

echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}DEPLOYMENT COMPLETE!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${BLUE}What Changed:${NC}"
echo "  • Claim receipts now stored IN DATABASE (not disk)"
echo "  • Same storage method as accountant files (which works perfectly)"
echo "  • Downloads use Buffer.from(data) - proven to work"
echo "  • Backwards compatible with old disk-stored files"
echo ""
echo -e "${BLUE}Why This Fixes the Issue:${NC}"
echo "  • Accountant files work → They use database storage"
echo "  • Claim files failed → They used disk storage"
echo "  • Solution: Use the same working pattern for claims"
echo ""
echo -e "${YELLOW}============================================${NC}"
echo -e "${YELLOW}TESTING INSTRUCTIONS${NC}"
echo -e "${YELLOW}============================================${NC}"
echo ""
echo "1. Upload a NEW receipt (old ones still use disk):"
echo "   - Login as Sales/Marketing"
echo "   - Create/approve a purchase request"
echo "   - Upload a receipt (PDF or image)"
echo ""
echo "2. Download the NEW receipt:"
echo "   - Login as Accountant"
echo "   - Find the purchase request"
echo "   - Click the blue download button"
echo "   - File should download correctly!"
echo ""
echo "3. Verify the file:"
echo "   - Open the downloaded file"
echo "   - It should NOT be blank"
echo "   - It should match the original upload"
echo ""
echo -e "${GREEN}Expected Result:${NC}"
echo "  ✓ New uploads will be stored in database"
echo "  ✓ Downloads will work correctly (not blank)"
echo "  ✓ Same behavior as accountant files feature"
echo ""
echo -e "${BLUE}Monitoring Logs:${NC}"
echo "  pm2 logs fyp-backend"
echo ""
echo "Look for:"
echo "  [UPLOAD] Storing file in database (not disk)"
echo "  [DOWNLOAD] Using database-stored file"
echo ""
echo -e "${YELLOW}Press Enter to monitor logs (Ctrl+C to exit)...${NC}"
read
pm2 logs fyp-backend --lines 50
