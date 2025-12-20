#!/bin/bash

# Test Delete Button Visibility Fix
# This script helps verify the fix is working correctly

echo "==================================="
echo "Delete Button Visibility Test"
echo "==================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "This fix changes the canEditDelete function in:"
echo "  frontend/app/revenue/accountant/page.tsx"
echo ""

echo "PROBLEM:"
echo "  ❌ The function was checking: user?.userId"
echo "  ❌ But the user object only has: user.id"
echo ""

echo "FIX:"
echo "  ✅ Changed to: user?.id"
echo ""

# Check if the fix is applied
echo "Checking if fix is applied..."
if grep -q "user?.id" /Users/jw/fyp_system/frontend/app/revenue/accountant/page.tsx; then
    if ! grep -q "user?.userId" /Users/jw/fyp_system/frontend/app/revenue/accountant/page.tsx; then
        echo -e "${GREEN}✅ Fix is applied!${NC}"
        echo ""
    else
        echo -e "${RED}❌ Old code still present${NC}"
        echo ""
        exit 1
    fi
else
    echo -e "${RED}❌ Fix not found${NC}"
    echo ""
    exit 1
fi

# Check if frontend is built
if [ -d "/Users/jw/fyp_system/frontend/.next" ]; then
    echo -e "${GREEN}✅ Frontend is built${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend not built. Run: cd frontend && npm run build${NC}"
fi
echo ""

echo "==================================="
echo "HOW TO TEST ON EC2:"
echo "==================================="
echo ""
echo "1. SSH to EC2:"
echo "   ssh -i \"your-key.pem\" ubuntu@13.213.52.37"
echo ""
echo "2. Pull latest code:"
echo "   cd /home/ubuntu/fyp_system"
echo "   git pull"
echo ""
echo "3. Rebuild frontend:"
echo "   cd frontend"
echo "   npm run build"
echo ""
echo "4. Restart frontend:"
echo "   pm2 restart frontend"
echo ""
echo "5. Test in browser:"
echo "   http://13.213.52.37:3000/revenue/accountant"
echo ""
echo "6. Expected behavior:"
echo "   ✅ Delete button shows for YOUR records"
echo "   ✅ 'No access' shows for OTHER users' records"
echo ""

echo "==================================="
echo "QUICK BROWSER TEST:"
echo "==================================="
echo ""
echo "Open browser console and run:"
echo ""
echo "const user = JSON.parse(localStorage.getItem('user'));"
echo "console.log('User ID:', user.id);"
echo "console.log('User has userId?', user.userId);"
echo ""
echo "Expected output:"
echo "  User ID: <some-uuid>"
echo "  User has userId? undefined"
echo ""

echo "==================================="
echo "STATUS: Fix ready for EC2 deployment"
echo "==================================="
