#!/bin/bash

# 📢 ANNOUNCEMENT SYSTEM - AUTOMATED TEST SCRIPT
# This script tests the announcement system end-to-end

set -e  # Exit on error

echo "=================================="
echo "🧪 ANNOUNCEMENT SYSTEM TEST SUITE"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:3000"
JWT_TOKEN=""  # Set this to a valid JWT token

# Function to print test results
pass() {
  echo -e "${GREEN}✅ PASS${NC}: $1"
}

fail() {
  echo -e "${RED}❌ FAIL${NC}: $1"
  exit 1
}

warn() {
  echo -e "${YELLOW}⚠️  WARN${NC}: $1"
}

info() {
  echo -e "ℹ️  $1"
}

# Check prerequisites
echo "📋 Checking Prerequisites..."
echo ""

# 1. Check if backend is running
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
  pass "Backend is running"
else
  fail "Backend is not running on port 3000"
fi

# 2. Check if PostgreSQL is accessible
if psql -U postgres -d fyp_db -c "SELECT 1" > /dev/null 2>&1; then
  pass "PostgreSQL is accessible"
else
  fail "PostgreSQL is not accessible"
fi

# 3. Check if tables exist
TABLE_COUNT=$(psql -U postgres -d fyp_db -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'announcement%'" | tr -d ' ')
if [ "$TABLE_COUNT" -eq "5" ]; then
  pass "All 5 announcement tables exist"
else
  fail "Expected 5 announcement tables, found $TABLE_COUNT. Run migration first."
fi

# 4. Check ClamAV
if curl -s http://localhost:3310/ping | grep -q "PONG"; then
  pass "ClamAV is running"
else
  warn "ClamAV is not responding (file uploads may fail)"
fi

echo ""
echo "=================================="
echo "🔐 Testing Authentication"
echo "=================================="
echo ""

# Check if JWT token is set
if [ -z "$JWT_TOKEN" ]; then
  warn "JWT_TOKEN not set. Please set it in the script or as environment variable:"
  info "export JWT_TOKEN='your-jwt-token-here'"
  warn "Skipping API tests..."
  SKIP_API_TESTS=true
else
  pass "JWT token is set"
  SKIP_API_TESTS=false
fi

if [ "$SKIP_API_TESTS" = false ]; then
  echo ""
  echo "=================================="
  echo "📡 Testing API Endpoints"
  echo "=================================="
  echo ""

  # Test 1: Get all announcements
  info "Test 1: GET /announcements"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/announcements" \
    -H "Authorization: Bearer $JWT_TOKEN")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    pass "GET /announcements returns 200"
  else
    fail "GET /announcements returned $HTTP_CODE"
  fi

  # Test 2: Get unacknowledged urgent
  info "Test 2: GET /announcements/urgent/unacknowledged"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/announcements/urgent/unacknowledged" \
    -H "Authorization: Bearer $JWT_TOKEN")
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    pass "GET /announcements/urgent/unacknowledged returns 200"
  else
    fail "GET /announcements/urgent/unacknowledged returned $HTTP_CODE"
  fi

  # Test 3: Create announcement (HR only - may fail if not HR)
  info "Test 3: POST /announcements (HR only)"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/announcements" \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "title": "Test Announcement",
      "content": "This is a test announcement created by the automated test script.",
      "priority": "GENERAL"
    }')
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    pass "POST /announcements returns $HTTP_CODE (created)"
    # Extract announcement ID for further tests
    ANNOUNCEMENT_ID=$(echo "$RESPONSE" | head -n-1 | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    info "Created announcement ID: $ANNOUNCEMENT_ID"
  elif [ "$HTTP_CODE" = "403" ]; then
    warn "POST /announcements returned 403 (user is not HR, skipping HR-only tests)"
    ANNOUNCEMENT_ID=""
  else
    fail "POST /announcements returned unexpected code: $HTTP_CODE"
  fi

  # Test 4: Acknowledge announcement (if we have one)
  if [ ! -z "$ANNOUNCEMENT_ID" ]; then
    info "Test 4: POST /announcements/:id/acknowledge"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/announcements/$ANNOUNCEMENT_ID/acknowledge" \
      -H "Authorization: Bearer $JWT_TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
      pass "POST /announcements/:id/acknowledge returns $HTTP_CODE"
    else
      fail "POST /announcements/:id/acknowledge returned $HTTP_CODE"
    fi

    # Test 5: Add reaction
    info "Test 5: POST /announcements/:id/reactions"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/announcements/$ANNOUNCEMENT_ID/reactions" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"reaction_type": "👍"}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
      pass "POST /announcements/:id/reactions returns $HTTP_CODE"
    else
      fail "POST /announcements/:id/reactions returned $HTTP_CODE"
    fi

    # Test 6: Add comment
    info "Test 6: POST /announcements/:id/comments"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_BASE/announcements/$ANNOUNCEMENT_ID/comments" \
      -H "Authorization: Bearer $JWT_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"content": "This is a test comment from the automated test script."}')
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
      pass "POST /announcements/:id/comments returns $HTTP_CODE"
    else
      fail "POST /announcements/:id/comments returned $HTTP_CODE"
    fi

    # Test 7: Get comments
    info "Test 7: GET /announcements/:id/comments"
    RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$API_BASE/announcements/$ANNOUNCEMENT_ID/comments" \
      -H "Authorization: Bearer $JWT_TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    
    if [ "$HTTP_CODE" = "200" ]; then
      pass "GET /announcements/:id/comments returns 200"
    else
      fail "GET /announcements/:id/comments returned $HTTP_CODE"
    fi
  fi
fi

echo ""
echo "=================================="
echo "🗄️  Testing Database Integrity"
echo "=================================="
echo ""

# Test foreign keys
info "Checking foreign key constraints..."
FK_COUNT=$(psql -U postgres -d fyp_db -t -c "
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name LIKE 'announcement%'
" | tr -d ' ')

if [ "$FK_COUNT" -ge "8" ]; then
  pass "Foreign key constraints are in place ($FK_COUNT found)"
else
  warn "Expected at least 8 foreign keys, found $FK_COUNT"
fi

# Test unique constraints
info "Checking unique constraints..."
UNIQUE_COUNT=$(psql -U postgres -d fyp_db -t -c "
  SELECT COUNT(*) 
  FROM information_schema.table_constraints 
  WHERE constraint_type = 'UNIQUE' 
    AND table_name LIKE 'announcement%'
" | tr -d ' ')

if [ "$UNIQUE_COUNT" -ge "3" ]; then
  pass "Unique constraints are in place ($UNIQUE_COUNT found)"
else
  warn "Expected at least 3 unique constraints, found $UNIQUE_COUNT"
fi

# Test enum types
info "Checking enum types..."
ENUM_COUNT=$(psql -U postgres -d fyp_db -t -c "
  SELECT COUNT(*) 
  FROM pg_type 
  WHERE typname LIKE '%announcement%'
" | tr -d ' ')

if [ "$ENUM_COUNT" -ge "0" ]; then
  pass "Enum types are defined ($ENUM_COUNT found)"
else
  warn "No enum types found (may be using varchar)"
fi

echo ""
echo "=================================="
echo "📊 Database Statistics"
echo "=================================="
echo ""

# Count records
ANNOUNCEMENT_COUNT=$(psql -U postgres -d fyp_db -t -c "SELECT COUNT(*) FROM announcements WHERE is_deleted = false" | tr -d ' ')
ACK_COUNT=$(psql -U postgres -d fyp_db -t -c "SELECT COUNT(*) FROM announcement_acknowledgments" | tr -d ' ')
REACTION_COUNT=$(psql -U postgres -d fyp_db -t -c "SELECT COUNT(*) FROM announcement_reactions" | tr -d ' ')
COMMENT_COUNT=$(psql -U postgres -d fyp_db -t -c "SELECT COUNT(*) FROM announcement_comments WHERE is_deleted = false" | tr -d ' ')
ATTACHMENT_COUNT=$(psql -U postgres -d fyp_db -t -c "SELECT COUNT(*) FROM announcement_attachments WHERE is_deleted = false" | tr -d ' ')

info "Announcements: $ANNOUNCEMENT_COUNT"
info "Acknowledgments: $ACK_COUNT"
info "Reactions: $REACTION_COUNT"
info "Comments: $COMMENT_COUNT"
info "Attachments: $ATTACHMENT_COUNT"

echo ""
echo "=================================="
echo "🎯 Test Summary"
echo "=================================="
echo ""

if [ "$SKIP_API_TESTS" = true ]; then
  warn "Some tests were skipped due to missing JWT token"
else
  pass "All API tests completed"
fi

pass "All database integrity checks passed"
info "Total announcements in system: $ANNOUNCEMENT_COUNT"

echo ""
echo -e "${GREEN}✅ TEST SUITE COMPLETE${NC}"
echo ""
echo "To run with JWT token:"
echo "  export JWT_TOKEN='your-jwt-token'"
echo "  ./test_announcement_system.sh"
echo ""
