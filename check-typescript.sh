#!/bin/bash

# Check for TypeScript compilation errors

cd ~/fyp_system/backend

echo "=================================================="
echo "🔍 Checking TypeScript Compilation"
echo "=================================================="

echo ""
echo "1️⃣ Running TypeScript compiler directly..."
npx tsc --noEmit 2>&1 | head -100

echo ""
echo "2️⃣ Checking if tsconfig.build.json exists..."
if [ -f tsconfig.build.json ]; then
    echo "✅ tsconfig.build.json exists"
    cat tsconfig.build.json
else
    echo "❌ tsconfig.build.json missing"
fi

echo ""
echo "3️⃣ Running nest build with info..."
npx nest build --webpack false 2>&1

echo ""
echo "4️⃣ Checking for dist folder..."
ls -la | grep dist

echo ""
echo "5️⃣ If dist exists, show contents..."
if [ -d dist ]; then
    ls -la dist/
fi
