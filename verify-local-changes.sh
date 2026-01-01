#!/bin/bash

# Local Verification - Run this on your LOCAL machine
# This verifies the changes are ready to deploy

echo "🔍 Local Verification of JavaScript Validation Fix"
echo ""

# Check if we're in the right directory
if [ ! -f "frontend/app/purchase-requests/page.tsx" ]; then
  echo "❌ Please run this from the fyp_system directory"
  exit 1
fi

# Check if changes are committed
echo "📋 Checking git status..."
if [[ -n $(git status -s) ]]; then
  echo "⚠️  You have uncommitted changes:"
  git status -s
  echo ""
else
  echo "✅ All changes committed"
fi

# Check if we're up to date with remote
echo ""
echo "🔄 Checking if local is in sync with remote..."
git fetch origin main
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✅ Local is in sync with remote (origin/main)"
else
  echo "⚠️  Local is not in sync with remote"
  echo "   Run: git push origin main"
fi

# Verify the fix is in the file
echo ""
echo "🔍 Verifying JavaScript validation is in place..."
if grep -q "Prevent negative values" frontend/app/purchase-requests/page.tsx; then
  echo "✅ Approved amount validation found"
else
  echo "❌ Approved amount validation missing"
fi

if grep -q "Claimed amount cannot be negative" frontend/app/purchase-requests/page.tsx; then
  echo "✅ Claimed amount validation found"
else
  echo "❌ Claimed amount validation missing"
fi

# Try to build locally
echo ""
echo "🔨 Testing local build..."
cd frontend
if npm run build > /dev/null 2>&1; then
  echo "✅ Frontend builds successfully"
else
  echo "❌ Frontend build failed"
  echo "   Run: cd frontend && npm run build"
  exit 1
fi

echo ""
echo "✅ Local verification complete!"
echo ""
echo "📦 Next steps:"
echo "1. SSH into your EC2 server"
echo "2. Run these commands:"
echo ""
echo "   cd ~/fyp_system"
echo "   git pull origin main"
echo "   cd frontend"
echo "   npm run build"
echo "   pm2 restart all"
echo ""
echo "3. Hard refresh your browser:"
echo "   - Chrome/Edge: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "   - Firefox: Ctrl+F5 or Cmd+Shift+R"
echo ""
echo "4. Test by entering -100 in any amount field → Should be blocked!"
