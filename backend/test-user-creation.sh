#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Testing User Creation Endpoint...${NC}\n"

# Step 1: Login as Super Admin
echo -e "${YELLOW}Step 1: Logging in as Super Admin...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "leejingwei123@gmail.com",
    "password": "ctxd dlkq khkx kpwk"
  }')

echo "Login Response: $LOGIN_RESPONSE"

# Extract access token (basic extraction, may need adjustment based on response format)
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$ACCESS_TOKEN" ]; then
  echo -e "${RED}Failed to get access token. Please check if the server is running and the credentials are correct.${NC}"
  exit 1
fi

echo -e "${GREEN}Access Token obtained!${NC}\n"
echo "Token: ${ACCESS_TOKEN:0:50}..."

# Step 2: Create a new user
echo -e "\n${YELLOW}Step 2: Creating a new user...${NC}"
NEW_USER_EMAIL="testuser$(date +%s)@example.com"  # Unique email with timestamp

CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/users/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "{
    \"email\": \"$NEW_USER_EMAIL\",
    \"password\": \"password123\",
    \"role\": \"accountant\"
  }")

echo "Create User Response: $CREATE_RESPONSE"

# Check if user was created successfully
if echo "$CREATE_RESPONSE" | grep -q "successfully"; then
  echo -e "\n${GREEN}✓ User created successfully!${NC}"
  echo -e "Email: $NEW_USER_EMAIL"
  echo -e "Role: accountant"
else
  echo -e "\n${RED}✗ Failed to create user${NC}"
  echo "Response: $CREATE_RESPONSE"
fi

echo -e "\n${YELLOW}Test completed!${NC}"

