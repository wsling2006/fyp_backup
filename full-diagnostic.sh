#!/bin/bash

# COMPLETE SYSTEM DIAGNOSTIC
# This will show me EXACTLY what's happening

echo "=================================================="
echo "🔍 COMPLETE SYSTEM DIAGNOSTIC"
echo "=================================================="

echo ""
echo "========== 1. CHECK WHAT'S RUNNING =========="
pm2 status
pm2 logs frontend --lines 5 --nostream
pm2 logs backend --lines 5 --nostream

echo ""
echo "========== 2. CHECK FRONTEND BUILD =========="
echo "Frontend build directory:"
ls -la ~/fyp_system/frontend/.next/standalone/

echo ""
echo "Check if purchase-requests page was built:"
find ~/fyp_system/frontend/.next -name "*purchase-requests*" -type f | head -5

echo ""
echo "========== 3. TEST API DIRECTLY =========="
echo "Get a sales user token and test API..."
SALES_USER_ID=$(sudo -u postgres psql fyp_db -t -c "SELECT id FROM users WHERE email = 'leejwei004@gmail.com';")
echo "Sales user ID: $SALES_USER_ID"

echo ""
echo "Get purchase requests from API:"
curl -s http://localhost:3000/api/purchase-requests \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"leejwei004@gmail.com","password":"password123"}' | jq -r '.access_token')" \
  | jq '.[] | select(.title | contains("TEST")) | {id, title, status, created_by_user_id}'

echo ""
echo "========== 4. CHECK DATABASE =========="
sudo -u postgres psql fyp_db -c "
SELECT 
  pr.id, 
  pr.title, 
  pr.status, 
  pr.created_by_user_id,
  u.email as creator_email
FROM purchase_requests pr
JOIN users u ON pr.created_by_user_id = u.id
WHERE pr.title LIKE 'TEST%'
ORDER BY pr.created_at DESC;
"

echo ""
echo "========== 5. CHECK FRONTEND SOURCE =========="
echo "Search for canEditRequest in built frontend:"
grep -r "canEditRequest" ~/fyp_system/frontend/.next/ 2>/dev/null | head -3

echo ""
echo "========== 6. VERIFY GIT STATUS =========="
cd ~/fyp_system
git log --oneline -5
echo ""
echo "Current branch:"
git branch

echo ""
echo "=================================================="
echo "📊 DIAGNOSTIC COMPLETE"
echo "=================================================="
