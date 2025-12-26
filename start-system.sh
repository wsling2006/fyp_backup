#!/bin/bash

# Full System Startup Script for EC2
# Use this when PM2 is empty or after system restart

set -e

echo "=================================================="
echo "🚀 Starting FYP System with PM2"
echo "=================================================="

# Navigate to project directory
cd ~/fyp_system

echo ""
echo "📦 Pulling latest code..."
git pull origin main

# Build and Start Backend
echo ""
echo "🔧 Building Backend (NestJS)..."
cd backend
npm run build

echo ""
echo "🚀 Starting Backend..."
pm2 start npm --name "backend" -- run start:prod
cd ..

# Build and Start Frontend
echo ""
echo "🎨 Building Frontend (Next.js)..."
cd frontend
npm run build

echo ""
echo "🌐 Starting Frontend (Next.js)..."
pm2 start npm --name "frontend" -- start
cd ..

# Save PM2 configuration
echo ""
echo "💾 Saving PM2 configuration..."
pm2 save

# Setup PM2 startup script (so it auto-starts on reboot)
echo ""
echo "⚙️  Setting up PM2 startup script..."
pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "✅ System started successfully!"
echo ""
pm2 status
echo ""
echo "=================================================="
echo "📋 Next Steps:"
echo "=================================================="
echo "1. Open browser and go to: http://$(curl -s ifconfig.me):3001"
echo "2. Clear localStorage in browser console:"
echo "   localStorage.clear();"
echo "3. Login with your sales department credentials"
echo "4. Go to Purchase Requests page"
echo "5. Check console logs (F12) for [canEditRequest] messages"
echo ""
echo "🔍 To debug, visit:"
echo "   http://$(curl -s ifconfig.me):3001/debug-edit-button.html"
echo "=================================================="
