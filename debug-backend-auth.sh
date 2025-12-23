#!/bin/bash

# BACKEND AUTHENTICATION DEBUG
# Run this on EC2 to check backend JWT validation

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  BACKEND AUTHENTICATION DEBUG                             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd /home/ubuntu/fyp_system/backend

echo -e "${YELLOW}1. Checking .env file...${NC}"
if [ -f ".env" ]; then
  echo -e "${GREEN}✅ .env exists${NC}"
  echo "JWT_SECRET length:"
  grep JWT_SECRET .env | cut -d= -f2 | wc -c
  echo ""
  echo "Environment variables:"
  grep -E "JWT_SECRET|DATABASE_URL|PORT" .env | sed 's/=.*/=***HIDDEN***/'
else
  echo -e "${RED}❌ .env file NOT FOUND!${NC}"
  echo "This will cause JWT validation to fail!"
fi
echo ""

echo -e "${YELLOW}2. Checking database connection...${NC}"
sudo -u postgres psql -d fyp_db -c "SELECT COUNT(*) as user_count, string_agg(DISTINCT role::text, ', ') as roles FROM users;" 2>/dev/null
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Database accessible${NC}"
else
  echo -e "${RED}❌ Cannot connect to database${NC}"
fi
echo ""

echo -e "${YELLOW}3. Checking user roles in database...${NC}"
echo "All users with sales_department role:"
sudo -u postgres psql -d fyp_db -c "SELECT id, email, role, is_active, suspended FROM users WHERE role = 'sales_department';" 2>/dev/null
echo ""

echo -e "${YELLOW}4. Checking JWT strategy file...${NC}"
if [ -f "src/auth/jwt.strategy.ts" ]; then
  echo -e "${GREEN}✅ jwt.strategy.ts exists${NC}"
  echo "Checking JWT secret configuration:"
  grep -A 2 "secretOrKey" src/auth/jwt.strategy.ts
else
  echo -e "${RED}❌ jwt.strategy.ts NOT FOUND${NC}"
fi
echo ""

echo -e "${YELLOW}5. Checking roles guard...${NC}"
if [ -f "src/auth/roles.guard.ts" ]; then
  echo -e "${GREEN}✅ roles.guard.ts exists${NC}"
  echo "Checking guard logic:"
  grep -A 5 "canActivate" src/auth/roles.guard.ts | head -10
else
  echo -e "${RED}❌ roles.guard.ts NOT FOUND${NC}"
fi
echo ""

echo -e "${YELLOW}6. Checking roles enum...${NC}"
if [ -f "src/users/roles.enum.ts" ]; then
  echo -e "${GREEN}✅ roles.enum.ts exists${NC}"
  cat src/users/roles.enum.ts
else
  echo -e "${RED}❌ roles.enum.ts NOT FOUND${NC}"
fi
echo ""

echo -e "${YELLOW}7. Checking backend logs for auth errors...${NC}"
echo "Recent auth-related errors:"
pm2 logs backend --lines 100 --nostream | grep -iE "jwt|auth|403|forbidden|unauthorized" | tail -20
echo ""

echo -e "${YELLOW}8. Testing backend directly (bypass proxy)...${NC}"
echo "Getting test token..."

# Try to login directly to backend
TEST_EMAIL="leejwei004@gmail.com"  # Use the email from your error logs
TEST_PASS="Test123!@#"  # You'll need to provide the correct password

echo "Attempting login to get token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${TEST_EMAIL}\",\"password\":\"${TEST_PASS}\"}")

echo "Login response:"
echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
echo ""

# Extract token if login successful
TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token' 2>/dev/null)

if [ "$TOKEN" != "null" ] && [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✅ Got access token${NC}"
  echo "Token (first 50 chars): ${TOKEN:0:50}..."
  echo ""
  
  echo "Testing purchase-requests endpoint with token..."
  PR_RESPONSE=$(curl -s -X GET http://localhost:3000/purchase-requests \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  echo "Purchase requests response:"
  echo "$PR_RESPONSE" | jq '.' 2>/dev/null || echo "$PR_RESPONSE"
  
  if echo "$PR_RESPONSE" | grep -q "403\|Forbidden"; then
    echo -e "${RED}❌ STILL GETTING 403 ERROR!${NC}"
    echo "This means the backend is rejecting the token"
  elif echo "$PR_RESPONSE" | grep -q "401\|Unauthorized"; then
    echo -e "${RED}❌ GETTING 401 ERROR${NC}"
    echo "Token is not being validated"
  else
    echo -e "${GREEN}✅ Request successful!${NC}"
  fi
else
  echo -e "${RED}❌ Failed to get token - check credentials${NC}"
  echo "Try logging in manually and get the token from browser"
fi
echo ""

echo -e "${YELLOW}9. Checking if backend is actually running...${NC}"
if pm2 list | grep -q "backend.*online"; then
  echo -e "${GREEN}✅ Backend is online${NC}"
  pm2 describe backend | grep -E "status|restart|uptime"
else
  echo -e "${RED}❌ Backend is NOT running!${NC}"
  pm2 list
fi
echo ""

echo "╔═══════════════════════════════════════════════════════════╗"
echo "║  SUMMARY                                                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "If you see 403 errors above, common causes:"
echo "1. JWT_SECRET mismatch between .env and what was used to create token"
echo "2. User role in database doesn't match Role enum"
echo "3. JwtAuthGuard or RolesGuard not properly configured"
echo "4. Token expired"
echo ""
echo "NEXT STEPS:"
echo "1. Check the output above for any ❌ errors"
echo "2. If JWT_SECRET is wrong, restart backend after fixing"
echo "3. If user role is wrong, update database"
echo "4. Share this output if problem persists"
echo ""
