#!/bin/bash

# Backend JWT Verification Script
# Run this on EC2 server

echo "==================================="
echo "BACKEND JWT VERIFICATION SCRIPT"
echo "==================================="
echo ""

echo "STEP 1: Check Backend Environment"
echo "-----------------------------------"
if [ -f backend/.env ]; then
  echo "✅ .env file exists"
  
  # Check JWT secret (don't print full value for security)
  JWT_SECRET=$(grep JWT_SECRET backend/.env | cut -d= -f2)
  if [ -n "$JWT_SECRET" ]; then
    echo "✅ JWT_SECRET is set (length: ${#JWT_SECRET} characters)"
  else
    echo "❌ JWT_SECRET is NOT set"
  fi
  
  # Check email settings
  EMAIL_USER=$(grep EMAIL_USER backend/.env | cut -d= -f2)
  EMAIL_PASS=$(grep EMAIL_PASS backend/.env | cut -d= -f2)
  if [ -n "$EMAIL_USER" ] && [ -n "$EMAIL_PASS" ]; then
    echo "✅ Email settings configured: $EMAIL_USER"
  else
    echo "❌ Email settings NOT configured"
  fi
else
  echo "❌ .env file NOT found"
fi

echo ""
echo "STEP 2: Check Backend Build"
echo "-----------------------------------"
if [ -d backend/dist ]; then
  echo "✅ Backend build exists"
  echo "Build date: $(stat -c %y backend/dist 2>/dev/null || stat -f %Sm backend/dist)"
else
  echo "❌ Backend build NOT found"
fi

echo ""
echo "STEP 3: Check PM2 Status"
echo "-----------------------------------"
pm2 list | grep -E "backend|frontend"

echo ""
echo "STEP 4: Check Backend Logs (Last 20 lines)"
echo "-----------------------------------"
pm2 logs backend --lines 20 --nostream

echo ""
echo "STEP 5: Check Database Connection"
echo "-----------------------------------"
if command -v psql &> /dev/null; then
  # Check if we can connect to database
  sudo -u postgres psql -d fyp_db -c "SELECT COUNT(*) as user_count FROM users;" 2>/dev/null && echo "✅ Database connection OK" || echo "❌ Cannot connect to database"
else
  echo "⚠️  psql not available on this machine"
fi

echo ""
echo "STEP 6: Test Backend API (Direct)"
echo "-----------------------------------"
echo "Testing login endpoint..."
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"wrong"}' \
  | jq '.' 2>/dev/null || echo "⚠️  jq not installed, showing raw response"

echo ""
echo "STEP 7: Check User Roles in Database"
echo "-----------------------------------"
if command -v psql &> /dev/null; then
  echo "All users and their roles:"
  sudo -u postgres psql -d fyp_db -c "SELECT email, role, is_active, suspended FROM users ORDER BY email;" 2>/dev/null
else
  echo "⚠️  Cannot query database - psql not available"
fi

echo ""
echo "==================================="
echo "QUICK FIXES"
echo "==================================="
echo ""
echo "Fix 1: Rebuild Backend"
echo "  cd backend && npm run build"
echo ""
echo "Fix 2: Restart Services"
echo "  pm2 restart ecosystem.config.js"
echo ""
echo "Fix 3: View Real-Time Logs"
echo "  pm2 logs backend"
echo ""
echo "Fix 4: Check Specific User Role"
echo "  sudo -u postgres psql -d fyp_db -c \"SELECT * FROM users WHERE email='sales@test.com';\""
echo ""
echo "Fix 5: Update User Role (if wrong)"
echo "  sudo -u postgres psql -d fyp_db -c \"UPDATE users SET role='sales_department' WHERE email='sales@test.com';\""
echo ""
