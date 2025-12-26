#!/bin/bash

# Debug Backend Startup Issue
# Let's find out what's ACTUALLY wrong

echo "=================================================="
echo "🔍 Debugging Backend Startup"
echo "=================================================="

echo ""
echo "1️⃣ Checking if dist folder exists..."
if [ -d ~/fyp_system/backend/dist ]; then
    echo "✅ dist folder EXISTS"
    ls -la ~/fyp_system/backend/dist/ | head -20
else
    echo "❌ dist folder DOES NOT EXIST"
fi

echo ""
echo "2️⃣ Checking if dist/main.js exists..."
if [ -f ~/fyp_system/backend/dist/main.js ]; then
    echo "✅ dist/main.js EXISTS"
    ls -lh ~/fyp_system/backend/dist/main.js
else
    echo "❌ dist/main.js DOES NOT EXIST"
fi

echo ""
echo "3️⃣ Checking Node.js version..."
node --version

echo ""
echo "4️⃣ Checking npm version..."
npm --version

echo ""
echo "5️⃣ Checking if node_modules exists..."
if [ -d ~/fyp_system/backend/node_modules ]; then
    echo "✅ node_modules EXISTS"
else
    echo "❌ node_modules DOES NOT EXIST - Need to run npm install"
fi

echo ""
echo "6️⃣ Checking PM2 logs for backend..."
pm2 logs backend --lines 30 --nostream

echo ""
echo "7️⃣ Checking package.json scripts..."
cat ~/fyp_system/backend/package.json | grep -A 10 '"scripts"'

echo ""
echo "=================================================="
echo "🔧 Attempting manual build..."
echo "=================================================="
cd ~/fyp_system/backend
npm run build 2>&1 | tail -50

echo ""
echo "=================================================="
echo "📊 Build Result:"
echo "=================================================="
if [ -f ~/fyp_system/backend/dist/main.js ]; then
    echo "✅ BUILD SUCCESSFUL - dist/main.js created"
    ls -lh ~/fyp_system/backend/dist/main.js
else
    echo "❌ BUILD FAILED - dist/main.js not created"
    echo ""
    echo "Check the build errors above ☝️"
fi
