#!/bin/bash

# Force update the frontend file on EC2 with the correct version
echo "🔄 Force updating frontend file on EC2..."

# Copy the local file to EC2
echo "📤 Copying file to EC2..."
scp frontend/app/purchase-requests/page.tsx ubuntu@54.166.82.148:~/fyp_system/frontend/app/purchase-requests/page.tsx

# SSH and rebuild frontend
echo "🔨 Rebuilding frontend on EC2..."
ssh ubuntu@54.166.82.148 << 'EOF'
cd ~/fyp_system/frontend
echo "📦 Installing dependencies..."
npm install
echo "🏗️  Building frontend..."
npm run build
echo "🔄 Restarting PM2..."
pm2 restart ecosystem.config.js --only frontend
pm2 save
echo "✅ Frontend updated and restarted!"
EOF

echo ""
echo "✨ Update complete! Please verify in browser."
echo "🔍 Check: http://54.166.82.148:3000/purchase-requests"
