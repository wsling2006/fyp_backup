#!/bin/bash

# Fix backend and restart everything properly

echo "=================================================="
echo "🔧 FIXING BACKEND AND RESTARTING SYSTEM"
echo "=================================================="

# Stop everything
echo "Stopping all PM2 processes..."
pm2 delete all

cd ~/fyp_system

echo ""
echo "========== BACKEND =========="
cd backend

echo "Building backend..."
npm run build

echo "Checking if dist/src/main.js exists..."
if [ -f dist/src/main.js ]; then
    echo "✅ dist/src/main.js EXISTS"
else
    echo "❌ dist/src/main.js MISSING"
    exit 1
fi

echo "Starting backend..."
pm2 start npm --name "backend" -- run start:prod

sleep 5

echo "Checking backend logs..."
pm2 logs backend --lines 10 --nostream

echo ""
echo "========== FRONTEND =========="
cd ../frontend

echo "Building frontend..."
npm run build

echo "Starting frontend..."
pm2 start npm --name "frontend" -- start

sleep 5

cd ..
pm2 save

echo ""
echo "========== STATUS =========="
pm2 status

echo ""
echo "Test backend API:"
curl -s http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"leejwei004@gmail.com","password":"password123"}' | head -c 100

echo ""
echo ""
echo "=================================================="
echo "✅ SYSTEM RESTARTED"
echo "=================================================="
