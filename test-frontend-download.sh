#!/bin/bash

# Test frontend download through Next.js proxy
# This simulates what the browser does when downloading via the frontend

echo "=== Testing Frontend Download Through Proxy ==="
echo ""

# Get credentials from .env
cd /Users/jw/fyp_system/backend
source .env

# Login and get token
echo "1. Login to get token..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful, got token"
echo ""

# Get accountant files list
echo "2. Getting accountant files list..."
FILES_RESPONSE=$(curl -s -X GET http://localhost:3001/api/accountant-files \
  -H "Authorization: Bearer $TOKEN")

# Extract first file ID
FILE_ID=$(echo "$FILES_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$FILE_ID" ]; then
  echo "❌ No files found"
  echo "Response: $FILES_RESPONSE"
  exit 1
fi

echo "✅ Found file: $FILE_ID"
echo ""

# Test download through proxy
echo "3. Testing download through Next.js proxy..."
PROXY_FILE="/tmp/proxy_download_$$.pdf"

curl -s -X GET "http://localhost:3001/api/accountant-files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -o "$PROXY_FILE" \
  -D /tmp/proxy_headers.txt

echo ""
echo "Response headers:"
cat /tmp/proxy_headers.txt
echo ""

PROXY_SIZE=$(wc -c < "$PROXY_FILE" 2>/dev/null || echo "0")
echo "Proxy download size: $PROXY_SIZE bytes"

if [ "$PROXY_SIZE" -gt 0 ]; then
  echo "File type: $(file "$PROXY_FILE")"
  
  # Check if it's a valid PDF
  if file "$PROXY_FILE" | grep -q "PDF"; then
    echo "✅ Proxy download is a valid PDF"
  else
    echo "❌ Proxy download is NOT a valid PDF"
    echo "First 100 bytes:"
    head -c 100 "$PROXY_FILE" | od -A x -t x1z -v
  fi
else
  echo "❌ Proxy download is empty"
fi

echo ""

# Compare with direct backend download
echo "4. Testing direct backend download (for comparison)..."
DIRECT_FILE="/tmp/direct_download_$$.pdf"

curl -s -X GET "http://localhost:3000/accountant-files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -o "$DIRECT_FILE"

DIRECT_SIZE=$(wc -c < "$DIRECT_FILE" 2>/dev/null || echo "0")
echo "Direct download size: $DIRECT_SIZE bytes"

if [ "$DIRECT_SIZE" -gt 0 ]; then
  echo "File type: $(file "$DIRECT_FILE")"
  
  if file "$DIRECT_FILE" | grep -q "PDF"; then
    echo "✅ Direct download is a valid PDF"
  else
    echo "❌ Direct download is NOT a valid PDF"
  fi
fi

echo ""

# Compare sizes
if [ "$PROXY_SIZE" -eq "$DIRECT_SIZE" ] && [ "$PROXY_SIZE" -gt 0 ]; then
  echo "✅ SUCCESS: Proxy and direct downloads have same size"
  
  # Compare content
  if cmp -s "$PROXY_FILE" "$DIRECT_FILE"; then
    echo "✅ SUCCESS: File content is identical"
  else
    echo "❌ ERROR: File content differs!"
    echo "This means the proxy is corrupting the data"
  fi
else
  echo "❌ ERROR: Size mismatch"
  echo "  Proxy:  $PROXY_SIZE bytes"
  echo "  Direct: $DIRECT_SIZE bytes"
fi

# Cleanup
rm -f "$PROXY_FILE" "$DIRECT_FILE" /tmp/proxy_headers.txt

echo ""
echo "=== Test Complete ==="
