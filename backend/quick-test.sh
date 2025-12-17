#!/bin/bash

echo "=== Step 1: Login as Super Admin ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "leejingwei123@gmail.com",
    "password": "ctxd dlkq khkx kpwk"
  }')

echo "$LOGIN_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$LOGIN_RESPONSE"

# Extract access token
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo ""
  echo "❌ Failed to get access token!"
  echo "Make sure your server is running on http://localhost:3000"
  exit 1
fi

echo ""
echo "✅ Access Token obtained!"
echo ""
echo "=== Step 2: Create a new user ==="

# Create user with unique email
TIMESTAMP=$(date +%s)
NEW_EMAIL="testuser${TIMESTAMP}@example.com"

CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/users/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"email\": \"$NEW_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"accountant\"
  }")

echo "$CREATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$CREATE_RESPONSE"

if echo "$CREATE_RESPONSE" | grep -q "successfully"; then
  echo ""
  echo "✅ User created successfully!"
  echo "   Email: $NEW_EMAIL"
else
  echo ""
  echo "❌ Failed to create user"
fi

