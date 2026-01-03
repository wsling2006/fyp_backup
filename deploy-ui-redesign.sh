#!/bin/bash

# 🎨 Deploy Modern UI Redesign to EC2
# This script deploys the redesigned announcement detail page

echo "🎨 =============================================="
echo "   Deploying Modern UI Redesign to EC2"
echo "=============================================="
echo ""

# Step 1: Pull latest changes
echo "📥 Step 1: Pulling latest changes from GitHub..."
cd /home/ubuntu/fyp_system
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Failed to pull from GitHub"
    exit 1
fi

echo "✅ Successfully pulled latest changes"
echo ""

# Step 2: Rebuild frontend
echo "🔨 Step 2: Rebuilding frontend with new UI..."
cd frontend
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Frontend built successfully"
echo ""

# Step 3: Restart frontend
echo "🔄 Step 3: Restarting frontend service..."
pm2 restart frontend
pm2 save

if [ $? -ne 0 ]; then
    echo "❌ Failed to restart frontend"
    exit 1
fi

echo "✅ Frontend restarted successfully"
echo ""

# Step 4: Check status
echo "📊 Step 4: Checking service status..."
pm2 status

echo ""
echo "🎉 =============================================="
echo "   Deployment Complete!"
echo "=============================================="
echo ""
echo "📝 What was deployed:"
echo "   ✅ Modern Tailwind UI for announcement detail page"
echo "   ✅ Redesigned priority badges (pill style)"
echo "   ✅ Enhanced attachment cards with hover effects"
echo "   ✅ Improved reaction buttons with animations"
echo "   ✅ Better loading and error states"
echo "   ✅ Consistent design across all sections"
echo ""
echo "🧪 Testing Steps:"
echo "   1. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)"
echo "   2. Navigate to any announcement detail page"
echo "   3. Verify modern UI styling is applied"
echo "   4. Test all interactive elements:"
echo "      • Click reactions (should highlight when selected)"
echo "      • Hover over attachments (should show blue accent)"
echo "      • Download files (should work normally)"
echo "      • Mark as read (should show success banner)"
echo "      • Add comments (should work normally)"
echo "   5. Check responsive design on different screen sizes"
echo ""
echo "🎨 Design Features:"
echo "   • Gradient headers (blue-50 to indigo-50)"
echo "   • Rounded corners and soft shadows"
echo "   • Smooth transitions and hover effects"
echo "   • Color-coded priority badges"
echo "   • Icon-based file cards"
echo "   • Interactive reaction buttons"
echo "   • Clean, modern typography"
echo ""
echo "📚 Documentation: ANNOUNCEMENT_UI_REDESIGN.md"
echo ""
