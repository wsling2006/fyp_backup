#!/bin/bash

# HR Module Backend Testing Script
# Tests all HR endpoints with proper authentication

echo "🧪 HR MODULE BACKEND TESTING"
echo "=============================="
echo ""

# Configuration
API_BASE="http://localhost:3000"
JWT_TOKEN="" # Will be set after login

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Helper function to print test result
test_result() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ PASSED${NC}: $2"
    ((PASSED++))
  else
    echo -e "${RED}❌ FAILED${NC}: $2"
    ((FAILED++))
  fi
  echo ""
}

# Step 1: Login as HR user
echo "📝 Step 1: Login as HR user"
echo "=============================="
read -p "Enter HR user email: " HR_EMAIL
read -sp "Enter HR user password: " HR_PASSWORD
echo ""

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$HR_EMAIL\", \"password\": \"$HR_PASSWORD\"}")

echo "Login response: $LOGIN_RESPONSE"

# Check if OTP is required
REQUIRES_OTP=$(echo "$LOGIN_RESPONSE" | grep -o '"requiresOtp":true' || echo "")

if [ ! -z "$REQUIRES_OTP" ]; then
  echo ""
  echo "🔐 MFA Required"
  read -p "Enter OTP from your email: " OTP_CODE
  
  # Verify OTP
  OTP_RESPONSE=$(curl -s -X POST "$API_BASE/auth/verify-otp" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$HR_EMAIL\", \"otp\": \"$OTP_CODE\"}")
  
  echo "OTP verification response: $OTP_RESPONSE"
  JWT_TOKEN=$(echo "$OTP_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
else
  JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}❌ Authentication failed. Exiting.${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Authentication successful${NC}"
echo "JWT Token: ${JWT_TOKEN:0:20}..."
echo ""
sleep 2

# Step 2: Test Employee List
echo "📝 Step 2: Test Employee List"
echo "=============================="
LIST_RESPONSE=$(curl -s -X GET "$API_BASE/hr/employees" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Response: $LIST_RESPONSE"

# Check if response contains employees array
if echo "$LIST_RESPONSE" | grep -q '"employees"'; then
  test_result 0 "Get employee list"
else
  test_result 1 "Get employee list"
fi

sleep 1

# Step 3: Test Employee Search
echo "📝 Step 3: Test Employee Search"
echo "=============================="
read -p "Enter search query (employee name or ID): " SEARCH_QUERY

SEARCH_RESPONSE=$(curl -s -X GET "$API_BASE/hr/employees/search?q=$SEARCH_QUERY" \
  -H "Authorization: Bearer $JWT_TOKEN")

echo "Response: $SEARCH_RESPONSE"

if echo "$SEARCH_RESPONSE" | grep -q '"employees"'; then
  test_result 0 "Search employees"
else
  test_result 1 "Search employees"
fi

sleep 1

# Step 4: Test Employee Detail
echo "📝 Step 4: Test Employee Detail"
echo "=============================="
# Extract first employee ID from list
EMPLOYEE_ID=$(echo "$LIST_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$EMPLOYEE_ID" ]; then
  echo -e "${YELLOW}⚠️  No employees found. Skipping detail test.${NC}"
else
  DETAIL_RESPONSE=$(curl -s -X GET "$API_BASE/hr/employees/$EMPLOYEE_ID" \
    -H "Authorization: Bearer $JWT_TOKEN")
  
  echo "Response: $DETAIL_RESPONSE"
  
  # Check if sensitive fields are present
  if echo "$DETAIL_RESPONSE" | grep -q '"ic_number"' && \
     echo "$DETAIL_RESPONSE" | grep -q '"bank_account_number"'; then
    test_result 0 "Get employee detail (with sensitive fields)"
  else
    test_result 1 "Get employee detail (missing sensitive fields)"
  fi
fi

sleep 1

# Step 5: Test Document List
echo "📝 Step 5: Test Employee Documents List"
echo "=============================="
if [ ! -z "$EMPLOYEE_ID" ]; then
  DOCS_RESPONSE=$(curl -s -X GET "$API_BASE/hr/employees/$EMPLOYEE_ID/documents" \
    -H "Authorization: Bearer $JWT_TOKEN")
  
  echo "Response: $DOCS_RESPONSE"
  
  if echo "$DOCS_RESPONSE" | grep -q '"documents"'; then
    test_result 0 "Get employee documents list"
  else
    test_result 1 "Get employee documents list"
  fi
else
  echo -e "${YELLOW}⚠️  No employee ID available. Skipping.${NC}"
fi

sleep 1

# Step 6: Test Document Upload
echo "📝 Step 6: Test Document Upload"
echo "=============================="
read -p "Upload a test document? (y/n): " UPLOAD_TEST

if [ "$UPLOAD_TEST" = "y" ] || [ "$UPLOAD_TEST" = "Y" ]; then
  if [ ! -z "$EMPLOYEE_ID" ]; then
    read -p "Enter path to test file (PDF/Word/Image): " TEST_FILE
    
    if [ -f "$TEST_FILE" ]; then
      echo "Uploading $TEST_FILE..."
      
      UPLOAD_RESPONSE=$(curl -s -X POST "$API_BASE/hr/employees/$EMPLOYEE_ID/documents/upload" \
        -H "Authorization: Bearer $JWT_TOKEN" \
        -F "file=@$TEST_FILE" \
        -F "document_type=OTHER" \
        -F "description=Test document")
      
      echo "Response: $UPLOAD_RESPONSE"
      
      if echo "$UPLOAD_RESPONSE" | grep -q '"success":true'; then
        test_result 0 "Upload document"
        
        # Extract document ID for download test
        DOC_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
      else
        test_result 1 "Upload document"
      fi
    else
      echo -e "${RED}❌ File not found: $TEST_FILE${NC}"
      test_result 1 "Upload document (file not found)"
    fi
  else
    echo -e "${YELLOW}⚠️  No employee ID available. Skipping.${NC}"
  fi
else
  echo "Skipping upload test."
fi

sleep 1

# Step 7: Test Document Download
echo "📝 Step 7: Test Document Download"
echo "=============================="
if [ ! -z "$DOC_ID" ] && [ ! -z "$EMPLOYEE_ID" ]; then
  echo "Downloading document $DOC_ID..."
  
  DOWNLOAD_STATUS=$(curl -s -w "%{http_code}" -o "downloaded_test_file.tmp" \
    "$API_BASE/hr/employees/$EMPLOYEE_ID/documents/$DOC_ID/download" \
    -H "Authorization: Bearer $JWT_TOKEN")
  
  if [ "$DOWNLOAD_STATUS" = "200" ]; then
    test_result 0 "Download document"
    echo "File saved as: downloaded_test_file.tmp"
    rm -f downloaded_test_file.tmp
  else
    test_result 1 "Download document (HTTP $DOWNLOAD_STATUS)"
  fi
else
  echo -e "${YELLOW}⚠️  No document to download. Skipping.${NC}"
fi

sleep 1

# Step 8: Test Unauthorized Access
echo "📝 Step 8: Test Unauthorized Access (Non-HR User)"
echo "=============================="
echo "This test requires a non-HR user account."
read -p "Test unauthorized access? (y/n): " TEST_UNAUTH

if [ "$TEST_UNAUTH" = "y" ] || [ "$TEST_UNAUTH" = "Y" ]; then
  read -p "Enter non-HR user email (e.g., sales): " NONHR_EMAIL
  read -sp "Enter non-HR user password: " NONHR_PASSWORD
  echo ""
  
  # Login as non-HR user
  NONHR_LOGIN=$(curl -s -X POST "$API_BASE/auth/login" \
    -H "Content-Type: application/json" \
    -d "{\"email\": \"$NONHR_EMAIL\", \"password\": \"$NONHR_PASSWORD\"}")
  
  NONHR_TOKEN=$(echo "$NONHR_LOGIN" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
  
  if [ ! -z "$NONHR_TOKEN" ]; then
    # Try to access HR endpoint
    UNAUTH_RESPONSE=$(curl -s -w "%{http_code}" -o /dev/null \
      "$API_BASE/hr/employees" \
      -H "Authorization: Bearer $NONHR_TOKEN")
    
    if [ "$UNAUTH_RESPONSE" = "403" ]; then
      test_result 0 "Unauthorized access blocked (403)"
    else
      test_result 1 "Unauthorized access NOT blocked (HTTP $UNAUTH_RESPONSE)"
    fi
  else
    echo -e "${YELLOW}⚠️  Failed to authenticate non-HR user. Skipping.${NC}"
  fi
else
  echo "Skipping unauthorized access test."
fi

# Summary
echo ""
echo "=============================="
echo "📊 TEST SUMMARY"
echo "=============================="
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"
echo "Total: $((PASSED + FAILED))"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}⚠️  Some tests failed. Please review the output above.${NC}"
  exit 1
fi
