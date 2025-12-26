#!/bin/bash

# Complete Frontend Rebuild and Restart

echo "=================================================="
echo "🔄 Rebuilding Frontend with Latest Code"
echo "=================================================="

cd ~/fyp_system

echo ""
echo "1️⃣ Pulling latest code..."
git pull origin main

echo ""
echo "2️⃣ Stopping frontend..."
pm2 delete frontend

echo ""
echo "3️⃣ Building frontend..."
cd frontend
npm run build

echo ""
echo "4️⃣ Starting frontend..."
pm2 start npm --name "frontend" -- start

echo ""
echo "5️⃣ Saving PM2..."
cd ..
pm2 save

echo ""
echo "✅ Frontend restarted with latest code!"
echo ""
pm2 status

echo ""
echo "=================================================="
echo "📋 Now do this in your browser:"
echo "=================================================="
echo "1. Press Ctrl+Shift+R (hard refresh)"
echo "2. Or press F12 → Network tab → Check 'Disable cache'"
echo "3. Clear localStorage: localStorage.clear();"
echo "4. Refresh page and login again"
echo "5. Go to Purchase Requests"
echo "6. Check console for [canEditRequest] logs"
echo "=================================================="
