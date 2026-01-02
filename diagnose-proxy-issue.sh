#!/bin/bash

# 🔍 Diagnose Next.js Proxy Issue
# Backend works, but browser gets 404 through proxy

echo "=================================================="
echo "🔍 Next.js Proxy Diagnostic"
echo "=================================================="
echo ""

echo "✅ Backend is working (you tested: 401 response)"
echo "❌ Frontend proxy is returning 404"
echo ""

echo "1️⃣ Testing frontend directly on port 3001..."
curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test","password":"test"}' | head -20
echo ""

echo "2️⃣ Checking if you're using Nginx..."
if command -v nginx &> /dev/null; then
    echo "✅ Nginx is installed"
    sudo nginx -t 2>&1
    echo ""
    echo "Nginx config:"
    if [ -f /etc/nginx/sites-enabled/default ]; then
        cat /etc/nginx/sites-enabled/default
    elif [ -f /etc/nginx/nginx.conf ]; then
        grep -A 20 "server {" /etc/nginx/nginx.conf
    fi
else
    echo "⚠️  Nginx is not installed"
fi
echo ""

echo "3️⃣ Checking what's running on port 80..."
sudo lsof -i :80 2>&1
echo ""

echo "4️⃣ How are you accessing the site?"
echo "Browser URL: http://13.251.103.187/api/auth/login"
echo "             ^^^^^^^^^^^^^^^^^^^^^^^^"
echo "             No port = port 80 (default HTTP)"
echo ""
echo "This means:"
echo "- You have Nginx on port 80"
echo "- Nginx is NOT proxying /api/* to Next.js"
echo "- Or Nginx is not configured at all"
echo ""

echo "=================================================="
echo "🎯 SOLUTION"
echo "=================================================="
echo ""
echo "Option 1: Access with port 3001 in browser"
echo "  http://13.251.103.187:3001"
echo ""
echo "Option 2: Configure Nginx to proxy to Next.js"
echo "  See: FIX_NGINX_PROXY.md (I'll create this next)"
echo ""
