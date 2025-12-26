#!/bin/bash

# Test File Upload Security Features
# This script helps verify the new security features are working

echo "=================================="
echo "File Upload Security Test Suite"
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Check if file_hash column exists in database
echo -e "${BLUE}Test 1: Checking database schema...${NC}"
COLUMN_EXISTS=$(psql fyp_db -p 5433 -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='claims' AND column_name='file_hash';" 2>/dev/null | xargs)

if [ "$COLUMN_EXISTS" = "file_hash" ]; then
    echo -e "${GREEN}✓ file_hash column exists in claims table${NC}"
else
    echo -e "${RED}✗ file_hash column NOT found. Please run the migration!${NC}"
    echo "  Run: psql fyp_db -p 5433 -U <user> -f backend/add-file-hash-column.sql"
fi
echo ""

# Test 2: Check if backend build includes crypto import
echo -e "${BLUE}Test 2: Checking backend build...${NC}"
if grep -q "crypto" backend/dist/src/purchase-requests/purchase-request.service.js 2>/dev/null; then
    echo -e "${GREEN}✓ Backend includes crypto module for hashing${NC}"
else
    echo -e "${RED}✗ Backend build might be outdated. Please rebuild!${NC}"
    echo "  Run: cd backend && npm run build"
fi
echo ""

# Test 3: Check if frontend build exists
echo -e "${BLUE}Test 3: Checking frontend build...${NC}"
if [ -d "frontend/.next" ]; then
    echo -e "${GREEN}✓ Frontend build exists${NC}"
    
    # Check if purchase-requests page was recently built
    if [ -f "frontend/.next/server/app/purchase-requests/page.js" ]; then
        MOD_TIME=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" frontend/.next/server/app/purchase-requests/page.js 2>/dev/null || stat -c "%y" frontend/.next/server/app/purchase-requests/page.js 2>/dev/null)
        echo "  Last built: $MOD_TIME"
    fi
else
    echo -e "${RED}✗ Frontend build not found. Please rebuild!${NC}"
    echo "  Run: cd frontend && npm run build"
fi
echo ""

# Test 4: Check if ClamAV is running
echo -e "${BLUE}Test 4: Checking ClamAV status...${NC}"
if pgrep -x "clamd" > /dev/null || pgrep -f "clamav" > /dev/null; then
    echo -e "${GREEN}✓ ClamAV daemon is running${NC}"
else
    echo -e "${RED}✗ ClamAV daemon not running${NC}"
    echo "  Malware scanning will not work!"
    echo "  Start ClamAV: sudo systemctl start clamav-daemon"
fi
echo ""

# Test 5: Check if PM2 processes are running
echo -e "${BLUE}Test 5: Checking application status...${NC}"
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 jlist 2>/dev/null)
    
    if echo "$PM2_STATUS" | grep -q "backend"; then
        echo -e "${GREEN}✓ Backend process is running${NC}"
    else
        echo -e "${RED}✗ Backend process not found in PM2${NC}"
    fi
    
    if echo "$PM2_STATUS" | grep -q "frontend"; then
        echo -e "${GREEN}✓ Frontend process is running${NC}"
    else
        echo -e "${RED}✗ Frontend process not found in PM2${NC}"
    fi
else
    echo -e "${RED}✗ PM2 not installed or not in PATH${NC}"
    echo "  Check manually if backend and frontend are running"
fi
echo ""

# Test 6: Check uploads directory
echo -e "${BLUE}Test 6: Checking uploads directory...${NC}"
if [ -d "backend/uploads/receipts" ]; then
    echo -e "${GREEN}✓ Receipts upload directory exists${NC}"
    FILE_COUNT=$(ls -1 backend/uploads/receipts 2>/dev/null | wc -l | xargs)
    echo "  Files stored: $FILE_COUNT"
else
    echo -e "${RED}✗ Receipts directory not found${NC}"
    echo "  Will be created automatically on first upload"
fi
echo ""

# Test 7: Check for recent claims with file_hash
echo -e "${BLUE}Test 7: Checking for claims with file hashes...${NC}"
HASH_COUNT=$(psql fyp_db -p 5433 -t -c "SELECT COUNT(*) FROM claims WHERE file_hash IS NOT NULL;" 2>/dev/null | xargs)

if [ -n "$HASH_COUNT" ] && [ "$HASH_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Found $HASH_COUNT claim(s) with file hashes${NC}"
    echo "  (Shows the feature is being used)"
else
    echo -e "${BLUE}ℹ No claims with hashes yet (this is normal for new deployments)${NC}"
fi
echo ""

# Summary
echo "=================================="
echo "Test Summary"
echo "=================================="
echo ""
echo "Ready for testing! Follow these steps:"
echo ""
echo "1. Login as sales/marketing user"
echo "2. Create or approve a purchase request"
echo "3. Upload a receipt/claim"
echo "4. Try uploading the same file again (should fail)"
echo "5. Try uploading another claim to same PR (button should be hidden)"
echo ""
echo "Check logs for errors:"
echo "  pm2 logs backend --lines 50"
echo "  pm2 logs frontend --lines 50"
echo ""
