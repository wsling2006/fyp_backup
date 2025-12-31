#!/bin/bash
# Complete Backend Diagnosis for Purchase Request Error
# Run this on EC2

echo "=========================================="
echo "Complete Backend Error Diagnosis"
echo "=========================================="
echo ""

echo "1. Checking Backend Error Logs..."
echo "-----------------------------------"
pm2 logs backend --err --lines 50 --nostream

echo ""
echo "2. Checking Backend Output Logs..."
echo "-----------------------------------"
pm2 logs backend --out --lines 50 --nostream

echo ""
echo "3. Testing Purchase Requests API Endpoint..."
echo "-----------------------------------"

# First, get a token by logging in
echo "Getting auth token..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}')

echo "Login response:"
echo "$TOKEN_RESPONSE" | jq '.' 2>/dev/null || echo "$TOKEN_RESPONSE"

# Extract token (if jq is available)
TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.accessToken' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
    echo ""
    echo "Token obtained successfully!"
    echo ""
    echo "Testing GET /purchase-requests..."
    curl -s http://localhost:3000/purchase-requests \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Error calling API"
else
    echo "Failed to get token - check admin credentials in .env"
fi

echo ""
echo ""
echo "4. Checking Database Tables..."
echo "-----------------------------------"
cd ~/fyp_system/backend
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "\dt" 2>&1

echo ""
echo "5. Checking purchase_requests table structure..."
echo "-----------------------------------"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "\d purchase_requests" 2>&1

echo ""
echo "6. Checking claims table structure..."
echo "-----------------------------------"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "\d claims" 2>&1

echo ""
echo "7. Checking users table..."
echo "-----------------------------------"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "SELECT id, email, role, is_active FROM users;" 2>&1

echo ""
echo "8. Checking for purchase requests..."
echo "-----------------------------------"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "SELECT COUNT(*) as total_purchase_requests FROM purchase_requests;" 2>&1

echo ""
echo "9. Checking migrations..."
echo "-----------------------------------"
PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -c "SELECT * FROM migrations ORDER BY timestamp DESC LIMIT 10;" 2>&1

echo ""
echo "=========================================="
echo "Diagnosis Complete"
echo "=========================================="
echo ""
echo "Look for:"
echo "- Error messages in backend logs"
echo "- Missing tables or columns"
echo "- Database connection errors"
echo "- JWT token issues"
echo ""
