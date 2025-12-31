#!/bin/bash

# Complete system restart - kill old processes and start fresh
echo "============================================"
echo "COMPLETE SYSTEM RESTART"
echo "============================================"
echo ""

# 1. Stop all PM2 processes
echo "1. Stopping all PM2 processes..."
pm2 delete all
pm2 kill

echo ""

# 2. Kill any process on port 3000
echo "2. Killing any process on port 3000..."
sudo lsof -ti:3000 | xargs sudo kill -9 2>/dev/null || echo "No process on port 3000"

echo ""

# 3. Wait a moment
sleep 2

# 4. Build backend
echo "3. Building backend..."
cd ~/fyp_system/backend
npm run build

if [ ! -f "dist/src/main.js" ]; then
    echo "✗ Build failed! dist/src/main.js not found"
    exit 1
fi

echo "✓ Backend built successfully (dist/src/main.js)"
echo ""

# 5. Run migrations
echo "4. Running database migrations..."
npm run migration:run

echo ""

# 6. Start both frontend and backend
echo "5. Starting system..."
cd ~/fyp_system
pm2 start ecosystem.config.js

echo ""

# 7. Wait for startup
echo "6. Waiting for startup..."
sleep 5

echo ""

# 8. Check status
echo "7. System status:"
pm2 status

echo ""

# 9. Show logs
echo "8. Recent logs:"
pm2 logs --lines 20 --nostream

echo ""
echo "============================================"
echo "SYSTEM RESTARTED"
echo "============================================"
echo ""
echo "✓ Backend should now be running on port 3000"
echo "✓ Frontend should be running on port 3001"
echo ""
echo "Monitor logs: pm2 logs"
echo "Stop system: pm2 stop all"
echo "Restart: pm2 restart all"
echo ""
echo "Test backend: curl http://localhost:3000"
echo ""
