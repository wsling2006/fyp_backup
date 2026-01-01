#!/bin/bash

# Deploy JavaScript Validation Fix to EC2
# This script deploys the latest frontend changes with JavaScript validation for amount fields

echo "🚀 Deploying JavaScript Validation Fix to EC2..."
echo ""

# Pull latest changes
echo "📥 Pulling latest changes from repository..."
git pull origin main
if [ $? -ne 0 ]; then
  echo "❌ Failed to pull changes"
  exit 1
fi
echo "✅ Changes pulled successfully"
echo ""

# Rebuild frontend
echo "🔨 Building frontend..."
cd frontend
npm run build
if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed"
  exit 1
fi
echo "✅ Frontend built successfully"
echo ""

# Restart frontend service
echo "🔄 Restarting frontend service..."
sudo systemctl restart fyp-frontend
if [ $? -ne 0 ]; then
  echo "❌ Failed to restart frontend service"
  exit 1
fi
echo "✅ Frontend service restarted"
echo ""

# Check service status
echo "📊 Checking service status..."
sudo systemctl status fyp-frontend --no-pager | head -n 10
echo ""

# Final instructions
echo "✅ Deployment Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Open your browser"
echo "2. Hard refresh the page:"
echo "   - Chrome/Edge: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "   - Firefox: Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)"
echo "   - Safari: Cmd+Option+R (Mac)"
echo ""
echo "3. Test the validation:"
echo "   a) Create Purchase Request:"
echo "      - Try entering -100 in Estimated Amount → Should be blocked"
echo "      - Try entering 0 → Should show error on blur"
echo ""
echo "   b) Review Purchase Request:"
echo "      - Try entering -50 in Approved Amount → Should be blocked"
echo "      - Try entering 0 → Should show error on blur"
echo ""
echo "   c) Upload Claim:"
echo "      - Try entering -200 in Amount Claimed → Should be blocked"
echo "      - Try entering 0 → Should show error on blur"
echo ""
echo "📖 Documentation:"
echo "   - FIX_JAVASCRIPT_AMOUNT_VALIDATION.md"
echo "   - COMPLETE_NEGATIVE_AMOUNT_PREVENTION.md"
echo ""
echo "🎉 All done! The system now has three-layer validation:"
echo "   1. HTML5 (min='0.01')"
echo "   2. JavaScript (onChange + onBlur + pre-submit)"
echo "   3. Backend (@Min(0.01))"
