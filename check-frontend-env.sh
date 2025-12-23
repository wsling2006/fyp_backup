#!/bin/bash

# CHECK FRONTEND ENV ON EC2
# This script checks for environment variable issues on the EC2 server

set -e

echo "=========================================="
echo "CHECKING FRONTEND ENVIRONMENT ON EC2"
echo "=========================================="
echo ""

cd /home/ubuntu/fyp_system/frontend

echo "1. Checking for .env files..."
ls -la | grep "\.env"
echo ""

echo "2. Content of .env.local (if exists):"
if [ -f ".env.local" ]; then
    cat .env.local
else
    echo "❌ .env.local does NOT exist"
fi
echo ""

echo "3. Content of .env (if exists):"
if [ -f ".env" ]; then
    cat .env
else
    echo "✅ .env does NOT exist (good, using .env.local)"
fi
echo ""

echo "4. Content of .env.production (if exists):"
if [ -f ".env.production" ]; then
    cat .env.production
else
    echo "✅ .env.production does NOT exist"
fi
echo ""

echo "5. Check Next.js build environment:"
if [ -d ".next" ]; then
    echo "✅ .next directory exists"
    echo ""
    echo "Build info:"
    cat .next/BUILD_ID 2>/dev/null || echo "No BUILD_ID found"
else
    echo "❌ .next directory does NOT exist - frontend not built!"
fi
echo ""

echo "6. Check PM2 environment variables:"
pm2 show fyp-frontend | grep -A 20 "env:"
echo ""

echo "=========================================="
echo "NEXT STEPS:"
echo "=========================================="
echo "1. If .env.local has wrong API URL, fix it"
echo "2. If .env.local is missing, create it with:"
echo "   NEXT_PUBLIC_API_BASE=/api"
echo "   BACKEND_URL=http://localhost:3000"
echo "3. Rebuild frontend: npm run build"
echo "4. Restart: pm2 restart fyp-frontend"
echo ""
