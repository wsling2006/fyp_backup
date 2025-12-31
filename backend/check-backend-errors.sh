#!/bin/bash

# Check why backend is failing
echo "============================================"
echo "BACKEND ERROR DIAGNOSIS"
echo "============================================"
echo ""

echo "1. PM2 Status:"
echo "=============="
pm2 status

echo ""
echo ""

echo "2. Backend Logs (last 50 lines):"
echo "================================="
pm2 logs backend --lines 50 --nostream

echo ""
echo ""

echo "3. Backend Error Logs:"
echo "======================"
pm2 logs backend --err --lines 30 --nostream

echo ""
echo ""

echo "4. Check if port is already in use:"
echo "===================================="
sudo netstat -tlnp | grep :3000 || echo "Port 3000 is free"

echo ""
echo ""

echo "5. Try starting backend manually to see errors:"
echo "================================================"
cd ~/fyp_system/backend
echo "Running: node dist/main.js"
echo ""
timeout 5s node dist/main.js 2>&1 || echo ""

echo ""
echo "============================================"
echo "ANALYSIS"
echo "============================================"
echo ""
echo "Look for error messages above. Common issues:"
echo ""
echo "• Database connection error → Check .env credentials"
echo "• Port already in use → Kill process on port 3000"
echo "• Module not found → Run: npm install && npm run build"
echo "• TypeORM error → Check migrations or entity files"
echo ""
