#!/bin/bash

# Deep dive into build failure

echo "=================================================="
echo "🔍 Deep Debugging Build Failure"
echo "=================================================="

cd ~/fyp_system/backend

echo ""
echo "1️⃣ Check if @nestjs/cli is installed..."
npm list @nestjs/cli

echo ""
echo "2️⃣ Check if typescript is installed..."
npm list typescript

echo ""
echo "3️⃣ Check tsconfig.json..."
cat tsconfig.json

echo ""
echo "4️⃣ Check nest-cli.json..."
cat nest-cli.json

echo ""
echo "5️⃣ Try building with VERBOSE output..."
npm run build -- --verbose 2>&1

echo ""
echo "6️⃣ If that didn't work, try direct nest build..."
npx nest build 2>&1

echo ""
echo "7️⃣ Check what's in backend directory..."
ls -la ~/fyp_system/backend/

echo ""
echo "8️⃣ Final check - does dist exist now?"
if [ -d ~/fyp_system/backend/dist ]; then
    echo "✅ dist exists!"
    ls -la ~/fyp_system/backend/dist/
else
    echo "❌ dist still doesn't exist"
fi
