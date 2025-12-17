#!/bin/bash

echo "=== Debugging User Creation ==="
echo ""

# Step 1: Test Login
echo "Step 1: Testing login..."
LOGIN_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "leejingwei123@gmail.com",
    "password": "ctxd dlkq khkx kpwk"
  }')

HTTP_CODE=$(echo "$LOGIN_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$LOGIN_RESPONSE" | grep -v "HTTP_CODE:")

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"
echo ""

if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
  echo "❌ Login failed!"
  exit 1
fi

# Extract access token
ACCESS_TOKEN=$(echo "$BODY" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Could not extract access_token from response"
  echo "Full response: $BODY"
  exit 1
fi

echo "✅ Access Token obtained: ${ACCESS_TOKEN:0:50}..."
echo ""

# Step 2: Test Token Validity (decode to check)
echo "Step 2: Decoding token (first part)..."
echo "$ACCESS_TOKEN" | cut -d'.' -f1 | base64 -d 2>/dev/null | python3 -m json.tool 2>/dev/null || echo "Could not decode"
echo ""

# Step 3: Test Create User
echo "Step 3: Testing user creation with token..."
TIMESTAMP=$(date +%s)
NEW_EMAIL="testuser${TIMESTAMP}@example.com"

echo "Creating user: $NEW_EMAIL"
echo "Using token: ${ACCESS_TOKEN:0:30}..."
echo ""

CREATE_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST http://localhost:3000/users/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"email\": \"$NEW_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"accountant\"
  }")

HTTP_CODE=$(echo "$CREATE_RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
BODY=$(echo "$CREATE_RESPONSE" | grep -v "HTTP_CODE:")

echo "HTTP Status: $HTTP_CODE"
echo "Response: $BODY"

if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "201" ]; then
  echo ""
  echo "✅ SUCCESS! User created!"
elif [ "$HTTP_CODE" == "401" ]; then
  echo ""
  echo "❌ 401 Unauthorized - Token authentication failed"
  echo ""
  echo "Troubleshooting:"
  echo "1. Make sure you restarted your server after adding JWT strategy"
  echo "2. Check server logs for error messages"
  echo "3. Verify the token is being sent correctly"
else
  echo ""
  echo "❌ Request failed with status $HTTP_CODE"
fi

