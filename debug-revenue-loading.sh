#!/bin/bash

# Debug Script for Revenue Page Loading Issue

echo "=========================================="
echo "🔍 Debugging Revenue Page Loading Issue"
echo "=========================================="
echo ""

# Check if on EC2
if [ -d "/home/ubuntu/fyp_system" ]; then
    cd /home/ubuntu/fyp_system
    echo "✅ Running on EC2"
else
    echo "❌ Not on EC2, run this script on the server"
    exit 1
fi

echo ""
echo "=== 1. PM2 Status ==="
pm2 status

echo ""
echo "=== 2. Backend Logs (Last 50 lines) ==="
pm2 logs backend --lines 50 --nostream

echo ""
echo "=== 3. Frontend Logs (Last 30 lines) ==="
pm2 logs frontend --lines 30 --nostream

echo ""
echo "=== 4. Check if audit_logs table exists ==="
sudo -u postgres psql -d fyp_db -c "\d audit_logs" 2>&1 | head -20

echo ""
echo "=== 5. Test backend API directly ==="
echo "Testing /revenue endpoint..."
curl -I http://localhost:3000/revenue 2>&1 | head -10

echo ""
echo "=== 6. Check if AuditService is causing issues ==="
echo "Searching for audit-related errors in logs..."
pm2 logs backend --lines 200 --nostream | grep -i "audit\|error" | tail -20

echo ""
echo "=== 7. Check TypeORM connection ==="
sudo -u postgres psql -d fyp_db -c "SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;" | grep -E "audit|revenue|users"

echo ""
echo "=========================================="
echo "Debug Complete"
echo "=========================================="
