#!/bin/bash
# Complete rebuild and restart to fix file upload
# Run this on EC2

echo "=========================================="
echo "Complete Backend Rebuild & Restart"
echo "=========================================="
echo ""

cd ~/fyp_system/backend

echo "1. Stopping backend..."
pm2 stop backend

echo ""
echo "2. Cleaning build artifacts..."
rm -rf dist/
rm -rf node_modules/.cache/

echo ""
echo "3. Installing dependencies..."
npm install

echo ""
echo "4. Building backend (this may take a moment)..."
npm run build

echo ""
echo "5. Checking if build succeeded..."
if [ -f "dist/src/main.js" ]; then
    echo "✓ Build successful!"
else
    echo "✗ Build failed! Check for errors above."
    exit 1
fi

echo ""
echo "6. Starting backend..."
cd ~/fyp_system
pm2 start ecosystem.config.js --only backend --env production

sleep 5

echo ""
echo "7. Checking backend status..."
pm2 list

echo ""
echo "8. Checking backend logs for errors..."
pm2 logs backend --lines 30 --nostream | grep -i "error\|nest\|listening" | tail -20

echo ""
echo "=========================================="
echo "✓ Rebuild Complete!"
echo "=========================================="
echo ""
echo "Now test file upload again!"
echo "The backend should now properly save file data to database."
echo ""
