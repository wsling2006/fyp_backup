#!/bin/bash

# EC2 Diagnostic Script - Check Frontend Structure
# Run this on EC2 to diagnose module resolution issues

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  FRONTEND STRUCTURE DIAGNOSTIC                            ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

cd /home/ubuntu/fyp_system/frontend

echo "1. Checking tsconfig.json..."
if [ -f "tsconfig.json" ]; then
  echo "✅ tsconfig.json exists"
  echo "Path aliases:"
  grep -A 3 '"paths"' tsconfig.json
else
  echo "❌ tsconfig.json NOT FOUND"
fi
echo ""

echo "2. Checking critical directories..."
for dir in "context" "lib" "components/ui" "app"; do
  if [ -d "$dir" ]; then
    echo "✅ $dir/ exists"
  else
    echo "❌ $dir/ MISSING"
  fi
done
echo ""

echo "3. Checking critical files..."
for file in "context/AuthContext.tsx" "lib/api.ts" "lib/auth.ts" "components/ui/Button.tsx" "components/ui/Input.tsx"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file MISSING"
  fi
done
echo ""

echo "4. Checking package.json..."
if [ -f "package.json" ]; then
  echo "✅ package.json exists"
  echo "Next.js version:"
  grep '"next":' package.json
else
  echo "❌ package.json NOT FOUND"
fi
echo ""

echo "5. Checking node_modules..."
if [ -d "node_modules" ]; then
  echo "✅ node_modules exists"
  if [ -d "node_modules/next" ]; then
    echo "✅ Next.js installed"
  else
    echo "❌ Next.js NOT installed"
  fi
else
  echo "❌ node_modules NOT FOUND"
fi
echo ""

echo "6. Current directory structure:"
ls -la
echo ""

echo "7. Full context/ directory:"
ls -la context/ 2>/dev/null || echo "context/ directory not found"
echo ""

echo "8. Full lib/ directory:"
ls -la lib/ 2>/dev/null || echo "lib/ directory not found"
echo ""

echo "9. Full components/ directory:"
ls -la components/ 2>/dev/null || echo "components/ directory not found"
echo ""

echo "10. Checking .next build folder:"
if [ -d ".next" ]; then
  echo "✅ .next exists (previous build found)"
  echo "Build date:"
  ls -ld .next/
else
  echo "ℹ️  No .next folder (clean state)"
fi
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  DIAGNOSTIC COMPLETE                                      ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "If files are missing, run:"
echo "  git reset --hard origin/main"
echo "  git pull origin main"
echo ""
