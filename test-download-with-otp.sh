#!/bin/bash
# Test accountant file download with OTP
# Run this on EC2
# Usage: ./test-download-with-otp.sh <OTP_CODE>

if [ -z "$1" ]; then
    echo "Usage: ./test-download-with-otp.sh <OTP_CODE>"
    echo ""
    echo "Step 1: Run this script first (it will trigger OTP email)"
    echo "Step 2: Check your email for OTP"
    echo "Step 3: Run again with: ./test-download-with-otp.sh 123456"
    exit 1
fi

OTP_CODE=$1

echo "=========================================="
echo "Test Accountant File Download (with OTP)"
echo "=========================================="
echo ""

echo "1. Get latest accountant file ID and details:"
FILE_INFO=$(PGPASSWORD=GL5jYNDqsOVkx6tIfIS2eUonM psql -h localhost -U fyp_user -d fyp_db -t -c "
SELECT id, filename, size, length(data) as actual_size 
FROM accountant_files 
ORDER BY created_at DESC 
LIMIT 1;
")

echo "$FILE_INFO"

FILE_ID=$(echo "$FILE_INFO" | awk '{print $1}' | tr -d ' ')
SIZE=$(echo "$FILE_INFO" | awk '{print $5}')

echo ""
echo "File ID: $FILE_ID"
echo "Size in DB: $SIZE bytes"

echo ""
echo "2. Logging in and verifying OTP..."
TOKEN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"lolzlolz706@gmail.com\",\"otp\":\"$OTP_CODE\"}")

echo "Response: $TOKEN_RESPONSE"

TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Failed to get token. OTP might be wrong or expired."
    exit 1
fi

echo "✓ Token obtained: ${TOKEN:0:30}..."

echo ""
echo "3. Downloading file from backend..."
HTTP_CODE=$(curl -s -o test-download.pdf -w "%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/accountant-files/$FILE_ID)

echo "HTTP Status: $HTTP_CODE"

echo ""
echo "4. Checking downloaded file..."
if [ -f "test-download.pdf" ]; then
    DOWNLOAD_SIZE=$(stat -f%z test-download.pdf 2>/dev/null || stat -c%s test-download.pdf 2>/dev/null)
    echo "Downloaded file size: $DOWNLOAD_SIZE bytes"
    echo "Database file size: $SIZE bytes"
    
    if [ "$DOWNLOAD_SIZE" -eq "0" ]; then
        echo "❌ File is EMPTY (0 bytes)!"
        echo "Backend is not sending file data correctly!"
    elif [ "$DOWNLOAD_SIZE" = "$SIZE" ]; then
        echo "✅ File size matches! Backend download is WORKING!"
        echo "Issue is in the FRONTEND!"
    else
        echo "⚠️  Size mismatch!"
    fi
    
    echo ""
    echo "File type:"
    file test-download.pdf
    
    echo ""
    echo "First 100 bytes (hex):"
    xxd -l 100 test-download.pdf 2>/dev/null || hexdump -C -n 100 test-download.pdf
else
    echo "❌ File was not downloaded!"
fi

echo ""
echo "=========================================="
