#!/bin/bash

# Test Claims Download Feature
# This script tests the new claims download endpoint

echo "=========================================="
echo "Claims Download Feature Test"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Backend URL
BACKEND_URL="http://localhost:3000"

echo "1. Checking Backend Health..."
if curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL" | grep -q "200\|404"; then
    echo -e "${GREEN}✓${NC} Backend is running"
else
    echo -e "${RED}✗${NC} Backend is not responding"
    exit 1
fi

echo ""
echo "2. Testing Claims API (requires authentication)..."
echo "   Note: You need to be logged in to test the download endpoint"
echo ""

echo "   To manually test:"
echo "   1. Login to the application at http://localhost:3001"
echo "   2. Navigate to Purchase Requests page"
echo "   3. Find a request with claims"
echo "   4. Click 'View Claims' button"
echo "   5. Click 'Download Receipt' button on a claim"
echo ""

echo "3. Checking if new endpoint exists in build..."
if grep -q "download" /Users/jw/fyp_system/backend/dist/src/purchase-requests/purchase-request.controller.js 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Download endpoint found in compiled code"
else
    echo -e "${YELLOW}⚠${NC}  Could not verify in compiled code (might need rebuild)"
fi

echo ""
echo "4. Checking Frontend Build..."
if [ -f "/Users/jw/fyp_system/frontend/.next/static/chunks/app/purchase-requests/page.js" ]; then
    echo -e "${GREEN}✓${NC} Frontend build exists"
    if grep -q "ViewClaimsModal" /Users/jw/fyp_system/frontend/.next/server/app/purchase-requests/page.js 2>/dev/null; then
        echo -e "${GREEN}✓${NC} ViewClaimsModal found in compiled code"
    else
        echo -e "${YELLOW}⚠${NC}  Could not verify ViewClaimsModal (might be minified)"
    fi
else
    echo -e "${RED}✗${NC} Frontend build not found"
fi

echo ""
echo "=========================================="
echo "Services Status:"
echo "=========================================="
npx pm2 status

echo ""
echo "=========================================="
echo "Manual Testing Instructions:"
echo "=========================================="
echo ""
echo "1. Open browser: http://localhost:3001"
echo "2. Login as Accountant or Super Admin"
echo "3. Go to Purchase Requests"
echo "4. Find a purchase request with claims"
echo "5. Click 'View Claims (X)' button"
echo "6. Verify claim details are displayed"
echo "7. Click 'Download Receipt' button"
echo "8. Verify file downloads with correct filename"
echo ""
echo "Expected Behavior:"
echo "  - Modal shows all claim details"
echo "  - Download button triggers file download"
echo "  - File downloads with original filename"
echo "  - Download is logged in audit trail"
echo ""
echo "=========================================="
