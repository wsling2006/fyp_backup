#!/bin/bash

# 🔍 Login 404 Error Diagnostic Script
# Run this on your EC2 instance to diagnose the "Cannot POST /api/auth/login" error

echo "=================================================="
echo "🔍 EC2 Login 404 Error Diagnostic"
echo "=================================================="
echo ""

# 1. Check if backend is running
echo "1️⃣ Checking if backend is running on port 3000..."
if sudo lsof -i :3000 > /dev/null 2>&1; then
    echo "✅ Backend is running on port 3000"
    sudo lsof -i :3000 | grep LISTEN
else
    echo "❌ Backend is NOT running on port 3000"
    echo "   Action: Start backend with 'pm2 start ecosystem.config.js'"
fi
echo ""

# 2. Check if frontend is running
echo "2️⃣ Checking if frontend is running on port 3001..."
if sudo lsof -i :3001 > /dev/null 2>&1; then
    echo "✅ Frontend is running on port 3001"
    sudo lsof -i :3001 | grep LISTEN
else
    echo "❌ Frontend is NOT running on port 3001"
    echo "   Action: Start frontend with 'pm2 start ecosystem.config.js'"
fi
echo ""

# 3. Check PM2 process status
echo "3️⃣ Checking PM2 process status..."
pm2 list
echo ""

# 4. Test backend health directly
echo "4️⃣ Testing backend health (localhost:3000)..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 > /tmp/backend_health 2>&1; then
    HTTP_CODE=$(cat /tmp/backend_health)
    if [ "$HTTP_CODE" -eq "200" ] || [ "$HTTP_CODE" -eq "404" ]; then
        echo "✅ Backend is responding (HTTP $HTTP_CODE)"
    else
        echo "⚠️  Backend responded with unexpected code: HTTP $HTTP_CODE"
    fi
else
    echo "❌ Backend is not responding"
fi
echo ""

# 5. Test auth/login endpoint directly
echo "5️⃣ Testing /auth/login endpoint directly..."
BACKEND_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -w "\nHTTP_CODE:%{http_code}" 2>&1)

HTTP_CODE=$(echo "$BACKEND_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$BACKEND_RESPONSE" | grep -v "HTTP_CODE")

if [ -n "$HTTP_CODE" ]; then
    if [ "$HTTP_CODE" -eq "404" ]; then
        echo "❌ Backend returned 404 - Route /auth/login does NOT exist"
        echo "   This means the AuthController is not registered or backend is not running"
    elif [ "$HTTP_CODE" -eq "401" ] || [ "$HTTP_CODE" -eq "400" ]; then
        echo "✅ Backend route EXISTS (HTTP $HTTP_CODE - invalid credentials is expected)"
        echo "   Response: $BODY"
    elif [ "$HTTP_CODE" -eq "201" ] || [ "$HTTP_CODE" -eq "200" ]; then
        echo "✅ Backend route EXISTS and accepted test credentials (HTTP $HTTP_CODE)"
        echo "   Response: $BODY"
    else
        echo "⚠️  Backend returned HTTP $HTTP_CODE"
        echo "   Response: $BODY"
    fi
else
    echo "❌ Could not connect to backend"
fi
echo ""

# 6. Test through Next.js proxy
echo "6️⃣ Testing /api/auth/login through Next.js proxy..."
PROXY_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}' \
  -w "\nHTTP_CODE:%{http_code}" 2>&1)

HTTP_CODE=$(echo "$PROXY_RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$PROXY_RESPONSE" | grep -v "HTTP_CODE")

if [ -n "$HTTP_CODE" ]; then
    if [ "$HTTP_CODE" -eq "404" ]; then
        echo "❌ Proxy returned 404 - Either Next.js proxy is broken or backend route doesn't exist"
        echo "   Response: $BODY"
    elif [ "$HTTP_CODE" -eq "401" ] || [ "$HTTP_CODE" -eq "400" ]; then
        echo "✅ Proxy is working (HTTP $HTTP_CODE - invalid credentials is expected)"
        echo "   Response: $BODY"
    elif [ "$HTTP_CODE" -eq "201" ] || [ "$HTTP_CODE" -eq "200" ]; then
        echo "✅ Proxy is working and accepted test credentials (HTTP $HTTP_CODE)"
        echo "   Response: $BODY"
    else
        echo "⚠️  Proxy returned HTTP $HTTP_CODE"
        echo "   Response: $BODY"
    fi
else
    echo "❌ Could not connect to Next.js frontend"
fi
echo ""

# 7. Check backend logs for errors
echo "7️⃣ Recent backend logs (last 20 lines)..."
pm2 logs backend --lines 20 --nostream
echo ""

# 8. Check frontend logs for errors
echo "8️⃣ Recent frontend logs (last 20 lines)..."
pm2 logs frontend --lines 20 --nostream
echo ""

echo "=================================================="
echo "🎯 DIAGNOSIS COMPLETE"
echo "=================================================="
echo ""
echo "📋 Common Solutions:"
echo ""
echo "If backend is not running:"
echo "  cd ~/fyp_system/backend && pm2 restart backend"
echo ""
echo "If backend route doesn't exist (404 on direct test):"
echo "  cd ~/fyp_system/backend && npm run build && pm2 restart backend"
echo ""
echo "If proxy returns 404 but direct backend works:"
echo "  cd ~/fyp_system/frontend && pm2 restart frontend"
echo ""
echo "If both are running but still 404:"
echo "  pm2 restart all && pm2 logs --lines 50"
echo ""
