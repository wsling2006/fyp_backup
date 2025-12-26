#!/bin/bash

# Force complete frontend rebuild

echo "=================================================="
echo "🔄 FORCE FRONTEND REBUILD"
echo "=================================================="

cd ~/fyp_system/frontend

echo "Deleting old build..."
rm -rf .next

echo "Pulling latest code..."
cd ..
git pull origin main

cd frontend

echo "Building frontend..."
npm run build

echo "Stopping old frontend..."
pm2 delete frontend 2>/dev/null || true

echo "Starting new frontend..."
pm2 start npm --name "frontend" -- start

cd ..
pm2 save

echo ""
echo "✅ Frontend rebuilt and restarted"
pm2 status

echo ""
echo "=================================================="
echo "NOW IN BROWSER:"
echo "=================================================="
echo "1. Hard refresh: Ctrl+Shift+R"
echo "2. Or clear cache in DevTools (F12 → Network → Disable cache)"
echo "3. Refresh page"
echo "4. Edit buttons should appear!"
echo "=================================================="
