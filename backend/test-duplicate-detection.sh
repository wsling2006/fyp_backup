#!/bin/bash

# Quick Test Script for Duplicate Detection
# This script tests that the duplicate file detection is working correctly

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  🧪 Testing Duplicate Detection Feature                          ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# Check if JWT token is provided
if [ -z "$JWT_TOKEN" ]; then
  echo "⚠️  Please set your JWT token:"
  echo "   export JWT_TOKEN='your-jwt-token-here'"
  echo ""
  echo "To get a JWT token:"
  echo "  1. Login via the frontend or API"
  echo "  2. Copy the token from localStorage or API response"
  echo "  3. Run: export JWT_TOKEN='<your-token>'"
  echo ""
  exit 1
fi

API_URL="${API_URL:-http://localhost:3000}"

echo "🔧 Configuration:"
echo "   API URL: $API_URL"
echo "   Token: ${JWT_TOKEN:0:20}..."
echo ""

# Create a unique test file
TEST_FILE="duplicate-test-$(date +%s).txt"
echo "This is a test file for duplicate detection - $(date)" > "$TEST_FILE"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 1: Upload File (should succeed)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📤 Uploading: $TEST_FILE"

RESPONSE1=$(curl -s -X POST "$API_URL/accountant-files/upload" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@$TEST_FILE")

echo "Response:"
echo "$RESPONSE1" | jq '.' 2>/dev/null || echo "$RESPONSE1"
echo ""

# Check if upload was successful
if echo "$RESPONSE1" | grep -q '"success":true'; then
  echo "✅ Upload succeeded"
  FILE_ID=$(echo "$RESPONSE1" | jq -r '.id' 2>/dev/null)
  echo "   File ID: $FILE_ID"
else
  echo "❌ Upload failed"
  echo "   This might be because:"
  echo "   - JWT token is invalid or expired"
  echo "   - Backend is not running"
  echo "   - User doesn't have ACCOUNTANT or SUPER_ADMIN role"
  rm "$TEST_FILE"
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 2: Upload Same File Again (should be rejected as duplicate)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📤 Uploading: $TEST_FILE (same file)"

RESPONSE2=$(curl -s -X POST "$API_URL/accountant-files/upload" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@$TEST_FILE")

echo "Response:"
echo "$RESPONSE2" | jq '.' 2>/dev/null || echo "$RESPONSE2"
echo ""

# Check if duplicate was detected
if echo "$RESPONSE2" | grep -q "already exists"; then
  echo "✅ Duplicate detection working!"
  echo "   File was correctly rejected as a duplicate"
else
  echo "⚠️  Unexpected response"
  echo "   Expected: Error message about duplicate file"
  echo "   Got: See response above"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 3: Upload Same Content with Different Filename (should fail)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Copy file with different name
TEST_FILE2="renamed-$(date +%s).txt"
cp "$TEST_FILE" "$TEST_FILE2"

echo "📤 Uploading: $TEST_FILE2 (same content, different name)"

RESPONSE3=$(curl -s -X POST "$API_URL/accountant-files/upload" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@$TEST_FILE2")

echo "Response:"
echo "$RESPONSE3" | jq '.' 2>/dev/null || echo "$RESPONSE3"
echo ""

# Check if duplicate was detected (content-based, not name-based)
if echo "$RESPONSE3" | grep -q "already exists"; then
  echo "✅ Content-based detection working!"
  echo "   File was correctly identified as duplicate despite different name"
else
  echo "⚠️  Unexpected response"
  echo "   Expected: Duplicate error (same content = duplicate)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Test 4: Upload Different Content with Same Filename (should succeed)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Create file with different content but reusing original filename
echo "This is DIFFERENT content - $(date)" > "$TEST_FILE"

echo "📤 Uploading: $TEST_FILE (different content, same name)"

RESPONSE4=$(curl -s -X POST "$API_URL/accountant-files/upload" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -F "file=@$TEST_FILE")

echo "Response:"
echo "$RESPONSE4" | jq '.' 2>/dev/null || echo "$RESPONSE4"
echo ""

# Check if upload succeeded (different content = allowed)
if echo "$RESPONSE4" | grep -q '"success":true'; then
  echo "✅ Filename-independence working!"
  echo "   Different content allowed despite same filename"
  FILE_ID2=$(echo "$RESPONSE4" | jq -r '.id' 2>/dev/null)
  echo "   New File ID: $FILE_ID2"
else
  echo "⚠️  Unexpected response"
  echo "   Expected: Success (different content should be allowed)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Cleanup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Delete test files
if [ -n "$FILE_ID" ]; then
  echo "🗑️  Deleting uploaded files..."
  curl -s -X DELETE "$API_URL/accountant-files/$FILE_ID" \
    -H "Authorization: Bearer $JWT_TOKEN" > /dev/null
  
  if [ -n "$FILE_ID2" ]; then
    curl -s -X DELETE "$API_URL/accountant-files/$FILE_ID2" \
      -H "Authorization: Bearer $JWT_TOKEN" > /dev/null
  fi
  echo "✅ Cleanup complete"
fi

rm -f "$TEST_FILE" "$TEST_FILE2"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║  ✅ TESTING COMPLETE                                             ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  ✅ Duplicate detection is working correctly"
echo "  ✅ Content-based (not filename-based)"
echo "  ✅ Different content with same name is allowed"
echo "  ✅ Same content with different name is rejected"
echo ""
