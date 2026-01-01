#!/bin/bash
# Test if Next.js proxy corrupts binary data
# Run this on EC2

echo "=========================================="
echo "Test Next.js Proxy vs Direct Backend"
echo "=========================================="
echo ""

# Get file info
FILE_INFO=$(PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -t -c "
SELECT id, size 
FROM accountant_files 
ORDER BY created_at DESC 
LIMIT 1;
")

FILE_ID=$(echo "$FILE_INFO" | awk '{print $1}' | tr -d ' ')
DB_SIZE=$(echo "$FILE_INFO" | awk '{print $2}' | tr -d ' ')

echo "File ID: $FILE_ID"
echo "Database size: $DB_SIZE bytes"

# Get token
echo ""
echo "1. Getting authentication token..."
curl -s -X POST http://localhost:3000/auth/request-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"lolzlolz706@gmail.com"}' > /dev/null

echo "Check your email for OTP, then enter it:"
read OTP_CODE

TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"lolzlolz706@gmail.com\",\"otp\":\"$OTP_CODE\"}")

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token"
    exit 1
fi

echo "✓ Token obtained"

# Test 1: Direct backend download
echo ""
echo "2. Testing DIRECT backend download (port 3000)..."
curl -s -o direct-download.pdf \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/accountant-files/$FILE_ID

DIRECT_SIZE=$(stat -c%s direct-download.pdf 2>/dev/null || stat -f%z direct-download.pdf 2>/dev/null)
echo "Direct backend size: $DIRECT_SIZE bytes"

# Test 2: Through Next.js proxy
echo ""
echo "3. Testing through NEXT.JS PROXY (port 3001)..."
curl -s -o proxy-download.pdf \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/accountant-files/$FILE_ID

PROXY_SIZE=$(stat -c%s proxy-download.pdf 2>/dev/null || stat -f%z proxy-download.pdf 2>/dev/null)
echo "Next.js proxy size: $PROXY_SIZE bytes"

# Compare
echo ""
echo "=========================================="
echo "COMPARISON:"
echo "=========================================="
echo "Database size:    $DB_SIZE bytes"
echo "Direct backend:   $DIRECT_SIZE bytes"
echo "Next.js proxy:    $PROXY_SIZE bytes"
echo ""

if [ "$DIRECT_SIZE" -eq "$DB_SIZE" ] && [ "$PROXY_SIZE" -eq "$DB_SIZE" ]; then
    echo "✅ BOTH WORK! No proxy corruption."
    echo "Issue is in frontend JavaScript code."
elif [ "$DIRECT_SIZE" -eq "$DB_SIZE" ] && [ "$PROXY_SIZE" -ne "$DB_SIZE" ]; then
    echo "❌ PROXY IS CORRUPTING DATA!"
    echo "Direct backend works, but Next.js proxy breaks it."
    echo ""
    echo "Checking file types:"
    echo "Direct backend file:"
    file direct-download.pdf
    echo ""
    echo "Next.js proxy file:"
    file proxy-download.pdf
    echo ""
    echo "First 100 bytes of each:"
    echo "Direct:"
    xxd -l 100 direct-download.pdf 2>/dev/null || hexdump -C -n 100 direct-download.pdf
    echo ""
    echo "Proxy:"
    xxd -l 100 proxy-download.pdf 2>/dev/null || hexdump -C -n 100 proxy-download.pdf
else
    echo "⚠️  Unexpected result. Check the files."
fi

echo ""
echo "=========================================="
