#!/bin/bash
# Diagnose Purchase Request Page Internal Error
# Run this on EC2 server

echo "=========================================="
echo "Purchase Request Page Error Diagnosis"
echo "=========================================="
echo ""

echo "1. Checking PM2 Status..."
pm2 list

echo ""
echo "2. Checking Backend Logs (last 30 lines)..."
pm2 logs backend --lines 30 --nostream

echo ""
echo "3. Checking Frontend Logs (last 30 lines)..."
pm2 logs frontend --lines 30 --nostream

echo ""
echo "4. Testing Backend API Endpoints..."
echo "Testing login endpoint..."
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | head -5

echo ""
echo ""
echo "Testing purchase-requests endpoint (health check)..."
curl -s http://localhost:3000/purchase-requests 2>&1 | head -5

echo ""
echo ""
echo "5. Checking Database Connection..."
cd ~/fyp_system/backend
psql -U fyp_user -d fyp_db -c "SELECT 1 AS connection_test;" 2>&1

echo ""
echo "6. Checking Database Tables..."
psql -U fyp_user -d fyp_db -c "\dt" 2>&1 | head -20

echo ""
echo "7. Checking purchase_requests table structure..."
psql -U fyp_user -d fyp_db -c "\d purchase_requests" 2>&1

echo ""
echo "8. Checking users table..."
psql -U fyp_user -d fyp_db -c "SELECT id, email, role, is_active FROM users LIMIT 5;" 2>&1

echo ""
echo "9. Network connectivity test..."
netstat -tuln | grep -E ':(3000|3001|5432)'

echo ""
echo "=========================================="
echo "Diagnosis Complete"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Review the logs above for error messages"
echo "2. Check if purchase_requests table exists"
echo "3. Verify database relationships are correct"
echo ""
