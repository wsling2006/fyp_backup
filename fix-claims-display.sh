#!/bin/bash

# 🔧 Fix Claims Display Issue on EC2
# Run this script to rebuild frontend and fix Server Action errors

echo "========================================"
echo "🔧 FIXING CLAIMS DISPLAY ISSUE"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

cd /home/ubuntu/fyp_system || exit 1

echo -e "${BLUE}=== Step 1: Check Claims in Database ===${NC}"
echo "Total claims:"
sudo -u postgres psql -d fyp_db -c "SELECT COUNT(*) FROM claims;"
echo ""

echo "Recent claims with purchase requests:"
sudo -u postgres psql -d fyp_db -c "
SELECT 
  LEFT(c.id::text, 8) as claim_id,
  LEFT(pr.title, 25) as request_title,
  pr.status as req_status,
  c.vendor_name,
  c.amount_claimed,
  c.status as claim_status
FROM claims c
LEFT JOIN purchase_requests pr ON c.purchase_request_id = pr.id
ORDER BY c.created_at DESC
LIMIT 9;
"
echo ""

echo -e "${BLUE}=== Step 2: Stop Frontend ===${NC}"
pm2 stop frontend
echo ""

echo -e "${BLUE}=== Step 3: Delete Old Build ===${NC}"
cd /home/ubuntu/fyp_system/frontend
rm -rf .next
echo "✓ Deleted .next folder"
echo ""

echo -e "${BLUE}=== Step 4: Rebuild Frontend ===${NC}"
echo "This may take 1-2 minutes..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Build successful!${NC}"
else
    echo -e "${YELLOW}⚠️  Build failed! Check errors above.${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}=== Step 5: Restart Frontend ===${NC}"
pm2 restart frontend
echo ""

echo -e "${BLUE}=== Step 6: Check Logs ===${NC}"
echo "Checking for Server Action errors..."
sleep 2
pm2 logs frontend --lines 20 --nostream
echo ""

echo "========================================"
echo -e "${GREEN}✅ FIX COMPLETE!${NC}"
echo "========================================"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Open your browser: http://your-ec2-ip:3001"
echo "2. Press Ctrl+Shift+R to hard refresh (clear browser cache)"
echo "3. Login as accountant"
echo "4. Go to Purchase Requests page"
echo "5. Look for requests with 'Claim Submitted' badge"
echo "6. You should see 'X Claim(s)' button!"
echo ""
echo "If still not showing:"
echo "  - Open DevTools (F12)"
echo "  - Go to Console tab"
echo "  - Look for errors"
echo "  - Share the output with me"
echo ""
