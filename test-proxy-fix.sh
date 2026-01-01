#!/bin/bash

# Test frontend file download after proxy fix
# Run this on EC2 after deploying the proxy fix

set -e

echo "=== Testing Frontend File Download After Proxy Fix ==="
echo ""

# Configuration
FRONTEND_URL="http://localhost:3001"
EMAIL="admin@example.com"
PASSWORD="Admin123!"

echo "Step 1: Login to get JWT token"
LOGIN_RESPONSE=$(curl -s -X POST \
  "${FRONTEND_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

echo "Login response (truncated): ${LOGIN_RESPONSE:0:100}..."

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get JWT token"
  echo "Full response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Got JWT token: ${TOKEN:0:20}..."
echo ""

echo "Step 2: List accountant files"
FILES_RESPONSE=$(curl -s \
  "${FRONTEND_URL}/api/accountant-files" \
  -H "Authorization: Bearer $TOKEN")

echo "Files response (truncated): ${FILES_RESPONSE:0:200}..."
echo ""

# Extract first file ID and filename
FILE_ID=$(echo "$FILES_RESPONSE" | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)
FILENAME=$(echo "$FILES_RESPONSE" | grep -o '"filename":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$FILE_ID" ]; then
  echo "❌ No files found"
  echo "Full response: $FILES_RESPONSE"
  exit 1
fi

echo "Found file: ID=$FILE_ID, filename=$FILENAME"
echo ""

echo "Step 3: Download file via Next.js proxy"
OUTPUT_FILE="/tmp/frontend-download-fixed.pdf"
rm -f "$OUTPUT_FILE"

echo "Downloading to: $OUTPUT_FILE"
HTTP_CODE=$(curl -s -w "%{http_code}" \
  "${FRONTEND_URL}/api/accountant-files/${FILE_ID}" \
  -H "Authorization: Bearer $TOKEN" \
  -o "$OUTPUT_FILE")

echo "HTTP status code: $HTTP_CODE"

if [ ! -f "$OUTPUT_FILE" ]; then
  echo "❌ Download failed - file not created"
  exit 1
fi

FILE_SIZE=$(stat -f%z "$OUTPUT_FILE" 2>/dev/null || stat -c%s "$OUTPUT_FILE" 2>/dev/null)
echo "Downloaded file size: $FILE_SIZE bytes"

if [ "$FILE_SIZE" -eq 0 ]; then
  echo "❌ Downloaded file is empty"
  exit 1
fi

# Check if it's a valid PDF
echo ""
echo "Checking file type..."
file "$OUTPUT_FILE"

if file "$OUTPUT_FILE" | grep -q "PDF"; then
  echo "✅ Downloaded file is a valid PDF"
else
  echo "⚠️  Warning: File may not be a valid PDF"
fi

# Show first few bytes
echo ""
echo "First 16 bytes (hex):"
xxd -l 16 "$OUTPUT_FILE" || hexdump -C -n 16 "$OUTPUT_FILE"

# Calculate MD5
echo ""
echo "MD5 checksum:"
md5sum "$OUTPUT_FILE" 2>/dev/null || md5 "$OUTPUT_FILE"

echo ""
echo "=== Test Summary ==="
echo "✅ Login: SUCCESS"
echo "✅ List files: SUCCESS"
echo "✅ Download HTTP: $HTTP_CODE"
echo "✅ File size: $FILE_SIZE bytes"
echo "✅ File saved to: $OUTPUT_FILE"
echo ""
echo "Next: Try opening the file in the browser UI to confirm the fix works end-to-end"
