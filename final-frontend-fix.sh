#!/bin/bash

# Final Frontend Fix - Pull latest code and rebuild
# The issue: EC2 has old code without formatCurrency helper

echo "=========================================="
echo "FINAL FRONTEND FIX"
echo "=========================================="
echo ""

# Step 1: Stop frontend to prevent restarts during fix
echo "=== Step 1: Stopping Frontend ==="
pm2 stop frontend 2>/dev/null
pm2 delete frontend 2>/dev/null
echo "✓ Frontend stopped and deleted"
echo ""

# Step 2: Pull latest code from GitHub
echo "=== Step 2: Pulling Latest Code ==="
cd ~/fyp_system
git fetch origin
git reset --hard origin/main
echo "✓ Latest code pulled"
echo ""

# Step 3: Check if formatCurrency exists in the file
echo "=== Step 3: Verifying formatCurrency Helper ==="
if grep -q "const formatCurrency" ~/fyp_system/frontend/app/purchase-requests/page.tsx; then
    echo "✓ formatCurrency helper found in code"
else
    echo "✗ formatCurrency helper MISSING - this will cause build errors!"
    echo ""
    echo "Adding formatCurrency helper manually..."
    
    # Backup the file
    cp ~/fyp_system/frontend/app/purchase-requests/page.tsx ~/fyp_system/frontend/app/purchase-requests/page.tsx.backup
    
    # Add formatCurrency after the imports (around line 7)
    sed -i "7a\\
\\
// Helper function to safely format decimal values (PostgreSQL returns DECIMAL as string)\\
const formatCurrency = (value: any): string => {\\
  if (value === null || value === undefined) return '0.00';\\
  const num = typeof value === 'string' ? parseFloat(value) : value;\\
  return isNaN(num) ? '0.00' : num.toFixed(2);\\
};\\
" ~/fyp_system/frontend/app/purchase-requests/page.tsx
    
    echo "✓ formatCurrency helper added"
fi
echo ""

# Step 4: Install dependencies (in case anything is missing)
echo "=== Step 4: Checking Dependencies ==="
cd ~/fyp_system/frontend
if [ ! -d "node_modules/next" ]; then
    echo "Installing dependencies..."
    npm install
else
    echo "✓ Dependencies already installed"
fi
echo ""

# Step 5: Clean old build
echo "=== Step 5: Cleaning Old Build ==="
rm -rf .next
echo "✓ Old .next directory removed"
echo ""

# Step 6: Build frontend
echo "=== Step 6: Building Frontend ==="
npm run build 2>&1 | tee /tmp/frontend-build.log

# Check if build was successful
if grep -q "Compiled successfully" /tmp/frontend-build.log && [ -f ".next/BUILD_ID" ]; then
    echo ""
    echo "✓ BUILD SUCCESSFUL - .next directory created"
else
    echo ""
    echo "✗ BUILD FAILED - Check errors above"
    echo ""
    echo "Last 30 lines of build output:"
    tail -30 /tmp/frontend-build.log
    exit 1
fi
echo ""

# Step 7: Verify .next directory
echo "=== Step 7: Verifying Build ==="
if [ -f ".next/BUILD_ID" ]; then
    echo "✓ BUILD_ID exists"
    cat .next/BUILD_ID
else
    echo "✗ BUILD_ID missing - build incomplete!"
    exit 1
fi

if [ -d ".next/server" ]; then
    echo "✓ Server directory exists"
else
    echo "✗ Server directory missing!"
    exit 1
fi
echo ""

# Step 8: Start frontend with PM2
echo "=== Step 8: Starting Frontend ==="
pm2 start npm --name frontend -- run start
echo ""

# Wait for startup
echo "Waiting 5 seconds for frontend to start..."
sleep 5

# Step 9: Check status
echo ""
echo "=== Step 9: Final Status ==="
pm2 status

echo ""
echo "=== Frontend Logs (last 15 lines) ==="
pm2 logs frontend --lines 15 --nostream

echo ""
echo "=========================================="
echo "FIX COMPLETE"
echo "=========================================="
echo ""

# Final check
if pm2 status | grep -q "frontend.*online"; then
    echo "✅ SUCCESS! Frontend is ONLINE"
    echo ""
    echo "Test in browser: http://54.254.162.43:3001"
else
    echo "⚠️  Frontend may still have issues"
    echo ""
    echo "Check logs with: pm2 logs frontend"
fi
